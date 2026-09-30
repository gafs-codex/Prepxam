"use client"
import { useState } from "react"
import { Search } from "lucide-react"
import { Checkbox } from "./ui/checkbox";

// Placeholder — replace with real fetched questions
const bankQuestions = [
    { id: "q1", text: "what is the square root of 25", difficulty: "Medium" },
];


export default function AddFromBank({ onAddSelected }) {
    const [selectedIds, setSelectedIds] = useState([])

    function toggleSelect(id) {
        setSelectedIds((prev) => {
            return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        })
    }

    function handleAddSelected() {
        console.log("Adding these question IDs to the exam:", selectedIds);
        const selectedQuestions = bankQuestions.filter((question) => selectedIds.includes(question.id))
        onAddSelected(selectedQuestions)
        setSelectedIds([])
    }
    return (
        <div className="rounded-xl border border-border bg-card p-5 mt-6">
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1">
                    <Search width={24} height={24} fill='none' strokeWidth={2} className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted' />
                    <input
                        type="text"
                        className='flex h-9 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-1 text-base shadow-sm outline-none'
                        placeholder="Search questions"
                    />
                </div>
                <button
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer bg-primary text-white shadow hover:bg-primary/90 h-9 px-4 py-2"
                    onClick={handleAddSelected}
                    disabled={selectedIds.length === 0}
                >
                    Add selected</button>
            </div>


            <div className="mt-4 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
                {bankQuestions.map((questions) => {
                    return <label
                        htmlFor=""
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm hover:bg-accent/40"
                        key={questions.id}

                    >
                        <Checkbox
                            checked={selectedIds.includes(questions.id)}
                            onCheckedChange={() => toggleSelect(questions.id)}
                            className="mt-0.5"
                        />
                        <span className="flex-1">
                            <span className="line-clamp-2">{questions.text}</span>
                            {/* <span className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                                <span className="rounded-full border px-2 capitalize bg-warning/20 text-warning-foreground border-warning/40">
                                    {questions.difficulty}
                                </span>
                            </span> */}
                        </span>
                    </label>
                })}
            </div>
        </div>
    )
}