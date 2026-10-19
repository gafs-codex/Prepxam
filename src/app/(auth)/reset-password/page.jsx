"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import PasswordInput from "@/components/PasswordInput"
import { safe, notifyError } from "@/lib/net"

export default function ResetPassword() {
    const router = useRouter()
    const [ready, setReady] = useState(false)
    const [expired, setExpired] = useState(false)
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        // Supabase fires PASSWORD_RECOVERY once it reads the token from the emailed link
        const { data: listener } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY") setReady(true)
        })

        // covers the case where the event fired before this effect ran
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setReady(true)
        })

        const timer = setTimeout(() => setExpired(true), 8000)

        return () => {
            listener.subscription.unsubscribe()
            clearTimeout(timer)
        }
    }, [])

    async function handleSubmit(e) {
        e.preventDefault()
        if (loading) return

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters")
            return
        }
        if (password !== confirmPassword) {
            toast.error("Passwords don't match")
            return
        }

        setLoading(true)
        const { error } = await safe(supabase.auth.updateUser({ password }), 20000)
        setLoading(false)

        if (error) {
            notifyError(error, "Your password was not changed")
            return
        }

        toast.success("Password updated. Please log in.")
        await safe(supabase.auth.signOut())
        router.push("/login")
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
            <div className="w-full max-w-md">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                    <h1 className="text-xl font-semibold tracking-tight">Set a new password</h1>

                    {!ready ? (
                        expired ? (
                            <div className="mt-4 space-y-3 text-sm text-muted">
                                <p>This reset link has expired or was already used.</p>
                                <Link href="/forgot-password" className="inline-block font-medium text-primary hover:underline">
                                    Request a new link
                                </Link>
                                <p className="text-xs">Students: ask the school to reset your password.</p>
                            </div>
                        ) : (
                            <p className="mt-4 text-sm text-muted">Verifying your reset link...</p>
                        )
                    ) : (
                        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="newPassword" className="text-sm font-medium leading-none">New password</label>
                                <PasswordInput
                                    id="newPassword"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="confirmNewPassword" className="text-sm font-medium leading-none">Confirm new password</label>
                                <PasswordInput
                                    id="confirmNewPassword"
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Updating..." : "Update password"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}