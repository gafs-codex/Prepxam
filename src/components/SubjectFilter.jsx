"use client"
import { useState } from "react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
const subjects = [
    "All subjects",
    "Mathematics",
    "English",
    "Science",
    "Physics",
    "Chemistry",
    "Biology",
    "History",
    "Geography",
    "Computer Science",
    "Economics",
];

export default function SubjectFilter() {
    const [selected, setSelected] = useState("All subjects")

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm sm:w-48 cursor-pointer">
                    {selected}
                    <ChevronDown className="h-4 w-4 text-muted" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuRadioGroup value={selected} onValueChange={setSelected}>
                    {subjects.map((subject) => {
                        return <DropdownMenuRadioItem key={subject} value={subject}>
                            {subject}
                        </DropdownMenuRadioItem>
                    })}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}