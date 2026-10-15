import { supabase } from "@/lib/supabase"
import { friendlyMessage } from "@/lib/net"

export async function apiPost(url, body, timeoutMs = 20000) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return { ok: false, error: "Your session has expired. Please log in again." }

        const res = await fetch(url, {
            method: "POST",
            signal: controller.signal,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(body),
        })

        let result = {}
        try { result = await res.json() } catch { /* the server sent no JSON */ }

        if (!res.ok) {
            return { ok: false, error: result.error ?? `The server returned an error (${res.status}).` }
        }
        return { ok: true, ...result }
    } catch (err) {
        if (err?.name === "AbortError") {
            return { ok: false, error: "This is taking too long. It may still have gone through, so refresh to check." }
        }
        return { ok: false, error: friendlyMessage(err) }
    } finally {
        clearTimeout(timer)
    }
}