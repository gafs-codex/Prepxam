"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { findExamProblems } from "@/lib/examChecks"
import ResultsPanel from "@/components/ResultsPanel"
import { PageLoader } from "@/components/ui/Spinner"

export default function AdminExamDetail() {
    const { id } = useParams();
    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [teacher, setTeacher] = useState("");
    const [loading, setLoading] = useState(true);
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function load() {
            const { data: examData, error } = await supabase
                .from("exams").select("*").eq("id", id).single();
            if (error) {
                toast.error("Could not load exam");
                setLoading(false);
                return;
            }
            setExam(examData);
            setNote(examData.review_note ?? "");

            const { data: links } = await supabase
                .from("exam_questions")
                .select("position, questions(*)")
                .eq("exam_id", id)
                .order("position");
            setQuestions((links ?? []).map((l) => l.questions).filter(Boolean));

            const { data: profile } = await supabase
                .from("profiles").select("full_name").eq("id", examData.created_by).maybeSingle();
            setTeacher(profile?.full_name ?? "Unknown teacher");
            setLoading(false);
        }
        load();
    }, [id]);

    async function decide(newStatus) {
        if (newStatus === "rejected" && note.trim() === "") {
            toast.error("Please write a note so the teacher knows what to fix");
            return;
        }
        if (newStatus === "approved" && problems.length > 0) {
            if (!window.confirm(`This exam has ${problems.length} problem(s). Approve anyway?`)) return;
        }

        setSaving(true);
        const { data, error } = await supabase
            .from("exams")
            .update({
                status: newStatus,
                review_note: newStatus === "rejected" ? note.trim() : null,
            })
            .eq("id", id)
            .select()
            .single();
        setSaving(false);

        if (error) {
            toast.error(`Could not update: ${error.message}`);
            return;
        }
        setExam(data);
        toast.success(newStatus === "approved" ? "Exam approved" : "Exam rejected");
    }

    if (loading) return <PageLoader />;
    if (!exam) return <main className="p-8">Exam not found.</main>;

    const problems = findExamProblems(exam, questions);

    return (
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
            <Link href="/Admin/exam" className="text-sm text-muted">← All exams</Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{exam.title}</h1>
            <p className="mt-1 text-sm text-muted">
                {teacher} · {exam.subject} · {exam.exam_type} · {exam.duration_minutes} min · status: <span className="font-medium capitalize">{exam.status}</span>
            </p>
            {exam.description && <p className="mt-2 text-sm">{exam.description}</p>}

            <div className={`mt-6 rounded-xl border p-4 ${problems.length > 0 ? "border-red-300 bg-red-50" : "border-green-300 bg-green-50"}`}>
                {problems.length === 0 ? (
                    <p className="text-sm font-medium text-green-800">No problems found.</p>
                ) : (
                    <>
                        <p className="text-sm font-medium text-red-800">{problems.length} problem(s) found</p>
                        <ul className="mt-2 list-disc pl-5 text-sm text-red-800">
                            {problems.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                    </>
                )}
            </div>

            <div className="mt-6 space-y-3">
                {questions.map((q, index) => (
                    <div key={q.id} className="rounded-lg border border-border bg-card p-4">
                        <p className="font-medium">{index + 1}. {q.question_text}</p>
                        <ul className="mt-2 space-y-1 text-sm">
                            {(q.options ?? []).map((opt, i) => (
                                <li key={i} className={i === q.correct_index ? "font-medium text-green-600" : "text-muted"}>
                                    {String.fromCharCode(65 + i)}. {opt}{i === q.correct_index && " ✓"}
                                </li>
                            ))}
                        </ul>
                        {q.explanation && <p className="mt-2 text-xs text-muted">Explanation: {q.explanation}</p>}
                    </div>
                ))}
            </div>

            <div className="mt-8 rounded-xl border border-border bg-card p-5">
                <h2 className="font-medium">Decision</h2>
                <label className="mt-3 block text-sm text-muted">
                    Note to the teacher (required when rejecting)
                </label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none"
                    placeholder="e.g. Question 4 has two correct answers"
                />
                <div className="mt-4 flex gap-3">
                    <button
                        type="button"
                        disabled={saving || exam.status === "approved"}
                        onClick={() => decide("approved")}
                        className="inline-flex h-9 items-center rounded-md bg-green-600 px-4 text-sm font-medium text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Approve
                    </button>
                    <button
                        type="button"
                        disabled={saving || exam.status === "rejected"}
                        onClick={() => decide("rejected")}
                        className="inline-flex h-9 items-center rounded-md border border-red-300 px-4 text-sm font-medium text-red-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Reject
                    </button>
                </div>
            </div>

            {exam.status === "approved" && <ResultsPanel exam={exam} onChange={setExam} />}
        </main>
    )
}