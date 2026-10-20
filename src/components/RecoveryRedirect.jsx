"use client"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"

// read once at load, before Supabase tidies the address bar
const bootHash = typeof window === "undefined" ? "" : window.location.hash
let handled = false

export default function RecoveryRedirect() {
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (pathname === "/reset-password" || pathname === "/forgot-password") return

        if (!handled) {
            if (bootHash.includes("error_code=otp_expired") || bootHash.includes("error=access_denied")) {
                handled = true
                router.replace("/forgot-password?expired=1")
                return
            }
            if (bootHash.includes("type=recovery")) {
                handled = true
                router.replace("/reset-password")
                return
            }
        }

        const { data: listener } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY") router.replace("/reset-password")
        })
        return () => listener.subscription.unsubscribe()
    }, [pathname, router])

    return null
}