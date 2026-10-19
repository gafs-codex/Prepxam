import { reply, serviceClient } from "@/lib/serverAuth"
import { admissionKey, admissionEmail } from "@/lib/admission"
import { SUBJECTS } from "@/data/subjects"

const MAX_PENDING_PER_HOUR = 100

export async function POST(request) {
    const service = serviceClient()
    if (!service) return reply({ error: "The server isn't set up for sign-ups yet." }, 500)

    let body
    try { body = await request.json() } catch { body = {} }

    const fullName = String(body.fullName ?? "").trim()
    const admission = String(body.admissionNumber ?? "").trim()
    const password = String(body.password ?? "")
    const wanted = Array.isArray(body.subjects) ? body.subjects : []

    if (!fullName || fullName.length > 100) return reply({ error: "Enter your full name." }, 400)
    if (!admissionKey(admission) || admission.length > 40) return reply({ error: "Enter a valid admission number." }, 400)
    if (password.length < 6 || password.length > 72) return reply({ error: "Password must be 6 to 72 characters." }, 400)

    const subjects = []
    for (const raw of wanted) {
        const match = SUBJECTS.find((s) => s === raw)
        if (!match) return reply({ error: "One of the subjects isn't valid." }, 400)
        if (!subjects.includes(match)) subjects.push(match)
    }
    if (subjects.length === 0) return reply({ error: "Choose at least one subject." }, 400)

    // a ceiling, so nobody can flood the school's approval list
    const since = new Date(Date.now() - 3600_000).toISOString()
    const { count } = await service
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "student").eq("status", "pending").gte("created_at", since)
    if ((count ?? 0) >= MAX_PENDING_PER_HOUR) {
        return reply({ error: "Too many registrations right now. Try again later, or ask the school to add you." }, 429)
    }

    const { error } = await service.auth.admin.createUser({
        email: admissionEmail(admission),
        password,
        email_confirm: true,                        // no email is ever sent. The school's approval is the check
        user_metadata: { full_name: fullName, subjects },
        app_metadata: { self_student: true, admission_number: admission },
    })

    if (error) {
        const text = String(error.message).toLowerCase()
        if (text.includes("already") || text.includes("registered")) {
            return reply({ error: "This admission number already has an account. If it's yours, ask the school for your login." }, 409)
        }
        return reply({ error: "We couldn't create the account. Check the admission number and try again." }, 400)
    }

    return reply({ ok: true })
}