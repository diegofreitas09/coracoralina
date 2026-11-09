import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CANVA_ROTEIROS,CANVA_IMPORT_REPORT,CANVA_ROTEIROS_ORIGIN} from '../netlify/functions/lib/cora-roteiros-canva-2026.mjs';
import {TEACHER_PLAN,planForRoster} from '../netlify/functions/lib/cora-roteiros-professores-2026.mjs';
import {roteiroRules,composition,roteiroConfig} from '../netlify/functions/lib/cora-roteiros.mjs';
const root=new URL('.',import.meta.url).pathname;
assert.equal(CANVA_ROTEIROS_ORIGIN.designId,'DAGIw1ZBlf8');
assert.equal(CANVA_ROTEIROS.length,539);
assert.equal(CANVA_IMPORT_REPORT.units,CANVA_ROTEIROS.length);
assert.deepEqual(CANVA_IMPORT_REPORT.byStageType,{'1-AP2':72,'1-AD':82,'2-AP2':70,'2-AD':82,'3-AP2':0,'3-AD':81,'4-AP2':70,'4-AD':82});
const keys=CANVA_ROTEIROS.map(x=>[x.grade,x.stage,x.assessment,x.subject].join('|'));
assert.equal(keys.length,new Set(keys).size,'Nenhum roteiro duplicado pode substituir outro');
assert.ok(CANVA_ROTEIROS.every(x=>x.year===2026&&x.rawText?.trim()&&x.sourcePage>=2&&x.sourcePage<=56));
assert.equal(new Set(CANVA_ROTEIROS.map(x=>x.grade)).size,7);
assert.equal(CANVA_IMPORT_REPORT.notFound.includes('3-AP2'),true,'Não inventar AP2 da terceira etapa');
const f=(grade,stage,assessment,subject)=>CANVA_ROTEIROS.find(x=>x.grade===grade&&x.stage===stage&&x.assessment===assessment&&x.subject===subject);
assert.ok(f('6º ano',4,'AD','GRAMÁTICA')?.rawText.includes('Concordância verbal'));
assert.ok(f('3ª série',4,'AD','SOCIOLOGIA')?.rawText.includes('Ciência Política'));
assert.ok(f('8º ano',4,'AP2','MATEMÁTICA')?.rawText.includes('Plano Cartesiano'));
assert.ok(f('8º ano',2,'AP2','MATEMÁTICA')?.rawText.includes('Expressões algébricas'));
assert.ok(f('8º ano',1,'AP2','MATEMÁTICA')?.rawText.includes('Conjuntos numéricos'));
assert.ok(f('1ª série',1,'AP2','INGLÊS')?.rawText.includes('Dreams, goals'));
assert.ok(CANVA_IMPORT_REPORT.unmatchedLabels.length>=4,'Sinalizar rótulos sem corpo mesmo que o conteúdo esteja em outra caixa');
assert.equal(TEACHER_PLAN.length,16);
const sample=TEACHER_PLAN.map((x,i)=>({
 id:'p-'+i,email:'p'+i+'@escola.test',name:x.person==='Breno'?'Alysson Breno Bezerra da Silva':
    x.person+' Sobrenome',profile:'Professor',status:'Ativo',
 segments:['Ensino Fundamental II','Ensino Médio']
}));
const res=planForRoster(sample);
assert.ok(res.every(r=>r.matches===1), 'As 16 pessoas devem ser identificadas sem ambiguidade');
assert.ok(res.every(r=>r.teacher&&r.teacher.email), 'Requer conta real e e-mail');
const assigned=new Map(res.map(r=>[r.person,roteiroRules.effectiveAssignments(r.rule,r.teacher)]));
assert.ok(assigned.get('Herculano').some(x=>x.grade==='6º ano'&&x.subject==='GRAMÁTICA'));
assert.ok(assigned.get('Herculano').some(x=>x.grade==='3ª série'&&x.subject==='PRODUÇÃO TEXTUAL'));
assert.ok(assigned.get('Lucivania').some(x=>x.grade==='2ª série'&&x.subject==='LÍNGUA PORTUGUESA'));
assert.ok(assigned.get('Charles').some(x=>x.grade==='1ª série'&&x.subject==='PRODUÇÃO TEXTUAL'));
assert.ok(assigned.get('Charlyson').some(x=>x.grade==='9º ano'&&x.subject==='QUÍMICA'));
assert.ok(assigned.get('Randolfo').some(x=>x.grade==='3ª série'&&x.subject==='BIOLOGIA'));
assert.ok(assigned.get('John').some(x=>x.grade==='2ª série'&&x.subject==='BIOLOGIA'));
assert.ok(assigned.get('Breno').some(x=>x.grade==='7º ano'&&x.subject==='EDUAÇÃO FÍSICA'));
assert.ok(assigned.get('Gleiciane').some(x=>x.grade==='8º ano'&&x.subject==='MATEMÁTICA'));
assert.deepEqual(assigned.get('Júlia').filter(x=>x.subject==='ARTE').map(x=>x.grade),['6º ano','7º ano','8º ano','9º ano','1ª série']);
assert.deepEqual(assigned.get('Mônica').map(x=>x.grade),['9º ano','1ª série','2ª série','3ª série']);
assert.ok(assigned.get('Mônica').every(x=>x.subject==='FÍSICA'));
const juliaRule=TEACHER_PLAN.find(x=>x.person==='Júlia');
const savedJulia={items:[{grade:'6º ano',subject:'HISTÓRIA'},{grade:'1ª série',subject:'ARTE'}]};
const migrated=roteiroRules.assignmentSupplement(savedJulia,juliaRule,assigned.get('Júlia'));
assert.equal(migrated.items.filter(x=>x.subject==='ARTE').length,5);
assert.ok(migrated.items.some(x=>x.subject==='HISTÓRIA'));
assert.equal(roteiroRules.assignmentSupplement(migrated,juliaRule,assigned.get('Júlia')),null,'Não reaplicar após ajuste manual');
assert.equal(roteiroRules.assignmentSupplement(savedJulia,juliaRule,[]),null,'Não ampliar segmento sem autorização');
const ambiguous=[...sample,{...sample[0],id:'another-id',email:'other@escola.test'}];
assert.equal(planForRoster(ambiguous).find(x=>x.person==='Herculano').matches,2);
assert.equal(planForRoster(ambiguous).find(x=>x.person==='Herculano').teacher,null,'Não atribuir a conta ambígua');
assert.equal(planForRoster(sample.filter(x=>x.name!=='Gleiciane Sobrenome')).find(x=>x.person==='Gleiciane').teacher,null);
const wrongSegment={...sample[0],segments:['Ensino Médio']};
assert.ok(!roteiroRules.effectiveAssignments(res[0].rule,wrongSegment).some(x=>x.grade==='6º ano'));
assert.ok(roteiroRules.effectiveAssignments(res[0].rule,wrongSegment).some(x=>x.grade==='1ª série'));
const submitted=roteiroRules.cleanDoc({
 stage:4,assessment:'AD',grade:'6º ano',subject:'GRAMÁTICA',
 blocks:[{book:'',unit:'',chapter:'',theme:'',pages:''}],
 sourceText:f('6º ano',4,'AD','GRAMÁTICA').rawText,status:'enviado',confirmed:true
},null,{id:'a',email:'a@escola.test',name:'Professor'},2026);
assert.equal(submitted.status,'enviado');
assert.equal(submitted.missingStructuredFields,true);
assert.equal(submitted.reviewedSource,true);
assert.equal(roteiroRules.cleanDoc({
 stage:4,assessment:'AD',grade:'6º ano',subject:'GRAMÁTICA',
 blocks:[{book:'',unit:'',chapter:'',theme:'',pages:''}],
 sourceText:'Material completo digitado no Canva',status:'enviado',confirmed:false
},null,{id:'a',email:'a@escola.test',name:'Professor'},2026).error!==undefined,true);
const row={date:'2026-11-24',grade:'6º ano',subject:'GRAMÁTICA',stage:4,assessment:'AD'};
const before=composition({year:2026,schedule:[row],documents:[],templates:CANVA_ROTEIROS});
assert.equal(before[0].condition,'modelo-canva-pendente');
assert.equal(before[0].template?.sourcePage,2);
const pending=composition({year:2026,schedule:[row],documents:[submitted],templates:CANVA_ROTEIROS});
assert.equal(pending[0].condition,'aguardando-conferencia');
submitted.status='aprovado';
const after=composition({year:2026,schedule:[row],documents:[submitted],templates:CANVA_ROTEIROS});
assert.equal(after[0].condition,'aprovado');
const future=composition({year:2027,schedule:[{...row,date:'2027-11-24'}],documents:[],templates:CANVA_ROTEIROS});
assert.equal(future[0].condition,'sem-roteiro','Não reutilizar conteúdo 2026 em 2027 automaticamente');
const UI=fs.readFileSync(root+'roteiros-integrados.js','utf8');
const API=fs.readFileSync(root+'../netlify/functions/cora-portal.mjs','utf8');
assert.ok(UI.includes("CoraRoteiros")&&UI.includes('crCanvaText'));
assert.ok(UI.includes('crConfirmCanva')&&UI.includes('crSavePlan'));
assert.ok(UI.includes("row.template.rawText")&&UI.includes("CoraPDF.fromCanvases("));
assert.ok(API.includes("if(action==='roteiros'"));
assert.ok(roteiroConfig.subjectsByGrade['8º ano'].includes('SOCIOLOGIA'));
console.log('PASSOU: 539 roteiros Canva, 7 turmas, 16 professores, autorização por segmento, autoria, etapas, AD/AP2, revisão obrigatória, exportação e sem reutilização indevida em 2027.');
