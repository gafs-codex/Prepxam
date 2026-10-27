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


export default function EditQuestion() {
    // const isTheory = data?.question?.question_type === "Theory";

    
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
        // the lock notice is a nicety. The database still blocks the save if this fails.
        if (lockedRes.error) console.error(lockedRes.error);

        return {
            question: questionRes.data,
            locked: lockedRes.error ? false : (lockedRes.data ?? []).includes(id),
        };
    }, [id]);

    // fill the form once the question has loaded
    useEffect(() => {
        if (!data?.question) return;
        const q = data.question;
        setQuestionText(q.question_text);
        setOptions(q.options ?? ["", "", "", ""]);
        setCorrectIndex(q.correct_index);
        setExplanation(q.explanation || "");
        setLocked(data.locked);
        setMarks(String(q.marks ?? 5));
        setModelAnswer(q.model_answer ?? "");
    }, [data]);

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
        if (options.some((o) => o.trim() === "")) {
            toast.error("Some options are empty");
            return;
        }
        if (correctIndex === null) {
            toast.error("Please pick the correct option");
            return;
        }

        setSaving(true);
        const { data: saved, error: saveError } = await safe(
            supabase
                .from("questions")
                .update({
                    question_text: questionText,
                    options: options,
                    correct_index: correctIndex,
                    explanation: explanation,
                })
                .eq("id", id)
                .select(),
            20000
        );
        setSaving(false);

        if (saveError) {
            notifyError(saveError, "Failed to save");
            return;
        }
        // RLS can block an update without an error, so check a row really changed
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

    const inputDisabled = "disabled:opacity-60 disabled:cursor-not-allowed";

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <Link href="/Teacher/questions" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer border border-input bg-background shadow-sm hover:bg-accent h-9 px-4 py-2 mb-3">
                Back
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">Edit question</h1>

            {locked && (
                <div className="mt-4 max-w-3xl rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
                    This question can't be edited because it's used in an exam that is pending or approved, or students have already answered it. If an exam is still pending, withdraw it first to make changes.
                </div>
            )}

            <div className="mt-6 max-w-3xl">
                <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-card p-5">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">Question text</label>
                        <textarea
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                            disabled={locked}
                            className={`flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm outline-none ${inputDisabled}`}
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium leading-none">
                            Answer options — select the correct one
                        </label>
                        <div className="grid gap-2 space-y-2">
                            {options.map((option, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        checked={correctIndex === index}
                                        onChange={() => setCorrectIndex(index)}
                                        disabled={locked}
                                        className="cursor-pointer accent-blue-600 h-5 w-5 disabled:cursor-not-allowed"
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

                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">
                                Explanation (shown after the exam)
                            </label>
                            <textarea
                                value={explanation}
                                onChange={(e) => setExplanation(e.target.value)}
                                disabled={locked}
                                className={`flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm outline-none ${inputDisabled}`}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={locked || saving}
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer bg-primary text-white shadow hover:bg-primary/90 h-9 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? "Saving..." : "Save changes"}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    )
}