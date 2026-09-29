import Link from "next/link"
export default function HistoryPage() {
    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <h1 className="text-2xl font-semibold tracking-tight">Exam history</h1>
            <p className="mt-1 text-sm text-muted">0 attempts recorded.</p>

            <div className="mt-6 rounded-xl border border-dashed border-border p-10 text-center bg-white">
                <p className="text-sm text-muted">You haven't taken any exams yet.</p>

                <Link href={`/student/exams`} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer bg-primary text-white shadow hover:bg-primary/90 h-9 px-4 py-2 mt-4">
                    Browse exams
                </Link>
            </div>
        </main>
    )
}