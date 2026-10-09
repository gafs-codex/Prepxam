"use client"
import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Clock, Flag, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { PageLoader } from "@/components/ui/Spinner"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function formatTime(total) {
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TakeExam() {
    const { id } = useParams();
    const router = useRouter();
    const [phase, setPhase] = useState("loading"); // loading | missing | intro | taking
    const [exam, setExam] = useState(null);
    const [attempt, setAttempt] = useState(null);
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState({});
    const [flags, setFlags] = useState({});
    const [secondsLeft, setSecondsLeft] = useState(null);
    const [busy, setBusy] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const offsetRef = useRef(0);       // server clock minus browser clock
    const submittedRef = useRef(false);

    useEffect(() => {
        async function load() {
            const { data: examRow } = await supabase
                .from("exams")
                .select("title, subject, duration_minutes, number_of_questions")
                .eq("id", id)
                .maybeSingle();
            if (!examRow) { setPhase("missing"); return; }
            setExam(examRow);

            const { data: mine } = await supabase.rpc("my_attempts");
            const existing = (mine ?? []).find((a) => a.exam_id === id);

            if (existing?.submitted_at) {
                router.replace("/student/history");
                return;
            }
            if (existing) await openAttempt(existing.attempt_id);
            else setPhase("intro");
        }
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    async function openAttempt(attemptId) {
        const { data, error } = await supabase.rpc("get_attempt", { p_attempt_id: attemptId });
        if (error) { toast.error(error.message); setPhase("missing"); return; }

        if (data.submitted) {
            router.replace("/student/history");
            return;
        }

        offsetRef.current = new Date(data.server_now).getTime() - Date.now();
        setAttempt(data);
        setAnswers(Object.fromEntries(
            data.questions.filter((q) => q.chosen_index !== null).map((q) => [q.id, q.chosen_index])
        ));
        setFlags(Object.fromEntries(
            data.questions.filter((q) => q.flagged).map((q) => [q.id, true])
        ));
        setPhase("taking");
    }

    async function start() {
        setBusy(true);
        const { data, error } = await supabase.rpc("start_attempt", { p_exam_id: id });
        if (error) { toast.error(error.message); setBusy(false); return; }
        await openAttempt(data);
        setBusy(false);
    }

    async function choose(question, index) {
        setAnswers((prev) => ({ ...prev, [question.id]: index }));
        const { error } = await supabase.rpc("save_answer", {
            p_attempt_id: attempt.attempt_id,
            p_question_id: question.id,
            p_chosen: index,
        });
        if (error) toast.error(`Answer not saved: ${error.message}`);
    }

    async function toggleFlag(question) {
        const next = !flags[question.id];
        setFlags((prev) => ({ ...prev, [question.id]: next }));
        const { error } = await supabase.rpc("set_flag", {
            p_attempt_id: attempt.attempt_id,
            p_question_id: question.id,
            p_flagged: next,
        });
        if (error) {
            setFlags((prev) => ({ ...prev, [question.id]: !next }));
            toast.error("Could not save the flag");
        }
    }

    async function submit(auto = false) {
        if (submittedRef.current) return;
        submittedRef.current = true;
        setBusy(true);
        const { error } = await supabase.rpc("submit_attempt", { p_attempt_id: attempt.attempt_id });
        if (error) {
            submittedRef.current = false;
            setBusy(false);
            toast.error(error.message);
            return;
        }
        toast.success(auto ? "Time is up. Your exam was submitted." : "Exam submitted");
        router.replace("/student/history");
    }

    // countdown, based on the server's deadline
    useEffect(() => {
        if (phase !== "taking") return;
        const tick = () => {
            const now = Date.now() + offsetRef.current;
            const left = Math.max(0, Math.round((new Date(attempt.deadline).getTime() - now) / 1000));
            setSecondsLeft(left);
            if (left === 0) submit(true);
        };
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, attempt]);

    if (phase === "loading") return <PageLoader />;

    if (phase === "missing") {
        return (
            <main className="mx-auto max-w-2xl px-4 py-12 text-center">
                <p>This exam isn't available.</p>
                <Link href="/student/dashboard" className="mt-4 inline-block text-primary hover:underline">Back to dashboard</Link>
            </main>
        );
    }

    if (phase === "intro") {
        return (
            <main className="mx-auto max-w-2xl px-4 py-12">
                <div className="rounded-xl border border-border bg-card p-6">
                    <h1 className="text-2xl font-semibold tracking-tight">{exam.title}</h1>
                    <p className="mt-1 text-sm text-muted">{exam.subject}</p>
                    <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
                        <li>{exam.number_of_questions} questions</li>
                        <li>{exam.duration_minutes} minutes. The timer starts as soon as you click Start.</li>
                        <li>You can take this exam once. Your answers are saved as you go.</li>
                        <li>Use the flag button to mark questions you want to come back to.</li>
                    </ul>
                    <button
                        type="button"
                        onClick={start}
                        disabled={busy}
                        className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-white cursor-pointer disabled:opacity-60"
                    >
                        {busy ? "Starting..." : "Start exam"}
                    </button>
                </div>
            </main>
        );
    }

    // phase === "taking"
    const questions = attempt.questions;
    const question = questions[current];
    const total = questions.length;
    const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
    const unanswered = total - answeredCount;
    const flaggedCount = questions.filter((q) => flags[q.id]).length;
    const lowTime = secondsLeft !== null && secondsLeft <= 60;

    function gridClass(q, i) {
        const base = "h-10 rounded-md border text-sm font-medium cursor-pointer";
        const ring = i === current ? " ring-2 ring-primary ring-offset-2" : "";
        if (flags[q.id]) return `${base} border-yellow-400 bg-yellow-400 text-yellow-950${ring}`;
        if (answers[q.id] !== undefined) return `${base} border-primary bg-primary text-white${ring}`;
        return `${base} border-border bg-accent/40${ring}`;
    }

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header className="border-b border-border bg-card">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
                    <div>
                        <h1 className="text-lg font-semibold leading-tight">{attempt.exam.title}</h1>
                        <p className="text-sm text-muted">
                            Question {current + 1} of {total} · {attempt.exam.subject}
                        </p>
                    </div>
                    <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums ${lowTime ? "border-red-300 bg-red-50 text-red-700" : "border-border"}`}>
                        <Clock size={16} />
                        {secondsLeft === null ? "--:--" : formatTime(secondsLeft)}
                    </span>
                </div>
                <div className="h-1 bg-primary/20">
                    <div className="h-full bg-primary transition-all" style={{ width: `${((current + 1) / total) * 100}%` }} />
                </div>
            </header>

            <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_20rem]">
                <section>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted">Question {current + 1}</p>
                            <p className="mt-2 text-xl font-medium">{question.text}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => toggleFlag(question)}
                            className={`inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer ${flags[question.id] ? "border-yellow-400 bg-yellow-100 text-yellow-900" : "border-border hover:bg-accent/40"}`}
                        >
                            <Flag size={16} className={flags[question.id] ? "fill-yellow-400" : ""} />
                            {flags[question.id] ? "Flagged" : "Flag"}
                        </button>
                    </div>

                    <div className="mt-6 space-y-3">
                        {question.options.map((opt, i) => {
                            const selected = answers[question.id] === opt.index;
                            return (
                                <button
                                    key={opt.index}
                                    type="button"
                                    onClick={() => choose(question, opt.index)}
                                    className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left cursor-pointer ${selected ? "border-primary bg-accent/50" : "border-border bg-card hover:bg-accent/40"}`}
                                >
                                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-medium ${selected ? "bg-primary text-white" : "bg-accent"}`}>
                                        {String.fromCharCode(65 + i)}
                                    </span>
                                    {opt.text}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-8 flex items-center justify-between">
                        <button
                            type="button"
                            disabled={current === 0}
                            onClick={() => setCurrent((c) => c - 1)}
                            className="inline-flex h-10 items-center gap-2 rounded-md border border-input bg-card px-4 text-sm font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={16} /> Previous
                        </button>
                        <button
                            type="button"
                            disabled={current === total - 1}
                            onClick={() => setCurrent((c) => c + 1)}
                            className="inline-flex h-10 items-center gap-2 rounded-md border border-input bg-card px-4 text-sm font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                </section>

                <aside className="h-fit rounded-xl border border-border bg-card p-5">
                    <h2 className="font-semibold">Question grid</h2>
                    <p className="mt-1 text-sm text-muted">{answeredCount} answered · {unanswered} left</p>

                    <div className="mt-4 grid grid-cols-5 gap-2">
                        {questions.map((q, i) => (
                            <button key={q.id} type="button" onClick={() => setCurrent(i)} className={gridClass(q, i)}>
                                {i + 1}
                            </button>
                        ))}
                    </div>

                    <div className="mt-5 space-y-2 text-xs text-muted">
                        <p className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-primary" /> Answered</p>
                        <p className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-yellow-400" /> Flagged for review</p>
                        <p className="flex items-center gap-2"><span className="h-3 w-3 rounded border border-border bg-accent/40" /> Not answered</p>
                    </div>
                </aside>
            </main>

            <footer className="sticky bottom-0 border-t border-border bg-card">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
                    <p className="flex items-center gap-2 text-sm text-muted">
                        {unanswered > 0 || flaggedCount > 0 ? <AlertTriangle size={16} /> : null}
                        {unanswered > 0 && `${unanswered} unanswered`}
                        {unanswered > 0 && flaggedCount > 0 && " · "}
                        {flaggedCount > 0 && `${flaggedCount} flagged`}
                        {unanswered === 0 && flaggedCount === 0 && "All questions answered"}
                    </p>
                    <button
                        type="button"
                        onClick={() => setConfirmOpen(true)}
                        disabled={busy}
                        className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-white cursor-pointer disabled:opacity-60"
                    >
                        {busy ? "Submitting..." : "Submit exam"}
                    </button>
                </div>
            </footer>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Submit your exam?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {unanswered > 0
                                ? `You still have ${unanswered} unanswered question${unanswered === 1 ? "" : "s"}. They will be marked as wrong. `
                                : "You have answered every question. "}
                            {flaggedCount > 0 && `${flaggedCount} question${flaggedCount === 1 ? " is" : "s are"} still flagged for review. `}
                            You can't change your answers after submitting.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">Keep working</AlertDialogCancel>
                        <AlertDialogAction onClick={() => submit(false)} className="cursor-pointer text-white">
                            Submit now
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}