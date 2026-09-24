export default function Register() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
            <div className="w-full max-w-md">
                <div className="mb-6 flex items-center justify-center gap-2"></div>

                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                    <h1 className="text-xl font-semibold tracking-tight">
                        Create your account
                    </h1>

                    <p className="mt-1 text-sm text-muted"></p>

                    <div className="mt-6">
                        <form action="" className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Full name</label>
                                <input type="text" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                                <input type="text" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm" />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
                                <input type="text" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm" />
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}