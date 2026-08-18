(function(){
  const KEY='cora2027_fechamento_reajustes_v2';
  const IDS=['STI|INFANTIL','STI|INFANTIL-ESC','STI|FUNDAMENTAL','STI|FUNDAMENTAL-ESC','STI|FARDA-BLUSA','STI|FARDA-SHORT'];
  const brlLocal=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
  function db(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){return {}}}
  function price27(idx){
    const d=db(),r=(d.records||{})[IDS[idx]];
    if(r&&r.saved&&Number(r.v27)>=0)return Number(r.v27)||0;
    const item=(window.STI||STI||[])[idx];
    const rate=Number(window.state?.stiRate??0)||0;
    return (Number(item?.v26)||0)*(1+rate/100);
  }
  function rate27(idx){
    const d=db(),r=(d.records||{})[IDS[idx]];
    if(r&&r.saved)return Number(r.rate)||0;
    return Number(window.state?.stiRate??0)||0;
  }
  function hasSaved(){const d=db();return IDS.some(id=>(d.records||{})[id]?.saved)}
  function patchFinance(){
    if(typeof window.stiPotential==='function'||typeof stiPotential==='function'){
      window.stiPotential=function(){return (window.STI||STI||[]).reduce((s,i,idx)=>s+(Number(window.state?.stiQty?.[idx])||0)*price27(idx),0)};
    }
    window.renderFinSti=function(){
      const list=document.getElementById('finStiList'),total=document.getElementById('finStiTotal'),rateInput=document.getElementById('finStiRate');
      if(!list||!total)return;
      if(rateInput){rateInput.disabled=true;rateInput.value='';rateInput.placeholder='Definido no Fechamento';rateInput.title='Os valores oficiais do STI são definidos na aba Fechamento 2027.'}
      list.innerHTML=(window.STI||STI||[]).map((i,idx)=>`<div class="listitem"><b>${i.name}</b><span>2026<br><b>${brlLocal(i.v26)}</b></span><span>Reajuste oficial<br><b>${rate27(idx).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}%</b></span><span>Qtde 2027<br><input type="number" min="0" value="${Number(window.state?.stiQty?.[idx])||0}" data-sqty="${idx}"></span><span class="green">Valor oficial 2027<br><b>${brlLocal(price27(idx))}</b></span><span class="green">Potencial<br><b>${brlLocal((Number(window.state?.stiQty?.[idx])||0)*price27(idx))}</b></span></div>`).join('');
      list.querySelectorAll('[data-sqty]').forEach(inp=>inp.addEventListener('change',()=>{window.state.stiQty[inp.dataset.sqty]=Math.max(0,Number(inp.value)||0);if(typeof window.save==='function')window.save();else if(typeof save==='function')save()}));
      total.innerHTML=`<b>Potencial STI / Integral:</b> ${brlLocal(window.stiPotential())}. <span style="color:#61758b">Os preços vêm do Fechamento 2027; aqui você informa apenas as quantidades.</span>`;
    };
    try{if(document.getElementById('finStiList'))window.renderFinSti()}catch(e){console.warn(e)}
  }
  function removeTopPdf(){const b=document.getElementById('downloadClosingPdfTop');if(b)b.remove()}
  function style(){if(document.getElementById('sti-v31-style'))return;const s=document.createElement('style');s.id='sti-v31-style';s.textContent=`#finStiRate:disabled{background:#eef3f8!important;color:#6a7d90!important;cursor:not-allowed}.sti-source-note{font-size:12px;color:#61758b}`;document.head.appendChild(s)}
  function refresh(){removeTopPdf();patchFinance()}
  function init(){style();refresh();new MutationObserver(()=>{removeTopPdf();if(document.getElementById('finStiList'))patchFinance()}).observe(document.body,{childList:true,subtree:true});window.CoraSTI2027={price27,rate27,hasSaved}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();