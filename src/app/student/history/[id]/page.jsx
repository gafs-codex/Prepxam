"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { PageLoader } from "@/components/ui/Spinner"

export default function ResultPage() {
    const { id } = useParams();
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const { data, error } = await supabase.rpc("get_result", { p_attempt_id: id });
            if (error) toast.error(error.message);
            else setResult(data);
            setLoading(false);
        }
        load();
    }, [id]);

    if (loading) return <PageLoader />;

    if (!result) {
        return (
            <main className="mx-auto max-w-2xl px-4 py-12 text-center">
                <p>We couldn't find this result.</p>
                <Link href="/student/history" className="mt-4 inline-block text-primary hover:underline">Back to history</Link>
            </main>
        );
    }

    const buttons = (
        <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/student/dashboard" className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-white hover:bg-primary/90">
                Back to dashboard
            </Link>
            <Link href="/student/history" className="inline-flex h-10 items-center rounded-md border border-input bg-card px-5 text-sm font-medium hover:bg-accent/40">
                View history
            </Link>
        </div>
    );

    if (!result.submitted) {
        return (
            <main className="mx-auto max-w-2xl px-4 py-12 text-center">
                <h1 className="text-2xl font-semibold">{result.title}</h1>
                <p className="mt-3 text-muted">This exam is still in progress.</p>
                <Link href={`/student/exams/${result.exam_id}`} className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-white">
                    Resume exam
                </Link>
            </main>
        );
    }

    if (!result.visible) {
        return (
            <main className="mx-auto max-w-2xl px-4 py-12 text-center">
                <div className="rounded-xl border border-border bg-card p-8">
                    <h1 className="text-2xl font-semibold tracking-tight">Exam submitted</h1>
                    <p className="mt-1 text-sm text-muted">{result.title} · {result.subject}</p>
                    <p className="mt-6 text-muted">
                        Your answers are saved. Your results will appear here once the school releases them.
                    </p>
                    {buttons}
                </div>
            </main>
        );
    }

    const stats = [
        { label: "Correct", value: result.correct, color: "text-green-600" },
        { label: "Wrong", value: result.wrong, color: "text-red-600" },
        { label: "Unanswered", value: result.unanswered, color: "text-yellow-700" },
        { label: "Answered", value: result.answered, color: "" },
        { label: "Total questions", value: result.total, color: "" },
    ];

    return (
        <main className="mx-auto max-w-3xl px-4 py-12">
            <div className="rounded-xl border border-border bg-card p-8 text-center">
                <p className="text-sm text-muted">{result.title} · {result.subject}</p>
                <p className="mt-4 text-6xl font-semibold tracking-tight">{result.percent}%</p>
                <p className={`mt-2 text-lg font-medium ${result.passed ? "text-green-600" : "text-red-600"}`}>
                    {result.passed ? "Passed" : "Failed"}
                    <span className="ml-2 text-sm font-normal text-muted">(pass mark {result.pass_mark}%)</span>
                </p>

                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {stats.map((s) => (
                        <div key={s.label} className="rounded-lg border border-border p-3">
                            <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
                            <p className="mt-1 text-xs text-muted">{s.label}</p>
                        </div>
                    ))}
                </div>

                {buttons}
            </div>
        </main>
    )
}