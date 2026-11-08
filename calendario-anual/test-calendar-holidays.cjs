'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const folder=__dirname;
function execute(filename){
 const data=new Map();
 const window={};
 const document={
   createElement:()=>({id:'',className:'',addEventListener(){},close(){}}),
   addEventListener(){},
   getElementById(){return null}
 };
 const localStorage={getItem:key=>data.get(key)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const context={window,document,localStorage,Date,Intl,console,setTimeout:()=>null,clearTimeout:()=>{}};
 vm.runInNewContext(fs.readFileSync(path.join(folder,filename),'utf8'),context,{filename});
 return window;
}
const year=execute('year-transfer.js').CoraYearPlanner;
const moves=[
 ['2026-02-16',2027,'Feriado','Carnaval — feriado','2027-02-08'],
 ['2026-02-17',2027,'Feriado','Carnaval — feriado','2027-02-09'],
 ['2026-02-18',2027,'Feriado','Quarta-feira de Cinzas','2027-02-10'],
 ['2026-04-03',2027,'Feriado','Sexta-feira da Paixão','2027-03-26'],
 ['2026-06-04',2027,'Feriado','Corpus Christi','2027-05-27'],
 ['2026-04-05',2027,'Feriado','Páscoa','2027-03-28'],
 ['2027-02-08',2028,'Feriado','Carnaval — feriado','2028-02-28'],
 ['2027-02-09',2028,'Feriado','Carnaval — feriado','2028-02-29'],
 ['2027-02-10',2028,'Feriado','Quarta-feira de Cinzas','2028-03-01']
];
for(const [old,to,type,title,want] of moves)
 assert.equal(year.targetDate(old,to,type,title)?.date,want,old+' => '+title+' / '+to);
assert.equal(year.targetDate('2026-02-16',2027,'Feriado','Carnaval — feriado')?.verify,true);
const audit=execute('holiday-audit.js').CoraHolidayAudit;
assert.equal(audit.easter(2027),'2027-03-28');
assert.equal(audit.easter(2028),'2028-04-16');
const bad=[
 {id:'carry-2027-2026-oficial-2026-02-16',date:'2027-02-15',title:'Carnaval — feriado',type:'Feriado',originYear:2026},
 {id:'carry-2027-2026-oficial-2026-02-17',date:'2027-02-16',title:'Carnaval — feriado',type:'Feriado',originYear:2026},
 {id:'carry-2027-2026-oficial-2026-02-18',date:'2027-02-17',title:'Quarta-feira de Cinzas',type:'Feriado',originYear:2026}
];
const correct=[
 {id:'cora-hm-mon',date:'2027-02-08',title:'Sem aula — Carnaval (segunda-feira)',type:'Feriado',holidayManaged:true,holidayDecision:'sem'},
 {id:'cora-hm-tue',date:'2027-02-09',title:'Sem aula — Carnaval (terça-feira)',type:'Feriado',holidayManaged:true,holidayDecision:'sem'},
 {id:'cora-hm-ash',date:'2027-02-10',title:'Sem aula — Quarta-feira de Cinzas',type:'Feriado',holidayManaged:true,holidayDecision:'sem'}
];
const conflicts=audit.findConflicts([...bad,...correct],2027);
assert.equal(conflicts.length,3,'Must find three invalid imported events without flagging the correct dates');
assert.ok(conflicts.every(x=>x.imported));
assert.deepEqual(Array.from(conflicts,x=>x.expected),['2027-02-08','2027-02-09','2027-02-10']);
const manual=audit.findConflicts([{id:'school-custom',date:'2027-02-15',title:'Carnaval — feriado',type:'Feriado'}],2027);
assert.equal(manual.length,1);
assert.equal(manual[0].imported,false,'Manually entered items must be flagged but never automatically removed');
assert.equal(audit.findConflicts([{id:'themed',date:'2027-02-15',title:'Bailinho de Carnaval',type:'Pedagógico'}],2027).length,0);
assert.equal(audit.findConflicts(correct,2027).length,0);
const html=fs.readFileSync(path.join(folder,'index.html'),'utf8');
const js=fs.readFileSync(path.join(folder,'portal.js'),'utf8');
assert.ok(html.indexOf('holiday-audit.js')<html.indexOf('portal.js'),'Auditor must load before the portal');
assert.ok(js.includes('CoraHolidayAudit?.mount'));
assert.ok(js.includes('CoraHolidayAudit?.findConflicts'));
console.log('PASSOU: 9 datas móveis, 3 duplicações de 2027, preservação de 8/9/10, registros manuais e bloqueio de publicação.');