import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {isCarnaval2027Duplicate,reconcileCarnaval2027} from '../netlify/functions/lib/cora-carnaval-2027.mjs';
const folder=new URL('.',import.meta.url).pathname;
const correct=[
 {id:'8',date:'2027-02-08',type:'Feriado',title:'Sem aula — Carnaval (segunda-feira)',holidayManaged:true},
 {id:'9',date:'2027-02-09',type:'Feriado',title:'Sem aula — Carnaval (terça-feira)',holidayManaged:true},
 {id:'10',date:'2027-02-10',type:'Feriado',title:'Sem aula — Quarta-feira de Cinzas',holidayManaged:true},
 {id:'11',date:'2027-02-11',type:'Pedagógico',title:'Retorno às aulas'},
 {id:'12',date:'2027-02-12',type:'Evento',title:'Bailinho do Cora'},
 {id:'15a',date:'2027-02-15',type:'Pedagógico',title:'Aula normal de Matemática'},
 {id:'16a',date:'2027-02-16',type:'Reunião',title:'Reunião pedagógica'},
 {id:'17a',date:'2027-02-17',type:'Evento',title:'Atividade escolar'},
 {id:'26',date:'2026-02-16',type:'Feriado',title:'Carnaval — feriado'}
];
const invalid=[
 {id:'i15',date:'2027-02-15',type:'Feriado',title:'Carnaval — feriado'},
 {id:'i16',date:'2027-02-16',type:'Feriado',title:'Carnaval — feriado'},
 {id:'i17',date:'2027-02-17',type:'Feriado',title:'Quarta-feira de Cinzas'}
];
const original=[...correct,...invalid];
const snapshot=JSON.stringify(original);
const server=reconcileCarnaval2027(original,2027);
assert.equal(server.removed.length,3);
assert.deepEqual(server.removed.map(e=>e.id),['i15','i16','i17']);
assert.deepEqual(server.events.map(e=>e.id),correct.map(e=>e.id));
assert.equal(JSON.stringify(original),snapshot,'Não pode alterar os eventos de entrada');
assert.equal(reconcileCarnaval2027(server.events,2027).removed.length,0,'A migração é idempotente');
assert.equal(reconcileCarnaval2027(original,2026).removed.length,0,'Ano diferente não deve ser alterado');
assert.equal(isCarnaval2027Duplicate({date:'2027-02-15',type:'Evento',title:'Bailinho de Carnaval'}),false);
assert.equal(isCarnaval2027Duplicate({date:'2027-02-17',type:'Feriado',title:'Quarta-feira de Cinzas'}),true);
const window={};
vm.runInNewContext(fs.readFileSync(path.join(folder,'calendar-integrity.js'),'utf8'),{window});
const browser=window.CoraCalendarIntegrity;
assert.deepEqual(Array.from(browser.filterEvents(original),e=>e.id),correct.map(e=>e.id));
assert.deepEqual(Array.from(browser.find(original),e=>e.id),invalid.map(e=>e.id));
const localStorage={getItem(){return null},setItem(){}};
vm.runInNewContext(fs.readFileSync(path.join(folder,'holidays-manager.js'),'utf8'),{window,localStorage,Date,console});
const teacher=window.CoraHolidays.teacherPanel(2027,original,'all');
assert.ok(teacher.includes('08/02/2027')&&teacher.includes('09/02/2027')&&teacher.includes('10/02/2027'));
assert.ok(!teacher.includes('15/02/2027')&&!teacher.includes('16/02/2027')&&!teacher.includes('17/02/2027'));
assert.ok(teacher.includes('11/02')&&teacher.includes('aula normal'));
assert.ok(teacher.includes('12, 15, 16 e 17/02'));
for(const [file,needle] of [
 ['year-transfer.js','CoraCalendarIntegrity?.filterEvents'],
 ['portal.js','CoraCalendarIntegrity?.filterEvents'],
 ['team-calendar-view.js','CoraCalendarIntegrity?.filterEvents'],
 ['calendar-pdf-activities.js','CoraCalendarIntegrity?.filterEvents'],
 ['index.html','calendar-integrity.js'],
 ['service-worker.js','calendar-integrity.js']
]){
 assert.ok(fs.readFileSync(path.join(folder,file),'utf8').includes(needle),file+' não integrado ao filtro');
}
const api=fs.readFileSync(path.join(folder,'../netlify/functions/cora-portal.mjs'),'utf8');
assert.ok(api.includes('reconcileCarnaval2027(state.events,year)'),'API precisa filtrar estado publicado');
assert.ok(api.includes('await store.setJSON(backupKey'),'Backup obrigatório na migração');
assert.ok(api.includes('reconcileCarnaval2027(parsedEvents,year)'),'Publicar precisa bloquear reaparecimento');
console.log('PASSOU: Gestão, Equipe, feriados e PDF sem Carnaval falso de 15–17/02/2027; aulas normais preservadas; backup no servidor.');
