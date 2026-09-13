(function(){'use strict';
if(window.__CORA_CATALOGO_V71__)return;window.__CORA_CATALOGO_V71__=true;
const API='https://script.google.com/macros/s/AKfycbwSpAtBgMjFyQ7J5yUxIfobEt0CxCGNgWEQZxp-mj9z-9zfWIcV2ig9iQlGzcCL5UYk/exec';
let saving=false;
function number(value){return Number(String(value==null?'':value).replace(/\./g,'').replace(',','.'))||0}
function parsePart(text,label){const match=String(text||'').match(new RegExp(label+'[^0-9]*([0-9.]+(?:,[0-9]{1,2})?)','i'));return match?number(match[1]):0}
function hydrate(cloudRows){
  const official=cloudRows.filter(r=>['Mensalidade','Material Didático','Fardamento','STI / Tempo Integral'].includes(r.Categoria));
  if(official.length!==36)return false;
  const db={tuition:{},records:{},history:[],cloudVersion:'71',cloudAt:new Date().toISOString()};
  official.forEach(r=>{const id=String(r.ID||'');if(r.Categoria==='Mensalidade'){const parcel=String(r.Parcelamento||'');db.tuition[r['Segmento/Turma']]={saved:true,savedAt:r['Publicado em']||r['Aprovado em']||'',base26:number(r['Valor 2026']),annuity:number(r['Valor 2027']),rate:number(r['Reajuste %']),first:number(r['1ª Parcela']||r['Primeira Parcela'])||parsePart(parcel,'1ª parcela'),planA:parsePart(parcel,'Plano A'),planB:parsePart(parcel,'Plano B'),late26:parsePart(r.Observação,'Após vencimento 2026')}}else{db.records[id]={saved:true,savedAt:r['Publicado em']||r['Aprovado em']||'',category:r.Categoria==='Material Didático'?'Materiais / Livros':r.Categoria,segment:r['Segmento/Turma']||'',item:r.Produto||'',detail:r['Descrição']||'',v26:number(r['Valor 2026']),v27:number(r['Valor 2027']),rate:number(r['Reajuste %'])}}});
  localStorage.setItem('cora2027_fechamento_reajustes_v2',JSON.stringify(db));document.dispatchEvent(new CustomEvent('cora:official-values',{detail:{count:official.length,version:'71'}}));try{window.renderAll&&window.renderAll();window.renderFinance&&window.renderFinance()}catch(e){}return true
}
async function loadCloud(){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);try{const response=await fetch(`${API}?action=listar&aba=${encodeURIComponent('Produtos 2027')}&_=${Date.now()}`,{cache:'no-store',signal:controller.signal}),json=await response.json();if(!response.ok||!json.ok||!Array.isArray(json.rows))throw new Error(json.mensagem||'Catálogo indisponível');hydrate(json.rows);return json.rows}finally{clearTimeout(timer)}}
function rows(){
  const source=window.CoraFonteUnicaV67&&window.CoraFonteUnicaV67.rows?window.CoraFonteUnicaV67.rows():[];
  return source.filter(r=>['Mensalidade','Material Didático','Fardamento','STI / Tempo Integral'].includes(r.data&&r.data.Categoria)).map(r=>{
    const data={...(r.data||{})};
    ['Status','Aprovado em','Publicado no Cora Família','Publicado em'].forEach(k=>delete data[k]);
    data.ID=r.id;
    return {id:r.id,data};
  });
}
async function request(payload,timeout=60000){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
  try{const response=await fetch(API,{method:'POST',cache:'no-store',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),signal:controller.signal});const json=await response.json();if(!response.ok||!json.ok)throw new Error(json.mensagem||'Servidor não confirmou a gravação');return json}finally{clearTimeout(timer)}
}
async function salvarCatalogo(){
  if(saving)return null;const registros=rows();
  if(registros.length!==36)throw new Error(`Fechamento incompleto: ${registros.length}/36 itens. Nada foi publicado.`);
  const ids=new Set(registros.map(r=>r.id));if(ids.size!==36)throw new Error('Há IDs duplicados no fechamento. Nada foi publicado.');
  saving=true;document.dispatchEvent(new CustomEvent('cora:catalog-saving',{detail:{count:36,version:'71'}}));
  try{const result=await request({action:'salvarLote',aba:'Produtos 2027',escopo:'CATALOGO_OFICIAL_36',versao:'71',registros});localStorage.setItem('cora2027_catalogo_confirmado_v71',JSON.stringify({at:new Date().toISOString(),ids:[...ids],auditoria:result.auditoria}));document.dispatchEvent(new CustomEvent('cora:catalog-saved',{detail:result}));return result}finally{saving=false}
}
function bind(){loadCloud().catch(error=>console.warn('Cora v71: mantendo último catálogo confirmado.',error));document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.matches('#adjSaveAll,#saveAllTuition,#matSaveAll,#saveAllMaterials,#saveAllSti'))setTimeout(()=>salvarCatalogo().catch(error=>{console.error('Cora v71:',error);alert(error.message)}),1200)},true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
window.CoraCatalogoV71={rows,hydrate,loadCloud,salvarCatalogo,get saving(){return saving},version:'71'};
})();
