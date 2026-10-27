"use client"

export default function Toggle({ checked, onChange, disabled = false, label, hint }) {
    return (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
            <div>
                <p className="text-sm font-medium">{label}</p>
                {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${checked ? "bg-primary" : "bg-gray-300"}`}
            >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
            </button>
        </div>
    )
}