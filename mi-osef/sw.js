/* מי אוסף — עבודה אופליין והתראות
   בעדכון גרסה: להעלות את VERSION כאן וב־js/config.js */
var VERSION = 'miosef-1.0.3';
var SHELL = [
  './', './index.html', './css/app.css', './manifest.webmanifest',
  './js/config.js', './js/model.js', './js/store.js', './js/push.js',
  './js/auth.js', './js/ui.js', './js/app.js', './vendor/supabase.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/favicon-48.png',
  './fonts/heebo-hebrew-400-normal.woff2', './fonts/heebo-hebrew-500-normal.woff2',
  './fonts/heebo-hebrew-700-normal.woff2', './fonts/heebo-latin-400-normal.woff2',
  './fonts/heebo-latin-500-normal.woff2', './fonts/heebo-latin-700-normal.woff2',
  './fonts/rubik-hebrew-700-normal.woff2', './fonts/rubik-latin-700-normal.woff2'
];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(VERSION).then(function(c){
    return Promise.all(SHELL.map(function(u){
      return c.add(u).catch(function(){ /* קובץ חסר לא יפיל את ההתקנה */ });
    }));
  }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== VERSION; })
      .map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

/* קודם רשת לקריאות לשרת, קודם מטמון לקבצים של האפליקציה */
self.addEventListener('fetch', function(e){
  var url = new URL(e.request.url);
  if(e.request.method !== 'GET') return;
  if(url.origin !== location.origin) return;                  /* קריאות ל־Supabase — ישירות לרשת */

  e.respondWith(
    caches.match(e.request).then(function(hit){
      var net = fetch(e.request).then(function(res){
        if(res && res.status === 200){
          var copy = res.clone();
          caches.open(VERSION).then(function(c){ c.put(e.request, copy); });
        }
        return res;
      }).catch(function(){ return hit; });
      return hit || net;
    })
  );
});

/* ---------- התראות ---------- */
self.addEventListener('push', function(e){
  var data = {};
  try{ data = e.data ? e.data.json() : {}; }catch(err){ data = { title:'מי אוסף', body:e.data ? e.data.text() : '' }; }
  var urgent = data.kind === 'sos' || data.kind === 'gap';
  e.waitUntil(self.registration.showNotification(data.title || 'מי אוסף', {
    body: data.body || '',
    dir:'rtl', lang:'he',
    icon:'icons/icon-192.png',
    badge:'icons/favicon-48.png',
    tag: data.tag || 'miosef',
    renotify: urgent,
    requireInteraction: urgent,
    vibrate: urgent ? [120,60,120,60,120] : [80,40,80],
    data: { url: data.url || './' }
  }));
});

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var target = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(clients.matchAll({ type:'window', includeUncontrolled:true }).then(function(list){
    for(var i=0;i<list.length;i++){
      if(list[i].url.indexOf(self.registration.scope) === 0 && 'focus' in list[i]) return list[i].focus();
    }
    return clients.openWindow(target);
  }));
});
