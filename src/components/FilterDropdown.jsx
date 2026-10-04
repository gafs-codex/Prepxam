"use client"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export default function FilterDropdown({ options, value, onChange }) {

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm cursor-pointer">
                    {value}
                    <ChevronDown className="h-4 w-4 text-muted" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
                    {options.map((option) => {
                        return <DropdownMenuRadioItem key={option} value={option}>
                            {option}
                        </DropdownMenuRadioItem>
                    })}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}