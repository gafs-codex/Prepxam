"use client"
import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Upload, Download, MoveLeft } from "lucide-react"
import { apiPost } from "@/lib/api"
import { parseCsv, toCsv, downloadCsv } from "@/lib/csv"
import { admissionKey } from "@/lib/admission"
import { SUBJECTS } from "@/data/subjects"

const BATCH = 10;

const norm = (h) => String(h).toLowerCase().replace(/[^a-z0-9]/g, "");

function readStudents(text) {
    const table = parseCsv(text);
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
    const rows = table.slice(1).map((r, index) => {
        const admission = (r[iAdm] ?? "").trim();
        const name = (r[iName] ?? "").trim();
        const password = iPass >= 0 ? (r[iPass] ?? "").trim() : "";
        const wanted = iSubj >= 0 ? (r[iSubj] ?? "").split(/[|;]/).map((s) => s.trim()).filter(Boolean) : [];

        const subjects = [];
        let problem = null;
        const key = admissionKey(admission);

        if (!key) problem = "Missing admission number";
        else if (!name) problem = "Missing name";
        else if (seen.has(key)) problem = "Repeated in this file";
        else if (password && password.length < 8) problem = "Password under 8 characters";

        for (const raw of wanted) {
            const match = SUBJECTS.find((s) => s.toLowerCase() === raw.toLowerCase());
            if (!match) { problem = problem ?? `Unknown subject: ${raw}`; break; }
            if (!subjects.includes(match)) subjects.push(match);
        }

        if (key) seen.add(key);
        return { line: index + 2, admission, name, subjects, password, problem };
    });

    return { rows };
}

export default function ImportStudents() {
    const [fileName, setFileName] = useState("");
    const [rows, setRows] = useState([]);
    const [fileError, setFileError] = useState(null);
    const [phase, setPhase] = useState("idle"); // idle | ready | importing | done
    const [done, setDone] = useState(0);
    const [results, setResults] = useState([]);
    const [stopped, setStopped] = useState(null);

    const valid = rows.filter((r) => !r.problem);
    const invalid = rows.filter((r) => r.problem);

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

        const text = await file.text();
        const parsed = readStudents(text);
        setFileName(file.name);
        setResults([]);
        setStopped(null);
        setDone(0);

        if (parsed.error) {
            setFileError(parsed.error);
            setRows([]);
            setPhase("idle");
            return;
        }
        setFileError(null);
        setRows(parsed.rows);
        setPhase("ready");
    }

    async function runImport() {
        const todo = valid;
        if (todo.length === 0) return;

        setPhase("importing");
        setStopped(null);
        const collected = [];

        for (let i = 0; i < todo.length; i += BATCH) {
            const batch = todo.slice(i, i + BATCH);
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

            if (!res.ok) {
                setStopped(res.error);
                break;
            }
            collected.push(...res.results);
            setResults([...collected]);
            setDone(i + batch.length);
        }

        setPhase("done");
    }

    const created = results.filter((r) => r.status === "created");
    const existed = results.filter((r) => r.status === "exists");
    const failed = results.filter((r) => r.status === "error");

    function downloadCredentials() {
        const csv = toCsv(
            ["Admission number", "Name", "Temporary password", "Log in at"],
            created.map((r) => [r.admission, r.fullName, r.password, `${window.location.origin}/login`])
        );
        downloadCsv(`student-logins-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    }

    return (
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
            <Link href="/Admin/user" className="text-sm text-muted flex items-center gap-2"> <MoveLeft strokeWidth={1.5} size={17} /> Users</Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Import students</h1>
            <p className="mt-1 text-sm text-muted">
                Upload a class list. Each student gets an account that's already approved, and logs in with their admission number.
            </p>

            <section className="mt-6 rounded-xl border border-border bg-card p-6">
                <h2 className="font-semibold">1. Prepare the file</h2>
                <p className="mt-1 text-sm text-muted">
                    A CSV with these columns: <span className="font-mono">admission_number</span>, <span className="font-mono">full_name</span>,
                    and optionally <span className="font-mono">subjects</span> (separate with | ) and <span className="font-mono">password</span>.
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
                <label className="mt-3 inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white">
                    <Upload size={16} /> Choose CSV file
                    <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={phase === "importing"} className="sr-only" />
                </label>
                {fileName && <span className="ml-3 text-sm text-muted">{fileName}</span>}
                {fileError && <p className="mt-3 text-sm text-red-600">{fileError}</p>}

                {rows.length > 0 && (
                    <div className="mt-5">
                        <p className="text-sm">
                            <span className="font-medium">{valid.length}</span> ready to import
                            {invalid.length > 0 && <>, <span className="font-medium text-red-600">{invalid.length}</span> with problems (these are skipped)</>}.
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
                                    {rows.slice(0, 8).map((r) => (
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
                        {rows.length > 8 && <p className="mt-2 text-xs text-muted">and {rows.length - 8} more rows</p>}

                        {invalid.length > 8 && (
                            <p className="mt-2 text-xs text-red-600">
                                {invalid.length} rows have problems. Fix the file and upload it again if they should be included.
                            </p>
                        )}
                    </div>
                )}
            </section>

            {rows.length > 0 && (
                <section className="mt-4 rounded-xl border border-border bg-card p-6">
                    <h2 className="font-semibold">3. Import</h2>

                    {phase !== "done" && (
                        <button
                            type="button"
                            onClick={runImport}
                            disabled={phase === "importing" || valid.length === 0}
                            className="mt-3 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {phase === "importing" ? `Importing... ${done} of ${valid.length}` : `Import ${valid.length} student${valid.length === 1 ? "" : "s"}`}
                        </button>
                    )}

                    {phase === "importing" && (
                        <p className="mt-3 text-sm text-muted">Please keep this page open.</p>
                    )}

                    {stopped && (
                        <p className="mt-3 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
                            The import stopped: {stopped} Upload the same file again to continue. Students already created are skipped.
                            Download the logins below first, since the passwords are shown only once.
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
                                        Passwords can't be shown again later. Print or cut the sheet into slips. Each student must choose their own password at first login.
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