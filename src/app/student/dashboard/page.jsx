"use client"
import { useState, useEffect } from "react";
import Link from "next/link"
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import StatCard from "@/components/ui/StatCard"
import { PageLoader } from "@/components/ui/Spinner"

const linkBtn = "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs";

export default function StudentDashboard() {
    const { profile, loading } = useAuth();
    const [data, setData] = useState(null);

    useEffect(() => {
        async function load() {
            const [examRes, mineRes] = await Promise.all([
                supabase.from("exams")
                    .select("id, title, subject, exam_type, duration_minutes, number_of_questions")
                    .eq("status", "approved")
                    .order("created_at", { ascending: false }),
                supabase.rpc("my_attempts"),
            ]);

            if (examRes.error || mineRes.error) {
                toast.error("Could not load your dashboard");
                console.error(examRes.error, mineRes.error);
            }

            const mine = mineRes.data ?? [];
            const submitted = mine.filter((a) => a.submitted_at);
            const doneIds = new Set(submitted.map((a) => a.exam_id));
            const inProgressIds = new Set(mine.filter((a) => !a.submitted_at).map((a) => a.exam_id));

            // only scores the student is allowed to see
            const percents = submitted
                .filter((a) => a.score_visible && a.total > 0)
                .map((a) => Math.round((a.score / a.total) * 100));

            setData({
                available: (examRes.data ?? []).filter((e) => !doneIds.has(e.id)),
                inProgressIds,
                taken: submitted.length,
                average: percents.length ? Math.round(percents.reduce((s, p) => s + p, 0) / percents.length) : null,
                best: percents.length ? Math.max(...percents) : null,
                recent: submitted.slice(0, 3),
            });
        }
        load();
    }, []);

    if (loading || !data) return <PageLoader />;

    const stats = [
        { label: "Exams Taken", value: data.taken },
        { label: "Average Score", value: data.average === null ? "—" : `${data.average}%` },
        { label: "Best Score", value: data.best === null ? "—" : `${data.best}%` },
        { label: "Available to Take", value: data.available.length },
    ];

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <h1 className="text-2xl font-semibold tracking-tight">
                Welcome back, {profile?.full_name?.split(" ")[0] || "user....."} 👋
            </h1>
            <p className="mt-1 text-sm text-muted">Here's where you stand right now.</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <StatCard key={stat.label} {...stat} />
                ))}
            </div>

            <section className="mt-10">
                <div className="flex items-end justify-between gap-4">
                    <h2 className="text-lg font-semibold">Available exams</h2>
                    <Link href="/student/exams" className={linkBtn}>Browse all</Link>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {data.available.length === 0 ? (
                        <p className="text-sm text-muted">No exams to take right now — check back soon.</p>
                    ) : (
                        data.available.slice(0, 3).map((exam) => (
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
                                    {data.inProgressIds.has(exam.id) ? "Resume exam" : "Start exam"}
                                </Link>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className="mt-10">
                <div className="flex items-end justify-between gap-4">
                    <h2 className="text-lg font-semibold">Recent results</h2>
                    <Link href="/student/history" className={linkBtn}>Full history</Link>
                </div>

                <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                    {data.recent.length === 0 ? (
                        <p className="p-4 text-sm text-muted">You haven't taken any exams yet.</p>
                    ) : (
                        data.recent.map((a) => {
                            const percent = a.score_visible && a.total > 0 ? Math.round((a.score / a.total) * 100) : null;
                            return (
                                <Link key={a.attempt_id} href="/student/history" className="flex items-center justify-between gap-3 p-4 text-sm hover:bg-accent/40">
                                    <span>
                                        <span className="font-medium">{a.title}</span>
                                        <span className="ml-2 text-muted">{a.subject}</span>
                                    </span>
                                    <span className={percent === null ? "text-muted" : percent >= a.pass_mark ? "font-medium text-green-600" : "font-medium text-red-600"}>
                                        {percent === null ? "Awaiting release" : `${percent}%`}
                                    </span>
                                </Link>
                            );
                        })
                    )}
                </div>
            </section>
        </main>
    )
}