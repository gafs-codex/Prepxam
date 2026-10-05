"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import FilterDropdown from "@/components/FilterDropdown"
import { supabase } from "@/lib/supabase"

const ExamTypes = ["Internal test", "WAEC", "NECO", "JAMB", "GCE"]

export default function CreateExam() {
    const router = useRouter();

    const [title, setTitle] = useState("");
    const [examType, setExamType] = useState("Internal test");
    const [subjects, setSubjects] = useState([]);
    const [subject, setSubject] = useState("");
    const [duration, setDuration] = useState("20");
    const [numberOfQuestions, setNumberOfQuestions] = useState("20");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function loadSubjects() {
            const { data: { user } } = await supabase.auth.getUser();
            const teacherSubjects = user?.user_metadata?.subjects ?? [];
            setSubjects(teacherSubjects);
            if (teacherSubjects.length > 0) setSubject(teacherSubjects[0]);
        }
        loadSubjects();
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();

        const durationNum = Number(duration);
        const questionsNum = Number(numberOfQuestions);

        if (title.trim() === "") {
            toast.error("Please enter an exam title");
            return;
        }
        if (!subject) {
            toast.error("Please select a subject");
            return;
        }
        if (!Number.isInteger(durationNum) || durationNum < 1) {
            toast.error("Duration must be a whole number of at least 1 minute");
            return;
        }
        if (!Number.isInteger(questionsNum) || questionsNum < 1) {
            toast.error("Number of questions must be a whole number of at least 1");
            return;
        }

        setSaving(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error("You must be logged in to create an exam");
            setSaving(false);
            return;
        }

        const { data, error } = await supabase
            .from("exams")
            .insert({
                title: title.trim(),
                exam_type: examType,
                subject: subject,
                duration_minutes: durationNum,
                number_of_questions: questionsNum,
                description: description.trim(),
                created_by: user.id,
            })
            .select()
            .single();

        if (error) {
            toast.error(`Failed to create exam: ${error.message}`);
            console.error(error);
            setSaving(false);
            return;
        }

        router.push(`/Teacher/exams/${data.id}`);
    }

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Step 1 of 2</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Create exam</h1>
            <p className="mt-1 text-sm text-muted">Fill in the details. Next you'll add questions.</p>

            <div className="mt-6">
                <form onSubmit={handleSubmit} className="max-w-2xl space-y-5 rounded-xl border border-border bg-card p-5">
                    <div className="space-y-2">
                        <label htmlFor="title" className="text-sm font-medium leading-none">Exam title</label>
                        <input
                            type="text"
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. SS2 Physics mock"
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus:outline-none"
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium leading-none">Exam type</label>
                            <FilterDropdown options={ExamTypes} value={examType} onChange={setExamType} />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium leading-none">Subject</label>
                            <FilterDropdown options={subjects} value={subject} onChange={setSubject} />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label htmlFor="time" className="text-sm font-medium leading-none">Duration (minutes)</label>
                            <input
                                type="number"
                                id="time"
                                min={1}
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm md:text-sm outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="target" className="text-sm font-medium leading-none">Number of questions</label>
                            <input
                                type="number"
                                id="target"
                                min={1}
                                value={numberOfQuestions}
                                onChange={(e) => setNumberOfQuestions(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm md:text-sm outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="descriptions" className="text-sm font-medium leading-none">Description (optional)</label>
                        <textarea
                            id="descriptions"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted outline-none"
                        />
                    </div>

                    <div className="flex gap-3 items-center">
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer bg-primary text-white shadow hover:bg-primary/90 h-9 px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {saving ? "Saving..." : "Continue to add questions"}
                        </button>

                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </main>
    )
}