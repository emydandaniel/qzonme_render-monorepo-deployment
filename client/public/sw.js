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

// Minimal fetch handler - pass through to network but skip Cloudinary images to avoid CSP issues
self.addEventListener('fetch', (event) => {
  // Skip service worker for Cloudinary images to avoid CSP violations
  if (event.request.url.includes('cloudinary.com') || event.request.url.includes('res.cloudinary.com')) {
    return; // Let the browser handle these requests directly
  }
  
  // For all other requests, pass through to network
  event.respondWith(fetch(event.request));
});
