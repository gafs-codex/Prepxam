import Link from 'next/link';
import {
    ShieldCheck, Timer, Flag, Shuffle, Library, ClipboardCheck, Lock,
    UserCheck, Send, GraduationCap, BookOpen, School, Check, ArrowRight,
} from 'lucide-react';

const STEPS = [
    {
        icon: UserCheck,
        title: "Register and get approved",
        text: "Students and teachers sign up and pick their subjects. The school admin approves each account before it can be used.",
    },
    {
        icon: BookOpen,
        title: "Teachers build exams",
        text: "Write questions into your own bank, then assemble them into an exam with a duration and a question count.",
    },
    {
        icon: ClipboardCheck,
        title: "The school reviews",
        text: "Teachers send the exam for approval. The admin checks it for problems and approves it, or sends it back with a note.",
    },
    {
        icon: GraduationCap,
        title: "Students sit it, results are released",
        text: "Students take the exam under a timer. The school releases results when everyone has finished.",
    },
];

const FEATURES = [
    {
        icon: Timer,
        title: "Real exam conditions",
        text: "A countdown timer controlled by the server, answers saved as students go, and automatic submission when time runs out.",
    },
    {
        icon: Flag,
        title: "Question grid and flagging",
        text: "Jump to any question, see what is answered, and flag questions to come back to before submitting.",
    },
    {
        icon: Shuffle,
        title: "Different order for every student",
        text: "Questions are shuffled per student, so neighbours never see the same paper in the same order.",
    },
    {
        icon: Library,
        title: "One question bank, many exams",
        text: "Teachers write a question once and reuse it across internal tests, WAEC, NECO, JAMB and GCE practice exams.",
    },
    {
        icon: Lock,
        title: "Answers stay private",
        text: "Correct answers never reach the student's browser. Marking happens on the server, and approved exams cannot be edited.",
    },
    {
        icon: ShieldCheck,
        title: "School-controlled access",
        text: "Every account and every exam is approved by the school admin. Students only see exams in the subjects they offer.",
    },
];

const ROLES = [
    {
        icon: GraduationCap,
        title: "Students",
        points: [
            "Choose the subjects you are offering",
            "See only the exams meant for you",
            "Resume if your connection drops",
            "Check your results and history in one place",
        ],
    },
    {
        icon: BookOpen,
        title: "Teachers",
        points: [
            "Build a reusable question bank",
            "Create multiple choice, true or false and fill in the gap questions",
            "Create an exam and add questions from the bank",
            "Send it for approval and track its status",
        ],
    },
    {
        icon: School,
        title: "School admins",
        points: [
            "Approve student and teacher registrations",
            "Review exams and get automatic problem checks",
            "Release results for the whole class at once",
            "See platform activity on one dashboard",
        ],
    },
];

export default function Hero() {
    return (
        <>
            <section className="px-4 py-16">
                <div className="max-w-2xl">
                    <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        <ShieldCheck color='#2954bc' width={20} height={20} strokeWidth={2} />
                        Role-based access for students, teachers and admins
                    </span>

                    <h1 className='mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl'>
                        Timed mock exams, marked the second they're submitted.
                    </h1>

                    <p className='mt-4 text-sm text-muted sm:text-lg'>
                        A complete exam platform for your school. Teachers build a question bank once and reuse it across exams, the school approves everything before students see it, and students sit real exam conditions with a countdown and question grid.
                    </p>

                    <div className='mt-7 flex flex-wrap items-center gap-3'>
                        <Link
                            href="/register"
                            className='inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium cursor-pointer bg-primary shadow hover:bg-primary/90 h-10 rounded-md px-8 text-white'
                        >
                            Create an account
                        </Link>
                        <Link
                            href="/login"
                            className='inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium cursor-pointer h-10 rounded-md px-8 bg-background shadow-sm hover:bg-accent'
                        >
                            I already have one
                        </Link>
                        {/* <a href="#how-it-works" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                            See how it works <ArrowRight size={16} />
                        </a> */}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section id="how-it-works" className="px-4 py-12">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
                <p className="mt-2 max-w-2xl text-muted">
                    From registration to results, every step is checked by the school.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {STEPS.map((step, i) => (
                        <div key={step.title} className="rounded-xl border border-border bg-card p-5">
                            <div className="flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
                                    <step.icon size={20} />
                                </span>
                                <span className="text-xs font-medium text-muted">Step {i + 1}</span>
                            </div>
                            <h3 className="mt-4 font-semibold">{step.title}</h3>
                            <p className="mt-1 text-sm text-muted">{step.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features */}
            <section className="px-4 py-12">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Built for fair, reliable exams</h2>
                <p className="mt-2 max-w-2xl text-muted text-sm">
                    Everything you need to run internal tests and exam practice without paper.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {FEATURES.map((feature) => (
                        <div key={feature.title} className="rounded-xl border border-border bg-card p-6">
                            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-primary">
                                <feature.icon size={22} />
                            </span>
                            <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                            <p className="mt-1 text-sm text-muted">{feature.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Roles */}
            <section className="px-4 py-12">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">A place for everyone</h2>
                <p className="mt-2 max-w-2xl text-muted">
                    Each role gets its own dashboard with only what it needs.
                </p>

                <div className="mt-8 grid gap-4 lg:grid-cols-3">
                    {ROLES.map((role) => (
                        <div key={role.title} className="rounded-xl border border-border bg-card p-6">
                            <div className="flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                                    <role.icon size={20} />
                                </span>
                                <h3 className="text-lg font-semibold">{role.title}</h3>
                            </div>
                            <ul className="mt-5 space-y-3">
                                {role.points.map((point) => (
                                    <li key={point} className="flex items-start gap-2 text-sm">
                                        <Check size={16} className="mt-0.5 shrink-0 text-primary" />
                                        <span>{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            {/* Final call to action */}
            {/* <section className="px-4 py-12">
                <div className="rounded-2xl bg-primary px-6 py-12 text-center text-white sm:px-12">
                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to run your next exam?</h2>
                    <p className="mx-auto mt-3 max-w-xl text-white/80">
                        Create your account, pick your subjects, and start once the school has approved you.
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        <Link
                            href="/register"
                            className="inline-flex h-10 items-center justify-center rounded-md bg-white px-8 text-sm font-medium text-primary shadow hover:bg-white/90"
                        >
                            Create an account
                        </Link>
                        <Link
                            href="/login"
                            className="inline-flex h-10 items-center justify-center rounded-md border border-white/40 px-8 text-sm font-medium text-white hover:bg-white/10"
                        >
                            Log in
                        </Link>
                    </div>
                </div>
            </section> */}

            <footer className="px-4 py-8 text-center text-sm text-muted">
                © {new Date().getFullYear()} Prepxam. All rights reserved.
            </footer>
        </>
    )
}