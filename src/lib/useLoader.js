"use client"
import { useState, useEffect, useRef } from "react"
import { friendlyMessage, withTimeout } from "@/lib/net"

export function useLoader(loader, deps = []) {
    const [data, setData] = useState(null)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)
    const [tick, setTick] = useState(0)

    const loaderRef = useRef(loader)
    loaderRef.current = loader

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(null)

        Promise.resolve()
            .then(() => withTimeout(loaderRef.current(), 15000))
            .then((result) => { if (!cancelled) setData(result) })
            .catch((err) => {
                console.error(err)
                if (!cancelled) setError(friendlyMessage(err))
            })
            .finally(() => { if (!cancelled) setLoading(false) })

        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tick, ...deps])

    // if the load failed, try again by itself when the connection comes back
    useEffect(() => {
        if (!error) return
        const retry = () => setTick((t) => t + 1)
        window.addEventListener("online", retry)
        return () => window.removeEventListener("online", retry)
    }, [error])

    return { data, error, loading, reload: () => setTick((t) => t + 1) }
}