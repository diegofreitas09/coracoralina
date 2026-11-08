'use strict';
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'academic-2027-replan.js'),'utf8');
const context={window:{},document:{addEventListener(){}},console,Date,localStorage:{
 getItem(){return null},setItem(){}},CustomEvent:function(){}};
vm.runInNewContext(script,context,{filename:'academic-2027-replan.js'});
const plan=context.window.CoraAcademic2027;
assert.ok(plan);
assert.equal(plan.validatePlan().length,0,plan.validatePlan().join('\n'));
assert.equal(plan.STAGES.length,4);
assert.deepEqual(Array.from(plan.STAGES,s=>s.end),[
 '2027-04-02','2027-06-23','2027-10-01','2027-11-30']);
assert.deepEqual(Array.from(plan.WINDOWS[1],v=>v.start+'-'+v.end),[
 '2027-05-17-2027-05-21','2027-06-14-2027-06-18']);
assert.equal(plan.WINDOWS[0][1].end,'2027-03-24','Primeira etapa deve evitar feriados 25 e 26/03');
assert.ok(plan.WINDOWS[1].every(v=>v.end<'2027-06-24'));
assert.ok(plan.WINDOWS[2].every(v=>v.end<'2027-10-01'));
assert.ok(plan.WINDOWS[3].every(v=>v.end<='2027-11-30'));
const fair=plan.FAIR;
assert.deepEqual(Array.from(new Set(fair.map(x=>x.date))),[
 '2027-09-11','2027-09-13','2027-09-14','2027-09-15','2027-09-16']);
assert.deepEqual(Array.from(new Set(fair.map(x=>new Date(x.date+'T12:00:00Z').getUTCDay()))),[6,1,2,3,4]);
assert.ok(fair.some(e=>e.date==='2027-09-16'&&/sem aulas regulares/i.test(e.notes)));
assert.ok(fair.some(e=>e.date==='2027-09-16'&&/resultado/i.test(e.title)));
const earlier={year:2027,approved:true,approvedStages:[1,2,3,4],source:'Cora',items:[
 {stage:1,due:'2027-01-04',deliveryTypes:'AP2 e AD',items:[{title:'Provas AP2 - Fundamental',start:'2027-03-02',end:'2027-03-06'},{title:'AD 2027',start:'2027-04-01',end:'2027-04-02'}]},
 {stage:2,due:'2027-03-05',deliveryTypes:'AP2, AD e AR',items:[{title:'AP2',start:'2027-05-17',end:'2027-05-21'},{title:'AD',start:'2027-06-28',end:'2027-07-02'}]},
 {stage:3,due:'2027-06-28',deliveryTypes:'AD',items:[{title:'AP2',start:'2027-09-12',end:'2027-09-18'},{title:'AD',start:'2027-09-27',end:'2027-10-01'}]},
 {stage:4,due:'2027-08-27',deliveryTypes:'AP2 e AD',items:[{title:'AP2',start:'2027-10-24',end:'2027-10-29'},{title:'AD',start:'2027-11-29',end:'2027-12-03'}]}
]};
const prior=JSON.stringify(earlier);
const proposal=plan.mergeAssessment(earlier);
assert.equal(JSON.stringify(earlier),prior,'Original must not change');
assert.deepEqual(Array.from(proposal.data.items,r=>r.due),earlier.items.map(r=>r.due));
assert.deepEqual(Array.from(proposal.data.items,r=>r.deliveryTypes),earlier.items.map(r=>r.deliveryTypes));
assert.equal(proposal.data.items[1].items[1].end,'2027-06-18');
assert.equal(proposal.data.items[2].items.find(x=>/AP2/.test(x.title)).start,'2027-08-30');
assert.equal(proposal.data.items[3].items.find(x=>x.title==='AD').end,'2027-11-26');
assert.deepEqual(Array.from(proposal.data.approvedStages),[]);
assert.equal(proposal.data.approved,false);
const custom=JSON.parse(prior);custom.items[0].items.push({title:'Simulado institucional',start:'2027-03-08',end:'2027-03-12'});
const preserved=plan.mergeAssessment(custom);
assert.ok(preserved.data.items[0].items.some(x=>x.title==='Simulado institucional'));
assert.ok(preserved.warnings.length>0);
const imported=[
 {id:'carry-2027-2026-oficial-2026-09-12',originYear:2026,date:'2027-09-11',title:'Abertura da ExpoCora',type:'Evento'},
 {id:'carry-2027-2026-oficial-2026-09-14',originYear:2026,date:'2027-09-13',title:'Organização interna — ExpoCora',type:'Pedagógico'},
 {id:'local-reuniao',date:'2027-09-13',title:'Reunião Pedagógica da Gestão',type:'Reunião'}];
const festival=plan.proposedFair(imported);
assert.equal(festival.removed,2);
assert.equal(festival.created,6);
assert.ok(festival.events.some(x=>x.id==='local-reuniao'),'Keep unrelated calendar events');
assert.ok(festival.events.filter(x=>x.id.startsWith('cora-expocora-2027-')).every(x=>x.needsReview&&x.status==='Em revisão'));
assert.equal(plan.proposedFair(festival.events).created,0,'Idempotent fair proposal');
const stale=[
 {id:'carry-2027-2026-abc',originYear:2026,title:'Fim: Avaliações diagnósticas',type:'Avaliação',date:'2027-07-02'},
 {id:'carry-2027-2026-due',originYear:2026,title:'Entrega das avaliações à coordenação',type:'Avaliação',assessmentDelivery:true,date:'2027-07-02'},
 {id:'local-custom',date:'2027-07-02',title:'Simulado de revisão',type:'Avaliação'}
];
const invalid=plan.obsoleteImportedEvaluations(stale);
assert.equal(invalid.length,1);
assert.equal(invalid[0].id,'carry-2027-2026-abc');
assert.equal(plan.kind('Avaliações diagnósticas — AD'),'AD');
console.log('PASSOU: limites SINEPE 2027, provas antes da Copa, dias da ExpoCora, prazos intactos, rascunhos e limpeza conservadora.');
