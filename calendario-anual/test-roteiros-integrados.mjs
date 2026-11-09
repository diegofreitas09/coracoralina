import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {legacy2026,subjects2026} from '../netlify/functions/lib/cora-roteiros-legacy-2026.mjs';
import {roteiroRules,roteiroConfig,composition} from '../netlify/functions/lib/cora-roteiros.mjs';
const folder=new URL('.',import.meta.url).pathname;
assert.ok(legacy2026.length>=500,'Precisa importar os roteiros existentes em 7 abas');
assert.equal(new Set(legacy2026.map(e=>e.sourceTab)).size,7);
assert.ok(legacy2026.every(e=>e.year===2026&&e.status==='referencia-historica'));
assert.ok(legacy2026.every(e=>e.legacyText&&e.sourceCell&&e.grade&&e.subject&&e.stage&&e.assessment));
assert.equal(new Set(legacy2026.map(e=>[e.grade,e.stage,e.assessment,e.subject].join('|'))).size,legacy2026.length);
assert.ok(legacy2026.some(e=>e.grade==='6º ano'&&e.subject==='GRAMÁTICA'&&e.assessment==='AP2'&&e.stage===1));
assert.ok(legacy2026.some(e=>e.grade==='3ª série'&&e.subject==='MATEMÁTICA'&&e.assessment==='AD'));
assert.equal(subjects2026['6º ano'].includes('GRAMÁTICA'),true);
assert.ok(roteiroConfig.grades.includes('Infantil 5')&&roteiroConfig.grades.includes('5º ano')&&roteiroConfig.grades.includes('1ª série'));
assert.deepEqual(roteiroRules.normalizePair({grade:'6º ANO',subject:'Gramatica'}),{grade:'6º ano',subject:'GRAMÁTICA'});
assert.equal(roteiroRules.validDate('2027-02-30',2027),false);
assert.equal(roteiroRules.validDate('2027-02-08',2027),true);
assert.equal(roteiroRules.validDate('2026-02-08',2027),false);
const teacher={id:'member-1',email:'professor@escola.test',name:'Professor Teste'};
const base={grade:'6º ano',subject:'GRAMÁTICA',stage:1,assessment:'AP2',
 blocks:[{book:'Livro 1',unit:'Unidade 1',chapter:'Capítulo 1',theme:'Linguagem, texto e leitura',pages:'10 a 26'}]};
let draft=roteiroRules.cleanDoc({...base,status:'rascunho'},null,teacher,2027);
assert.equal(draft.status,'rascunho');
assert.equal(draft.authorEmail,teacher.email);
assert.equal(draft.revision,1);
let sent=roteiroRules.cleanDoc({...base,status:'enviado'},draft,teacher,2027);
assert.equal(sent.status,'enviado');assert.equal(sent.revision,2);
let invalid=roteiroRules.cleanDoc({...base,blocks:[{book:'',unit:'',chapter:'',theme:'',pages:''}],status:'enviado'},null,teacher,2027);
assert.ok(invalid.error);
const validSegs={segments:['Ensino Fundamental II']};
assert.equal(roteiroRules.permittedSegment(validSegs,'6º ano'),true);
assert.equal(roteiroRules.permittedSegment(validSegs,'1ª série'),false);
assert.equal(roteiroRules.permittedSegment({segments:['Todos']},'1ª série'),true);
const schedule=[
 {date:'2027-03-22',grade:'6º ano',subject:'GRAMÁTICA',stage:1,assessment:'AD'},
 {date:'2027-03-22',grade:'6º ano',subject:'HISTÓRIA',stage:1,assessment:'AD'},
 {date:'2027-03-23',grade:'6º ano',subject:'GRAMÁTICA',stage:1,assessment:'AP2'}
];
const approved=roteiroRules.cleanDoc({...base,assessment:'AD',status:'enviado'},null,teacher,2027);approved.status='aprovado';
const pending=roteiroRules.cleanDoc({...base,subject:'HISTÓRIA',assessment:'AD',status:'enviado'},null,teacher,2027);
const composed=composition({schedule,documents:[approved,pending],year:2027,legacy:legacy2026});
assert.deepEqual(composed.map(x=>x.condition),['aprovado','aguardando-conferencia','sem-roteiro']);
assert.equal(composed[2].legacy,null,'Roteiro 2026 não deve entrar automaticamente em 2027');
const old=composition({schedule:[{...schedule[0],date:'2026-03-22',assessment:'AP2'}],documents:[],year:2026,legacy:legacy2026});
assert.equal(old[0].condition,'referencia-2026');
const portal=fs.readFileSync(folder+'portal.js','utf8');
const api=fs.readFileSync(folder+'../netlify/functions/cora-portal.mjs','utf8');
const html=fs.readFileSync(folder+'index.html','utf8');
const sw=fs.readFileSync(folder+'service-worker.js','utf8');
assert.ok(api.includes("if(action==='roteiros'"));
assert.ok(api.includes("if(role!=='gestao'&&!member)"));
assert.ok(portal.includes("data-cp-tab=\"roteiros\""));
assert.ok(portal.includes("CoraRoteiros?.mount?.({role:'gestao'"));
assert.ok(portal.includes("CoraRoteiros?.mount?.({role:'equipe'"));
assert.ok(html.includes('roteiros-integrados.js')&&html.includes('roteiros-integrados.css'));
assert.ok(html.indexOf('roteiros-integrados.js')<html.indexOf('portal.js'));
assert.ok(sw.includes('roteiros-integrados.js')&&sw.includes('roteiros-integrados.css'));
const script=fs.readFileSync(folder+'roteiros-integrados.js','utf8');
assert.ok(script.includes('CoraPDF.fromCanvases('));
assert.ok(script.includes("toBlob(blob=>"));
assert.ok(script.includes('crSelfSave')&&script.includes('crSavePlan'));
assert.ok(script.includes('crEditorForm')&&script.includes('crBlocks'));
assert.ok(script.includes('crExportPNG')&&script.includes('crExportPDF'));
assert.ok(script.includes('PRÉVIA PARA CONFERÊNCIA'));
const window={},document={createElement(name){
 assert.equal(name,'canvas');
 const ctx={
  fillStyle:'',font:'',
  fillRect(){},fillText(){},
  measureText(text){return {width:String(text||'').length*10};}
 };
 return {width:0,height:0,getContext(){return ctx}};
}};
vm.runInNewContext(script,{window,document,console},{filename:'roteiros-integrados.js'});
const fake={composite:composed,year:2027};
const pages=window.CoraRoteiros.makePages(fake);
assert.ok(pages.length>=1);
assert.ok(pages.every(p=>p.width===1190&&p.height===1684));
console.log('PASSOU: legado 2026 (532 registros), autorização por segmento, autoria, estados, vínculos de calendário, campos obrigatórios, PNG e PDF, navegação.');
