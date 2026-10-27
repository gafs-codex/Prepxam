"use client"
import { useEffect } from "react"

export default function RegisterServiceWorker() {
    useEffect(() => {
        // only on the live site. A service worker in development causes confusing stale pages
        if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return
        navigator.serviceWorker.register("/sw.js").catch((err) => console.error("Service worker:", err))
    }, [])
    return null
}