const CACHE_NAME='cora-2027-v18-2';
const ASSETS=[
'./','./index.html','./app.css','./app-1.js','./app-2.js','./app-3.js',
'./manifest.webmanifest','./icon-192.png','./icon-512.png','./maskable-icon-512.png',
'./apple-touch-icon.png','./logo-escola-web.png','./logo-pdf-web.png'
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE_NAME).then(cache=>cache.put(e.request,c));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));});
