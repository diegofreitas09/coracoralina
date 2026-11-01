// Individual employee authorization for Cora Calendar.
// Google Sheets is an administrative roster; it is not an authorization or password database.
import { getStore } from '@netlify/blobs';
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { deleteUserRegistrations } from './cora-push-core.mjs';

const STORE='cora-calendar-team-accounts-v1';
const COOKIE='cora_portal_session';
const cookieFlags='Path=/calendario-anual/; HttpOnly; Secure; SameSite=Strict';
const db=()=>getStore(STORE);
const digest=x=>createHash('sha256').update(String(x||'')).digest('hex');
const secureEqual=(a,b)=>{
 const aa=Buffer.from(digest(a),'hex'),bb=Buffer.from(digest(b),'hex');
 return timingSafeEqual(aa,bb);
};
const emailOf=v=>String(v||'').trim().toLowerCase();
const validEmail=e=>e.length<=180&&/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const keyFor=email=>'member-'+digest(emailOf(email));
const securePassword=p=>typeof p==='string'&&p.length>=10&&p.length<=120&&/[A-Za-zÀ-ÿ]/.test(p)&&/[0-9]/.test(p);
const derive=(password,salt)=>scryptSync(password,salt,32).toString('hex');
const publicMember=r=>({id:r.id,name:r.name,email:r.email,profile:r.profile,segment:r.segment,status:r.status,
 activatedAt:r.activatedAt||'',lastLogin:r.lastLogin||'',updatedAt:r.updatedAt||''});
const error=(message,status=400)=>({error:message,status});
const account=async id=>/^member-[0-9a-f]{64}$/.test(String(id||''))?
 db().get(id,{type:'json',consistency:'strong'}):null;
function signedSession(record,secret){
 const json={role:'equipe',uid:record.id,ver:record.sessionVersion,exp:Date.now()+12*3600e3,nonce:randomBytes(10).toString('hex')};
 const body=Buffer.from(JSON.stringify(json)).toString('base64url');
 const sig=createHmac('sha256',secret).update(body).digest('base64url');
 return COOKIE+'='+body+'.'+sig+'; Max-Age=43200; '+cookieFlags;
}
export async function currentMember(request,secret){
 const cookies=request.headers.get('cookie')||'',match=cookies.match(/(?:^|;\s*)cora_portal_session=([^;]+)/);
 if(!match)return null;
 const [body,sig]=match[1].split('.');if(!body||!sig)return null;
 const valid=createHmac('sha256',secret).update(body).digest('base64url');
 if(!secureEqual(sig,valid))return null;
 try{
  const p=JSON.parse(Buffer.from(body,'base64url').toString('utf8'));
  if(p.role!=='equipe'||p.exp<=Date.now()||!Number.isInteger(p.ver))return null;
  const r=await account(p.uid);
  return r&&r.status==='Ativo'&&r.sessionVersion===p.ver?r:null;
 }catch{return null}
}
export function statuses(record,year){
 const result={};
 for(let n=1;n<=4;n++){
  const item=record?.statuses?.[year+'-'+n];
  if(item&&['entregue','nao_entregou'].includes(item.status))result[n]={status:item.status,updatedAt:item.updatedAt};
 }
 return result;
}
export async function loginEmployee(input,secret){
 const email=emailOf(input.email),password=String(input.password||'');
 if(!validEmail(email)||password.length>120)return error('E-mail ou senha inválidos.',401);
 const r=await account(keyFor(email));
 if(!r||r.status!=='Ativo'||!r.salt||!r.passwordHash)return error('Conta não autorizada ou credenciais incorretas.',401);
 if(Date.parse(r.lockedUntil||'')>Date.now())return error('Muitas tentativas. Tente novamente em alguns minutos.',429);
 const got=Buffer.from(derive(password,r.salt),'hex'),expected=Buffer.from(r.passwordHash,'hex');
 if(got.length!==expected.length||!timingSafeEqual(got,expected)){
  const count=(Number(r.failedLogins)||0)+1;
  await db().setJSON(r.id,{...r,failedLogins:count>=7?0:count,
   lockedUntil:count>=7?new Date(Date.now()+10*60*1000).toISOString():'',updatedAt:new Date().toISOString()});
  return error('Conta não autorizada ou credenciais incorretas.',401);
 }
 const updated={...r,failedLogins:0,lockedUntil:'',lastLogin:new Date().toISOString()};
 await db().setJSON(r.id,updated);
 return {ok:true,role:'equipe',member:publicMember(updated),cookie:signedSession(updated,secret)};
}
export async function activateEmployee(input,secret){
 const email=emailOf(input.email),code=String(input.code||''),password=String(input.password||'');
 if(!validEmail(email)||!securePassword(password)||code.length<32||code.length>100)
  return error('Informe e-mail, convite válido e senha com pelo menos 10 caracteres, letras e números.');
 const r=await account(keyFor(email));
 if(!r||r.status!=='Pendente'||!r.inviteHash||!secureEqual(digest(code),r.inviteHash)||Date.parse(r.inviteExpiresAt)<Date.now())
  return error('Convite inválido ou expirado. Solicite outro à Gestão.',401);
 const salt=randomBytes(16).toString('hex'),now=new Date().toISOString();
 const updated={...r,status:'Ativo',salt,passwordHash:derive(password,salt),inviteHash:'',inviteExpiresAt:'',
  sessionVersion:(r.sessionVersion||0)+1,activatedAt:now,updatedAt:now};
 await db().setJSON(r.id,updated);
 return {ok:true,role:'equipe',member:publicMember(updated),cookie:signedSession(updated,secret)};
}
export async function accessPolicy(){
 const stored=await db().get('access-policy',{type:'json',consistency:'strong'});
 return {enforced:stored?.enforced===true,updatedAt:stored?.updatedAt||''};
}
export async function enforceIndividualAccess(){
 const index=await db().get('member-index',{type:'json',consistency:'strong'})||[];
 const accounts=await Promise.all((Array.isArray(index)?index:[]).map(account));
 const active=accounts.filter(u=>u?.status==='Ativo').length;
 if(active<1)return error('Ative pelo menos uma conta individual antes de bloquear a senha coletiva.',409);
 const p={enforced:true,updatedAt:new Date().toISOString(),activeAtCutover:active};
 await db().setJSON('access-policy',p);
 return {ok:true,...p};
}
export async function listEmployees(){
 const ids=await db().get('member-index',{type:'json',consistency:'strong'})||[];
 const records=await Promise.all((Array.isArray(ids)?ids:[]).slice(0,400).map(account));
 return {members:records.filter(Boolean).map(publicMember).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))};
}
export async function manageEmployee(input,baseUrl){
 const email=emailOf(input.email),operation=String(input.operation||'create');
 if(!validEmail(email))return error('E-mail inválido.');
 const id=keyFor(email),existing=await account(id),now=new Date().toISOString();
 if(operation==='create'){
  if(existing)return error('E-mail já cadastrado. Utilize Reemitir convite.',409);
  if(!String(input.name||'').trim()||String(input.name).trim().length<5||
     !['Professor','Coordenação','Funcionário'].includes(input.profile)||
     !['Educação Infantil','Ensino Fundamental','Ensino Médio','Administrativo','Todos'].includes(input.segment))
   return error('Preencha nome completo, perfil e segmento válidos.');
 }else if(!existing)return error('Conta não localizada.',404);
 if(operation==='create'||operation==='reinvite'){
  if(existing&&existing.status==='Desativado')return error('Reative a conta antes de emitir convite.');
  const code=randomBytes(32).toString('base64url'),expiry=new Date(Date.now()+7*86400000).toISOString();
  const base=existing||{id,email,name:String(input.name).trim().slice(0,100),profile:input.profile,segment:input.segment,
    statuses:{},createdAt:now,sessionVersion:0};
  const updated={...base,status:'Pendente',salt:'',passwordHash:'',inviteHash:digest(code),inviteExpiresAt:expiry,
    sessionVersion:(base.sessionVersion||0)+1,updatedAt:now};
  await db().setJSON(id,updated);
  const ids=await db().get('member-index',{type:'json',consistency:'strong'})||[];
  if(!ids.includes(id))await db().setJSON('member-index',[...ids,id].slice(0,400));
  await deleteUserRegistrations(id);
  const origin=new URL(baseUrl).origin;
  return {ok:true,member:publicMember(updated),inviteUrl:origin+'/calendario-anual/#ativar='+encodeURIComponent(code)+'&email='+encodeURIComponent(email),expiresAt:expiry};
 }
 if(!['suspend','disable','enable'].includes(operation))return error('Operação inválida.');
 const next={suspend:'Suspenso',disable:'Desativado',enable:'Pendente'}[operation];
 const updated={...existing,status:next,sessionVersion:(existing.sessionVersion||0)+1,
    inviteHash:'',inviteExpiresAt:'',updatedAt:now};
 await db().setJSON(id,updated);
 await deleteUserRegistrations(id);
 return {ok:true,member:publicMember(updated)};
}
export async function markDelivery(member,input,isPublished){
 const year=Number(input.year),stage=Number(input.stage),status=String(input.status||'');
 if(!Number.isInteger(year)||year<2026||year>2099||![1,2,3,4].includes(stage)||!['entregue','nao_entregou'].includes(status))
   return error('Ano, etapa ou situação inválidos.');
 if(!await isPublished(year,stage))return error('Entrega não publicada pela Gestão.',409);
 const now=new Date().toISOString(),updated={...member,statuses:{...(member.statuses||{})}};
 updated.statuses[year+'-'+stage]={status,updatedAt:now};
 await db().setJSON(member.id,updated);
 return {ok:true,name:member.name,stage,status,updatedAt:now,statuses:statuses(updated,year)};
}
