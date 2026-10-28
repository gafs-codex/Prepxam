"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Printer } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { PageLoader } from "@/components/ui/Spinner"
import ErrorState from "@/components/ui/ErrorState"
import Toggle from "@/components/ui/Toggle"
import { useLoader } from "@/lib/useLoader"
import { ensure } from "@/lib/net"

const STORE = "prepxam:paper-settings"
const inputClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none"
const letter = (i) => String.fromCharCode(65 + i)

function minutes(total) {
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h === 0) return `${m} minute${m === 1 ? "" : "s"}`;
    const hours = `${h} hour${h === 1 ? "" : "s"}`;
    return m === 0 ? hours : `${hours} ${m} minutes`;
}

export default function ExamPaper({ examId, backHref }) {
    const [school, setSchool] = useState("");
    const [className, setClassName] = useState("");
    const [date, setDate] = useState("");
    const [instructions, setInstructions] = useState("Answer all the questions.");
    const [showOptions, setShowOptions] = useState(true);
    const [showAnswers, setShowAnswers] = useState(false);
    const [showMarks, setShowMarks] = useState(true);
    const [lines, setLines] = useState(6);
    const [scheme, setScheme] = useState(false);
    const [ready, setReady] = useState(false);

    // remember the school name and class on this device
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(STORE) ?? "{}");
            if (saved.school) setSchool(saved.school);
            if (saved.className) setClassName(saved.className);
        } catch { /* storage can be blocked */ }
        setReady(true);
    }, []);

    useEffect(() => {
        if (!ready) return;
        try { localStorage.setItem(STORE, JSON.stringify({ school, className })); } catch { /* ignore */ }
    }, [ready, school, className]);

    const { data, error, loading, reload } = useLoader(async () => {
        const examRes = ensure(await supabase.from("exams").select("*").eq("id", examId).maybeSingle());
        if (!examRes.data) return { exam: null, questions: [] };

        const { data: links } = ensure(
            await supabase
                .from("exam_questions")
                .select("position, created_at, questions(*)")
                .eq("exam_id", examId)
                .order("position")
                .order("created_at")
        );
        return { exam: examRes.data, questions: (links ?? []).map((l) => l.questions).filter(Boolean) };
    }, [examId]);

    if (loading) return <PageLoader />;
    if (error) return <ErrorState message={error} onRetry={reload} />;
    if (!data?.exam) {
        return (
            <main className="mx-auto max-w-2xl px-4 py-12 text-center">
                <p>This exam doesn't exist.</p>
                <Link href={backHref} className="mt-4 inline-block text-primary hover:underline">Back</Link>
            </main>
        );
    }

    const { exam, questions } = data;
    const objective = questions.filter((q) => q.question_type !== "Theory");
    const theory = questions.filter((q) => q.question_type === "Theory");
    const both = objective.length > 0 && theory.length > 0;
    const markOf = (q) => q.marks ?? 1;
    const objectiveMarks = objective.reduce((sum, q) => sum + markOf(q), 0);
    const theoryMarks = theory.reduce((sum, q) => sum + markOf(q), 0);
    const maxMarks = objectiveMarks + theoryMarks;

    return (
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
            <style>{`
                @page { size: A4; margin: 15mm; }
                @media print {
                    body * { visibility: hidden !important; }
                    #paper, #paper * { visibility: visible !important; }
                    #paper { position: absolute; top: 0; left: 0; width: 100%; margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
                    .paper-q { break-inside: avoid; }
                    .paper-break { break-before: page; }
                }
            `}</style>

            <Link href={backHref} className="text-sm text-muted">← Back to the exam</Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Print question paper</h1>
            <p className="mt-1 text-sm text-muted">
                Set up the paper below, then print it. In the print window choose "Save as PDF" if you want a file.
            </p>

            <div className="mt-6 rounded-xl border border-border bg-card p-5">
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1">
                        <label htmlFor="school" className="text-sm font-medium">School name</label>
                        <input id="school" value={school} onChange={(e) => setSchool(e.target.value)} className={inputClass} />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="class" className="text-sm font-medium">Class</label>
                        <input id="class" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g. SS2" className={inputClass} />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="date" className="text-sm font-medium">Date (optional)</label>
                        <input id="date" value={date} onChange={(e) => setDate(e.target.value)} placeholder="e.g. 12 March 2027" className={inputClass} />
                    </div>
                </div>

                <div className="mt-4 space-y-1">
                    <label htmlFor="instructions" className="text-sm font-medium">Instructions</label>
                    <textarea
                        id="instructions"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none"
                    />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Toggle checked={showOptions} onChange={setShowOptions} label="Show options in Section A" hint="Off: objective questions print as plain questions with a line to write the answer." />
                    <Toggle checked={showMarks} onChange={setShowMarks} label="Show marks" hint="Prints the marks beside theory questions." />
                    <Toggle checked={showAnswers} onChange={setShowAnswers} label="Show the answers" hint="For a teacher's copy. Leave off for students." />
                    <Toggle checked={scheme} onChange={setScheme} label="Add a marking scheme page" hint="An extra last page with the answers and your marking guides." />
                </div>

                <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                    <div className="space-y-1">
                        <label htmlFor="lines" className="text-sm font-medium">Answer lines under each theory question</label>
                        <select id="lines" value={lines} onChange={(e) => setLines(Number(e.target.value))} className={`${inputClass} w-40`}>
                            {[0, 3, 6, 10, 15].map((n) => <option key={n} value={n}>{n === 0 ? "None" : `${n} lines`}</option>)}
                        </select>
                    </div>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-white cursor-pointer"
                    >
                        <Printer size={16} /> Print
                    </button>
                </div>

                {questions.length === 0 && (
                    <p className="mt-4 text-sm text-yellow-800">This exam has no questions yet, so the paper below is empty.</p>
                )}
            </div>

            <div
                id="paper"
                className="mx-auto mt-6 w-full max-w-[210mm] bg-white p-[15mm] text-black shadow-md"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
                <header className="text-center">
                    <p className="text-lg font-bold uppercase">{school || "\u00A0"}</p>
                    <p className="mt-1 text-xl font-bold uppercase">{exam.title}</p>
                    <p className="mt-1 text-sm">
                        {exam.subject} · {exam.exam_type}{className ? ` · ${className}` : ""}
                    </p>
                </header>

                <div className="mt-3 flex justify-between text-sm font-semibold">
                    <span>Time allowed: {minutes(exam.duration_minutes)}</span>
                    <span>Maximum marks: {maxMarks}</span>
                </div>

                <div className="mt-4 flex gap-6 text-sm">
                    <span className="flex-1 border-b border-black pb-1">Name:</span>
                    <span className="w-40 border-b border-black pb-1">Class:{className ? ` ${className}` : ""}</span>
                    <span className="w-48 border-b border-black pb-1">Date:{date ? ` ${date}` : ""}</span>
                </div>

                {instructions.trim() && (
                    <p className="mt-4 whitespace-pre-line text-sm"><span className="font-semibold">Note: </span>{instructions}</p>
                )}

                {objective.length > 0 && (
                    <section className="mt-6">
                        <h2 className="text-center font-bold uppercase">{both ? "Section A" : "Objective questions"}</h2>
                        {showMarks && <p className="text-right text-sm">Marks: {objectiveMarks}</p>}

                        <ol className="mt-3 space-y-4">
                            {objective.map((q, i) => {
                                const opts = q.options ?? [];
                                const compact = opts.every((o) => String(o).length <= 28);
                                return (
                                    <li key={q.id} className="paper-q text-sm">
                                        <p className="whitespace-pre-line"><span className="mr-2">{i + 1}.</span>{q.question_text}</p>

                                        {showOptions ? (
                                            <div className={`ml-6 mt-1 grid gap-x-8 gap-y-0.5 ${compact ? "grid-cols-2" : "grid-cols-1"}`}>
                                                {opts.map((opt, k) => {
                                                    const right = showAnswers && k === q.correct_index;
                                                    return (
                                                        <p key={k} className={right ? "font-bold" : ""}>
                                                            ({letter(k)}) {opt}{right ? " ✓" : ""}
                                                        </p>
                                                    );
                                                })}
                                            </div>
                                        ) : showAnswers ? (
                                            <p className="ml-6 mt-1 font-bold">Answer: {letter(q.correct_index)}. {opts[q.correct_index]}</p>
                                        ) : (
                                            <div className="ml-6 mt-5 border-b border-dotted border-black" />
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    </section>
                )}

                {theory.length > 0 && (
                    <section className="mt-8">
                        <h2 className="text-center font-bold uppercase">{both ? "Section B" : "Theory questions"}</h2>
                        {showMarks && <p className="text-right text-sm">Marks: {theoryMarks}</p>}

                        <ol className="mt-3 space-y-5">
                            {theory.map((q, i) => (
                                <li key={q.id} className="paper-q text-sm">
                                    {showMarks && (
                                        <span className="float-right ml-4 whitespace-nowrap text-xs">
                                            [{markOf(q)} mark{markOf(q) === 1 ? "" : "s"}]
                                        </span>
                                    )}
                                    <p className="whitespace-pre-line"><span className="mr-2">{i + 1}.</span>{q.question_text}</p>
                                    {Array.from({ length: lines }, (_, k) => (
                                        <div key={k} className="mt-6 border-b border-black/60" />
                                    ))}
                                </li>
                            ))}
                        </ol>
                    </section>
                )}

                <p className="mt-8 text-center text-xs font-semibold uppercase tracking-widest">End of paper</p>

                {scheme && (
                    <section className="paper-break mt-10">
                        <h2 className="text-center font-bold uppercase">Marking scheme: {exam.title}</h2>

                        {objective.length > 0 && (
                            <div className="mt-4 text-sm">
                                <p className="font-semibold">{both ? "Section A" : "Objective"} answers</p>
                                <div className="mt-2 grid grid-cols-5 gap-y-1">
                                    {objective.map((q, i) => (
                                        <span key={q.id}>{i + 1}. {letter(q.correct_index ?? 0)}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {theory.length > 0 && (
                            <div className="mt-5 text-sm">
                                <p className="font-semibold">{both ? "Section B" : "Theory"} marking guide</p>
                                <ol className="mt-2 space-y-3">
                                    {theory.map((q, i) => (
                                        <li key={q.id} className="paper-q">
                                            <p className="font-semibold">{i + 1}. [{markOf(q)} mark{markOf(q) === 1 ? "" : "s"}]</p>
                                            <p className="whitespace-pre-line">{q.model_answer || "No marking guide written."}</p>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </main>
    )
}