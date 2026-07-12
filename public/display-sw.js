// GameDay OS display resilience worker. Scope: TV/display routes only.
// Strategy: network-first with cache fallback for pages and data; cache-first
// for immutable Next static assets. A display that reboots during a Wi-Fi
// outage re-renders its last cached board instead of a browser error page.
const CACHE = "gameday-display-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function cacheable(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return url.pathname.startsWith("/display") || url.pathname.startsWith("/api/display") || url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/_next/image");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!cacheable(request)) return;
  const url = new URL(request.url);
  const isStatic = url.pathname.startsWith("/_next/static");
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (isStatic) {
      const cached = await cache.match(request);
      if (cached) return cached;
    }
    try {
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(request, { ignoreSearch: !isStatic });
      if (cached) return cached;
      throw error;
    }
  })());
});
