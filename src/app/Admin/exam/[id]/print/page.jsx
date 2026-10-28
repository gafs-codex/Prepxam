"use client"
import { useParams } from "next/navigation"
import ExamPaper from "@/components/ExamPaper"

export default function AdminPrint() {
    const { id } = useParams();
    return <ExamPaper examId={id} backHref={`/Admin/exam/${id}`} />;
}