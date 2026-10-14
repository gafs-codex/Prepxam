import { supabase } from "@/lib/supabase"

// where a person belongs, based on their role
export async function homeFor(role) {
    if (role === "teacher") return "/Teacher/dashboard"
    if (role === "student") return "/student/dashboard"

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return "/login"

    const { data } = await supabase
        .from("admins").select("role").eq("user_id", user.id).maybeSingle()

    return data?.role === "super_admin" ? "/Super/platform" : "/Admin/dashboard"
}