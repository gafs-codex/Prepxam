"use client"
import Link from "next/link"
import { Plus, Search } from "lucide-react"
import { useState } from "react"
import FilterDropdown from "@/components/FilterDropdown"

const subject = ["All subjects", "Mathematics"]
const QuestionType = ["Multiple choice", "True or false", "Fill in the gap"]

export default function QuestionBank() {
    const [questionType, setQuestionType] = useState("Multiple choice")
    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Question bank
                    </h1>
                    <p className="mt-1 text-sm text-muted">2 of 2 questions</p>
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

                <FilterDropdown
                    options={QuestionType}
                    value={questionType}
                    onChange={setQuestionType}
                />

            </div>
        </main>
    )
}