// CACHE_NAME is stamped per-deploy by scripts/build-sw.js (runs as `prebuild`).
// Bumping it on every deploy is what triggers the browser's `updatefound` flow
// in src/components/sw-register.tsx, which surfaces the in-app refresh prompt.
const CACHE_NAME = "yard-b8ed18a";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icon-192.png", "/icon-512.png"])),
  );
  // Intentionally no skipWaiting() here — we wait until the user taps the
  // "Refresh" toast in sw-register.tsx so an update never interrupts an
  // in-progress workout / set log. The client postMessages SKIP_WAITING below.
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => caches.match(OFFLINE_URL)),
    );
  }
});
