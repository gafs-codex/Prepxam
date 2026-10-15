import { toast } from "sonner"

// "Failed to fetch" means nothing to a student. This explains it.
export function friendlyMessage(error) {
    const text = String(error?.message ?? error ?? "").toLowerCase()

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return "You're offline. Check your connection and try again."
    }
    if (
        text.includes("failed to fetch") || text.includes("networkerror") ||
        text.includes("load failed") || text.includes("network request failed") ||
        text.includes("fetch failed")
    ) {
        return "Couldn't reach the server. Check your connection and try again."
    }
    if (text === "timeout" || text.includes("timed out")) {
        return "This is taking too long. Check your connection and try again."
    }
    if (text.includes("jwt") && (text.includes("expired") || text.includes("invalid"))) {
        return "Your session has expired. Please log in again."
    }
    if (text.includes("row-level security") || text.includes("permission denied")) {
        return "You don't have permission to do that."
    }
    return error?.message || "Something went wrong. Please try again."
}

export function notifyError(error, prefix) {
    const message = friendlyMessage(error)
    toast.error(prefix ? `${prefix}: ${message}` : message)
}

// give up after a while instead of spinning forever
export function withTimeout(promise, ms = 15000) {
    let timer
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), ms)
    })
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

// Supabase returns { error } instead of throwing. This makes it throw.
export function ensure(result) {
    if (result?.error) throw result.error
    return result
}