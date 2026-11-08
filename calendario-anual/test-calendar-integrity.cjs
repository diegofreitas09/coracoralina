'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const folder=__dirname,source=fs.readFileSync(path.join(folder,'calendar-integrity.js'),'utf8');
const win={};vm.runInNewContext(source,{window:win,Date,console},{filename:'calendar-integrity.js'});
const v=win.CoraCalendarIntegrity;
assert.equal(v.easter(2027),'2027-03-28');
assert.equal(v.easter(2026),'2026-04-05');
const data=[
 {id:'a',date:'2027-02-08',type:'Feriado',title:'Sem aula — Carnaval (segunda-feira)',holidayManaged:true,holidayDecision:'sem'},
 {id:'b',date:'2027-02-09',type:'Feriado',title:'Sem aula — Carnaval (terça-feira)',holidayManaged:true,holidayDecision:'sem'},
 {id:'c',date:'2027-02-10',type:'Feriado',title:'Sem aula — Quarta-feira de Cinzas',holidayManaged:true,holidayDecision:'sem'},
 {id:'d',date:'2027-02-15',type:'Feriado',title:'Carnaval — feriado'},
 {id:'e',date:'2027-02-16',type:'Feriado',title:'Carnaval — feriado'},
 {id:'f',date:'2027-02-17',type:'Feriado',title:'Quarta-feira de Cinzas'},
 {id:'g',date:'2027-02-12',type:'Evento',title:'Bailinho de Carnaval do Cora'},
 {id:'h',date:'2027-02-13',type:'Evento',title:'Aniversário de Luiz Carlos'},
 {id:'i',date:'2027-02-22',type:'Pedagógico',title:'Escolha dos líderes de sala'},
 {id:'j',date:'2026-02-16',type:'Feriado',title:'Carnaval — feriado'},
 {id:'k',date:'2026-02-17',type:'Feriado',title:'Carnaval — feriado'},
 {id:'l',date:'2026-02-18',type:'Feriado',title:'Quarta-feira de Cinzas'}
];
const original=JSON.stringify(data);
const invalid=v.find(data);
assert.deepEqual(Array.from(invalid,i=>i.date),['2027-02-15','2027-02-16','2027-02-17']);
const cleaned=v.filterEvents(data);
assert.equal(data.length,12);
assert.equal(cleaned.length,9);
assert.equal(JSON.stringify(data),original,'Apenas leitura; não modificar o banco');
assert.ok(cleaned.some(e=>e.id==='a')&&cleaned.some(e=>e.id==='b')&&cleaned.some(e=>e.id==='c'));
assert.ok(cleaned.some(e=>e.id==='g')&&cleaned.some(e=>e.id==='h')&&cleaned.some(e=>e.id==='i'));
assert.ok(cleaned.some(e=>e.id==='j')&&cleaned.some(e=>e.id==='k')&&cleaned.some(e=>e.id==='l'));
assert.equal(v.check({date:'2027-05-27',title:'Corpus Christi',type:'Feriado'}),null);
assert.equal(v.check({date:'2027-06-03',title:'Corpus Christi',type:'Feriado'})?.year,2027);
assert.equal(v.check({date:'2027-03-26',title:'Sexta-feira da Paixão',type:'Feriado'}),null);
assert.equal(v.check({date:'2027-03-28',title:'Páscoa',type:'Feriado'}),null);
assert.equal(v.check({date:'2027-02-12',title:'Bailinho do Carnaval',type:'Pedagógico'}),null);
assert.equal(v.check({date:'2027-02-15',title:'Carnaval da turma',type:'Evento'}),null);
const expected=[
 ['index.html','calendar-integrity.js'],
 ['year-transfer.js','CoraCalendarIntegrity?.filterEvents'],
 ['portal.js','CoraCalendarIntegrity?.filterEvents'],
 ['team-calendar-view.js','CoraCalendarIntegrity?.filterEvents'],
 ['calendar-pdf-activities.js','CoraCalendarIntegrity?.filterEvents'],
 ['executive-dashboard.js','CoraCalendarIntegrity?.filterEvents']
];
for(const [name,needle] of expected){
 const code=fs.readFileSync(path.join(folder,name),'utf8');
 assert.ok(code.includes(needle),name+' não usa o filtro');
}
const html=fs.readFileSync(path.join(folder,'index.html'),'utf8');
assert.ok(html.indexOf('calendar-integrity.js')<html.indexOf('year-transfer.js'));
assert.ok(html.indexOf('calendar-integrity.js')<html.indexOf('portal.js'));
console.log('PASSOU: Carnaval 2027 (3 registros errados omitidos), carnaval 2026 preservado, atividades normais intactas, PDFs e dashboard conectados.');
