const CACHE_NAME='cora-2027-v50';
const ASSETS=[
'./','./index.html','./app.css','./app-1.js','./app-2.js','./app-3.js','./reajustes-2027.js','./mensalidades-2027-v2.js','./fechamento-nav-fix.js','./relatorio-fechamento-2027.js','./relatorio-fechamento-layout-v2.js','./listas-material-2027.js','./sync-planilha-2027.js','./fechamento-sti-v29.js','./pdf-fechamento-fix-v30.js','./receita-espelho-fechamento-v32.js','./alunos-ajuste-v35.js','./visao-geral-fachada-v36.js','./materiais-gestao-v38.js','./mensalidades-portfolio-v40.js','./tab-router-fix-v41.js','./cora-gestao-brand-v45.js','./panfleto-premium-v48.js',
'./manifest.webmanifest','./icon-192.png','./icon-512.png','./maskable-icon-512.png','./apple-touch-icon.png','./logo-escola-web.png','./logo-pdf-web.png'
];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim();});
function forceScripts(html){
  const scripts=[
    [/<script[^>]+src=["'][^"']*reajustes-2027\.js[^"']*["'][^>]*><\/script>/ig,"<script src='./reajustes-2027.js?v=31'></script>"],
    [/<script[^>]+src=["'][^"']*mensalidades-2027-v2\.js[^"']*["'][^>]*><\/script>/ig,"<script src='./mensalidades-2027-v2.js?v=27'></script>"],
    [/<script[^>]+src=["'][^"']*fechamento-nav-fix\.js[^"']*["'][^>]*><\/script>/ig,"<script src='./fechamento-nav-fix.js?v=26'></script>"],
    [/<script[^>]+src=["'][^"']*relatorio-fechamento-2027\.js[^"']*["'][^>]*><\/script>/ig,"<script src='./relatorio-fechamento-2027.js?v=24'></script>"],
    [/<script[^>]+src=["'][^"']*relatorio-fechamento-layout-v2\.js[^"']*["'][^>]*><\/script>/ig,"<script src='./relatorio-fechamento-layout-v2.js?v=23'></script>"],
    [/<script[^>]+src=["'][^"']*listas-material-2027\.js[^"']*["'][^>]*><\/script>/ig,"<script src='./listas-material-2027.js?v=23'></script>"],
    [/<script[^>]+src=["'][^"']*sync-planilha-2027\.js[^"']*["'][^>]*><\/script>/ig,"<script src='./sync-planilha-2027.js?v=21'></script>"],
    [/<script[^>]+src=["'][^"']*fechamento-sti-v29\.js[^"']*["'][^>]*><\/script>/ig,"<script src='./fechamento-sti-v29.js?v=21'></script>"],
    [/<script[^>]+src=["'][^"']*pdf-fechamento-fix-v30\.js[^"']*["'][^>]*><\/script>/ig,"<script src='./pdf-fechamento-fix-v30.js?v=20'></script>"],
    [/<script[^>]+src=["'][^"']*receita-espelho-fechamento-v32\.js[^"']*["'][^>]*><\/script>/ig,"<script src='./receita-espelho-fechamento-v32.js?v=18'></script>"],
    [/<script[^>]+src=["'][^"']*alunos-ajuste-v35\.js[^"']*["'][^>]*><\/script>/ig,"<script src='./alunos-ajuste-v35.js?v=15'></script>"],
    [/<script[^>]+src=["'][^"']*visao-geral-fachada-v36\.js[^"']*["'][^>]*><\/script>/ig,"<script src='./visao-geral-fachada-v36.js?v=14'></script>"],
    [/<script[^>]+src=["'][^"']*materiais-gestao-v38\.js[^"']*["'][^>]*><\/script>/ig,"<script src='./materiais-gestao-v38.js?v=12'></script>"],
    [/<script[^>]+src=["'][^"']*mensalidades-portfolio-v40\.js[^"']*["'][^>]*><\/script>/ig,"<script src='./mensalidades-portfolio-v40.js?v=10'></script>"],
    [/<script[^>]+src=["'][^"']*tab-router-fix-v41\.js[^"']*["'][^>]*><\/script>/ig,"<script src='./tab-router-fix-v41.js?v=9'></script>"],
    [/<script[^>]+src=["'][^"']*cora-gestao-brand-v45\.js[^"']*["'][^>]*><\/script>/ig,"<script src='./cora-gestao-brand-v45.js?v=6'></script>"],
    [/<script[^>]+src=["'][^"']*panfleto-premium-v48\.js[^"']*["'][^>]*><\/script>/ig,"<script src='./panfleto-premium-v48.js?v=5'></script>"]
  ];
  html=html.replace(/<script[^>]+src=["'][^"']*sti-sync-receita-v31\.js[^"']*["'][^>]*><\/script>/ig,'');
  html=html.replace(/<script[^>]+src=["'][^"']*alunos-gestao-v34\.js[^"']*["'][^>]*><\/script>/ig,'');
  html=html.replace(/<script[^>]+src=["'][^"']*panfleto-matricula-v46\.js[^"']*["'][^>]*><\/script>/ig,'');
  scripts.forEach(([re,tag])=>{if(re.test(html)){re.lastIndex=0;html=html.replace(re,tag)}else html=html.replace('</body>',tag+'</body>')});
  return html;
}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin===self.location.origin&&(u.pathname.endsWith('/coracoralina/')||u.pathname.endsWith('/coracoralina/index.html'))){e.respondWith(fetch(e.request,{cache:'no-store'}).then(async r=>{const html=forceScripts(await r.text());return new Response(html,{status:r.status,statusText:r.statusText,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store, no-cache, must-revalidate'}})}).catch(()=>caches.match('./index.html').then(async r=>{if(!r)return new Response('Offline',{status:503});const html=forceScripts(await r.text());return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})})));return}
  if(['/reajustes-2027.js','/mensalidades-2027-v2.js','/fechamento-nav-fix.js','/relatorio-fechamento-2027.js','/relatorio-fechamento-layout-v2.js','/listas-material-2027.js','/sync-planilha-2027.js','/fechamento-sti-v29.js','/pdf-fechamento-fix-v30.js','/receita-espelho-fechamento-v32.js','/alunos-ajuste-v35.js','/visao-geral-fachada-v36.js','/materiais-gestao-v38.js','/mensalidades-portfolio-v40.js','/tab-router-fix-v41.js','/cora-gestao-brand-v45.js','/panfleto-premium-v48.js'].some(x=>u.pathname.endsWith(x))){e.respondWith(fetch(e.request,{cache:'no-store'}));return}
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE_NAME).then(cache=>cache.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});