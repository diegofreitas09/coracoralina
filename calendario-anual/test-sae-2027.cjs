'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'assessment-deadlines.js'),'utf8');
const store=new Map(),notices=[];
const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
const document={addEventListener(){}},window={
 CoraYears:{activeYear:2027},
 CoraStages:{get:()=>[1,2,3,4].map(number=>({number,start:'2027-01-18',end:'2027-11-30'}))},
 dispatchEvent:e=>notices.push(e.type)
};
function CustomEvent(type,args){this.type=type;this.detail=args?.detail}
vm.runInNewContext(source,{window,document,localStorage,Date,console,CustomEvent,JSON},{filename:'assessment-deadlines.js'});
const api=window.CoraAssessments;
assert.ok(api?.saeSchedule);
const starts=['2027-03-22','2027-06-14','2027-09-20','2027-11-22'];
const expected=['2027-03-12','2027-06-11','2027-09-17','2027-11-19'];
const dues=['2027-01-05','2027-03-05','2027-06-28','2027-08-27'];
const data={year:2027,approved:true,approvedStages:[1,2,3,4],source:'Teste SAE',items:
 starts.map((start,i)=>({stage:i+1,due:dues[i],deliveryTypes:'AP2 e AD',
 items:[{title:'Avaliações parciais — AP2',start:'2027-03-01',end:'2027-03-05'},
 {title:'Avaliações diagnósticas — AD',start,end:start}]
 }))};
const schedule=api.saeSchedule(data);
assert.equal(schedule.length,4);
assert.deepEqual(Array.from(schedule,x=>x.date),expected);
for(const x of schedule)assert.equal(new Date(x.date+'T12:00:00Z').getUTCDay(),5);
assert.equal(schedule[0].expected,'2027-03-19');
assert.match(schedule[0].exception,/São José|Sao Jose/i);
for(let i=1;i<4;i++)assert.equal(schedule[i].exception,'');
const copy=JSON.parse(JSON.stringify(data));
assert.equal(api.save(data).ok,true);
assert.deepEqual(Array.from(api.get(2027).items,r=>r.due),dues);
let published=api.publicationEvents(2027);
let sims=published.filter(e=>/^cora-simulado-sae-/.test(e.id));
assert.equal(sims.length,4);
assert.deepEqual(Array.from(sims,e=>e.date),expected);
assert.deepEqual(Array.from(sims,e=>e.id),[1,2,3,4].map(i=>'cora-simulado-sae-2027-'+i));
assert.ok(sims.every(e=>e.title.includes('Simulado SAE')&&e.notes.includes('2º ano do Ensino Fundamental à 3ª série do Ensino Médio')));
assert.equal(published.filter(e=>e.assessmentDelivery).length,4);
assert.ok(JSON.stringify(api.get(2027).items.map(r=>r.due))===JSON.stringify(dues));
let inCalendar=JSON.parse(store.get('cora_calendario_eventos_2027_v1'));
assert.equal(inCalendar.filter(e=>e.id.startsWith('cora-simulado-sae-')).length,4);
assert.equal(api.save(copy).ok,true);
inCalendar=JSON.parse(store.get('cora_calendario_eventos_2027_v1'));
assert.equal(inCalendar.filter(e=>e.id.startsWith('cora-simulado-sae-')).length,4,'Regravar não duplica Simulado SAE');
const changed=JSON.parse(JSON.stringify(data));changed.items[2].items[1].start='2027-09-27';
changed.approvedStages=[1,2,4];changed.approved=false;
assert.equal(api.save(changed).ok,true);
assert.equal(api.saeSchedule(changed)[2].date,'2027-09-24','Alteração da AD recalcula a sexta anterior');
published=api.publicationEvents(2027);
assert.equal(published.filter(e=>e.id==='cora-simulado-sae-2027-3').length,0,'Somente etapa aprovada é publicada');
inCalendar=JSON.parse(store.get('cora_calendario_eventos_2027_v1'));
assert.equal(inCalendar.filter(e=>e.id==='cora-simulado-sae-2027-3').length,0,'Desaprovação remove data publicada localmente');
assert.deepEqual(Array.from(api.get(2027).items,r=>r.due),dues,'Prazos de entrega jamais mudam');
assert.equal(api.saeSchedule({year:2026,items:data.items}).length,0,'Não altera ano-base 2026');
assert.equal(api.saeSchedule({year:2027,items:[{stage:1,items:[]}]}).length,0);
const portal=fs.readFileSync(path.join(__dirname,'portal.js'),'utf8');
const transfer=fs.readFileSync(path.join(__dirname,'year-transfer.js'),'utf8');
assert.ok(portal.includes('periodo-avaliacao|simulado-sae'),'Publicação anual precisa desduplicar simulados gerados');
assert.ok(transfer.includes('periodo-avaliacao|simulado-sae'),'Não duplicar simulados na importação entre anos');
console.log('PASSOU: Simulado SAE 2027 nas 4 sextas-feiras; São José 12/03; entregas preservadas; sem duplicidade; recalcula com AD; aprovação por etapa.');
