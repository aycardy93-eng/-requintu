// Requintu ya no usa PWA. Este service worker solo existe para
// auto-eliminarse: borra la caché vieja y se desregistra.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.map((clave) => caches.delete(clave))))
      .then(() => self.registration.unregister())
  );
  self.clients.claim();
});

self.addEventListener('fetch', () => {});