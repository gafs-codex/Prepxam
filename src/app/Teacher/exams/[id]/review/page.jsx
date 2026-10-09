"use client"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { ArrowUp, ArrowDown, Pencil, X, Plus } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { PageLoader } from "@/components/ui/Spinner"

export default function ReviewExam() {
    const { id } = useParams();
    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);

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

            const { data: links, error: linkError } = await supabase
                .from("exam_questions")
                .select("position, created_at, questions(*)")
                .eq("exam_id", id)
                .order("position")
                .order("created_at");

            if (linkError) toast.error("Could not load questions");
            else setQuestions(links.map((l) => l.questions).filter(Boolean));
            setLoading(false);
        }
        load();
    }, [id]);

    async function savePositions(list) {
        const results = await Promise.all(
            list.map((q, i) =>
                supabase.from("exam_questions")
                    .update({ position: i })
                    .eq("exam_id", id)
                    .eq("question_id", q.id)
                    .select()
            )
        );
        if (results.some((r) => r.error || !r.data || r.data.length === 0)) {
            toast.error("Could not save the new order. The exam may be locked.");
        }
    }

    function move(index, direction) {
        const target = index + direction;
        if (target < 0 || target >= questions.length) return;
        const next = [...questions];
        [next[index], next[target]] = [next[target], next[index]];
        setQuestions(next);
        savePositions(next);
    }

    async function removeQuestion(questionId) {
        const { data, error } = await supabase
            .from("exam_questions")
            .delete()
            .eq("exam_id", id)
            .eq("question_id", questionId)
            .select();

        if (error || !data || data.length === 0) {
            toast.error("Could not remove it. The exam may be locked.");
            if (error) console.error(error);
            return;
        }
        const next = questions.filter((q) => q.id !== questionId);
        setQuestions(next);
        savePositions(next);
        toast.success("Removed from exam");
    }

    if (loading) return <PageLoader />;
    if (!exam) return <main className="p-8">Exam not found.</main>;

    const locked = exam.status === "pending" || exam.status === "approved";
    const iconBtn = "inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer";

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <Link href="/Teacher/exams" className="text-sm text-muted">← My exams</Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{exam.title}</h1>
            <p className="mt-1 text-sm text-muted">
                {exam.subject} · {exam.exam_type} · {exam.duration_minutes} min
            </p>

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