// "use client"
// import { useEffect } from "react"
// import Link from "next/link"

// export default function Error({ error, reset }) {
//     useEffect(() => { console.error(error) }, [error])

//     return (
//         <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
//             <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
//             <p className="mt-2 max-w-sm text-sm text-muted">
//                 This page hit a problem. Your work on other pages isn't affected.
//             </p>
//             <div className="mt-6 flex gap-3">
//                 <button
//                     type="button"
//                     onClick={() => reset()}
//                     className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-white cursor-pointer"
//                 >
//                     Try again
//                 </button>
//                 <Link
//                     href="/"
//                     className="inline-flex h-10 items-center rounded-md border border-input bg-background px-5 text-sm font-medium shadow-sm hover:bg-accent"
//                 >
//                     Go home
//                 </Link>
//             </div>
//         </main>
//     )
// }


"use client"
import { useEffect } from "react"
import Link from "next/link"

export default function Error({ error, reset }) {
    useEffect(() => { console.error(error) }, [error])

    const dev = process.env.NODE_ENV !== "production"
    const details = dev
        ? `${String(error?.message ?? error)}${error?.stack ? "\n\n" + error.stack.split("\n").slice(0, 6).join("\n") : ""}`
        : null

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
            <p className="mt-2 max-w-md text-sm text-muted">
                This page hit a problem. Your work on other pages isn't affected.
            </p>

            {details && (
                <pre className="mt-4 max-w-2xl overflow-auto whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-3 text-left text-xs text-red-800">
                    {details}
                </pre>
            )}

            <div className="mt-6 flex gap-3">
                <button
                    type="button"
                    onClick={() => reset()}
                    className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-white cursor-pointer"
                >
                    Try again
                </button>
                <Link href="/" className="inline-flex h-10 items-center rounded-md bg-accent px-5 text-sm font-medium">
                    Go home
                </Link>
            </div>
        </div>
    )
}