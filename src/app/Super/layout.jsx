"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { PageLoader } from "@/components/ui/Spinner"
import AdminDashboardNavbar from "@/components/AdminDashboardNavbar"

// add the other pages here as you build them
const superLinks = [
    { href: "/Super/platform", label: "Platform" },
    { href: "/Super/admins", label: "Admins" },
    { href: "/Super/users", label: "All users" },
    { href: "/Super/audit", label: "Audit log" },
];
export default function SuperLayout({ children }) {
    const router = useRouter();
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        async function check() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace("/login");
                return;
            }

            const { data: row } = await supabase
                .from("admins")
                .select("role")
                .eq("user_id", user.id)
                .maybeSingle();

            if (row?.role === "super_admin") {
                setAllowed(true);
            } else if (row?.role === "school_admin") {
                router.replace("/Admin/dashboard");
            } else {
                router.replace("/");
            }
        }
        check();
    }, [router]);

    if (!allowed) return <PageLoader />;

    return (
        <>
            <AdminDashboardNavbar links={superLinks} />
            {children}
        </>
    )
}