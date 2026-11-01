import { getStore } from '@netlify/blobs';
import webpush from 'web-push';

const SUBS='cora-push-subscriptions', SENT='cora-push-sent';
const dateParts=when=>{
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit'})
    .formatToParts(when);
  const value=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return `${value.year}-${value.month}-${value.day}`;
};
const followingDate=date=>{
  const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);
};
export default async () => {
  const pub=process.env.CORA_VAPID_PUBLIC_KEY,priv=process.env.CORA_VAPID_PRIVATE_KEY;
  if(!pub||!priv){console.log('Envio push não ativado: configurar CORA_VAPID_PUBLIC_KEY e CORA_VAPID_PRIVATE_KEY.');return;}
  webpush.setVapidDetails(process.env.CORA_VAPID_CONTACT||'https://calendario-anual-cora-2026.netlify.app',pub,priv);
  const hour=new Date().getUTCHours();
  const isToday=hour<=15;
  const today=dateParts(new Date()),eventDate=isToday?today:followingDate(today);
  const slot=isToday?'hoje':'amanha';
  const cdn=(process.env.URL||'https://calendario-anual-cora-2026.netlify.app').replace(/\/$/,'');
  const response=await fetch(cdn+'/push-events-2026.json',{headers:{'Accept':'application/json'}});
  if(!response.ok)throw new Error('Fonte de eventos não está disponível');
  const source=await response.json();
  const events=(source.events||[]).filter(e=>e.date===eventDate&&e.status==='Publicado');
  if(!events.length){console.log('Nenhum evento para o aviso',eventDate,slot);return;}
  const dateLabel=eventDate.split('-').reverse().join('/');
  const preview=events.slice(0,3).map(e=>String(e.title).slice(0,65)).join(' • ');
  const body=(isToday?'Hoje':'Amanhã')+' ('+dateLabel+'): '+preview+(events.length>3?' e mais '+(events.length-3)+' atividade(s)':'');
  const store=getStore({name:SUBS,consistency:'strong'});
  const receipts=getStore({name:SENT,consistency:'strong'});
  const {blobs}=await store.list({prefix:'subscriptions/'});
  const candidates=blobs.slice(0,500);
  const chunkSize=10;let count=0;
  for(let pos=0;pos<candidates.length;pos+=chunkSize){
    await Promise.allSettled(candidates.slice(pos,pos+chunkSize).map(async ref=>{
      const key=ref.key,hash=key.split('/').pop();
      const receipt=`${eventDate}/${slot}/${hash}`;
      if(await receipts.get(receipt)!==null)return;
      const record=await store.get(key,{type:'json'});
      if(!record?.subscription || !['Professores','Colaboradores'].includes(record.role))return;
      try{
        await webpush.sendNotification(record.subscription,JSON.stringify({
          title:'Agenda Cora Coralina',body,id:`${slot}-${eventDate}`,
          data:{year:'2026',date:eventDate}
        }),{TTL:86400,urgency:'normal'});
        await receipts.set(receipt,new Date().toISOString(),{onlyIfNew:true});
        count++;
      }catch(e){
        if(e?.statusCode===404 || e?.statusCode===410){await store.delete(key);return;}
        console.warn('Falha em envio push',e?.statusCode||e?.message||'erro');
      }
    }));
  }
  console.log('Notificações enviadas:',count,'/ dispositivos:',candidates.length);
};
export const config={schedule:'0 10,21 * * *'};
