"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

function count(query) {
    return query.select("*", { count: "exact", head: true });
}

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        async function load() {
            const results = await Promise.all([
                count(supabase.from("profiles")).eq("role", "student"),
                count(supabase.from("profiles")).eq("role", "teacher"),
                count(supabase.from("profiles")).eq("status", "pending"),
                count(supabase.from("exams")),
                count(supabase.from("exams")).eq("status", "pending"),
            ]);

            if (results.some((r) => r.error)) {
                toast.error("Could not load some numbers");
                console.error(results.map((r) => r.error));
            }

            setStats({
                students: results[0].count ?? 0,
                teachers: results[1].count ?? 0,
                pendingUsers: results[2].count ?? 0,
                exams: results[3].count ?? 0,
                pendingExams: results[4].count ?? 0,
            });
        }
        load();
    }, []);

    if (!stats) return <main className="p-8">Loading...</main>;

    const cards = [
        { label: "Total students", value: stats.students, href: "/Admin/users" },
        { label: "Total teachers", value: stats.teachers, href: "/Admin/users" },
        { label: "Total exams", value: stats.exams, href: "/Admin/exam" },
    ];

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <h1 className="text-2xl font-semibold tracking-tight">Admin overview</h1>
            <p className="mt-1 text-sm text-muted">Everything happening on the platform.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {cards.map((card) => (
                    <Link
                        key={card.label}
                        href={card.href}
                        className="rounded-xl border border-border bg-card p-5 hover:bg-accent/40"
                    >
                        <p className="text-xs font-medium uppercase tracking-wide text-muted">{card.label}</p>
                        <p className="mt-2 text-3xl font-semibold">{card.value}</p>
                    </Link>
                ))}
            </div>

            <h2 className="mt-10 text-lg font-medium">Needs your attention</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Link href="/Admin/users" className="rounded-xl border border-border bg-card p-5 hover:bg-accent/40">
                    <p className="text-3xl font-semibold">{stats.pendingUsers}</p>
                    <p className="mt-1 text-sm text-muted">users waiting for approval</p>
                </Link>
                <Link href="/Admin/exams" className="rounded-xl border border-border bg-card p-5 hover:bg-accent/40">
                    <p className="text-3xl font-semibold">{stats.pendingExams}</p>
                    <p className="mt-1 text-sm text-muted">exams waiting for approval</p>
                </Link>
            </div>
        </main>
    )
}