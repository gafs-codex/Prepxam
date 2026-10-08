"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import AdminDashboardNavbar from "@/components/AdminDashboardNavbar"

export default function AdminLayout({ children }) {
    const router = useRouter();
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        async function checkAdmin() {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.replace("/login");
                return;
            }

            const { data: adminRow } = await supabase
                .from("admins")
                .select("role")
                .eq("user_id", user.id)
                .maybeSingle();

            if (!adminRow) {
                router.replace("/");
                return;
            }
            setAllowed(true);
        }
        checkAdmin();
    }, [router]);

    if (!allowed) return <main className="p-8">Checking access...</main>;

    return (
        <div>
            <AdminDashboardNavbar />
            {children}
        </div>
    )
}