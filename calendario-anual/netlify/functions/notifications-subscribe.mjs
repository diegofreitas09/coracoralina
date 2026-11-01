import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';

const STORE='cora-push-subscriptions';
const ROLES=new Set(['Professores','Colaboradores']);
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
function allowedEndpoint(endpoint) {
  try {
    const u=new URL(endpoint),h=u.hostname.toLowerCase();
    if(u.protocol!=='https:' || u.username || u.password || !endpoint.startsWith('https://'))return false;
    return ['fcm.googleapis.com','updates.push.services.mozilla.com','push.services.mozilla.com','web.push.apple.com','wns2-by3p.notify.windows.com'].includes(h)
      || h.endsWith('.push.apple.com') || h.endsWith('.notify.windows.com');
  } catch {return false;}
}
function parseSubscription(value) {
  if(!value || typeof value!=='object' || !allowedEndpoint(value.endpoint))return null;
  if(typeof value.keys?.auth!=='string'||typeof value.keys?.p256dh!=='string')return null;
  if(value.keys.auth.length>256||value.keys.p256dh.length>512)return null;
  return {endpoint:value.endpoint,expirationTime:value.expirationTime||null,
    keys:{auth:value.keys.auth,p256dh:value.keys.p256dh}};
}
export default async request => {
  if(!process.env.CORA_VAPID_PUBLIC_KEY||!process.env.CORA_VAPID_PRIVATE_KEY)return json({ok:false,error:'Web Push ainda não está habilitado no servidor.'},503);
  if(!['POST','DELETE'].includes(request.method))return json({ok:false,error:'Método inválido.'},405);
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return json({ok:false,error:'Origem não autorizada.'},403);
  let body;
  try{const raw=await request.text();if(raw.length>8192)return json({ok:false,error:'Solicitação muito grande.'},413);body=JSON.parse(raw);}
  catch{return json({ok:false,error:'JSON inválido.'},400);}
  const sub=parseSubscription(body.subscription);
  if(!sub)return json({ok:false,error:'Endpoint push inválido.'},400);
  const hash=createHash('sha256').update(sub.endpoint).digest('hex');
  try{
    const store=getStore({name:STORE,consistency:'strong'}),key='subscriptions/'+hash;
    if(request.method==='DELETE'){
      await store.delete(key);
      return json({ok:true,removed:true});
    }
    if(!ROLES.has(body.role))return json({ok:false,error:'Perfil inválido.'},400);
    await store.setJSON(key,{subscription:sub,role:body.role,consentedAt:new Date().toISOString()});
    return json({ok:true,subscribed:true,role:body.role});
  }catch(error){
    console.error('Erro ao registrar assinatura push',error);
    return json({ok:false,error:'Não foi possível registrar este aparelho.'},500);
  }
};
export const config={
  rateLimit:{action:'rate_limit',aggregateBy:'ip',windowSize:60,windowLimit:30}
};
