"use client"
import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
    const [busyId, setBusyId] = useState(null);
    // which dialog is open: { type: "publish" | "withdraw" | "delete", exam }
    const [dialog, setDialog] = useState(null);

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

    function updateLocal(id, changes) {
        setExams((prev) => prev.map((e) => (e.id === id ? { ...e, ...changes } : e)));
    }

    // Check first, then open the dialog only if publishing is possible
    function requestPublish(exam, added) {
        if (added < exam.number_of_questions) {
            toast.error(`Add at least ${exam.number_of_questions} questions before publishing (you have ${added}). Use Review to add more.`);
            return;
        }
        setDialog({ type: "publish", exam });
    }

    async function publishExam(exam) {
        setBusyId(exam.id);
        const { data, error } = await supabase
            .from("exams")
            .update({ status: "pending", submitted_at: new Date().toISOString(), review_note: null })
            .eq("id", exam.id)
            .select()
            .single();
        setBusyId(null);

        if (error) {
            toast.error(`Could not publish: ${error.message}`);
            console.error(error);
            return;
        }
        updateLocal(exam.id, data);
        toast.success("Sent for approval");
    }

    async function withdrawExam(exam) {
        setBusyId(exam.id);
        const { data, error } = await supabase
            .from("exams")
            .update({ status: "draft" })
            .eq("id", exam.id)
            .select()
            .single();
        setBusyId(null);

        if (error) {
            toast.error(`Could not withdraw: ${error.message}`);
            console.error(error);
            return;
        }
        updateLocal(exam.id, data);
        toast.success("Exam withdrawn. It's a draft again.");
    }

    async function deleteExam(exam) {
        setBusyId(exam.id);
        const { data, error } = await supabase
            .from("exams")
            .delete()
            .eq("id", exam.id)
            .select();
        setBusyId(null);

        if (error) {
            toast.error(`Could not delete: ${error.message}`);
            return;
        }
        // RLS can block a delete without raising an error, so check a row really went
        if (!data || data.length === 0) {
            toast.error("This exam can't be deleted right now.");
            return;
        }
        setExams((prev) => prev.filter((e) => e.id !== exam.id));
        toast.success("Exam deleted");
    }

    function confirmDialog() {
        if (!dialog) return;
        const { type, exam } = dialog;
        if (type === "publish") publishExam(exam);
        if (type === "withdraw") withdrawExam(exam);
        if (type === "delete") deleteExam(exam);
    }

    const DIALOG_TEXT = {
        publish: {
            title: "Send this exam for approval?",
            description: "The admin will review it. While it is under review you can't edit it or its questions, but you can withdraw it back to draft any time before it is approved.",
            action: "Send for approval",
        },
        withdraw: {
            title: "Withdraw this exam?",
            description: "It goes back to draft and leaves the admin's pending list. You can edit it and send it again later.",
            action: "Withdraw",
        },
        delete: {
            title: "Delete this exam?",
            description: "The exam will be removed. Its questions stay in your question bank. This cannot be undone.",
            action: "Delete",
        },
    };
    const text = dialog ? DIALOG_TEXT[dialog.type] : null;

    const visibleExams = exams.filter((exam) =>
        exam.title.toLowerCase().includes(search.toLowerCase())
    );

    const outlineBtn = "inline-flex items-center justify-center rounded-md border border-input bg-background shadow-sm hover:bg-accent h-9 px-3 text-sm font-medium cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";

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
                        const canWithdraw = exam.status === "pending";
                        const locked = exam.status === "pending" || exam.status === "approved";
                        const busy = busyId === exam.id;

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
                                            onClick={() => requestPublish(exam, added)}
                                            disabled={busy}
                                            className={outlineBtn}
                                        >
                                            {busy ? "Sending..." : exam.status === "rejected" ? "Resubmit" : "Publish"}
                                        </button>
                                    )}

                                    {canWithdraw && (
                                        <button
                                            type="button"
                                            onClick={() => setDialog({ type: "withdraw", exam })}
                                            disabled={busy}
                                            className={outlineBtn}
                                        >
                                            {busy ? "Withdrawing..." : "Withdraw"}
                                        </button>
                                    )}

                                    <Link href={`/Teacher/exams/${exam.id}/review`} className={outlineBtn}>
                                        {locked ? "View" : "Review"}
                                    </Link>

                                    {/* Delete is only offered while the exam is still yours to change */}
                                    {!locked && (
                                        <button
                                            type="button"
                                            onClick={() => setDialog({ type: "delete", exam })}
                                            disabled={busy}
                                            className="inline-flex items-center justify-center rounded-md border border-input bg-background shadow-sm hover:bg-accent h-9 w-9 cursor-pointer disabled:opacity-60"
                                        >
                                            <Trash2 className="h-4 w-4" color="red" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* One dialog for all three actions */}
            <AlertDialog
                open={dialog !== null}
                onOpenChange={(open) => { if (!open) setDialog(null); }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{text?.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {dialog && <span className="font-medium block">{dialog.exam.title}. </span>}
                            {text?.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {/* <AlertDialogFooter> */}
                    <div className="flex justify-end gap-2 mt-2">
                        <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDialog}
                            className={`cursor-pointer text-white ${dialog?.type === "delete" ? "bg-red-600 hover:bg-red-700" : ""}`}
                        >
                            {text?.action}
                        </AlertDialogAction>
                    </div>
                    {/* </AlertDialogFooter> */}
                </AlertDialogContent>
            </AlertDialog>
        </main>
    )
}