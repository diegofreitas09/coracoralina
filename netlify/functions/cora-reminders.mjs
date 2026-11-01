/* Netlify Scheduled Function — avisos futuros e lembretes por antecedência.
 * Executa a cada 30 min (UTC), sem acesso público por URL. */
import {getStore} from '@netlify/blobs';
import {dispatchPush,deliveryId,hasDelivered,markDelivered} from './lib/cora-push-core.mjs';
const publicationStore=()=>getStore('cora-calendar-publications');
const toLocalTime=value=>{
 if(!value)return NaN;
 const s=String(value);
 return Date.parse(s.endsWith('Z')||/[+-]\d\d:\d\d$/.test(s)?s:s+':00-03:00');
};
const todayInFortaleza=()=>{
 const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Fortaleza',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23',minute:'2-digit'});
 const p=Object.fromEntries(fmt.formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return {day:p.year+'-'+p.month+'-'+p.day,hour:Number(p.hour),minute:Number(p.minute)};
};
const daysUntil=(date,today)=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return null;
 return Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);
};
export default async function handler(){
 if(!process.env.CORA_SESSION_SECRET)return;
 const store=publicationStore(),{day,hour,minute}=todayInFortaleza();
 const years=await store.get('published-years',{type:'json',consistency:'strong'});
 if(!Array.isArray(years))return;
 // No mesmo dia, enviar lembretes por volta das 9h; cada item tem chave de deduplicação.
 const dailyReminder=hour===9&&minute<=35;
 for(const year of years.filter(y=>Number.isInteger(y)&&y>=2026&&y<=2099).slice(-8)){
  const data=await store.get('published-'+year,{type:'json',consistency:'strong'});
  if(!data)continue;
  const pending=[];
  for(const n of data.notices||[]){
   const publishTime=toLocalTime(n.publishAt);
   if(!Number.isFinite(publishTime)||publishTime>Date.now()||Date.now()-publishTime>7*86400000)continue;
   const id=deliveryId('notice',year,n.id,n.title+'|'+n.body+'|'+n.publishAt);
   pending.push({id,kind:'notice',title:n.title,body:n.body,tag:'notice-'+n.id});
   if(dailyReminder&&n.eventDate&&daysUntil(n.eventDate,day)===Number(n.leadDays||0)){
    const rid=deliveryId('reminder',year,n.id,n.eventDate+'-'+day);
    pending.push({id:rid,kind:'reminder',title:'Lembrete: '+n.title,body:n.body,tag:'reminder-'+n.id+'-'+n.eventDate});
   }
  }
  if(dailyReminder){
   const lead=Math.max(0,Math.min(14,Number(data.config?.defaultLeadDays??3)));
   for(const e of data.events||[]){
    if(daysUntil(e.date,day)!==lead)continue;
    pending.push({id:deliveryId('event',year,e.id,e.date+'-'+day),kind:'event',
      title:'Próxima atividade: '+e.title,body:e.notes||e.type||'Confira o calendário escolar',
      tag:'event-'+e.id+'-'+e.date});
   }
  }
  for(const item of pending.slice(0,45)){
   if(await hasDelivered(item.id))continue;
   try{
    const stats=await dispatchPush({...item,year,urgent:item.kind==='notice'});
    if(stats.registered)await markDelivered(item.id,{kind:item.kind,year,sent:stats.sent,failed:stats.failed});
   }catch(e){console.error('Erro de envio agendado',e.message)}
  }
 }
}
export const config={schedule:'*/30 * * * *'};
