"use client"
import { useState } from "react"
import FilterDropdown from "@/components/FilterDropdown"

const ExamTypes = ["Internal test", "WAEC", "NECO", "JAMB", "GCE"]
const TEACHER_SUBJECTS = ["Mathematics"];

export default function CreateExam() {
    const [examType, setExamType] = useState("Internal test");
    const [subject, setSubject] = useState(TEACHER_SUBJECTS[0]);

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Step 1 of 2</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Create exam</h1>
            <p className="mt-1 text-sm text-muted">Fill in the details. Next you'll add questions.</p>

            <div className="mt-6">
                <form action="" className="max-w-2xl space-y-5 rounded-xl border border-border bg-card p-5">
                    <div className="space-y-2">
                        <label htmlFor="title" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Exam title
                        </label>

                        <input
                            type="text"
                            name=""
                            id="title"
                            placeholder="e.g. SS2 Physics mock"
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus:outline-none"
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium leading-none">
                                Exam type
                            </label>

                            <FilterDropdown
                                options={ExamTypes}
                                value={examType}
                                onChange={setExamType}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium leading-none">
                                Subject
                            </label>

                            <FilterDropdown
                                options={TEACHER_SUBJECTS}
                                value={subject}
                                onChange={setSubject}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label htmlFor="time" className="text-sm font-medium leading-none">
                                Duration (minutes)
                            </label>
                            <input
                                type="number"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm md:text-sm outline-none"
                                id="time"
                                min={1}
                                defaultValue={20}
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="target" className="text-sm font-medium leading-none">
                                Number of questions
                            </label>
                            <input
                                type="number"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm md:text-sm outline-none"
                                id="target"
                                min={1}
                                defaultValue={20}
                            />
                        </div>
                    </div>



                    <div className="space-y-2">
                        <label htmlFor="descriptions" className="text-sm font-medium leading-none">Description (optional)</label>

                        <textarea name="" id="descriptions" className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted outline-none"></textarea>
                    </div>

                    <div className="flex gap-3 items-center">
                        <button type="submit" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer bg-primary text-white shadow hover:bg-primary/90 h-9 px-4 py-2">
                            Continue to add questions
                        </button>

                        <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </main>
    )
}