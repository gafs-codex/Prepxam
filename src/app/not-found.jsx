import Link from "next/link"

export default function NotFound() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
            <p className="text-sm font-medium text-muted">404</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Page not found</h1>
            <p className="mt-2 text-sm text-muted">That page doesn't exist or has moved.</p>
            <Link
                href="/"
                className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-white"
            >
                Go home
            </Link>
        </main>
    )
}