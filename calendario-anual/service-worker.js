const CACHE='cora-calendar-roteiros-integrados-v94';
const ASSETS=['./','./index.html','./styles.css','./year-transfer.css','./calendar-integrity.js','./integration-audit.js','./integration-audit.css','./academic-2027-replan.js','./academic-2027-replan.css','./team-assessment-cards.js','./team-assessment-cards.css','./roteiros-integrados.js','./roteiros-integrados.css','./year-transfer.js','./stages.js','./app.js','./planning.js','./planning-word.js','./studio.css','./portal.css','./portal.js','./assessment-deadlines.js','./assessment-deadlines.css','./management-redesign.css','./team-layout.css','./management-professional.css','./app-experience.css','./app-experience.js','./month-view.css','./birthdays.css','./birthdays.js','./calendar-birthdays.js','./calendar-birthdays.css','./year-sync.js','./year-sync.css','./year-review.js','./month-publication.js','./calendar-pdf-activities.js','./team-calendar-view.js','./team-calendar-view.css','./official-calendar-data.js','./cards.js','./manifest.webmanifest','./app-icon-192.png','./app-icon-512.png','./app-icon-maskable-512.png','./install-pwa.js','./install-pwa.css','./helpdesk.js','./helpdesk.css','./theme-cora.js','./theme-cora.css','./accounts-dashboard.js','./accounts-dashboard.css','./team-stats.js','./team-stats.css','./grader.js','./grader.css','./holidays-manager.js','./holidays-manager.css','./legal-compliance.js','./legal-compliance.css','./sinepe-2027.js','./sinepe-2027.css'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS).catch(()=>{})).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;const url=new URL(e.request.url);if(url.pathname.includes('/api')||url.pathname.includes('/.netlify/functions/'))return;if(e.request.mode==='navigate'||/\.(?:js|css)$/.test(url.pathname)){e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r.ok){let cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp)).catch(()=>{})}return r}).catch(()=>caches.match(e.request)));return;}e.respondWith(caches.match(e.request).then(h=>h||fetch(e.request)));});

self.addEventListener('push',event=>{
 let item={};
 try{item=event.data?.json()||{}}catch{
  try{item={title:'Novo aviso · Cora Coralina',body:event.data?.text()||''}}catch{}
 }
 const year=Number(item.year)||2026;
 const title=String(item.title||'Colégio Cora Coralina').slice(0,160);
 const body=String(item.body||'Novo comunicado da Gestão').slice(0,350);
 const url=item.kind==='helpdesk'?'./?duvidas=1':'./?avisos=1&ano='+year;
 const tag=String(item.tag||'cora-'+Date.now()).slice(0,120);
 event.waitUntil(self.registration.showNotification(title,{
  body,icon:'./app-icon-192.png',badge:'./app-icon-192.png',tag,
  vibrate:[220,100,220],silent:false,renotify:true,
  timestamp:Date.now(),data:{url,year}
 }));
});

self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const url=new URL(event.notification.data?.url||'./?avisos=1',self.registration.scope).href;
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const present=windows.find(client=>client.url.startsWith(self.registration.scope));
  if(present){await present.focus();present.postMessage({type:url.includes('duvidas=1')?'cora-open-helpdesk':'cora-open-alerts'});return}
  if(self.clients.openWindow)await self.clients.openWindow(url);
 })());
});
