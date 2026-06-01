const VERSION = "nomadlingo-v5";
const APP_CACHE = `${VERSION}-app`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const APP_SHELL = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/icons/nomadlingo.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => !cacheName.startsWith(VERSION))
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
      .then(() => broadcastOfflineReady())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "NOMADLINGO_CACHE_URLS" || !Array.isArray(event.data.urls)) {
    return;
  }

  event.waitUntil(cacheCurrentPageAssets(event.data.urls));
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch {
    return (
      (await cache.match(request)) ||
      (await caches.match("/")) ||
      (await caches.match("/offline"))
    );
  }
}

async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);
  const cache = await caches.open(RUNTIME_CACHE);
  cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);

  const networkResponsePromise = fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);

  return cachedResponse || networkResponsePromise || caches.match("/offline");
}

async function cacheCurrentPageAssets(urls) {
  const cache = await caches.open(RUNTIME_CACHE);
  const sameOriginUrls = urls.filter((url) => {
    try {
      return new URL(url).origin === self.location.origin;
    } catch {
      return false;
    }
  });

  await Promise.allSettled(
    sameOriginUrls.map((url) =>
      cache.add(
        new Request(url, {
          cache: "reload"
        })
      )
    )
  );

  await broadcastOfflineReady();
}

async function broadcastOfflineReady() {
  const clients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: "window"
  });

  clients.forEach((client) => {
    client.postMessage({ type: "NOMADLINGO_OFFLINE_READY" });
  });
}
