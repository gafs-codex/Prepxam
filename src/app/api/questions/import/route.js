import { requireImporter, writeAudit, reply } from "@/lib/serverAuth"
import { normalizeQuestion, questionKey } from "@/lib/questionRules"

export const maxDuration = 60

const MAX_PER_REQUEST = 100
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// subjects each teacher teaches: { teacherId: ["English Language", ...] }
async function subjectsOf(service, teacherIds) {
    const byTeacher = Object.fromEntries(teacherIds.map((id) => [id, []]))
    if (teacherIds.length === 0) return byTeacher

    const { data: links, error } = await service
        .from("teacher_subjects").select("teacher_id, subject_id").in("teacher_id", teacherIds)
    if (error) throw error

    const subjectIds = [...new Set((links ?? []).map((l) => l.subject_id))]
    if (subjectIds.length === 0) return byTeacher

    const { data: subjects, error: subjectError } = await service
        .from("subjects").select("id, name").in("id", subjectIds)
    if (subjectError) throw subjectError

    const names = Object.fromEntries((subjects ?? []).map((s) => [s.id, s.name]))
    for (const link of links ?? []) {
        if (names[link.subject_id]) byTeacher[link.teacher_id].push(names[link.subject_id])
    }
    for (const id of teacherIds) byTeacher[id].sort()
    return byTeacher
}

export async function POST(request) {
    const auth = await requireImporter(request)
    if (auth.response) return auth.response
    const { service, user, isAdmin } = auth

    let body
    try { body = await request.json() } catch { body = {} }

    try {
        // who can receive questions, and what they teach
        if (body.action === "context") {
            let owners
            if (isAdmin) {
                const { data, error } = await service
                    .from("profiles").select("id, full_name, email")
                    .eq("role", "teacher").eq("status", "approved").eq("disabled", false)
                    .order("full_name")
                if (error) throw error
                owners = data ?? []
            } else {
                const { data, error } = await service
                    .from("profiles").select("id, full_name, email").eq("id", user.id).single()
                if (error) throw error
                owners = [data]
            }

            const subjects = await subjectsOf(service, owners.map((o) => o.id))
            return reply({
                isAdmin,
                owners: owners.map((o) => ({
                    id: o.id,
                    name: o.full_name ?? o.email ?? "Teacher",
                    subjects: subjects[o.id] ?? [],
                })),
            })
        }

        if (body.action === "import") {
            const ownerId = isAdmin ? String(body.ownerId ?? "") : user.id
            if (!uuid.test(ownerId)) return reply({ error: "Choose a teacher first." }, 400)

            const { data: owner } = await service
                .from("profiles").select("id, full_name, email, role, status, disabled")
                .eq("id", ownerId).maybeSingle()
            if (!owner || owner.role !== "teacher" || owner.status !== "approved" || owner.disabled) {
                return reply({ error: "That teacher can't receive questions." }, 400)
            }

            const incoming = Array.isArray(body.questions) ? body.questions : []
            if (incoming.length === 0) return reply({ error: "No questions were sent." }, 400)
            if (incoming.length > MAX_PER_REQUEST) {
                return reply({ error: `Send at most ${MAX_PER_REQUEST} questions at a time.` }, 400)
            }

            const allowed = (await subjectsOf(service, [ownerId]))[ownerId] ?? []

            // check every question again. Nothing from the browser is trusted
            const rows = []
            const seen = new Set()
            let invalid = 0
            let notTheirSubject = 0

            for (const q of incoming) {
                const result = normalizeQuestion({
                    question: q?.question_text,
                    type: q?.question_type,
                    options: q?.options,
                    answerIndex: q?.correct_index,
                    explanation: q?.explanation,
                    subject: q?.subject,
                    examType: q?.exam_type,
                }, {})

                if (!result.ok) { invalid++; continue }
                if (!allowed.includes(result.question.subject)) { notTheirSubject++; continue }

                const key = questionKey(result.question)
                if (seen.has(key)) continue
                seen.add(key)
                rows.push(result.question)
            }

            // skip anything this teacher already has
            const existing = new Set()
            const groups = new Map(rows.map((r) => [`${r.subject}|${r.exam_type}`, [r.subject, r.exam_type]]))
            for (const [subject, examType] of groups.values()) {
                const { data, error } = await service
                    .from("questions").select("question_text")
                    .eq("created_by", ownerId).eq("subject", subject).eq("exam_type", examType)
                    .range(0, 4999)
                if (error) throw error
                for (const e of data ?? []) {
                    const text = String(e.question_text).replace(/\s+/g, " ").trim().toLowerCase()
                    existing.add(`${subject}|${examType}|${text}`)
                }
            }
            const fresh = rows.filter((r) => !existing.has(questionKey(r)))
            const duplicates = rows.length - fresh.length

            if (fresh.length > 0) {
                const { error } = await service
                    .from("questions").insert(fresh.map((q) => ({ ...q, created_by: ownerId })))
                if (error) throw error

                await writeAudit(service, user, {
                    action: "questions.imported",
                    target_type: "questions",
                    target_label: `${fresh.length} question${fresh.length === 1 ? "" : "s"}`,
                    details: { owner: owner.full_name ?? owner.email, count: fresh.length, subject: fresh[0].subject },
                })
            }

            return reply({ inserted: fresh.length, duplicates, invalid, notTheirSubject })
        }

        return reply({ error: "Unknown request." }, 400)
    } catch (err) {
        console.error("Question import failed:", err)
        return reply({ error: "Something went wrong on the server. This batch was not saved." }, 500)
    }
}