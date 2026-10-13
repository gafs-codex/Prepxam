"use client"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { SectionLoader } from "@/components/ui/Spinner"
import { auditAction, auditOn, auditDetail } from "@/components/AuditEventText"

const PAGE_SIZE = 25;

const FILTERS = [
    { key: "all", label: "All", prefix: null },
    { key: "users", label: "Users", prefix: "user." },
    { key: "exams", label: "Exams", prefix: "exam." },
    { key: "results", label: "Results", prefix: "results." },
    { key: "admins", label: "Admins", prefix: "admin." },
];

function formatWhen(value) {
    return new Date(value).toLocaleString(undefined, {
        year: "numeric", month: "numeric", day: "numeric",
        hour: "numeric", minute: "2-digit", second: "2-digit",
    });
}

export default function AuditLog() {
    const [events, setEvents] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);

    // wait a moment after typing before searching
    useEffect(() => {
        const timer = setTimeout(() => {
            setQuery(search);
            setPage(0);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);

            let request = supabase
                .from("audit_log")
                .select("*", { count: "exact" })
                .order("created_at", { ascending: false })
                .order("id", { ascending: false })
                .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

            const prefix = FILTERS.find((f) => f.key === filter)?.prefix;
            if (prefix) request = request.like("action", `${prefix}%`);

            const term = query.replace(/[%,()*]/g, " ").trim();
            if (term) request = request.or(`actor_name.ilike.%${term}%,target_label.ilike.%${term}%`);

            const { data, error, count } = await request;
            if (cancelled) return;

            if (error) {
                toast.error(`Could not load the audit log: ${error.message}`);
                console.error(error);
                setEvents([]);
                setTotal(0);
            } else {
                setEvents(data ?? []);
                setTotal(count ?? 0);
            }
            setLoading(false);
        }

        load();
        return () => { cancelled = true; };
    }, [page, filter, query]);

    const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
    const to = Math.min((page + 1) * PAGE_SIZE, total);
    const lastPage = Math.max(Math.ceil(total / PAGE_SIZE) - 1, 0);

    return (
        <main className="w-full px-8 py-8">
            <h1 className="text-3xl font-semibold tracking-tight">Audit log</h1>
            <p className="mt-1 text-muted">
                Recorded automatically by the database. Entries can't be edited or deleted from the app.
            </p>

            <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by person or exam"
                        className="flex h-10 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-1 text-base shadow-sm outline-none md:text-sm"
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => { setFilter(f.key); setPage(0); }}
                            className={
                                filter === f.key
                                    ? "inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-white cursor-pointer"
                                    : "inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm cursor-pointer hover:bg-accent"
                            }
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-6 min-h-[24rem] overflow-x-auto rounded-xl border border-border bg-card">
                {loading ? (
                    <SectionLoader />
                ) : events.length === 0 ? (
                    <p className="p-10 text-center text-sm text-muted">
                        {query || filter !== "all" ? "No entries match your search." : "Nothing has been recorded yet."}
                    </p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                                <th className="px-6 py-4">When</th>
                                <th className="px-6 py-4">Who</th>
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4">On</th>
                                <th className="px-6 py-4">Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map((event) => {
                                const on = auditOn(event);
                                const note = auditDetail(event);
                                return (
                                    <tr key={event.id} className="border-b border-border last:border-0 hover:bg-accent/20">
                                        <td className="whitespace-nowrap px-6 py-4 text-muted">{formatWhen(event.created_at)}</td>
                                        <td className="px-6 py-4 font-medium">{event.actor_name}</td>
                                        <td className="px-6 py-4">{auditAction(event)}</td>
                                        <td className="px-6 py-4 font-semibold">{on ?? <span className="font-normal text-muted">—</span>}</td>
                                        <td className="px-6 py-4 text-muted">{note ?? ""}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {total > 0 && (
                <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                    <p className="text-muted">Showing {from}–{to} of {total}</p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={page === 0 || loading}
                            onClick={() => setPage((p) => p - 1)}
                            className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 font-medium shadow-sm cursor-pointer hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            disabled={page >= lastPage || loading}
                            onClick={() => setPage((p) => p + 1)}
                            className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 font-medium shadow-sm cursor-pointer hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </main>
    )
}