"use client"
import Link from "next/link"
import { useParams } from "next/navigation";
import { Library, CirclePlus } from 'lucide-react';
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { PageLoader } from "@/components/ui/Spinner"
import ErrorState from "@/components/ui/ErrorState"
import CreateQuestionForm from "@/components/CreateQuestionForm";
import AddFromBank from "@/components/AddFromBank";
import { useLoader } from "@/lib/useLoader";
import { ensure, safe, notifyError } from "@/lib/net";

export default function ExamOverview() {
    const { id } = useParams();
    const [activePanel, setActivePanel] = useState("bank");

    const { data, setData, error, loading, reload } = useLoader(async () => {
        const examRes = ensure(await supabase.from("exams").select("*").eq("id", id).maybeSingle());
        if (!examRes.data) return { exam: null, questions: [] };

        const { data: links } = ensure(
            await supabase
                .from("exam_questions")
                .select("position, questions(*)")
                .eq("exam_id", id)
                .order("position")
        );

        return {
            exam: examRes.data,
            questions: (links ?? []).map((l) => l.questions).filter(Boolean),
        };
    }, [id]);

    async function addQuestionsToExam(newQuestions) {
        const current = data?.questions ?? [];
        const existingIds = new Set(current.map((q) => q.id));
        const toAdd = newQuestions.filter((q) => !existingIds.has(q.id));
        if (toAdd.length === 0) return;

        const rows = toAdd.map((q, i) => ({
            exam_id: id,
            question_id: q.id,
            position: current.length + i,
        }));

        const { error: insertError } = await safe(supabase.from("exam_questions").insert(rows), 20000);
        if (insertError) {
            notifyError(insertError, "Could not add to exam");
            return;
        }
        setData((prev) => ({ ...prev, questions: [...prev.questions, ...toAdd] }));
        toast.success(`${toAdd.length} question(s) added`);
    }

    if (loading) return <PageLoader />;
    if (error) return <ErrorState message={error} onRetry={reload} />;
    if (!data?.exam) {
        return (
            <main className="mx-auto max-w-2xl px-4 py-12 text-center">
                <p>This exam doesn't exist or isn't yours.</p>
                <Link href="/Teacher/exams" className="mt-4 inline-block text-primary hover:underline">Back to my exams</Link>
            </main>
        );
    }

    const { exam, questions: examQuestions } = data;
    const totalNeeded = exam.number_of_questions;
    const locked = exam.status === "pending" || exam.status === "approved";

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <Link href="/Teacher/exams" className="text-sm text-muted">← My exams</Link>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Step 2 of 2 · {exam.exam_type} · {exam.subject}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Add questions to {exam.title}
            </h1>

            <div className="mt-4 rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                        {examQuestions.length} of {totalNeeded} questions added
                    </p>

                    <Link href={`/Teacher/exams/${id}/review`} className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs">
                        Done — review exam
                    </Link>
                </div>

                <div
                    aria-valuemax={totalNeeded}
                    aria-valuenow={examQuestions.length}
                    aria-valuemin="0"
                    role="progressbar"
                    className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20 mt-3"
                >
                    <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.min((examQuestions.length / totalNeeded) * 100, 100)}%` }}
                    />
                </div>
            </div>

            {locked ? (
                <div className="mt-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
                    {exam.status === "pending"
                        ? "This exam is waiting for admin approval, so questions can't be added. Withdraw it from My exams first to make changes."
                        : "This exam is approved and published, so questions can't be added."}
                </div>
            ) : (
                <>
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <button
                            onClick={() => setActivePanel("bank")}
                            type="button"
                            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition cursor-pointer ${activePanel === "bank" ? "border-primary bg-accent/40" : "border-border bg-card hover:bg-accent/40"}`}
                        >
                            <Library className="text-primary" />
                            <span>
                                <span className="block font-medium">Add from question bank</span>
                                <span className="block text-xs text-muted">Pick existing {exam.subject} · {exam.exam_type} questions</span>
                            </span>
                        </button>

                        <button
                            onClick={() => setActivePanel("create")}
                            type="button"
                            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition cursor-pointer ${activePanel === "create" ? "border-primary bg-accent/40" : "border-border bg-card hover:bg-accent/40"}`}
                        >
                            <CirclePlus className="text-primary" width={24} height={24} />
                            <span>
                                <span className="block font-medium">Create a new question</span>
                                <span className="block text-xs text-muted">Write a new {exam.subject} · {exam.exam_type} question</span>
                            </span>
                        </button>
                    </div>

                    <div className="mt-6">
                        <div className={activePanel === "create" ? "" : "hidden"}>
                            <CreateQuestionForm
                                lockedSubject={exam.subject}
                                lockedExamType={exam.exam_type}
                                submitLabel="Save and add to exam"
                                onQuestionCreated={(question) => addQuestionsToExam([question])}
                                onCancel={() => setActivePanel("bank")}
                            />
                        </div>

                        <div className={activePanel === "bank" ? "" : "hidden"}>
                            <AddFromBank
                                subject={exam.subject}
                                examType={exam.exam_type}
                                addedIds={examQuestions.map((q) => q.id)}
                                onAddSelected={addQuestionsToExam}
                            />
                        </div>
                    </div>
                </>
            )}
        </main>
    )
}