'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const folder=__dirname,window={},localStorage={getItem(){return null}};
function load(file){vm.runInNewContext(fs.readFileSync(path.join(folder,file),'utf8'),{window,localStorage,Date,console},{filename:file})}
load('school-carnival-2027.js');
load('calendar-integrity.js');
load('holiday-audit.js');
load('holidays-manager.js');
load('team-calendar-view.js');
const school=window.CoraSchoolCarnival2027;
assert.ok(school);
const noSchool=['2027-02-06','2027-02-07','2027-02-08','2027-02-09','2027-02-10'];
const normal=['2027-02-11','2027-02-12','2027-02-15','2027-02-16','2027-02-17'];
assert.deepEqual(Array.from(school.summary.noClassDays),noSchool);
assert.deepEqual(Array.from(school.summary.regularDays),normal);
for(const d of noSchool)assert.equal(school.status(d).status,'Sem aula',d);
for(const d of normal)assert.equal(school.status(d).status,'Aula normal',d);
assert.equal(new Date('2027-02-06T12:00:00Z').getUTCDay(),6);
assert.equal(new Date('2027-02-07T12:00:00Z').getUTCDay(),0);
assert.equal(new Date('2027-02-11T12:00:00Z').getUTCDay(),4);
assert.equal(new Date('2027-02-12T12:00:00Z').getUTCDay(),5);
for(const date of ['2027-02-15','2027-02-16','2027-02-17']){
 assert.equal(school.isInvalidLegacy({date,title:'Carnaval — feriado',type:'Feriado'}),true);
 assert.equal(school.isInvalidLegacy({date,title:'Conselho Escolar',type:'Reunião'}),false);
}
const duplicates=[
 {id:'legacy-15',date:'2027-02-15',title:'Carnaval — feriado',type:'Feriado'},
 {id:'legacy-16',date:'2027-02-16',title:'Carnaval — feriado',type:'Feriado'},
 {id:'legacy-17',date:'2027-02-17',title:'Quarta-feira de Cinzas',type:'Feriado'}
];
const accepted=[
 {id:'ok-8',date:'2027-02-08',title:'Sem aula — Carnaval (segunda-feira)',type:'Feriado'},
 {id:'ok-9',date:'2027-02-09',title:'Sem aula — Carnaval (terça-feira)',type:'Feriado'},
 {id:'ok-10',date:'2027-02-10',title:'Sem aula — Quarta-feira de Cinzas',type:'Feriado'},
 {id:'ok-11',date:'2027-02-11',title:'Retorno às atividades escolares',type:'Pedagógico'},
 {id:'ok-12',date:'2027-02-12',title:'Bailinho do Cora',type:'Evento'},
 {id:'ok-15',date:'2027-02-15',title:'Aula de Matemática',type:'Pedagógico'}
];
const conflicts=window.CoraHolidayAudit.findConflicts([...duplicates,...accepted],2027);
assert.equal(conflicts.length,3);
assert.deepEqual(Array.from(conflicts,c=>c.date),['2027-02-15','2027-02-16','2027-02-17']);
assert.ok(conflicts.every(c=>c.schoolConfirmedDuplicate===true),'School decision allows manual authorized cleanup even without carry IDs');
assert.ok(conflicts.every(c=>c.imported===false));
const valid=window.CoraCalendarIntegrity.filterEvents([...duplicates,...accepted]);
assert.equal(valid.length,accepted.length,'The public PDF reads no bad Carnaval events');
assert.deepEqual(Array.from(valid,v=>v.id),accepted.map(v=>v.id));
const official=window.CoraHolidays.officialList(2027,'CE','Fortaleza');
assert.deepEqual(Array.from(official.filter(x=>/Carnaval|Cinzas/.test(x.title)),x=>x.date),
 ['2027-02-08','2027-02-09','2027-02-10']);
const teacher=window.CoraHolidays.teacherPanel(2027,accepted,1);
assert.ok(teacher.includes('06 e 07/02'));
assert.ok(teacher.includes('quinta-feira, 11/02'));
assert.ok(teacher.includes('15, 16 e 17/02'));
const month=window.CoraTeacherCalendar.monthGrid({year:2027,month:1,events:[...duplicates,...accepted]}, {});
assert.ok(month.includes('Retorno às aulas · normal'));
assert.ok(month.includes('Aula normal'));
assert.equal(month.includes('Carnaval — feriado'),false);
for(const [file,term] of [
 ['portal.js','window.CoraSchoolCarnival2027?.status?.(iso)'],
 ['calendar-pdf-activities.js','Carnaval: 06–10 sem aula; retorno normal 11/02'],
 ['holidays-manager.js','chCoraCarnavalApply'],
 ['holiday-audit.js','schoolConfirmedDuplicate'],
 ['index.html','school-carnival-2027.js'],
 ['service-worker.js','school-carnival-2027.js']
 ])assert.ok(fs.readFileSync(path.join(folder,file),'utf8').includes(term),file+' não integrado');
console.log('PASSOU: 6–10/02 sem aula, retorno 11/02, aula 12 e 15–17, PDF filtrado, auditoria autorizada e Gestão/Equipe integradas.');
