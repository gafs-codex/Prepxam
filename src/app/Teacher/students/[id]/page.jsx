"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { PageLoader } from "@/components/ui/Spinner"

function formatDate(value) {
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function duration(r) {
    const secs = Math.max(0, Math.round((new Date(r.submitted_at) - new Date(r.started_at)) / 1000));
    const m = Math.floor(secs / 60);
    return m > 0 ? `${m}m ${secs % 60}s` : `${secs}s`;
}

export default function TeacherStudentDetail() {
    const { id } = useParams();
    const [student, setStudent] = useState(null);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const [studentsRes, resultsRes] = await Promise.all([
                supabase.rpc("teacher_students"),
                supabase.rpc("teacher_student_results", { p_student_id: id }),
            ]);

            if (studentsRes.error || resultsRes.error) {
                toast.error((studentsRes.error ?? resultsRes.error).message);
            }
            setStudent((studentsRes.data ?? []).find((s) => s.student_id === id) ?? null);
            setResults(resultsRes.data ?? []);
            setLoading(false);
        }
        load();
    }, [id]);

    if (loading) return <PageLoader />;

    if (!student) {
        return (
            <main className="mx-auto max-w-2xl px-4 py-12 text-center">
                <p>This student isn't in your subjects.</p>
                <Link href="/Teacher/students" className="mt-4 inline-block text-primary hover:underline">Back to students</Link>
            </main>
        );
    }

    const percents = results.map((r) => r.percent);
    const average = percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : null;
    const best = percents.length ? Math.max(...percents) : null;
    const passed = results.filter((r) => r.percent >= r.pass_mark).length;

    const cards = [
        { label: "Exams taken", value: results.length },
        { label: "Average score", value: average === null ? "—" : `${average}%` },
        { label: "Best score", value: best === null ? "—" : `${best}%` },
        { label: "Passed", value: results.length ? `${passed} of ${results.length}` : "—" },
    ];

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <Link href="/Teacher/students" className="text-sm text-muted">← Students</Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{student.full_name ?? "Unnamed"}</h1>
            <p className="mt-1 text-sm text-muted">{student.email ?? "No email"} · joined {formatDate(student.created_at)}</p>
            <div className="mt-3 flex flex-wrap gap-1">
                {(student.shared_subjects ?? []).map((name) => (
                    <span key={name} className="rounded-full bg-accent px-2.5 py-0.5 text-xs">{name}</span>
                ))}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((c) => (
                    <div key={c.label} className="rounded-xl border border-border bg-card p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted">{c.label}</p>
                        <p className="mt-1 text-2xl font-semibold">{c.value}</p>
                    </div>
                ))}
            </div>

            <h2 className="mt-10 text-lg font-semibold">Results on your exams</h2>

            {results.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-border bg-white p-10 text-center text-sm text-muted">
                    No released results yet. Results appear here after the school releases an exam.
                </p>
            ) : (
                <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-accent/30 text-left text-muted">
                                <th className="p-4 font-medium">Exam</th>
                                <th className="p-4 font-medium">Date taken</th>
                                <th className="p-4 font-medium">Score</th>
                                <th className="p-4 font-medium">Percent</th>
                                <th className="p-4 font-medium">Result</th>
                                <th className="p-4 font-medium">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r) => {
                                const pass = r.percent >= r.pass_mark;
                                return (
                                    <tr key={r.attempt_id} className="border-b border-border last:border-0">
                                        <td className="p-4">
                                            <p className="font-medium">{r.title}</p>
                                            <p className="text-xs text-muted">{r.subject} · {r.exam_type}</p>
                                        </td>
                                        <td className="p-4">{formatDate(r.submitted_at)}</td>
                                        <td className="p-4">{r.score}/{r.total}</td>
                                        <td className="p-4">{r.percent}%</td>
                                        <td className="p-4">
                                            <span className={pass ? "font-medium text-green-600" : "font-medium text-red-600"}>
                                                {pass ? "Passed" : "Failed"}
                                            </span>
                                        </td>
                                        <td className="p-4">{duration(r)}</td>
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