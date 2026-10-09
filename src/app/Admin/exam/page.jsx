"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { findExamProblems } from "@/lib/examChecks"

const FILTERS = ["pending", "approved", "rejected", "draft", "all"];

const STATUS_STYLES = {
    draft: { label: "Draft", className: "bg-accent" },
    pending: { label: "Pending approval", className: "bg-yellow-100 text-yellow-800" },
    approved: { label: "Published", className: "bg-green-100 text-green-800" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
};

export default function AdminExams() {
    const [exams, setExams] = useState([]);
    const [teachers, setTeachers] = useState({});
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("pending");
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const [editDuration, setEditDuration] = useState("");

    useEffect(() => {
        async function load() {
            const { data, error } = await supabase
                .from("exams")
                .select("*, exam_questions(position, questions(*))")
                .order("created_at", { ascending: false });

            if (error) {
                toast.error(`Could not load exams: ${error.message}`);
                console.error(error);
                setLoading(false);
                return;
            }
            setExams(data);

            // exams.created_by points to auth users, so fetch teacher names separately
            const ids = [...new Set(data.map((e) => e.created_by).filter(Boolean))];
            if (ids.length > 0) {
                const { data: profiles } = await supabase
                    .from("profiles").select("id, full_name").in("id", ids);
                setTeachers(Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name])));
            }
            setLoading(false);
        }
        load();
    }, []);

    function startEdit(exam) {
        setEditingId(exam.id);
        setEditTitle(exam.title);
        setEditDuration(String(exam.duration_minutes));
    }

    async function saveEdit(exam) {
        const duration = Number(editDuration);
        if (editTitle.trim() === "") {
            toast.error("Title cannot be empty");
            return;
        }
        if (!Number.isInteger(duration) || duration < 1) {
            toast.error("Duration must be a whole number of at least 1 minute");
            return;
        }

        const { error } = await supabase
            .from("exams")
            .update({ title: editTitle.trim(), duration_minutes: duration })
            .eq("id", exam.id);

        if (error) {
            toast.error(`Could not save: ${error.message}`);
            return;
        }
        setExams((prev) => prev.map((e) =>
            e.id === exam.id ? { ...e, title: editTitle.trim(), duration_minutes: duration } : e
        ));
        setEditingId(null);
        toast.success("Exam updated");
    }

    const visible = exams.filter((e) =>
        (filter === "all" || e.status === filter) &&
        e.title.toLowerCase().includes(search.toLowerCase())
    );

    const input = "h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none";
    const outlineBtn = "inline-flex items-center justify-center rounded-md border border-input bg-background shadow-sm hover:bg-accent h-9 px-3 text-sm font-medium cursor-pointer";

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <h1 className="text-2xl font-semibold tracking-tight">All exams</h1>
            <p className="mt-1 text-sm text-muted">{exams.length} exams in total</p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search exams"
                    className={`${input} w-full max-w-sm`}
                />
                <div className="flex flex-wrap gap-2">
                    {FILTERS.map((f) => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => setFilter(f)}
                            className={`inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer shadow h-8 rounded-md px-3 text-xs capitalize ${filter === f ? "border-primary bg-primary text-white" : "border-border hover:bg-accent"}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-6 space-y-3">
                {loading ? (
                    <p className="text-sm text-muted">Loading exams...</p>
                ) : visible.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted bg-white">
                        No exams here.
                    </p>
                ) : (
                    visible.map((exam) => {
                        const questions = (exam.exam_questions ?? [])
                            .sort((a, b) => a.position - b.position)
                            .map((l) => l.questions)
                            .filter(Boolean);
                        const problems = findExamProblems(exam, questions);
                        const status = STATUS_STYLES[exam.status] ?? STATUS_STYLES.draft;
                        const editing = editingId === exam.id;

                        return (
                            <div key={exam.id} className="rounded-xl border border-border bg-card p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="flex-1">
                                        {editing ? (
                                            <div className="flex flex-wrap items-center gap-2">
                                                <input
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    className={`${input} min-w-[16rem]`}
                                                />
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={editDuration}
                                                    onChange={(e) => setEditDuration(e.target.value)}
                                                    className={`${input} w-24`}
                                                />
                                                <span className="text-sm text-muted">min</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="text-lg font-medium">{exam.title}</h2>
                                                <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs">{exam.exam_type}</span>
                                                <span className={`rounded-full px-2.5 py-0.5 text-xs ${status.className}`}>{status.label}</span>
                                                {problems.length > 0 && (
                                                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs text-red-800">
                                                        {problems.length} {problems.length === 1 ? "problem" : "problems"}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <p className="mt-1 text-sm text-muted">
                                            {teachers[exam.created_by] ?? "Unknown teacher"} · {exam.subject} · {questions.length} of {exam.number_of_questions} questions · {exam.duration_minutes} min
                                            {exam.submitted_at && ` · submitted ${new Date(exam.submitted_at).toLocaleDateString()}`}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {editing ? (
                                            <>
                                                <button type="button" onClick={() => saveEdit(exam)} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-white cursor-pointer">
                                                    Save
                                                </button>
                                                <button type="button" onClick={() => setEditingId(null)} className={outlineBtn}>
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                {exam.status !== "approved" && (
                                                    <button type="button" onClick={() => startEdit(exam)} className={outlineBtn}>
                                                        Edit title / time
                                                    </button>
                                                )}
                                                <Link href={`/Admin/exams/${exam.id}`} className={outlineBtn}>
                                                    {exam.status === "approved" ? "View" : "Review"}
                                                </Link>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </main>
    )
}