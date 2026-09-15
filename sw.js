// Basic offline cache for the Field Guide PWA.
// Deliberately simple: only the static app shell (this page, manifest) is
// cached here. The Google Sheet data is left completely alone — no
// interception, no caching layer — so it's always a plain, direct fetch.
// The app's own "Couldn't load, try again" screen handles any real network
// failure; that's simpler and more reliable than trying to manage data
// freshness inside the service worker.
const CACHE_NAME = "field-guide-v3";
const ASSETS = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
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

function isDataRequest(url){
  return url.includes("docs.google.com") || url.includes("output=csv");
}

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Data requests: don't intercept at all. Let the browser handle it
  // completely natively, every time.
  if (isDataRequest(url)) {
    return;
  }

  // App shell: cache-first, network as a fallback/update.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
    })
  );
});
