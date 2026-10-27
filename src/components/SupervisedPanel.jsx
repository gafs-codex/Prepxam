"use client"
import { useState } from "react"
import { toast } from "sonner"
import { RefreshCw, Copy } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useLoader } from "@/lib/useLoader"
import { ensure, safe, notifyError } from "@/lib/net"
import { SectionLoader } from "@/components/ui/Spinner"
import ErrorState from "@/components/ui/ErrorState"

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // no 0/O or 1/I to misread

function newCode() {
    const bytes = new Uint32Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => CHARS[b % CHARS.length]).join("");
}

export default function SupervisedPanel({ exam, onChange }) {
    const [busy, setBusy] = useState(false);

    const { data, error, loading, reload } = useLoader(async () => {
        const { data } = ensure(await supabase.rpc("get_exam_access", { p_exam_id: exam.id }));
        return data;
    }, [exam.id]);

    async function save(on, code, message) {
        setBusy(true);
        const { error: saveError } = await safe(
            supabase.rpc("set_supervised", { p_exam_id: exam.id, p_on: on, p_code: code ?? null }),
            20000
        );
        setBusy(false);

        if (saveError) {
            notifyError(saveError, "Could not save");
            return;
        }
        onChange?.({ ...exam, requires_code: on });
        toast.success(message);
        reload();
    }

    async function copy(code) {
        try {
            await navigator.clipboard.writeText(code);
            toast.success("Copied");
        } catch {
            toast.error("Couldn't copy. Select the code and copy it by hand.");
        }
    }

    if (loading) return <SectionLoader />;
    if (error) return <ErrorState compact title="Couldn't load this setting" message={error} onRetry={reload} />;

    const on = data.supervised;

    return (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="font-medium">Supervised session</h2>
                    <p className="mt-1 text-sm text-muted">
                        On: students need a code that you read out in the exam room before they can start. Off: any approved student can start from anywhere. Switch it off after a supervised session if the exam should stay open for practice.
                    </p>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label="Supervised session"
                    disabled={busy}
                    onClick={() => (on ? save(false, null, "Supervised session is off") : save(true, newCode(), "Supervised session is on"))}
                    className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${on ? "bg-primary" : "bg-gray-300"}`}
                >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
                </button>
            </div>

            {on && (
                <div className="mt-4 rounded-lg border border-border bg-accent/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">Today's code</p>
                    <p className="mt-1 font-mono text-3xl tracking-[0.3em]">{data.code}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => save(true, newCode(), "New code set")}
                            className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm cursor-pointer hover:bg-accent disabled:opacity-60"
                        >
                            <RefreshCw size={14} /> New code
                        </button>
                        <button
                            type="button"
                            onClick={() => copy(data.code)}
                            className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm cursor-pointer hover:bg-accent"
                        >
                            <Copy size={14} /> Copy
                        </button>
                    </div>
                    <p className="mt-3 text-xs text-muted">
                        A new code also clears students who got locked out by wrong tries. Students already in the exam are not affected.
                    </p>
                </div>
            )}
        </div>
    )
}