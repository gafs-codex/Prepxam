"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ShieldCheck, TriangleAlert, ArrowRight } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { PageLoader } from "@/components/ui/Spinner"
import AuditEventText from "@/components/AuditEventText"

function formatDate(value) {
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// function EventText({ event }) {
//     if (event.kind === "admin") {
//         return (
//             <>
//                 <span className="font-semibold">System</span> added role to (
//                 {event.detail === "super_admin" ? "super admin" : "school admin"}){" "}
//                 <span className="font-semibold">{event.name}</span>
//             </>
//         );
//     }
//     if (event.kind === "user") {
//         return (
//             <>
//                 <span className="font-semibold">{event.name}</span> registered as a {event.detail}
//             </>
//         );
//     }
//     return (
//         <>
//             Exam <span className="font-semibold">{event.name}</span> was created
//         </>
//     );
// }

export default function PlatformOverview() {
    const [data, setData] = useState(null);
    const [events, setEvents] = useState([]);

    useEffect(() => {
        async function load() {
            const { data, error } = await supabase.rpc("platform_overview");
            if (error) {
                toast.error(`Could not load the overview: ${error.message}`);
                console.error(error);
                return;
            }
            setData(data);
            
            const { data: log } = await supabase
                .from("audit_log").select("*").order("created_at", { ascending: false }).limit(5);
            setEvents(log ?? []);
        }
        load();
    }, []);

    if (!data) return <PageLoader />;

    const adminList = data.admin_list ?? [];
    // const events = data.events ?? [];

    const cards = [
        { label: "Total users", value: data.total_users },
        { label: "Admins", value: data.admins },
        { label: "Exams", value: data.exams },
        { label: "Attempts", value: data.attempts },
        { label: "Rejected", value: data.rejected ?? 0 },
    ];

    const watch = [
        { label: "Failed sign-ups", value: data.failed_signups, sub: "Accounts created without a profile" },
        { label: "Exams pending 3+ days", value: data.stale_exams, sub: "Waiting on the school admin" },
        { label: "Users pending 3+ days", value: data.stale_users, sub: "Waiting on the school admin" },
    ];

    const sectionLink = "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs";

    return (
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
            <h1 className="text-3xl font-semibold tracking-tight">Platform overview</h1>
            <p className="mt-1 text-muted">
                You own the platform. The school admin runs day-to-day approvals.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {cards.map((c) => (
                    <div key={c.label} className="rounded-xl border border-border bg-card p-5">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted">{c.label}</p>
                        <p className="mt-2 text-3xl font-semibold">{c.value}</p>
                    </div>
                ))}
            </div>

            <h2 className="mt-12 text-xl font-semibold">Needs your attention</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
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
                            <span className="text-xl font-semibold">{w.value}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted">{w.sub}</p>
                    </div>
                ))}
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-2">
                <section>
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-xl font-semibold">Admins</h2>
                        <Link href="/Super/admins" className={sectionLink}>
                            Manage <ArrowRight size={16} />
                        </Link>
                    </div>
                    <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                        {adminList.length === 0 ? (
                            <p className="p-5 text-sm text-muted">No admins yet.</p>
                        ) : (
                            adminList.map((a) => (
                                <div key={a.user_id} className="flex items-center gap-4 px-5 py-4">
                                    <ShieldCheck size={15} className="shrink-0 text-primary" />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold">{a.full_name ?? "Unnamed"}</p>
                                        <p className="truncate text-sm text-muted">{a.email ?? "No email"}</p>
                                    </div>
                                    <span className="shrink-0 text-sm text-muted">
                                        {a.role === "super_admin" ? "Super Admin" : "School Admin"}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <section>
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-xl font-semibold">Recent system events</h2>
                        <Link href="/Super/audit" className={sectionLink}>
                            Audit log <ArrowRight size={16} />
                        </Link>
                    </div>
                    <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                        {events.length === 0 ? (
                            <p className="p-5 text-sm text-muted">Nothing yet.</p>
                        ) : (
                            events.slice(0, 5).map((event, i) => (
                                <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
                                    <p className="text-sm sm:text-base">
                                        <EventText event={event} />
                                    </p>
                                    <span className="shrink-0 text-sm text-muted">{formatDate(event.at)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </main>
    )
}