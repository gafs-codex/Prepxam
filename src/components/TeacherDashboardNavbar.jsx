"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { GraduationCap } from "lucide-react";
import UserMenu from "./UserMenu";
import NotificationBell from "./NotificationBell";

const links = [
    { href: "/Teacher/dashboard", label: "Dashboard" },
    { href: "/Teacher/exams", label: "My exams" },
    { href: "/Teacher/questions", label: "Question bank" },
    { href: "/Teacher/students", label: "Students" },
];

export default function TeacherDashboardNavbar() {
    const pathname = usePathname()
    return (
        <nav className="flex items-center justify-between border-b border-border bg-background px-8 py-4">
            <div className='flex items-center gap-2'>
                <span className='text-white bg-primary h-9 w-9 flex items-center justify-center rounded-lg'>
                    <GraduationCap />
                </span>
                <span className="text-lg font-semibold">Prepxam</span>
            </div>

            <div className="flex items-center gap-1 rounded-full bg-background p-1">
                {links.map((link) => {
                    const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={isActive
                                ? "rounded-md bg-accent px-3 py-2 text-sm font-medium text-foreground"
                                : "rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-accent hover:text-foreground"}
                        >
                            {link.label}
                        </Link>
                    )
                })}
            </div>

            <div className="flex items-center gap-3">
                <NotificationBell />
                <UserMenu />
            </div>
        </nav>
    )
}