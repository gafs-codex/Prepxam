"use client"
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import TeacherDashboardNavbar from "@/components/TeacherDashboardNavbar";

export default function StudentDashboardLayout({ children }) {
    const { profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!profile) {
                router.push("/login");
            } else if (profile.role !== "teacher") {
                router.push("/student/dashboard");
            }
        }
    }, [loading, profile, router]);

    if (loading || !profile || profile.role !== "teacher") {
        return <div className="p-8">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-background">
            <TeacherDashboardNavbar />
            <main className="mx-auto max-w-6xl px-4 py-6">
                {children}
            </main>
        </div>
    );
}