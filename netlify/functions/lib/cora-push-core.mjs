/* Web Push protegido: VAPID derivado do segredo de sessão que já existe na função.
 * Não expõe chaves privadas ou inscrições ao navegador. */
import {createHmac, createHash, createECDH} from 'node:crypto';
import webpush from 'web-push';
import {getStore} from '@netlify/blobs';

const CURVE_ORDER=BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551');
export const SUB_STORE='cora-calendar-web-push-v1';
const allowedSubscription=s=>{
 if(!s||typeof s!=='object'||typeof s.endpoint!=='string'||s.endpoint.length>1500)return false;
 let url;try{url=new URL(s.endpoint)}catch{return false}
 return url.protocol==='https:'&&!url.username&&!url.password&&
  /^[-_A-Za-z0-9]{40,240}$/.test(String(s.keys?.p256dh||''))&&
  /^[-_A-Za-z0-9]{12,50}$/.test(String(s.keys?.auth||''));
};
export const vapidKeys=()=>{
 const secret=process.env.CORA_SESSION_SECRET;
 if(!secret||secret.length<32)throw new Error('Chave segura do portal indisponível');
 const digest=createHmac('sha256',secret).update('cora-calendar-vapid:v1:push').digest('hex');
 const scalar=(BigInt('0x'+digest)%(CURVE_ORDER-1n))+1n;
 const privateKey=Buffer.from(scalar.toString(16).padStart(64,'0'),'hex');
 const ecdh=createECDH('prime256v1');ecdh.setPrivateKey(privateKey);
 return {publicKey:ecdh.getPublicKey(undefined,'uncompressed').toString('base64url'),privateKey:privateKey.toString('base64url'),
 subject:'https://calendario-anual-cora-2026.netlify.app'};
};
const store=()=>getStore(SUB_STORE);
export const fingerprint=s=>createHash('sha256').update(String(s.endpoint||'')).digest('hex');
export async function registrations(){
 const items=await store().get('registrations',{type:'json',consistency:'strong'});
 return Array.isArray(items)?items.filter(x=>allowedSubscription(x.subscription)).slice(0,1500):[];
}
export async function saveRegistration(subscription,owner){
 if(!/^member-[a-f0-9]{64}$/.test(String(owner?.userId||''))||!Number.isInteger(owner?.version))throw new Error('Conta pessoal obrigatória');
 if(!allowedSubscription(subscription))throw new Error('Inscrição inválida');
 const index=fingerprint(subscription);
 const all=await registrations();
 const next=[...all.filter(s=>s.id!==index),{id:index,subscription,userId:owner.userId,sessionVersion:owner.version,
  updatedAt:new Date().toISOString()}].slice(-1500);
 await store().setJSON('registrations',next);
 return {active:true,devices:next.length};
}
export async function deleteRegistration(subscription,userId){
 if(!subscription?.endpoint)return {active:false};
 if(!/^member-[a-f0-9]{64}$/.test(String(userId||'')))throw new Error('Conta pessoal necessária');
 const id=fingerprint(subscription);
 const all=await registrations(),filtered=all.filter(s=>!(s.id===id&&s.userId===userId));
 await store().setJSON('registrations',filtered);
 return {active:false,devices:filtered.length};
}
export async function deleteUserRegistrations(userId){
 const all=await registrations(),next=all.filter(item=>item.userId!==userId);
 if(next.length!==all.length)await store().setJSON('registrations',next);
 return {removed:all.length-next.length};
}
export const deliveryId=(kind,year,id,version='')=>
 createHash('sha256').update([kind,year,id,version].join('|')).digest('hex').slice(0,32);
export async function hasDelivered(id){return Boolean(await store().get('sent-'+id,{type:'json',consistency:'strong'}))}
export async function markDelivered(id,value){await store().setJSON('sent-'+id,{at:new Date().toISOString(),...value})}
export async function dispatchPush(message,{timeout=4500,targetUserId=null}={}){
 const legacy=await registrations(),accounts=getStore('cora-calendar-team-accounts-v1'),cache=new Map(),all=[];
 const stage=Number(message.stageNumber),year=Number(message.year);
 const checkDelivery=message.kind==='assessment-deadline'&&Number.isInteger(year)&&Number.isInteger(stage)&&stage>=1&&stage<=4;
 const deliveryStore=checkDelivery?getStore('cora-calendar-team-deliveries-v1'):null,deliveryCache=new Map();
 for(const record of legacy){
  if(targetUserId&&record.userId!==targetUserId)continue;
  if(!/^member-[a-f0-9]{64}$/.test(String(record.userId||'')))continue;
  if(!cache.has(record.userId))cache.set(record.userId,await accounts.get(record.userId,{type:'json',consistency:'strong'}));
  const member=cache.get(record.userId);
  if(member?.status==='Ativo'&&member.sessionVersion===record.sessionVersion){
   if(checkDelivery){
    if(!deliveryCache.has(record.userId))deliveryCache.set(record.userId,await deliveryStore.get(record.userId,{type:'json',consistency:'strong'})||{});
    if(deliveryCache.get(record.userId)?.[year+'-'+stage]?.status==='entregue')continue;
   }
   all.push(record);
  }
 }
 if(!all.length)return {registered:0,sent:0,failed:0,expired:0};
 const {publicKey,privateKey,subject}=vapidKeys();
 const payload=JSON.stringify({title:String(message.title||'Colégio Cora Coralina').slice(0,130),
  body:String(message.body||'Novo aviso da Gestão').slice(0,320),
  year:Number(message.year)||2026,tag:String(message.tag||'cora-avisos').slice(0,90),
  kind:message.kind||'notice',url:message.kind==='helpdesk'?'./?duvidas=1':'./?avisos=1&ano='+(Number(message.year)||2026)});
 let sent=0,failed=0,expired=0;
 const stale=new Set();
 for(let i=0;i<all.length;i+=25){
  await Promise.all(all.slice(i,i+25).map(async record=>{
   try{
    await webpush.sendNotification(record.subscription,payload,{
      vapidDetails:{subject,publicKey,privateKey},urgency:message.urgent?'high':'normal',
      TTL:24*3600,timeout
    });
    sent++;
   }catch(e){
    failed++;
    if(e.statusCode===404||e.statusCode===410){stale.add(record.id);expired++}
   }
  }));
 }
 if(stale.size){
  // Uma entrega dirigida a um professor não pode apagar inscrições dos demais.
  // Releia o índice completo antes de excluir somente os endpoints inválidos.
  const current=await registrations();
  await store().setJSON('registrations',current.filter(x=>!stale.has(x.id)));
 }
 return {registered:all.length,sent,failed,expired};
}

export async function testDevicePush(subscription,userId){
 if(!allowedSubscription(subscription))throw new Error('Inscrição do aparelho inválida');
 const all=await registrations();
 if(!all.some(s=>s.id===fingerprint(subscription)&&s.userId===userId))throw new Error('Este aparelho não pertence à sua conta');
 const {publicKey,privateKey,subject}=vapidKeys();
 await webpush.sendNotification(subscription,JSON.stringify({
  title:'Teste de Web Push · Cora Coralina',
  body:'Notificação enviada pelo servidor, inclusive com o aplicativo fechado. Confira a vibração e a barra de notificações.',
  year:2026,tag:'cora-teste-'+Date.now(),kind:'test',url:'./?avisos=1'
 }),{vapidDetails:{subject,publicKey,privateKey},urgency:'high',TTL:300,timeout:6500});
 return {sent:true};
}
