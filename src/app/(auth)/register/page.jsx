"use client"
import Link from "next/link"
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

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

    function toggleSubject(subject) {
        setSelectedSubjects((prev) =>
            prev.includes(subject)
                ? prev.filter((s) => s !== subject)
                : [...prev, subject]
        );
    }

    async function handleRegister(e) {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Passwords don't match");
            return;
        }

        if (role === "teacher" && selectedSubjects.length === 0) {
            toast.error("Please select at least one subject you teach");
            return;
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: role,
                    subjects: role === "teacher" ? selectedSubjects : [],
                },
            },
        });

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success("Account created! Check your email to confirm, then log in.");
    }


    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
            <div className="w-full max-w-md">
                <div className="mb-6 flex items-center justify-center gap-2"></div>

                <div className="rounded-2xl bg-card p-6 shadow-sm sm:p-8">
                    <h1 className="text-xl font-semibold tracking-tight">
                        Create your account
                    </h1>

                    <p className="mt-1 text-sm text-muted"></p>

                    <div className="mt-6">
                        <form
                            onSubmit={handleRegister}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <label
                                    htmlFor=""
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Full name
                                </label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus:outline-none" />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor=""
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Email
                                </label>

                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus:outline-none" />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor=""
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Password
                                </label>

                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus:outline-none" />
                            </div>

                            <div className="space-y-2">
                                <label
                                    htmlFor=""
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Confirm password
                                </label>

                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus:outline-none"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor=""
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    I am a
                                </label>

                                <div className="grid grid-cols-2 gap-3">

                                    <label
                                        htmlFor="student"
                                        className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm capitalize transition border-border"
                                    >

                                        <input
                                            type="radio"
                                            name="role"
                                            id="student"
                                            value="student"
                                            checked={role === "student"}
                                            onChange={(e) => setRole(e.target.value)}
                                            className="cursor-pointer accent-blue-600 focus:ring-blue-500 h-4 w-4"
                                        />
                                        Student
                                    </label>

                                    <label
                                        htmlFor="teacher"
                                        className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm capitalize transition border-border"
                                    >
                                        {/* <button></button> */}
                                        <input
                                            type="radio"
                                            name="role"
                                            id="teacher"
                                            value="teacher"
                                            checked={role === "teacher"}
                                            onChange={(e) => setRole(e.target.value)}
                                            className="cursor-pointer accent-blue-600 focus:ring-blue-500 h-4 w-4"
                                        />
                                        Teacher
                                    </label>
                                </div>
                            </div>

                            {role === "teacher" && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none">
                                        Subjects you teach
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {SUBJECTS.map((subject) => {
                                            const isSelected = selectedSubjects.includes(subject);
                                            return (
                                                <button
                                                    key={subject}
                                                    type="button"
                                                    onClick={() => toggleSubject(subject)}
                                                    className={
                                                        isSelected
                                                            ? "rounded-full border border-primary bg-primary px-4 py-2 text-sm font-medium text-white transition"
                                                            : "rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
                                                    }
                                                >
                                                    {subject}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"
                            >
                                <input
                                    type="checkbox"
                                    name="terms"
                                    id="terms"
                                    className="h-3.5 w-3.5 cursor-pointer rounded-full accent-blue-600 focus:ring-blue-500"
                                />
                                I agree to the terms of use and privacy policy.
                            </label>

                            <button
                                type="submit"
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors bg-primary text-white w-full py-1.5 px-3"
                            >
                                Create Account
                            </button>
                        </form>
                        <p className="mt-6 text-center text-sm text-muted">
                            Already registered? <Link href={`/login`} className="text-sm font-medium text-primary hover:underline">Log in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}