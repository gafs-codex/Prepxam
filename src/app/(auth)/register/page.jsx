"use client"
import Link from "next/link"
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import PasswordInput from "@/components/PasswordInput";

const SUBJECTS = [
    "Mathematics", "English Language", "Physics", "Chemistry",
    "Biology", "Economics", "Government", "Geography",
    "Literature in English", "Agricultural Science", "Further Mathematics",
    "Commerce", "Financial Accounting", "Christian Religious Studies",
    "Islamic Religious Studies", "Civic Education", "Computer Studies", "History"
];

export default function Register() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [role, setRole] = useState("student");
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    function toggleSubject(subject) {
        setSelectedSubjects((prev) =>
            prev.includes(subject)
                ? prev.filter((s) => s !== subject)
                : [...prev, subject]
        );
    }

    function changeRole(newRole) {
        if (newRole === role) return;
        setRole(newRole);
        setSelectedSubjects([]); // a teacher's subjects shouldn't carry over to a student
    }

    function resetForm() {
        setFullName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setRole("student");
        setSelectedSubjects([]);
        setAgreedToTerms(false);
    }

    async function handleRegister(e) {
        e.preventDefault();

        if (fullName.trim() === "") {
            toast.error("Please enter your full name");
            return;
        }

        if (email.trim() === "") {
            toast.error("Please enter your email");
            return;
        } else if (!email.includes("@")) {
            toast.error("Enter a valid email please");
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
            toast.error(
                role === "teacher"
                    ? "Please select at least one subject you teach"
                    : "Please select the subjects you are offering"
            );
            return;
        }

        if (!agreedToTerms) {
            toast.error("You must agree to the terms of use and privacy policy");
            return;
        }

        setSubmitting(true);

        const { error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: {
                    full_name: fullName.trim(),
                    role: role,
                    subjects: selectedSubjects,
                },
            },
        });

        setSubmitting(false);

        if (error) {
            toast.error(error.message);
            return;
        }

        resetForm();
        toast.success(
            "Account created! The school must also approve your account before you can use it.",
            { duration: 8000 }
        );
    }

    const inputClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus:outline-none";
    const labelClass = "text-sm font-medium leading-none";

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
            <div className="w-full max-w-md">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                    <h1 className="text-xl font-semibold tracking-tight">
                        Create your account
                    </h1>
                    <p className="mt-1 text-sm text-muted">
                        Your account needs approval from the school before you can use it.
                    </p>

                    <div className="mt-6">
                        <form onSubmit={handleRegister} className="space-y-4">
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
                                <label htmlFor="email" className={labelClass}>Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={inputClass}
                                />
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
                                <p className={labelClass}>
                                    {role === "teacher" ? "Subjects you teach" : "Subjects you are offering"}
                                    <span className="ml-2 font-normal text-muted">
                                        ({selectedSubjects.length} selected)
                                    </span>
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