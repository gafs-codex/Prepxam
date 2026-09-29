import { Search } from 'lucide-react';
import SubjectFilter from '@/components/SubjectFilter';

export default function StudentExams() {
    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <h1 className="text-2xl font-semibold tracking-tight">Browse exams</h1>
            <p className="mt-1 text-sm text-muted">0 published exams match your filters.</p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <Search width={24} height={24} fill='none' strokeWidth={2} className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted' />
                    <input
                        type="text"
                        className='flex h-9 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-1 text-base shadow-sm outline-none'
                        placeholder="Search by exam name"
                    />
                </div>

                <SubjectFilter />
            </div>

            <div className='mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                <p className='text-sm text-muted'>No exams found. Try clearing your filters.</p>
            </div>
        </main>
    )
}