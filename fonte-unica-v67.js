(function(){'use strict';if(window.__CORA_FONTE_UNICA_V67__)return;window.__CORA_FONTE_UNICA_V67__=true;
const FECH_KEY='cora2027_fechamento_reajustes_v2';
const ALUNOS_KEY='cora2027_alunos_oficial_v1';
const LISTAS_KEY='cora2027_listas_material_v1';
const API='https://script.google.com/macros/s/AKfycbwSpAtBgMjFyQ7J5yUxIfobEt0CxCGNgWEQZxp-mj9z-9zfWIcV2ig9iQlGzcCL5UYk/exec';
const slug=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toUpperCase();
const now=()=>new Date().toLocaleString('pt-BR',{timeZone:'America/Fortaleza'});
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'{}')||{}}catch(e){return{}}};
const money=v=>Number.isFinite(Number(v))?Number(v):0;
const approved=(id,category,segment,item,detail,v26,v27,rate,extra={})=>{const stamp=now();return {id,data:{
  'Categoria':category,'Segmento/Turma':segment||'','Produto':item||'','Descrição':detail||'',
  'Valor 2026':money(v26),'Valor 2027':money(v27),'Reajuste %':money(rate),
  'Parcelamento':extra.parcelamento||'','Obrigatório':extra.obrigatorio||'NÃO',
  'Status':'APROVADO','Aprovado em':stamp,'Publicado no Cora Família':'SIM','Publicado em':stamp,
  'ID':id,'Observação':extra.observacao||`Publicado pela fonte única V67 em ${stamp}`,
  ...(extra.campos||{})
}}};
async function post(row){const payload={action:'salvarRegistro',aba:'Produtos 2027',id:row.id,data:row.data};const response=await fetch(API,{method:'POST',mode:'no-cors',cache:'no-store',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});return response}
function tuitionRows(db){const out=[];Object.entries(db.tuition||{}).forEach(([seg,r])=>{if(!r?.saved)return;const first=money(r.first),ann=money(r.annuity),a=money(r.planA),b=money(r.planB),late26=money(r.late26),rate=money(r.rate),late27=late26*(1+rate/100),id='MEN|'+slug(seg);out.push(approved(id,'Mensalidade',seg,'Anuidade + Planos A/B','Valor oficial publicado pelo Cora Gestão.',r.base26,ann,rate,{obrigatorio:'SIM',parcelamento:`1ª parcela R$ ${first.toFixed(2)} | Plano A: 12 x R$ ${a.toFixed(2)} | Plano B: 11 x R$ ${b.toFixed(2)}`,observacao:`Após vencimento 2026: R$ ${late26.toFixed(2)} | Após vencimento 2027: R$ ${late27.toFixed(2)} | Salvo em ${r.savedAt||now()}`,campos:{'1ª Parcela':first,'Primeira Parcela':first}}))});return out}
function productRows(db){const out=[];Object.entries(db.records||{}).forEach(([storedId,r])=>{if(!r?.saved)return;const category=r.category==='Materiais / Livros'?'Material Didático':(r.category||'Produto 2027');const prefix=category==='Fardamento'?'FAR':category==='STI / Tempo Integral'?'STI':'MATD';const id=category==='STI / Tempo Integral'&&String(storedId).startsWith('STI|')?storedId:`${prefix}|${slug(storedId)}`;out.push(approved(id,category,r.segment,r.item,r.detail,r.v26,r.v27,r.rate,{obrigatorio:category==='Material Didático'?'SIM':'NÃO',observacao:`Registro ${storedId} salvo em ${r.savedAt||now()}`}))});return out}
function studentRows(){const out=[];Object.entries(read(ALUNOS_KEY)).forEach(([serie,r])=>{if(!r?.saved)return;const id='ALUNOS|'+slug(serie);out.push(approved(id,'Planejamento de Alunos',serie,'Quantidade oficial de alunos 2027',r.segmento,r.base26,r.valor,r.base26?((money(r.valor)/money(r.base26)-1)*100):0,{obrigatorio:'SIM',observacao:`Projeção inicial: ${money(r.projecao)} | Salvo em ${r.savedAt||now()}`}))});return out}
function listRows(){const out=[];Object.entries(read(LISTAS_KEY)).forEach(([turma,o])=>{if(!o?.savedAt)return;const itens=[];if(o.didatico?.nome)itens.push(o.didatico.nome);(o.uso||[]).forEach(x=>itens.push(x));(o.individual||[]).forEach(x=>itens.push(x));(o.higiene||[]).forEach(x=>itens.push(x));(o.extras||[]).forEach(x=>itens.push(x.item||x));const id='LISTA|'+slug(turma);out.push(approved(id,'Lista de Material',turma,'Lista oficial de material 2027',`${itens.length} itens: ${itens.join(' | ')}`,'',o.didatico?.valor,'',{obrigatorio:'SIM',parcelamento:o.didatico?.parcelamento||'',observacao:`Último salvamento: ${o.savedAt}`}))});return out}
function rows(){const db=read(FECH_KEY);const map=new Map();[...tuitionRows(db),...productRows(db),...studentRows(),...listRows()].forEach(r=>map.set(r.id,r));return [...map.values()]}
let publishing=false;
async function publish(){if(publishing)return 0;publishing=true;try{const rs=rows();if(!rs.length)return 0;for(const row of rs)await post(row);localStorage.setItem('cora2027_ultima_publicacao_v67',JSON.stringify({at:new Date().toISOString(),count:rs.length,ids:rs.map(r=>r.id)}));document.dispatchEvent(new CustomEvent('cora:catalog-published',{detail:{count:rs.length,version:'67'}}));return rs.length}finally{publishing=false}}
function bind(){document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.matches('.tu-save,#saveAllTuition,#adjSaveAll,.adj-save-row,.sti-save-row,#saveAllSti,.aluno-save,#alunosSaveAll,#lmSave,#saveMaterialsSegment,#saveAllMaterials'))setTimeout(()=>publish().catch(console.warn),900)},true)}
function init(){bind();setTimeout(()=>publish().catch(console.warn),1600)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.CoraFonteUnicaV67={publish,rows,version:'67'};
})();