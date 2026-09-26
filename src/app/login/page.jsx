import Link from "next/link"
export default function Login() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">

            <div className="w-full max-w-md">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                    <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
                    <p className="mt-1 text-sm text-muted">
                        Log in to continue where you left off.
                    </p>

                    <div className="mt-6">
                        <form action="" className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                                <input type="text" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus:outline-none" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
                                <input type="text" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus:outline-none" />
                            </div>

                            <div className="flex items-center justify-between">
                                <label htmlFor="" className="flex items-center gap-2 text-sm text-muted">
                                    <input
                                        type="checkbox"
                                        name="remember"
                                        id="remember"
                                        className="h-3.5 w-3.5 cursor-pointer rounded-full accent-blue-600 focus:ring-blue-500"
                                    />
                                    Remember me
                                </label>
                                <Link className="text-sm font-medium text-primary hover:underline" href={``}>Forgot password?</Link>
                            </div>

                            <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors bg-primary text-white w-full py-1.5 px-3">
                                Log in
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-muted">
                            New here? <Link href={`/register`} className="text-sm font-medium text-primary hover:underline">Create an account</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}