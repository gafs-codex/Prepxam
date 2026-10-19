import { requireAdmin, makePassword, writeAudit, reply } from "@/lib/serverAuth"

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request) {
    const auth = await requireAdmin(request)
    if (auth.response) return auth.response
    const { service, user } = auth

    let body
    try { body = await request.json() } catch { body = {} }
    const userId = String(body.userId ?? "")
    if (!uuid.test(userId)) return reply({ error: "Invalid user." }, 400)

    const { data: target } = await service
        .from("profiles")
        .select("id, full_name, email, admission_number, role")
        .eq("id", userId)
        .maybeSingle()
    if (!target) return reply({ error: "User not found." }, 404)

    // admin accounts are never reset from here
    const { data: adminRow } = await service.from("admins").select("user_id").eq("user_id", userId).maybeSingle()
    if (adminRow || !["student", "teacher"].includes(target.role)) {
        return reply({ error: "Admin passwords can't be reset here." }, 403)
    }

    const password = makePassword(10)
    const { error } = await service.auth.admin.updateUserById(userId, { password })
    if (error) return reply({ error: "Could not reset the password. Nothing was changed." }, 400)

    await service.from("profiles").update({ must_change_password: true }).eq("id", userId)

    await writeAudit(service, user, {
        action: "user.password_reset",
        target_type: "user",
        target_id: userId,
        target_label: target.full_name ?? target.email ?? target.admission_number,
        details: { role: target.role },
    })

    return reply({
        ok: true,
        password,
        name: target.full_name,
        identifier: target.email ?? target.admission_number,
    })
}