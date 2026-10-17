"use client"
import Link from "next/link";
import { Plus } from 'lucide-react';
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { PageLoader } from "@/components/ui/Spinner"
import ErrorState from "@/components/ui/ErrorState"
import StatCard from "@/components/ui/StatCard";
import { useLoader } from "@/lib/useLoader"
import { ensure } from "@/lib/net"

const STATUS_STYLES = {
    draft: { label: "Draft", className: "bg-accent" },
    pending: { label: "Pending approval", className: "bg-yellow-100 text-yellow-800" },
    approved: { label: "Published", className: "bg-green-100 text-green-800" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
};

export default function TeacherDashboard() {
    const { profile, loading: authLoading } = useAuth();

    const { data, error, loading, reload } = useLoader(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Your session has expired. Please log in again.");
        const userId = session.user.id;

        const [examCount, questionCount, recent, decisions] = await Promise.all([
            supabase.from("exams").select("*", { count: "exact", head: true }).eq("created_by", userId),
            supabase.from("questions").select("*", { count: "exact", head: true }).eq("created_by", userId),
            supabase.from("exams")
                .select("*, exam_questions(count)")
                .eq("created_by", userId)
                .order("created_at", { ascending: false })
                .limit(3),
            supabase.from("exams")
                .select("id, title, status, review_note, submitted_at, created_at")
                .eq("created_by", userId)
                .in("status", ["pending", "approved", "rejected"])
                .order("submitted_at", { ascending: false, nullsFirst: false })
                .limit(5),
        ]);

        ensure(examCount);
        ensure(questionCount);
        ensure(recent);
        ensure(decisions);

        return {
            exams: examCount.count ?? 0,
            questions: questionCount.count ?? 0,
            recentExams: recent.data ?? [],
            activity: decisions.data ?? [],
        };
    }, []);

    if (authLoading || loading) return <PageLoader />;
    if (error) return <ErrorState message={error} onRetry={reload} />;

    const statCards = [
        { label: "Exams Created", value: data.exams },
        { label: "Questions in Bank", value: data.questions },
        { label: "No of students", value: 0 },   // TODO: from released results
        { label: "Average Score", value: "0%" }, // TODO: from released results
    ];

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Welcome back, {profile?.full_name?.split(" ")[0] || "user....."} 👋
                    </h1>
                    <p className="mt-1 text-sm text-muted">Your teaching activity at a glance.</p>
                </div>

                <Link href="/Teacher/exams/create" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer bg-primary text-white shadow hover:bg-primary/90 h-9 px-3 py-2">
                    <Plus />
                    New exam
                </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => (
                    <StatCard key={stat.label} {...stat} />
                ))}
            </div>

            <section className="mt-10">
                <div className="flex items-end justify-between gap-3">
                    <h2 className="text-lg font-semibold">My exams</h2>
                    <Link href="/Teacher/exams" className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs">
                        manage all
                    </Link>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {data.recentExams.length === 0 ? (
                        <p className="text-sm text-muted">No exams yet — create your first one.</p>
                    ) : (
                        data.recentExams.map((exam) => {
                            const added = exam.exam_questions?.[0]?.count ?? 0;
                            const status = STATUS_STYLES[exam.status] ?? STATUS_STYLES.draft;
                            return (
                                <Link
                                    key={exam.id}
                                    href={`/Teacher/exams/${exam.id}/review`}
                                    className="rounded-xl border border-border bg-card p-4 hover:bg-accent/40"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-medium">{exam.title}</h3>
                                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ${status.className}`}>
                                            {status.label}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-muted">{exam.subject} · {exam.exam_type}</p>
                                    <p className="mt-3 text-xs text-muted">
                                        {added} of {exam.number_of_questions} questions · {exam.duration_minutes} min
                                    </p>
                                </Link>
                            );
                        })
                    )}
                </div>
            </section>

            <section className="mt-10">
                <h2 className="text-lg font-semibold">Recent activity</h2>

                <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                    {data.activity.length === 0 ? (
                        <p className="p-4 text-sm text-muted">No activity yet.</p>
                    ) : (
                        data.activity.map((item) => (
                            <Link
                                key={item.id}
                                href={`/Teacher/exams/${item.id}/review`}
                                className="block p-4 text-sm hover:bg-accent/40"
                            >
                                {item.status === "approved" && (
                                    <p><span className="font-medium">{item.title}</span> was approved and is now published.</p>
                                )}
                                {item.status === "pending" && (
                                    <p><span className="font-medium">{item.title}</span> is waiting for admin approval.</p>
                                )}
                                {item.status === "rejected" && (
                                    <>
                                        <p><span className="font-medium">{item.title}</span> was rejected.</p>
                                        {item.review_note && <p className="mt-1 text-red-600">Admin note: {item.review_note}</p>}
                                    </>
                                )}
                            </Link>
                        ))
                    )}
                </div>
            </section>
        </main>
    )
}