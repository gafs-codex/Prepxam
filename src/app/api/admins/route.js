import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const noSession = { auth: { persistSession: false, autoRefreshToken: false } }

export async function POST(request) {
    if (!serviceKey) {
        return NextResponse.json({ error: "The server is missing SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 })
    }

    // 1. who is calling?
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

    const userClient = createClient(url, anonKey, {
        ...noSession,
        global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser(token)
    if (userError || !user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

    // 2. only the super admin may continue
    const { data: isSuper } = await userClient.rpc("is_super_admin")
    if (!isSuper) return NextResponse.json({ error: "Only the super admin can do this." }, { status: 403 })

    // 3. read the form
    let body
    try { body = await request.json() } catch { body = {} }
    const fullName = String(body.fullName ?? "").trim()
    const email = String(body.email ?? "").trim().toLowerCase()
    const password = String(body.password ?? "")

    if (!email || !email.includes("@")) {
        return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
    }

    const admin = createClient(url, serviceKey, noSession)

    // 4. existing account, or a new one?
    const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle()

    let userId = existing?.id ?? null
    let created = false

    if (!userId) {
        if (fullName === "" || password.length < 8) {
            return NextResponse.json(
                { error: "For a new account, enter a full name and a password of at least 8 characters." },
                { status: 400 }
            )
        }

        const { data: made, error: createError } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName, role: "admin" },
        })
        if (createError) return NextResponse.json({ error: createError.message }, { status: 400 })

        userId = made.user.id
        created = true
    }

    // 5. promote, using the caller's own session so the database rules apply
    const { error: promoteError } = await userClient.rpc("make_school_admin", { p_user_id: userId })
    if (promoteError) {
        if (created) await admin.auth.admin.deleteUser(userId) // undo the new account
        return NextResponse.json({ error: promoteError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, created })
}