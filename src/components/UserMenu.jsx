"use client";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Settings } from "lucide-react";

export default function UserMenu({ name, role }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger aschild>
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 w-9 relative">
                    <User className="h-5 w-5 text-muted" />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={8} className="w-64">
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="px-2 py-1.5">
                        <p className="text-base font-semibold text-foreground">{name}</p>
                        <p className="text-xs text-muted font-normal">{role}</p>
                    </DropdownMenuLabel>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem className="gap-2 py-2">
                    <Settings className="h-4 w-4" />
                    Profile settings
                </DropdownMenuItem>

                <DropdownMenuItem className="gap-2 py-2">
                    <LogOut className="h-4 w-4" />
                    Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}