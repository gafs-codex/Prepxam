"use client"
import { useState } from "react"
import { Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { SectionLoader } from "@/components/ui/Spinner"
import ErrorState from "@/components/ui/ErrorState"
import { useLoader } from "@/lib/useLoader"
import { ensure } from "@/lib/net"
import { Checkbox } from "./ui/checkbox";

export default function AddFromBank({ onAddSelected, subject, examType, addedIds = [] }) {
    const [search, setSearch] = useState("")
    const [selectedIds, setSelectedIds] = useState([])

    const { data, error, loading, reload } = useLoader(async () => {
        if (!subject || !examType) return []
        const { data } = ensure(
            await supabase
                .from("questions")
                .select("*")
                .eq("subject", subject)
                .eq("exam_type", examType)
        )
        return data ?? []
    }, [subject, examType])

    const bankQuestions = data ?? []

    const visibleQuestions = bankQuestions.filter((q) =>
        !addedIds.includes(q.id) &&
        q.question_text.toLowerCase().includes(search.toLowerCase())
    )

    function toggleSelect(id) {
        setSelectedIds((prev) => {
            return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        })
    }

    function handleAddSelected() {
        const selectedQuestions = bankQuestions.filter((question) => selectedIds.includes(question.id))
        onAddSelected(selectedQuestions)
        setSelectedIds([])
    }

    return (
        <div className="rounded-xl border border-border bg-card p-5 mt-6">
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1">
                    <Search width={24} height={24} fill="none" strokeWidth={2} className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-1 text-base shadow-sm outline-none"
                        placeholder="Search questions"
                    />
                </div>
                <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer bg-primary text-white shadow hover:bg-primary/90 h-9 px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={handleAddSelected}
                    disabled={selectedIds.length === 0}
                >
                    Add selected{selectedIds.length > 0 && ` (${selectedIds.length})`}
                </button>
            </div>

            <div className="mt-4 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
                {loading ? (
                    <SectionLoader />
                ) : error ? (
                    <ErrorState compact title="Couldn't load the question bank" message={error} onRetry={reload} />
                ) : visibleQuestions.length === 0 ? (
                    <p className="text-sm text-muted">
                        No questions found for {subject} · {examType}.
                    </p>
                ) : (
                    visibleQuestions.map((question) => (
                        <label
                            key={question.id}
                            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm hover:bg-accent/40"
                        >
                            <Checkbox
                                checked={selectedIds.includes(question.id)}
                                onCheckedChange={() => toggleSelect(question.id)}
                                className="mt-0.5"
                            />
                            <span className="flex-1">
                                <span className="line-clamp-2">{question.question_text}</span>
                            </span>
                        </label>
                    ))
                )}
            </div>
        </div>
    )
}