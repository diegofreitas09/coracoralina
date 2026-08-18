(function(){
  const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
  const num=v=>Number(String(v??'').replace(',','.'))||0;

  function bases(){
    try{
      const src=window.TUITION||TUITION||[];
      return src.map(r=>({segmento:r.segmento,due26:Number(r.due26)||0,late26:Number(r.late26)||0}));
    }catch(e){return []}
  }

  function calc(card){
    const seg=card.dataset.seg;
    const base=bases().find(x=>x.segmento===seg);
    if(!base)return null;
    const rate=num(card.querySelector('.tu-rate')?.value);
    const annDue=num(card.querySelector('.tu-annuity')?.value)||base.due26*(1+rate/100);
    const annLate=base.late26*(1+rate/100);
    const first=num(card.querySelector('.tu-first')?.value);
    const saldoDue=Math.max(0,annDue-first);
    const saldoLate=Math.max(0,annLate-first);
    return {rate,annDue,annLate,first,aDue:saldoDue/12,aLate:saldoLate/12,bDue:saldoDue/11,bLate:saldoLate/11};
  }

  function blocoHTML(c){
    return `<div class="tu27-summary-title">ANUIDADES E PLANOS 2027</div>
      <div class="tu27-annual-grid">
        <div class="tu27-annual due"><small>Anuidade 2027 — até vencimento</small><b>${money(c.annDue)}</b></div>
        <div class="tu27-annual late"><small>Anuidade 2027 — após vencimento</small><b>${money(c.annLate)}</b></div>
      </div>
      <div class="tu27-plan-grid">
        <div class="tu27-plan"><span>PLANO A</span><small>Até o vencimento</small><b>12 × ${money(c.aDue)}</b><em>1ª parcela ${money(c.first)} + 12 parcelas</em><strong>Total: <i>${money(c.annDue)}</i></strong></div>
        <div class="tu27-plan late"><span>PLANO A</span><small>Após o vencimento</small><b>12 × ${money(c.aLate)}</b><em>1ª parcela ${money(c.first)} + 12 parcelas</em><strong>Total: <i>${money(c.annLate)}</i></strong></div>
        <div class="tu27-plan"><span>PLANO B</span><small>Até o vencimento</small><b>11 × ${money(c.bDue)}</b><em>1ª parcela ${money(c.first)} + 11 parcelas</em><strong>Total: <i>${money(c.annDue)}</i></strong></div>
        <div class="tu27-plan late"><span>PLANO B</span><small>Após o vencimento</small><b>11 × ${money(c.bLate)}</b><em>1ª parcela ${money(c.first)} + 11 parcelas</em><strong>Total: <i>${money(c.annLate)}</i></strong></div>
      </div>`;
  }

  function update(card){
    const c=calc(card);if(!c)return;
    let wrap=card.querySelector('.tu27-expanded');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.className='tu27-expanded';
      const oldPlans=card.querySelector('.planos-2027');
      if(oldPlans)oldPlans.style.display='none';
      const oldTotal=card.querySelector('.tuition-total');
      if(oldTotal)oldTotal.style.display='none';
      const save=card.querySelector('.tu-save');
      if(save)card.insertBefore(wrap,save);else card.appendChild(wrap);
    }
    wrap.innerHTML=blocoHTML(c);
  }

  function bindCard(card){
    if(card.dataset.tu27Bound==='1')return;
    card.dataset.tu27Bound='1';
    ['.tu-rate','.tu-annuity','.tu-first'].forEach(sel=>{
      const el=card.querySelector(sel);
      if(el)el.addEventListener('input',()=>update(card));
      if(el)el.addEventListener('change',()=>update(card));
    });
    update(card);
  }

  function apply(){document.querySelectorAll('.tuition-card').forEach(bindCard);}

  function css(){
    if(document.getElementById('tu27-style'))return;
    const s=document.createElement('style');s.id='tu27-style';s.textContent=`
      .tu27-expanded{margin-top:16px;border-top:2px solid #dce8f4;padding-top:14px}
      .tu27-summary-title{font-weight:900;color:#0d315c;font-size:13px;letter-spacing:.04em;margin:0 0 10px}
      .tu27-annual-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
      .tu27-annual{background:#edf9f1;border:1px solid #b8e2c5;border-radius:12px;padding:12px 14px}
      .tu27-annual.late{background:#fff7e7;border-color:#f0d49b}
      .tu27-annual small{display:block;color:#5f7388;font-weight:700;margin-bottom:4px}
      .tu27-annual b{font-size:22px;color:#168047}.tu27-annual.late b{color:#9a6400}
      .tu27-plan-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .tu27-plan{border:1px solid #cbdced;border-radius:13px;padding:13px;background:#fff}
      .tu27-plan.late{background:#fffbf2;border-color:#ead5a9}
      .tu27-plan span{display:inline-block;background:#e5f2ff;color:#0c5c9f;font-size:12px;font-weight:900;padding:4px 8px;border-radius:999px;margin-right:7px}
      .tu27-plan small{font-weight:800;color:#526d88}.tu27-plan b{display:block;font-size:20px;color:#15904f;margin:9px 0 4px}.tu27-plan.late b{color:#a86b00}
      .tu27-plan em{display:block;font-style:normal;color:#6e8092;font-size:12px;margin-bottom:7px}.tu27-plan strong{display:block;color:#0d315c;border-top:1px solid #e2eaf2;padding-top:7px}.tu27-plan strong i{font-style:normal;float:right}
      @media(max-width:760px){.tu27-annual-grid,.tu27-plan-grid{grid-template-columns:1fr}.tu27-plan strong i{float:none;display:block;margin-top:3px}}
    `;document.head.appendChild(s);
  }

  function init(){
    css();apply();
    const mo=new MutationObserver(muts=>{
      let precisa=false;
      for(const m of muts){
        for(const node of m.addedNodes){
          if(node.nodeType===1&&(node.matches?.('.tuition-card')||node.querySelector?.('.tuition-card'))){precisa=true;break;}
        }
        if(precisa)break;
      }
      if(precisa)apply();
    });
    mo.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
