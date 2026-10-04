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
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function UserMenu({ name, role }) {
    const { profile } = useAuth();
    const router = useRouter()

    async function handleSignOut() {
        await supabase.auth.signOut();
        router.push("/login")
    }
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
                        <p className="text-base font-semibold text-foreground">
                            {profile?.full_name || "Loading..."}
                        </p>

                        <p className="text-xs text-muted font-normal">
                            {profile?.role ? `${profile.role} Account` : ""}
                        </p>
                    </DropdownMenuLabel>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem className="gap-2 py-2">
                    <Settings className="h-4 w-4" />
                    Profile settings
                </DropdownMenuItem>

                <DropdownMenuItem className="gap-2 py-2" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                    Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}