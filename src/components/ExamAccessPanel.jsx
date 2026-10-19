"use client"
import { useState } from "react"
import { toast } from "sonner"
import { RefreshCw, Trash2, Wifi } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useLoader } from "@/lib/useLoader"
import { ensure, safe, notifyError } from "@/lib/net"
import { SectionLoader } from "@/components/ui/Spinner"
import ErrorState from "@/components/ui/ErrorState"

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newCode() {
    const bytes = new Uint32Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

export default function ExamAccessPanel({ exam, onChange }) {
    const [busy, setBusy] = useState(false);
    const [label, setLabel] = useState("School network");

    const { data, error, loading, reload } = useLoader(async () => {
        const [access, networks] = await Promise.all([
            supabase.rpc("get_exam_access", { p_exam_id: exam.id }),
            supabase.rpc("list_allowed_networks"),
        ]);
        ensure(access);
        ensure(networks);
        return { access: access.data, networks: networks.data ?? [] };
    }, [exam.id]);

    async function save(networkOnly, code, message) {
        setBusy(true);
        const { error: saveError } = await safe(
            supabase.rpc("set_exam_access", { p_exam_id: exam.id, p_network_only: networkOnly, p_code: code ?? "" }),
            20000
        );
        setBusy(false);

        if (saveError) {
            notifyError(saveError, "Could not save");
            return;
        }
        onChange?.({ ...exam, network_only: networkOnly, requires_code: Boolean(code) });
        toast.success(message);
        reload();
    }

    async function addCurrentNetwork() {
        setBusy(true);
        const { data: info, error: ipError } = await safe(supabase.rpc("my_ip"));
        if (ipError || !info?.ip) {
            setBusy(false);
            if (ipError) notifyError(ipError, "Couldn't detect this network");
            else toast.error("Couldn't detect this network's address.");
            return;
        }

        const { error: addError } = await safe(
            supabase.rpc("add_allowed_network", { p_cidr: info.ip, p_label: label })
        );
        setBusy(false);

        if (addError) {
            notifyError(addError, "Could not add the network");
            return;
        }
        toast.success(`Added ${info.ip}`);
        reload();
    }

    async function removeNetwork(id) {
        setBusy(true);
        const { error: removeError } = await safe(supabase.rpc("remove_allowed_network", { p_id: id }));
        setBusy(false);
        if (removeError) {
            notifyError(removeError, "Could not remove it");
            return;
        }
        reload();
    }

    if (loading) return <SectionLoader />;
    if (error) return <ErrorState compact title="Couldn't load access settings" message={error} onRetry={reload} />;

    const { access, networks } = data;
    const code = access.code;
    const noNetworks = networks.length === 0;

    return (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <h2 className="font-medium">Who can start this exam</h2>
            <p className="mt-1 text-sm text-muted">Applies to students starting the exam. Teachers and admins are not affected.</p>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-border p-4">
                    <p className="font-medium">Exam code</p>
                    <p className="mt-1 text-sm text-muted">
                        Write it on the board when the exam begins. A new code clears students who got locked out by wrong tries.
                    </p>

                    <p className="mt-3 font-mono text-2xl tracking-[0.3em]">{code ?? "none"}</p>

                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => save(access.network_only, newCode(), "New code set")}
                            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-white cursor-pointer disabled:opacity-60"
                        >
                            <RefreshCw size={14} /> {code ? "New code" : "Generate a code"}
                        </button>
                        {code && (
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => save(access.network_only, "", "Code removed")}
                                className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm cursor-pointer hover:bg-accent disabled:opacity-60"
                            >
                                Remove code
                            </button>
                        )}
                    </div>
                </div>

                <div className="rounded-lg border border-border p-4">
                    <label className="flex items-start justify-between gap-3">
                        <span>
                            <span className="block font-medium">School network only</span>
                            <span className="block text-sm text-muted">
                                Students can only start and answer from the saved networks below.
                            </span>
                        </span>
                        <input
                            type="checkbox"
                            checked={access.network_only}
                            disabled={busy || (noNetworks && !access.network_only)}
                            onChange={(e) => save(e.target.checked, code, e.target.checked ? "School network only is on" : "School network only is off")}
                            className="mt-1 h-5 w-5 cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
                        />
                    </label>

                    {noNetworks && (
                        <p className="mt-2 text-sm text-yellow-800">Save a network first, or every student would be blocked.</p>
                    )}

                    <ul className="mt-3 space-y-2">
                        {networks.map((n) => (
                            <li key={n.id} className="flex items-center justify-between gap-3 rounded-md bg-accent/40 px-3 py-2 text-sm">
                                <span><span className="font-mono">{n.cidr}</span>{n.label ? ` · ${n.label}` : ""}</span>
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => removeNetwork(n.id)}
                                    aria-label="Remove network"
                                    className="text-red-600 cursor-pointer disabled:opacity-50"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-3 flex flex-wrap gap-2">
                        <input
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="Label"
                            className="h-9 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 text-sm outline-none"
                        />
                        <button
                            type="button"
                            disabled={busy}
                            onClick={addCurrentNetwork}
                            className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm cursor-pointer hover:bg-accent disabled:opacity-60"
                        >
                            <Wifi size={14} /> Add this network
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-muted">
                        Open this page while connected to the school's network, then click "Add this network".
                    </p>
                </div>
            </div>
        </div>
    )
}