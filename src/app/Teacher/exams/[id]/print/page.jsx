"use client"
import { useParams } from "next/navigation"
import ExamPaper from "@/components/ExamPaper"

export default function TeacherPrint() {
    const { id } = useParams();
    return <ExamPaper examId={id} backHref={`/Teacher/exams/${id}/review`} />;
}