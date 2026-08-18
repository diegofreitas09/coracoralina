const CACHE_NAME='cora-2027-v20';
const ASSETS=[
'./','./index.html','./app.css','./app-1.js','./app-2.js','./app-3.js','./reajustes-2027.js',
'./manifest.webmanifest','./icon-192.png','./icon-512.png','./maskable-icon-512.png',
'./apple-touch-icon.png','./logo-escola-web.png','./logo-pdf-web.png'
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin===self.location.origin&&(u.pathname.endsWith('/coracoralina/')||u.pathname.endsWith('/coracoralina/index.html'))){
    e.respondWith(fetch(e.request).then(async r=>{
      let html=await r.text();
      if(!html.includes('reajustes-2027.js'))html=html.replace('</body>',"<script src='./reajustes-2027.js?v=2'></script></body>");
      const out=new Response(html,{status:r.status,statusText:r.statusText,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
      return out;
    }).catch(()=>caches.match('./index.html').then(async r=>{
      if(!r)return new Response('Offline',{status:503});
      let html=await r.text();
      if(!html.includes('reajustes-2027.js'))html=html.replace('</body>',"<script src='./reajustes-2027.js?v=2'></script></body>");
      return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}});
    })));
    return;
  }
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE_NAME).then(cache=>cache.put(e.request,c));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});