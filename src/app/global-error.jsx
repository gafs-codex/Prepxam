"use client"

export default function GlobalError({ reset }) {
    return (
        <html lang="en">
            <body style={{ fontFamily: "system-ui, sans-serif", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", textAlign: "center", margin: 0 }}>
                <div>
                    <h1 style={{ fontSize: 24 }}>Something went wrong</h1>
                    <p style={{ color: "#6b7280" }}>Please reload the page.</p>
                    <button
                        onClick={() => reset()}
                        style={{ marginTop: 16, padding: "10px 20px", borderRadius: 6, border: "none", background: "#2954bc", color: "white", cursor: "pointer" }}
                    >
                        Reload
                    </button>
                </div>
            </body>
        </html>
    )
}