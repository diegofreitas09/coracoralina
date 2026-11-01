(() => {
  'use strict';
  const $=id=>document.getElementById(id),KEY='cora_alert_preferences_v1',SEEN='cora_alert_delivered_v1';
  function prefs(){try{return JSON.parse(localStorage.getItem(KEY)||'null')||{enabled:false,role:'Professores',lead:1440};}catch{return {enabled:false,role:'Professores',lead:1440};}}
  function save(v){try{localStorage.setItem(KEY,JSON.stringify(v));}catch(_){}}
  function seen(){try{return JSON.parse(localStorage.getItem(SEEN)||'{}')||{};}catch{return {};}}
  const supported=()=>('Notification' in window)&&('serviceWorker' in navigator)&&window.isSecureContext;
  let remoteActive=false;
  function vapidBytes(key){
    const padding='='.repeat((4-key.length%4)%4),raw=atob((key+padding).replace(/-/g,'+').replace(/_/g,'/'));
    return Uint8Array.from(raw,c=>c.charCodeAt(0));
  }
  async function syncRemoteSubscription(remove=false){
    if(!supported()||!('PushManager' in window))return false;
    const cfg=await fetch('/.netlify/functions/notifications-config',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
    if(!cfg?.available || !cfg.publicKey){remoteActive=false;return false;}
    const reg=await navigator.serviceWorker.ready;
    let subscription=await reg.pushManager.getSubscription();
    if(!remove&&!subscription){
      subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:vapidBytes(cfg.publicKey)});
    }
    if(!subscription){remoteActive=false;return false;}
    const res=await fetch('/.netlify/functions/notifications-subscribe',{
      method:remove?'DELETE':'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({subscription:subscription.toJSON(),role:prefs().role})
    });
    if(!res.ok){remoteActive=false;return false;}
    if(remove){await subscription.unsubscribe();remoteActive=false;}
    else remoteActive=true;
    return remoteActive;
  }
  const installed=()=>Boolean(window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone);
  function status(message){if($('alertsStatus'))$('alertsStatus').textContent=message;}
  function update(){
    const p=prefs();$('alertsRole').value=p.role;$('alertsLead').value=String(p.lead);
    if(!supported()){status('Notificações indisponíveis neste navegador. Para alertas com o app fechado, use o Google Agenda.');return;}
    if(!p.enabled){status('Avisos desativados. Ative e permita as notificações no aparelho.');return;}
    if(Notification.permission!=='granted'){status('Permissão de notificações ainda não concedida.');return;}
    status(remoteActive?
      'Notificações push cadastradas neste aparelho. Avisos programados: dia anterior às 18h e dia do evento às 7h (agenda oficial publicada).':
      (installed()?'Aplicativo instalado. ':'')+'Lembretes locais ativos enquanto o aplicativo estiver aberto. Avisos com o app fechado exigem a ativação do servidor push.');
  }
  const start=e=>{
    const t=/^\d\d:\d\d$/.test(e.time||'')?e.time:'07:00';
    const d=new Date(`${e.date}T${t}:00-03:00`);
    return Number.isNaN(d.getTime())?null:d.getTime();
  };
  async function showNotice(title,body,e={}){
    const reg=await navigator.serviceWorker.ready;
    await reg.showNotification(title,{
      body,icon:'./icon.svg',badge:'./icon.svg',tag:'cora-event-'+(e.id||'test'),
      data:{url:'./',year:e.year||'',date:e.date||''}
    });
  }
  async function checkAlerts(){
    const p=prefs();
    if(!p.enabled||!supported()||Notification.permission!=='granted'||!window.CoraYears)return;
    const api=window.CoraYears;
    const list=api.getEvents(api.activeYear).filter(e=>e.status!=='Em revisão'&&(!e.audience||e.audience==='Todos'||e.audience===p.role));
    const past=seen(),now=Date.now(),lead=Number(p.lead)*60000;
    let sent=0,changed=false;
    for(const e of list){
      const ms=start(e);if(!ms||ms<=now||ms-now>lead)continue;
      const key=[api.activeYear,p.role,p.lead,e.id,e.date,e.time||''].join(':');
      if(past[key])continue;
      try{
        const when=e.date.split('-').reverse().join('/')+(e.time?' às '+e.time:'');
        await showNotice('Cora Coralina · Evento próximo',e.title+'\n'+when,{id:e.id,year:api.activeYear,date:e.date});
        past[key]=now;changed=true;sent++;
      }catch(err){console.warn('Notificação local não exibida',err);}
      if(sent>=3)break;
    }
    if(changed)try{localStorage.setItem(SEEN,JSON.stringify(past));}catch(_){}
  }
  async function enable(){
    if(!supported()){update();return;}
    let permission=Notification.permission;
    if(permission==='default'){
      try{permission=await Notification.requestPermission();}catch{permission='denied';}
    }
    if(permission!=='granted'){status('Permissão não concedida. Autorize notificações nas configurações do celular.');return;}
    save({enabled:true,role:$('alertsRole').value,lead:Number($('alertsLead').value)||1440});
    update();
    try{await syncRemoteSubscription();}catch(err){console.warn('Ativação push pendente',err);}
    update();await checkAlerts();
  }
  function init(){
    update();
    $('enableAlerts').addEventListener('click',enable);
    $('disableAlerts').addEventListener('click',async()=>{
      save({enabled:false,role:$('alertsRole').value,lead:Number($('alertsLead').value)||1440});
      try{await syncRemoteSubscription(true);}catch(_){}remoteActive=false;update();
    });
    for(const id of ['alertsRole','alertsLead'])$(id).addEventListener('change',async()=>{
      save({...prefs(),role:$('alertsRole').value,lead:Number($('alertsLead').value)||1440});
      if(prefs().enabled&&Notification.permission==='granted')try{await syncRemoteSubscription();}catch(_){}update();
    });
    $('testAlerts').addEventListener('click',async()=>{
      if(!supported()||Notification.permission!=='granted'){status('Ative as notificações primeiro.');return;}
      try{await showNotice('Cora Coralina · Teste','Seu aplicativo pode apresentar lembretes locais.');status('Aviso de teste enviado.');}
      catch{status('Este navegador não conseguiu exibir a notificação.');}
    });
    window.addEventListener('cora-year-changed',checkAlerts);
    window.addEventListener('cora-data-changed',checkAlerts);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkAlerts();});
    setInterval(checkAlerts,60000);
    checkAlerts();
    if(prefs().enabled&&supported()&&Notification.permission==='granted'){
      syncRemoteSubscription().then(()=>update()).catch(()=>{remoteActive=false;update();});
    }
  }
  if(document.readyState='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
