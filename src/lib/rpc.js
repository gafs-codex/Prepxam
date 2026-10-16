import { supabase } from "@/lib/supabase"
import { withTimeout } from "@/lib/net"

// the connection failed, as opposed to the server saying no
export function isNetworkError(error) {
    if (!error) return false
    if (typeof navigator !== "undefined" && navigator.onLine === false) return true
    if (error.name === "AbortError") return true

    const text = String(error.message ?? error).toLowerCase()
    return (
        text === "timeout" || text.includes("timed out") ||
        text.includes("failed to fetch") || text.includes("networkerror") ||
        text.includes("load failed") || text.includes("network request failed") ||
        text.includes("fetch failed") || text.includes("bad gateway") ||
        text.includes("service unavailable") || text.includes("gateway time")
    )
}

// the login session ran out
export function isAuthError(error) {
    const text = String(error?.message ?? error ?? "").toLowerCase()
    return error?.code === "PGRST301" || (text.includes("jwt") && (text.includes("expired") || text.includes("invalid")))
}

// the exam is over on the server
export function isClosedError(error) {
    const text = String(error?.message ?? "").toLowerCase()
    return text.includes("time is up") || text.includes("already submitted")
}

// Never throws. Tells you whether a failure was the connection or the server refusing.
export async function callRpc(name, args, ms = 12000) {
    try {
        const { data, error } = await withTimeout(supabase.rpc(name, args), ms)
        if (error) {
            return { ok: false, error, network: isNetworkError(error), auth: isAuthError(error) }
        }
        return { ok: true, data }
    } catch (error) {
        return { ok: false, error, network: true, auth: false }
    }
}