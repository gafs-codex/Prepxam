"use client"
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import StudentDashboardNavbar from "@/components/StudentDashboardNavbar";
import { PageLoader } from "@/components/ui/Spinner"

export default function StudentDashboardLayout({ children }) {
    const { profile, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            if (!profile) {
                router.push("/login");
            } else if (profile.role !== "student") {
                router.push("/Teacher/dashboard");
            }
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
                {children}
            </main>
        </div>
    );
}