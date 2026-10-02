"use client"
import { useState } from "react";
import FilterDropdown from "@/components/FilterDropdown";
import { toast } from "sonner"

const QuestionTypes = ["Multiple choice", "True or false", "Fill in the gap"];
const subject = "Mathematics";


export default function CreateQuestionForm({ onQuestionCreated }) {
    const [questionType, setQuestionType] = useState("Multiple choice");
    const [questionText, setQuestionText] = useState("");
    const [options, setOptions] = useState(["", "", "", ""]);
    const [correctIndex, setCorrectIndex] = useState(null);
    const [explanation, setExplanation] = useState("");

    function updateOption(id, value) {
        setOptions((prev) => {
            const next = [...prev];
            next[id] = value;
            return next;
        })
    }

    function handleSubmit(e) {
        e.preventDefault();

        if (options.some((option) => option.trim() === "")) {
            toast.error("Some options are empty")
            return
        }

        if (correctIndex === null) {
            toast.error("Please pick the correct option")
            return
        }

        const newQuestion = {
            id: crypto.randomUUID,
            text: questionText,
            type: questionType,
            subject,
            options,
            correctIndex,
            explanation
        }

        onQuestionCreated(newQuestion)

        setQuestionText("");
        setOptions(["", "", "", ""]);
        setCorrectIndex(null);
        setExplanation("");
    }
    return (
        <div className="mt-6">
            <div className="max-w-3xl">
                <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-card p-5">
                    <div className="space-y-2">
                        <label htmlFor="text" className="text-sm font-medium leading-none">Question text</label>
                        <textarea
                            id="text"
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted md:text-sm outline-none"></textarea>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 flex flex-col gap-2">
                            <label htmlFor="" className="text-sm font-medium leading-none">Question type</label>
                            <FilterDropdown options={QuestionTypes} value={questionType} onChange={setQuestionType} />
                        </div>

                        <div className="space-y-2 flex flex-col gap-2">
                            <label htmlFor="" className="text-sm font-medium leading-none">
                                Subject
                            </label>
                            <div className="flex h-9 w-full items-center  rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm text-muted cursor-not-allowed">
                                {subject}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {/* {} */}
                        <div className="space-y-2 flex flex-col gap-2">
                            <label htmlFor="" className="text-sm font-medium leading-none">
                                Exam type
                            </label>
                            <div className="flex h-9 w-full items-center  rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm text-muted cursor-not-allowed">
                                Internal test
                            </div>
                        </div>

                        <div className="space-y-2 flex flex-col gap-2">
                            <label htmlFor="" className="text-sm font-medium leading-none">
                                Topic
                            </label>
                            <div className="flex h-9 w-full items-center  rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm text-muted cursor-not-allowed">
                                Internal test
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label htmlFor="" className="text-sm font-medium leading-none">
                            Answer options — select the correct one
                        </label>

                        <div role="radiogroup" className="grid gap-2 space-y-2 mt-2.5">
                            {options.map((option, index) => {
                                return <div key={index} className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        name="correctOption"
                                        checked={correctIndex === index}
                                        onChange={() => setCorrectIndex(index)}
                                        className="cursor-pointer accent-blue-600 focus:ring-blue-500 h-5 w-5"
                                    />
                                    <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => updateOption(index, e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm md:text-sm outline-none"
                                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                                    />
                                </div>
                            })}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="" className="text-sm font-medium leading-none">
                                Explanation (shown after the exam)
                            </label>

                            <textarea
                                value={explanation}
                                onChange={(e) => setExplanation(e.target.value)}
                                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted outline-none"
                            />
                        </div>

                        <div className="flex gap-3 items-center">
                            <button type="submit" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer bg-primary text-white shadow hover:bg-primary/90 h-9 px-4 py-2">
                                Save and add to exam
                            </button>

                            <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                                Cancel
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>

    )
}