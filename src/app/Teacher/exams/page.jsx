import { Search, Plus } from 'lucide-react';
import Link from 'next/link';
export default function TeacherExam() {
    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className='text-2xl font-semibold tracking-tight'>My exams</h1>
                    <p className='mt-1 text-sm text-muted'>0 exams</p>
                </div>

                <Link href={`/Teacher/exams/create`} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer bg-primary text-white shadow hover:bg-primary/90 h-9 px-4 py-2">
                    <Plus />
                    New exam
                </Link>
            </div>

            <input
                type="text"
                className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm md:text-sm mt-6 max-w-sm placeholder:text-muted outline-none'
                placeholder='Search exams'
            />

            <div className='mt-6 space-y-3'>
                <p className='rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted bg-white'>No exams yet.</p>
            </div>
        </main>
    )
}