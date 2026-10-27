const VERSION = "v1";
const STATIC = `prepxam-static-${VERSION}`;
const PAGES = `prepxam-pages-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(PAGES).then((cache) => cache.add(OFFLINE_URL)));
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== STATIC && k !== PAGES).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;     // Supabase and other sites always go to the network
    if (url.pathname.startsWith("/api/")) return;        // never touch the server routes

    // built files never change under the same name
    if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
        event.respondWith(
            caches.open(STATIC).then(async (cache) => {
                const hit = await cache.match(req);
                if (hit) return hit;
                const res = await fetch(req);
                if (res.ok) cache.put(req, res.clone());
                return res;
            })
        );
        return;
    }

    // pages: network first, then the last copy, then the offline page
    if (req.mode === "navigate") {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    if (res.ok && !res.redirected) {
                        const copy = res.clone();
                        caches.open(PAGES).then((cache) => cache.put(req, copy));
                    }
                    return res;
                })
                .catch(async () => (await caches.match(req)) || (await caches.match(OFFLINE_URL)))
        );
    }
});