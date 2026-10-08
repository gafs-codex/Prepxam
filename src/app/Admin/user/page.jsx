"use client"
import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Check, X, RotateCcw } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { PageLoader } from "@/components/ui/Spinner"

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
    const [users, setUsers] = useState(null);
    const [loadingList, setLoadingList] = useState(true);
    const [actingOnId, setActingOnId] = useState(null);

    const loadCounts = useCallback(async () => {
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

        const results = await Promise.all(queries);

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
    }, []);

    const loadUsers = useCallback(async (role, status) => {
        setLoadingList(true);

        const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, role, status, created_at")
            .eq("role", role)
            .eq("status", status)
            .order("created_at", { ascending: false });

        if (error) {
            toast.error("Could not load users");
            console.error(error);
            setUsers([]);
        } else {
            setUsers(data);
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

        const { error } = await supabase
            .from("profiles")
            .update({ status: newStatus })
            .eq("id", userId);

        setActingOnId(null);

        if (error) {
            toast.error("Could not update this user");
            console.error(error);
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

    if (counts === null) return <PageLoader />;

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
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
                    <div className="rounded-xl border border-dashed border-border p-16 text-center text-sm text-muted">
                        Loading...
                    </div>
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
                                        Registered {formatDate(u.created_at)}
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    {activeStatus !== "approved" && (
                                        <button
                                            onClick={() => handleDecision(u.id, "approved")}
                                            disabled={actingOnId === u.id}
                                            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white shadow hover:bg-primary/90 disabled:opacity-50"
                                        >
                                            <Check size={16} /> Approve
                                        </button>
                                    )}
                                    {activeStatus !== "rejected" && (
                                        <button
                                            onClick={() => handleDecision(u.id, "rejected")}
                                            disabled={actingOnId === u.id}
                                            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm hover:bg-accent disabled:opacity-50"
                                        >
                                            <X size={16} /> Reject
                                        </button>
                                    )}
                                    {activeStatus !== "pending" && (
                                        <button
                                            onClick={() => handleDecision(u.id, "pending")}
                                            disabled={actingOnId === u.id}
                                            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm hover:bg-accent disabled:opacity-50"
                                        >
                                            <RotateCcw size={16} /> Reset
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