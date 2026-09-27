import Link from "next/link"
export default function ForgotPassword() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
            <div className="w-full max-w-md">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                    <h1 className="text-xl font-semibold tracking-tight">Forgot your password?</h1>
                    <p className="mt-1 text-sm text-muted">
                        We'll email you a link to set a new one.

                        <div className="mt-6">
                            <form action="" className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                                    <input type="text" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus:outline-none" />
                                </div>
                                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors bg-primary text-white w-full py-1.5 px-3">
                                    Send link
                                </button>

                                <Link href={`ath/login`} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors text-black w-full py-1.5 px-3 hover:bg-accent">
                                    Back to login
                                </Link>
                            </form>
                        </div>
                    </p>
                </div>
            </div>
        </div>
    )
}