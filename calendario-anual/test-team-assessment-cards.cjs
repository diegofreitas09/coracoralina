'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const folder=__dirname,window={};
vm.runInNewContext(fs.readFileSync(path.join(folder,'team-assessment-cards.js'),'utf8'),{window,Date,console},{filename:'team-assessment-cards.js'});
const cards=window.CoraTeamAssessmentCards;
assert.ok(cards&&typeof cards.render==='function');
const stages=[
 {number:1,start:'2027-01-18',end:'2027-04-02'},
 {number:2,start:'2027-04-05',end:'2027-06-23'},
 {number:3,start:'2027-07-26',end:'2027-10-01'},
 {number:4,start:'2027-10-04',end:'2027-11-30'}
];
function period(stage,index,title,start,end){
 const id='cora-periodo-avaliacao-2027-'+stage+'-'+index;
 return [
  {id:id+'-inicio',date:start,title:'Início: '+title+' — '+stage+'ª etapa',type:'Avaliação',
   assessmentWindow:true,stageNumber:stage,notes:'Período: '+start.slice(8,10)+'/'+start.slice(5,7)+'/'+start.slice(0,4)+' a '+end.slice(8,10)+'/'+end.slice(5,7)+'/'+end.slice(0,4)},
  {id:id+'-fim',date:end,title:'Fim: '+title+' — '+stage+'ª etapa',type:'Avaliação',
   assessmentWindow:true,stageNumber:stage}
 ];
}
const events=[
 ...period(1,0,'Avaliações parciais — AP2','2027-03-01','2027-03-05'),
 ...period(1,1,'Avaliações diagnósticas — AD','2027-03-22','2027-03-24'),
 ...period(2,0,'Avaliações parciais — AP2','2027-05-17','2027-05-21'),
 ...period(2,1,'Avaliações diagnósticas — AD','2027-06-14','2027-06-18'),
 ...period(3,0,'Avaliações de recomposição — 1º semestre (AR)','2027-08-16','2027-08-20'),
 ...period(3,1,'Avaliações parciais — AP2','2027-08-30','2027-09-03'),
 ...period(3,2,'Avaliações diagnósticas — AD','2027-09-20','2027-09-24'),
 ...period(4,0,'Avaliações parciais — AP2','2027-10-25','2027-10-29'),
 ...period(4,1,'Avaliações de recomposição — 2º semestre (AR)','2027-11-08','2027-11-12'),
 ...period(4,2,'Avaliações diagnósticas — AD','2027-11-22','2027-11-26'),
 ...['2027-03-12','2027-06-11','2027-09-17','2027-11-19'].map((date,i)=>({
  id:'cora-simulado-sae-2027-'+(i+1),date,title:'Simulado SAE — 2º ano EF à 3ª série EM — '+(i+1)+'ª etapa',
  type:'Avaliação',notes:'Simulado SAE do 2º ano do Ensino Fundamental à 3ª série do Ensino Médio.'})),
 ...[1,2,3,4].map((stage,i)=>({id:'cora-entrega-avaliacoes-2027-'+stage,date:['2027-01-05','2027-03-05','2027-06-28','2027-08-27'][i],
  title:'Entrega das avaliações à coordenação — '+stage+'ª etapa',type:'Avaliação',assessmentDelivery:true,stageNumber:stage})),
 {id:'legal-feb',date:'2027-02-15',title:'Carnaval — feriado',type:'Feriado'},
 {id:'meeting',date:'2027-09-21',title:'Reunião pedagógica do mês',type:'Reunião'}
];
const original=JSON.stringify(events);
const model=cards.collect({year:2027,events,stages});
assert.equal(model.stages.length,4);
assert.deepEqual(Array.from(model.stages,r=>r.items.length),[3,3,4,4]);
assert.equal(model.totals.periods,10);
assert.equal(model.totals.simulados,4);
assert.equal(model.totals.all,14);
assert.equal(model.extras.length,0);
assert.deepEqual(JSON.parse(JSON.stringify(Array.from(model.stages,r=>r.items.filter(x=>x.simulado).map(x=>x.start)))),[
 ['2027-03-12'],['2027-06-11'],['2027-09-17'],['2027-11-19']
]);
assert.equal(model.stages[1].items.filter(x=>x.label==='AD').length,1);
assert.equal(model.stages[1].items.find(x=>x.label==='AD').start,'2027-06-14');
assert.equal(model.stages[1].items.find(x=>x.label==='AD').end,'2027-06-18');
assert.equal(JSON.stringify(events),original,'Published events must not be mutated');
const html=cards.render({year:2027,events,stages});
assert.equal((html.match(/class="cta-stage-card cta-stage-[1-4]"/g)||[]).length,4);
assert.ok(html.includes('Avaliações por etapa'));
assert.ok(html.includes('14/06 a 18/06'));
assert.ok(html.includes('2º ano EF à 3ª série EM'));
assert.ok(html.includes('Prazos de entrega'));
assert.ok(!html.includes('Entrega das avaliações à coordenação'));
assert.ok(!html.includes('Calendário escolar</h2><select'));
assert.ok(!html.includes('17 atividades'));
assert.equal((html.match(/Avaliações diagnósticas — AD/g)||[]).length,4,'One period per AD, not start/end duplicates');
const partial=cards.render({year:2027,events:[events[0],events[1]],stages:[stages[0]]});
assert.equal((partial.match(/Nenhuma avaliação publicada nesta etapa/g)||[]).length,3);
assert.ok(partial.includes('Datas da etapa ainda não publicadas'));
const generic=cards.collect({year:2027,stages,events:[
 {id:'p1',date:'2027-05-15',title:'Simulado de Matemática',type:'Avaliação'},
 {id:'p1',date:'2027-05-15',title:'Simulado de Matemática',type:'Avaliação'}
]});
assert.equal(generic.stages[1].items.length,1,'Deduplicating a repeated event ID');
const unassigned=cards.collect({year:2028,stages:[],events:[
 {id:'x',date:'2028-03-02',title:'Avaliação de sondagem',type:'Avaliação'}
]});
assert.equal(unassigned.extras.length,1,'Do not invent unpublished stage boundaries');
const portal=fs.readFileSync(path.join(folder,'portal.js'),'utf8');
assert.ok(portal.includes("}else if(tab==='avaliacoes'){"));
assert.ok(portal.includes("}else if(tab==='calendario'){"));
assert.ok(!portal.includes("tab==='calendario'||tab==='avaliacoes'"),'Old shared monthly route must be gone');
assert.ok(portal.includes('CoraTeamAssessmentCards?.render?.({year,events,stages:annualSource.stages})'));
const index=fs.readFileSync(path.join(folder,'index.html'),'utf8');
assert.ok(index.includes('team-assessment-cards.css'));
assert.ok(index.indexOf('team-assessment-cards.js')<index.indexOf('portal.js'));
const sw=fs.readFileSync(path.join(folder,'service-worker.js'),'utf8');
assert.ok(sw.includes('team-assessment-cards.js')&&sw.includes('team-assessment-cards.css'));
console.log('PASSOU: quatro cartões por etapa; AP2/AD/AR/SAE sem duplicação; entregas separadas; sem meses repetidos; responsivo e PWA conectado.');
