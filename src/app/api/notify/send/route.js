import { timingSafeEqual } from "crypto"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const maxDuration = 60

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const brevoKey = process.env.BREVO_API_KEY
const senderEmail = process.env.BREVO_SENDER_EMAIL
const senderName = process.env.BREVO_SENDER_NAME || "Prepxam"
const siteUrl = (process.env.SITE_URL || "").replace(/\/$/, "")
const secret = process.env.NOTIFY_SECRET || ""
const schoolEmails = (process.env.SCHOOL_NOTIFY_EMAIL || "")
    .split(",").map((s) => s.trim()).filter((e) => e.includes("@"))

const ADMIN_TYPES = ["user_pending", "exam_pending"]
const TEACHER_TYPES = ["account_approved", "account_rejected", "exam_approved", "exam_rejected", "results_released"]

function authorised(request) {
    if (!secret) return false
    const given = request.headers.get("authorization")?.replace("Bearer ", "") ?? ""
    const a = Buffer.from(given)
    const b = Buffer.from(secret)
    return a.length === b.length && timingSafeEqual(a, b)
}

// names and exam titles come from users, so they must never be able to inject HTML
const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]))

function render({ heading, intro, items, buttonLabel, buttonUrl }) {
    const shown = items.slice(0, 15)
    const rows = shown.map((i) => `
        <tr><td style="padding:12px 0;border-top:1px solid #e5e7eb">
            <div style="font-weight:600">${esc(i.title)}</div>
            ${i.body ? `<div style="color:#6b7280;font-size:14px;margin-top:2px">${esc(i.body)}</div>` : ""}
        </td></tr>`).join("")
    const more = items.length > shown.length
        ? `<p style="color:#6b7280;font-size:14px">and ${items.length - shown.length} more.</p>` : ""

    return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827">
        <h2 style="margin:0 0 8px">${esc(heading)}</h2>
        <p style="margin:0 0 16px;color:#374151">${esc(intro)}</p>
        <table style="width:100%;border-collapse:collapse">${rows}</table>${more}
        <p style="margin:24px 0"><a href="${esc(buttonUrl)}" style="background:#2954bc;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">${esc(buttonLabel)}</a></p>
        <p style="color:#9ca3af;font-size:12px">You're receiving this because of activity on ${esc(senderName)}.</p>
    </div>`
}

async function sendEmail(to, subject, html) {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": brevoKey, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
            sender: { name: senderName, email: senderEmail },
            to: to.map((email) => ({ email })),
            subject,
            htmlContent: html,
        }),
    })
    if (!res.ok) throw new Error(`Brevo ${res.status}: ${(await res.text()).slice(0, 200)}`)
}

export async function POST(request) {
    if (!authorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const missing = [
        !serviceKey && "SUPABASE_SERVICE_ROLE_KEY", !brevoKey && "BREVO_API_KEY",
        !senderEmail && "BREVO_SENDER_EMAIL", !siteUrl && "SITE_URL",
    ].filter(Boolean)
    if (missing.length) return NextResponse.json({ error: `Missing settings: ${missing.join(", ")}` }, { status: 500 })

    const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

    // without a school address there is nowhere to send the admin digest, so leave those rows alone
    const types = [...TEACHER_TYPES, ...(schoolEmails.length ? ADMIN_TYPES : [])]
    const since = new Date(Date.now() - 2 * 86400_000).toISOString()

    // claim the rows in one step, so two runs can never send the same email twice
    const { data: claimed, error: claimError } = await service
        .from("notifications")
        .update({ emailed_at: new Date().toISOString() })
        .is("emailed_at", null)
        .in("type", types)
        .gte("created_at", since)
        .select("id, user_id, type, title, body, link, created_at")

    if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 })
    if (!claimed || claimed.length === 0) return NextResponse.json({ sent: 0, failed: 0 })

    const failedIds = []
    let sent = 0

    // 1. one digest for the school
    const adminRows = claimed.filter((r) => ADMIN_TYPES.includes(r.type))
    if (adminRows.length > 0) {
        // each school admin gets their own copy of a notification, so collapse the duplicates
        const seen = new Set()
        const unique = adminRows.filter((r) => {
            const key = `${r.type}|${r.body}|${r.link}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })

        const users = unique.filter((r) => r.type === "user_pending").length
        const exams = unique.filter((r) => r.type === "exam_pending").length
        const parts = []
        if (users) parts.push(`${users} registration${users === 1 ? "" : "s"}`)
        if (exams) parts.push(`${exams} exam${exams === 1 ? "" : "s"}`)

        try {
            await sendEmail(
                schoolEmails,
                `${parts.join(" and ")} waiting for approval`,
                render({
                    heading: "Waiting for the school",
                    intro: "These need a decision from the school admin.",
                    items: unique,
                    buttonLabel: users ? "Review registrations" : "Review exams",
                    buttonUrl: `${siteUrl}${users ? "/Admin/user" : "/Admin/exam"}`,
                })
            )
            sent++
        } catch (err) {
            console.error("School digest failed:", err)
            failedIds.push(...adminRows.map((r) => r.id))
        }
    }

    // 2. one email per teacher
    const byTeacher = new Map()
    for (const r of claimed.filter((r) => TEACHER_TYPES.includes(r.type))) {
        if (!byTeacher.has(r.user_id)) byTeacher.set(r.user_id, [])
        byTeacher.get(r.user_id).push(r)
    }

    if (byTeacher.size > 0) {
        const { data: profiles } = await service
            .from("profiles").select("id, full_name, email").in("id", [...byTeacher.keys()])
        const byId = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))

        for (const [userId, rows] of byTeacher) {
            const person = byId[userId]
            if (!person?.email) continue   // no address on file. They still see it in the bell

            try {
                await sendEmail(
                    [person.email],
                    rows.length === 1 ? rows[0].title : `${rows.length} updates on ${senderName}`,
                    render({
                        heading: rows.length === 1 ? rows[0].title : "Updates for you",
                        intro: `Hello ${person.full_name?.split(" ")[0] ?? "there"},`,
                        items: rows,
                        buttonLabel: "Open Prepxam",
                        buttonUrl: `${siteUrl}${rows.length === 1 && rows[0].link ? rows[0].link : "/Teacher/dashboard"}`,
                    })
                )
                sent++
            } catch (err) {
                console.error("Teacher email failed:", err)
                failedIds.push(...rows.map((r) => r.id))
            }
        }
    }

    // a failed send is released, so the next run tries again
    if (failedIds.length > 0) {
        await service.from("notifications").update({ emailed_at: null }).in("id", failedIds)
    }

    return NextResponse.json({ sent, failed: failedIds.length })
}