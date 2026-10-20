"use client"
import Link from "next/link"
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import PasswordInput from "@/components/PasswordInput";
import { notifyError, safe } from "@/lib/net";
import { isNetworkError } from "@/lib/rpc";
import { publicPost } from "@/lib/api";
import { admissionKey, admissionEmail } from "@/lib/admission";
import { SUBJECTS } from "@/data/subjects";

const inputClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus:outline-none";
const labelClass = "text-sm font-medium leading-none";

export default function Register() {
    const router = useRouter();
    const [role, setRole] = useState("student");
    const [fullName, setFullName] = useState("");
    const [identifier, setIdentifier] = useState(""); // admission number (student) or email (teacher)
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const isStudent = role === "student";

    function toggleSubject(subject) {
        setSelectedSubjects((prev) =>
            prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
        );
    }

    function changeRole(newRole) {
        if (newRole === role) return;
        setRole(newRole);
        setIdentifier("");          // an admission number is not an email, and the other way round
        setSelectedSubjects([]);    // a teacher's subjects shouldn't carry over to a student
    }

    function resetForm() {
        setRole("student");
        setFullName("");
        setIdentifier("");
        setPassword("");
        setConfirmPassword("");
        setSelectedSubjects([]);
        setAgreedToTerms(false);
    }

    async function handleRegister(e) {
        e.preventDefault();
        if (submitting) return;

        const typed = identifier.trim();

        if (fullName.trim() === "") {
            toast.error("Please enter your full name");
            return;
        }
        if (isStudent) {
            if (!admissionKey(typed) || typed.length > 40) {
                toast.error("Please enter your admission number");
                return;
            }
        } else if (!typed.includes("@")) {
            toast.error("Please enter a valid email address");
            return;
        }
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }
        if (password !== confirmPassword) {
            toast.error("Passwords don't match");
            return;
        }
        if (selectedSubjects.length === 0) {
            toast.error(isStudent ? "Please select the subjects you are offering" : "Please select at least one subject you teach");
            return;
        }
        if (!agreedToTerms) {
            toast.error("You must agree to the terms of use and privacy policy");
            return;
        }

        setSubmitting(true);

        const alreadyTaken = (message) => {
            toast.error(message, {
                duration: 9000,
                action: { label: "Log in", onClick: () => router.push("/login") },
            });
        };

        // ---- students: the server creates the account, then we log them in ----
        if (isStudent) {
            const res = await publicPost("/api/register", {
                fullName: fullName.trim(),
                admissionNumber: typed,
                password,
                subjects: selectedSubjects,
            });

            if (!res.ok) {
                setSubmitting(false);
                if (res.network) {
                    toast.error(
                        "We couldn't confirm your account was created. Check your connection, then try to log in before registering again.",
                        { duration: 10000 }
                    );
                } else if (/already has an account/i.test(res.error)) {
                    alreadyTaken(res.error);
                } else {
                    toast.error(res.error);
                }
                return;
            }

            const { error: loginError } = await safe(
                supabase.auth.signInWithPassword({ email: admissionEmail(typed), password }),
                20000
            );
            setSubmitting(false);
            resetForm();

            if (loginError) {
                toast.success("Account created! Log in with your admission number. The school must approve it before you can use it.", { duration: 9000 });
                router.push("/login");
                return;
            }
            toast.success("Account created! The school will approve it shortly.", { duration: 7000 });
            router.push("/student/dashboard");
            return;
        }

        // ---- teachers ----
        let result = null;
        let signUpError = null;
        try {
            result = await supabase.auth.signUp({
                email: typed.toLowerCase(),
                password,
                options: {
                    data: {
                        full_name: fullName.trim(),
                        role: "teacher",
                        subjects: selectedSubjects,
                    },
                },
            });
            signUpError = result.error;
        } catch (err) {
            signUpError = err;
        }

        setSubmitting(false);

        if (signUpError) {
            const text = String(signUpError.message ?? "").toLowerCase();
            if (text.includes("already registered") || text.includes("already been registered") || text.includes("already exists")) {
                alreadyTaken("An account with this email already exists. Log in instead, or use Forgot password.");
            } else if (isNetworkError(signUpError)) {
                toast.error(
                    "We couldn't confirm your account was created. Check your connection, then try to log in before registering again.",
                    { duration: 10000 }
                );
            } else {
                notifyError(signUpError);
            }
            return;
        }

        // with confirmation switched on, Supabase hides duplicates by returning a user without identities
        const created = result?.data?.user;
        if (created && Array.isArray(created.identities) && created.identities.length === 0) {
            alreadyTaken("An account with this email already exists. Log in instead, or use Forgot password.");
            return;
        }

        resetForm();
        if (result?.data?.session) {
            toast.success("Account created! The school will approve it shortly.", { duration: 7000 });
            router.push("/Teacher/dashboard");
        } else {
            toast.success("Account created! The school must approve it before you can use it. Log in to check.", { duration: 9000 });
            router.push("/login");
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
            <div className="w-full max-w-md">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                    <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
                    <p className="mt-1 text-sm text-muted">
                        Pick the role that matches how you'll use the platform.
                    </p>

                    <div className="mt-6">
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="space-y-2">
                                <p className={labelClass}>I am a</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {["student", "teacher"].map((r) => (
                                        <label
                                            key={r}
                                            htmlFor={r}
                                            className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm capitalize transition ${role === r ? "border-primary bg-accent/40" : "border-border"}`}
                                        >
                                            <input
                                                type="radio"
                                                name="role"
                                                id={r}
                                                value={r}
                                                checked={role === r}
                                                onChange={(e) => changeRole(e.target.value)}
                                                className="h-4 w-4 cursor-pointer accent-blue-600 focus:ring-blue-500"
                                            />
                                            {r}
                                        </label>
                                    ))}
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

                            <div className="space-y-2">
                                <label htmlFor="identifier" className={labelClass}>
                                    {isStudent ? "Admission number" : "Email"}
                                </label>
                                <input
                                    id="identifier"
                                    type={isStudent ? "text" : "email"}
                                    autoComplete={isStudent ? "username" : "email"}
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    placeholder={isStudent ? "e.g. BC/STD/2026/0399" : "you@example.com"}
                                    className={inputClass}
                                />
                                <p className="text-xs text-muted">
                                    {isStudent
                                        ? "Use the number the school gave you. You'll log in with it."
                                        : ""}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className={labelClass}>Password</label>
                                <PasswordInput
                                    id="password"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="confirmPassword" className={labelClass}>Confirm password</label>
                                <PasswordInput
                                    id="confirmPassword"
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <p className={labelClass}>
                                    {isStudent ? "Subjects you are offering" : "Subjects you teach"}
                                    <span className="ml-2 font-normal text-muted">({selectedSubjects.length} selected)</span>
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {SUBJECTS.map((subject) => {
                                        const isSelected = selectedSubjects.includes(subject);
                                        return (
                                            <button
                                                key={subject}
                                                type="button"
                                                onClick={() => toggleSubject(subject)}
                                                className={`rounded-full border px-3 py-1.5 text-sm transition cursor-pointer ${isSelected
                                                    ? "border-primary bg-primary font-medium text-white"
                                                    : "border-border text-foreground hover:bg-accent"
                                                    }`}
                                            >
                                                {subject}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
                                <input
                                    type="checkbox"
                                    name="terms"
                                    id="terms"
                                    checked={agreedToTerms}
                                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    className="h-3.5 w-3.5 cursor-pointer accent-blue-600 focus:ring-blue-500"
                                />
                                I agree to the terms of use and privacy policy.
                            </label>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {submitting ? "Creating account..." : "Create Account"}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-muted">
                            Already registered? <Link href="/login" className="text-sm font-medium text-primary hover:underline">Log in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}