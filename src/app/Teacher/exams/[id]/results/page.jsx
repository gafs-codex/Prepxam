"use client"
import Link from "next/link"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { PageLoader } from "@/components/ui/Spinner"
import ErrorState from "@/components/ui/ErrorState"
import ExportResultsButton from "@/components/ExportResultsButton"
import { useLoader } from "@/lib/useLoader"
import { ensure } from "@/lib/net"

const BANDS = [
    { label: "0–19%", min: 0, max: 19 },
    { label: "20–39%", min: 20, max: 39 },
    { label: "40–59%", min: 40, max: 59 },
    { label: "60–79%", min: 60, max: 79 },
    { label: "80–100%", min: 80, max: 100 },
];

export default function ExamResults() {
    const { id } = useParams();

    const { data, error, loading, reload } = useLoader(async () => {
        const examRes = ensure(await supabase.from("exams").select("*").eq("id", id).maybeSingle());
        if (!examRes.data) return { exam: null, rows: [] };
        if (!examRes.data.results_released) return { exam: examRes.data, rows: [] };

        const { data: rows } = ensure(await supabase.rpc("exam_results", { p_exam_id: id }));
        return { exam: examRes.data, rows: rows ?? [] };
    }, [id]);

    if (loading) return <PageLoader />;
    if (error) return <ErrorState message={error} onRetry={reload} />;

    const { exam, rows } = data;

    if (!exam) {
        return (
            <main className="mx-auto max-w-2xl px-4 py-12 text-center">
                <p>This exam doesn't exist or isn't yours.</p>
                <Link href="/Teacher/exams" className="mt-4 inline-block text-primary hover:underline">Back to my exams</Link>
            </main>
        );
    }

    if (!exam.results_released) {
        return (
            <main className="mx-auto max-w-2xl px-4 py-12 text-center">
                <h1 className="text-xl font-semibold">{exam.title}</h1>
                <p className="mt-3 text-muted">Results appear here after the school releases them.</p>
                <Link href="/Teacher/exams" className="mt-4 inline-block text-primary hover:underline">Back to my exams</Link>
            </main>
        );
    }

    const submitted = rows.filter((r) => r.status === "Submitted");
    const percents = submitted.map((r) => r.percent ?? 0);
    const average = percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : null;
    const passed = submitted.filter((r) => r.passed).length;

    const stats = [
        { label: "Submitted", value: `${submitted.length} of ${rows.length}` },
        { label: "Average", value: average === null ? "—" : `${average}%` },
        { label: "Highest", value: percents.length ? `${Math.max(...percents)}%` : "—" },
        { label: "Lowest", value: percents.length ? `${Math.min(...percents)}%` : "—" },
        { label: "Pass rate", value: submitted.length ? `${Math.round((passed / submitted.length) * 100)}%` : "—" },
    ];

    const counts = BANDS.map((b) => percents.filter((p) => p >= b.min && p <= b.max).length);
    const most = Math.max(...counts, 1);

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <Link href="/Teacher/exams" className="text-sm text-muted">← My exams</Link>
            <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">{exam.title}</h1>
                    <p className="mt-1 text-sm text-muted">{exam.subject} · {exam.exam_type} · pass mark {exam.pass_mark}%</p>
                </div>
                <ExportResultsButton exam={exam} />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {stats.map((s) => (
                    <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted">{s.label}</p>
                        <p className="mt-1 text-2xl font-semibold">{s.value}</p>
                    </div>
                ))}
            </div>

            <section className="mt-8 rounded-xl border border-border bg-card p-5">
                <h2 className="font-semibold">Score distribution</h2>
                <div className="mt-4 space-y-3">
                    {BANDS.map((b, i) => (
                        <div key={b.label} className="flex items-center gap-3 text-sm">
                            <span className="w-20 shrink-0 text-muted">{b.label}</span>
                            <div className="h-6 flex-1 overflow-hidden rounded bg-accent/40">
                                <div className="h-full bg-primary" style={{ width: `${(counts[i] / most) * 100}%` }} />
                            </div>
                            <span className="w-8 text-right font-medium">{counts[i]}</span>
                        </div>
                    ))}
                </div>
            </section>

            <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-accent/30 text-left text-muted">
                            <th className="p-4 font-medium">Student</th>
                            <th className="p-4 font-medium">Admission no. / email</th>
                            <th className="p-4 font-medium">Status</th>
                            <th className="p-4 font-medium">Score</th>
                            <th className="p-4 font-medium">Percent</th>
                            <th className="p-4 font-medium">Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.student_id} className="border-b border-border last:border-0">
                                <td className="p-4 font-medium">{r.full_name}</td>
                                <td className="p-4 text-muted">{r.identifier ?? "—"}</td>
                                <td className="p-4">{r.status}</td>
                                <td className="p-4">{r.score === null ? "—" : `${r.score}/${r.total}`}</td>
                                <td className="p-4">{r.percent === null ? "—" : `${r.percent}%`}</td>
                                <td className="p-4">
                                    {r.passed === null ? "—" : (
                                        <span className={r.passed ? "font-medium text-green-600" : "font-medium text-red-600"}>
                                            {r.passed ? "Passed" : "Failed"}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </main>
    )
}