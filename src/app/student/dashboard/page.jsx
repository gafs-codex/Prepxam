import StatCard from "@/components/ui/StatCard"
import { StatData } from "@/data/StatCardStudent"
import Link from "next/link"
export default function StudentDashboard() {
    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back, Abdulmuiz 👋</h1>
            <p className="mt-1 text-sm text-muted">Here's where you stand right now.</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {StatData.map((stat) => {
                    return <StatCard key={stat.label} {...stat} />
                })}
            </div>

            <section className="mt-10">
                <div className="flex items-end justify-between gap-4">
                    <h2 className="text-lg font-semibold">Available exams</h2>
                    <Link href={``} className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs">Browse All</Link>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <p className="text-sm text-muted">
                        No published exams yet — check back soon.
                    </p>
                </div>
            </section>

            <section className="mt-10">
                <div className="flex items-end justify-between gap-4">
                    <h2 className="text-lg font-semibold">Recent results</h2>
                    <Link href={``} className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs">Full history</Link>
                </div>

                <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                    <p className="p-4 text-sm text-muted">You haven't taken any exams yet.</p>
                </div>
            </section>
        </main>
    )
}