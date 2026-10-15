"use client"
import { useEffect } from "react"
import Link from "next/link"

export default function Error({ error, reset }) {
    useEffect(() => { console.error(error) }, [error])

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
            <p className="mt-2 max-w-sm text-sm text-muted">
                This page hit a problem. Your work on other pages isn't affected.
            </p>
            <div className="mt-6 flex gap-3">
                <button
                    type="button"
                    onClick={() => reset()}
                    className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-white cursor-pointer"
                >
                    Try again
                </button>
                <Link
                    href="/"
                    className="inline-flex h-10 items-center rounded-md border border-input bg-background px-5 text-sm font-medium shadow-sm hover:bg-accent"
                >
                    Go home
                </Link>
            </div>
        </main>
    )
}