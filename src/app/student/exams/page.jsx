"use client"
import { useState } from "react"
import Link from "next/link"
import { MoveLeft } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { SectionLoader } from "@/components/ui/Spinner"
import ErrorState from "@/components/ui/ErrorState"
import { useLoader } from "@/lib/useLoader"
import { ensure } from "@/lib/net"

export default function BrowseExams() {
    const [search, setSearch] = useState("");
    const [code, setCode] = useState("");

    const { data, error, loading, reload } = useLoader(async () => {
        const [examRes, mineRes] = await Promise.all([
            supabase.from("exams")
                .select("id, title, subject, exam_type, duration_minutes, number_of_questions, requires_code, network_only")
                .eq("status", "approved")
                .order("created_at", { ascending: false }),
            supabase.rpc("my_attempts"),
        ]);

        ensure(examRes);
        ensure(mineRes);

        const mine = mineRes.data ?? [];
        const done = new Set(mine.filter((a) => a.submitted_at).map((a) => a.exam_id));
        const started = new Set(mine.filter((a) => !a.submitted_at).map((a) => a.exam_id));

        // finished exams live in History, not here
        return {
            exams: (examRes.data ?? []).filter((e) => !done.has(e.id)),
            started,
        };
    }, []);

    const exams = data?.exams ?? [];
    const started = data?.started ?? new Set();
    const visible = exams.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()));

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <Link href="/student/dashboard" className="mb-6 inline-flex h-8 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
                <MoveLeft strokeWidth={1} size={20} /> Back to dashboard
            </Link>

            <h1 className="text-2xl font-semibold tracking-tight">Browse exams</h1>
            <p className="mt-1 text-sm text-muted">
                {data ? `${exams.length} available to take.` : "\u00A0"}
            </p>

            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search exams"
                className="mt-6 flex h-9 w-full max-w-sm rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm outline-none md:text-sm"
            />

            {loading ? (
                <SectionLoader />
            ) : error ? (
                <ErrorState message={error} onRetry={reload} />
            ) : (
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
            )}
        </main>
    )
}