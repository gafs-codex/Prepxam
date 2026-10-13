"use client"
import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Search, Eye, EyeOff } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { PageLoader } from "@/components/ui/Spinner"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const inputClass = "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm outline-none md:text-sm";
const labelClass = "text-sm font-medium leading-none";

function formatDate(value) {
    if (!value) return "";
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function SuperAdmins() {
    const [admins, setAdmins] = useState(null);
    const [myId, setMyId] = useState(null);
    const [search, setSearch] = useState("");

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [adding, setAdding] = useState(false);

    const [removing, setRemoving] = useState(null); // the admin being removed
    const [busy, setBusy] = useState(false);

    const loadAdmins = useCallback(async () => {
        const { data, error } = await supabase.rpc("list_admins");
        if (error) {
            toast.error(`Could not load admins: ${error.message}`);
            setAdmins([]);
            return;
        }
        setAdmins(data ?? []);
    }, []);

    useEffect(() => {
        async function start() {
            const { data: { user } } = await supabase.auth.getUser();
            setMyId(user?.id ?? null);
            await loadAdmins();
        }
        start();
    }, [loadAdmins]);

    async function addAdmin(e) {
        e.preventDefault();

        if (!email.trim() || !email.includes("@")) {
            toast.error("Enter the person's email address");
            return;
        }

        setAdding(true);
        const { data: { session } } = await supabase.auth.getSession();

        const res = await fetch("/api/admins", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.access_token ?? ""}`,
            },
            body: JSON.stringify({ fullName, email, password }),
        });
        const result = await res.json().catch(() => ({}));
        setAdding(false);

        if (!res.ok) {
            toast.error(result.error ?? "Could not add the admin");
            return;
        }

        toast.success(result.created
            ? "School admin account created"
            : "Existing account promoted to school admin");
        setFullName("");
        setEmail("");
        setPassword("");
        await loadAdmins();
    }

    async function removeAdmin() {
        if (!removing) return;
        const target = removing;
        setBusy(true);
        setRemoving(null);

        const { error } = await supabase.rpc("remove_school_admin", { p_user_id: target.user_id });
        setBusy(false);

        if (error) {
            toast.error(error.message);
            return;
        }
        toast.success("School admin removed");
        await loadAdmins();
    }

    if (admins === null) return <PageLoader />;

    const visible = admins.filter((a) =>
        `${a.full_name ?? ""} ${a.email ?? ""}`.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
            <h1 className="text-2xl font-semibold tracking-tight">Admins</h1>
            <p className="mt-1 text-sm text-muted">Only you can add or remove school admins.</p>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
                <section className="h-fit min-h-[26rem] rounded-xl border border-border bg-card p-5">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search admins by name or email"
                            className={`${inputClass} pl-10`}
                        />
                    </div>

                    <div className="mt-4 divide-y divide-border">
                        {visible.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted">
                                {admins.length === 0 ? "No admins yet." : "No admins match your search."}
                            </p>
                        ) : (
                            visible.map((a) => {
                                const isSuper = a.role === "super_admin";
                                const isMe = a.user_id === myId;
                                return (
                                    <div key={a.user_id} className="flex flex-wrap items-center gap-3 py-4">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium">
                                                {a.full_name ?? "Unnamed"}
                                                {isMe && (
                                                    <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-normal">You</span>
                                                )}
                                            </p>
                                            <p className="truncate text-xs text-muted">
                                                {a.email ?? "No email"}{a.since ? ` · since ${formatDate(a.since)}` : ""}
                                            </p>
                                        </div>
                                        <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${isSuper ? "bg-primary/10 text-primary" : "bg-accent"}`}>
                                            {isSuper ? "Super Admin" : "School Admin"}
                                        </span>
                                        {!isSuper && (
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => setRemoving(a)}
                                                className="inline-flex h-8 items-center rounded-lg border border-input bg-background px-4 text-sm font-medium text-red-600 shadow-sm cursor-pointer hover:bg-accent disabled:opacity-60"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>

                <form onSubmit={addAdmin} className="h-fit space-y-5 rounded-xl border border-border bg-card p-6">
                    <div>
                        <h2 className="text-lg font-semibold">Add a school admin</h2>
                        <p className="mt-1 text-sm text-muted">
                            If the email already has an account, it's promoted and the password is ignored.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="adminName" className={labelClass}>Full name</label>
                        <input
                            id="adminName"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="adminEmail" className={labelClass}>Email</label>
                        <input
                            id="adminEmail"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="adminPassword" className={labelClass}>Password (8+ characters)</label>
                        <div className="relative">
                            <input
                                id="adminPassword"
                                type={showPassword ? "text" : "password"}
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`${inputClass} pr-10`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((s) => !s)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted cursor-pointer"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={adding}
                        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {adding ? "Adding..." : "Add admin"}
                    </button>
                </form>
            </div>

            <AlertDialog open={removing !== null} onOpenChange={(open) => { if (!open) setRemoving(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove this school admin?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <span className="font-medium">{removing?.full_name ?? removing?.email}. </span>
                            They lose access to the admin area straight away and go back to being a student with no subjects.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={removeAdmin} className="cursor-pointer bg-red-600 text-white hover:bg-red-700">
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    )
}