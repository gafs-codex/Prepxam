"use client"
import Link from "next/link"
import { useState } from "react";
import { Library, CirclePlus, Search } from 'lucide-react';
import CreateQuestionForm from "@/components/CreateQuestionForm";
import AddFromBank from "@/components/AddFromBank";

const TOTAL_NEEDED = 20; // from exam.numberOfQuestions later

export default function ExamOverview() {
    const [activePanel, setActivePanel] = useState("bank")
    const [examQuestions, setExamQuestions] = useState([])


    function addQuestionsToExam(newQuestions) {
        setExamQuestions((prev) => {
            const existingIds = new Set(prev.map((questions) => questions.id))
            const deduped = newQuestions.filter((question) => !existingIds.has(question.id));
            return [...prev, ...deduped];
        })
    }
    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <Link href={``}>
                Exam overview
            </Link>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Step 2 of 2 · Internal test · Mathematics
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                Add questions to (name of exam)
            </h1>

            <div className="mt-4 rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                        {examQuestions.length} of {TOTAL_NEEDED} questions added
                    </p>

                    <Link href={``} className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs active">
                        Done — review exam
                    </Link>
                </div>

                <div
                    aria-valuemax={TOTAL_NEEDED}
                    aria-valuenow={examQuestions.length}
                    aria-valuemin="0"
                    role="progressbar"
                    data-state="indeterminate"
                    data-max="100"
                    className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20 mt-3"
                >
                    <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.min((examQuestions.length / TOTAL_NEEDED) * 100, 100)}%` }}
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
                        <span className="block text-xs text-muted">Pick existing Mathematics · Internal test questions</span>
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
                        <span className="block text-xs text-muted">Pick existing Mathematics · Internal test questions</span>
                    </span>
                </button>
            </div>

            <div className="mt-6">
                {activePanel === "create" ? (<CreateQuestionForm onQuestionCreated={(question) => addQuestionsToExam([question])} />)
                    : (<AddFromBank onAddSelected={addQuestionsToExam} />)
                }
            </div>
        </main>
    )
}