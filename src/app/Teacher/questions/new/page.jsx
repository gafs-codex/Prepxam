"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import CreateQuestionForm from "@/components/CreateQuestionForm"
import { toast } from "sonner"

export default function NewQuestion() {
    const router = useRouter();

    function handleQuestionCreated(question) {
        toast.success("Question added to the bank");
    }

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <Link href={`/Teacher/questions`} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 mb-3">
                Back
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">New question</h1>
            <div className="mt-6 max-w-3xl">
                <CreateQuestionForm
                    onQuestionCreated={handleQuestionCreated}
                    onCancel={() => router.push("/Teacher/questions")}
                />
            </div>
        </main>
    )
}