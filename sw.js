/* Service Worker — עבודה אופליין מלאה.
 * כל קובצי האפליקציה נשמרים במטמון בהתקנה; בקשות נענות מהמטמון תחילה.
 * להוצאת עדכון: להעלות את מספר הגרסה כאן.
 */
const VERSION = 'inv-v1.0.0';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/catalog.js',
  './js/db.js',
  './js/app.js',
  './vendor/xlsx.full.min.js',
  './fonts/heebo-hebrew-400-normal.woff2',
  './fonts/heebo-hebrew-500-normal.woff2',
  './fonts/heebo-hebrew-700-normal.woff2',
  './fonts/heebo-latin-400-normal.woff2',
  './fonts/heebo-latin-500-normal.woff2',
  './fonts/heebo-latin-700-normal.woff2',
  './fonts/rubik-hebrew-500-normal.woff2',
  './fonts/rubik-hebrew-700-normal.woff2',
  './fonts/rubik-latin-500-normal.woff2',
  './fonts/rubik-latin-700-normal.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-48.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        // שומרים במטמון גם קבצים חדשים מאותו מקור
        if (resp.ok && new URL(event.request.url).origin === location.origin) {
          const copy = resp.clone();
          caches.open(VERSION).then((cache) => cache.put(event.request, copy));
        }
        return resp;
      });
    })
  );
});
