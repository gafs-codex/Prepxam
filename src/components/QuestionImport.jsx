"use client"
import { useState, useMemo, useEffect, useRef } from "react"
import Toggle from "@/components/ui/Toggle"
import Link from "next/link"
import { toast } from "sonner"
import { Upload, Download } from "lucide-react"
import { apiPost } from "@/lib/api"
import { useLoader } from "@/lib/useLoader"
import { PageLoader } from "@/components/ui/Spinner"
import ErrorState from "@/components/ui/ErrorState"
import { readQuestionsFile } from "@/lib/questionParsers"
import { normalizeQuestion, questionKey, EXAM_TYPES, MAX_QUESTIONS_PER_FILE } from "@/lib/questionRules"

const BATCH = 100
const MAX_FILE_BYTES = 5 * 1024 * 1024
const selectClass = "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none disabled:opacity-60"

const WORD_EXAMPLE = `1. What is the capital of France?
A. Berlin
B. Paris
C. Rome
D. Madrid
Answer: B
Explanation: Paris is the capital of France.

2. The Earth is flat.
Answer: False`

async function downloadTemplate() {
    const XLSX = await import("xlsx")
    const rows = [
        ["Question", "Type", "Option A", "Option B", "Option C", "Option D", "Answer", "Explanation"],
        ["What is the capital of France?", "Multiple choice", "Berlin", "Paris", "Rome", "Madrid", "B", "Paris is the capital of France."],
        ["The Earth is flat.", "True or false", "", "", "", "", "False", "The Earth is almost a sphere."],
        ["The SI unit of force is the ____.", "Fill in the gap", "joule", "watt", "newton", "pascal", "C", ""],
    ]
    const sheet = XLSX.utils.aoa_to_sheet(rows)
    sheet["!cols"] = [{ wch: 50 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 8 }, { wch: 40 }]
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, "Questions")
    XLSX.writeFile(book, "questions-template.xlsx")
}

export default function QuestionImport({ backHref, backLabel }) {
    const { data: ctx, error: ctxError, loading, reload } = useLoader(async () => {
        const res = await apiPost("/api/questions/import", { action: "context" })
        if (!res.ok) throw new Error(res.error)
        return res
    }, [])

    const [ownerId, setOwnerId] = useState("")
    const [subject, setSubject] = useState("")
    const [examType, setExamType] = useState("Internal test")
    const [fileName, setFileName] = useState("")
    const [items, setItems] = useState([])
    const [fileError, setFileError] = useState(null)
    const [reading, setReading] = useState(false)
    const [phase, setPhase] = useState("idle")     // idle | importing | done
    const [progress, setProgress] = useState(0)
    const [totals, setTotals] = useState(null)
    const [stopped, setStopped] = useState(null)
    const [strict, setStrict] = useState(true)
    const [stoppedByUser, setStoppedByUser] = useState(false)
    const stopRef = useRef(false)

    // a teacher has only themselves to choose
    useEffect(() => {
        if (ctx && !ctx.isAdmin && ctx.owners.length === 1) setOwnerId(ctx.owners[0].id)
    }, [ctx])

    const owner = ctx?.owners.find((o) => o.id === ownerId) ?? null

    // start on the owner's first subject
    useEffect(() => {
        if (owner && !owner.subjects.includes(subject)) setSubject(owner.subjects[0] ?? "")
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [owner])

    // check every row against the current choices
    const checked = useMemo(() => {
        const seen = new Set()
        return items.map((item) => {
            const res = normalizeQuestion(item.raw, { subject, examType })
            if (!res.ok) return { ...item, ok: false, problem: res.problem }

            const q = res.question
            if (!owner?.subjects.includes(q.subject)) {
                return { ...item, ok: false, problem: `${owner?.name ?? "This teacher"} doesn't teach ${q.subject}` }
            }
            const key = questionKey(q)
            if (seen.has(key)) return { ...item, ok: false, problem: "Repeated in this file" }
            seen.add(key)
            return { ...item, ok: true, question: q }
        })
    }, [items, subject, examType, owner])

    const valid = checked.filter((r) => r.ok)
    const invalid = checked.filter((r) => !r.ok)

    const blocked = strict && invalid.length > 0

    function reset() {
        setFileName(""); setItems([]); setFileError(null); setPhase("idle")
        setProgress(0); setTotals(null); setStopped(null); setStoppedByUser(false)
    }

    async function onFile(e) {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file) return

        setTotals(null); setStopped(null); setPhase("idle"); setProgress(0)
        if (file.size > MAX_FILE_BYTES) { setFileError("That file is over 5 MB."); return }

        setReading(true)
        const res = await readQuestionsFile(file)
        setReading(false)
        setFileName(file.name)

        if (res.error) { setFileError(res.error); setItems([]); return }
        if (res.items.length === 0) { setFileError("I couldn't find any questions in that file."); setItems([]); return }
        if (res.items.length > MAX_QUESTIONS_PER_FILE) {
            setFileError(`That file has more than ${MAX_QUESTIONS_PER_FILE} questions. Split it into smaller files.`)
            setItems([])
            return
        }
        setFileError(null)
        setItems(res.items)
    }

    async function runImport() {
        if (valid.length === 0 || !ownerId || blocked) return
        stopRef.current = false
        setPhase("importing"); setStopped(null); setStoppedByUser(false); setProgress(0)

        const sum = { inserted: 0, duplicates: 0, invalid: 0, notTheirSubject: 0 }
        setTotals({ ...sum })

        for (let i = 0; i < valid.length; i += BATCH) {
            if (stopRef.current) { setStoppedByUser(true); break }

            const chunk = valid.slice(i, i + BATCH).map((v) => v.question)
            const res = await apiPost("/api/questions/import", { action: "import", ownerId, questions: chunk }, 60000)
            if (!res.ok) { setStopped(res.error); break }

            sum.inserted += res.inserted
            sum.duplicates += res.duplicates
            sum.invalid += res.invalid
            sum.notTheirSubject += res.notTheirSubject
            setTotals({ ...sum })
            setProgress(Math.min(i + BATCH, valid.length))

            if (strict && (res.invalid > 0 || res.notTheirSubject > 0)) {
                setStopped("The server rejected some questions, so the import was stopped.")
                break
            }
        }
        setPhase("done")
    }

    async function copyExample() {
        try {
            await navigator.clipboard.writeText(WORD_EXAMPLE)
            toast.success("Copied. Paste it into Word.")
        } catch {
            toast.error("Couldn't copy. Select the text and copy it by hand.")
        }
    }

    if (loading) return <PageLoader />
    if (ctxError) return <ErrorState message={ctxError} onRetry={reload} />

    const ready = Boolean(owner) && owner.subjects.length > 0
    const typeLabel = (q) => (q.question_type === "Multiple choice" ? "Multiple choice" : q.question_type)
    const answerLabel = (q) =>
        q.question_type === "True or false"
            ? q.options[q.correct_index]
            : `${String.fromCharCode(65 + q.correct_index)}. ${q.options[q.correct_index]}`

    return (
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
            <Link href={backHref} className="text-sm text-muted">← {backLabel}</Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Import questions</h1>
            <p className="mt-1 text-sm text-muted">
                Add many questions at once from an Excel or Word file. They go into the question bank, and you add them to exams from there.
            </p>

            <section className="mt-6 rounded-xl border border-border bg-card p-6">
                <h2 className="font-semibold">1. Where do they go?</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    {ctx.isAdmin && (
                        <div className="space-y-2">
                            <label htmlFor="owner" className="text-sm font-medium">Teacher</label>
                            <select id="owner" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={selectClass}>
                                <option value="">Choose a teacher</option>
                                {ctx.owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="space-y-2">
                        <label htmlFor="subject" className="text-sm font-medium">Subject</label>
                        <select id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!ready} className={selectClass}>
                            {(owner?.subjects ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="examType" className="text-sm font-medium">Exam type</label>
                        <select id="examType" value={examType} onChange={(e) => setExamType(e.target.value)} className={selectClass}>
                            {EXAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>
                <p className="mt-3 text-xs text-muted">
                    These apply to every question, unless your file has its own Subject or Exam type column.
                    {ctx.isAdmin && " The questions are saved in the chosen teacher's bank, and the teacher can edit them."}
                </p>
                {owner && owner.subjects.length === 0 && (
                    <p className="mt-3 text-sm text-yellow-800">{owner.name} has no subjects saved, so nothing can be imported for them yet.</p>
                )}
            </section>

            <section className="mt-4 rounded-xl border border-border bg-card p-6">
                <h2 className="font-semibold">2. Prepare the file</h2>
                <div className="mt-4 grid gap-6 lg:grid-cols-2">
                    <div>
                        <p className="font-medium">Excel</p>
                        <p className="mt-1 text-sm text-muted">
                            One row per question. Columns: Question, Type, Option A to F, Answer (a letter, or the option's text), Explanation. For true or false, leave the options empty and write True or False as the answer.
                        </p>
                        <button
                            type="button"
                            onClick={downloadTemplate}
                            className="mt-3 inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm cursor-pointer hover:bg-accent"
                        >
                            <Download size={16} /> Download the Excel template
                        </button>
                    </div>
                    <div>
                        <p className="font-medium">Word</p>
                        <p className="mt-1 text-sm text-muted">
                            Type each question like this, with a blank line between them. A table with the same columns as the Excel file works too.
                        </p>
                        <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-border bg-accent/30 p-3 text-xs">{WORD_EXAMPLE}</pre>
                        <button type="button" onClick={copyExample} className="mt-2 text-sm font-medium text-primary hover:underline cursor-pointer">
                            Copy this example
                        </button>
                    </div>
                </div>
                <p className="mt-4 text-xs text-muted">
                    Only text is imported. Pictures, diagrams and Word equation objects are left out, so add those questions by hand.
                </p>
            </section>

            <section className="mt-4 rounded-xl border border-border bg-card p-6">
                <h2 className="font-semibold">3. Choose the file</h2>
                <label className={`mt-3 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white ${ready && phase !== "importing" ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
                    <Upload size={16} /> {reading ? "Reading..." : "Choose a file"}
                    <input
                        type="file"
                        accept=".docx,.xlsx,.xls,.csv"
                        onChange={onFile}
                        disabled={!ready || phase === "importing" || reading}
                        className="sr-only"
                    />
                </label>
                {fileName && <span className="ml-3 text-sm text-muted">{fileName}</span>}
                {!ready && <p className="mt-2 text-sm text-muted">{ctx.isAdmin ? "Choose a teacher first." : "You have no subjects saved."}</p>}
                {fileError && <p className="mt-3 text-sm text-red-600">{fileError}</p>}

                {checked.length > 0 && (
                    <div className="mt-5">
                        <p className="text-sm">
                            <span className="font-medium text-green-700">{valid.length} ready</span>
                            {invalid.length > 0 && <>, <span className="font-medium text-red-600">{invalid.length} with problems</span> (skipped)</>}.
                        </p>

                        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-accent/30 text-left text-muted">
                                        <th className="p-3 font-medium">#</th>
                                        <th className="p-3 font-medium">Question</th>
                                        <th className="p-3 font-medium">Type</th>
                                        <th className="p-3 font-medium">Answer</th>
                                        <th className="p-3 font-medium">Check</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {checked.slice(0, 12).map((r) => (
                                        <tr key={r.label} className="border-b border-border last:border-0 align-top">
                                            <td className="whitespace-nowrap p-3 text-muted">{r.label}</td>
                                            <td className="p-3">{(r.ok ? r.question.question_text : r.raw.question).slice(0, 90)}</td>
                                            <td className="p-3 text-muted">{r.ok ? typeLabel(r.question) : "—"}</td>
                                            <td className="p-3">{r.ok ? answerLabel(r.question).slice(0, 40) : "—"}</td>
                                            <td className="p-3">{r.ok ? <span className="text-green-700">OK</span> : <span className="text-red-600">{r.problem}</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {checked.length > 12 && <p className="mt-2 text-xs text-muted">and {checked.length - 12} more rows</p>}

                        {invalid.length > 12 && (
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-red-600">
                                {invalid.slice(12, 22).map((r) => <li key={r.label}>{r.label}: {r.problem}</li>)}
                                {invalid.length > 22 && <li>and {invalid.length - 22} more problems</li>}
                            </ul>
                        )}
                    </div>
                )}
            </section>

            {checked.length > 0 && (
                <section className="mt-4 rounded-xl border border-border bg-card p-6">
                    <h2 className="font-semibold">4. Import</h2>

                    {phase === "idle" && (
                        <div className="mt-3 max-w-xl">
                            <Toggle
                                checked={strict}
                                onChange={setStrict}
                                label="Cancel if any question has a problem"
                                hint="On: nothing is imported until every question is valid. Off: questions with problems are skipped and the rest are imported."
                            />
                        </div>
                    )}

                    {blocked && phase === "idle" && (
                        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                            Nothing will be imported while {invalid.length} question{invalid.length === 1 ? " has" : "s have"} a problem. Fix the file and choose it again, or turn the option off to import the {valid.length} good one{valid.length === 1 ? "" : "s"}.
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
                                Import {valid.length} question{valid.length === 1 ? "" : "s"}
                            </button>
                        )}

                        {phase === "importing" && (
                            <>
                                <span className="text-sm text-muted">Importing... {progress} of {valid.length}. Please keep this page open.</span>
                                <button
                                    type="button"
                                    onClick={() => { stopRef.current = true }}
                                    className="inline-flex h-10 items-center rounded-md border border-red-300 bg-background px-5 text-sm font-medium text-red-600 cursor-pointer hover:bg-red-50"
                                >
                                    Stop import
                                </button>
                            </>
                        )}

                        {phase !== "importing" && (
                            <button
                                type="button"
                                onClick={reset}
                                className="inline-flex h-10 items-center rounded-md border border-input bg-background px-5 text-sm font-medium shadow-sm cursor-pointer hover:bg-accent"
                            >
                                {phase === "done" ? "Import another file" : "Cancel"}
                            </button>
                        )}
                    </div>

                    {stoppedByUser && (
                        <p className="mt-3 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
                            You stopped the import. Questions already saved stay. Upload the same file again to continue. Questions already in the bank are skipped.
                        </p>
                    )}
                    {stopped && (
                        <p className="mt-3 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-900">
                            The import stopped: {stopped} Questions already saved stay. Upload the same file again to continue.
                        </p>
                    )}

                    {totals && (phase === "done" || totals.inserted > 0) && (
                        <div className="mt-4 space-y-2 text-sm">
                            <p>
                                <span className="font-medium text-green-700">{totals.inserted} imported</span>
                                {totals.duplicates > 0 && <> · {totals.duplicates} already in the bank</>}
                                {totals.invalid + totals.notTheirSubject > 0 && <> · {totals.invalid + totals.notTheirSubject} rejected by the server</>}
                            </p>
                            {phase === "done" && (
                                <Link href={backHref} className="inline-block font-medium text-primary hover:underline">
                                    Go to {backLabel}
                                </Link>
                            )}
                        </div>
                    )}
                </section>
            )}
        </main>
    )
}