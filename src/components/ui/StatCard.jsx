export default function StatCard({ label, value }) {
    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
    )
}