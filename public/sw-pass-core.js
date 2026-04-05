// PASS-CORE Service Worker v5 — NO CACHE
// All requests go directly to network. No offline caching.
// This ensures users always get the latest version.

const CACHE_VERSION = "pass-core-v5-nocache";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Delete ALL caches from previous versions
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network only — no caching at all
self.addEventListener("fetch", () => {
  // Let the browser handle all requests normally
  return;
});
