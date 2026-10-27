export default function manifest() {
    return {
        name: "Prepxam",
        short_name: "Prepxam",
        description: "Timed mock exams for your school.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#2954bc",
        icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
    }
}