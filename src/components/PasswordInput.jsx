"use client"
import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

export default function PasswordInput({ id, value, onChange, autoComplete }) {
    const [show, setShow] = useState(false)

    return (
        <div className="relative">
            <input
                id={id}
                type={show ? "text" : "password"}
                value={value}
                onChange={onChange}
                autoComplete={autoComplete}
                className="flex h-9 w-full rounded-md border border-input bg-transparent py-1 pl-3 pr-10 text-base shadow-sm focus:outline-none"
            />
            <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted cursor-pointer hover:text-foreground"
            >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    )
}