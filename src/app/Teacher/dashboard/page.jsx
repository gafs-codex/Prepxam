"use client"
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Plus } from 'lucide-react';
import { StatDataTeacher } from "@/data/StatCardTeacher";
import StatCard from "@/components/ui/StatCard";

export default function TeacherDashboard() {
    const { profile, loading } = useAuth();

    if (loading) {
        return <div className="p-8">Loading...</div>;
    }

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Welcome back, {profile?.full_name?.split(" ")[0] || "user....."} 👋
                    </h1>
                    
                    <p className="mt-1 text-sm text-muted">Your teaching activity at a glance.</p>
                </div>

                <Link href={``} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer bg-primary text-white shadow hover:bg-primary/90 h-9 px-3 py-2">
                    <Plus />
                    New exam
                </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {StatDataTeacher.map((stat) => {
                    return <StatCard key={stat.label} {...stat} />
                })}
            </div>

            <section className="mt-10">
                <div className="flex items-end justify-between gap-3">
                    <h2 className="text-lg font-semibold">My exams</h2>

                    <Link href={``} className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs">
                        manage all
                    </Link>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <p className="text-sm text-muted">No exams yet — create your first one.</p>
                </div>
            </section>

            <section className="mt-10">
                <h2 className="text-lg font-semibold">Recent activity</h2>

                <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                    <p className="p-4 text-sm text-muted">No submissions yet.</p>
                </div>
            </section>
        </main>
    )
}