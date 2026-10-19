// Students sign in with an admission number. Behind the scenes it becomes a private
// email-style login id, because Supabase needs one. No email is ever sent to it.
export const STUDENT_EMAIL_DOMAIN =
    process.env.NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN || "students.prepxam.invalid";

// "ADM/2025/014" and "adm-2025-014" are the same student. Keep in step with the database index.
export function admissionKey(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function admissionEmail(value) {
    return `${admissionKey(value)}@${STUDENT_EMAIL_DOMAIN}`;
}