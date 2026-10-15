"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import FilterDropdown from "@/components/FilterDropdown"
import { SectionLoader } from "@/components/ui/Spinner"
import { apiPost } from "@/lib/api"
import { friendlyMessage, notifyError, withTimeout } from "@/lib/net"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const PAGE_SIZE = 25;

const ROLE_FILTERS = [
    { key: "all", label: "All" },
    { key: "student", label: "Students" },
    { key: "teacher", label: "Teachers" },
    { key: "admin", label: "Admins" },
];

const STATUS_OPTIONS = ["All statuses", "Pending", "Approved", "Rejected", "Disabled"];

const badgeStyles = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    disabled: "bg-gray-900 text-white",
};

function formatDate(value) {
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AllUsers() {
    const [users, setUsers] = useState([]);
    const [adminRoles, setAdminRoles] = useState({});
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [role, setRole] = useState("all");
    const [status, setStatus] = useState("All statuses");
    const [search, setSearch] = useState("");
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);
    const [dialog, setDialog] = useState(null); // { type: "disable" | "enable" | "role", user }
    const [busy, setBusy] = useState(false);
    const [loadError, setLoadError] = useState(null);

    useEffect(() => {
        async function loadAdmins() {
            const { data, error } = await supabase.from("admins").select("user_id, role");
            if (error) {
                console.error(error);
                return;
            }
            setAdminRoles(Object.fromEntries((data ?? []).map((a) => [a.user_id, a.role])));
        }
        loadAdmins();
    }, [reloadKey]);

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
            setLoadError(null);

            try {
                let request = supabase
                    .from("profiles")
                    .select("id, full_name, email, role, status, disabled, created_at", { count: "exact" })
                    .order("created_at", { ascending: false })
                    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

                if (role !== "all") request = request.eq("role", role);

                if (status === "Disabled") request = request.eq("disabled", true);
                else if (status !== "All statuses") request = request.eq("status", status.toLowerCase()).eq("disabled", false);

                const term = query.replace(/[%,()*]/g, " ").trim();
                if (term) request = request.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);

                const { data, error, count } = await withTimeout(request, 15000);
                if (error) throw error;
                if (cancelled) return;

                setUsers(data ?? []);
                setTotal(count ?? 0);
            } catch (err) {
                console.error(err);
                if (cancelled) return;
                setLoadError(friendlyMessage(err));
                setUsers([]);
                setTotal(0);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [page, role, status, query, reloadKey]);

    async function confirm() {
        if (!dialog) return;
        const { type, user } = dialog;
        setBusy(true);
        setDialog(null);

        let failure = null;

        if (type === "role") {
            const newRole = user.role === "student" ? "teacher" : "student";
            try {
                const { error } = await supabase.rpc("change_user_role", { p_user_id: user.id, p_role: newRole });
                if (error) failure = friendlyMessage(error);
            } catch (err) {
                failure = friendlyMessage(err);
            }
        } else {
            const result = await apiPost("/api/users", { userId: user.id, disabled: type === "disable" });
            if (!result.ok) failure = result.error;
        }

        setBusy(false);

        if (failure) {
            toast.error(failure);
            return;
        }

        toast.success(
            type === "role" ? "Role changed" :
                type === "disable" ? "Account disabled" : "Account enabled"
        );
        setReloadKey((k) => k + 1);
    }

    const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
    const to = Math.min((page + 1) * PAGE_SIZE, total);
    const lastPage = Math.max(Math.ceil(total / PAGE_SIZE) - 1, 0);

    const smallBtn = "inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm cursor-pointer hover:bg-accent disabled:opacity-50";

    const dialogText = !dialog ? null : {
        disable: {
            title: "Disable this account?",
            body: "They won't be able to log in, and their access stops straight away. Their exams, questions and results are kept. You can enable the account again at any time.",
            action: "Disable",
        },
        enable: {
            title: "Enable this account?",
            body: "They can log in again, with the same approval status they had before.",
            action: "Enable",
        },
        role: {
            title: `Change to ${dialog.user.role === "student" ? "teacher" : "student"}?`,
            body: `Their subjects move across with them. This is for someone who registered as the wrong role. It isn't allowed once they have created exams or questions (teachers) or taken an exam (students). They should log out and back in afterwards.`,
            action: "Change role",
        },
    }[dialog.type];

    return (
        <main className="w-full px-8 py-8">
            <h1 className="text-3xl font-semibold tracking-tight">All users</h1>
            <p className="mt-1 text-muted">
                Every account on the platform. Routine approvals belong to the school admin. Use this page for exceptions.
            </p>

            <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or email"
                        className="flex h-10 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-1 text-base shadow-sm outline-none md:text-sm"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {ROLE_FILTERS.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => { setRole(f.key); setPage(0); }}
                            className={
                                role === f.key
                                    ? "inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-white cursor-pointer"
                                    : "inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm cursor-pointer hover:bg-accent"
                            }
                        >
                            {f.label}
                        </button>
                    ))}
                    <FilterDropdown options={STATUS_OPTIONS} value={status} onChange={(v) => { setStatus(v); setPage(0); }} />
                </div>
            </div>

            <div className="mt-6 min-h-[24rem] overflow-x-auto rounded-xl border border-border bg-card">
                {loading ? (
                    <SectionLoader />
                ) : loadError ? (
                    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                        <p className="font-medium">Couldn't load users</p>
                        <p className="mt-1 max-w-sm text-sm text-muted">{loadError}</p>
                        <button
                            type="button"
                            onClick={() => setReloadKey((k) => k + 1)}
                            className="mt-4 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-white cursor-pointer"
                        >
                            Try again
                        </button>
                    </div>
                ) : users.length === 0 ? (
                    <p className="p-10 text-center text-sm text-muted">No users match your search.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4 text-xs">Email</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Joined</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => {
                                const adminRole = adminRoles[u.id];
                                const isAdmin = Boolean(adminRole) || u.role === "admin";
                                const state = u.disabled ? "disabled" : u.status;
                                const roleLabel = adminRole
                                    ? (adminRole === "super_admin" ? "Super admin" : "School admin")
                                    : u.role.charAt(0).toUpperCase() + u.role.slice(1);

                                return (
                                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-accent/20">
                                        <td className="px-6 py-4 font-medium">{u.full_name ?? "Unnamed"}</td>
                                        <td className="px-6 py-4 text-muted">{u.email ?? "—"}</td>
                                        <td className="px-6 py-4">{roleLabel}</td>
                                        <td className="px-6 py-4">
                                            <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${badgeStyles[state] ?? "bg-accent"}`}>
                                                {state}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-muted">{formatDate(u.created_at)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-2">
                                                {isAdmin ? (
                                                    <Link href="/Super/admins" className="text-xs font-medium text-primary hover:underline">
                                                        Manage on Admins page
                                                    </Link>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => setDialog({ type: "role", user: u })}
                                                            className={smallBtn}
                                                        >
                                                            Make {u.role === "student" ? "teacher" : "student"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => setDialog({ type: u.disabled ? "enable" : "disable", user: u })}
                                                            className={`${smallBtn} ${u.disabled ? "" : "text-red-600"}`}
                                                        >
                                                            {u.disabled ? "Enable" : "Disable"}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
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

            <AlertDialog open={dialog !== null} onOpenChange={(open) => { if (!open) setDialog(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{dialogText?.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            <span className="font-medium">{dialog?.user.full_name ?? dialog?.user.email}. </span>
                            {dialogText?.body}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {/* <AlertDialogFooter> */}
                    <div className="flex gap-2 justify-end">
                        <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirm}
                            className={`cursor-pointer text-white ${dialog?.type === "disable" ? "bg-red-600 hover:bg-red-700" : ""}`}
                        >
                            {dialogText?.action}
                        </AlertDialogAction>
                    </div>
                    {/* </AlertDialogFooter> */}
                </AlertDialogContent>
            </AlertDialog>
        </main>
    )
}