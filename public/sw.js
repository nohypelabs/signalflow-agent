// SignalFlow Agent — Service Worker disabled for real-time trading dashboard.
// This file unregisters itself and clears all caches on load.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  caches.keys().then((names) => {
    for (const name of names) {
      caches.delete(name);
    }
  });
  self.registration.unregister();
});
