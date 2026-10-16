"use client"
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageLoader } from "@/components/ui/Spinner"
import TeacherDashboardNavbar from "@/components/TeacherDashboardNavbar";
import ErrorState from "@/components/ui/ErrorState";
import AccessGate from "@/components/AccessGate";
import { homeFor } from "@/lib/home";

export default function TeacherLayout({ children }) {
    const { profile, loading, error, refresh } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;
        if (!profile) {
            if (!error) router.replace("/login");   // a failed load is not a sign-out
            return;
        }
        if (profile.role !== "teacher") {
            homeFor(profile.role).then((path) => router.replace(path));
        }
    }, [loading, profile, error, router]);

    if (loading) return <PageLoader />;
    if (!profile && error) return <ErrorState message={error} onRetry={refresh} />;
    if (!profile || profile.role !== "teacher") return <PageLoader />;

    return (
        <div className="min-h-screen bg-background">
            <TeacherDashboardNavbar />
            <main className="mx-auto max-w-6xl px-4 py-6">
                <AccessGate>{children}</AccessGate>
            </main>
        </div>
    );
}