export default function Spinner({ size = 30, className = "" }) {
    // border scales with size so the ring looks the same at every size
    const border = Math.max(1, Math.round(size * 0.1));

    return (
        <>
            <span
                role="status"
                aria-label="Loading"
                className={`prexam-spinner ${className}`}
                style={{ "--size": `${size}px`, "--border": `${border}px` }}
            />
            <style jsx global>{`
                .prexam-spinner {
                    width: var(--size);
                    height: var(--size);
                    display: grid;
                    animation: prexam-spin 3s infinite;
                }
                .prexam-spinner::before,
                .prexam-spinner::after {
                    content: "";
                    grid-area: 1 / 1;
                    border: var(--border) solid;
                    border-radius: 50%;
                    border-color: #474bff #474bff #0000 #0000;
                    mix-blend-mode: darken;
                    animation: prexam-spin 1s infinite linear;
                }
                .prexam-spinner::after {
                    border-color: #0000 #0000 #dbdcef #dbdcef;
                    animation-direction: reverse;
                }
                @keyframes prexam-spin {
                    100% {
                        transform: rotate(1turn);
                    }
                }
            `}</style>
        </>
    )
}

export function PageLoader() {
    return (
        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
            <Spinner size={40} />
        </div>
    )
}

export function SectionLoader({ size = 36 }) {
    return (
        <div className="flex items-center justify-center py-16">
            <Spinner size={size} />
        </div>
    )
}