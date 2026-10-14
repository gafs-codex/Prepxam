"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Clock, XCircle, Ban, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { PageLoader } from "@/components/ui/Spinner"

const MESSAGES = {
    pending: {
        icon: Clock,
        tone: "bg-yellow-100 text-yellow-700",
        title: "Waiting for approval",
        body: "Your account has been created. The school needs to approve it before you can use Prepxam. Check back soon.",
    },
    rejected: {
        icon: XCircle,
        tone: "bg-red-100 text-red-700",
        title: "Registration not approved",
        body: "Your registration was not approved. Please contact the school if you think this is a mistake.",
    },
    disabled: {
        icon: Ban,
        tone: "bg-gray-200 text-gray-800",
        title: "Account disabled",
        body: "This account has been disabled. Please contact the school.",
    },
    error: {
        icon: TriangleAlert,
        tone: "bg-yellow-100 text-yellow-700",
        title: "We couldn't check your account",
        body: "Something went wrong while loading your account. Please try again.",
    },
}

export default function AccessGate({ children }) {
    const router = useRouter()
    const pathname = usePathname()
    const [state, setState] = useState("loading") // loading | ok | pending | rejected | disabled | error
    const [who, setWho] = useState(null)
    const [checking, setChecking] = useState(false)

    const check = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.replace("/login")
            return "none"
        }

        const { data, error } = await supabase
            .from("profiles")
            .select("full_name, email, status, disabled")
            .eq("id", user.id)
            .single()

        if (error) {
            console.error("Access check failed:", error)
            setState((current) => (current === "loading" ? "error" : current))
            return "error"
        }

        const next = data.disabled ? "disabled" : data.status === "approved" ? "ok" : data.status
        setWho(data)
        setState(next)
        return next
    }, [router])

    useEffect(() => {
        check()
        // check again whenever the person comes back to this tab
        const onFocus = () => check()
        window.addEventListener("focus", onFocus)
        return () => window.removeEventListener("focus", onFocus)
    }, [check])

    async function checkAgain() {
        setChecking(true)
        const result = await check()
        setChecking(false)
        if (result === "pending") toast.info("Still waiting for approval.")
    }

    async function signOut() {
        await supabase.auth.signOut()
        router.replace("/login")
    }

    if (state === "loading") return <PageLoader />
    if (state === "ok") return children

    // pending people may still edit their profile
    if (state === "pending" && pathname.endsWith("/profile")) return children

    const message = MESSAGES[state] ?? MESSAGES.error
    const Icon = message.icon
    const firstName = who?.full_name?.split(" ")[0]

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center py-10">
            {state === "pending" && firstName && (
                <h1 className="mb-6 text-2xl font-semibold tracking-tight">Welcome, {firstName} 👋</h1>
            )}

            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
                <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${message.tone}`}>
                    <Icon size={28} />
                </span>

                <h2 className="mt-5 text-xl font-semibold tracking-tight">{message.title}</h2>
                <p className="mt-2 text-sm text-muted">{message.body}</p>

                {who?.email && (
                    <p className="mt-4 text-xs text-muted">Signed in as {who.email}</p>
                )}

                <div className="mt-6 flex flex-col gap-3">
                    {(state === "pending" || state === "error") && (
                        <button
                            type="button"
                            onClick={checkAgain}
                            disabled={checking}
                            className="inline-flex h-10 items-center justify-center rounded-md bg-primary text-sm font-medium text-white cursor-pointer disabled:opacity-60"
                        >
                            {checking ? "Checking..." : "Check again"}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={signOut}
                        className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background text-sm font-medium shadow-sm cursor-pointer hover:bg-accent"
                    >
                        Log out
                    </button>
                </div>
            </div>
        </div>
    )
}