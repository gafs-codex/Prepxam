"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Moon, User, GraduationCap } from "lucide-react";

const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/browse-exams", label: "Browse exams" },
    { href: "/history", label: "History" },
];

export default function StudentDashboardNavbar() {
    const pathname = usePathname();

    return (
        <nav className="flex items-center justify-between border-b border-border bg-card px-8 py-4">
            <div className='flex items-center gap-2'>
                <span className='text-white bg-primary h-9 w-9 flex items-center justify-center rounded-lg'>
                    <GraduationCap />
                </span>

                <span className="text-lg font-semibold">
                    Prexam
                </span>
            </div>

            <div className="flex items-center gap-1 rounded-full bg-background p-1">
                {links.map((links) => {
                    const isActive = pathname === links.href;
                    return (
                        <Link
                            key={links.href}
                            href={links}
                            className={isActive ? "rounded-md px-3 py-2 text-sm font-medium text-muted transition hover:bg-accent hover:text-accent-foreground !text-foreground bg-accent"
                                : "rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-foreground hover:bg-accent"}
                        >
                            {links.label}
                        </Link>
                    )
                })}
            </div>

            <div className="flex items-center gap-3">
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 w-9 relative">
                    <Bell className="h-5 w-5 text-muted" />
                </button>
                <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 w-9 relative">
                    <User className="h-5 w-5 text-muted" />
                </button>
            </div>
        </nav>
    )
}