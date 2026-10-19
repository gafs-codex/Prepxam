"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { findExamProblems } from "@/lib/examChecks"
import ResultsPanel from "@/components/ResultsPanel"
import { PageLoader } from "@/components/ui/Spinner"
import ErrorState from "@/components/ui/ErrorState"
import { useLoader } from "@/lib/useLoader"
import { ensure, safe, notifyError } from "@/lib/net"
import ExamAccessPanel from "@/components/ExamAccessPanel"



export default function AdminExamDetail() {
    const { id } = useParams();
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);

    const { data, setData, error, loading, reload } = useLoader(async () => {
        const examRes = ensure(
            await supabase.from("exams").select("*").eq("id", id).maybeSingle()
        );
        if (!examRes.data) return { exam: null, questions: [], teacher: "" };

        const linksRes = ensure(
            await supabase
                .from("exam_questions")
                .select("position, questions(*)")
                .eq("exam_id", id)
                .order("position")
        );

        // the teacher's name is nice to have. The page still works without it.
        const { data: profile } = await safe(
            supabase.from("profiles").select("full_name").eq("id", examRes.data.created_by).maybeSingle()
        );

        return {
            exam: examRes.data,
            questions: (linksRes.data ?? []).map((l) => l.questions).filter(Boolean),
            teacher: profile?.full_name ?? "Unknown teacher",
        };
    }, [id]);

    // fill the note box once, when the exam first loads
    useEffect(() => {
        if (data?.exam) setNote(data.exam.review_note ?? "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.exam?.id]);

    if (loading) return <PageLoader />;
    if (error) return <ErrorState message={error} onRetry={reload} />;
    if (!data?.exam) {
        return (
            <main className="mx-auto max-w-2xl px-4 py-12 text-center">
                <p>This exam doesn't exist.</p>
                <Link href="/Admin/exams" className="mt-4 inline-block text-primary hover:underline">Back to all exams</Link>
            </main>
        );
    }

    const { exam, questions, teacher } = data;
    const problems = findExamProblems(exam, questions);

    async function decide(newStatus) {
        if (saving) return;

        if (newStatus === "rejected" && note.trim() === "") {
            toast.error("Please write a note so the teacher knows what to fix");
            return;
        }
        if (newStatus === "approved" && problems.length > 0) {
            if (!window.confirm(`This exam has ${problems.length} problem(s). Approve anyway?`)) return;
        }

        setSaving(true);
        const { data: updated, error: updateError } = await safe(
            supabase
                .from("exams")
                .update({
                    status: newStatus,
                    review_note: newStatus === "rejected" ? note.trim() : null,
                })
                .eq("id", id)
                .select()
                .single(),
            20000
        );
        setSaving(false);

        if (updateError) {
            notifyError(updateError, "Could not update");
            return;
        }

        setData((prev) => ({ ...prev, exam: updated }));
        toast.success(newStatus === "approved" ? "Exam approved" : "Exam rejected");
    }

    return (
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
            <Link href="/Admin/exams" className="text-sm text-muted">← All exams</Link>
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

            {exam.status !== "approved" && (
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
                            disabled={saving}
                            onClick={() => decide("approved")}
                            className="inline-flex h-9 items-center rounded-md bg-green-600 px-4 text-sm font-medium text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? "Saving..." : "Approve"}
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
            )}

            {
                exam.status === "approved" && !exam.results_released && (
                    <ExamAccessPanel
                        exam={exam}
                        onChange={(updated) => setData((prev) => ({ ...prev, exam: updated }))}
                    />
                )
            }
            {exam.status === "approved" && (
                <ResultsPanel
                    exam={exam}
                    onChange={(updated) => setData((prev) => ({ ...prev, exam: updated }))}
                />
            )}
        </main>
    )
}