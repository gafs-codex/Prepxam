import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const noSession = { auth: { persistSession: false, autoRefreshToken: false } }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request) {
    if (!serviceKey) {
        return NextResponse.json({ error: "The server is missing SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 })
    }

    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

    const userClient = createClient(url, anonKey, {
        ...noSession,
        global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser(token)
    if (userError || !user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

    const { data: isSuper } = await userClient.rpc("is_super_admin")
    if (!isSuper) return NextResponse.json({ error: "Only the super admin can do this." }, { status: 403 })

    let body
    try { body = await request.json() } catch { body = {} }
    const userId = String(body.userId ?? "")
    const disabled = body.disabled === true

    if (!uuid.test(userId)) return NextResponse.json({ error: "Invalid user." }, { status: 400 })

    // 1. the database checks the rules (not an admin, not yourself) and flips the flag
    const { error: dbError } = await userClient.rpc("set_user_disabled", {
        p_user_id: userId, p_disabled: disabled,
    })
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })

    // 2. lock or unlock the login itself
    const admin = createClient(url, serviceKey, noSession)
    const { error: banError } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: disabled ? "876000h" : "none",
    })

    if (banError) {
        await userClient.rpc("set_user_disabled", { p_user_id: userId, p_disabled: !disabled })
        return NextResponse.json({ error: "Could not change the login. Nothing was changed." }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
}