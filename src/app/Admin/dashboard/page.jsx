"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Users, FileText, BookOpen, ArrowRight, ClipboardCheck, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { PageLoader } from "@/components/ui/Spinner"

// change these if your folder names differ (your screenshot showed Admin/exam)
const USERS_URL = "/Admin/users";
const EXAMS_URL = "/Admin/exams";

function count(query) {
    return query.select("*", { count: "exact", head: true });
}

function formatDate(value) {
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminDashboard() {
    const [data, setData] = useState(null);

    useEffect(() => {
        async function load() {
            const [
                students, teachers, exams, questions,
                pendingUsersCount, pendingExamsCount,
                approvedUsersCount, approvedExamsCount, totalUsersCount,
                pendingUsers, pendingExams, recentExams, recentUsers,
            ] = await Promise.all([
                count(supabase.from("profiles")).eq("role", "student"),
                count(supabase.from("profiles")).eq("role", "teacher"),
                count(supabase.from("exams")),
                count(supabase.from("questions")),
                count(supabase.from("profiles")).eq("status", "pending"),
                count(supabase.from("exams")).eq("status", "pending"),
                count(supabase.from("profiles")).eq("status", "approved"),
                count(supabase.from("exams")).eq("status", "approved"),
                count(supabase.from("profiles")),
                supabase.from("profiles").select("id, full_name, role, created_at")
                    .eq("status", "pending").order("created_at", { ascending: false }).limit(5),
                supabase.from("exams").select("id, title, subject, created_by, submitted_at")
                    .eq("status", "pending").order("submitted_at", { ascending: false }).limit(5),
                supabase.from("exams").select("id, title, subject, status, created_at")
                    .order("created_at", { ascending: false }).limit(5),
                supabase.from("profiles").select("id, full_name, role, status, created_at")
                    .order("created_at", { ascending: false }).limit(5),
            ]);

            const all = [students, teachers, exams, questions, pendingUsersCount, pendingExamsCount,
                approvedUsersCount, approvedExamsCount, totalUsersCount,
                pendingUsers, pendingExams, recentExams, recentUsers];
            if (all.some((r) => r.error)) {
                toast.error("Could not load some numbers");
                console.error(all.map((r) => r.error).filter(Boolean));
            }

            // teacher names for the pending exams
            const teacherIds = [...new Set((pendingExams.data ?? []).map((e) => e.created_by).filter(Boolean))];
            let teacherNames = {};
            if (teacherIds.length > 0) {
                const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", teacherIds);
                teacherNames = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));
            }

            // one feed from new exams and new registrations, newest first
            const activity = [
                ...(recentExams.data ?? []).map((e) => ({
                    key: `exam-${e.id}`, kind: "exam", title: e.title,
                    sub: `${e.subject} · ${e.status}`, date: e.created_at,
                })),
                ...(recentUsers.data ?? []).map((u) => ({
                    key: `user-${u.id}`, kind: "user", title: `${u.full_name ?? "New user"} registered`,
                    sub: `${u.role} account · ${u.status}`, date: u.created_at,
                })),
            ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

            setData({
                students: students.count ?? 0,
                teachers: teachers.count ?? 0,
                exams: exams.count ?? 0,
                questions: questions.count ?? 0,
                pendingUsersCount: pendingUsersCount.count ?? 0,
                pendingExamsCount: pendingExamsCount.count ?? 0,
                approvedUsers: approvedUsersCount.count ?? 0,
                approvedExams: approvedExamsCount.count ?? 0,
                totalUsers: totalUsersCount.count ?? 0,
                pendingUsers: pendingUsers.data ?? [],
                pendingExams: pendingExams.data ?? [],
                teacherNames,
                activity,
            });
        }
        load();
    }, []);

    if (!data) return <PageLoader />;

    const needsReview = data.pendingUsersCount + data.pendingExamsCount;

    const cards = [
        { label: "Students", value: data.students },
        { label: "Teachers", value: data.teachers },
        { label: "Exams", value: data.exams },
        { label: "Questions", value: data.questions },
        { label: "Average score", value: "0%" },
        {
            label: "Needs review", value: needsReview,
            sub: `${data.pendingUsersCount} users · ${data.pendingExamsCount} exams`,
        },
    ];

    const bar = (done, total) => (total === 0 ? 0 : Math.round((done / total) * 100));

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <h1 className="text-2xl font-semibold tracking-tight">Admin overview</h1>
            <p className="mt-1 text-sm text-muted">Everything happening across the platform.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((card) => (
                    <div key={card.label} className="rounded-xl border border-border bg-card p-5">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted">{card.label}</p>
                        <p className="mt-2 text-3xl font-semibold">{card.value}</p>
                        {card.sub && <p className="mt-1 text-xs text-muted">{card.sub}</p>}
                    </div>
                ))}
            </div>

            <div className="mt-10 flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold">Needs your attention</h2>
                    <p className="mt-1 text-sm text-muted">Review new registrations and submitted exams.</p>
                </div>
                <span className="rounded-full bg-accent px-3 py-1 text-sm text-primary">{needsReview} pending</span>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-border bg-card">
                    <div className="flex items-center justify-between border-b border-border p-4">
                        <h3 className="flex items-center gap-2 font-medium"><Users size={18} /> Pending users</h3>
                        <Link href={USERS_URL} className="flex items-center gap-1 text-sm hover:underline">
                            View all <ArrowRight size={16} />
                        </Link>
                    </div>
                    {data.pendingUsers.length === 0 ? (
                        <p className="p-8 text-center text-sm text-muted">No users waiting for approval.</p>
                    ) : (
                        <ul className="divide-y divide-border">
                            {data.pendingUsers.map((u) => (
                                <li key={u.id}>
                                    <Link href={USERS_URL} className="flex items-center justify-between p-4 text-sm hover:bg-accent/40">
                                        <span>
                                            <span className="font-medium">{u.full_name ?? "Unnamed"}</span>
                                            <span className="ml-2 capitalize text-muted">{u.role}</span>
                                        </span>
                                        <span className="text-xs text-muted">{formatDate(u.created_at)}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="rounded-xl border border-border bg-card">
                    <div className="flex items-center justify-between border-b border-border p-4">
                        <h3 className="flex items-center gap-2 font-medium"><FileText size={18} /> Pending exams</h3>
                        <Link href={EXAMS_URL} className="flex items-center gap-1 text-sm hover:underline">
                            View all <ArrowRight size={16} />
                        </Link>
                    </div>
                    {data.pendingExams.length === 0 ? (
                        <p className="p-8 text-center text-sm text-muted">No exams waiting for approval.</p>
                    ) : (
                        <ul className="divide-y divide-border">
                            {data.pendingExams.map((e) => (
                                <li key={e.id}>
                                    <Link href={`${EXAMS_URL}/${e.id}`} className="flex items-center justify-between p-4 text-sm hover:bg-accent/40">
                                        <span>
                                            <span className="font-medium">{e.title}</span>
                                            <span className="ml-2 text-muted">
                                                {data.teacherNames[e.created_by] ?? "Unknown teacher"} · {e.subject}
                                            </span>
                                        </span>
                                        {e.submitted_at && <span className="text-xs text-muted">{formatDate(e.submitted_at)}</span>}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_22rem]">
                <section>
                    <h2 className="text-lg font-semibold">Recent activity</h2>
                    <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                        {data.activity.length === 0 ? (
                            <p className="p-4 text-sm text-muted">No activity yet.</p>
                        ) : (
                            data.activity.map((item) => (
                                <div key={item.key} className="flex items-center gap-3 p-4">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                                        {item.kind === "exam" ? <BookOpen size={18} /> : <Users size={18} />}
                                    </span>
                                    <div className="flex-1">
                                        <p className="font-medium">{item.title}</p>
                                        <p className="text-sm capitalize text-muted">{item.sub}</p>
                                    </div>
                                    <span className="text-sm text-muted">{formatDate(item.date)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <aside>
                    <h2 className="text-lg font-semibold">Quick actions</h2>
                    <div className="mt-4 space-y-3">
                        <Link href={USERS_URL} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-accent/40">
                            <Users size={20} className="text-primary" />
                            <span>
                                <span className="block font-medium">Manage users</span>
                                <span className="block text-sm text-muted">Review registrations and decisions</span>
                            </span>
                        </Link>
                        <Link href={EXAMS_URL} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-accent/40">
                            <ClipboardCheck size={20} className="text-primary" />
                            <span>
                                <span className="block font-medium">Review exams</span>
                                <span className="block text-sm text-muted">Approve exams and release results</span>
                            </span>
                        </Link>

                        <div className="rounded-xl border border-border bg-card p-4">
                            <h3 className="flex items-center gap-2 font-medium"><Clock size={18} className="text-primary" /> Approval queue</h3>
                            {[
                                { label: "Users approved", done: data.approvedUsers, total: data.totalUsers },
                                { label: "Exams approved", done: data.approvedExams, total: data.exams },
                            ].map((row) => (
                                <div key={row.label} className="mt-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted">{row.label}</span>
                                        <span>{row.done} / {row.total}</span>
                                    </div>
                                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-primary/20">
                                        <div className="h-full bg-primary" style={{ width: `${bar(row.done, row.total)}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </main>
    )
}