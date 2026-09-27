import StudentDashboardNavbar from "@/components/StudentDashboardNavbar";

export default function StudentDashboardLayout({ children }) {
    return (
        <div className="min-h-screen bg-background">
            <StudentDashboardNavbar />
            <main className="mx-auto max-w-6xl px-4 py-6">
                {children}
            </main>
        </div>
    );
}