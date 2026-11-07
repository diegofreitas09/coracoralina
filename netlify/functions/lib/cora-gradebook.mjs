// Livro privado de gabaritos, vinculado exclusivamente à conta pessoal autenticada.
// Não armazena fotografias. Correções são sempre recalculadas no servidor.
import {getStore} from '@netlify/blobs';
const store=()=>getStore({name:'cora-professor-gabaritos-v1',consistency:'strong'});
const clean=(v,max=120)=>String(v??'').trim().slice(0,max);
const uuid=s=>/^[a-z0-9-]{8,80}$/i.test(String(s||''))?String(s):'';
const ISO=s=>{const d=clean(s,10);return /^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d))?d:''};
const opts=['A','B','C','D','E'];
const validAnswers=(list,n,limit,allowBlank=true)=>Array.isArray(list)&&list.length===n&&list.every(a=>a==='?'||(allowBlank&&a==='-')||opts.slice(0,limit).includes(a));
const keyFor=member=>'member/'+encodeURIComponent(String(member.id));
const initial=()=>({tests:[],updatedAt:''});
export async function gradebookRead(member){
 const saved=await store().get(keyFor(member),{type:'json',consistency:'strong'});
 return {tests:Array.isArray(saved?.tests)?saved.tests:[],updatedAt:saved?.updatedAt||''};
}
const fail=(error,status=400)=>({error,status});
const assessment=(input,existing)=>{
 const n=Number(input.questionCount),options=Number(input.options);
 if(!Number.isInteger(n)||n<1||n>60||![4,5].includes(options))return null;
 if(!validAnswers(input.key,n,options,false)||input.key.includes('?'))return null;
 const score=Number(input.maxScore);
 if(!Number.isFinite(score)||score<=0||score>100)return null;
 const id=uuid(input.id);
 if(!id||!clean(input.title,150)||!clean(input.subject,100)||!clean(input.grade,80)||!ISO(input.date))return null;
 return {id,title:clean(input.title,150),subject:clean(input.subject,100),grade:clean(input.grade,80),
  className:clean(input.className,80),date:ISO(input.date),questionCount:n,options,maxScore:score,
  key:input.key,createdAt:existing?.createdAt||new Date().toISOString(),
  updatedAt:new Date().toISOString(),results:existing?.results||[]};
};
function resultFor(input,test,existing){
 const name=clean(input.name,130),number=clean(input.number,30);
 const date=ISO(input.date)||test.date;
 const id=uuid(input.id);
 if(!name||!id||!validAnswers(input.answers,test.questionCount,test.options,true))return null;
 if(input.answers.includes('?'))return null; // Não autorizar nota definitiva de leitura ambígua.
 const correct=input.answers.filter((a,i)=>a===test.key[i]).length;
 const blank=input.answers.filter(a=>a==='-').length;
 const wrong=test.questionCount-correct-blank;
 const score=Math.round((correct/test.questionCount)*test.maxScore*100)/100;
 return {id,name,number,date,grade:test.grade,subject:test.subject,
  answers:input.answers,correct,wrong,blank,score,maxScore:test.maxScore,
  createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),
  reviewed:true};
}
export async function gradebookAction(member,request){
 if(request.method==='GET')return gradebookRead(member);
 if(request.method!=='POST'||request.headers.get('x-cora-request')!=='portal')return fail('Requisição não autorizada.',403);
 const length=Number(request.headers.get('content-length')||0);
 if(length>100000)return fail('Registro excede o limite permitido.',413);
 let body;try{body=await request.json()}catch{return fail('Dados inválidos.')};
 if(!body||typeof body!=='object')return fail('Dados inválidos.');
 const action=clean(body.operation,40),saved=await gradebookRead(member);
 const tests=saved.tests;
 if(action==='save-test'){
  const id=uuid(body.test?.id),idx=tests.findIndex(t=>t.id===id);
  if(idx<0&&tests.length>=60)return fail('Limite de 60 avaliações por professor.');
  const test=assessment(body.test||{},idx>=0?tests[idx]:null);
  if(!test)return fail('Confira os dados da avaliação e o gabarito oficial.');
  // Mudanças na chave de uma prova já corrigida exigem atualização das notas.
  if(idx>=0){
   if(tests[idx].questionCount!==test.questionCount&&test.results.length)return fail('Não é possível alterar a quantidade de questões de uma avaliação corrigida.');
   test.results=test.results.map(r=>resultFor(r,test,r)).filter(Boolean);
   tests[idx]=test;
  }else tests.unshift(test);
 }else if(action==='delete-test'){
  const index=tests.findIndex(t=>t.id===uuid(body.testId));if(index<0)return fail('Avaliação não encontrada.',404);
  tests.splice(index,1);
 }else if(action==='save-result'){
  const test=tests.find(t=>t.id===uuid(body.testId));if(!test)return fail('Avaliação não encontrada.',404);
  const existing=test.results.find(r=>r.id===uuid(body.result?.id));
  if(!existing&&test.results.length>=180)return fail('Limite de 180 alunos por avaliação.');
  const result=resultFor(body.result||{},test,existing);
  if(!result)return fail('Confira a identificação e todas as respostas antes de salvar.');
  if(existing)Object.assign(existing,result);else test.results.push(result);
  test.updatedAt=new Date().toISOString();
 }else if(action==='delete-result'){
  const test=tests.find(t=>t.id===uuid(body.testId));if(!test)return fail('Avaliação não encontrada.',404);
  const index=test.results.findIndex(r=>r.id===uuid(body.resultId));if(index<0)return fail('Aluno não encontrado.',404);
  test.results.splice(index,1);test.updatedAt=new Date().toISOString();
 }else return fail('Operação inválida.');
 const record={tests,updatedAt:new Date().toISOString()};
 await store().setJSON(keyFor(member),record);
 return {ok:true,...record};
}
