// Minimal service worker for PWA installability
// No caching or offline functionality - just enables installation

self.addEventListener('install', () => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  // Take control of all clients immediately
  self.clients.claim();
});

// Minimal fetch handler - just pass through to network
self.addEventListener('fetch', (event) => {
  // Don't interfere with network requests - always go to network
  event.respondWith(fetch(event.request));
});
