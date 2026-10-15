"use client"
import { useState, useEffect } from "react"
import { WifiOff, Wifi } from "lucide-react"

export default function OfflineBanner() {
    const [online, setOnline] = useState(true)
    const [justBack, setJustBack] = useState(false)

    useEffect(() => {
        setOnline(navigator.onLine)
        let timer

        const goOffline = () => { clearTimeout(timer); setJustBack(false); setOnline(false) }
        const goOnline = () => {
            setOnline(true)
            setJustBack(true)
            timer = setTimeout(() => setJustBack(false), 3000)
        }

        window.addEventListener("offline", goOffline)
        window.addEventListener("online", goOnline)
        return () => {
            clearTimeout(timer)
            window.removeEventListener("offline", goOffline)
            window.removeEventListener("online", goOnline)
        }
    }, [])

    if (online && !justBack) return null

    return (
        <div
            role="status"
            className={`fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg ${online ? "bg-green-600" : "bg-gray-900"}`}
        >
            {online ? <Wifi size={16} /> : <WifiOff size={16} />}
            {online ? "Back online" : "You're offline. Changes may not save."}
        </div>
    )
}