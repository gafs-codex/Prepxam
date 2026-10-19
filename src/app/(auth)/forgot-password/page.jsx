"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { MailCheck, Info } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { safe, notifyError } from "@/lib/net"

export default function ForgotPassword() {
    const [value, setValue] = useState("")
    const [sending, setSending] = useState(false)
    const [sentTo, setSentTo] = useState(null)
    const [cooldown, setCooldown] = useState(0)

    // the login page passes along whatever the person had typed
    useEffect(() => {
        const id = new URLSearchParams(window.location.search).get("id")
        if (id) setValue(id)
    }, [])

    useEffect(() => {
        if (cooldown <= 0) return
        const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
        return () => clearTimeout(timer)
    }, [cooldown])

    const typed = value.trim()
    const looksLikeAdmission = typed !== "" && !typed.includes("@")

    async function send(e) {
        e.preventDefault()
        if (sending || cooldown > 0) return

        if (typed === "") {
            toast.error("Enter your email address")
            return
        }
        if (looksLikeAdmission) return

        setSending(true)
        const { error } = await safe(
            supabase.auth.resetPasswordForEmail(typed.toLowerCase(), {
                redirectTo: `${window.location.origin}/reset-password`,
            }),
            20000
        )
        setSending(false)

        if (error) {
            const text = String(error.message).toLowerCase()
            if (error.status === 429 || text.includes("rate limit") || text.includes("seconds")) {
                toast.error("Please wait a minute before asking for another link.")
                setCooldown(60)
            } else {
                notifyError(error, "Could not send the link")
            }
            return
        }

        setSentTo(typed.toLowerCase())
        setCooldown(60)
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
            <div className="w-full max-w-md">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                    {sentTo ? (
                        <div className="text-center">
                            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
                                <MailCheck size={28} />
                            </span>
                            <h1 className="mt-5 text-xl font-semibold tracking-tight">Check your email</h1>
                            <p className="mt-2 text-sm text-muted">
                                If an account exists for <span className="font-medium text-foreground">{sentTo}</span>, a reset link is on its way. It can take a few minutes. Check your spam folder too.
                            </p>

                            <button
                                type="button"
                                onClick={send}
                                disabled={sending || cooldown > 0}
                                className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background text-sm font-medium shadow-sm cursor-pointer hover:bg-accent disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {cooldown > 0 ? `Send again in ${cooldown}s` : sending ? "Sending..." : "Send again"}
                            </button>
                            <Link href="/login" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
                                Back to log in
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
                            <p className="mt-1 text-sm text-muted">
                                Enter your email and we'll send you a link to choose a new password.
                            </p>

                            <form onSubmit={send} className="mt-6 space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="identifier" className="text-sm font-medium leading-none">
                                        Email or admission number
                                    </label>
                                    <input
                                        id="identifier"
                                        type="text"
                                        autoComplete="username"
                                        autoCapitalize="none"
                                        spellCheck={false}
                                        value={value}
                                        onChange={(e) => setValue(e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus:outline-none"
                                    />
                                </div>

                                {looksLikeAdmission && (
                                    <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                                        <Info size={18} className="mt-0.5 shrink-0" />
                                        <p>
                                            Students don't have an email on file, so a link can't be sent. Ask your school admin to reset your password. They'll give you a temporary one, and you'll choose your own after you log in.
                                        </p>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={sending || cooldown > 0 || looksLikeAdmission}
                                    className="inline-flex w-full items-center justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sending ? "Sending..." : cooldown > 0 ? `Wait ${cooldown}s` : "Send reset link"}
                                </button>
                            </form>

                            <p className="mt-6 text-center text-sm text-muted">
                                <Link href="/login" className="font-medium text-primary hover:underline">Back to log in</Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}