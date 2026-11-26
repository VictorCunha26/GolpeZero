const shell = "golpezero-offline-v1";
self.addEventListener("install", event => {
  event.waitUntil(caches.open(shell).then(cache => cache.addAll(["/offline.html"])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.filter(name => name.startsWith("golpezero-offline-") && name !== shell).map(name => caches.delete(name)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || request.mode !== "navigate" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  event.respondWith(fetch(request).catch(async () => (await caches.match("/offline.html", { cacheName: shell })) ?? Response.error()));
});
