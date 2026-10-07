export default function Spinner({ size = 36, className = "" }) {
    return (
        <span
            role="status"
            aria-label="Loading"
            style={{
                width: size,
                height: size,
                borderWidth: 5,
                borderStyle: "solid",
                borderColor: "#dbeafe",
                borderTopColor: "#2563eb",
                borderRadius: "50%",
            }}
            className={`inline-block animate-spin ${className}`}
        />
    )
}

export function PageLoader() {
    return (
        <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner size={40} />
        </div>
    )
}