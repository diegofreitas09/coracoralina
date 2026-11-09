/* Roteiros Pedagógicos · acesso individual, atribuições e calendário de provas.
 * Registros privados no Netlify Blobs; o Google Sheets histórico é apenas referência 2026.
 * Não compartilhar fichas por link público nem publicar rascunhos automaticamente.
 */
import {getStore} from '@netlify/blobs';
import {randomUUID} from 'node:crypto';
import {listEmployees} from './cora-team-auth.mjs';
import {legacy2026,subjects2026,legacy2026Source} from './cora-roteiros-legacy-2026.mjs';
import {CANVA_ROTEIROS,CANVA_IMPORT_REPORT,CANVA_ROTEIROS_ORIGIN} from './cora-roteiros-canva-2026.mjs';
import {TEACHER_PLAN,planForRoster} from './cora-roteiros-professores-2026.mjs';
const store=()=>getStore({name:'cora-roteiros-institucionais-v1',consistency:'strong'});
const clean=(x,n=120)=>String(x??'').trim().slice(0,n);
const normalize=x=>clean(x,120).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').toUpperCase();
const grades=['Infantil 1','Infantil 2','Infantil 3','Infantil 4','Infantil 5','1º ano','2º ano','3º ano','4º ano','5º ano',
 '6º ano','7º ano','8º ano','9º ano','1ª série','2ª série','3ª série'];
const lowerSubjects=['LÍNGUA PORTUGUESA','MATEMÁTICA','CIÊNCIAS','HISTÓRIA','GEOGRAFIA','INGLÊS','ARTE','EDUCAÇÃO FÍSICA','NATUREZA E SOCIEDADE'];
// Inclui áreas declaradas pela Gestão, mesmo que ainda não haja um roteiro Canva
// daquela área/etapa. Nenhum conteúdo é criado artificialmente.
const additionalSubjects=grade=>['8º ano','9º ano','1ª série','2ª série','3ª série'].includes(grade)
 ?['FILOSOFIA','SOCIOLOGIA']:[];
const subjectsFor=grade=>[...new Set([...(subjects2026[grade]||lowerSubjects),...additionalSubjects(grade)])];
const tests=['AP2','AD','AR','SONDAGEM','2ª CHAMADA','SIMULADO SAE','OUTRA'];
const error=(message,status=400)=>({error:message,status});
const isYear=x=>Number.isInteger(Number(x))&&Number(x)>=2026&&Number(x)<=2099?Number(x):null;
const validDate=(value,y)=>{const s=clean(value,10);if(!new RegExp('^'+y+'-[0-9]{2}-[0-9]{2}$').test(s))return false;
 const dt=new Date(s+'T12:00:00Z');return Number.isFinite(dt.getTime())&&dt.toISOString().slice(0,10)===s;};
const gradeOf=x=>grades.find(y=>normalize(y)===normalize(x))||'';
const subjectOf=(g,x)=>subjectsFor(g).find(v=>normalize(v)===normalize(x))||'';
const testOf=x=>tests.find(v=>normalize(v)===normalize(x))||'';
const assignmentsKey=(y,id)=>'assign/'+y+'/'+encodeURIComponent(String(id));
const docsKey=(y,id)=>'docs/'+y+'/'+encodeURIComponent(String(id));
const scheduleKey=y=>'schedule/'+y;
const read=async(key,fallback)=>await store().get(key,{type:'json',consistency:'strong'})||fallback;
const write=async(key,data)=>store().setJSON(key,data);
const uid=x=>clean(x,160);
const idFor=({stage,assessment,grade,subject})=>[stage,normalize(assessment),normalize(grade),normalize(subject)].join('|');
const belongs=(assignments,x)=>assignments.some(a=>a.grade===x.grade&&normalize(a.subject)===normalize(x.subject));
const identity=member=>({id:member.id,email:member.email,name:member.name,profile:member.profile,status:member.status,segments:member.segments||[]});
const requiredSegment=grade=>grade.startsWith('Infantil')?'Educação Infantil':/^[1-5]º ano$/.test(grade)?'Ensino Fundamental I':
 /^[6-9]º ano$/.test(grade)?'Ensino Fundamental II':'Ensino Médio';
const permittedSegment=(teacher,grade)=>Array.isArray(teacher.segments)&&
 (teacher.segments.includes('Todos')||teacher.segments.includes(requiredSegment(grade)));
const roster=async()=>{const data=await listEmployees();return (data.members||[]).filter(m=>m.id&&m.email).map(identity);};
const effectiveAssignments=(rule,teacher)=>rule.assignments.map(normalizePair).filter(Boolean)
 .filter(pair=>permittedSegment(teacher,pair.grade)).filter((item,i,all)=>all.findIndex(v=>v.grade===item.grade&&v.subject===item.subject)===i);
// Complemento solicitado pela Gestão: aplicar uma única vez sem retirar vínculos existentes.
const assignmentSupplement=(saved,rule,items)=>{
 const subject=rule.person==='Júlia'?'ARTE':rule.person==='Mônica'?'FÍSICA':null;
 if(!subject||saved.supplementArtsPhysics2026)return null;
 const additions=items.filter(x=>x.subject===subject);
 if(!additions.length)return null;
 const merged=[...(saved.items||[])];
 for(const item of additions)if(!belongs(merged,item))merged.push(item);
 return {...saved,items:merged,supplementArtsPhysics2026:true};
};
async function bootstrapTeacherLinks(year,people){
 if(year!==2026)return [];
 const rows=planForRoster(people);
 return Promise.all(rows.map(async row=>{
  if(!row.teacher)return {person:row.person,linked:0,status:'pendente',reason:row.reason};
  const items=effectiveAssignments(row.rule,row.teacher),expected=row.rule.assignments.length;
  const key=assignmentsKey(year,row.teacher.id);
  let saved=await read(key,null);
  if(saved!==null){
   const supplemented=assignmentSupplement(saved,row.rule,items);
   if(supplemented){saved={...supplemented,updatedAt:new Date().toISOString()};await write(key,saved);}
  }
  if(saved!==null)return {person:row.person,teacher:row.teacher,linked:saved.items?.length||0,
    expected,status:'cadastro-existente',skipped:expected-items.length};
  if(!items.length)return {person:row.person,teacher:row.teacher,linked:0,expected,status:'segmento-nao-autorizado'};
  const now=new Date().toISOString();
  await write(key,{year,teacherId:row.teacher.id,items,source:'plano-da-gestao-2026',updatedAt:now});
  return {person:row.person,teacher:row.teacher,linked:items.length,expected,status:'vinculado-automaticamente',
    skipped:expected-items.length};
 }));
}
async function assignmentOf(year,id){const obj=await read(assignmentsKey(year,id),{items:[]});return Array.isArray(obj.items)?obj.items:[]}
async function docsOf(year,id){const obj=await read(docsKey(year,id),{items:[]});return Array.isArray(obj.items)?obj.items:[]}
const normalizePair=pair=>{const grade=gradeOf(pair?.grade),subject=subjectOf(grade,pair?.subject);return grade&&subject?{grade,subject}:null};
const section=x=>({book:clean(x?.book,100),unit:clean(x?.unit,160),chapter:clean(x?.chapter,180),
 theme:clean(x?.theme,900),pages:clean(x?.pages,150)});
const cleanDoc=(source,old,member,year)=>{
 const stage=Number(source.stage),grade=gradeOf(source.grade),subject=subjectOf(grade,source.subject),
  assessment=testOf(source.assessment),blocks=Array.isArray(source.blocks)?source.blocks.slice(0,20).map(section):[];
 if(!grade||!subject||!assessment||!Number.isInteger(stage)||stage<1||stage>4)return null;
 if(!blocks.length)return null;
 const submitted=source.status==='enviado',complete=blocks.every(b=>b.book&&b.unit&&b.chapter&&b.theme&&b.pages);
 const sourceText=clean(source.sourceText,9000),confirmed=source.confirmed===true;
 if(submitted&&!complete&&!(confirmed&&sourceText.length>=12))
  return {error:'Para enviar, complete os cinco campos ou revise e confirme o texto original do Canva.'};
 const now=new Date().toISOString();
 return {
  id:idFor({stage,grade,subject,assessment}),year,grade,subject,assessment,stage,blocks,
  instructions:clean(source.instructions,1800),sourceText,
  sourcePage:old?.sourcePage||Number(source.sourcePage)||null,
  sourceDesignId:old?.sourceDesignId||'DAGIw1ZBlf8',
  reviewedSource:submitted&&confirmed,missingStructuredFields:!complete,
  status:submitted?'enviado':'rascunho',
  authorId:member.id,authorName:member.name,authorEmail:member.email,
  createdAt:old?.createdAt||now,updatedAt:now,reviewedAt:'',reviewedBy:'',
  revision:(Number(old?.revision)||0)+1
 };
};
function latestWithLegacy(data,year){
 const approved=new Map(),pending=new Map();
 for(const doc of data){
  const key=idFor(doc);
  if(doc.status==='aprovado')approved.set(key,doc);
  else if(doc.status==='enviado'&&!pending.has(key))pending.set(key,doc);
 }
 return {approved,pending};
}
export function composition({schedule=[],documents=[],year=2027,legacy=[],templates=[]}={}){
 const {approved,pending}=latestWithLegacy(documents,year);
 return schedule.map(row=>{
  const key=idFor(row),ready=approved.get(key),awaiting=pending.get(key),
   template=Number(year)===2026?templates.find(x=>idFor(x)===key):null,
   historical=Number(year)===2026?legacy.find(x=>idFor(x)===key):null;
  return {...row,roteiro:ready||awaiting||null,
   template:!ready&&!awaiting?template||null:null,
   legacy:!ready&&!awaiting&&!template?historical||null:null,
   condition:ready?'aprovado':awaiting?'aguardando-conferencia':template?'modelo-canva-pendente':historical?'referencia-2026':'sem-roteiro'};
 }).sort((a,b)=>a.date.localeCompare(b.date)||a.grade.localeCompare(b.grade,'pt-BR')||a.subject.localeCompare(b.subject,'pt-BR'));
}
async function fullDocuments(year,people){
 const result=await Promise.all(people.map(async p=>(await docsOf(year,p.id))));
 return result.flat();
}
const supported={grades,subjectsByGrade:Object.fromEntries(grades.map(g=>[g,subjectsFor(g)])),tests};
export async function roteiroAction({role,member,request,url}){
 const year=isYear(url.searchParams.get('year'));if(!year)return error('Ano letivo inválido.');
 const isManager=role==='gestao';
 if(!isManager&&!member)return error('Entre com uma conta individual da Equipe para acessar os roteiros.',403);
 const method=request.method;
 if(method==='GET'){
  const people=year===2026||isManager?await roster():[];
  const teacherLinks=await bootstrapTeacherLinks(year,people);
  const assignments=isManager
   ?(await Promise.all(people.map(async p=>({teacher:p,items:await assignmentOf(year,p.id)})))).filter(x=>x.items.length)
   :await assignmentOf(year,member.id);
  const documents=isManager?await fullDocuments(year,people):await docsOf(year,member.id);
  const templates=year===2026?(isManager?CANVA_ROTEIROS:
   CANVA_ROTEIROS.filter(item=>belongs(assignments,item))):[];
  const allSchedule=await read(scheduleKey(year),{items:[]});
  const schedule=isManager?(allSchedule.items||[]):(allSchedule.items||[]).filter(item=>belongs(assignments,item));
  if(url.searchParams.get('mode')==='template'){
   const grade=gradeOf(url.searchParams.get('grade')),subject=subjectOf(grade,url.searchParams.get('subject')),
     stage=Number(url.searchParams.get('stage')),assessment=testOf(url.searchParams.get('assessment'));
   if(!isManager&&!belongs(assignments,{grade,subject}))return error('Disciplina não autorizada para sua conta.',403);
   const model=year===2026?CANVA_ROTEIROS.find(t=>t.grade===grade&&t.subject===subject&&t.stage===stage&&t.assessment===assessment):null;
   return {year,model:model||null,source:CANVA_ROTEIROS_ORIGIN};
  }
  if(url.searchParams.get('mode')==='legacy'){
   let matches=legacy2026.filter(x=>x.stage===Number(url.searchParams.get('stage'))&&x.assessment===testOf(url.searchParams.get('assessment'))&&
    x.grade===gradeOf(url.searchParams.get('grade'))&&x.subject===subjectOf(x.grade,url.searchParams.get('subject')));
   if(!isManager)matches=matches.filter(x=>belongs(assignments,x));
   return {year:2026,source:legacy2026Source,reference:matches.slice(0,3)};
  }
  if(url.searchParams.get('mode')==='catalog'){
   return {year,source:legacy2026Source,types:supported,
    legacyCounts:year===2026?legacy2026.length:0,canvaCount:templates.length,
    canvaReport:isManager&&year===2026?CANVA_IMPORT_REPORT:null,
    teacherLinks:isManager?teacherLinks:[],people:isManager?people:[],assignments};
  }
  return {year,types:supported,people:isManager?people:[],assignments,documents,schedule,
   templates:isManager?[]:templates,
   canvaReport:isManager&&year===2026?CANVA_IMPORT_REPORT:null,
   teacherLinks:isManager?teacherLinks:[],
   composite:composition({schedule,documents,year,templates,legacy:year===2026?legacy2026:[]}),
   legacySource:legacy2026Source,canvaSource:CANVA_ROTEIROS_ORIGIN,updatedAt:allSchedule.updatedAt||''};
 }
 if(method!=='POST'||request.headers.get('x-cora-request')!=='portal')return error('Operação não autorizada.',403);
 if(Number(request.headers.get('content-length')||0)>110000)return error('Dados excedem o limite do formulário.',413);
 let body;try{body=await request.json()}catch{return error('Dados inválidos.')};
 const operation=clean(body?.operation,40);
 if(operation==='applyTeacherPlan'){
  if(!isManager)return error('Somente a Gestão pode atualizar vínculos.',403);
  if(year!==2026)return error('Os vínculos históricos devem ser aplicados apenas ao ano letivo 2026.');
  const people=await roster(),result=planForRoster(people),preview=[];
  for(const row of result){
   if(!row.teacher){preview.push({person:row.person,status:'pendente',reason:row.reason});continue;}
   const items=effectiveAssignments(row.rule,row.teacher);
   if(!items.length){preview.push({person:row.person,status:'segmento-incompatível'});continue;}
   preview.push({person:row.person,teacherName:row.teacher.name,email:row.teacher.email,items,ignored:row.rule.assignments.length-items.length});
  }
  if(body.dryRun!==false)return {ok:true,dryRun:true,preview};
  if(body.confirm!==true)return error('Confirme na Gestão a aplicação das atribuições.',400);
  const applied=[];
  for(const row of preview){
    if(!row.items)continue;
    const teacher=people.find(p=>p.email===row.email);
    if(!teacher)continue;
    const existing=await read(assignmentsKey(year,teacher.id),null);
    if(existing&&body.replaceExisting!==true){applied.push({person:row.person,status:'preservado',items:existing.items?.length||0});continue}
    await write(assignmentsKey(year,teacher.id),{year,teacherId:teacher.id,items:row.items,
     source:'plano-da-gestao-2026',updatedAt:new Date().toISOString()});
    applied.push({person:row.person,status:'aplicado',items:row.items.length});
  }
  return {ok:true,applied};
 }
 if(operation==='assign'){
  if(!isManager)return error('Somente a Gestão pode vincular disciplinas aos professores.',403);
  const email=clean(body.email,180).toLowerCase(),people=await roster(),teacher=people.find(p=>p.email.toLowerCase()===email);
  if(!teacher)return error('Cadastre primeiro o professor e seu e-mail na Gestão.',404);
  if(teacher.profile!=='Professor'&&teacher.profile!=='Coordenação')return error('Este colaborador não está cadastrado como professor/coordenador.');
  const proposed=Array.isArray(body.items)?body.items:[],items=[],seen=new Set();
  if(proposed.length>40)return error('Limite de 40 combinações por professor.');
  for(const item of proposed){
   const pair=normalizePair(item);
   if(!pair)return error('Série ou disciplina inválida.');
   if(!permittedSegment(teacher,pair.grade))return error('O professor não está cadastrado no segmento desta série. Corrija os segmentos na Gestão.');
   const key=pair.grade+'|'+pair.subject;if(!seen.has(key)){items.push(pair);seen.add(key)}
  }
  const now=new Date().toISOString();
  await write(assignmentsKey(year,teacher.id),{year,teacherId:teacher.id,items,updatedAt:now});
  return {ok:true,teacher,items,updatedAt:now};
 }
 if(operation==='save'){
  if(isManager||!member)return error('O roteiro deve ser salvo pela conta individual do professor.',403);
  const items=await assignmentOf(year,member.id),input=body.document||{},grade=gradeOf(input.grade),subject=subjectOf(grade,input.subject);
  if(!belongs(items,{grade,subject}))return error('A Gestão ainda não vinculou esta série e disciplina à sua conta.',403);
  const docs=await docsOf(year,member.id),id=idFor({...input,grade,subject}),old=docs.find(e=>e.id===id);
  if(old?.status==='aprovado')return error('Roteiro aprovado. Solicite à Gestão a devolução para editar.',409);
  if(old&&Number(input.revision)!==Number(old.revision))return error('Outra atualização deste roteiro foi salva. Atualize os dados antes de editar.',409);
  if(!old&&docs.length>=180)return error('Limite de roteiros do professor atingido.');
  const template=year===2026?CANVA_ROTEIROS.find(e=>e.grade===grade&&e.subject===subject&&
    e.stage===Number(input.stage)&&e.assessment===testOf(input.assessment)):null;
  const doc=cleanDoc({...input,grade,subject,sourcePage:template?.sourcePage||null},old,member,year);
  if(!doc)return error('Informe série, disciplina, etapa, modelo e conteúdo.');
  if(doc.error)return error(doc.error);
  if(old)docs.splice(docs.findIndex(e=>e.id===id),1,doc);else docs.push(doc);
  await write(docsKey(year,member.id),{year,items:docs});
  return {ok:true,document:doc};
 }
 if(operation==='review'){
  if(!isManager)return error('Somente a Gestão pode conferir os roteiros.',403);
  const people=await roster(),person=people.find(p=>p.id===uid(body.authorId)),status=clean(body.status,30);
  if(!person||!['aprovado','devolvido'].includes(status))return error('Professor ou decisão inválidos.');
  const docs=await docsOf(year,person.id),doc=docs.find(d=>d.id===uid(body.documentId));
  if(!doc)return error('Roteiro não encontrado.',404);
  if(doc.status!=='enviado'&&!(status==='devolvido'&&doc.status==='aprovado'))return error('O professor precisa enviar o roteiro antes da aprovação.',409);
  if(Number(body.revision)!==Number(doc.revision))return error('O roteiro foi modificado. Atualize antes de aprovar.',409);
  doc.status=status;doc.reviewNote=clean(body.reviewNote,600);doc.reviewedAt=new Date().toISOString();doc.reviewedBy='Gestão';
  doc.revision++;await write(docsKey(year,person.id),{year,items:docs});return {ok:true,document:doc};
 }
 if(operation==='schedule'){
  if(!isManager)return error('Apenas a Gestão define o calendário de provas.',403);
  const items=[],raw=Array.isArray(body.items)?body.items:[];
  if(raw.length>250)return error('Limite de 250 avaliações por ano.');
  const ids=new Set();
  for(const input of raw){
   const grade=gradeOf(input.grade),subject=subjectOf(grade,input.subject),
    assessment=testOf(input.assessment),stage=Number(input.stage),date=clean(input.date,10);
   if(!grade||!subject||!assessment||!Number.isInteger(stage)||stage<1||stage>4||!validDate(date,year))return error('Confira data, série, disciplina, etapa e avaliação.');
   const key=[date,grade,subject,assessment,stage].join('|');
   if(ids.has(key))return error('A mesma disciplina, avaliação e data aparece duas vezes.');ids.add(key);
   items.push({id:clean(input.id,60)||randomUUID(),date,grade,subject,assessment,stage});
  }
  const saved={year,items,updatedAt:new Date().toISOString()};
  await write(scheduleKey(year),saved);
  return {ok:true,...saved};
 }
 return error('Operação desconhecida.');
}
export const roteiroConfig=supported;
export const roteiroRules={gradeOf,subjectOf,testOf,validDate,idFor,permittedSegment,cleanDoc,normalizePair,bootstrapTeacherLinks,effectiveAssignments,assignmentSupplement};
