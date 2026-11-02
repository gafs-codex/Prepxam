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

// What to show for a person: the admission number, never the stand-in login address
// What to show for a person: the admission number, never the stand-in login address
export function displayId(person) {
    if (person?.admission_number) return person.admission_number;

    const email = String(person?.email ?? "");
    const suffix = `@${STUDENT_EMAIL_DOMAIN}`;
    if (email.toLowerCase().endsWith(suffix)) {
        // bc-std-2026-0404 -> BC/STD/2026/0404
        return email.slice(0, -suffix.length).toUpperCase().replace(/-/g, "/");
    }
    return email || "—";
}

// A short hidden prefix, so a 4-digit password reaches Supabase's 6-character minimum.
// Keep it in step with the SQL at the bottom of this message.
export const PASSWORD_PREFIX = "prepxam-"

// BC/STD/2021/0599 -> "0599". Null when the number has fewer than 4 digits.
export function lastFourDigits(admission) {
    const digits = String(admission ?? "").replace(/\D/g, "")
    return digits.length >= 4 ? digits.slice(-4) : null
}

// What the student typed -> what Supabase checks. Only a bare 4-digit password is padded.
export function loginPassword(typed) {
    const value = String(typed ?? "")
    return /^\d{4}$/.test(value) ? PASSWORD_PREFIX + value : value
}