"use client"
import Link from "next/link"
import { Plus, Search, Pencil, Trash2 } from "lucide-react"
import { useState, useEffect } from "react"
import FilterDropdown from "@/components/FilterDropdown"
import { supabase } from "@/lib/supabase"
import { SectionLoader } from "@/components/ui/Spinner"
import { toast } from "sonner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const QuestionType = ["All types", "Multiple choice", "True or false", "Fill in the gap"]

export default function QuestionBank() {
    const [questionType, setQuestionType] = useState("All types")
    const [search, setSearch] = useState("")
    const [questions, setQuestions] = useState([])
    const [lockedIds, setLockedIds] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadQuestions();
    }, []);

    async function loadQuestions() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        const [questionsRes, lockedRes] = await Promise.all([
            supabase
                .from("questions")
                .select("*")
                .eq("created_by", user.id)
                .order("created_at", { ascending: false }),
            supabase.rpc("locked_question_ids"),
        ]);

        if (!questionsRes.error) setQuestions(questionsRes.data);
        if (!lockedRes.error) setLockedIds(lockedRes.data ?? []);
        setLoading(false);
    }

    async function handleDelete(id) {
        const { data, error } = await supabase
            .from("questions")
            .delete()
            .eq("id", id)
            .select();

        // RLS can block a delete without an error, so check a row was really removed
        if (error || !data || data.length === 0) {
            toast.error("This question is used in a submitted or approved exam and can't be deleted.");
            if (error) console.error(error);
            return;
        }

        setQuestions((prev) => prev.filter((q) => q.id !== id));
        toast.success("Question has been deleted");
    }

    const filteredQuestions = questions.filter((q) =>
        (questionType === "All types" || q.question_type === questionType) &&
        q.question_text.toLowerCase().includes(search.toLowerCase())
    );

    const disabledBtn = "inline-flex items-center justify-center rounded-md border border-input bg-background h-9 w-9 opacity-40 cursor-not-allowed";

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
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className='flex h-9 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-1 text-base shadow-sm outline-none'
                        placeholder="Search by keyword"
                    />
                </div>

                <FilterDropdown options={QuestionType} value={questionType} onChange={setQuestionType} />
            </div>

            <div className="mt-6 space-y-3">
                {loading ? (
                    <SectionLoader />
                ) : filteredQuestions.length === 0 ? (
                    <p className="text-sm text-muted">
                        {questions.length === 0 ? "No questions yet — create your first one." : "No questions match your search."}
                    </p>
                ) : (
                    filteredQuestions.map((q) => {
                        const locked = lockedIds.includes(q.id);

                        return (
                            <div key={q.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                                <div>
                                    <p className="text-sm font-medium">{q.question_text}</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <span className="rounded-full border px-2 py-0.5 text-xs text-muted">
                                            {q.question_type}
                                        </span>
                                        {locked && (
                                            <span
                                                title="Used in a pending or approved exam, or already answered by students"
                                                className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800"
                                            >
                                                In use · locked
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {locked ? (
                                        <>
                                            <span className={disabledBtn} title="Locked"><Pencil className="h-4 w-4" /></span>
                                            <span className={disabledBtn} title="Locked"><Trash2 className="h-4 w-4" color="red" /></span>
                                        </>
                                    ) : (
                                        <>
                                            <Link
                                                href={`/Teacher/questions/${q.id}/edit`}
                                                className="inline-flex items-center justify-center rounded-md border border-input bg-background shadow-sm hover:bg-accent h-9 w-9"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Link>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <button className="inline-flex items-center justify-center rounded-md border border-input bg-background shadow-sm hover:bg-accent h-9 w-9 text-destructive cursor-pointer">
                                                        <Trash2 className="h-4 w-4" color="red" />
                                                    </button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete this question?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            It will also be removed from any draft exam that uses it. This cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <div className="flex justify-end gap-2">
                                                        <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(q.id)} className="text-white cursor-pointer">
                                                            Delete
                                                        </AlertDialogAction>
                                                    </div>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </main>
    )
}