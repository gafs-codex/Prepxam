"use client"
import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Clock, Flag, ChevronLeft, ChevronRight, AlertTriangle, WifiOff, Check, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import Spinner, { PageLoader } from "@/components/ui/Spinner"
import ErrorState from "@/components/ui/ErrorState"
import { withTimeout, friendlyMessage, ensure } from "@/lib/net"
import { callRpc, isNetworkError, isClosedError } from "@/lib/rpc"
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

// answers that haven't uploaded yet are also kept on this device
const storeKey = (attemptId) => `prepxam:pending:${attemptId}`;

function readStored(attemptId) {
    try {
        const raw = localStorage.getItem(storeKey(attemptId));
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeStored(attemptId, entries) {
    try {
        if (entries.length === 0) localStorage.removeItem(storeKey(attemptId));
        else localStorage.setItem(storeKey(attemptId), JSON.stringify(entries));
    } catch {
        // storage can be full or blocked. The queue still works in memory.
    }
}

export default function TakeExam() {
    const { id } = useParams();
    const router = useRouter();
    const [phase, setPhase] = useState("loading"); // loading | error | missing | intro | taking
    const [loadError, setLoadError] = useState(null);
    const [exam, setExam] = useState(null);
    const [attempt, setAttempt] = useState(null);
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState({});
    const [flags, setFlags] = useState({});
    const [secondsLeft, setSecondsLeft] = useState(null);
    const [busy, setBusy] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [unsaved, setUnsaved] = useState(0);
    const [online, setOnline] = useState(true);
    const [finishing, setFinishing] = useState(null); // null | { auto, waiting }

    const offsetRef = useRef(0);          // server clock minus browser clock
    const attemptIdRef = useRef(null);
    const queueRef = useRef(new Map());   // changes waiting to upload
    const flushingRef = useRef(null);
    const retryTimerRef = useRef(null);
    const backoffRef = useRef(2000);
    const finishingRef = useRef(false);
    const unmountedRef = useRef(false);
    const wakeRef = useRef(null);
    const authNotedRef = useRef(false);
    const lostRef = useRef(0);

    // ---------- the save queue ----------

    function syncQueueState() {
        const entries = [...queueRef.current.values()];
        if (attemptIdRef.current) writeStored(attemptIdRef.current, entries);
        setUnsaved(entries.length);
    }

    function enqueue(kind, qid, value) {
        queueRef.current.set(`${kind}:${qid}`, { kind, qid, value });
        syncQueueState();
        flushQueue();
    }

    function scheduleRetry() {
        if (retryTimerRef.current || unmountedRef.current) return;
        retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null;
            flushQueue();
        }, backoffRef.current);
        backoffRef.current = Math.min(backoffRef.current * 2, 15000);
    }

    // Uploads everything waiting. Resolves true when the queue is empty.
    function flushQueue() {
        if (flushingRef.current) return flushingRef.current;

        const run = (async () => {
            let complete = true;
            let rejected = 0;
            let closed = false;

            while (queueRef.current.size > 0) {
                const [key, entry] = queueRef.current.entries().next().value;

                const res = entry.kind === "answer"
                    ? await callRpc("save_answer", {
                        p_attempt_id: attemptIdRef.current,
                        p_question_id: entry.qid,
                        p_chosen: entry.value,
                    })
                    : await callRpc("set_flag", {
                        p_attempt_id: attemptIdRef.current,
                        p_question_id: entry.qid,
                        p_flagged: entry.value,
                    });

                if (res.ok) {
                    backoffRef.current = 2000;
                    // keep it queued if the student changed their mind while it was sending
                    if (queueRef.current.get(key)?.value === entry.value) queueRef.current.delete(key);
                } else if (res.network || res.auth) {
                    complete = false;
                    if (res.auth && !authNotedRef.current) {
                        authNotedRef.current = true;
                        toast.error("Your session has expired. Your answers are stored on this device. Log in again to save them.", { duration: 10000 });
                    }
                    break;
                } else {
                    // the server said no. Drop it so one bad item can't block the rest
                    queueRef.current.delete(key);
                    if (isClosedError(res.error)) {
                        closed = true;
                        if (entry.kind === "answer") lostRef.current += 1;
                    } else {
                        rejected += 1;
                    }
                }
                syncQueueState();
            }

            return { complete, rejected, closed };
        })();

        const chained = run.then((result) => {
            flushingRef.current = null;
            syncQueueState();

            if (unmountedRef.current) return result.complete;

            if (result.closed && !finishingRef.current) finish(true);
            if (result.rejected > 0) toast.error("Some of your changes couldn't be saved.");
            if (!result.complete || queueRef.current.size > 0) scheduleRetry();

            return result.complete && queueRef.current.size === 0;
        });

        flushingRef.current = chained;
        return chained;
    }

    function sleepInterruptible(ms) {
        return new Promise((resolve) => {
            const timer = setTimeout(done, ms);
            function done() {
                clearTimeout(timer);
                wakeRef.current = null;
                resolve();
            }
            wakeRef.current = done;
        });
    }

    // Uploads what's pending, then submits. Keeps trying until it works.
    async function finish(auto) {
        if (finishingRef.current) return;
        finishingRef.current = true;
        setConfirmOpen(false);
        setFinishing({ auto, waiting: false });

        let delay = 2000;
        for (; ;) {
            if (unmountedRef.current) return;

            const flushed = await flushQueue();
            if (flushed) {
                const res = await callRpc("submit_attempt", { p_attempt_id: attemptIdRef.current });
                if (res.ok) break;

                if (!res.network && !res.auth) {
                    // the server refused, so waiting won't help
                    finishingRef.current = false;
                    setFinishing(null);
                    toast.error(friendlyMessage(res.error));
                    return;
                }
            }

            setFinishing({ auto, waiting: true });
            await sleepInterruptible(delay);
            delay = Math.min(delay * 2, 15000);
        }

        if (unmountedRef.current) return;
        clearTimeout(retryTimerRef.current);
        writeStored(attemptIdRef.current, []);

        if (lostRef.current > 0) {
            toast.warning("Time ran out before some of your last answers could be saved.", { duration: 8000 });
        }
        toast.success(auto ? "Time is up. Your exam was submitted." : "Exam submitted");
        router.replace(`/student/history/${attemptIdRef.current}`);
    }

    // ---------- loading ----------

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    async function load() {
        setPhase("loading");
        setLoadError(null);

        try {
            const examRes = await withTimeout(
                supabase
                    .from("exams")
                    .select("title, subject, duration_minutes, number_of_questions")
                    .eq("id", id)
                    .maybeSingle(),
                15000
            );
            if (examRes.error) throw examRes.error;
            if (!examRes.data) { setPhase("missing"); return; }
            setExam(examRes.data);

            const mine = ensure(await withTimeout(supabase.rpc("my_attempts"), 15000));
            const existing = (mine.data ?? []).find((a) => a.exam_id === id);

            if (existing?.submitted_at) {
                router.replace(`/student/history/${existing.attempt_id}`);
                return;
            }
            if (existing) await openAttempt(existing.attempt_id);
            else setPhase("intro");
        } catch (err) {
            console.error(err);
            setLoadError(friendlyMessage(err));
            setPhase(isNetworkError(err) ? "error" : "missing");
        }
    }

    async function openAttempt(attemptId) {
        const { data } = ensure(
            await withTimeout(supabase.rpc("get_attempt", { p_attempt_id: attemptId }), 15000)
        );

        if (data.submitted) {
            router.replace(`/student/history/${attemptId}`);
            return;
        }

        offsetRef.current = new Date(data.server_now).getTime() - Date.now();
        attemptIdRef.current = attemptId;

        // bring back anything this device saved but never uploaded
        const valid = new Set(data.questions.map((q) => q.id));
        queueRef.current = new Map(
            readStored(attemptId)
                .filter((e) => e && valid.has(e.qid))
                .map((e) => [`${e.kind}:${e.qid}`, e])
        );

        const savedAnswers = Object.fromEntries(
            data.questions.filter((q) => q.chosen_index !== null).map((q) => [q.id, q.chosen_index])
        );
        const savedFlags = Object.fromEntries(
            data.questions.filter((q) => q.flagged).map((q) => [q.id, true])
        );
        for (const e of queueRef.current.values()) {
            if (e.kind === "answer") savedAnswers[e.qid] = e.value;
            else if (e.value) savedFlags[e.qid] = true;
            else delete savedFlags[e.qid];
        }

        setAttempt(data);
        setAnswers(savedAnswers);
        setFlags(savedFlags);
        syncQueueState();
        setPhase("taking");

        if (queueRef.current.size > 0) flushQueue();
    }

    async function start() {
        setBusy(true);

        if (exam.requires_code || exam.network_only) {
            const gate = await callRpc("unlock_exam", { p_exam_id: id, p_code: code });
            if (!gate.ok) {
                setBusy(false);
                toast.error(
                    gate.network
                        ? "Couldn't reach the server, so the exam hasn't started. Check your connection and try again."
                        : friendlyMessage(gate.error)
                );
                return;
            }

            const blocked = {
                network: "This exam can only be taken on the school network.",
                wrong: "That code isn't correct. Check with your invigilator.",
                locked: "Too many wrong codes. Ask your invigilator for help.",
            }[gate.data];

            if (blocked) {
                setBusy(false);
                toast.error(blocked);
                return;
            }
        }

        const res = await callRpc("start_attempt", { p_exam_id: id });
        // ...the rest of your existing start() stays as it is  

        if (!res.ok) {
            setBusy(false);
            toast.error(
                res.network
                    ? "Couldn't reach the server, so the exam hasn't started. Check your connection and try again."
                    : friendlyMessage(res.error)
            );
            return;
        }

        try {
            await openAttempt(res.data);
        } catch (err) {
            console.error(err);
            // the attempt exists now, so Try again will find it and open it
            setLoadError(friendlyMessage(err));
            setPhase("error");
        }
        setBusy(false);
    }

    // ---------- what the student does ----------

    function choose(question, index) {
        if (finishingRef.current) return;
        setAnswers((prev) => ({ ...prev, [question.id]: index }));
        enqueue("answer", question.id, index);
    }

    function toggleFlag(question) {
        if (finishingRef.current) return;
        const next = !flags[question.id];
        setFlags((prev) => ({ ...prev, [question.id]: next }));
        enqueue("flag", question.id, next);
    }

    // ---------- effects ----------

    useEffect(() => {
        unmountedRef.current = false;
        return () => {
            unmountedRef.current = true;
            clearTimeout(retryTimerRef.current);
            wakeRef.current?.();
        };
    }, []);

    // connection status, and an immediate retry when it comes back
    useEffect(() => {
        setOnline(navigator.onLine);

        const goOnline = () => {
            setOnline(true);
            backoffRef.current = 2000;
            wakeRef.current?.();
            flushQueue();
        };
        const goOffline = () => setOnline(false);

        window.addEventListener("online", goOnline);
        window.addEventListener("offline", goOffline);
        return () => {
            window.removeEventListener("online", goOnline);
            window.removeEventListener("offline", goOffline);
        };
    }, []);

    // warn before the tab is closed while answers haven't uploaded
    useEffect(() => {
        if (unsaved === 0 && !finishing) return;
        const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [unsaved, finishing]);

    // countdown, based on the server's deadline. It keeps running offline.
    useEffect(() => {
        if (phase !== "taking") return;
        const tick = () => {
            const now = Date.now() + offsetRef.current;
            const left = Math.max(0, Math.round((new Date(attempt.deadline).getTime() - now) / 1000));
            setSecondsLeft(left);
            if (left === 0) finish(true);
        };
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, attempt]);

    // ---------- screens ----------

    if (phase === "loading") return <PageLoader />;

    if (phase === "error") {
        return (
            <div>
                <ErrorState message={loadError} onRetry={load} />
                <p className="pb-10 text-center">
                    <Link href="/student/dashboard" className="text-sm text-primary hover:underline">Back to dashboard</Link>
                </p>
            </div>
        );
    }

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
                        <li>If your connection drops, keep answering. Your answers are kept on this device and upload when you reconnect.</li>
                        <li>Use the flag button to mark questions you want to come back to.</li>
                        {exam.network_only && <li>This exam can only be taken on the school network.</li>}
                    </ul>

                    {exam.requires_code && (
                        <div className="mt-5">
                            <label htmlFor="examCode" className="text-sm font-medium">Exam code</label>
                            <input
                                id="examCode"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                placeholder="Ask your invigilator"
                                maxLength={12}
                                autoComplete="off"
                                className="mt-1 flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-base uppercase tracking-widest outline-none"
                            />
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={start}
                        disabled={busy || (exam.requires_code && code.trim().length < 4)}
                        className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-white cursor-pointer disabled:opacity-60"
                    >
                        {busy ? "Starting..." : "Start exam"}
                    </button>
                    <Link href="/student/dashboard" className="mt-3 block text-center text-sm text-muted hover:underline">
                        Back to dashboard
                    </Link>
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

    const dense = total > 30;

    const save =
        unsaved === 0
            ? { text: "All saved", tone: "text-green-700", Icon: Check, spin: false }
            : !online
                ? { text: `Offline · ${unsaved} waiting`, tone: "text-red-700", Icon: WifiOff, spin: false }
                : { text: "Saving...", tone: "text-yellow-700", Icon: RefreshCw, spin: true };
    const SaveIcon = save.Icon;

    function gridClass(q, i) {
        const base = `rounded-md border font-medium cursor-pointer ${dense ? "h-8 text-xs" : "h-10 text-sm"}`;
        const ring = i === current ? " ring-2 ring-primary" : "";
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
                    <div className="flex items-center gap-3">
                        <span className={`hidden items-center gap-1.5 text-xs font-medium sm:inline-flex ${save.tone}`}>
                            <SaveIcon size={14} className={save.spin ? "animate-spin" : ""} />
                            {save.text}
                        </span>
                        <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums ${lowTime ? "border-red-300 bg-red-50 text-red-700" : "border-border"}`}>
                            <Clock size={16} />
                            {secondsLeft === null ? "--:--" : formatTime(secondsLeft)}
                        </span>
                    </div>
                </div>
                <div className="h-1 bg-primary/20">
                    <div className="h-full bg-primary transition-all" style={{ width: `${((current + 1) / total) * 100}%` }} />
                </div>
            </header>

            {!online && (
                <div className="border-b border-yellow-300 bg-yellow-50 px-4 py-2 text-center text-sm text-yellow-900">
                    You're offline. Keep going: your answers are saved on this device and will upload when you reconnect. The timer keeps running.
                </div>
            )}

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

                    <div className={`mt-4 grid max-h-[50vh] overflow-y-auto p-1 ${dense ? "grid-cols-8 gap-1.5" : "grid-cols-5 gap-2"}`}>
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
                        disabled={Boolean(finishing)}
                        className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-white cursor-pointer disabled:opacity-60"
                    >
                        Submit exam
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
                            {unsaved > 0 && `${unsaved} recent change${unsaved === 1 ? " hasn't" : "s haven't"} uploaded yet. We'll send ${unsaved === 1 ? "it" : "them"} first. `}
                            You can't change your answers after submitting.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {/* <AlertDialogFooter> */}
                    <div className="flex justify-end gap-2">
                        <AlertDialogCancel className="cursor-pointer">Keep working</AlertDialogCancel>
                        <AlertDialogAction onClick={() => finish(false)} className="cursor-pointer text-white">
                            Submit now
                        </AlertDialogAction>
                    </div>
                    {/* </AlertDialogFooter> */}
                </AlertDialogContent>
            </AlertDialog>

            {finishing && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
                        {finishing.waiting ? (
                            <>
                                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 text-yellow-700">
                                    <WifiOff size={28} />
                                </span>
                                <h2 className="mt-5 text-xl font-semibold tracking-tight">Waiting for connection</h2>
                                <p className="mt-2 text-sm text-muted">
                                    {finishing.auto ? "Time is up. " : ""}Your answers are saved on this device. Keep this page open. Your exam will be submitted as soon as you're back online.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => wakeRef.current?.()}
                                    className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-white cursor-pointer"
                                >
                                    Try again now
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-center"><Spinner size={40} /></div>
                                <h2 className="mt-5 text-xl font-semibold tracking-tight">
                                    {finishing.auto ? "Time is up" : "Submitting your exam"}
                                </h2>
                                <p className="mt-2 text-sm text-muted">Please don't close this page.</p>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}