// MONEY MOTION STUDIOS - service worker
// Strategy: always try the network first so the app is fresh on every open;
// the cache is only an offline fallback.
const CACHE = "money-motion-v36";
const SHELL = [
  "./", "./index.html", "./gallery.html", "./artists.html", "./producers.html", "./fame.html", "./global.html", "./chat.html", "./book.html", "./pay.html", "./live.html", "./dashboard.html",
  "./css/style.css", "./js/config.js", "./js/store.js", "./js/logo-data.js", "./js/pwa.js", "./js/mme.js", "./js/chat.js", "./js/artists-data.js", "./js/artists.js", "./js/producers-data.js", "./js/producers.js", "./js/beats-data.js", "./js/beats.js",
  "./manifest.webmanifest", "./icon.svg", "./logo.svg", "./logo-cutout.svg"
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.hostname.endsWith("supabase.co")) return; // live data: network only
  if (url.origin !== self.location.origin) return;  // CDN etc: let the browser handle it
  e.respondWith(
    fetch(e.request).then((r) => {
      const copy = r.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return r;
    }).catch(() =>
      caches.match(e.request).then((m) => m || (e.request.mode === "navigate" ? caches.match("./index.html") : undefined))
    )
  );
});
