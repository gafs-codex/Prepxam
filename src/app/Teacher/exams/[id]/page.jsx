"use client"
import Link from "next/link"
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Library, CirclePlus } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import CreateQuestionForm from "@/components/CreateQuestionForm";
import AddFromBank from "@/components/AddFromBank";

export default function ExamOverview() {

    const { id } = useParams();
    const [exam, setExam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activePanel, setActivePanel] = useState("bank");
    const [examQuestions, setExamQuestions] = useState([]);


    useEffect(() => {
        async function loadExam() {
            const { data: examData, error } = await supabase
                .from("exams")
                .select("*")
                .eq("id", id)
                .single();

            if (error) {
                toast.error("Could not load exam");
                console.error(error);
                setLoading(false);
                return;
            }
            setExam(examData);

            const { data: links, error: linkError } = await supabase
                .from("exam_questions")
                .select("position, questions(*)")
                .eq("exam_id", id)
                .order("position");

            if (linkError) {
                toast.error("Could not load exam questions");
                console.error(linkError);
            } else {
                setExamQuestions(links.map((l) => l.questions).filter(Boolean));
            }
            setLoading(false);
        }
        loadExam();
    }, [id]);

    async function addQuestionsToExam(newQuestions) {
        const existingIds = new Set(examQuestions.map((q) => q.id));
        const toAdd = newQuestions.filter((q) => !existingIds.has(q.id));
        if (toAdd.length === 0) return;

        const rows = toAdd.map((q, i) => ({
            exam_id: id,
            question_id: q.id,
            position: examQuestions.length + i,
        }));

        const { error } = await supabase.from("exam_questions").insert(rows);
        if (error) {
            toast.error(`Could not add to exam: ${error.message}`);
            console.error(error);
            return;
        }
        setExamQuestions((prev) => [...prev, ...toAdd]);
        toast.success(`${toAdd.length} question(s) added`);
    }

    if (loading) return <main className="p-8">Loading...</main>;
    if (!exam) return <main className="p-8">Exam not found.</main>;

    const totalNeeded = exam.number_of_questions;

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <Link href={``}>
                Exam overview
            </Link>
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

                    <Link href={`/Teacher/exams/${id}/review`} className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs active cursor-pointer">
                        Done — review exam
                    </Link>
                </div>

                <div
                    aria-valuemax={totalNeeded}
                    aria-valuenow={examQuestions.length}
                    aria-valuemin="0"
                    role="progressbar"
                    data-state="indeterminate"
                    data-max="100"
                    className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20 mt-3"
                >
                    <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.min((examQuestions.length / totalNeeded) * 100, 100)}%` }}
                    />
                </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                    onClick={() => setActivePanel("bank")}
                    type="button"
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition cursor-pointer ${activePanel === "bank" ? "border-primary bg-accent/40" : "border-border bg-card hover:bg-accent/40"
                        }`}
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
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition cursor-pointer ${activePanel === "create" ? "border-primary bg-accent/40" : "border-border bg-card hover:bg-accent/40"
                        }`}
                >
                    <CirclePlus className="text-primary" width={24} height={24} />
                    <span>
                        <span className="block font-medium">Create a new question</span>
                        <span className="block text-xs text-muted">Pick existing {exam.subject} · {exam.exam_type} questions</span>
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
        </main>
    )
}