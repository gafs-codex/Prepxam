"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { PageLoader } from "@/components/ui/Spinner"

export default function BrowseExams() {
    const [exams, setExams] = useState([]);
    const [started, setStarted] = useState(new Set());
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const [examRes, mineRes] = await Promise.all([
                supabase.from("exams")
                    .select("id, title, subject, exam_type, duration_minutes, number_of_questions")
                    .eq("status", "approved")
                    .order("created_at", { ascending: false }),
                supabase.rpc("my_attempts"),
            ]);

            if (examRes.error) toast.error("Could not load exams");

            const mine = mineRes.data ?? [];
            const done = new Set(mine.filter((a) => a.submitted_at).map((a) => a.exam_id));
            setStarted(new Set(mine.filter((a) => !a.submitted_at).map((a) => a.exam_id)));
            // finished exams live in History, not here
            setExams((examRes.data ?? []).filter((e) => !done.has(e.id)));
            setLoading(false);
        }
        load();
    }, []);

    if (loading) return <PageLoader />;

    const visible = exams.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()));

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <Link href={`/student/dashboard`} className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs active cursor-pointer mb-6">
                Back to dashboard
            </Link>

            <h1 className="text-2xl font-semibold tracking-tight">Browse exams</h1>
            <p className="mt-1 text-sm text-muted">{exams.length} available to take.</p>

            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search exams"
                className="mt-6 flex h-9 w-full max-w-sm rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm outline-none md:text-sm"
            />

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.length === 0 ? (
                    <p className="text-sm text-muted">
                        {exams.length === 0 ? "No exams available right now." : "No exams match your search."}
                    </p>
                ) : (
                    visible.map((exam) => (
                        <div key={exam.id} className="rounded-xl border border-border bg-card p-4">
                            <div className="flex items-start justify-between gap-2">
                                <h3 className="font-medium">{exam.title}</h3>
                                <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-xs">{exam.exam_type}</span>
                            </div>
                            <p className="mt-1 text-sm text-muted">{exam.subject}</p>
                            <p className="mt-3 text-xs text-muted">
                                {exam.number_of_questions} questions · {exam.duration_minutes} min
                            </p>
                            <Link
                                href={`/student/exams/${exam.id}`}
                                className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-white hover:bg-primary/90"
                            >
                                {started.has(exam.id) ? "Resume exam" : "Start exam"}
                            </Link>


                        </div>
                    ))
                )}
            </div>
        </main>
    )
}