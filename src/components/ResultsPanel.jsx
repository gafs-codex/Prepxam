"use client"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { friendlyMessage, notifyError, safe } from "@/lib/net"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import ExportResultsButton from "@/components/ExportResultsButton"

export default function ResultsPanel({ exam, onChange }) {
    const [progress, setProgress] = useState(null);
    const [progressError, setProgressError] = useState(null);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    async function loadProgress() {
        setProgressError(null);
        const { data, error } = await safe(supabase.rpc("exam_progress", { p_exam_id: exam.id }));
        if (error) {
            console.error(error);
            setProgressError(friendlyMessage(error));
            return;
        }
        setProgress(data);
    }

    useEffect(() => { loadProgress(); /* eslint-disable-next-line */ }, [exam.id]);

    async function toggleImmediate(checked) {
        const { data, error } = await safe(
            supabase
                .from("exams")
                .update({ results_visibility: checked ? "immediate" : "after_release" })
                .eq("id", exam.id)
                .select()
                .single(),
            20000
        );
        if (error) {
            notifyError(error, "Could not change the setting");
            return;
        }
        onChange(data);
    }

    async function release() {
        setBusy(true);
        const { error } = await safe(supabase.rpc("release_results", { p_exam_id: exam.id }), 30000);

        if (error) {
            setBusy(false);
            notifyError(error, "Results were not released");
            return;
        }

        // the release worked. If we can't re-read the exam, update it here.
        const { data } = await safe(supabase.from("exams").select("*").eq("id", exam.id).single());
        onChange(data ?? { ...exam, results_released: true });

        await loadProgress();
        setBusy(false);
        toast.success("Results released");
    }

    const waiting = progress ? progress.in_progress + progress.not_started : 0;

    return (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
            
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-medium">Results</h2>
                <ExportResultsButton exam={exam} />
            </div>

            {progress && (
                <p className="mt-2 text-sm text-muted">
                    {progress.submitted} of {progress.students} students have submitted
                    · {progress.in_progress} in progress · {progress.not_started} not started
                </p>
            )}

            {progressError && (
                <p className="mt-2 text-sm text-red-600">
                    Couldn't check student progress: {progressError}{" "}
                    <button type="button" onClick={loadProgress} className="font-medium underline cursor-pointer">
                        Try again
                    </button>
                </p>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-4">
                    <span>
                        <span className="block font-medium">Show students their score immediately</span>
                        <span className="block text-sm text-muted">Off: students wait until results are released.</span>
                    </span>
                    <input
                        type="checkbox"
                        checked={exam.results_visibility === "immediate"}
                        disabled={exam.results_released}
                        onChange={(e) => toggleImmediate(e.target.checked)}
                        className="h-5 w-5 cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
                    />
                </label>

                <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-4">
                    <span>
                        <span className="block font-medium">Results released</span>
                        <span className="block text-sm text-muted">
                            {exam.results_released
                                ? "Released. Teachers and students can see the results."
                                : "Releases to the teacher and students, and closes the exam."}
                        </span>
                    </span>
                    {exam.results_released ? (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800">Released</span>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setOpen(true)}
                            disabled={busy || !progress}
                            className="h-9 shrink-0 rounded-md bg-primary px-4 text-sm font-medium text-white cursor-pointer disabled:opacity-60"
                        >
                            {busy ? "Releasing..." : "Release"}
                        </button>
                    )}
                </div>
            </div>

            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Release results for this exam?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {waiting > 0
                                ? `${waiting} student${waiting === 1 ? " hasn't" : "s haven't"} finished yet. After you release, nobody can start this exam, and anyone still sitting it will see their result as soon as they submit. `
                                : "Every student has finished. "}
                            The teacher will be able to see all results. This can't be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={release} className="cursor-pointer text-white">
                            Release results
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}