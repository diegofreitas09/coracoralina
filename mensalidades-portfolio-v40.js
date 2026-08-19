(function(){
  const KEY='cora2027_fechamento_reajustes_v2';
  const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
  const pct=v=>(Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
  const segs=['Educação Infantil','Fundamental I','Fundamental II','Ensino Médio'];
  const STI_MAP={
    'Educação Infantil':['STI|INFANTIL','STI|INFANTIL-ESC'],
    'Fundamental I':['STI|FUNDAMENTAL','STI|FUNDAMENTAL-ESC'],
    'Fundamental II':['STI|FUNDAMENTAL','STI|FUNDAMENTAL-ESC'],
    'Ensino Médio':[]
  };
  const STI_BASE={
    'STI|INFANTIL':{name:'STI Educação Infantil',v26:727},
    'STI|INFANTIL-ESC':{name:'STI + Escolaridade Infantil',v26:1164.04},
    'STI|FUNDAMENTAL':{name:'STI Fundamental',v26:737},
    'STI|FUNDAMENTAL-ESC':{name:'STI + Escolaridade Fundamental',v26:1201.42}
  };
  function source(){try{return (typeof TUITION!=='undefined'?TUITION:(window.TUITION||[]))}catch(e){return []}}
  function db(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){return {}}}
  function base(seg){return source().find(r=>r.segmento===seg)}
  function rec(seg){
    const b=base(seg); if(!b)return null;
    const d=db(),s=d.tuition?.[seg];
    if(s?.saved)return {...s,status:'OFICIAL'};
    const rate=(window.state?.tuitionRates?.[seg]??5),annuity=b.due26*(1+rate/100),first=annuity/13;
    return {rate,annuity,first,planA:(annuity-first)/12,planB:(annuity-first)/11,status:'PROJEÇÃO'};
  }
  function stiRows(seg){
    const d=db(), ids=STI_MAP[seg]||[];
    return ids.map(id=>{
      const b=STI_BASE[id], s=d.records?.[id];
      const rate=Number(s?.rate ?? 5), v27=Number(s?.v27)||b.v26*(1+rate/100);
      return {id,name:b.name,v26:b.v26,v27,rate,status:s?.saved?'OFICIAL':'PROJEÇÃO'};
    });
  }
  function future(v,rate,n){return v*Math.pow(1+rate/100,n)}
  function bar(values,labels){
    const max=Math.max(...values,1);
    return `<div class="mp-bars">${values.map((v,i)=>`<div class="mp-bar-col"><b>${money(v)}</b><div class="mp-track"><span class="${i===2?'current':i>2?'projection':''}" style="height:${Math.max(8,v/max*100)}%"></span></div><small>${labels[i]}</small></div>`).join('')}</div>`;
  }
  function planBox(title,kind,first,installments,total){return `<div class="mp-planbox ${kind}"><div class="mp-planhead"><span>${title}</span><small>${kind==='late'?'APÓS VENCIMENTO':'ATÉ VENCIMENTO'}</small></div><div class="mp-entry"><small>Entrada / 1ª parcela</small><b>${money(first)}</b></div><div class="mp-install"><small>Parcelamento</small><b>${installments.qtd} × ${money(installments.valor)}</b></div><div class="mp-contract"><small>Total contratado</small><b>${money(total)}</b></div></div>`}
  function render(){
    const sec=document.getElementById('mensalidades'); if(!sec)return;
    let old=document.getElementById('mensalidadesOriginal');
    if(!old){old=document.createElement('div');old.id='mensalidadesOriginal';while(sec.firstChild)old.appendChild(sec.firstChild);old.style.display='none';sec.appendChild(old)}
    let host=document.getElementById('mensalidadesPortfolio40');if(!host){host=document.createElement('div');host.id='mensalidadesPortfolio40';sec.appendChild(host)}
    const current=host.dataset.seg||'Educação Infantil',b=base(current),r=rec(current);if(!b||!r)return;
    const v25=b.due25,v26=b.due26,v27=Number(r.annuity)||0,rate=Number(r.rate)||0,v28=future(v27,rate,1),v29=future(v27,rate,2),growth26=v26?((v27/v26)-1)*100:0;
    const late27=b.late26*(1+rate/100),first=Number(r.first)||0;
    const aDue=Number(r.planA)||Math.max(0,v27-first)/12,bDue=Number(r.planB)||Math.max(0,v27-first)/11;
    const aLate=Math.max(0,late27-first)/12,bLate=Math.max(0,late27-first)/11;
    const sti=stiRows(current);
    host.dataset.seg=current;
    host.innerHTML=`<div class="mp-head"><div><small>PORTFÓLIO DE MENSALIDADES</small><h2>Mensalidades por segmento</h2><p>Histórico, fechamento oficial 2027, evolução gráfica, condições comerciais e serviços STI relacionados ao segmento selecionado.</p></div><button id="mpOpenClosing">⚙️ Abrir Fechamento 2027</button></div>
      <div class="mp-filter"><label>Segmento<select id="mpSeg">${segs.map(s=>`<option ${s===current?'selected':''}>${s}</option>`).join('')}</select></label><span class="mp-status ${r.status==='OFICIAL'?'official':''}">${r.status}</span></div>
      <div class="mp-kpis"><div><small>Anuidade 2025</small><b>${money(v25)}</b></div><div><small>Anuidade 2026</small><b>${money(v26)}</b></div><div class="focus"><small>Anuidade 2027</small><b>${money(v27)}</b><em>${r.status==='OFICIAL'?'Valor salvo no Fechamento':'Projeção ainda não fechada'}</em></div><div><small>Variação 26→27</small><b>${growth26>=0?'+':''}${pct(growth26)}</b></div></div>
      <section class="mp-card mp-evolution"><div class="mp-section-title"><div><small>EVOLUÇÃO</small><h3>Evolução da anuidade</h3></div><span>2025 → 2029</span></div>${bar([v25,v26,v27,v28,v29],['2025','2026','2027','2028*','2029*'])}<p class="mp-note">* 2028 e 2029 são projeções visuais mantendo a mesma taxa usada em 2027 (${pct(rate)}). Não são valores fechados.</p></section>
      <section class="mp-card"><div class="mp-section-title"><div><small>CONDIÇÕES COMERCIAIS 2027</small><h3>Entrada e parcelamento</h3></div><span>${r.status}</span></div><div class="mp-plans-grid">${planBox('PLANO A','due',first,{qtd:12,valor:aDue},v27)}${planBox('PLANO A','late',first,{qtd:12,valor:aLate},late27)}${planBox('PLANO B','due',first,{qtd:11,valor:bDue},v27)}${planBox('PLANO B','late',first,{qtd:11,valor:bLate},late27)}</div><div class="mp-plan-note"><b>Regra:</b> a entrada/1ª parcela é definida no Fechamento 2027. O saldo restante é dividido em 12 parcelas no Plano A ou 11 parcelas no Plano B.</div></section>
      <div class="mp-grid"><section class="mp-card"><h3>Comparativo — até vencimento</h3><div class="mp-compare"><div><small>2025</small><b>${money(b.due25)}</b></div><div><small>2026</small><b>${money(b.due26)}</b></div><div class="future"><small>2027</small><b>${money(v27)}</b></div></div></section>
      <section class="mp-card"><h3>Comparativo — após vencimento</h3><div class="mp-compare"><div><small>2025</small><b>${money(b.late25)}</b></div><div><small>2026</small><b>${money(b.late26)}</b></div><div class="future"><small>2027</small><b>${money(late27)}</b></div></div></section></div>
      <section class="mp-card mp-sti"><div class="mp-section-title"><div><small>STI / TEMPO INTEGRAL</small><h3>Serviços relacionados ao segmento</h3></div><span>${sti.length?sti.filter(x=>x.status==='OFICIAL').length+'/'+sti.length+' oficiais':'SEM PRODUTO'}</span></div>${sti.length?`<div class="mp-sti-grid">${sti.map(x=>`<div class="mp-sti-item"><div><small>${x.status}</small><h4>${x.name}</h4></div><div class="mp-sti-values"><span>2026 <b>${money(x.v26)}</b></span><span>2027 <b>${money(x.v27)}</b></span><span>Reajuste <b>${pct(x.rate)}</b></span></div></div>`).join('')}</div><div class="mp-plan-note">Os valores 2027 do STI são lidos diretamente do <b>Fechamento 2027</b>. A quantidade é informada na aba <b>Receita</b> para calcular o potencial.</div>`:`<div class="mp-empty">Não há produto STI cadastrado para ${current}.</div>`}</section>
      <div class="mp-reading"><b>Leitura do segmento:</b> ${current} passou de ${money(v25)} em 2025 para ${money(v26)} em 2026. Para 2027, o valor ${r.status==='OFICIAL'?'oficial salvo':'projetado'} é ${money(v27)}, representando ${growth26>=0?'aumento':'redução'} de ${pct(Math.abs(growth26))} sobre 2026.</div>`;
    document.getElementById('mpSeg').onchange=e=>{host.dataset.seg=e.target.value;render()};
    document.getElementById('mpOpenClosing').onclick=()=>{const b=document.querySelector('[data-tab="fechamento2027"]')||document.querySelector('#fechamentoBtn');if(b)b.click();};
  }
  function style(){if(document.getElementById('mp40style'))return;const s=document.createElement('style');s.id='mp40style';s.textContent=`
  #mensalidadesPortfolio40{padding-bottom:28px}.mp-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:18px}.mp-head small{font-weight:900;color:#1872b4;letter-spacing:.08em}.mp-head h2{margin:4px 0 7px;color:#082d55;font-size:30px}.mp-head p{margin:0;color:#60758a;max-width:900px}.mp-head button{border:0;background:#0d4d86;color:white;border-radius:12px;padding:11px 15px;font-weight:900;cursor:pointer}.mp-filter{background:white;border:1px solid #dce7f1;border-radius:16px;padding:14px 16px;display:flex;justify-content:space-between;align-items:end;margin-bottom:14px;box-shadow:0 8px 20px #12385b0c}.mp-filter label{font-size:12px;font-weight:900;color:#526b82;display:grid;gap:6px;min-width:300px}.mp-filter select{padding:11px;border:1px solid #cbd9e7;border-radius:10px;font-weight:800;color:#103c67;background:white}.mp-status{font-size:11px;font-weight:900;padding:7px 10px;border-radius:999px;background:#fff2d9;color:#8a5b00}.mp-status.official{background:#e6f7ed;color:#11713d}.mp-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px}.mp-kpis>div{background:#fff;border:1px solid #e0e8f0;border-radius:16px;padding:15px}.mp-kpis small{display:block;color:#6a7d90;font-weight:800}.mp-kpis b{display:block;font-size:22px;color:#0b3158;margin-top:5px}.mp-kpis .focus{background:#eefaf3;border-color:#a8dfbe}.mp-kpis .focus b{color:#117a45}.mp-kpis em{display:block;font-style:normal;font-size:11px;color:#5c7b69;margin-top:4px}.mp-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}.mp-card{background:white;border:1px solid #dfe8f1;border-radius:18px;padding:18px;box-shadow:0 8px 22px #143b6110;margin-bottom:14px}.mp-card h3{margin:0 0 14px;color:#0c3159}.mp-section-title{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px}.mp-section-title small{font-size:10px;color:#1b79b8;font-weight:900;letter-spacing:.08em}.mp-section-title h3{margin:3px 0 0}.mp-section-title>span{font-size:11px;font-weight:900;color:#60758a;background:#edf3f8;border-radius:999px;padding:6px 9px}.mp-evolution{border-top:4px solid #1a77b9}.mp-bars{height:300px;display:flex;align-items:end;gap:22px;border-bottom:1px solid #dbe5ee;padding:28px 16px 0}.mp-bar-col{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;text-align:center}.mp-bar-col>b{font-size:12px;color:#244b70;margin-bottom:6px}.mp-track{height:220px;display:flex;align-items:flex-end;justify-content:center}.mp-track span{display:block;width:58%;min-width:36px;max-width:72px;background:#6f8ca8;border-radius:10px 10px 0 0}.mp-track span.current{background:linear-gradient(180deg,#21a96d,#117d4c)}.mp-track span.projection{background:repeating-linear-gradient(135deg,#a8bdd0,#a8bdd0 8px,#d1dce6 8px,#d1dce6 16px)}.mp-bar-col small{font-weight:900;color:#5d7184;padding:8px 0}.mp-note{font-size:11px;color:#748697;margin:10px 0 0}.mp-plans-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.mp-planbox{border:1px solid #cfe0ec;border-radius:15px;padding:14px;background:#f9fcff}.mp-planbox.late{background:#fff9ef;border-color:#ecd8a7}.mp-planhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.mp-planhead span{font-weight:900;color:#0f5b94}.mp-planhead small{font-weight:900;font-size:10px;color:#667c90}.mp-entry,.mp-install,.mp-contract{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid #e3ebf2}.mp-entry small,.mp-install small,.mp-contract small{color:#718496;font-weight:800}.mp-entry b,.mp-install b,.mp-contract b{color:#123f69}.mp-install b{font-size:18px;color:#117d4c}.mp-plan-note{margin-top:12px;background:#eef6fd;border-left:4px solid #2598d1;border-radius:10px;padding:11px;color:#4b647a;font-size:12px}.mp-compare{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.mp-compare>div{background:#f6f8fb;border-radius:12px;padding:13px}.mp-compare small{display:block;color:#738699}.mp-compare b{display:block;color:#123b64;margin-top:4px}.mp-compare .future{background:#eefaf3}.mp-compare .future b{color:#127547}.mp-sti{border-top:4px solid #7a54b6}.mp-sti-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.mp-sti-item{border:1px solid #dfd7ee;border-radius:14px;padding:14px;background:#fbf9ff}.mp-sti-item h4{margin:3px 0 11px;color:#3f2b69}.mp-sti-item small{font-weight:900;color:#7759a8}.mp-sti-values{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.mp-sti-values span{background:#fff;border-radius:9px;padding:8px;color:#788798;font-size:11px}.mp-sti-values b{display:block;color:#173b5d;margin-top:3px}.mp-empty{padding:16px;background:#f7f8fb;border-radius:12px;color:#6d7d8c}.mp-reading{background:#eef6fd;border-left:4px solid #279bd3;border-radius:12px;padding:14px;color:#38556f}.mp-reading b{color:#0b3158}@media(max-width:850px){.mp-head{flex-direction:column}.mp-kpis{grid-template-columns:1fr 1fr}.mp-grid,.mp-plans-grid,.mp-sti-grid{grid-template-columns:1fr}.mp-filter{align-items:stretch;gap:10px;flex-direction:column}.mp-filter label{min-width:0}.mp-bars{gap:7px;height:250px}.mp-track{height:175px}.mp-bar-col>b{font-size:9px}.mp-track span{width:70%}.mp-sti-values{grid-template-columns:1fr}}`;
  document.head.appendChild(s)}
  function init(){style();render();document.addEventListener('click',e=>{if(e.target.closest('[data-tab="mensalidades"]'))setTimeout(render,60)},true);window.addEventListener('storage',e=>{if(e.key===KEY)render()})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();