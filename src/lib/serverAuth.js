import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { randomInt } from "crypto"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const noSession = { auth: { persistSession: false, autoRefreshToken: false } }

// responses that carry passwords must never be cached
export function reply(body, status = 200) {
    return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } })
}

// Confirms the caller is a school admin or super admin. Returns { response } to stop, or the clients.
export async function requireAdmin(request) {
    if (!serviceKey) return { response: reply({ error: "The server is missing SUPABASE_SERVICE_ROLE_KEY." }, 500) }

    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) return { response: reply({ error: "Not signed in." }, 401) }

    const userClient = createClient(url, anonKey, {
        ...noSession,
        global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user }, error } = await userClient.auth.getUser(token)
    if (error || !user) return { response: reply({ error: "Not signed in." }, 401) }

    const { data: isAdmin } = await userClient.rpc("is_admin")
    if (!isAdmin) return { response: reply({ error: "Only school admins can do this." }, 403) }

    return { user, userClient, service: createClient(url, serviceKey, noSession) }
}

// unambiguous characters (no 0/O, 1/l/I)
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"

export function makePassword(length = 8) {
    let out = ""
    for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)]
    return out
}

export async function writeAudit(service, actor, entry) {
    try {
        const { data } = await service.from("profiles").select("full_name, email").eq("id", actor.id).maybeSingle()
        await service.from("audit_log").insert({
            actor_id: actor.id,
            actor_name: data?.full_name ?? data?.email ?? "Admin",
            ...entry,
        })
    } catch (err) {
        console.error("Audit write failed:", err)
    }
}

export function serviceClient() {
    if (!url || !serviceKey) return null
    return createClient(url, serviceKey, noSession)
}

// Confirms the caller is an approved teacher or an admin.
export async function requireImporter(request) {
    if (!serviceKey) return { response: reply({ error: "The server is missing SUPABASE_SERVICE_ROLE_KEY." }, 500) }

    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) return { response: reply({ error: "Not signed in." }, 401) }

    const userClient = createClient(url, anonKey, {
        ...noSession,
        global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user }, error } = await userClient.auth.getUser(token)
    if (error || !user) return { response: reply({ error: "Not signed in." }, 401) }

    const [admin, teacher] = await Promise.all([
        userClient.rpc("is_admin"),
        userClient.rpc("is_approved_teacher"),
    ])
    const isAdmin = Boolean(admin.data)
    if (!isAdmin && !teacher.data) {
        return { response: reply({ error: "Only approved teachers and admins can import questions." }, 403) }
    }

    return { user, isAdmin, service: createClient(url, serviceKey, noSession) }
}