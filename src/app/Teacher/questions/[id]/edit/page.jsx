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
    const [questionText, setQuestionText] = useState("");
    const [options, setOptions] = useState(["", "", "", ""]);
    const [correctIndex, setCorrectIndex] = useState(null);
    const [explanation, setExplanation] = useState("");

    useEffect(() => {
        async function loadQuestion() {
            const { data, error } = await supabase
                .from("questions")
                .select("*")
                .eq("id", id)
                .single();

            if (error) {
                toast.error("Could not load question");
                setLoading(false);
                return;
            }

            setQuestionText(data.question_text);
            setOptions(data.options);
            setCorrectIndex(data.correct_index);
            setExplanation(data.explanation || "");
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

        const { error } = await supabase
            .from("questions")
            .update({
                question_text: questionText,
                options: options,
                correct_index: correctIndex,
                explanation: explanation,
            })
            .eq("id", id);

        if (error) {
            toast.error("Failed to update question");
            return;
        }

        toast.success("Question updated");
        router.push("/Teacher/questions");
    }

   if (loading) return <PageLoader />

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <Link href="/Teacher/questions" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer border border-input bg-background shadow-sm hover:bg-accent h-9 px-4 py-2 mb-3">
                Back
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">Edit question</h1>

            <div className="mt-6 max-w-3xl">
                <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-card p-5">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">Question text</label>
                        <textarea
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm outline-none"
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
                                        className="cursor-pointer accent-blue-600 h-5 w-5"
                                    />
                                    <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => updateOption(index, e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm outline-none"
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
                                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm outline-none"
                            />
                        </div>

                        <button type="submit" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer bg-primary text-white shadow hover:bg-primary/90 h-9 px-4 py-2">
                            Save changes
                        </button>
                    </div>
                </form>
            </div>
        </main>
    )
}