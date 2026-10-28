"use client"
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { PageLoader } from "@/components/ui/Spinner"
import ErrorState from "@/components/ui/ErrorState"
import { useLoader } from "@/lib/useLoader";
import { ensure, safe, notifyError } from "@/lib/net";

const inputDisabled = "disabled:opacity-60 disabled:cursor-not-allowed";

export default function EditQuestion() {
    const { id } = useParams();
    const router = useRouter();
    const [locked, setLocked] = useState(false);
    const [saving, setSaving] = useState(false);
    const [questionText, setQuestionText] = useState("");
    const [options, setOptions] = useState(["", "", "", ""]);
    const [correctIndex, setCorrectIndex] = useState(null);
    const [explanation, setExplanation] = useState("");
    const [marks, setMarks] = useState("5");
    const [modelAnswer, setModelAnswer] = useState("");

    const { data, error, loading, reload } = useLoader(async () => {
        const [questionRes, lockedRes] = await Promise.all([
            supabase.from("questions").select("*").eq("id", id).maybeSingle(),
            supabase.rpc("locked_question_ids"),
        ]);

        ensure(questionRes);
        if (lockedRes.error) console.error(lockedRes.error);

        return {
            question: questionRes.data,
            locked: lockedRes.error ? false : (lockedRes.data ?? []).includes(id),
        };
    }, [id]);

    // every hook is above this line, so the order never changes between renders
    useEffect(() => {
        if (!data?.question) return;
        const q = data.question;
        setQuestionText(q.question_text ?? "");
        setOptions(Array.isArray(q.options) && q.options.length > 0 ? q.options : ["", "", "", ""]);
        setCorrectIndex(q.correct_index ?? null);
        setExplanation(q.explanation || "");
        setMarks(String(q.marks ?? 5));
        setModelAnswer(q.model_answer ?? "");
        setLocked(data.locked);
    }, [data]);

    const isTheory = data?.question?.question_type === "Theory";

    function updateOption(index, value) {
        setOptions((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (locked || saving) return;

        if (questionText.trim() === "") {
            toast.error("Question field cannot be empty");
            return;
        }

        let changes;
        if (isTheory) {
            const m = Number(marks);
            if (!Number.isInteger(m) || m < 1 || m > 100) {
                toast.error("Marks must be a whole number from 1 to 100");
                return;
            }
            changes = { question_text: questionText, marks: m, model_answer: modelAnswer.trim() || null, explanation };
        } else {
            if (options.some((o) => String(o).trim() === "")) {
                toast.error("Some options are empty");
                return;
            }
            if (correctIndex === null) {
                toast.error("Please pick the correct option");
                return;
            }
            changes = { question_text: questionText, options, correct_index: correctIndex, explanation };
        }

        setSaving(true);
        const { data: saved, error: saveError } = await safe(
            supabase.from("questions").update(changes).eq("id", id).select(),
            20000
        );
        setSaving(false);

        if (saveError) {
            notifyError(saveError, "Failed to save");
            return;
        }
        if (!saved || saved.length === 0) {
            toast.error("This question is used in a submitted or approved exam and can't be changed.");
            setLocked(true);
            return;
        }

        toast.success("Question updated");
        router.push("/Teacher/questions");
    }

    if (loading) return <PageLoader />;
    if (error) return <ErrorState message={error} onRetry={reload} />;
    if (!data?.question) {
        return (
            <main className="mx-auto max-w-2xl px-4 py-12 text-center">
                <p>This question doesn't exist or isn't yours.</p>
                <Link href="/Teacher/questions" className="mt-4 inline-block text-primary hover:underline">Back to question bank</Link>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <Link href="/Teacher/questions" className="mb-3 inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm cursor-pointer hover:bg-accent">
                Back
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">Edit question</h1>

            {locked && (
                <div className="mt-4 max-w-3xl rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
                    This question can't be edited because it's used in an exam that is pending or approved, or students have already answered it. Go back to the question bank and use "Copy & edit" to make an editable copy.
                </div>
            )}

            <div className="mt-6 max-w-3xl">
                <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-card p-5">
                    <div className="space-y-2">
                        <label htmlFor="qtext" className="text-sm font-medium leading-none">Question text</label>
                        <textarea
                            id="qtext"
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                            disabled={locked}
                            className={`flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm outline-none ${inputDisabled}`}
                        />
                    </div>

                    {isTheory ? (
                        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
                            <div className="space-y-2">
                                <label htmlFor="marks" className="text-sm font-medium leading-none">Marks</label>
                                <input
                                    id="marks"
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={marks}
                                    onChange={(e) => setMarks(e.target.value)}
                                    disabled={locked}
                                    className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm outline-none ${inputDisabled}`}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="guide" className="text-sm font-medium leading-none">Marking guide (only you see this)</label>
                                <textarea
                                    id="guide"
                                    value={modelAnswer}
                                    onChange={(e) => setModelAnswer(e.target.value)}
                                    disabled={locked}
                                    className={`flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm outline-none ${inputDisabled}`}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <label className="text-sm font-medium leading-none">Answer options. Select the correct one</label>
                            <div className="grid gap-2">
                                {options.map((option, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <input
                                            type="radio"
                                            checked={correctIndex === index}
                                            onChange={() => setCorrectIndex(index)}
                                            disabled={locked}
                                            className="h-5 w-5 cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
                                        />
                                        <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => updateOption(index, e.target.value)}
                                            disabled={locked}
                                            className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm outline-none ${inputDisabled}`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label htmlFor="explanation" className="text-sm font-medium leading-none">Explanation (shown after the exam)</label>
                        <textarea
                            id="explanation"
                            value={explanation}
                            onChange={(e) => setExplanation(e.target.value)}
                            disabled={locked}
                            className={`flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm outline-none ${inputDisabled}`}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={locked || saving}
                        className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow cursor-pointer hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save changes"}
                    </button>
                </form>
            </div>
        </main>
    )
}