"use client"
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import StudentDashboardNavbar from "@/components/StudentDashboardNavbar";
import { PageLoader } from "@/components/ui/Spinner"
import AccessGate from "@/components/AccessGate";
import { homeFor } from "@/lib/home";

export default function StudentLayout({ children }) {
    const { profile, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading) return;
        if (!profile) {
            router.replace("/login");
            return;
        }
        if (profile.role !== "student") {
            homeFor(profile.role).then((path) => router.replace(path));
        }
    }, [loading, profile, router]);

    if (loading || !profile || profile.role !== "student") {
        return <PageLoader />;
    }

    const takingExam = /^\/student\/exams\/[^/]+$/.test(pathname);

    return (
        <div className="min-h-screen bg-background">
            {!takingExam && <StudentDashboardNavbar />}
            <main className="mx-auto max-w-6xl px-4 py-6">
                <AccessGate>{children}</AccessGate>
            </main>
        </div>
    );
}