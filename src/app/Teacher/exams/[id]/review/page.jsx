"use client"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowUp, ArrowDown, Pencil, X, Plus } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { PageLoader } from "@/components/ui/Spinner"
import ErrorState from "@/components/ui/ErrorState"
import { useLoader } from "@/lib/useLoader"
import { ensure, safe, notifyError } from "@/lib/net"
import { Printer, MoveLeft } from "lucide-react"

export default function ReviewExam() {
    const { id } = useParams();

    const { data, setData, error, loading, reload } = useLoader(async () => {
        const examRes = ensure(await supabase.from("exams").select("*").eq("id", id).maybeSingle());
        if (!examRes.data) return { exam: null, questions: [] };

        const { data: links } = ensure(
            await supabase
                .from("exam_questions")
                .select("position, created_at, questions(*)")
                .eq("exam_id", id)
                .order("position")
                .order("created_at")
        );

        return {
            exam: examRes.data,
            questions: (links ?? []).map((l) => l.questions).filter(Boolean),
        };
    }, [id]);

    const exam = data?.exam;
    const questions = data?.questions ?? [];

    // returns true when every row saved
    async function savePositions(list) {
        const results = await Promise.all(
            list.map((q, i) =>
                safe(
                    supabase.from("exam_questions")
                        .update({ position: i })
                        .eq("exam_id", id)
                        .eq("question_id", q.id)
                        .select(),
                    20000
                )
            )
        );
        const failed = results.find((r) => r.error || !r.data || r.data.length === 0);
        if (failed) {
            if (failed.error) notifyError(failed.error, "Could not save the new order");
            else toast.error("Could not save the new order. The exam may be locked.");
            return false;
        }
        return true;
    }

    async function move(index, direction) {
        const target = index + direction;
        if (target < 0 || target >= questions.length) return;
        const next = [...questions];
        [next[index], next[target]] = [next[target], next[index]];
        setData((prev) => ({ ...prev, questions: next }));

        const ok = await savePositions(next);
        if (!ok) reload();   // show the order the database really has
    }

    async function removeQuestion(questionId) {
        const { data: removed, error: removeError } = await safe(
            supabase
                .from("exam_questions")
                .delete()
                .eq("exam_id", id)
                .eq("question_id", questionId)
                .select(),
            20000
        );

        if (removeError) {
            notifyError(removeError, "Could not remove it");
            return;
        }
        if (!removed || removed.length === 0) {
            toast.error("Could not remove it. The exam may be locked.");
            return;
        }

        const next = questions.filter((q) => q.id !== questionId);
        setData((prev) => ({ ...prev, questions: next }));
        toast.success("Removed from exam");
        savePositions(next);
    }

    if (loading) return <PageLoader />;
    if (error) return <ErrorState message={error} onRetry={reload} />;
    if (!exam) {
        return (
            <main className="mx-auto max-w-2xl px-4 py-12 text-center">
                <p>This exam doesn't exist or isn't yours.</p>
                <Link href="/Teacher/exams" className="mt-4 inline-block text-primary hover:underline">Back to my exams</Link>
            </main>
        );
    }

    const locked = exam.status === "pending" || exam.status === "approved";
    const iconBtn = "inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer";

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <Link href="/Teacher/exams" className="mb-4 inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm cursor-pointer hover:bg-accent">
                <MoveLeft strokeWidth={1.5} size={16} />
                Back to my exams
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{exam.title}</h1>
            <p className="mt-1 text-sm text-muted">
                {exam.subject} · {exam.exam_type} · {exam.duration_minutes} min
            </p>


            {/* <Link
                href={`/Teacher/exams/${id}/print`}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm cursor-pointer hover:bg-accent"
            >
                <Printer size={16} /> Print paper
            </Link> */}


            {locked && (
                <div className="mt-4 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
                    {exam.status === "pending"
                        ? "This exam is waiting for admin approval, so it can't be edited. To make changes, withdraw it from My exams first."
                        : "This exam is approved and published, so it can't be edited."}
                </div>
            )}

            <div className="mt-6 rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                        {questions.length} of {exam.number_of_questions} questions added
                    </p>
                    {!locked && (
                        <Link
                            href={`/Teacher/exams/${id}`}
                            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 h-9 text-sm font-medium text-white"
                        >
                            <Plus size={16} /> Add questions
                        </Link>
                    )}
                </div>

                <div className="mt-4 space-y-3">
                    {questions.length === 0 && (
                        <p className="text-sm text-muted">No questions yet.</p>
                    )}

                    {questions.map((q, index) => (
                        <div key={q.id} className="rounded-lg border border-border p-4">
                            <div className="flex items-start gap-3">
                                <span className="text-sm text-muted">{index + 1}.</span>
                                <div className="flex-1">
                                    <p className="font-medium">{q.question_text}</p>
                                    {q.question_type === "Theory" ? (
                                        <p className="mt-2 text-sm text-muted">
                                            Theory · {q.marks} mark{q.marks === 1 ? "" : "s"}{q.model_answer ? ` · Guide: ${q.model_answer}` : ""}
                                        </p>
                                    ) : (
                                        <ul className="mt-2 space-y-1 text-sm">
                                            {(q.options ?? []).map((opt, i) => (
                                                <li
                                                    key={i}
                                                    className={i === q.correct_index ? "font-medium text-green-600" : "text-muted"}
                                                >
                                                    {String.fromCharCode(65 + i)}. {opt}
                                                    {i === q.correct_index && " ✓"}
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                </div>

                                {!locked && (
                                    <div className="flex items-center">
                                        <button type="button" className={iconBtn} disabled={index === 0} onClick={() => move(index, -1)}>
                                            <ArrowUp size={16} />
                                        </button>
                                        <button type="button" className={iconBtn} disabled={index === questions.length - 1} onClick={() => move(index, 1)}>
                                            <ArrowDown size={16} />
                                        </button>
                                        <Link href={`/Teacher/questions/${q.id}/edit`} className={iconBtn}>
                                            <Pencil size={16} />
                                        </Link>
                                        <button type="button" className={iconBtn} onClick={() => removeQuestion(q.id)}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    )
}