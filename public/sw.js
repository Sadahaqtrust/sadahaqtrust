const CACHE_NAME = "digital-rohtak-v3-services-fix";
const OFFLINE_URL = "/offline.html";

// Files to cache on install
const PRECACHE_URLS = [
  // intentionally NOT precaching "/" — services list rendered there is
  // dynamic and an old precache caused stale "0 services available" UI.
  "/offline.html",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// Install — precache essential files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache, then offline page
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip API calls and auth routes — always go to network
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // Never serve cached HTML for navigations to avoid stale dashboards.
  // Only cache static assets (Next.js _next/static/*, icons, images).
  const isNavigation =
    event.request.mode === "navigate" ||
    (event.request.headers.get("accept") || "").includes("text/html");
  if (isNavigation) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(OFFLINE_URL).then((c) => c || new Response("Offline", { status: 503 })),
      ),
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // If it's a navigation request, show offline page
          if (event.request.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});
