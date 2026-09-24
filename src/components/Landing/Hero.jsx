import { ShieldCheck } from 'lucide-react';
import LandingCard from '../ui/LandingCard';
import { LandingData } from '@/data/LandingCard';
import Link from 'next/link';
export default function Hero() {
    return (
        <section className="px-4 py-16">
            <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <ShieldCheck color='#2954bc' width={20} height={20} strokeWidth={2} />
                    Role-based access for students, teachers and admins
                </span>

                <h1 className='mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl'>
                    Timed mock exams, marked the second they're submitted.
                </h1>

                <p className='mt-4 text-base text-muted sm:text-lg'>
                    Students sit real exam conditions with a countdown and question grid. Teachers build a question bank once and reuse it across exams, then watch results land in real time.
                </p>

                <div className='mt-7 flex flex-wrap gap-3'>
                    <Link href="/register">
                        <button className='inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium cursor-pointer bg-primary shadow hover:bg-primary/90 h-10 rounded-md px-8 text-white'>
                            Create an account
                        </button>
                    </Link>

                    <button className='inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium cursor-pointer h-10 rounded-md px-8 bg-background shadow-sm'>
                        I already have one
                    </button>
                </div>


            </div>

            <div className='mt-16 grid gap-4 sm:grid-cols-3'>
                {LandingData.map((card) => {
                    return <LandingCard key={card.title} {...card} />
                })}
            </div>

        </section>
    )
}