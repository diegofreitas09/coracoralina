const CACHE_NAME='cora-2027-v22';
const ASSETS=[
'./','./index.html','./app.css','./app-1.js','./app-2.js','./app-3.js','./reajustes-2027.js',
'./manifest.webmanifest','./icon-192.png','./icon-512.png','./maskable-icon-512.png',
'./apple-touch-icon.png','./logo-escola-web.png','./logo-pdf-web.png'
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim();});
function forceReajustes(html){
  const tag="<script src='./reajustes-2027.js?v=4'></script>";
  if(/<script[^>]+src=["'][^"']*reajustes-2027\.js[^"']*["'][^>]*><\/script>/i.test(html)){
    return html.replace(/<script[^>]+src=["'][^"']*reajustes-2027\.js[^"']*["'][^>]*><\/script>/ig,tag);
  }
  return html.replace('</body>',tag+'</body>');
}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin===self.location.origin&&(u.pathname.endsWith('/coracoralina/')||u.pathname.endsWith('/coracoralina/index.html'))){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(async r=>{
      const html=forceReajustes(await r.text());
      return new Response(html,{status:r.status,statusText:r.statusText,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store, no-cache, must-revalidate'}});
    }).catch(()=>caches.match('./index.html').then(async r=>{
      if(!r)return new Response('Offline',{status:503});
      const html=forceReajustes(await r.text());
      return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
    })));
    return;
  }
  if(u.pathname.endsWith('/reajustes-2027.js')){
    e.respondWith(fetch(e.request,{cache:'no-store'}));
    return;
  }
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE_NAME).then(cache=>cache.put(e.request,c));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});