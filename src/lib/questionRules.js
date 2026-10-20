import { SUBJECTS } from "@/data/subjects"

export const QUESTION_TYPES = ["Multiple choice", "True or false", "Fill in the gap"]
export const EXAM_TYPES = ["Internal test", "WAEC", "NECO", "JAMB", "GCE"]
export const MAX_QUESTIONS_PER_FILE = 500

export const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim()

function findIgnoringCase(list, value) {
    const wanted = clean(value).toLowerCase()
    return list.find((item) => item.toLowerCase() === wanted) ?? null
}

function readType(raw) {
    const t = clean(raw).toLowerCase()
    if (!t) return null                                   // not given. We work it out
    if (t.includes("true") || t.includes("t/f") || t.includes("boolean")) return "True or false"
    if (t.includes("gap") || t.includes("fill") || t.includes("blank")) return "Fill in the gap"
    if (t.includes("multiple") || t.includes("choice") || t === "mcq" || t === "objective") return "Multiple choice"
    return undefined                                      // given, but not one we know
}

const isTrueFalse = (options) =>
    options.length === 2 && options.map((o) => o.toLowerCase()).sort().join("|") === "false|true"

// "B", "b.", "(B)", "B) Paris" -> a letter. Anything else -> null
function letterIndex(answer) {
    const m = answer.match(/^\(?([A-Fa-f])\)?(?:\s*[.):\-]\s*.*)?$/)
    return m ? m[1].toUpperCase().charCodeAt(0) - 65 : null
}

function resolveAnswer(answerRaw, options) {
    const answer = clean(answerRaw)
    if (!answer) return { problem: "No answer given" }

    const letter = letterIndex(answer)
    if (letter !== null) {
        if (letter >= options.length) {
            return { problem: `The answer is option ${String.fromCharCode(65 + letter)} but there are only ${options.length} options` }
        }
        return { index: letter }
    }

    const hits = options.map((o, i) => (o.toLowerCase() === answer.toLowerCase() ? i : -1)).filter((i) => i >= 0)
    if (hits.length === 1) return { index: hits[0] }

    return { problem: `The answer "${answer.slice(0, 40)}" doesn't match exactly one option` }
}

function resolveTrueFalse(answerRaw, given) {
    const text = clean(answerRaw)
    const a = text.toLowerCase().replace(/[.)\s]+$/, "")
    if (!a) return { problem: "No answer given" }
    if (a === "true" || a === "t") return { truth: true }
    if (a === "false" || a === "f") return { truth: false }

    // a letter, read against the order the options were written in
    const letter = letterIndex(text)
    if (letter !== null && given.length === 2) return { truth: given[letter].toLowerCase() === "true" }
    if (letter !== null && given.length === 0 && letter < 2) return { truth: letter === 0 }

    return { problem: "The answer must be True or False" }
}

// raw: { question, type, options[], answer, explanation, subject, examType, answerIndex? }
export function normalizeQuestion(raw, defaults) {
    const text = clean(raw.question)
    if (text.length < 3) return { ok: false, problem: "The question is empty or too short" }
    if (text.length > 2000) return { ok: false, problem: "The question is over 2,000 characters" }

    const subjectGiven = clean(raw.subject) || clean(defaults.subject)
    const subject = findIgnoringCase(SUBJECTS, subjectGiven)
    if (!subject) return { ok: false, problem: `Unknown subject: ${subjectGiven || "none chosen"}` }

    const examGiven = clean(raw.examType) || clean(defaults.examType)
    const examType = findIgnoringCase(EXAM_TYPES, examGiven)
    if (!examType) return { ok: false, problem: `Unknown exam type: ${examGiven || "none chosen"}` }

    // a gap in the middle would shift the letters, so it's rejected
    let options = (raw.options ?? []).map(clean)
    while (options.length && options[options.length - 1] === "") options.pop()
    const blank = options.findIndex((o) => o === "")
    if (blank >= 0) return { ok: false, problem: `Option ${String.fromCharCode(65 + blank)} is empty` }
    if (options.some((o) => o.length > 500)) return { ok: false, problem: "An option is over 500 characters" }

    let type = readType(raw.type)
    if (type === undefined) return { ok: false, problem: `Unknown question type: ${clean(raw.type).slice(0, 30)}` }
    if (type === null) {
        const a = clean(raw.answer).toLowerCase()
        const looksTrueFalse = isTrueFalse(options) || (options.length === 0 && ["true", "false", "t", "f"].includes(a))
        type = looksTrueFalse ? "True or false" : "Multiple choice"
    }

    let correct
    if (type === "True or false") {
        if (options.length > 0 && !isTrueFalse(options)) {
            return { ok: false, problem: "A true or false question must have the options True and False" }
        }
        let truth
        if (Number.isInteger(raw.answerIndex)) {
            // used by the server, which re-checks what the page sent
            if (options.length !== 2 || raw.answerIndex < 0 || raw.answerIndex > 1) {
                return { ok: false, problem: "Invalid answer" }
            }
            truth = options[raw.answerIndex].toLowerCase() === "true"
        } else {
            const r = resolveTrueFalse(raw.answer, options)
            if (r.problem) return { ok: false, problem: r.problem }
            truth = r.truth
        }
        options = ["True", "False"]
        correct = truth ? 0 : 1
    } else {
        if (options.length < 2) return { ok: false, problem: "At least two options are needed" }
        if (options.length > 6) return { ok: false, problem: "More than six options" }
        if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
            return { ok: false, problem: "Two options are the same" }
        }
        if (Number.isInteger(raw.answerIndex)) {
            if (raw.answerIndex < 0 || raw.answerIndex >= options.length) return { ok: false, problem: "Invalid answer" }
            correct = raw.answerIndex
        } else {
            const r = resolveAnswer(raw.answer, options)
            if (r.problem) return { ok: false, problem: r.problem }
            correct = r.index
        }
    }

    return {
        ok: true,
        question: {
            question_text: text,
            question_type: type,
            subject,
            exam_type: examType,
            options,
            correct_index: correct,
            explanation: clean(raw.explanation).slice(0, 2000),
        },
    }
}

export const questionKey = (q) => `${q.subject}|${q.exam_type}|${q.question_text.toLowerCase()}`