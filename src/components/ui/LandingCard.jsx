export default function LandingCard({ icon: Icon, title, text }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-card p-5">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-accent">
                <Icon className="w-5 h-5" />
            </span>
            <h3 className="mt-3 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{text}</p>
        </div>
    )
}