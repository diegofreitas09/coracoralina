'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const folder=__dirname,store=new Map(),window={},callbacks=[];
const localStorage={
 getItem:k=>store.has(k)?store.get(k):null,
 setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)
};
const document={
 createElement:()=>({id:'',className:'',open:false,addEventListener(){},close(){},showModal(){}}),
 addEventListener(event,fn){callbacks.push(event);}
};
const sandbox={window,document,localStorage,Date,console,setTimeout:()=>{},clearTimeout:()=>{},CustomEvent:function(){}};
const run=name=>vm.runInNewContext(fs.readFileSync(path.join(folder,name),'utf8'),sandbox,{filename:name});
run('calendar-integrity.js');
run('integration-audit.js');
run('year-sync.js');
run('year-transfer.js');
const audit=window.CoraIntegrationAudit;
assert.ok(audit.inspect&&audit.render&&audit.repairExact&&audit.storeReport);
const stages=[{number:1,start:'2027-01-18',end:'2027-04-02'},
 {number:2,start:'2027-04-05',end:'2027-06-23'},
 {number:3,start:'2027-07-26',end:'2027-10-01'},
 {number:4,start:'2027-10-04',end:'2027-11-30'}];
const ready=[
 {id:'ev1',date:'2027-03-05',type:'Avaliação',title:'AP2'},
 {id:'ev2',date:'2027-06-18',type:'Avaliação',title:'AD'},
 {id:'event-a',date:'2027-09-11',type:'Evento',title:'ExpoCora'}
];
const localBirthdays=[{name:'Professora A',day:8,month:4}];
const cleanPublication={year:2027,updatedAt:'2026-11-08T12:00:00.000Z',
 events:[...ready,{id:'from-other-manager',date:'2027-04-21',type:'Feriado',title:'Tiradentes'}],
 notices:[],birthdays:localBirthdays,projects:Array.from({length:12},()=>[]),stages};
const first=audit.inspect({year:2027,localEvents:ready,approved:ready,publication:cleanPublication,stages,localBirthdays});
assert.equal(first.score,'ok',JSON.stringify(first.issues));
assert.equal(first.metrics.approved,3);
assert.equal(first.metrics.published,4);
assert.ok(audit.render(first).includes('Auditoria automática'));
const sync=window.CoraYearSync.compare({year:2027,drafts:ready,approved:ready,
 publication:cleanPublication,projects:cleanPublication.projects,birthdaysLocal:localBirthdays,stages});
assert.equal(sync.months[2].status,'Sincronizado');
assert.equal(sync.months[3].status,'Sincronizado','Extra do servidor não deve virar falso alerta');
assert.equal(sync.months[8].status,'Sincronizado');
const missing=audit.inspect({year:2027,localEvents:ready,approved:[...ready,{id:'notpublished',date:'2027-10-21',title:'Reunião',type:'Reunião'}],
 publication:cleanPublication,stages,localBirthdays});
assert.ok(missing.issues.some(x=>x.key==='pending-publication'));
const mistaken=[
 {id:'old1',date:'2027-02-15',type:'Feriado',title:'Carnaval — feriado'},
 {id:'old2',date:'2027-02-16',type:'Feriado',title:'Carnaval — feriado'},
 {id:'old3',date:'2027-02-17',type:'Feriado',title:'Quarta-feira de Cinzas'}
];
const wrong=audit.inspect({year:2027,localEvents:[...ready,...mistaken],approved:ready,publication:cleanPublication,stages});
assert.ok(wrong.issues.some(x=>x.key==='carnival-local'));
const copy={id:'repeat',date:'2027-06-02',title:'Evento repetido',type:'Evento'};
const conflict={...copy,title:'Alterado'};
const local=[...ready,copy,copy,{...copy},conflict];
const keys='cora_calendario_eventos_2027_v1';
localStorage.setItem(keys,JSON.stringify(local));
const duplicates=audit.inspect({year:2027,localEvents:local,approved:ready,publication:cleanPublication,stages});
assert.equal(duplicates.metrics.localDuplicates,2);
assert.ok(duplicates.issues.some(x=>x.key==='local-conflict'));
const saved=audit.repairExact(2027);
assert.equal(saved.ok,true);
assert.equal(saved.removed,2);
assert.ok(saved.backup&&localStorage.getItem(saved.backup));
const after=JSON.parse(localStorage.getItem(keys));
assert.equal(after.length,5,'Não pode remover dois registros com mesmo ID mas conteúdo diferente');
assert.ok(after.some(e=>e.title==='Alterado'));
assert.equal(audit.repairExact(2027).removed,0,'Correção idempotente');
const pastDue=audit.inspect({year:2027,localEvents:[],publication:cleanPublication,stages,
 assessments:{items:[
  {stage:1,items:[]},{stage:2,items:[{title:'AD',start:'2027-06-28',end:'2027-07-02'}]},
  {stage:3,items:[]},{stage:4,items:[]}
 ]}});
assert.ok(pastDue.issues.some(x=>x.key==='academic-conflicts'));
assert.ok(pastDue.issues.some(x=>x.key==='academic-copa'));
assert.equal(audit.dateValid('2027-02-30',2027),false);
assert.equal(audit.dateValid('2027-02-28',2027),true);
assert.ok(audit.inspect({year:2028,localEvents:[],publication:null}).issues.some(x=>x.key==='publication'));
const planner=window.CoraYearPlanner;
assert.ok(planner);
const moved=[
 ['2026-02-16',2027,'Carnaval (segunda-feira)','2027-02-08'],
 ['2026-02-17',2027,'Carnaval (terça-feira)','2027-02-09'],
 ['2026-02-18',2027,'Quarta-feira de Cinzas','2027-02-10'],
 ['2026-04-03',2027,'Sexta-feira da Paixão','2027-03-26'],
 ['2026-06-04',2027,'Corpus Christi','2027-05-27']
];
for(const [date,year,title,expected] of moved)
 assert.equal(planner.targetDate(date,year,'Feriado',title).date,expected,title);
const academicImport=planner.copyAcademicSuggestions(2026,2027);
assert.equal(academicImport.stages,0);
assert.equal(academicImport.assessments,0);
assert.ok(academicImport.warnings.length,'Não copiar avaliações de 2026 para a Copa');
store.set('cora_calendario_eventos_2026_v1',JSON.stringify([
 {id:'holiday',date:'2026-02-16',title:'Carnaval',type:'Feriado'},
 {id:'sae',date:'2026-02-06',title:'Simulado SAE',type:'Avaliação',assessmentWindow:true},
 {id:'event',date:'2026-02-05',title:'Reunião pedagógica',type:'Reunião'}
]));
const copied=planner.copyYearMonth(2026,2027,1,false,false);
assert.equal(copied.added,1,'Feriado deve ser gerenciado no ano de destino e não copiado');
const dest=JSON.parse(store.get(keys));
assert.ok(dest.some(e=>e.title==='Reunião pedagógica'));
assert.ok(!dest.some(e=>e.title==='Carnaval'));
assert.ok(!dest.some(e=>e.title==='Simulado SAE'));
const portal=fs.readFileSync(path.join(folder,'portal.js'),'utf8');
assert.ok(portal.includes('CoraIntegrationAudit.inspect'));
assert.ok(portal.includes('coraIntegrationAudit'));
assert.ok(portal.includes('auditRefreshTimer=setInterval'));
const html=fs.readFileSync(path.join(folder,'index.html'),'utf8');
assert.ok(html.includes('integration-audit.js')&&html.includes('integration-audit.css'));
assert.ok(html.indexOf('integration-audit.js')<html.indexOf('portal.js'));
const sw=fs.readFileSync(path.join(folder,'service-worker.js'),'utf8');
assert.ok(sw.includes('integration-audit.js')&&sw.includes('integration-audit.css'));
console.log('PASSOU: Gestão/Equipe, pendências, backup local, Carnaval 2027, avaliações na Copa, importação sem feriados, UI e cache PWA.');
