const CACHE_NAME = "pass-core-v4";
const START_URL = "/pass-core";

self.addEventListener("install", () => {
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

// On PWA launch, navigate to start_url
self.addEventListener("message", (event) => {
  if (event.data === "navigate-home") {
    self.clients.matchAll({ type: "window" }).then((clients) => {
      clients.forEach((client) => client.navigate(START_URL));
    });
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Don't cache API calls
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
