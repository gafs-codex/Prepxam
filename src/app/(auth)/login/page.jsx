"use client"
import Link from "next/link"
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PasswordInput from "@/components/PasswordInput";

export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    async function handleLogin(e) {
        e.preventDefault();
        setSubmitting(true);

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });

        if (error) {
            setSubmitting(false);
            toast.error(
                error.message.toLowerCase().includes("banned")
                    ? "This account has been disabled. Please contact the school."
                    : error.message
            );
            return;
        }

        const { data: adminRow } = await supabase
            .from("admins")
            .select("role")
            .eq("user_id", data.user.id)
            .maybeSingle();

        if (adminRow) {
            toast.success("Logged in!");
            router.push(adminRow.role === "super_admin" ? "/Super/platform" : "/Admin/dashboard");
            return;
        }

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();

        if (profileError) {
            setSubmitting(false);
            toast.error("Logged in, but couldn't load your profile");
            return;
        }

        toast.success("Logged in!");

        if (profile.role === "teacher") {
            router.push("/Teacher/dashboard");
        } else {
            router.push("/student/dashboard");
        }
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
                                <label htmlFor="email" className="text-sm font-medium leading-none">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
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
                                <Link className="text-sm font-medium text-primary hover:underline" href="/forgot-password">
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