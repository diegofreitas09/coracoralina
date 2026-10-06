(function(){'use strict';
if(window.__CORA_CATALOGO_V71__)return;window.__CORA_CATALOGO_V71__=true;
const API='https://script.google.com/macros/s/AKfycbwSpAtBgMjFyQ7J5yUxIfobEt0CxCGNgWEQZxp-mj9z-9zfWIcV2ig9iQlGzcCL5UYk/exec';
let saving=false;
function number(value){
  if(typeof value==='number')return Number.isFinite(value)?value:0;
  let s=String(value==null?'':value).trim().replace(/\s/g,'').replace(/^R\$/i,'');
  if(!s)return 0;
  const comma=s.lastIndexOf(','),dot=s.lastIndexOf('.');
  if(comma>=0&&dot>=0){
    if(comma>dot)s=s.replace(/\./g,'').replace(',','.');
    else s=s.replace(/,/g,'');
  }else if(comma>=0){
    s=s.replace(/\./g,'').replace(',','.');
  }else if(dot>=0&&/^-?\d{1,3}(\.\d{3})+$/.test(s)){
    s=s.replace(/\./g,'');
  }
  s=s.replace(/[^0-9.\-]/g,'');
  const n=Number(s);return Number.isFinite(n)?n:0
}
function parsePart(text,label){const match=String(text||'').match(new RegExp(label+'[^0-9]*([0-9.]+(?:,[0-9]{1,2})?)','i'));return match?number(match[1]):0}
function hydrate(cloudRows){
  const official=cloudRows.filter(r=>['Mensalidade','Material Didático','Fardamento','STI / Tempo Integral'].includes(r.Categoria));
  let current={};try{current=JSON.parse(localStorage.getItem('cora2027_fechamento_reajustes_v2')||'{}')||{}}catch(e){}
  const db={tuition:{...(current.tuition||{})},records:{...(current.records||{})},history:Array.isArray(current.history)?current.history:[],cloudVersion:'72',cloudAt:new Date().toISOString()};
  official.forEach(r=>{const id=String(r.ID||'');if(r.Categoria==='Mensalidade'){const parcel=String(r.Parcelamento||'');db.tuition[r['Segmento/Turma']]={saved:true,savedAt:r['Publicado em']||r['Aprovado em']||'',base26:number(r['Valor 2026']),annuity:number(r['Valor 2027']),rate:number(r['Reajuste %']),first:number(r['1ª Parcela']||r['Primeira Parcela'])||parsePart(parcel,'1ª parcela'),planA:parsePart(parcel,'Plano A'),planB:parsePart(parcel,'Plano B'),late26:parsePart(r.Observação,'Após vencimento 2026')}}else{db.records[id]={saved:true,savedAt:r['Publicado em']||r['Aprovado em']||'',category:r.Categoria==='Material Didático'?'Materiais / Livros':r.Categoria,segment:r['Segmento/Turma']||'',item:r.Produto||'',detail:r['Descrição']||'',v26:number(r['Valor 2026']),v27:number(r['Valor 2027']),rate:number(r['Reajuste %'])}}});
  localStorage.setItem('cora2027_fechamento_reajustes_v2',JSON.stringify(db));document.dispatchEvent(new CustomEvent('cora:official-values',{detail:{count:official.length,version:'72'}}));try{window.renderAll&&window.renderAll();window.renderFinance&&window.renderFinance()}catch(e){}return true
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
  if(!registros.length)throw new Error('Nenhum valor salvo para enviar à planilha.');
  const ids=new Set(registros.map(r=>r.id));if(ids.size!==registros.length)throw new Error('Há IDs duplicados no fechamento. Nada foi salvo.');
  saving=true;document.dispatchEvent(new CustomEvent('cora:catalog-saving',{detail:{count:registros.length,version:'72'}}));
  try{
    const completo=registros.length===36;
    const payload=completo
      ?{action:'salvarLote',aba:'Produtos 2027',escopo:'CATALOGO_OFICIAL_36',versao:'72',registros}
      :{action:'salvarLote',aba:'Produtos 2027',escopo:'VALORES_PARCIAIS',versao:'72',registros};
    const result=await request(payload);
    localStorage.setItem(completo?'cora2027_catalogo_confirmado_v72':'cora2027_valores_parciais_confirmados_v72',JSON.stringify({at:new Date().toISOString(),ids:[...ids],auditoria:result.auditoria||null}));
    document.dispatchEvent(new CustomEvent('cora:catalog-saved',{detail:{...result,completo,count:registros.length}}));
    return result
  }finally{saving=false}
}
function bind(){loadCloud().catch(error=>console.warn('Cora v72: mantendo os últimos valores confirmados.',error));document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.matches('.tu-save,.adj-save-row,[data-save-cat],#adjSaveAll,#saveAllTuition,.sti-save-row,#saveAllSti,#matSaveAll,#saveAllMaterials'))setTimeout(()=>salvarCatalogo().catch(error=>{console.error('Cora v72:',error);alert('Não foi possível confirmar o salvamento na planilha: '+error.message)}),700)},true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
window.CoraCatalogoV71={rows,hydrate,loadCloud,salvarCatalogo,get saving(){return saving},version:'72'};
})();
