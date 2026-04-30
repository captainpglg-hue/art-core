// SW v3 — ne cache PAS /api/, /_next/, ni les pages HTML.
// Cause originelle (v2) : /_next/static/chunks/*.js servis depuis le SW devenaient
// "version frozen" => ChunkLoadError + React #423 dès qu'un nouveau deploy changeait
// les hash de chunks. La règle correcte est : cache UNIQUEMENT les assets statiques
// non-versionnés (icônes PWA), réseau direct pour tout le reste.

const CACHE_NAME = "artcore-v3";
const STATIC_ASSETS = [
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const accept = request.headers.get("accept") || "";
  const isHtml = request.mode === "navigate" || accept.includes("text/html");
  const isApi = url.pathname.startsWith("/api/");
  const isNext = url.pathname.startsWith("/_next/");

  if (isApi || isNext || isHtml) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
