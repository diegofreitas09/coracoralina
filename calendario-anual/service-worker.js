const CACHE='cora-calendar-pdf-duas-colunas-v34';
const ASSETS=['./','./index.html','./styles.css','./year-transfer.css','./year-transfer.js','./stages.js','./app.js','./studio.css','./portal.css','./portal.js','./birthdays.css','./birthdays.js','./official-calendar-data.js','./cards.js','./manifest.webmanifest','./app-icon-192.png','./app-icon-512.png','./app-icon-maskable-512.png','./install-pwa.js','./install-pwa.css'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS).catch(()=>{})).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;const url=new URL(e.request.url);if(url.pathname.includes('/api')||url.pathname.includes('/.netlify/functions/'))return;if(e.request.mode==='navigate'||/\.(?:js|css)$/.test(url.pathname)){e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r.ok){let cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp)).catch(()=>{})}return r}).catch(()=>caches.match(e.request)));return;}e.respondWith(caches.match(e.request).then(h=>h||fetch(e.request)));});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const url=new URL('./?avisos=1',self.registration.scope).href;
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const present=windows.find(client=>client.url.startsWith(self.registration.scope));
  if(present){await present.focus();present.postMessage({type:'cora-open-alerts'});return}
  if(self.clients.openWindow)await self.clients.openWindow(url);
 })());
});
