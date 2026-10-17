"use client"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { PageLoader } from "@/components/ui/Spinner"
import AdminDashboardNavbar from "@/components/AdminDashboardNavbar"
import { useState, useEffect, useCallback } from "react"
import ErrorState from "@/components/ui/ErrorState"
import { friendlyMessage, safe } from "@/lib/net"
import { isNetworkError } from "@/lib/rpc"

// add the other pages here as you build them
const superLinks = [
    { href: "/Super/platform", label: "Platform" },
    { href: "/Super/admins", label: "Admins" },
    { href: "/Super/users", label: "All users" },
    { href: "/Super/audit", label: "Audit log" },
];
export default function SuperLayout({ children }) {
    const router = useRouter();
    const [state, setState] = useState("checking"); // checking | ok | error
    const [errorText, setErrorText] = useState(null);

    const check = useCallback(async () => {
        setState("checking");

        // getSession reads the saved session, so a dropped connection isn't mistaken for a logout
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError && isNetworkError(sessionError)) {
            setErrorText(friendlyMessage(sessionError));
            setState("error");
            return;
        }
        if (!session) {
            router.replace("/login");
            return;
        }

        const { data: row, error } = await safe(
            supabase.from("admins").select("role").eq("user_id", session.user.id).maybeSingle()
        );
        if (error) {
            setErrorText(friendlyMessage(error));
            setState("error");
            return;
        }

        if (row?.role === "super_admin") setState("ok");
        else if (row?.role === "school_admin") router.replace("/Admin/dashboard");
        else router.replace("/");
    }, [router]);

    useEffect(() => { check(); }, [check]);

    if (state === "error") return <ErrorState message={errorText} onRetry={check} />;
    if (state !== "ok") return <PageLoader />;

    return (
        <>
            <AdminDashboardNavbar links={superLinks} />
            {children}
        </>
    )
}