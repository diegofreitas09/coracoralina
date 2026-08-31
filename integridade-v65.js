(function(){
  'use strict';
  if(window.__CORA_INTEGRIDADE_V65__)return;
  window.__CORA_INTEGRIDADE_V65__=true;
  const KEY='cora2027_fechamento_reajustes_v2';
  const EXPECTED=36;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){return {}}};
  function counts(){
    const d=read(),tu=Object.values(d.tuition||{}).filter(x=>x&&x.saved).length,rec=Object.values(d.records||{}).filter(x=>x&&x.saved).length;
    return {mensalidades:tu,itens:rec,total:tu+rec,esperado:EXPECTED,ok:tu+rec===EXPECTED};
  }
  async function republish(){
    try{
      if(window.CoraGestaoPublicacaoV64?.republish)await window.CoraGestaoPublicacaoV64.republish();
      else if(window.CoraGestaoSync?.syncFechamento)await window.CoraGestaoSync.syncFechamento(true);
    }catch(e){console.warn('Cora Gestão: auditoria não conseguiu republicar.',e)}
  }
  function bindPdf(){
    const old=document.getElementById('pdfTop');
    if(!old||old.dataset.integridade65==='1')return;
    old.dataset.integridade65='1';
    old.textContent='📄 Relatório Completo PDF 🔒';
    old.addEventListener('click',function(e){
      const target=document.getElementById('downloadFinalClosingPdf')||document.getElementById('downloadClosingPdfTop');
      if(!target)return;
      e.preventDefault();e.stopImmediatePropagation();
      target.click();
    },true);
  }
  function mark(){
    const c=counts();
    document.documentElement.dataset.coraFechamentoRegistros=String(c.total);
    document.documentElement.dataset.coraFechamentoOk=c.ok?'1':'0';
    return c;
  }
  async function audit(){bindPdf();const c=mark();if(c.ok)await republish();return c;}
  function init(){bindPdf();mark();new MutationObserver(()=>{bindPdf();mark()}).observe(document.body,{childList:true,subtree:true});setTimeout(audit,1200)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  window.CoraGestaoIntegridadeV65={audit,counts,republish,version:'65'};
})();