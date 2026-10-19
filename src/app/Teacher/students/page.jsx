"use client"
import { useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import FilterDropdown from "@/components/FilterDropdown"
import { SectionLoader } from "@/components/ui/Spinner"
import ErrorState from "@/components/ui/ErrorState"
import { useLoader } from "@/lib/useLoader"
import { ensure } from "@/lib/net"

function formatDate(value) {
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function TeacherStudents() {
    const [search, setSearch] = useState("");
    const [subject, setSubject] = useState("All subjects");

    const { data, error, loading, reload } = useLoader(async () => {
        const { data } = ensure(await supabase.rpc("teacher_students"));
        return data ?? [];
    }, []);

    const students = data ?? [];
    const subjectOptions = ["All subjects", ...new Set(students.flatMap((s) => s.shared_subjects ?? []))];

    const visible = students.filter((s) => {
        const text = `${s.full_name ?? ""} ${s.email ?? ""}`.toLowerCase();
        return text.includes(search.toLowerCase()) &&
            (subject === "All subjects" || (s.shared_subjects ?? []).includes(subject));
    });

    return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
            <p className="mt-1 text-sm text-muted">
                {data ? `${students.length} ${students.length === 1 ? "student" : "students"} offering your subjects.` : "\u00A0"}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or email"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent pl-10 pr-3 py-1 text-base shadow-sm outline-none md:text-sm"
                    />
                </div>
                {subjectOptions.length > 2 && (
                    <FilterDropdown options={subjectOptions} value={subject} onChange={setSubject} />
                )}
            </div>

            <div className="mt-6">
                {loading ? (
                    <SectionLoader />
                ) : error ? (
                    <ErrorState compact title="Couldn't load your students" message={error} onRetry={reload} />
                ) : visible.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border bg-white p-10 text-center text-sm text-muted">
                        {students.length === 0
                            ? "No approved students are offering your subjects yet."
                            : "No students match your search."}
                    </p>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-border bg-card">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-accent/30 text-left text-muted">
                                    <th className="p-4 font-medium">Name</th>
                                    <th className="p-4 font-medium">Email / admission no.</th>
                                    <th className="p-4 font-medium">Subjects</th>
                                    <th className="p-4 font-medium">Exams taken</th>
                                    <th className="p-4 font-medium">Average score</th>
                                    <th className="p-4 font-medium">Joined</th>
                                    <th className="p-4 text-right font-medium">Results</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((s) => (
                                    <tr key={s.student_id} className="border-b border-border last:border-0 hover:bg-accent/20">
                                        <td className="p-4 font-medium">
                                            <Link href={`/Teacher/students/${s.student_id}`} className="hover:underline">
                                                {s.full_name ?? "Unnamed"}
                                            </Link>
                                        </td>
                                        <td className="p-4 text-muted">{s.email ?? s.admission_number ?? "—"}</td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-1">
                                                {(s.shared_subjects ?? []).map((name) => (
                                                    <span key={name} className="rounded-full bg-accent px-2 py-0.5 text-xs">{name}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4">{s.exams_taken}</td>
                                        <td className="p-4">{s.average_percent === null ? "—" : `${s.average_percent}%`}</td>
                                        <td className="p-4">{formatDate(s.created_at)}</td>
                                        <td className="p-4 text-right">
                                            <Link href={`/Teacher/students/${s.student_id}`} className="font-medium text-primary hover:underline">
                                                View results
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </main>
    )
}