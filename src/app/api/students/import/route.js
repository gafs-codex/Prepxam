import { requireAdmin, makePassword, writeAudit, reply } from "@/lib/serverAuth"
import { admissionKey, admissionEmail, lastFourDigits, loginPassword } from "@/lib/admission"
import { SUBJECTS } from "@/data/subjects"

export const maxDuration = 60

async function importOne(service, row, useDigits) {
    const admission = String(row?.admissionNumber ?? "").trim()
    const fullName = String(row?.fullName ?? "").trim()
    const label = admission || "(blank)"

    if (!admissionKey(admission) || admission.length > 40) {
        return { admission: label, status: "error", message: "Invalid admission number" }
    }
    if (!fullName || fullName.length > 100) {
        return { admission: label, status: "error", message: "Missing or too long name" }
    }

    // match subjects to the official names, ignoring capital letters
    const wanted = Array.isArray(row.subjects) ? row.subjects : []
    const subjects = []
    for (const raw of wanted) {
        const match = SUBJECTS.find((s) => s.toLowerCase() === String(raw).trim().toLowerCase())
        if (!match) return { admission: label, status: "error", message: `Unknown subject: ${raw}` }
        if (!subjects.includes(match)) subjects.push(match)
    }

    const given = String(row.password ?? "")
    if (given && given.length < 8) {
        return { admission: label, status: "error", message: "A password must be at least 8 characters" }
    }

    // what the student types at login: the file's password, else the last 4 digits, else a random one
    const shown = given || (useDigits && lastFourDigits(admission)) || makePassword(8)

    try {
        const { error } = await service.auth.admin.createUser({
            email: admissionEmail(admission),
            password: loginPassword(shown),          // a 4-digit password is padded so Supabase accepts it
            email_confirm: true,                      // so no email is ever sent
            user_metadata: { full_name: fullName, subjects },
            app_metadata: { imported: true, admission_number: admission },
        })

        if (error) {
            const text = String(error.message).toLowerCase()
            if (text.includes("already") || text.includes("registered")) {
                return { admission: label, status: "exists", message: "Already has an account" }
            }
            if (text.includes("database error")) {
                return { admission: label, status: "error", message: "Could not create it. The admission number may already be in use." }
            }
            return { admission: label, status: "error", message: error.message }
        }
    } catch (err) {
        console.error("Import failed for", label, err)
        return { admission: label, status: "error", message: "Unexpected error while creating this account" }
    }

    return { admission, fullName, status: "created", password: shown }
}

export async function POST(request) {
    try {
        const auth = await requireAdmin(request)
        if (auth.response) return auth.response
        const { service, user } = auth

        let body
        try { body = await request.json() } catch { body = {} }

        const useDigits = body.useAdmissionDigits === true
        const rows = Array.isArray(body.rows) ? body.rows.slice(0, 25) : []
        if (rows.length === 0) return reply({ error: "No students were sent." }, 400)

        const results = []
        for (const row of rows) results.push(await importOne(service, row, useDigits))

        const created = results.filter((r) => r.status === "created").length
        if (created > 0) {
            await writeAudit(service, user, {
                action: "students.imported",
                target_type: "students",
                target_label: `${created} student${created === 1 ? "" : "s"}`,
                details: { created, skipped: results.length - created },
            })
        }

        return reply({ results })
    } catch (err) {
        console.error("Student import failed:", err)
        return reply({
            error: process.env.NODE_ENV === "production"
                ? "The server hit an unexpected problem. Nothing more was imported."
                : `Server error: ${err.message}`,
        }, 500)
    }
}