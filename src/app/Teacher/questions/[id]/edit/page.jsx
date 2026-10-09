"use client"
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { PageLoader } from "@/components/ui/Spinner"
import Link from "next/link";

export default function EditQuestion() {
    const { id } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [locked, setLocked] = useState(false);
    const [saving, setSaving] = useState(false);
    const [questionText, setQuestionText] = useState("");
    const [options, setOptions] = useState(["", "", "", ""]);
    const [correctIndex, setCorrectIndex] = useState(null);
    const [explanation, setExplanation] = useState("");

    useEffect(() => {
        async function loadQuestion() {
            const [questionRes, lockedRes] = await Promise.all([
                supabase.from("questions").select("*").eq("id", id).single(),
                supabase.rpc("locked_question_ids"),
            ]);

            if (questionRes.error) {
                toast.error("Could not load question");
                setLoading(false);
                return;
            }

            const data = questionRes.data;
            setQuestionText(data.question_text);
            setOptions(data.options);
            setCorrectIndex(data.correct_index);
            setExplanation(data.explanation || "");
            setLocked((lockedRes.data ?? []).includes(id));
            setLoading(false);
        }

        loadQuestion();
    }, [id]);

    function updateOption(index, value) {
        setOptions((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (locked) return;

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
        const { data, error } = await supabase
            .from("questions")
            .update({
                question_text: questionText,
                options: options,
                correct_index: correctIndex,
                explanation: explanation,
            })
            .eq("id", id)
            .select();
        setSaving(false);

        // RLS can block an update without an error, so check a row really changed
        if (error || !data || data.length === 0) {
            toast.error("This question is used in a submitted or approved exam and can't be changed.");
            if (error) console.error(error);
            setLocked(true);
            return;
        }

        toast.success("Question updated");
        router.push("/Teacher/questions");
    }

    if (loading) return <PageLoader />

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