"use client"
import { useState, useRef } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Upload, Download } from "lucide-react"
import { apiPost } from "@/lib/api"
import { parseCsv, toCsv, downloadCsv } from "@/lib/csv"
import { admissionKey } from "@/lib/admission"
import { SUBJECTS } from "@/data/subjects"
import Toggle from "@/components/ui/Toggle"

const BATCH = 10;
const norm = (h) => String(h ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const text = (v) => String(v ?? "").trim();

async function readTable(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv")) return parseCsv(await file.text());
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const XLSX = await import("xlsx");
        const book = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const sheet = book.Sheets[book.SheetNames[0]];
        if (!sheet) throw new Error("The workbook is empty.");
        return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
    }
    throw new Error("Use an Excel (.xlsx) or CSV file.");
}

function readStudents(table) {
    if (table.length < 2) return { error: "The file has no student rows." };

    const headers = table[0].map(norm);
    const find = (names) => headers.findIndex((h) => names.includes(h));
    const iAdm = find(["admissionnumber", "admission", "admissionno", "admno", "regno", "registrationnumber"]);
    const iName = find(["fullname", "name", "studentname"]);
    const iSubj = find(["subjects", "subject"]);
    const iPass = find(["password", "temporarypassword"]);

    if (iAdm < 0 || iName < 0) {
        return { error: "The first row must have admission_number and full_name columns." };
    }

    const seen = new Set();
    const rows = [];

    table.slice(1).forEach((r, index) => {
        if (!r.some((c) => text(c) !== "")) return;   // blank rows at the bottom of a sheet

        const admission = text(r[iAdm]);
        const name = text(r[iName]);
        const password = iPass >= 0 ? text(r[iPass]) : "";
        const wanted = iSubj >= 0 ? text(r[iSubj]).split(/[|;,]/).map((s) => s.trim()).filter(Boolean) : [];

        const subjects = [];
        let problem = null;
        const key = admissionKey(admission);

        if (!key) problem = "Missing admission number";
        else if (!name) problem = "Missing name";
        else if (seen.has(key)) problem = "Repeated in this file";
        else if (password && password.length < 8) problem = "Password under 8 characters. Leave it empty to generate one";

        for (const raw of wanted) {
            const match = SUBJECTS.find((s) => s.toLowerCase() === raw.toLowerCase());
            if (!match) { problem = problem ?? `Unknown subject: ${raw}`; break; }
            if (!subjects.includes(match)) subjects.push(match);
        }

        if (key) seen.add(key);
        rows.push({ line: index + 2, admission, name, subjects, password, problem });
    });

    return { rows };
}

export default function ImportStudents() {
    const [fileName, setFileName] = useState("");
    const [rows, setRows] = useState([]);
    const [fileError, setFileError] = useState(null);
    const [phase, setPhase] = useState("idle"); // idle | importing | done
    const [done, setDone] = useState(0);
    const [results, setResults] = useState([]);
    const [stopped, setStopped] = useState(null);
    const [byUser, setByUser] = useState(false);
    const [strict, setStrict] = useState(true);
    const stopRef = useRef(false);

    const valid = rows.filter((r) => !r.problem);
    const invalid = rows.filter((r) => r.problem);
    const blocked = strict && invalid.length > 0;

    const created = results.filter((r) => r.status === "created");
    const existed = results.filter((r) => r.status === "exists");
    const failed = results.filter((r) => r.status === "error");

    function reset() {
        setFileName(""); setRows([]); setFileError(null); setPhase("idle");
        setDone(0); setResults([]); setStopped(null); setByUser(false);
    }

    function cancel() {
        if (created.length > 0 && !window.confirm("The passwords of the students just created can't be shown again. Leave without downloading them?")) return;
        reset();
    }

    function downloadTemplate() {
        const csv = toCsv(
            ["admission_number", "full_name", "subjects", "password"],
            [
                ["ADM/2025/001", "Ada Okafor", "Mathematics|English Language|Physics", ""],
                ["ADM/2025/002", "Tunde Bello", "Mathematics|English Language|Biology", ""],
            ]
        );
        downloadCsv("students-template.csv", csv);
    }

    async function onFile(e) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setFileError("That file is too large. Split it into smaller files.");
            return;
        }

        reset();
        let parsed;
        try {
            parsed = readStudents(await readTable(file));
        } catch (err) {
            console.error(err);
            setFileName(file.name);
            setFileError(err.message?.startsWith("Use ") ? err.message : "That file couldn't be read. Make sure it isn't damaged or password-protected.");
            return;
        }

        setFileName(file.name);
        if (parsed.error) { setFileError(parsed.error); return; }
        setRows(parsed.rows);
    }

    async function runImport() {
        if (valid.length === 0 || blocked) return;

        stopRef.current = false;
        setPhase("importing"); setStopped(null); setByUser(false);
        const collected = [];

        for (let i = 0; i < valid.length; i += BATCH) {
            if (stopRef.current) { setByUser(true); break; }

            const batch = valid.slice(i, i + BATCH);
            const res = await apiPost(
                "/api/students/import",
                {
                    rows: batch.map((r) => ({
                        admissionNumber: r.admission,
                        fullName: r.name,
                        subjects: r.subjects,
                        password: r.password,
                    })),
                },
                90000
            );

            if (!res.ok) { setStopped(res.error); break; }

            collected.push(...res.results);
            setResults([...collected]);
            setDone(i + batch.length);

            if (strict && res.results.some((r) => r.status === "error")) {
                setStopped("A row failed on the server, so the import was stopped.");
                break;
            }
        }

        setPhase("done");
    }

    function downloadCredentials() {
        const csv = toCsv(
            ["Admission number", "Name", "Temporary password", "Log in at"],
            created.map((r) => [r.admission, r.fullName, r.password, `${window.location.origin}/login`])
        );
        downloadCsv(`student-logins-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    }

    // problems first, so they are never hidden below the fold
    const shown = [...invalid, ...valid].slice(0, 25);

    return (
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
            <Link href="/Admin/user" className="text-sm text-muted">← Users</Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Import students</h1>
            <p className="mt-1 text-sm text-muted">
                Upload a class list. Each student gets an account that's already approved, and logs in with their admission number.
            </p>

            <section className="mt-6 rounded-xl border border-border bg-card p-6">
                <h2 className="font-semibold">1. Prepare the file</h2>
                <p className="mt-1 text-sm text-muted">
                    Excel or CSV with these columns: <span className="font-mono">admission_number</span>, <span className="font-mono">full_name</span>,
                    and optionally <span className="font-mono">subjects</span> (separate with | or commas) and <span className="font-mono">password</span>.
                    Leave the password empty and one is generated for each student.
                </p>
                <button
                    type="button"
                    onClick={downloadTemplate}
                    className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm cursor-pointer hover:bg-accent"
                >
                    <Download size={16} /> Download a template
                </button>
            </section>

            <section className="mt-4 rounded-xl border border-border bg-card p-6">
                <h2 className="font-semibold">2. Choose the file</h2>
                <label className={`mt-3 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white ${phase === "importing" ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                    <Upload size={16} /> Choose file
                    <input type="file" accept=".csv,.xlsx,.xls" onChange={onFile} disabled={phase === "importing"} className="sr-only" />
                </label>
                {fileName && <span className="ml-3 text-sm text-muted">{fileName}</span>}
                {fileError && <p className="mt-3 text-sm text-red-600">{fileError}</p>}

                {rows.length > 0 && (
                    <div className="mt-5">
                        <p className="text-sm">
                            <span className="font-medium text-green-700">{valid.length} ready</span>
                            {invalid.length > 0 && <>, <span className="font-medium text-red-600">{invalid.length} with problems</span></>}.
                        </p>

                        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-accent/30 text-left text-muted">
                                        <th className="p-3 font-medium">Line</th>
                                        <th className="p-3 font-medium">Admission no.</th>
                                        <th className="p-3 font-medium">Name</th>
                                        <th className="p-3 font-medium">Subjects</th>
                                        <th className="p-3 font-medium">Check</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shown.map((r) => (
                                        <tr key={r.line} className="border-b border-border last:border-0">
                                            <td className="p-3 text-muted">{r.line}</td>
                                            <td className="p-3">{r.admission}</td>
                                            <td className="p-3">{r.name}</td>
                                            <td className="p-3 text-muted">{r.subjects.length || "none"}</td>
                                            <td className="p-3">
                                                {r.problem ? <span className="text-red-600">{r.problem}</span> : <span className="text-green-700">OK</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {rows.length > shown.length && <p className="mt-2 text-xs text-muted">and {rows.length - shown.length} more rows</p>}
                    </div>
                )}
            </section>

            {rows.length > 0 && (
                <section className="mt-4 rounded-xl border border-border bg-card p-6">
                    <h2 className="font-semibold">3. Import</h2>

                    {phase === "idle" && (
                        <div className="mt-3 max-w-xl">
                            <Toggle
                                checked={strict}
                                onChange={setStrict}
                                label="Cancel if any row has a problem"
                                hint="On: nothing is imported until every row is valid. Off: rows with problems are skipped and the rest are imported."
                            />
                        </div>
                    )}

                    {blocked && phase === "idle" && (
                        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                            Nothing will be imported while {invalid.length} row{invalid.length === 1 ? " has" : "s have"} a problem. Fix the file and choose it again, or turn the option off to import the {valid.length} good row{valid.length === 1 ? "" : "s"}.
                        </p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        {phase === "idle" && (
                            <button
                                type="button"
                                onClick={runImport}
                                disabled={valid.length === 0 || blocked}
                                className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Import {valid.length} student{valid.length === 1 ? "" : "s"}
                            </button>
                        )}

                        {phase === "importing" && (
                            <>
                                <span className="text-sm text-muted">Importing... {done} of {valid.length}. Please keep this page open.</span>
                                <button
                                    type="button"
                                    onClick={() => { stopRef.current = true; toast.message("Stopping after this batch..."); }}
                                    className="inline-flex h-10 items-center rounded-md border border-red-300 bg-background px-5 text-sm font-medium text-red-600 cursor-pointer hover:bg-red-50"
                                >
                                    Stop import
                                </button>
                            </>
                        )}

                        {phase !== "importing" && (
                            <button
                                type="button"
                                onClick={phase === "done" ? reset : cancel}
                                className="inline-flex h-10 items-center rounded-md border border-input bg-background px-5 text-sm font-medium shadow-sm cursor-pointer hover:bg-accent"
                            >
                                {phase === "done" ? "Import another file" : "Cancel"}
                            </button>
                        )}
                    </div>

                    {byUser && (
                        <p className="mt-3 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
                            You stopped the import after {done} of {valid.length}. The {created.length} accounts already created stay. Download their logins below, then upload the same file again to continue. Existing accounts are skipped.
                        </p>
                    )}

                    {stopped && (
                        <p className="mt-3 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
                            The import stopped: {stopped} Accounts created before this point stay. Download their logins below, then upload the same file again to continue. Existing accounts are skipped.
                        </p>
                    )}

                    {(phase === "done" || results.length > 0) && (
                        <div className="mt-4 space-y-3 text-sm">
                            <p>
                                <span className="font-medium text-green-700">{created.length} created</span>
                                {existed.length > 0 && <> · {existed.length} already had accounts</>}
                                {failed.length > 0 && <> · <span className="text-red-600">{failed.length} failed</span></>}
                            </p>

                            {created.length > 0 && (
                                <div className="rounded-lg border border-border bg-accent/30 p-4">
                                    <p className="font-medium">Download the logins now.</p>
                                    <p className="mt-1 text-muted">
                                        Passwords can't be shown again later. Each student must choose their own password at first login.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={downloadCredentials}
                                        className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-white cursor-pointer"
                                    >
                                        <Download size={16} /> Download logins (CSV)
                                    </button>
                                </div>
                            )}

                            {[...existed, ...failed].length > 0 && (
                                <ul className="list-disc space-y-1 pl-5 text-muted">
                                    {[...existed, ...failed].slice(0, 12).map((r, i) => (
                                        <li key={i}><span className="font-medium text-foreground">{r.admission}</span>: {r.message}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </section>
            )}
        </main>
    )
}