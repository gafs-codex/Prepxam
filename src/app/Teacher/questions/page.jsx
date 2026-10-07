"use client"
import Link from "next/link"
import { Plus, Search, Pencil, Trash2 } from "lucide-react"
import { useState, useEffect } from "react"
import FilterDropdown from "@/components/FilterDropdown"
import { supabase } from "@/lib/supabase"
import { PageLoader } from "@/components/ui/Spinner"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const QuestionType = ["All types", "Multiple choice", "True or false", "Fill in the gap"]

export default function QuestionBank() {
    const [questionType, setQuestionType] = useState("All types")
    const [questions, setQuestions] = useState([])
    const [loading, setLoading] = useState(true)
    const [deletingId, setDeletingId] = useState(null)

    useEffect(() => {
        loadQuestions();
    }, []);

    async function loadQuestions() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from("questions")
            .select("*")
            .eq("created_by", user.id)
            .order("created_at", { ascending: false });

        if (!error) {
            setQuestions(data);
        }
        setLoading(false);
    }

    async function handleDelete(id) {
        setDeletingId(id);

        const { error } = await supabase
            .from("questions")
            .delete()
            .eq("id", id);

        setDeletingId(null);

        if (error) {
            toast.error("Failed to delete question");
            console.error(error);
            return;
        }

        setQuestions((prev) => prev.filter((q) => q.id !== id));
        toast.success("Question has been deleted");
    }

    const filteredQuestions = questionType === "All types"
        ? questions
        : questions.filter((q) => q.question_type === questionType);

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Question bank</h1>
                    <p className="mt-1 text-sm text-muted">
                        {filteredQuestions.length} of {questions.length} questions
                    </p>
                </div>

                <Link href={`/Teacher/questions/new`} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer bg-primary text-white shadow hover:bg-primary/90 h-9 px-3 py-2">
                    <Plus />
                    Add question
                </Link>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <Search width={24} height={24} fill='none' strokeWidth={2} className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted' />
                    <input
                        type="text"
                        className='flex h-9 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-1 text-base shadow-sm outline-none'
                        placeholder="Search by keyword"
                    />
                </div>

                <FilterDropdown options={QuestionType} value={questionType} onChange={setQuestionType} />
            </div>

            <div className="mt-6 space-y-3">
                {loading ? (
                    <PageLoader />
                ) : filteredQuestions.length === 0 ? (
                    <p className="text-sm text-muted">No questions yet — create your first one.</p>
                ) : (
                    filteredQuestions.map((q) => (
                        <div key={q.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                            <div>
                                <p className="text-sm font-medium">{q.question_text}</p>
                                <div className="mt-2 flex gap-2">
                                    <span className="rounded-full border px-2 py-0.5 text-xs text-muted">
                                        {q.question_type}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Link
                                    href={`/Teacher/questions/${q.id}/edit`}
                                    className="inline-flex items-center justify-center rounded-md border border-input bg-background shadow-sm hover:bg-accent h-9 w-9"
                                >
                                    <Pencil className="h-4 w-4" />
                                </Link>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <button className="inline-flex items-center justify-center rounded-md border border-input bg-background shadow-sm hover:bg-accent h-9 w-9 text-destructive">
                                            <Trash2 className="h-4 w-4" color="red" />
                                        </button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                It will also be removed from any exam that uses it. This cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <div className="flex justify-end gap-2">
                                            <AlertDialogCancel className={`cursor-pointer`}>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(q.id)} className={`text-white cursor-pointer`}>
                                                Delete
                                            </AlertDialogAction>
                                        </div>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </main>
    )
}