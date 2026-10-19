"use client"
import Link from "next/link"
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PasswordInput from "@/components/PasswordInput";
import { admissionEmail } from "@/lib/admission";
import { notifyError, safe } from "@/lib/net";

export default function Login() {
    const router = useRouter();
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    async function handleLogin(e) {
        e.preventDefault();
        if (submitting) return;

        const typed = identifier.trim();
        if (typed === "") {
            toast.error("Enter your admission number or email");
            return;
        }
        if (password === "") {
            toast.error("Enter your password");
            return;
        }

        setSubmitting(true);

        // an "@" means an email (teachers, admins). Anything else is an admission number.
        const loginEmail = typed.includes("@") ? typed.toLowerCase() : admissionEmail(typed);

        const { data, error } = await safe(
            supabase.auth.signInWithPassword({ email: loginEmail, password }),
            20000
        );

        if (error) {
            setSubmitting(false);
            const text = String(error.message).toLowerCase();
            if (text.includes("banned")) {
                toast.error("This account has been disabled. Please contact the school.");
            } else if (text.includes("invalid login credentials")) {
                toast.error("Wrong admission number or email, or wrong password.");
            } else {
                notifyError(error);
            }
            return;
        }

        const userId = data.user.id;

        const adminRes = await safe(
            supabase.from("admins").select("role").eq("user_id", userId).maybeSingle()
        );
        if (adminRes.error) {
            setSubmitting(false);
            notifyError(adminRes.error, "Logged in, but couldn't check your account");
            return;
        }

        if (adminRes.data) {
            toast.success("Logged in!");
            router.push(adminRes.data.role === "super_admin" ? "/Super/platform" : "/Admin/dashboard");
            return;
        }

        const profileRes = await safe(
            supabase.from("profiles").select("role").eq("id", userId).single()
        );
        if (profileRes.error) {
            setSubmitting(false);
            notifyError(profileRes.error, "Logged in, but couldn't load your profile");
            return;
        }

        toast.success("Logged in!");
        router.push(profileRes.data.role === "teacher" ? "/Teacher/dashboard" : "/student/dashboard");
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
            <div className="w-full max-w-md">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                    <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
                    <p className="mt-1 text-sm text-muted">
                        Log in to continue where you left off.
                    </p>

                    <div className="mt-6">
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="identifier" className="text-sm font-medium leading-none">
                                    Admission number or email
                                </label>
                                <input
                                    id="identifier"
                                    type="text"
                                    autoComplete="username"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    // placeholder="BC/STD/2026/0399"
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus:outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium leading-none">
                                    Password
                                </label>
                                <PasswordInput
                                    id="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <label htmlFor="remember" className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                                    <input
                                        type="checkbox"
                                        name="remember"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        id="remember"
                                        className="h-3.5 w-3.5 cursor-pointer accent-blue-600 focus:ring-blue-500"
                                    />
                                    Remember me
                                </label>
                                <Link
                                    className="text-sm font-medium text-primary hover:underline"
                                    href={identifier.trim() ? `/forgot-password?id=${encodeURIComponent(identifier.trim())}` : "/forgot-password"}
                                >
                                    Forgot password?
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {submitting ? "Logging in..." : "Log in"}
                            </button>

                            <p className="text-center text-xs text-muted">
                                Students: if you forgot your password, ask the school to reset it.
                            </p>
                        </form>

                        <p className="mt-6 text-center text-sm text-muted">
                            New here? <Link href="/register" className="text-sm font-medium text-primary hover:underline">Create an account</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}