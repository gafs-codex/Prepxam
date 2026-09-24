import { GraduationCap } from 'lucide-react';
export default function Navbar() {
    return (
        <header className='flex h-16 items-center justify-between px-4'>
            <div className='flex items-center gap-2'>
                <span className='text-white bg-primary h-9 w-9 flex items-center justify-center rounded-lg'>
                    <GraduationCap />
                </span>

                <span>
                    Prexam
                </span>
            </div>

            <div className='flex items-center gap-2'>
                <button className='px-4 py-2 h-9 flex items-center whitespace-nowrap rounded-md text-sm font-medium cursor-pointer'>Log in</button>
                <button className='bg-primary px-4 py-2 h-9 flex items-center whitespace-nowrap rounded-md text-sm font-medium cursor-pointer text-white'>Get started</button>
            </div>
        </header>
    )
}