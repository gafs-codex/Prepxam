"use client"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { PageLoader } from "@/components/ui/Spinner"

const SUBJECTS = [
    "Mathematics", "English Language", "Physics", "Chemistry",
    "Biology", "Economics", "Government", "Geography",
    "Literature in English", "Agricultural Science", "Further Mathematics",
    "Commerce", "Financial Accounting", "Christian Religious Studies",
    "Islamic Religious Studies", "Civic Education", "Computer Studies", "History"
];

const inputClass = "flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm outline-none md:text-sm";
const labelClass = "text-sm font-medium leading-none";

function roleText(profile) {
    if (profile.admin_role === "super_admin") return "Super admin";
    if (profile.admin_role === "school_admin") return "School admin";
    return profile.role.charAt(0).toUpperCase() + profile.role.slice(1);
}

export default function ProfileSettings() {
    const [profile, setProfile] = useState(null);
    const [fullName, setFullName] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");
    const [subjects, setSubjects] = useState([]);
    const [imageFailed, setImageFailed] = useState(false);
    const [saving, setSaving] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => {
        async function load() {
            const { data, error } = await supabase.rpc("get_my_profile");
            if (error) {
                toast.error(`Could not load your profile: ${error.message}`);
                return;
            }
            setProfile(data);
            setFullName(data.full_name ?? "");
            setPhotoUrl(data.photo_url ?? "");
            setSubjects(data.subjects ?? []);
        }
        load();
    }, []);

    if (!profile) return <PageLoader />;

    const isAdmin = Boolean(profile.admin_role);
    const hasSubjects = !isAdmin && (profile.role === "teacher" || profile.role === "student");

    function toggleSubject(name) {
        setSubjects((prev) => prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]);
    }

    async function saveDetails(e) {
        e.preventDefault();

        if (fullName.trim() === "") {
            toast.error("Please enter your name");
            return;
        }
        if (photoUrl.trim() !== "" && !photoUrl.trim().startsWith("https://")) {
            toast.error("The photo link must start with https://");
            return;
        }
        if (hasSubjects && subjects.length === 0) {
            toast.error("Please select at least one subject");
            return;
        }

        setSaving(true);

        const { error } = await supabase.rpc("update_my_profile", {
            p_full_name: fullName.trim(),
            p_photo_url: photoUrl.trim(),
            p_subjects: hasSubjects ? subjects : [],
        });

        if (error) {
            setSaving(false);
            toast.error(error.message);
            return;
        }

        // keep sign-in metadata in step (the exam form reads a teacher's subjects from it)
        await supabase.auth.updateUser({
            data: hasSubjects
                ? { full_name: fullName.trim(), subjects }
                : { full_name: fullName.trim() },
        });

        setSaving(false);
        setImageFailed(false);
        toast.success("Profile updated");
    }

    async function changePassword(e) {
        e.preventDefault();

        if (!currentPassword) {
            toast.error("Enter your current password");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("The new password must be at least 6 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("The new passwords don't match");
            return;
        }
        if (newPassword === currentPassword) {
            toast.error("Choose a password different from the current one");
            return;
        }

        setChangingPassword(true);

        // Supabase doesn't check the old password itself, so verify it first
        const { error: checkError } = await supabase.auth.signInWithPassword({
            email: profile.email,
            password: currentPassword,
        });
        if (checkError) {
            setChangingPassword(false);
            toast.error("Your current password is incorrect");
            return;
        }

        const { error } = await supabase.auth.updateUser({ password: newPassword });
        setChangingPassword(false);

        if (error) {
            toast.error(error.message);
            return;
        }

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast.success("Password updated");
    }

    const showPhoto = photoUrl.trim().startsWith("https://") && !imageFailed;

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <h1 className="text-2xl font-semibold tracking-tight">Profile settings</h1>
            <p className="mt-1 text-sm text-muted">{roleText(profile)} · {profile.email}</p>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <form onSubmit={saveDetails} className="space-y-5 rounded-xl border border-border bg-card p-6">
                    <h2 className="text-lg font-semibold">Your details</h2>

                    <div className="flex items-start gap-4">
                        {showPhoto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={photoUrl.trim()}
                                alt=""
                                onError={() => setImageFailed(true)}
                                className="h-20 w-20 shrink-0 rounded-full border border-border object-cover"
                            />
                        ) : (
                            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-accent text-2xl font-semibold text-primary">
                                {(fullName.trim()[0] ?? "?").toUpperCase()}
                            </span>
                        )}
                        <div className="flex-1 space-y-2">
                            <label htmlFor="photo" className={labelClass}>Photo URL</label>
                            <input
                                id="photo"
                                type="url"
                                value={photoUrl}
                                onChange={(e) => { setPhotoUrl(e.target.value); setImageFailed(false); }}
                                placeholder="https://..."
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="fullName" className={labelClass}>Full name</label>
                        <input
                            id="fullName"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    {hasSubjects && (
                        <div className="space-y-2">
                            <p className={labelClass}>
                                {profile.role === "teacher" ? "Subjects you teach" : "Subjects you are offering"}
                                <span className="ml-2 font-normal text-muted">({subjects.length} selected)</span>
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {SUBJECTS.map((name) => {
                                    const selected = subjects.includes(name);
                                    return (
                                        <button
                                            key={name}
                                            type="button"
                                            onClick={() => toggleSubject(name)}
                                            className={`rounded-full border px-3 py-1.5 text-sm transition cursor-pointer ${selected
                                                ? "border-primary bg-primary font-medium text-white"
                                                : "border-border hover:bg-accent"
                                                }`}
                                        >
                                            {name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label htmlFor="email" className={labelClass}>Email</label>
                        <input
                            id="email"
                            type="email"
                            value={profile.email ?? ""}
                            disabled
                            className={`${inputClass} cursor-not-allowed opacity-60`}
                        />
                        <p className="text-xs text-muted">Contact an administrator to change your sign-in email.</p>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {saving ? "Saving..." : "Save changes"}
                    </button>
                </form>

                <form onSubmit={changePassword} className="h-fit space-y-5 rounded-xl border border-border bg-card p-6">
                    <h2 className="text-lg font-semibold">Change password</h2>

                    <div className="space-y-2">
                        <label htmlFor="currentPassword" className={labelClass}>Current password</label>
                        <input
                            id="currentPassword"
                            type="password"
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="newPassword" className={labelClass}>New password</label>
                        <input
                            id="newPassword"
                            type="password"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="confirmPassword" className={labelClass}>Confirm new password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={changingPassword}
                        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {changingPassword ? "Updating..." : "Update password"}
                    </button>
                </form>
            </div>
        </main>
    )
}