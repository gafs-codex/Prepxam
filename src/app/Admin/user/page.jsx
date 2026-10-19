"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Check, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { PageLoader, SectionLoader } from "@/components/ui/Spinner"
import ErrorState from "@/components/ui/ErrorState"
import { friendlyMessage, notifyError, safe, withTimeout } from "@/lib/net"


const ROLES = [
    { key: "student", label: "Students" },
    { key: "teacher", label: "Teachers" },
]

const STATUSES = [
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
]

function formatDate(value) {
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminUsers() {
    const [activeRole, setActiveRole] = useState("student");
    const [activeStatus, setActiveStatus] = useState("pending");
    const [counts, setCounts] = useState(null); // { student: { pending, approved, rejected }, teacher: {...} }
    const [countsError, setCountsError] = useState(null);
    const [users, setUsers] = useState([]);
    const [listError, setListError] = useState(null);
    const [loadingList, setLoadingList] = useState(true);
    const [actingOnId, setActingOnId] = useState(null);
    const latestRequest = useRef(0);

    const loadCounts = useCallback(async () => {
        try {
            const queries = [];
            for (const role of ROLES) {
                for (const status of STATUSES) {
                    queries.push(
                        supabase
                            .from("profiles")
                            .select("*", { count: "exact", head: true })
                            .eq("role", role.key)
                            .eq("status", status.key)
                    );
                }
            }

            const results = await withTimeout(Promise.all(queries), 15000);
            const failed = results.find((r) => r.error);
            if (failed) throw failed.error;

            const next = {};
            let i = 0;
            for (const role of ROLES) {
                next[role.key] = {};
                for (const status of STATUSES) {
                    next[role.key][status.key] = results[i].count ?? 0;
                    i++;
                }
            }
            setCounts(next);
            setCountsError(null);
        } catch (err) {
            console.error(err);
            setCountsError(friendlyMessage(err));
        }
    }, []);

    const loadUsers = useCallback(async (role, status) => {
        const request = ++latestRequest.current;
        setLoadingList(true);
        setListError(null);

        const { data, error } = await safe(
            supabase
                .from("profiles")
                .select("id, full_name, email, role, status, created_at,admission_number")
                .eq("role", role)
                .eq("status", status)
                .order("created_at", { ascending: false })
        );

        // a newer tab was opened while this was loading, so ignore this answer
        if (request !== latestRequest.current) return;

        if (error) {
            console.error(error);
            setListError(friendlyMessage(error));
            setUsers([]);
        } else {
            setUsers(data ?? []);
        }
        setLoadingList(false);
    }, []);

    useEffect(() => {
        loadCounts();
    }, [loadCounts]);

    useEffect(() => {
        loadUsers(activeRole, activeStatus);
    }, [activeRole, activeStatus, loadUsers]);

    async function handleDecision(userId, newStatus) {
        setActingOnId(userId);

        const { data, error } = await safe(
            supabase.from("profiles").update({ status: newStatus }).eq("id", userId).select("id"),
            20000
        );

        setActingOnId(null);

        if (error) {
            notifyError(error, "Could not update this user");
            return;
        }
        if (!data || data.length === 0) {
            toast.error("That change wasn't allowed.");
            return;
        }

        toast.success(
            newStatus === "approved" ? "User approved" :
                newStatus === "rejected" ? "User rejected" :
                    "Status updated"
        );

        setUsers((prev) => prev.filter((u) => u.id !== userId));
        loadCounts();
    }

    if (counts === null) {
        return countsError
            ? <ErrorState message={countsError} onRetry={() => { setCountsError(null); loadCounts(); }} />
            : <PageLoader />;
    }


    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
                <Link href="/Admin/students/import" className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-white">
                    Import students
                </Link>
            </div>
            <p className="mt-1 text-sm text-muted">Approve new registrations before they can use Examly.</p>

            <div className="mt-6 flex gap-1 border-b border-border">
                {ROLES.map((role) => {
                    const isActive = activeRole === role.key;
                    const pending = counts[role.key].pending;
                    return (
                        <button
                            key={role.key}
                            onClick={() => setActiveRole(role.key)}
                            className={
                                isActive
                                    ? "border-b-2 border-primary px-4 py-3 text-sm font-medium text-foreground"
                                    : "border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted hover:text-foreground"
                            }
                        >
                            {role.label} ({pending} pending)
                        </button>
                    );
                })}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
                {STATUSES.map((status) => {
                    const isActive = activeStatus === status.key;
                    const value = counts[activeRole][status.key];
                    return (
                        <button
                            key={status.key}
                            onClick={() => setActiveStatus(status.key)}
                            className={
                                isActive
                                    ? "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer bg-primary text-primary-foreground shadow hover:bg-primary/90 h-8 rounded-md px-3 text-xs capitalize text-white"
                                    : "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs capitalize"
                            }
                        >
                            {status.label} ({value})
                        </button>
                    );
                })}
            </div>

            <div className="mt-6">
                {loadingList ? (
                    <SectionLoader />
                ) : listError ? (
                    <ErrorState compact title="Couldn't load these users" message={listError} onRetry={() => loadUsers(activeRole, activeStatus)} />
                ) : users.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-16 text-center text-sm text-muted bg-white">
                        No {activeStatus} {activeRole}s.
                    </div>
                ) : (
                    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                        {users.map((u) => (
                            <li key={u.id} className="flex items-center justify-between gap-4 p-4">
                                <div>
                                    <p className="font-medium">{u.full_name ?? "Unnamed"}</p>
                                    <p className="text-sm text-muted">
                                        {u.email ?? u.admission_number ?? "No email"} · registered {formatDate(u.created_at)}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${u.status === "approved"
                                            ? "bg-green-100 text-green-700"
                                            : u.status === "rejected"
                                                ? "bg-red-100 text-red-700"
                                                : "bg-yellow-100 text-yellow-800"
                                            }`}
                                    >
                                        {u.status}
                                    </span>

                                    {u.status !== "approved" && (
                                        <button
                                            onClick={() => handleDecision(u.id, "approved")}
                                            disabled={actingOnId === u.id}
                                            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-2.5 text-sm font-medium text-white shadow hover:bg-primary/90 cursor-pointer disabled:opacity-50"
                                        >
                                            <Check size={16} /> Approve
                                        </button>
                                    )}
                                    {u.status !== "rejected" && (
                                        <button
                                            onClick={() => handleDecision(u.id, "rejected")}
                                            disabled={actingOnId === u.id}
                                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-sm font-medium shadow-sm hover:bg-accent cursor-pointer disabled:opacity-50"
                                        >
                                            <X size={16} /> Reject
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </main>
    )
}