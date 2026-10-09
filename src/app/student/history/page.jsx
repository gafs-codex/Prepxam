"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { PageLoader } from "@/components/ui/Spinner"

function duration(a) {
    if (!a.submitted_at) return "—";
    const secs = Math.max(0, Math.round((new Date(a.submitted_at) - new Date(a.started_at)) / 1000));
    const m = Math.floor(secs / 60);
    return m > 0 ? `${m}m ${secs % 60}s` : `${secs}s`;
}

export default function HistoryPage() {
    const [attempts, setAttempts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const { data, error } = await supabase.rpc("my_attempts");
            if (error) {
                toast.error(`Could not load history: ${error.message}`);
            } else {
                setAttempts(data ?? []);
            }
            setLoading(false);
        }
        load();
    }, []);

    if (loading) return <PageLoader />;

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <h1 className="text-2xl font-semibold tracking-tight">Exam history</h1>
            <p className="mt-1 text-sm text-muted">
                {attempts.length} {attempts.length === 1 ? "attempt" : "attempts"} recorded.
            </p>

            {attempts.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-border p-10 text-center bg-white">
                    <p className="text-sm text-muted">You haven't taken any exams yet.</p>
                    <Link href="/student/exams" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer bg-primary text-white shadow hover:bg-primary/90 h-9 px-4 py-2 mt-4">
                        Browse exams
                    </Link>
                </div>
            ) : (
                <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-muted">
                                <th className="p-4 font-medium">Exam</th>
                                <th className="p-4 font-medium">Date taken</th>
                                <th className="p-4 font-medium">Score</th>
                                <th className="p-4 font-medium">Result</th>
                                <th className="p-4 font-medium">Time</th>
                                <th className="p-4 text-right font-medium">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attempts.map((a) => {
                                const inProgress = !a.submitted_at;
                                const percent = a.score_visible && a.total > 0
                                    ? Math.round((a.score / a.total) * 100) : null;
                                const passed = percent !== null && percent >= a.pass_mark;

                                return (
                                    <tr key={a.attempt_id} className="border-b border-border last:border-0">
                                        <td className="p-4">
                                            <p className="font-medium">{a.title}</p>
                                            <p className="text-xs text-muted">{a.subject} · {a.exam_type}</p>
                                        </td>
                                        <td className="p-4">{new Date(a.started_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</td>
                                        <td className="p-4">{percent !== null ? `${percent}%` : "—"}</td>
                                        <td className="p-4">
                                            {inProgress ? (
                                                <span className="text-yellow-700">In progress</span>
                                            ) : percent === null ? (
                                                <span className="text-muted">Awaiting release</span>
                                            ) : passed ? (
                                                <span className="font-medium text-green-600">Passed</span>
                                            ) : (
                                                <span className="font-medium text-red-600">Failed</span>
                                            )}
                                        </td>
                                        <td className="p-4">{duration(a)}</td>
                                        <td className="p-4 text-right">
                                            {inProgress ? (
                                                <Link href={`/student/exams/${a.exam_id}`} className="font-medium text-primary hover:underline">Resume</Link>
                                            ) : (
                                                <Link href={`/student/history/${a.attempt_id}`} className="font-medium text-primary hover:underline">View results</Link>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    )
}