"use client"
import { useState } from "react"
import { Download } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { safe, notifyError } from "@/lib/net"
import { toCsv, downloadCsv } from "@/lib/csv"

const slug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "exam";
const when = (value) => (value ? new Date(value).toLocaleString() : "");

export default function ExportResultsButton({ exam }) {
    const [busy, setBusy] = useState(false);

    async function exportCsv() {
        setBusy(true);
        const { data, error } = await safe(supabase.rpc("exam_results", { p_exam_id: exam.id }), 30000);
        setBusy(false);

        if (error) {
            notifyError(error, "Could not export");
            return;
        }
        if (!data || data.length === 0) {
            toast.error("There are no students to export yet.");
            return;
        }

        const csv = toCsv(
            ["Name", "Admission number / email", "Status", "Score", "Total questions", "Percent", "Result", "Started", "Submitted"],
            data.map((r) => [
                r.full_name, r.identifier, r.status, r.score, r.total,
                r.percent === null ? "" : `${r.percent}%`,
                r.passed === null ? "" : r.passed ? "Passed" : "Failed",
                when(r.started_at), when(r.submitted_at),
            ])
        );
        downloadCsv(`${slug(exam.title)}-results-${new Date().toISOString().slice(0, 10)}.csv`, csv);
        toast.success("Results exported");
    }

    return (
        <button
            type="button"
            onClick={exportCsv}
            disabled={busy}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm cursor-pointer hover:bg-accent disabled:opacity-60"
        >
            <Download size={16} /> {busy ? "Exporting..." : "Export CSV"}
        </button>
    )
}