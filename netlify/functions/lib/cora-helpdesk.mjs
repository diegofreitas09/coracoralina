/* Canal de atendimento individual entre docentes autenticados e Gestão.
 * Registros imutáveis, separados por membro. Nunca expor outras conversas à equipe. */
import { randomBytes } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const DB='cora-calendar-helpdesk-v1';
const store=()=>getStore(DB);
const memberId=id=>/^member-[0-9a-f]{64}$/.test(String(id||''));
const ticketId=id=>/^\d{13}-[0-9a-f]{16}$/.test(String(id||''));
const clean=(text,max)=>String(text??'').trim().slice(0,max+1);
const TICKET=(owner,id)=>'ticket/'+owner+'/'+id;
const REPLY=(owner,id)=>'reply/'+owner+'/'+id+'/';
const CATEGORIES=['Planejamento','Avaliações e provas','Calendário e eventos','Acesso ao aplicativo','Outros'];
const error=(message,status=400)=>({error:message,status});
const authorized=(role,member)=>role==='gestao'||Boolean(member?.id&&memberId(member.id));
const own=(role,member,owner)=>role==='gestao'||(member&&member.id===owner);
const newId=()=>Date.now()+'-'+randomBytes(8).toString('hex');
const replyRole=key=>/-([ge])-[0-9a-f]{16}$/.exec(key)?.[1]||'';
const lastMessage=(items,initial)=>{
 const top=items?.length?items[items.length-1].key:'';
 const stamp=top.split('/').pop()?.slice(0,13);
 return {at:top?new Date(Number(stamp)).toISOString():initial,by:top?replyRole(top):'e'};
};
async function ticketFor(owner,id){
 if(!memberId(owner)||!ticketId(id))return null;
 return await store().get(TICKET(owner,id),{type:'json',consistency:'strong'});
}
export async function listHelpdesk(role,member){
 if(!authorized(role,member))return error('Faça login com sua conta individual para enviar dúvidas.',403);
 const owner=member?.id||'';
 const [tickets,replies]=await Promise.all([
  store().list({prefix:role==='gestao'?'ticket/':'ticket/'+owner+'/'}),
  store().list({prefix:role==='gestao'?'reply/':'reply/'+owner+'/'})
 ]);
 const latest=new Map(),counts=new Map();
 for(const item of replies.blobs){
  const parts=item.key.split('/');
  if(parts.length!==4)continue;
  const key=parts[1]+'/'+parts[2];
  const v=latest.get(key);
  if(!v||v.key<item.key)latest.set(key,item);
  counts.set(key,(counts.get(key)||0)+1);
 }
 const ordered=tickets.blobs.map(x=>x.key).sort().reverse();
 const picked=ordered.slice(0,300);
 const read=await Promise.all(picked.map(async key=>{
  const parts=key.split('/');
  if(parts.length!==3||!memberId(parts[1])||!ticketId(parts[2]))return null;
  const record=await store().get(key,{type:'json',consistency:'strong'});
  if(!record||record.ownerId!==parts[1]||record.id!==parts[2])return null;
  const index=parts[1]+'/'+parts[2], last=lastMessage(latest.has(index)?[latest.get(index)]:[],record.createdAt);
  return {id:record.id,ownerId:record.ownerId,author:record.author,category:record.category,title:record.title,
   createdAt:record.createdAt,lastAt:last.at,status:last.by==='e'?'Aguardando Gestão':'Respondida',replies:counts.get(index)||0};
 }));
 const result=read.filter(Boolean).sort((a,b)=>b.lastAt.localeCompare(a.lastAt)).slice(0,150);
 return {ok:true,threads:result,pending:result.filter(x=>x.status==='Aguardando Gestão').length,total:result.length,
  truncated:ordered.length>300};
}
export async function readHelpdesk(role,member,input){
 if(!authorized(role,member))return error('Faça login com sua conta individual.',403);
 const owner=role==='gestao'?String(input.ownerId||''):member.id,id=String(input.id||'');
 if(!memberId(owner)||!ticketId(id))return error('Conversa inválida.');
 const ticket=await ticketFor(owner,id);
 if(!ticket||!own(role,member,ticket.ownerId))return error('Conversa não encontrada.',404);
 const {blobs}=await store().list({prefix:REPLY(owner,id)});
 const items=blobs.map(x=>x.key).sort().slice(-200);
 const messages=await Promise.all(items.map(async key=>{
  const data=await store().get(key,{type:'json',consistency:'strong'});
  return data&&['gestao','equipe'].includes(data.from)?data:null;
 }));
 const all=[{id:'inicio',from:'equipe',body:ticket.body,at:ticket.createdAt,name:ticket.author?.name||'Professor(a)'},
  ...messages.filter(Boolean)];
 return {ok:true,thread:{id:ticket.id,ownerId:ticket.ownerId,author:ticket.author,
  title:ticket.title,category:ticket.category,createdAt:ticket.createdAt},messages:all};
}
export async function createQuestion(role,member,input){
 if(role!=='equipe'||!member?.id)return error('Entre com seu e-mail e senha individuais para enviar perguntas.',403);
 const title=clean(input?.title,120),body=clean(input?.body,2500),category=clean(input?.category,60);
 if(title.length<5||title.length>120||body.length<12||body.length>2500||!CATEGORIES.includes(category))
  return error('Informe assunto, categoria e mensagem (mínimo de 12 caracteres).');
 const s=store();
 const existing=await s.list({prefix:'ticket/'+member.id+'/'});
 if(existing.blobs.length>=150)return error('Limite de solicitações atingido. Continue a conversa em um atendimento existente.',429);
 const newest=existing.blobs.map(x=>x.key.split('/').pop()).sort().pop();
 if(newest&&Date.now()-Number(newest.slice(0,13))<15000)return error('Aguarde alguns segundos antes de enviar outra solicitação.',429);
 const id=newId(),createdAt=new Date().toISOString();
 const value={id,ownerId:member.id,author:{name:String(member.name||'Professor(a)').slice(0,100),
  email:String(member.email||'').slice(0,180)},category,title,body,createdAt};
 const saved=await s.setJSON(TICKET(member.id,id),value,{onlyIfNew:true});
 if(!saved.modified)return error('Não foi possível registrar a solicitação. Tente novamente.',409);
 return {ok:true,id,ownerId:member.id,createdAt};
}
export async function replyQuestion(role,member,input){
 if(!authorized(role,member))return error('Entre com sua conta individual.',403);
 const owner=role==='gestao'?String(input?.ownerId||''):member.id,id=String(input?.id||'');
 if(!memberId(owner)||!ticketId(id))return error('Conversa inválida.');
 const ticket=await ticketFor(owner,id);
 if(!ticket||!own(role,member,ticket.ownerId))return error('Conversa não encontrada.',404);
 const body=clean(input?.body,2500);
 if(body.length<3||body.length>2500)return error('Escreva uma resposta de 3 a 2.500 caracteres.');
 const from=role==='gestao'?'gestao':'equipe';
 const key=REPLY(owner,id)+Date.now()+'-'+(from==='gestao'?'g':'e')+'-'+randomBytes(8).toString('hex');
 const at=new Date().toISOString();
 const data={id:key.split('/').pop(),from,body,at,name:from==='gestao'?'Gestão Escolar':String(member.name||'Professor(a)').slice(0,100)};
 const saved=await store().setJSON(key,data,{onlyIfNew:true});
 if(!saved.modified)return error('Falha ao registrar resposta. Tente novamente.',409);
 return {ok:true,at,recipientId:role==='gestao'?ticket.ownerId:null};
}
