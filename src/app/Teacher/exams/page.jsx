"use client"
import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const STATUS_STYLES = {
    draft: { label: "Draft", className: "bg-accent" },
    pending: { label: "Pending approval", className: "bg-yellow-100 text-yellow-800" },
    approved: { label: "Published", className: "bg-green-100 text-green-800" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
};

export default function TeacherExam() {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [publishingId, setPublishingId] = useState(null);

    useEffect(() => {
        async function loadExams() {
            const { data, error } = await supabase
                .from("exams")
                .select("*, exam_questions(count)")
                .order("created_at", { ascending: false });

            if (error) {
                toast.error(`Could not load exams: ${error.message}`);
                console.error(error);
            } else {
                setExams(data);
            }
            setLoading(false);
        }
        loadExams();
    }, []);

    async function publishExam(exam, added) {
        if (added < exam.number_of_questions) {
            toast.error(`Add at least ${exam.number_of_questions} questions before publishing (you have ${added}). Use Review to add more.`);
            return;
        }

        if (!window.confirm("Send this exam to the admin for approval? You won't be able to edit it while it's under review.")) return;

        setPublishingId(exam.id);

        const { data, error } = await supabase
            .from("exams")
            .update({ status: "pending", submitted_at: new Date().toISOString(), review_note: null })
            .eq("id", exam.id)
            .select()
            .single();

        setPublishingId(null);

        if (error) {
            toast.error(`Could not publish: ${error.message}`);
            console.error(error);
            return;
        }

        setExams((prev) => prev.map((e) => (e.id === exam.id ? { ...e, ...data } : e)));
        toast.success("Sent for approval");
    }

    async function deleteExam(id) {
        if (!window.confirm("Delete this exam? The questions stay in your question bank.")) return;

        const { error } = await supabase.from("exams").delete().eq("id", id);
        if (error) {
            toast.error(`Could not delete: ${error.message}`);
            return;
        }
        setExams((prev) => prev.filter((exam) => exam.id !== id));
        toast.success("Exam deleted");
    }

    const visibleExams = exams.filter((exam) =>
        exam.title.toLowerCase().includes(search.toLowerCase())
    );

    const outlineBtn = "inline-flex items-center justify-center rounded-md border border-input bg-background shadow-sm hover:bg-accent h-9 px-3 text-sm font-medium";

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">My exams</h1>
                    <p className="mt-1 text-sm text-muted">
                        {exams.length} {exams.length === 1 ? "exam" : "exams"}
                    </p>
                </div>

                <Link href={`/Teacher/exams/create`} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer bg-primary text-white shadow hover:bg-primary/90 h-9 px-4 py-2">
                    <Plus />
                    New exam
                </Link>
            </div>

            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm md:text-sm mt-6 max-w-sm placeholder:text-muted outline-none"
                placeholder="Search exams"
            />

            <div className="mt-6 space-y-3">
                {loading ? (
                    <p className="text-sm text-muted">Loading exams...</p>
                ) : visibleExams.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted bg-white">
                        {exams.length === 0 ? "No exams yet." : "No exams match your search."}
                    </p>
                ) : (
                    visibleExams.map((exam) => {
                        const added = exam.exam_questions?.[0]?.count ?? 0;
                        const status = STATUS_STYLES[exam.status] ?? STATUS_STYLES.draft;
                        const canPublish = exam.status === "draft" || exam.status === "rejected";
                        const locked = exam.status === "pending" || exam.status === "approved";

                        return (
                            <div
                                key={exam.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5"
                            >
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-lg font-medium">{exam.title}</h2>
                                        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs">
                                            {exam.exam_type}
                                        </span>
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs ${status.className}`}>
                                            {status.label}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-muted">
                                        {exam.subject} · {added} of {exam.number_of_questions} questions · {exam.duration_minutes} min · created {new Date(exam.created_at).toLocaleDateString()}
                                    </p>
                                    {exam.status === "rejected" && exam.review_note && (
                                        <p className="mt-1 text-sm text-red-600">
                                            Admin note: {exam.review_note}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    {canPublish && (
                                        <button
                                            type="button"
                                            onClick={() => publishExam(exam, added)}
                                            disabled={publishingId === exam.id}
                                            className={`${outlineBtn} cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
                                        >
                                            {publishingId === exam.id
                                                ? "Sending..."
                                                : exam.status === "rejected" ? "Resubmit" : "Publish"}
                                        </button>
                                    )}

                                    <Link href={`/Teacher/exams/${exam.id}/review`} className={outlineBtn}>
                                        {locked ? "View" : "Review"}
                                    </Link>

                                    <button
                                        type="button"
                                        onClick={() => deleteExam(exam.id)}
                                        className={`${outlineBtn} cursor-pointer`}
                                    >
                                        <Trash2 className="h-4 w-4" color="red" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </main>
    )
}