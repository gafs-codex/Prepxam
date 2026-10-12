"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ShieldCheck, TriangleAlert, Users, BookOpen, ArrowRight } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { PageLoader } from "@/components/ui/Spinner"

function formatDate(value) {
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function PlatformOverview() {
    const [data, setData] = useState(null);

    useEffect(() => {
        async function load() {
            const { data, error } = await supabase.rpc("platform_overview");
            if (error) {
                toast.error(`Could not load the overview: ${error.message}`);
                console.error(error);
                return;
            }
            setData(data);
        }
        load();
    }, []);

    if (!data) return <PageLoader />;

    const cards = [
        { label: "Total users", value: data.total_users, sub: `${data.students} students · ${data.teachers} teachers` },
        { label: "Admins", value: data.admins },
        { label: "Exams", value: data.exams },
        { label: "Attempts", value: data.attempts },
    ];

    const watch = [
        { label: "Failed sign-ups", value: data.failed_signups, sub: "Accounts created without a profile" },
        { label: "Exams pending 3+ days", value: data.stale_exams, sub: "Waiting on the school admin" },
        { label: "Users pending 3+ days", value: data.stale_users, sub: "Waiting on the school admin" },
    ];

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <h1 className="text-2xl font-semibold tracking-tight">Platform overview</h1>
            <p className="mt-1 text-sm text-muted">
                You own the platform. The school admin runs day-to-day approvals.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((c) => (
                    <div key={c.label} className="rounded-xl border border-border bg-card p-5">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted">{c.label}</p>
                        <p className="mt-2 text-3xl font-semibold">{c.value}</p>
                        {c.sub && <p className="mt-1 text-xs text-muted">{c.sub}</p>}
                    </div>
                ))}
            </div>

            <h2 className="mt-10 text-lg font-semibold">Needs your attention</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
                {watch.map((w) => (
                    <div
                        key={w.label}
                        className={`rounded-xl border p-5 ${w.value > 0 ? "border-yellow-300 bg-yellow-50" : "border-border bg-card"}`}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <p className="flex items-center gap-2 font-medium">
                                <TriangleAlert size={16} className={w.value > 0 ? "text-yellow-700" : "text-muted"} />
                                {w.label}
                            </p>
                            <span className="text-2xl font-semibold">{w.value}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted">{w.sub}</p>
                    </div>
                ))}
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-2">
                <section>
                    <div className="flex items-end justify-between gap-3">
                        <h2 className="text-lg font-semibold">Admins</h2>
                        <Link href="/Super/admins" className="flex items-center gap-1 text-sm hover:underline">
                            Manage <ArrowRight size={16} />
                        </Link>
                    </div>
                    <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                        {data.admin_list.length === 0 ? (
                            <p className="p-4 text-sm text-muted">No admins yet.</p>
                        ) : (
                            data.admin_list.map((a) => (
                                <div key={a.user_id} className="flex items-center gap-3 p-4">
                                    <ShieldCheck size={20} className="shrink-0 text-primary" />
                                    <div className="flex-1">
                                        <p className="font-medium">{a.full_name ?? "Unnamed"}</p>
                                        <p className="text-sm text-muted">{a.email ?? "No email"}</p>
                                    </div>
                                    <span className="text-sm text-muted">
                                        {a.role === "super_admin" ? "Super admin" : "School admin"}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section>
                    <h2 className="text-lg font-semibold">Recent activity</h2>
                    <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                        {data.recent.length === 0 ? (
                            <p className="p-4 text-sm text-muted">Nothing yet.</p>
                        ) : (
                            data.recent.slice(0, 6).map((item, i) => (
                                <div key={i} className="flex items-center gap-3 p-4">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent">
                                        {item.kind === "exam" ? <BookOpen size={18} /> : <Users size={18} />}
                                    </span>
                                    <div className="flex-1">
                                        <p className="font-medium">{item.title}</p>
                                        <p className="text-sm capitalize text-muted">{item.sub}</p>
                                    </div>
                                    <span className="text-sm text-muted">{formatDate(item.at)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </main>
    )
}