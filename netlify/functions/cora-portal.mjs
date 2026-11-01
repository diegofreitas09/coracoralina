// Access-controlled publication API for the Cora Coralina calendar.
// Passwords and session keys are set in Netlify project environment variables, never in Git.
import { createHmac, createHash, timingSafeEqual, randomBytes } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const COOKIE='cora_portal_session';
const YEAR=2026;
// Aniversariantes de novembro e dezembro confirmados no planejamento institucional; somente dia/mês.
const DEFAULT_BIRTHDAYS=[{"id":"cora-nov-nadja","name":"Nadja","role":"Professora","day":1,"month":11},{"id":"cora-nov-emanuel","name":"Prof. Emanuel","role":"Professor","day":10,"month":11},{"id":"cora-nov-ana-paula","name":"Ana Paula","role":"","day":10,"month":11},{"id":"cora-nov-aparecida","name":"Aparecida","role":"","day":16,"month":11},{"id":"cora-nov-mikael","name":"Mikael","role":"","day":16,"month":11},{"id":"cora-nov-mendonca","name":"Mendonça","role":"","day":21,"month":11},{"id":"cora-nov-ruth","name":"Ruth","role":"","day":25,"month":11},{"id":"cora-nov-john","name":"John","role":"","day":26,"month":11},{"id":"cora-dec-1","name":"Diego","role":"","day":9,"month":12},{"id":"cora-dec-2","name":"Breno","role":"","day":11,"month":12},{"id":"cora-dec-3","name":"Renan","role":"","day":24,"month":12}];
const HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const answer=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...HEADERS,...extra}});
const vars=()=>({gestao:process.env.CORA_GESTAO_PASSWORD,equipe:process.env.CORA_EQUIPE_PASSWORD,secret:process.env.CORA_SESSION_SECRET});
const configured=()=>{const v=vars();return Boolean(v.gestao&&v.equipe&&v.secret&&v.secret.length>=32)};
const originAllowed=(request)=>{const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin};
const hash=x=>createHash('sha256').update(String(x||'')).digest();
const equal=(a,b)=>timingSafeEqual(hash(a),hash(b));
const token=(role)=>{const payload=Buffer.from(JSON.stringify({role,exp:Date.now()+12*3600e3,nonce:randomBytes(12).toString('hex')})).toString('base64url');const sig=createHmac('sha256',vars().secret).update(payload).digest('base64url');return `${payload}.${sig}`};
const cookie=(request)=>{const c=request.headers.get('cookie')||'';const m=c.match(/(?:^|;\s*)cora_portal_session=([^;]+)/);return m?.[1]||''};
const roleOf=(request)=>{const t=cookie(request),parts=t.split('.');if(parts.length!==2)return null;const expected=createHmac('sha256',vars().secret).update(parts[0]).digest('base64url');if(!equal(parts[1],expected))return null;try{const p=JSON.parse(Buffer.from(parts[0],'base64url').toString());return p.exp>Date.now()&&['gestao','equipe'].includes(p.role)?p.role:null}catch{return null}};
const baseCookie=`Path=/calendario-anual/; HttpOnly; Secure; SameSite=Strict`;
const str=(v,len=255)=>String(v??'').trim().slice(0,len);
const cleanEvent=e=>({id:str(e.id,140),date:str(e.date,10),title:str(e.title,170),type:str(e.type,36),notes:str(e.notes,600)});
const cleanNotice=e=>({id:str(e.id,120),title:str(e.title,130),body:str(e.body,1800),type:['Informativo','Urgente','Reunião','Avaliação'].includes(e.type)?e.type:'Informativo',publishAt:str(e.publishAt,30),expiresAt:str(e.expiresAt,30),eventDate:str(e.eventDate,10),leadDays:Math.max(0,Math.min(30,Number(e.leadDays)||0))});
const cleanBirthday=b=>({id:str(b.id,140),name:str(b.name,100),role:str(b.role,85),day:Number(b.day),month:Number(b.month)});
const validBirthday=b=>b.id&&b.name&&Number.isInteger(b.month)&&b.month>=1&&b.month<=12&&Number.isInteger(b.day)&&b.day>=1&&b.day<=new Date(Date.UTC(2024,b.month,0)).getUTCDate();
// Migração versionada para respeitar alterações posteriores da Gestão.
const BIRTHDAY_SEED_VERSION=2;
function migrateBirthdays(state){
 if(Number(state?.birthdaySeedVersion||0)>=BIRTHDAY_SEED_VERSION)return state;
 const draft=state||{year:YEAR,updatedAt:new Date().toISOString(),events:[],notices:[],config:{defaultLeadDays:3}};
 const existing=Array.isArray(draft.birthdays)?draft.birthdays:DEFAULT_BIRTHDAYS.filter(x=>x.month===11);
 const birthdays=[...existing];
 const same=(a,b)=>a.day===b.day&&a.month===b.month&&str(a.name,100).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase()===str(b.name,100).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();
 for(const item of DEFAULT_BIRTHDAYS.filter(x=>x.month===12))if(!birthdays.some(x=>same(x,item)))birthdays.push(item);
 birthdays.sort((a,b)=>a.month-b.month||a.day-b.day||a.name.localeCompare(b.name,'pt-BR'));
 return {...draft,birthdays,birthdaySeedVersion:BIRTHDAY_SEED_VERSION};
}
const validISO=s=>/^2026-\d\d-\d\d$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'));
export default async function handler(request){
 const url=new URL(request.url),action=url.searchParams.get('action')||'me';
 if(request.method==='OPTIONS')return new Response('',{status:405,headers:HEADERS});
 if(!configured())return answer({error:'Configuracao segura pendente: definir as tres variaveis CORA_* nas configuracoes protegidas do Netlify.',configured:false},503);
 if(!originAllowed(request))return answer({error:'Origem não autorizada'},403);
 const role=roleOf(request);
 if(action==='me'&&request.method==='GET')return answer({configured:true,role:role||null});
 if(action==='login'&&request.method==='POST'){
  const size=Number(request.headers.get('content-length')||0);if(size>2048)return answer({error:'Entrada muito longa'},413);
  let p;try{p=await request.json()}catch{return answer({error:'Entrada inválida'},400)};
  const user=p.role==='gestao'?'gestao':p.role==='equipe'?'equipe':'';
  if(!user||!equal(p.password,vars()[user]))return answer({error:'Acesso não autorizado'},401);
  return answer({role:user,configured:true},200,{'set-cookie':`${COOKIE}=${token(user)}; Max-Age=43200; ${baseCookie}`});
 }
 if(action==='logout'&&request.method==='POST')return answer({ok:true},200,{'set-cookie':`${COOKIE}=; Max-Age=0; ${baseCookie}`});
 if(!role)return answer({error:'Sessão expirada. Faça login.'},401);
 const store=getStore('cora-calendar-publications');
 if(action==='state'&&request.method==='GET'){
  let state=await store.get('published-2026',{type:'json',consistency:'strong'});
  if(Number(state?.birthdaySeedVersion||0)<BIRTHDAY_SEED_VERSION){
   state=migrateBirthdays(state);
   await store.setJSON('published-2026',state);
  }
  return answer({role,publication:state});
 }
 if(action==='publish'&&request.method==='POST'){
  if(role!=='gestao')return answer({error:'Apenas a Gestão pode publicar.'},403);
  if(request.headers.get('x-cora-request')!=='portal')return answer({error:'Requisição inválida'},400);
  const size=Number(request.headers.get('content-length')||0);if(size>420000)return answer({error:'Publicação muito grande'},413);
  let input;try{input=await request.json()}catch{return answer({error:'JSON inválido'},400)};
  if(!Array.isArray(input.events)||!Array.isArray(input.notices)||input.events.length>5000||input.notices.length>300)return answer({error:'Dados inválidos'},400);
  const events=input.events.map(cleanEvent).filter(e=>validISO(e.date)&&e.id&&e.title);
  const notices=input.notices.map(cleanNotice).filter(n=>n.id&&n.title);
  if(input.birthdays!==undefined&&(!Array.isArray(input.birthdays)||input.birthdays.length>500))return answer({error:'Lista de aniversariantes inválida'},400);
  const previous=await store.get('published-2026',{type:'json',consistency:'strong'});
  const baseBirthdays=input.birthdays===undefined?(Array.isArray(previous?.birthdays)?previous.birthdays:DEFAULT_BIRTHDAYS):input.birthdays.map(cleanBirthday).filter(validBirthday);
  const migrated=migrateBirthdays({...previous,birthdays:baseBirthdays});
  const birthdays=migrated.birthdays.filter((b,i,a)=>a.findIndex(p=>p.id===b.id)===i).sort((a,b)=>a.month-b.month||a.day-b.day||a.name.localeCompare(b.name,'pt-BR'));
  const state={year:YEAR,updatedAt:new Date().toISOString(),events,notices,birthdays,birthdaySeedVersion:BIRTHDAY_SEED_VERSION,config:{defaultLeadDays:Math.max(0,Math.min(30,Number(input.config?.defaultLeadDays)||3))}};
  await store.setJSON('published-2026',state);
  return answer({ok:true,updatedAt:state.updatedAt,counts:{events:events.length,notices:notices.length,birthdays:birthdays.length}});
 }
 return answer({error:'Recurso inexistente'},404);
}
export const config={path:'/calendario-anual/api'};