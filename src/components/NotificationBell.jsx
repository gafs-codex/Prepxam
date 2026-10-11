"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import { supabase } from "@/lib/supabase"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function timeAgo(value) {
    const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationBell() {
    const router = useRouter();
    const [items, setItems] = useState([]);
    const [userId, setUserId] = useState(null);

    const load = useCallback(async () => {
        const { data } = await supabase
            .from("notifications")
            .select("id, title, body, link, read, created_at")
            .order("created_at", { ascending: false })
            .limit(15);
        setItems(data ?? []);
    }, []);

    useEffect(() => {
        let channel;
        async function start() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);
            await load();

            channel = supabase
                .channel(`notifications-${user.id}`)
                .on(
                    "postgres_changes",
                    { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
                    (payload) => setItems((prev) => [payload.new, ...prev].slice(0, 15))
                )
                .subscribe();
        }
        start();
        return () => { if (channel) supabase.removeChannel(channel); };
    }, [load]);

    const unread = items.filter((n) => !n.read).length;

    async function openItem(n) {
        if (!n.read) {
            setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
            await supabase.from("notifications").update({ read: true }).eq("id", n.id);
        }
        if (n.link) router.push(n.link);
    }

    async function markAllRead() {
        setItems((prev) => prev.map((x) => ({ ...x, read: true })));
        await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    }

    return (
        <DropdownMenu onOpenChange={(open) => { if (open) load(); }}>
            <DropdownMenuTrigger asChild>
                <button
                    aria-label="Notifications"
                    className="relative inline-flex h-9 w-9 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background text-sm font-medium shadow-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                >
                    <Bell className="h-5 w-5 text-muted" />
                    {unread > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white">
                            {unread > 9 ? "9+" : unread}
                        </span>
                    )}
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={8} className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between px-3 py-2">
                    <span className="text-base font-semibold">Notifications</span>
                    {unread > 0 && (
                        <button
                            type="button"
                            onClick={markAllRead}
                            className="text-xs font-medium text-primary hover:underline cursor-pointer"
                        >
                            Mark all as read
                        </button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <div className="max-h-96 overflow-y-auto">
                    {items.length === 0 ? (
                        <p className="px-3 py-8 text-center text-sm text-muted">You're all caught up.</p>
                    ) : (
                        items.map((n) => (
                            <DropdownMenuItem
                                key={n.id}
                                onClick={() => openItem(n)}
                                className="cursor-pointer items-start gap-3 px-3 py-3"
                            >
                                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`} />
                                <span className="flex-1">
                                    <span className={`block text-sm ${n.read ? "font-normal" : "font-semibold"}`}>{n.title}</span>
                                    {n.body && <span className="mt-0.5 block text-xs text-muted">{n.body}</span>}
                                    <span className="mt-1 block text-[11px] text-muted">{timeAgo(n.created_at)}</span>
                                </span>
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}