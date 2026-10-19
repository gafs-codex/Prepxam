"use client"
import { useState } from "react"
import { toast } from "sonner"
import { KeyRound, Copy } from "lucide-react"
import { apiPost } from "@/lib/api"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ResetPasswordButton({ user }) {
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [busy, setBusy] = useState(false)
    const [result, setResult] = useState(null)

    async function reset() {
        setConfirmOpen(false)
        setBusy(true)
        const res = await apiPost("/api/users/password", { userId: user.id })
        setBusy(false)

        if (!res.ok) {
            toast.error(res.error)
            return
        }
        setResult(res)
    }

    async function copy() {
        try {
            await navigator.clipboard.writeText(result.password)
            toast.success("Copied")
        } catch {
            toast.error("Couldn't copy. Select the password and copy it by hand.")
        }
    }

    return (
        <>
            <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmOpen(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-sm font-medium shadow-sm hover:bg-accent cursor-pointer disabled:opacity-50"
            >
                <KeyRound size={14} /> {busy ? "Resetting..." : "Reset password"}
            </button>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset this password?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <span className="font-medium">{user.full_name ?? "This person"}. </span>
                            Their old password stops working and they get a new temporary one that you hand over. They must choose their own at the next login.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={reset} className="cursor-pointer text-white">Reset password</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={result !== null} onOpenChange={(open) => { if (!open) setResult(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>New temporary password</AlertDialogTitle>
                        <AlertDialogDescription>
                            {result?.name} ({result?.identifier}). Write it down or copy it now. It is shown only once.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-accent/40 px-4 py-3">
                        <span className="font-mono text-lg tracking-wider">{result?.password}</span>
                        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary cursor-pointer hover:underline">
                            <Copy size={14} /> Copy
                        </button>
                    </div>
                    <div className="flex justify-end">
                        <AlertDialogAction className="cursor-pointer text-white">Done</AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}