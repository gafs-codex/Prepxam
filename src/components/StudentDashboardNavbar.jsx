"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, GraduationCap } from "lucide-react";
import UserMenu from "./UserMenu";

const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/exams", label: "Browse exams" },
    { href: "/history", label: "History" },
];

export default function StudentDashboardNavbar() {
    const pathname = usePathname();

    return (
        <nav className="flex items-center justify-between border-b border-border bg-background px-8 py-4">
            <div className='flex items-center gap-2'>
                <span className='text-white bg-primary h-9 w-9 flex items-center justify-center rounded-lg'>
                    <GraduationCap />
                </span>

                <span className="text-lg font-semibold">
                    Prexam
                </span>
            </div>

            <div className="flex items-center gap-1 rounded-full bg-background p-1">
                {links.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={isActive ? "rounded-md px-3 py-2 text-sm font-medium text-muted transition hover:bg-accent hover:text-accent-foreground !text-foreground bg-accent"
                                : "rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-accent"}
                        >
                            {link.label}
                        </Link>
                    )
                })}
            </div>

            <div className="flex items-center gap-3">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 w-9 relative">
                    <Bell className="h-5 w-5 text-muted" />
                </button>

                <UserMenu name="Abdulmuiz Abdulgafar" role="Student Account" />
            </div>
        </nav>
    )
}