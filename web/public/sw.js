/* Only opt-in offline static shell and durable shopping operations; NEVER cache /api/ or recipe photos. */
importScripts("/offline-core.js");
const CACHE = "mealie-atelier-shell-v__ATELIER_VERSION__";
const STATIC = new Set([
  "/",
  "/mealie-atelier-cards.js",
  "/shell.css",
  "/pwa-install.css",
  "/pwa-install.js",
  "/offline-core.js",
  "/offline-client.js",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/favicon.svg",
  "/favicon.ico",
  "/favicon-32.png",
]);
self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith("mealie-atelier-") && key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== "GET" || !STATIC.has(url.pathname))
    return;
  event.respondWith(
    (async () => {
      const enabled = await self.AtelierOfflineCore.get("enabled").catch(() => false);
      if (!enabled) return fetch(request);
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        if (response.ok) {
          try {
            await cache.put(request, response.clone());
          } catch {}
        }
        return response;
      } catch (error) {
        const existing = await cache.match(request, { ignoreSearch: true });
        if (existing) return existing;
        throw error;
      }
    })(),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "ENABLE_OFFLINE")
    event.waitUntil(
      (async () => {
        if (!(await self.AtelierOfflineCore.get("enabled"))) return;
        const cache = await caches.open(CACHE);
        for (const path of STATIC) {
          try {
            const response = await fetch(path, { credentials: "include", cache: "no-cache" });
            if (response.ok) await cache.put(path, response.clone());
          } catch {}
        }
      })(),
    );
  if (event.data?.type === "CLEAR_OFFLINE") event.waitUntil(caches.delete(CACHE));
  if (event.data?.type === "SYNC_SHOPPING") event.waitUntil(self.AtelierOfflineCore.replay());
});
self.addEventListener("sync", (event) => {
  if (event.tag === "mealie-atelier-shopping") event.waitUntil(self.AtelierOfflineCore.replay());
});
self.addEventListener("push", (event) => {
  const isGerman = self.navigator.language?.toLowerCase().startsWith("de");
  let message = {
    title: "Mealie Atelier",
    body: isGerman ? "Küchentimer abgelaufen" : "Kitchen timer finished",
    id: "unknown",
    url: "/",
  };
  try {
    if (event.data) message = { ...message, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(String(message.title).slice(0, 120), {
      body: String(message.body).slice(0, 250),
      tag: "atelier-timer-" + String(message.id).slice(0, 60),
      renotify: true,
      icon: "/icon-192.png",
      badge: "/favicon.svg",
      vibrate: [200, 100, 200],
      data: { url: "/" },
      requireInteraction: true,
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (clients.length) {
        await clients[0].focus();
        clients[0].postMessage({ type: "TIMER_EXPIRED" });
      } else await self.clients.openWindow("/");
    })(),
  );
});
