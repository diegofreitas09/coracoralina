const CACHE = 'cora-calendario-multianual-v9';
const ASSETS = ['./','./index.html','./styles.css','./app.js','./studio.css','./studio-assets.js','./school-brand.js','./official-calendar-data.js','./official-calendar-ui.js','./studio-pdf.js','./planning.js','./cards.js','./icon.svg','./manifest.webmanifest','./calendar-integrations.js','./calendar-integrations.css','./year-manager.js','./year-manager.css','./year-pdf.js','./agenda-oficial-2026.ics','./focused-ui.css','./focused-ui.js','./notifications.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});}return response;}).catch(()=>caches.match(event.request)));});
/* Push recebido do servidor: o usuário precisa ter autorizado as notificações. */
self.addEventListener('push',event=>{
  let payload={};try{payload=event.data?.json()||{}}catch{payload={}}
  const title=String(payload.title||'Colégio Cora Coralina').slice(0,100);
  const body=String(payload.body||'Uma atividade escolar está próxima.').slice(0,250);
  const target=payload.data||{};
  event.waitUntil(self.registration.showNotification(title,{
    body,icon:'./icon.svg',badge:'./icon.svg',
    tag:'cora-remote-'+String(payload.id||'agenda'),
    data:{url:'./',year:String(target.year||''),date:String(target.date||'')}
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const base=new URL('./',self.registration.scope);
    const data=event.notification.data||{};
    if(/^20\d\d$/.test(data.year))base.searchParams.set('year',data.year);
    const wins=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const win of wins){if(new URL(win.url).origin===base.origin){await win.focus();win.navigate(base.href);return;}}
    await self.clients.openWindow(base.href);
  })());
});
