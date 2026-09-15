// Basic offline cache for the Field Guide PWA.
// Two different strategies on purpose:
// - App shell files (this page, manifest) rarely change: cache-first is fine.
// - The Google Sheet data changes often: network-first, so edits show up
//   immediately when online, falling back to the last cached copy only
//   when there's no connection (genuine offline use in the field).
const CACHE_NAME = "field-guide-v2";
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
});

function isDataRequest(url){
  return url.includes("docs.google.com") || url.includes("output=csv");
}

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  if (isDataRequest(url)) {
    // Network-first: always try for fresh data; fall back to cache if offline.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
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
