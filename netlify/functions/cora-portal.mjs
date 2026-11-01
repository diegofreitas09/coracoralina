// Access-controlled publication API for the Cora Coralina calendar.
// Passwords and session keys are set in Netlify project environment variables, never in Git.
import { createHmac, createHash, timingSafeEqual, randomBytes } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import {vapidKeys,registrations,saveRegistration,deleteRegistration,dispatchPush,deliveryId,hasDelivered,markDelivered,testDevicePush} from './lib/cora-push-core.mjs';

const COOKIE='cora_portal_session';
const YEAR=2026;

const STAGES_2026=[{number:1,start:'2026-01-20',end:'2026-04-17'},{number:2,start:'2026-04-20',end:'2026-06-30'},{number:3,start:'2026-08-03',end:'2026-09-25'},{number:4,start:'2026-10-05',end:'2026-11-27'}];
const schoolYear=v=>{const n=Number(v);return Number.isInteger(n)&&n>=2026&&n<=2099?n:null};
const publishedKey=y=>'published-'+y;
const validYearDate=(s,y)=>{const value=String(s||'');if(!new RegExp('^'+y+'-[0-9]{2}-[0-9]{2}$').test(value))return false;const date=new Date(value+'T12:00:00Z');return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value};
const stagesFor=(a,y)=>[1,2,3,4].map(n=>{const s=(Array.isArray(a)?a:[]).find(x=>Number(x.number)===n)||{};return {number:n,start:validYearDate(s.start,y)?s.start:'',end:validYearDate(s.end,y)?s.end:''}});

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
const cleanEvent=e=>{
 const item={id:str(e.id,140),date:str(e.date,10),title:str(e.title,170),type:str(e.type,36),notes:str(e.notes,600)};
 // Campos de entrega de avaliações mantidos na publicação compartilhada.
 // Eventos comuns não recebem metadados de alerta obrigatório.
 if(e.assessmentDelivery===true && /^cora-entrega-avaliacoes-\d{4}-[1-4]$/.test(item.id)){
  item.assessmentDelivery=true;
  item.stageNumber=Math.max(1,Math.min(4,Math.trunc(Number(e.stageNumber)||1)));
  item.leadDays=5;
  item.deliveryTypes=str(e.deliveryTypes,160);
  item.fundamentalEmail='coordenacaofundamentalcora@gmail.com';
  item.medioEmail='coordenacaomediocora@gmail.com';
 }
 return item;
};
// Cronograma histórico recebido oficialmente da coordenação em 2026.
// Disponível no portal da equipe mesmo em publicações anteriores à integração de prazos.
// As entradas existentes do mesmo ID têm prioridade: edições da Gestão são preservadas.
const OFFICIAL_DELIVERIES_2026=[
 {stage:1,date:'2026-01-05',types:'AP2 e AD'},
 {stage:2,date:'2026-03-06',types:'AP2, AD e Recomposição do 1º semestre'},
 {stage:3,date:'2026-06-29',types:'AD'},
 {stage:4,date:'2026-08-28',types:'AP2, AD e Recomposição do 2º semestre'}
].map(({stage,date,types})=>cleanEvent({
 id:'cora-entrega-avaliacoes-2026-'+stage,date,
 title:'Entrega das avaliações à coordenação — '+stage+'ª etapa',
 type:'Avaliação',notes:'Entrega de '+types+' à coordenação. Fundamental: coordenacaofundamentalcora@gmail.com. Médio: coordenacaomediocora@gmail.com.',
 assessmentDelivery:true,stageNumber:stage,deliveryTypes:types
}));
function includeOfficial2026Deliveries(state){
 if(!state)return state;
 const existing=Array.isArray(state.events)?state.events:[];
 const officialById=new Map(OFFICIAL_DELIVERIES_2026.map(e=>[e.id,e]));
 const repaired=existing.map(event=>{
  const original=officialById.get(String(event?.id||''));
  if(!original||event.assessmentDelivery===true)return event;
  // Um cadastro legado com o mesmo ID pode ter perdido o indicador de entrega.
  // Restaura os metadados sem mudar a data definida posteriormente pela Gestão.
  return {...original,...event,assessmentDelivery:true,stageNumber:original.stageNumber,
   deliveryTypes:str(event.deliveryTypes||original.deliveryTypes,160),
   fundamentalEmail:original.fundamentalEmail,medioEmail:original.medioEmail,leadDays:5};
 });
 const ids=new Set(repaired.map(e=>String(e?.id||'')));
 const additions=OFFICIAL_DELIVERIES_2026.filter(e=>!ids.has(e.id));
 if(!additions.length&&repaired.every((event,i)=>event===existing[i]))return state;
 return {...state,events:[...repaired,...additions].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')))};
}
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
const validISO=(s,y)=>validYearDate(s,y);
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

 if(action==='push-key'&&request.method==='GET'){
  return answer({publicKey:vapidKeys().publicKey,enabled:true});
 }
 if(action==='push-register'&&request.method==='POST'){
  if(role!=='equipe')return answer({error:'Somente colaboradores podem registrar aparelhos'},403);
  if(request.headers.get('x-cora-request')!=='portal')return answer({error:'Requisição inválida'},400);
  let input;try{input=await request.json()}catch{return answer({error:'Dados inválidos'},400)}
  try{return answer(await saveRegistration(input.subscription),200)}catch(e){return answer({error:e.message},400)}
 }
 if(action==='push-remove'&&request.method==='POST'){
  if(role!=='equipe')return answer({error:'Somente colaboradores podem cancelar inscrições'},403);
  if(request.headers.get('x-cora-request')!=='portal')return answer({error:'Requisição inválida'},400);
  let input;try{input=await request.json()}catch{return answer({error:'Dados inválidos'},400)}
  return answer(await deleteRegistration(input.subscription),200);
 }
 if(action==='push-test'&&request.method==='POST'){
  if(role!=='equipe')return answer({error:'Acesso restrito a colaboradores'},403);
  if(request.headers.get('x-cora-request')!=='portal')return answer({error:'Requisição inválida'},400);
  let body;try{body=await request.json()}catch{return answer({error:'Inscrição inválida'},400)}
  try{return answer(await testDevicePush(body.subscription),200)}
  catch(error){return answer({error:'O serviço push não confirmou o envio: '+error.message},502)}
 }
 if(action==='push-status'&&request.method==='GET'){
  if(role!=='gestao')return answer({error:'Apenas gestão'},403);
  return answer({devices:(await registrations()).length},200);
 }
 const store=getStore('cora-calendar-publications');

 if(action==='state'&&request.method==='GET'){
  const year=schoolYear(url.searchParams.get('year')||YEAR);
  if(!year)return answer({error:'Ano letivo inválido'},400);
  const yearsStored=await store.get('published-years',{type:'json',consistency:'strong'});
  const availableYears=Array.from(new Set([2026,...(Array.isArray(yearsStored)?yearsStored:[]).filter(schoolYear)])).sort((a,b)=>a-b);
  let state=await store.get(publishedKey(year),{type:'json',consistency:'strong'});
  if(year===2026&&Number(state?.birthdaySeedVersion||0)<BIRTHDAY_SEED_VERSION){
    state=migrateBirthdays(state);
    await store.setJSON(publishedKey(2026),state);
  }
  if(state&&!Array.isArray(state.stages))state={...state,stages:year===2026?STAGES_2026:stagesFor([],year)};
  // Repara publicações antigas em tempo de leitura sem mexer em comunicados ou em anos posteriores.
  if(year===2026)state=includeOfficial2026Deliveries(state);
  return answer({role,year,availableYears,publication:state});
 }
 if(action==='publish'&&request.method==='POST'){
  if(role!=='gestao')return answer({error:'Apenas a Gestão pode publicar.'},403);
  if(request.headers.get('x-cora-request')!=='portal')return answer({error:'Requisição inválida'},400);
  const size=Number(request.headers.get('content-length')||0);
  if(size>420000)return answer({error:'Publicação muito grande'},413);
  let input;try{input=await request.json()}catch{return answer({error:'JSON inválido'},400)}
  const year=schoolYear(input.year||YEAR);if(!year)return answer({error:'Ano letivo inválido'},400);
  if(!Array.isArray(input.events)||!Array.isArray(input.notices)||input.events.length>5000||input.notices.length>300)return answer({error:'Dados inválidos'},400);
  const incomingEvents=input.events.map(cleanEvent).filter(e=>validISO(e.date,year)&&e.id&&e.title);
  if(incomingEvents.length!==input.events.length)return answer({error:'Eventos com datas inválidas ou de outro ano: revise o calendário.'},400);
  const notices=input.notices.map(cleanNotice).filter(n=>n.id&&n.title);
  if(input.birthdays!==undefined&&(!Array.isArray(input.birthdays)||input.birthdays.length>500))return answer({error:'Aniversariantes inválidos'},400);
  const previous=await store.get(publishedKey(year),{type:'json',consistency:'strong'});
  // A publicação nova nunca perde o histórico das quatro entregas oficiais de 2026.
  // Dados enviados agora pela Gestão prevalecem; em seguida vêm edições já publicadas;
  // só então completamos IDs inexistentes com as datas oficiais originais.
  const events=year===2026?includeOfficial2026Deliveries({events:[...incomingEvents,
    ...(previous?.events||[]).filter(e=>e.assessmentDelivery===true&&
      /^cora-entrega-avaliacoes-2026-[1-4]$/.test(String(e.id||''))&&
      !incomingEvents.some(n=>n.id===e.id))]})?.events||incomingEvents:incomingEvents;
  const legacy=year===2026?previous:await store.get(publishedKey(2026),{type:'json',consistency:'strong'});
  const baseBirthdays=input.birthdays===undefined?(Array.isArray(legacy?.birthdays)?legacy.birthdays:DEFAULT_BIRTHDAYS):input.birthdays.map(cleanBirthday).filter(validBirthday);
  const migrated=migrateBirthdays({...legacy,birthdays:baseBirthdays});
  const birthdays=migrated.birthdays.filter((b,i,a)=>a.findIndex(p=>p.id===b.id)===i).sort((a,b)=>a.month-b.month||a.day-b.day||a.name.localeCompare(b.name,'pt-BR'));
  const projects=Array.from({length:12},(_,i)=>(Array.isArray(input.projects?.[i])?input.projects[i]:previous?.projects?.[i]||[])
    .slice(0,80).map(x=>str(x,170)).filter(Boolean));
  const stages=stagesFor(input.stages??(previous?.stages||(year===2026?STAGES_2026:[])),year);
  if(stages.some(st=>Boolean(st.start)!==Boolean(st.end)||(st.start&&st.end&&st.start>st.end)))return answer({error:'Etapa com início e fim inconsistentes'},400);
  const state={year,updatedAt:new Date().toISOString(),events,notices,birthdays,stages,projects,birthdaySeedVersion:BIRTHDAY_SEED_VERSION,config:{defaultLeadDays:Math.max(0,Math.min(30,Number(input.config?.defaultLeadDays??3)))}};
  await store.setJSON(publishedKey(year),state);
  const previousYears=await store.get('published-years',{type:'json',consistency:'strong'});
  const years=Array.from(new Set([2026,year,...(Array.isArray(previousYears)?previousYears:[]).filter(schoolYear)])).sort((a,b)=>a-b);
  await store.setJSON('published-years',years);
  const sentStats={registered:0,sent:0,failed:0,expired:0,notices:0};
  const oldNotices=new Map((previous?.notices||[]).map(n=>[String(n.id),n]));
  const now=Date.now();
  for(const notice of notices){
   if(notice.publishAt&&Date.parse(notice.publishAt+'-03:00')>now)continue;
   const old=oldNotices.get(String(notice.id));
   if(old&&old.title===notice.title&&old.body===notice.body&&old.publishAt===notice.publishAt)continue;
   const id=deliveryId('notice',year,notice.id,notice.title+'|'+notice.body+'|'+notice.publishAt);
   if(await hasDelivered(id))continue;
   try{
    const stats=await dispatchPush({title:notice.title,body:notice.body,year,tag:'notice-'+notice.id,
      urgent:notice.type==='Urgente',kind:'notice'});
    sentStats.registered=stats.registered;
    sentStats.sent+=stats.sent;sentStats.failed+=stats.failed;sentStats.expired+=stats.expired;
    if(stats.registered){await markDelivered(id,{...stats,year,kind:'notice'});sentStats.notices++}
   }catch(error){console.error('Falha ao enviar push da Gestão',error.message)}
  }
  return answer({ok:true,year,availableYears:years,updatedAt:state.updatedAt,push:sentStats,counts:{events:events.length,notices:notices.length,birthdays:birthdays.length,stages:stages.filter(x=>x.start&&x.end).length}});
 }
 return answer({error:'Recurso inexistente'},404);
}
export const config={path:'/calendario-anual/api'};