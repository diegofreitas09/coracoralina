'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const folder=__dirname;
const window={
 CoraCalendarIntegrity:{isInvalidCarnaval2027:e=>String(e?.date)==='2027-02-15'&&/carnaval/i.test(e.title||''),
 filterEvents:events=>(events||[]).filter(e=>!(e.date==='2027-02-15'&&/carnaval/i.test(e.title||'')))}
};
vm.runInNewContext(fs.readFileSync(path.join(folder,'integration-audit.js'),'utf8'),{window,Date,console},{filename:'integration-audit.js'});
const audit=window.CoraIntegrationAudit;assert.ok(audit);
const stages=[
 {number:1,start:'2027-01-18',end:'2027-04-02'},
 {number:2,start:'2027-04-05',end:'2027-06-23'},
 {number:3,start:'2027-07-26',end:'2027-10-01'},
 {number:4,start:'2027-10-04',end:'2027-11-30'}
];
const valid={year:2027,updatedAt:'2026-11-08T15:00:00.000Z',events:[],stages,notices:[],birthdays:[],projects:[]};
assert.equal(audit.analyze({year:2027,publication:valid}).status,'ok');
assert.equal(audit.analyze({year:2027,publication:null}).status,'attention');
const duplicate=[
 {id:'dup',date:'2027-02-15',title:'Carnaval — feriado',type:'Feriado'},
 {id:'dup',date:'2027-02-15',title:'Carnaval — feriado',type:'Feriado'},
 {id:'invalid',date:'2027-02-31',title:'Evento inválido',type:'Evento'},
 {id:'rev',date:'2027-03-08',title:'Em revisão',status:'Em revisão'},
 {id:'cora-periodo-avaliacao-2027-2-1-inicio',date:'2027-07-02',title:'Início: Avaliações diagnósticas — AD — 2ª etapa',type:'Avaliação',stageNumber:2,assessmentWindow:true}
];
const checked=audit.analyze({year:2027,publication:{...valid,events:duplicate}});
assert.equal(checked.status,'error');
assert.ok(checked.issues.some(x=>x.code==='duplicate-id'));
assert.ok(checked.issues.some(x=>x.code==='invalid-date'));
assert.ok(checked.issues.some(x=>x.code==='unreviewed'));
assert.ok(checked.issues.some(x=>x.code==='copa'));
assert.ok(checked.issues.some(x=>x.code==='sae'));
assert.ok(checked.issues.some(x=>x.code==='carnaval'));
const local=[
 {id:'local-1',date:'2027-02-11',title:'Reunião de equipe',type:'Reunião'},
 {id:'rev',date:'2027-03-08',title:'Evento de revisão',type:'Evento',needsReview:true},
 {id:'fake',date:'2027-02-15',title:'Carnaval — feriado',type:'Feriado'}
];
const current=audit.analyze({year:2027,publication:valid,role:'gestao',localEvents:local});
assert.ok(current.issues.some(x=>x.code==='pending-local'));
assert.ok(!audit.analyze({year:2027,publication:valid,role:'equipe',localEvents:local}).issues.some(x=>x.code==='pending-local'));
assert.equal(audit.analyze({year:2027,publication:{...valid,stages:[]}}).issues.some(x=>x.code==='stage-pending'),true);
assert.equal(audit.analyze({year:2027,publication:{...valid,events:[{id:'x',date:'not-a-date',title:'Erro'}]}}).errors,1);
const p=fs.readFileSync(path.join(folder,'portal.js'),'utf8'),html=fs.readFileSync(path.join(folder,'index.html'),'utf8');
assert.ok(p.includes("CoraIntegrationAudit?.mount?.('gestao',root)"));
assert.ok(p.includes("CoraIntegrationAudit?.mount?.('equipe',root)"));
assert.ok(p.includes("CoraIntegrationAudit?.update?.({role:'equipe',year,publication:data})"));
assert.ok(p.includes("CoraIntegrationAudit?.failed?.('gestao',targetYear,e)"));
assert.ok(p.includes("auditTimer=setInterval("));
assert.ok(p.includes("!document.hidden&&role==='gestao'"));
assert.ok(html.includes('integration-audit.js')&&html.includes('integration-audit.css'));
const sw=fs.readFileSync(path.join(folder,'service-worker.js'),'utf8');
assert.ok(sw.includes('integration-audit.js'));
assert.ok(fs.readFileSync(path.join(folder,'year-sync.js'),'utf8').includes('stageChanges'));
console.log('PASSOU: auditoria automática Gestão/Equipe; publicação, datas inválidas, duplicidade, Copa, SAE, etapas e diagnóstico de falha de conexão.');
