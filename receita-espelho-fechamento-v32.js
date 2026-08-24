(function(){
  const KEY='cora2027_fechamento_reajustes_v2';
  const ALUNOS_KEY='cora2027_alunos_oficial_v1';
  const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
  const num=v=>Number(v)||0;
  const pct=v=>(Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
  const q=id=>document.getElementById(id);
  function read(key){try{return JSON.parse(localStorage.getItem(key)||'{}')||{}}catch(e){return {}}}
  function db(){return read(KEY)}
  function stateObj(){try{return window.state||{}}catch(e){return {}}}
  function students(){try{return window.STUDENTS||STUDENTS||[]}catch(e){return []}}
  function tuition(){try{return window.TUITION||TUITION||[]}catch(e){return []}}
  function materials(){try{return window.MATERIALS||MATERIALS||[]}catch(e){return []}}
  function uniforms(){try{return window.UNIFORMS||UNIFORMS||[]}catch(e){return []}}
  function sti(){try{return window.STI||STI||[]}catch(e){return []}}
  function matId(i){return 'L|'+i.segment+'|'+i.name}
  function uniId(i,idx){return 'F|'+idx+'|'+i.segment+'|'+i.name}
  function stiId(i,idx){return ['STI|INFANTIL','STI|INFANTIL-ESC','STI|FUNDAMENTAL','STI|FUNDAMENTAL-ESC','STI|FARDA-BLUSA','STI|FARDA-SHORT'][idx]||('STI|'+idx)}
  function tuitionRec(seg){return db().tuition?.[seg]||null}

  function seriesGoal(serie){
    const st=stateObj();
    const direct=num(st.studentGoals?.[serie]);
    if(direct>0)return direct;
    const cloud=read(ALUNOS_KEY),off=num(cloud?.[serie]?.valor);
    if(off>0)return off;
    const row=students().find(r=>r.serie===serie);
    return num(row?.goal)||num(row?.a26);
  }
  function studentQty(seg){return students().filter(r=>r.segmento===seg).reduce((s,r)=>s+seriesGoal(r.serie),0)}
  function matQty(i){return (i.series||[]).reduce((s,se)=>s+seriesGoal(se),0)}
  function uniQty(i,idx){
    try{if(typeof window.uniformQty==='function')return num(window.uniformQty(i,idx))}catch(e){}
    return num(stateObj().uniformQty?.[idx]);
  }
  function stiQty(idx){return num(stateObj().stiQty?.[idx])}

  function materialOfficial(i){const r=db().records?.[matId(i)];const rate=num(stateObj().materialRates?.[i.segment]);return r&&r.saved?num(r.v27):num(i.v26)*(1+rate/100)}
  function uniformOfficial(i,idx){const r=db().records?.[uniId(i,idx)];const rate=num(stateObj().uniformRates?.[i.segment==='Todos'?'Todos':i.segment]);return r&&r.saved?num(r.v27):num(i.v26)*(1+rate/100)}
  function stiOfficial(i,idx){const r=db().records?.[stiId(i,idx)];return r&&r.saved?num(r.v27):num(i.v26)*(1+num(stateObj().stiRate)/100)}
  function tuitionOfficial(seg,status='due'){
    const base=tuition().find(x=>x.segmento===seg);if(!base)return 0;
    const r=tuitionRec(seg);
    if(r&&r.saved){if(status==='due')return num(r.annuity)||num(base.due26);return num(base.late26)*(1+num(r.rate)/100)}
    return (status==='due'?num(base.due26):num(base.late26))*(1+num(stateObj().tuitionRates?.[seg])/100);
  }

  window.tuition2027=(seg,status='due')=>tuitionOfficial(seg,status);
  window.materialPrice2027=i=>materialOfficial(i);
  window.uniformPrice27=i=>{const idx=uniforms().indexOf(i);return uniformOfficial(i,idx)};
  window.stiPotential=()=>sti().reduce((s,i,idx)=>s+stiQty(idx)*stiOfficial(i,idx),0);
  window.tuitionPotential=(seg,year=2027,status=stateObj().tuitionStatus||'due')=>{
    const base=tuition().find(x=>x.segmento===seg);if(!base)return 0;
    const qty=year===2027?studentQty(seg):students().filter(r=>r.segmento===seg).reduce((s,r)=>s+num(r.a26),0);
    return qty*(year===2027?tuitionOfficial(seg,status):(status==='due'?num(base.due26):num(base.late26)));
  };
  window.materialPotential=(seg,year=2027)=>materials().filter(i=>i.segment===seg).reduce((s,i)=>{
    const qty=year===2027?matQty(i):(i.series||[]).reduce((a,se)=>a+num(students().find(r=>r.serie===se)?.a26),0);
    return s+qty*(year===2027?materialOfficial(i):num(i.v26));
  },0);
  window.uniformPotential=()=>uniforms().reduce((s,i,idx)=>s+uniQty(i,idx)*uniformOfficial(i,idx),0);
  window.tuitionTotal27=()=>['Educação Infantil','Fundamental I','Fundamental II','Ensino Médio'].reduce((s,seg)=>s+studentQty(seg)*tuitionOfficial(seg,stateObj().tuitionStatus||'due'),0);
  window.materialTotal27=()=>['Educação Infantil','Fundamental I','Fundamental II','Ensino Médio'].reduce((s,seg)=>s+window.materialPotential(seg,2027),0);
  window.totals=()=>{const tu=window.tuitionTotal27(),mat=window.materialTotal27(),uni=window.uniformPotential(),st=window.stiPotential();return {tu,mat,uni,sti:st,total:tu+mat+uni+st}};

  window.renderFinTuition=function(){
    const seg=q('finTuSeg')?.value||'Educação Infantil',status=q('finTuStatus')?.value||stateObj().tuitionStatus||'due';
    const r=tuitionRec(seg),base=tuition().find(x=>x.segmento===seg);if(!base)return;
    const v27=tuitionOfficial(seg,status),qty=studentQty(seg),gross=qty*v27,rate=r&&r.saved?num(r.rate):num(stateObj().tuitionRates?.[seg]),first=r&&r.saved?num(r.first):0,a=r&&r.saved?num(r.planA):0,b=r&&r.saved?num(r.planB):0;
    const rateEl=q('finTuRate');if(rateEl){rateEl.value=rate;rateEl.disabled=!!(r&&r.saved)}
    const k=q('finTuitionKpis');if(k)k.innerHTML=`<div class="kpi"><small>Alunos 2027</small><b>${qty}</b></div><div class="kpi"><small>Anuidade 2026</small><b>${money(status==='due'?base.due26:base.late26)}</b></div><div class="kpi future"><small>Valor oficial 2027</small><b>${money(v27)}</b></div><div class="kpi future"><small>Reajuste fechado</small><b>${pct(rate)}</b></div><div class="kpi future"><small>Potencial</small><b>${money(gross)}</b></div><div class="kpi"><small>1ª parcela</small><b>${money(first)}</b></div><div class="kpi future"><small>Plano A 12x</small><b>${money(a)}</b></div><div class="kpi future"><small>Plano B 11x</small><b>${money(b)}</b></div>`;
    const note=q('finTuitionNote');if(note)note.innerHTML=`<b>Espelho do Fechamento:</b> ${qty} aluno(s) × ${money(v27)} = <b>${money(gross)}</b>. ${r&&r.saved?'Preço oficial salvo no Fechamento 2027.':'Usando projeção, pois o segmento ainda não foi fechado.'}`;
  };

  window.renderFinMaterials=function(){
    const seg=q('finMatSeg')?.value||'Educação Infantil',rows=materials().filter(i=>i.segment===seg),pot=rows.reduce((s,i)=>s+matQty(i)*materialOfficial(i),0);
    const rate=q('finMatRate');if(rate){rate.disabled=true;rate.value=''}
    const k=q('finMaterialKpis');if(k)k.innerHTML=`<div class="kpi"><small>Alunos 2027</small><b>${studentQty(seg)}</b></div><div class="kpi future"><small>Fonte</small><b>Fechamento 2027</b></div><div class="kpi future"><small>Potencial materiais</small><b>${money(pot)}</b></div>`;
    const list=q('finMaterialList');if(list)list.innerHTML=rows.map(i=>{const qt=matQty(i),v=materialOfficial(i),r=db().records?.[matId(i)];return `<div class="listitem"><b>${i.name}</b><span>Qtde<br><b>${qt}</b></span><span>2026<br><b>${money(i.v26)}</b></span><span class="green">2027 oficial<br><b>${money(v)}</b></span><span class="green">Resultado<br><b>${money(qt*v)}</b></span><span>${r&&r.saved?'SALVO':'PROJEÇÃO'}</span></div>`}).join('');
  };

  window.renderFinUniforms=function(){
    const seg=q('finUniSeg')?.value||'Educação Infantil';const rate=q('finUniRate');if(rate){rate.disabled=true;rate.value=''}
    const rows=uniforms().map((i,idx)=>({i,idx})).filter(x=>seg==='Todos'||x.i.segment===seg||(x.i.segment==='Todos'&&seg==='Todos'));
    const list=q('finUniformList');if(list){list.innerHTML=rows.map(({i,idx})=>{const qt=uniQty(i,idx),v=uniformOfficial(i,idx),r=db().records?.[uniId(i,idx)];return `<div class="listitem"><b>${i.segment==='Todos'?i.name:i.segment+' - '+i.name}</b><span>2026<br><b>${money(i.v26)}</b></span><span>Qtde 2027<br><input type="number" min="0" value="${qt}" data-uqty="${idx}"></span><span class="green">2027 oficial<br><b>${money(v)}</b></span><span class="green">Resultado<br><b>${money(qt*v)}</b></span><span>${r&&r.saved?'SALVO':'PROJEÇÃO'}</span></div>`}).join('');list.querySelectorAll('[data-uqty]').forEach(inp=>inp.addEventListener('change',()=>{const st=stateObj();st.uniformQty=st.uniformQty||{};st.uniformQty[inp.dataset.uqty]=Math.max(0,Number(inp.value)||0);try{window.save?.()}catch(e){}refreshFinance()}))}
    const subtotal=rows.reduce((s,x)=>s+uniQty(x.i,x.idx)*uniformOfficial(x.i,x.idx),0),total=q('finUniformTotal');if(total)total.innerHTML=`<b>Potencial do filtro:</b> ${money(subtotal)}. <span class="subtxt">Preço oficial × quantidade.</span>`;
  };

  window.renderFinSti=function(){
    const rate=q('finStiRate');if(rate){rate.disabled=true;rate.value=''}const list=q('finStiList');if(list){list.innerHTML=sti().map((i,idx)=>{const qt=stiQty(idx),v=stiOfficial(i,idx),r=db().records?.[stiId(i,idx)];return `<div class="listitem"><b>${i.name}</b><span>2026<br><b>${money(i.v26)}</b></span><span>Qtde 2027<br><input type="number" min="0" value="${qt}" data-sqty="${idx}"></span><span class="green">2027 oficial<br><b>${money(v)}</b></span><span class="green">Resultado<br><b>${money(qt*v)}</b></span><span>${r&&r.saved?'SALVO':'PROJEÇÃO'}</span></div>`}).join('');list.querySelectorAll('[data-sqty]').forEach(inp=>inp.addEventListener('change',()=>{const st=stateObj();st.stiQty=st.stiQty||{};st.stiQty[inp.dataset.sqty]=Math.max(0,Number(inp.value)||0);try{window.save?.()}catch(e){}refreshFinance()}))}const total=q('finStiTotal');if(total)total.innerHTML=`<b>Potencial STI / Integral:</b> ${money(window.stiPotential())}. <span class="subtxt">Valores oficiais × quantidades informadas.</span>`;
  };

  window.renderFinOverview=function(){
    const tt=window.totals(),don=q('finCatDonut'),leg=q('finCatLegend'),bars=q('finSegBars'),txt=q('finSummaryText');
    try{if(don&&typeof window.donutSVG==='function')don.innerHTML=window.donutSVG([tt.tu,tt.mat,tt.uni,tt.sti],['Mensalidades','Materiais','Fardamento','STI'],['#17579e','#31aee3','#e58b2f','#7c58b6'],money(tt.total),'potencial bruto')}catch(e){}
    if(leg)leg.innerHTML=`<span>Mensalidades ${money(tt.tu)}</span><span>Materiais ${money(tt.mat)}</span><span>Fardamento ${money(tt.uni)}</span><span>STI ${money(tt.sti)}</span>`;
    try{if(bars&&typeof window.singleSegmentBars==='function')bars.innerHTML=window.singleSegmentBars(['Educação Infantil','Fundamental I','Fundamental II','Ensino Médio'],s=>studentQty(s)*tuitionOfficial(s,stateObj().tuitionStatus||'due'),'money')}catch(e){}
    if(txt)txt.innerHTML=`<b>Receita espelhada:</b> preços do Fechamento 2027 e quantidades oficiais de alunos. Total potencial atual: <b>${money(tt.total)}</b>.`;
  };

  window.renderFinConsolidated=function(){
    const t=window.totals(),goal=['Educação Infantil','Fundamental I','Fundamental II','Ensino Médio'].reduce((s,seg)=>s+studentQty(seg),0),k=q('finConsolidatedKpis');
    if(k)k.innerHTML=`<div class="kpi future"><small>Mensalidades</small><b>${money(t.tu)}</b></div><div class="kpi future"><small>Materiais</small><b>${money(t.mat)}</b></div><div class="kpi future"><small>Fardamento</small><b>${money(t.uni)}</b></div><div class="kpi future"><small>STI / Integral</small><b>${money(t.sti)}</b></div><div class="kpi future"><small>Total potencial bruto</small><b>${money(t.total)}</b></div><div class="kpi"><small>Alunos projetados</small><b>${goal}</b></div><div class="kpi"><small>Ticket anual total/aluno</small><b>${money(goal?t.total/goal:0)}</b></div>`;
    const txt=q('finConsText');if(txt)txt.innerHTML=`Todos os resultados usam <b>preços oficiais salvos no Fechamento 2027</b> multiplicados pelas quantidades oficiais/definidas na Receita.`;
  };

  function safe(fn){try{if(typeof fn==='function')fn()}catch(e){console.warn('Receita:',e)}}
  function refreshFinance(){safe(window.renderFinOverview);safe(window.renderFinTuition);safe(window.renderFinMaterials);safe(window.renderFinUniforms);safe(window.renderFinSti);safe(window.renderFinConsolidated)}
  window.CoraReceitaRefresh=refreshFinance;
  document.addEventListener('click',e=>{const t=e.target.closest('button,[data-page],.tab,.navbtn');if(!t)return;const text=(t.textContent||'').toLowerCase();if(text.includes('receita'))setTimeout(refreshFinance,120)},true);
  document.addEventListener('change',e=>{if(e.target?.id&&/^fin/.test(e.target.id))setTimeout(refreshFinance,20)},true);
  window.addEventListener('storage',e=>{if([KEY,ALUNOS_KEY].includes(e.key))setTimeout(refreshFinance,30)});
  window.addEventListener('focus',()=>setTimeout(refreshFinance,50));
  document.addEventListener('cora:official-values',()=>setTimeout(refreshFinance,20));
  setInterval(()=>{const sec=q('receita');if(sec&&(sec.classList.contains('active')||sec.offsetParent!==null))refreshFinance()},5000);
  setTimeout(refreshFinance,700);
})();
