"use client"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ResultsPanel({ exam, onChange }) {
    const [progress, setProgress] = useState(null);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    async function loadProgress() {
        const { data, error } = await supabase.rpc("exam_progress", { p_exam_id: exam.id });
        if (error) toast.error(`Could not load progress: ${error.message}`);
        else setProgress(data);
    }

    useEffect(() => { loadProgress(); /* eslint-disable-next-line */ }, [exam.id]);

    async function toggleImmediate(checked) {
        const { data, error } = await supabase
            .from("exams")
            .update({ results_visibility: checked ? "immediate" : "after_release" })
            .eq("id", exam.id).select().single();
        if (error) { toast.error(error.message); return; }
        onChange(data);
    }

    async function release() {
        setBusy(true);
        const { error } = await supabase.rpc("release_results", { p_exam_id: exam.id });
        if (error) { setBusy(false); toast.error(error.message); return; }
        const { data } = await supabase.from("exams").select("*").eq("id", exam.id).single();
        if (data) onChange(data);
        await loadProgress();
        setBusy(false);
        toast.success("Results released");
    }

    const waiting = progress ? progress.in_progress + progress.not_started : 0;

    return (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <h2 className="font-medium">Results</h2>

            {progress && (
                <p className="mt-2 text-sm text-muted">
                    {progress.submitted} of {progress.students} students have submitted
                    · {progress.in_progress} in progress · {progress.not_started} not started
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
                            Release
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