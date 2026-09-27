import Navbar from "@/components/Landing/Navbar"

export default function StudentDashboardLayout({ children }) {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="mx-auto max-w-6xl px-4 py-6">
                {children}
            </main>
        </div>
    );
}