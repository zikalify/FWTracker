const CACHE_NAME = 'my-app-cache-v36';
const urlsToCache = [
  './',
  'index.html',
  'styles.css',
  'script.js',
  'manifest.json',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png'
];

// Install event: Cache the essential resources initially
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache); // Pre-cache only essential resources
      })
  );

  // Force the waiting service worker to become active
  self.skipWaiting();
});

// Fetch event: Check cache first, then fetch from network
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(cachedResponse) {
        // If the request is in cache, return it
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise, fetch from the network and cache the new response
        return fetch(event.request).then(function(networkResponse) {
          // If the response is invalid, return it as is
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Clone the network response and cache it
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        });
      }).catch(function() {
        // In case of network failure, fall back to a cached fallback page
        return caches.match('index.html');
      })
  );
});

// Activate event: Clean up old caches and ensure the new service worker is in control
self.addEventListener('activate', function(event) {
  const cacheWhitelist = [CACHE_NAME]; // Only keep the active cache
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName); // Delete any outdated caches
          }
        })
      );
    }).then(function() {
      // Claim control of the clients (open windows) immediately
      return self.clients.claim();
    })
  );
});

// Listen for updates to the service worker and force the new version
self.addEventListener('message', function(event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
