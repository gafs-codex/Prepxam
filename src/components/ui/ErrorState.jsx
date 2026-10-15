import { TriangleAlert } from "lucide-react"

export default function ErrorState({ message, onRetry }) {
    return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-yellow-700">
                <TriangleAlert size={24} />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Couldn't load this page</h2>
            <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-white cursor-pointer"
                >
                    Try again
                </button>
            )}
        </div>
    )
}