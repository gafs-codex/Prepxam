"use client"
import { useParams } from "next/navigation"
import ExamForm from "@/components/ExamForm"

export default function EditExam() {
    const { id } = useParams();
    return <ExamForm examId={id} />
}