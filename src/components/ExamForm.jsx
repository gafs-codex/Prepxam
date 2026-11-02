"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import FilterDropdown from "@/components/FilterDropdown"
import Toggle from "@/components/ui/Toggle"
import { PageLoader } from "@/components/ui/Spinner"
import ErrorState from "@/components/ui/ErrorState"
import { useLoader } from "@/lib/useLoader"
import { ensure, safe, notifyError } from "@/lib/net"
import { EXAM_TYPES } from "@/lib/questionRules"

const inputClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm outline-none md:text-sm"
const labelClass = "text-sm font-medium leading-none"
const lockedBox = "flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm text-muted cursor-not-allowed"
const whole = (v) => { const n = Number(v); return Number.isInteger(n) ? n : NaN }

export default function ExamForm({ examId = null }) {
    const router = useRouter();
    const editing = Boolean(examId);

    const [title, setTitle] = useState("");
    const [examType, setExamType] = useState("Internal test");
    const [subject, setSubject] = useState("");
    const [duration, setDuration] = useState("20");
    const [count, setCount] = useState("20");
    const [passMark, setPassMark] = useState("50");
    const [description, setDescription] = useState("");
    const [hasObjective, setHasObjective] = useState(true);
    const [hasTheory, setHasTheory] = useState(false);
    const [saving, setSaving] = useState(false);

    const { data, error, loading, reload } = useLoader(async () => {
        const { data: profile } = ensure(await supabase.rpc("get_my_profile"));
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Your session has expired. Please log in again.");

        const base = { subjects: profile?.subjects ?? [], userId: session.user.id, exam: null, kinds: { objective: 0, theory: 0 } };
        if (!examId) return base;

        const examRes = ensure(await supabase.from("exams").select("*").eq("id", examId).maybeSingle());
        if (!examRes.data) return base;

        const links = ensure(await supabase.from("exam_questions").select("questions(question_type)").eq("exam_id", examId));
        const types = (links.data ?? []).map((l) => l.questions?.question_type).filter(Boolean);

        return {
            ...base,
            exam: examRes.data,
            kinds: {
                objective: types.filter((t) => t !== "Theory").length,
                theory: types.filter((t) => t === "Theory").length,
            },
        };
    }, [examId]);

    // fill the form once the data has loaded
    useEffect(() => {
        if (!data) return;
        if (data.exam) {
            const e = data.exam;
            setTitle(e.title ?? "");
            setExamType(e.exam_type);
            setSubject(e.subject);
            setDuration(String(e.duration_minutes));
            setCount(String(e.number_of_questions));
            setPassMark(String(e.pass_mark ?? 50));
            setDescription(e.description ?? "");
            setHasObjective(e.has_objective !== false);
            setHasTheory(Boolean(e.has_theory));
        } else {
            setSubject((current) => current || data.subjects[0] || "");
        }
    }, [data]);

    if (loading) return <PageLoader />;
    if (error) return <ErrorState message={error} onRetry={reload} />;

    const cancelHref = editing ? `/Teacher/exams/${examId}/review` : "/Teacher/exams";

    if (editing && !data.exam) {
        return (
            <main className="mx-auto max-w-2xl px-4 py-12 text-center">
                <p>This exam doesn't exist or isn't yours.</p>
                <Link href="/Teacher/exams" className="mt-4 inline-block text-primary hover:underline">Back to my exams</Link>
            </main>
        );
    }
    if (editing && !["draft", "rejected"].includes(data.exam.status)) {
        return (
            <main className="mx-auto max-w-2xl px-4 py-12 text-center">
                <p>This exam can't be edited while it is {data.exam.status === "pending" ? "waiting for approval" : "published"}.</p>
                {data.exam.status === "pending" && <p className="mt-1 text-sm text-muted">Withdraw it from the review page first.</p>}
                <Link href={cancelHref} className="mt-4 inline-block text-primary hover:underline">Back to the exam</Link>
            </main>
        );
    }

    const added = data.kinds.objective + data.kinds.theory;
    const subjectOptions = Array.from(new Set([...(data.exam ? [data.exam.subject] : []), ...data.subjects]));

    async function handleSubmit(e) {
        e.preventDefault();
        if (saving) return;

        const t = title.trim();
        const d = whole(duration);
        const n = whole(count);
        const p = whole(passMark);

        if (!t) { toast.error("Enter the exam title"); return; }
        if (t.length > 120) { toast.error("The title is too long (120 characters at most)"); return; }
        if (!subject) { toast.error("Choose a subject. If the list is empty, add subjects in Profile settings."); return; }
        if (!(d >= 1 && d <= 600)) { toast.error("Duration must be a whole number of minutes, from 1 to 600"); return; }
        if (!(n >= 1 && n <= 300)) { toast.error("Number of questions must be from 1 to 300"); return; }
        if (!(p >= 1 && p <= 100)) { toast.error("Pass mark must be from 1 to 100"); return; }
        if (!hasObjective && !hasTheory) { toast.error("Turn on at least one section"); return; }

        const fields = {
            title: t,
            exam_type: examType,
            subject,
            duration_minutes: d,
            number_of_questions: n,
            pass_mark: p,
            description: description.trim() || null,
            has_objective: hasObjective,
            has_theory: hasTheory,
        };

        setSaving(true);

        if (editing) {
            const { data: saved, error: saveError } = await safe(
                supabase.from("exams").update(fields).eq("id", examId).select("id"),
                20000
            );
            setSaving(false);
            if (saveError) { notifyError(saveError, "Could not save"); return; }
            if (!saved || saved.length === 0) {
                toast.error("That change wasn't allowed. The exam may already be sent for approval.");
                return;
            }
            toast.success("Exam details saved");
            router.push(`/Teacher/exams/${examId}/review`);
            return;
        }

        const { data: created, error: createError } = await safe(
            supabase.from("exams").insert({ ...fields, created_by: data.userId }).select("id").single(),
            20000
        );
        setSaving(false);
        if (createError) { notifyError(createError, "Could not create the exam"); return; }
        router.push(`/Teacher/exams/${created.id}`);
    }

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            {!editing && <p className="text-xs font-medium uppercase tracking-wide text-muted">Step 1 of 2</p>}
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{editing ? "Edit exam details" : "Create exam"}</h1>
            <p className="mt-1 text-sm text-muted">
                {editing ? "Change the details below, then save." : "Fill in the details. Next you'll add questions."}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 max-w-3xl space-y-5 rounded-xl border border-border bg-card p-6">
                <div className="space-y-2">
                    <label htmlFor="title" className={labelClass}>Exam title</label>
                    <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. SS2 Physics mock" className={inputClass} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                        <label className={labelClass}>Exam type</label>
                        {added > 0 ? <div className={lockedBox}>{examType}</div> : <FilterDropdown options={EXAM_TYPES} value={examType} onChange={setExamType} />}
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className={labelClass}>Subject</label>
                        {added > 0
                            ? <div className={lockedBox}>{subject}</div>
                            : subjectOptions.length === 0
                                ? <div className={lockedBox}>No subjects saved</div>
                                : <FilterDropdown options={subjectOptions} value={subject} onChange={setSubject} />}
                    </div>
                </div>
                {added > 0 && (
                    <p className="-mt-2 text-xs text-muted">Subject and exam type are fixed because this exam already has questions.</p>
                )}

                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                        <label htmlFor="duration" className={labelClass}>Duration (minutes)</label>
                        <input id="duration" type="number" min={1} max={600} value={duration} onChange={(e) => setDuration(e.target.value)} className={inputClass} />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="count" className={labelClass}>Total number of questions</label>
                        <input id="count" type="number" min={1} max={300} value={count} onChange={(e) => setCount(e.target.value)} className={inputClass} />
                        {added > 0 && <p className="text-xs text-muted">{added} added so far</p>}
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="pass" className={labelClass}>Pass mark (%)</label>
                        <input id="pass" type="number" min={1} max={100} value={passMark} onChange={(e) => setPassMark(e.target.value)} className={inputClass} />
                    </div>
                </div>

                <div className="space-y-3">
                    <Toggle
                        checked={hasObjective}
                        onChange={setHasObjective}
                        disabled={data.kinds.objective > 0}
                        label="Section A: objective questions"
                        hint={data.kinds.objective > 0 ? "This exam already has objective questions." : "Questions with options the student picks from."}
                    />
                    <Toggle
                        checked={hasTheory}
                        onChange={setHasTheory}
                        disabled={data.kinds.theory > 0}
                        label="Section B: theory questions"
                        hint={data.kinds.theory > 0 ? "This exam already has theory questions." : "Written answers, marked by the teacher."}
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="description" className={labelClass}>Description (optional)</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm outline-none"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {saving ? "Saving..." : editing ? "Save changes" : "Continue to add questions"}
                    </button>
                    <Link href={cancelHref} className="inline-flex h-10 items-center px-3 text-sm font-medium hover:underline">Cancel</Link>
                </div>
            </form>
        </main>
    )
}