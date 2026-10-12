"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

export default function ResetPassword() {
    const router = useRouter()
    const [ready, setReady] = useState(false)
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

        return () => listener.subscription.unsubscribe()
    }, [])

    async function handleSubmit(e) {
        e.preventDefault()

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters")
            return
        }
        if (password !== confirmPassword) {
            toast.error("Passwords don't match")
            return
        }

        setLoading(true)
        const { error } = await supabase.auth.updateUser({ password })
        setLoading(false)

        if (error) {
            toast.error(error.message)
            return
        }

        toast.success("Password updated. Please log in.")
        await supabase.auth.signOut()
        router.push("/login")
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
            <div className="w-full max-w-md">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                    <h1 className="text-xl font-semibold tracking-tight">Set a new password</h1>

                    {!ready ? (
                        <p className="mt-4 text-sm text-muted">
                            Verifying your reset link... If nothing happens, the link may have expired. Request a new one from the login page.
                        </p>
                    ) : (
                        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none">New password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus:outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none">Confirm new password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus:outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
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