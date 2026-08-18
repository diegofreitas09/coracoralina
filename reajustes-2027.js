(function(){
  const STORAGE_KEY='cora2027_fechamento_reajustes_v2';
  const SHEET_URL='https://docs.google.com/spreadsheets/d/1dHrXFN8Gddha5zIoqZou2WfjV7EYbcyHh4-EOFC_qBg/edit';
  const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
  const pct=v=>(Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
  const now=()=>new Date().toLocaleString('pt-BR',{timeZone:'America/Fortaleza'});
  const n=v=>Number(String(v??'').replace(',','.'))||0;
  let db={tuition:{},records:{},history:[]};
  try{db=Object.assign(db,JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'));db.tuition=db.tuition||{};db.records=db.records||{};db.history=db.history||[]}catch(e){}
  function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(db));}

  function tuitionSegments(){
    return (window.TUITION||TUITION||[]).map(r=>({
      segmento:r.segmento,
      due26:Number(r.due26)||0,
      late26:Number(r.late26)||0,
      defaultRate:(state?.tuitionRates?.[r.segmento]??5),
      pA26:Number(r.A26_due)||0,
      pB26:Number(r.B26_due)||0
    }));
  }
  function tuitionRec(seg){
    const base=tuitionSegments().find(x=>x.segmento===seg);
    const saved=db.tuition[seg];
    if(saved)return saved;
    const rate=base.defaultRate;
    const annuity=base.due26*(1+rate/100);
    const first=Math.round((annuity/13)*100)/100;
    return {rate,annuity,first,planA:(annuity-first)/12,planB:(annuity-first)/11,saved:false,savedAt:''};
  }
  function calcTuition(base,rate,annuity,first){
    rate=n(rate);annuity=n(annuity);first=n(first);
    if(!annuity)annuity=base.due26*(1+rate/100);
    if(base.due26>0)rate=(annuity/base.due26-1)*100;
    const saldo=Math.max(0,annuity-first);
    return {rate,annuity,first,planA:saldo/12,planB:saldo/11};
  }
  function saveTuition(seg,values){
    const base=tuitionSegments().find(x=>x.segmento===seg);if(!base)return;
    const c=calcTuition(base,values.rate,values.annuity,values.first);
    db.tuition[seg]={...c,saved:true,savedAt:now(),base26:base.due26,late26:base.late26};
    db.history.unshift({at:db.tuition[seg].savedAt,category:'Mensalidades',segment:seg,item:'Anuidade + 1ª parcela + Planos A/B',v26:base.due26,v27:c.annuity,rate:c.rate,first:c.first,planA:c.planA,planB:c.planB});
    if(db.history.length>500)db.history=db.history.slice(0,500);
    persist();
  }

  function materialRows(){return (window.MATERIALS||MATERIALS||[]).map(r=>({cat:'Materiais / Livros',id:`L|${r.segment}|${r.name}`,segment:r.segment,item:r.name,detail:(r.series||[]).join(', '),v26:Number(r.v26)||0,defaultRate:(state?.materialRates?.[r.segment]??5)}));}
  function uniformRows(){return (window.UNIFORMS||UNIFORMS||[]).map((r,i)=>({cat:'Fardamento',id:`F|${i}|${r.segment}|${r.name}`,segment:r.segment,item:r.name,detail:r.scope==='optional'?'Opcional':r.scope==='infivv'?'Infantil IV/V':'Segmento',v26:Number(r.v26)||0,defaultRate:(state?.uniformRates?.[r.segment==='Todos'?'Todos':r.segment]??5)}));}
  function itemRows(){return [...materialRows(),...uniformRows()];}
  function rec(row){const s=db.records[row.id];return s||{rate:row.defaultRate,v27:row.v26*(1+row.defaultRate/100),saved:false,savedAt:''};}
  function saveRow(row,rate,v27){
    rate=n(rate);v27=n(v27);
    db.records[row.id]={rate,v27,saved:true,savedAt:now(),category:row.cat,segment:row.segment,item:row.item,detail:row.detail,v26:row.v26};
    db.history.unshift({at:db.records[row.id].savedAt,...db.records[row.id]});
    if(db.history.length>500)db.history=db.history.slice(0,500);
    persist();
  }
  function saveCategory(cat){
    document.querySelectorAll(`tr[data-cat="${CSS.escape(cat)}"]`).forEach(tr=>{
      const row=itemRows().find(x=>x.id===tr.dataset.id);if(!row)return;
      saveRow(row,tr.querySelector('.adj-rate').value,tr.querySelector('.adj-v27').value);
    });
    render();
  }
  function tableHTML(rows,cat){
    return `<div class="adj-table-wrap"><table class="adj-table"><thead><tr><th>Segmento</th><th>Item</th><th>Detalhe</th><th>2026</th><th>Reajuste %</th><th>Valor 2027</th><th>Status</th><th>Ação</th></tr></thead><tbody>${rows.map(row=>{
      const r=rec(row);return `<tr data-cat="${cat}" data-id="${row.id}"><td>${row.segment}</td><td><b>${row.item}</b></td><td>${row.detail}</td><td>${money(row.v26)}</td><td><input class="adj-rate" type="number" step="0.01" value="${Number(r.rate).toFixed(2)}"></td><td><input class="adj-v27" type="number" step="0.01" value="${Number(r.v27).toFixed(2)}"></td><td><span class="adj-status ${r.saved?'ok':'pending'}">${r.saved?'SALVO':'PENDENTE'}</span>${r.savedAt?`<small>${r.savedAt}</small>`:''}</td><td><button class="adj-save-row">💾 Salvar</button></td></tr>`}).join('')}</tbody></table></div>`;
  }

  function tuitionCardsHTML(){
    return `<div class="tuition-grid">${tuitionSegments().map(base=>{
      const r=tuitionRec(base.segmento);
      return `<article class="tuition-card" data-seg="${base.segmento}">
        <div class="tuition-title"><div><small>MENSALIDADE 2027</small><h3>${base.segmento}</h3></div><span class="adj-status ${r.saved?'ok':'pending'}">${r.saved?'SALVO':'PENDENTE'}</span></div>
        <div class="tuition-ref"><div><small>Anuidade 2026 — até venc.</small><b>${money(base.due26)}</b></div><div><small>Anuidade 2026 — após venc.</small><b>${money(base.late26)}</b></div></div>
        <div class="tuition-edit">
          <label>Reajuste 2027 (%)<input class="tu-rate" type="number" step="0.01" value="${Number(r.rate).toFixed(2)}"></label>
          <label>Anuidade 2027<input class="tu-annuity" type="number" step="0.01" value="${Number(r.annuity).toFixed(2)}"></label>
          <label class="first">1ª parcela 2027<input class="tu-first" type="number" step="0.01" value="${Number(r.first).toFixed(2)}"></label>
        </div>
        <div class="planos-2027">
          <div class="plano-box"><span>PLANO A</span><b>1ª parcela + 12 parcelas</b><strong class="tu-plan-a">12 × ${money(r.planA)}</strong><small>Saldo após a 1ª parcela dividido em 12x</small></div>
          <div class="plano-box"><span>PLANO B</span><b>1ª parcela + 11 parcelas</b><strong class="tu-plan-b">11 × ${money(r.planB)}</strong><small>Saldo após a 1ª parcela dividido em 11x</small></div>
        </div>
        <div class="tuition-total"><span>Total contratado</span><b class="tu-total">${money(r.annuity)}</b></div>
        <button class="tu-save">💾 Salvar ${base.segmento}</button>${r.savedAt?`<small class="saved-at">Último salvamento: ${r.savedAt}</small>`:''}
      </article>`;
    }).join('')}</div>`;
  }

  function summary(){
    const total=tuitionSegments().length+itemRows().length;
    const savedTu=tuitionSegments().filter(r=>db.tuition[r.segmento]?.saved).length;
    const savedItems=itemRows().filter(r=>db.records[r.id]?.saved).length;
    const saved=savedTu+savedItems;
    return {total,saved,pending:total-saved};
  }
  function render(){
    const sec=document.getElementById('fechamento2027');if(!sec)return;
    const s=summary();
    sec.innerHTML=`<h2 class="title">Fechamento oficial de valores 2027</h2><p class="lead">Modelo comercial organizado por segmento: defina a anuidade, informe a 1ª parcela e a plataforma calcula automaticamente o saldo do Plano A (12x) e do Plano B (11x).</p>
    <div class="adj-kpis"><div><small>Itens/segmentos</small><b>${s.total}</b></div><div><small>Salvos</small><b>${s.saved}</b></div><div><small>Pendentes</small><b>${s.pending}</b></div></div>
    <div class="adj-actions"><a href="${SHEET_URL}" target="_blank" rel="noopener" class="adj-main">📊 Abrir planilha oficial</a><button id="adjExport">⬇️ Baixar planilha CSV</button><button id="adjSaveAll">💾 Salvar tudo</button></div>
    <div class="adj-note"><b>Mensalidades:</b> o valor total da anuidade é preservado. A 1ª parcela é definida pela gestão e o restante é dividido automaticamente em 12 parcelas no Plano A ou 11 parcelas no Plano B.</div>
    <div class="adj-block monthly-block"><div class="adj-head"><h3>💳 Mensalidades — Anuidade + 1ª parcela + Planos</h3><button id="saveAllTuition">Salvar mensalidades</button></div>${tuitionCardsHTML()}</div>
    <div class="adj-block"><div class="adj-head"><h3>📚 Materiais / Livros</h3><button data-save-cat="Materiais / Livros">Salvar materiais</button></div>${tableHTML(materialRows(),'Materiais / Livros')}</div>
    <div class="adj-block"><div class="adj-head"><h3>👕 Fardamento</h3><button data-save-cat="Fardamento">Salvar fardamento</button></div>${tableHTML(uniformRows(),'Fardamento')}</div>
    <div class="adj-block"><h3>🕘 Histórico recente</h3><div class="adj-history">${db.history.length?db.history.slice(0,24).map(h=>`<div><b>${h.category}</b> — ${h.segment} / ${h.item}<span>${money(h.v26)} → ${money(h.v27)} (${pct(h.rate)})</span><small>${h.at}</small></div>`).join(''):'<p>Nenhum reajuste salvo ainda.</p>'}</div></div>`;
    bind();
  }

  function recalcCard(card,source){
    const seg=card.dataset.seg,base=tuitionSegments().find(x=>x.segmento===seg);if(!base)return;
    const rateEl=card.querySelector('.tu-rate'),annEl=card.querySelector('.tu-annuity'),firstEl=card.querySelector('.tu-first');
    let rate=n(rateEl.value),ann=n(annEl.value),first=n(firstEl.value);
    if(source==='rate'){ann=base.due26*(1+rate/100);annEl.value=ann.toFixed(2)}
    if(source==='annuity'){rate=base.due26?((ann/base.due26)-1)*100:0;rateEl.value=rate.toFixed(2)}
    const c=calcTuition(base,rate,ann,first);
    card.querySelector('.tu-plan-a').textContent='12 × '+money(c.planA);
    card.querySelector('.tu-plan-b').textContent='11 × '+money(c.planB);
    card.querySelector('.tu-total').textContent=money(c.annuity);
    const st=card.querySelector('.adj-status');st.textContent='ALTERADO';st.className='adj-status changed';
  }
  function saveCard(card){
    const seg=card.dataset.seg;
    saveTuition(seg,{rate:card.querySelector('.tu-rate').value,annuity:card.querySelector('.tu-annuity').value,first:card.querySelector('.tu-first').value});
  }
  function bind(){
    document.querySelectorAll('.tuition-card').forEach(card=>{
      card.querySelector('.tu-rate').addEventListener('input',()=>recalcCard(card,'rate'));
      card.querySelector('.tu-annuity').addEventListener('input',()=>recalcCard(card,'annuity'));
      card.querySelector('.tu-first').addEventListener('input',()=>recalcCard(card,'first'));
      card.querySelector('.tu-save').onclick=()=>{saveCard(card);render()};
    });
    document.getElementById('saveAllTuition').onclick=()=>{document.querySelectorAll('.tuition-card').forEach(saveCard);render()};
    document.querySelectorAll('.adj-rate').forEach(inp=>inp.addEventListener('input',e=>{const tr=e.target.closest('tr'),row=itemRows().find(x=>x.id===tr.dataset.id);const rate=n(e.target.value);tr.querySelector('.adj-v27').value=(row.v26*(1+rate/100)).toFixed(2);tr.querySelector('.adj-status').textContent='ALTERADO';tr.querySelector('.adj-status').className='adj-status changed';}));
    document.querySelectorAll('.adj-v27').forEach(inp=>inp.addEventListener('input',e=>{const tr=e.target.closest('tr'),row=itemRows().find(x=>x.id===tr.dataset.id);const v=n(e.target.value);tr.querySelector('.adj-rate').value=((v/row.v26-1)*100).toFixed(2);tr.querySelector('.adj-status').textContent='ALTERADO';tr.querySelector('.adj-status').className='adj-status changed';}));
    document.querySelectorAll('.adj-save-row').forEach(btn=>btn.onclick=()=>{const tr=btn.closest('tr'),row=itemRows().find(x=>x.id===tr.dataset.id);saveRow(row,tr.querySelector('.adj-rate').value,tr.querySelector('.adj-v27').value);render();});
    document.querySelectorAll('[data-save-cat]').forEach(btn=>btn.onclick=()=>saveCategory(btn.dataset.saveCat));
    document.getElementById('adjSaveAll').onclick=()=>{document.querySelectorAll('.tuition-card').forEach(saveCard);document.querySelectorAll('.adj-save-row').forEach(b=>{const tr=b.closest('tr'),row=itemRows().find(x=>x.id===tr.dataset.id);saveRow(row,tr.querySelector('.adj-rate').value,tr.querySelector('.adj-v27').value)});render();};
    document.getElementById('adjExport').onclick=exportCSV;
  }

  function exportCSV(){
    const lines=[['Categoria','Segmento','Item','Detalhe','Valor 2026','Reajuste %','Valor 2027','1ª Parcela','Plano A - 12x','Plano B - 11x','Status','Salvo em']];
    tuitionSegments().forEach(base=>{const r=tuitionRec(base.segmento);lines.push(['Mensalidades',base.segmento,'Anuidade + Planos','Até vencimento',base.due26,r.rate,r.annuity,r.first,r.planA,r.planB,r.saved?'SALVO':'PENDENTE',r.savedAt||''])});
    itemRows().forEach(row=>{const r=rec(row);lines.push([row.cat,row.segment,row.item,row.detail,row.v26,r.rate,r.v27,'','','',r.saved?'SALVO':'PENDENTE',r.savedAt||''])});
    const csv='\ufeff'+lines.map(cols=>cols.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Cora-2027-Fechamento-Valores.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  }

  function inject(){
    if(document.getElementById('fechamento2027'))return;
    const nav=document.getElementById('nav');const main=document.querySelector('main');if(!nav||!main)return;
    const b=document.createElement('button');b.dataset.tab='fechamento2027';b.textContent='💾 Fechamento 2027';nav.appendChild(b);
    const sec=document.createElement('section');sec.id='fechamento2027';main.appendChild(sec);
    b.addEventListener('click',()=>{document.querySelectorAll('main section').forEach(s=>s.classList.toggle('active',s.id==='fechamento2027'));document.querySelectorAll('#nav button[data-tab]').forEach(x=>x.classList.toggle('active',x===b));window.scrollTo(0,0);render();});
    const style=document.createElement('style');style.textContent=`
      .adj-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}.adj-kpis>div{background:#fff;border:1px solid #d9e5f2;border-radius:16px;padding:16px}.adj-kpis small{display:block;color:#6d7f92}.adj-kpis b{font-size:28px;color:#0d315c}.adj-actions{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}.adj-actions a,.adj-actions button,.adj-head button,.adj-save-row,.tu-save{border:0;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer;background:#0f5ea8;color:#fff;text-decoration:none}.adj-actions .adj-main{background:#1b8f4d}.adj-note{background:#eef7ff;border-left:4px solid #1aa7e1;padding:14px;border-radius:10px;margin-bottom:18px;color:#35546f}.adj-block{background:#fff;border:1px solid #dae5ef;border-radius:18px;padding:16px;margin:16px 0;box-shadow:0 7px 20px rgba(16,52,87,.06)}.adj-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.tuition-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:16px}.tuition-card{border:1px solid #d7e4f0;border-radius:18px;overflow:hidden;background:#fbfdff}.tuition-title{background:#0d315c;color:#fff;padding:15px 17px;display:flex;justify-content:space-between;align-items:center;gap:10px}.tuition-title small{font-size:10px;letter-spacing:.08em;color:#bcd7f2}.tuition-title h3{margin:3px 0 0;font-size:21px}.tuition-ref{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#dce7f1;border-bottom:1px solid #dce7f1}.tuition-ref>div{background:#f5f9fd;padding:11px 14px}.tuition-ref small{display:block;color:#6a7e91}.tuition-ref b{display:block;color:#0d315c;font-size:17px;margin-top:3px}.tuition-edit{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px}.tuition-edit label{font-size:12px;font-weight:800;color:#405c75}.tuition-edit label.first{grid-column:1/-1;background:#ecf8ef;padding:10px;border-radius:12px;color:#176c39}.tuition-edit input{display:block;width:100%;box-sizing:border-box;margin-top:5px;padding:10px 11px;border:1px solid #bed1e3;border-radius:9px;font-weight:800;font-size:15px;color:#0d315c;background:#fff}.tuition-edit .first input{border-color:#83c9a0}.planos-2027{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 14px 14px}.plano-box{border:1px solid #cfe0ef;border-radius:13px;padding:12px;background:#fff}.plano-box span{display:inline-block;background:#e7f2ff;color:#0f5ea8;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:900}.plano-box b{display:block;color:#0d315c;margin:8px 0 4px}.plano-box strong{display:block;color:#14864b;font-size:19px}.plano-box small{display:block;color:#788b9c;margin-top:5px;line-height:1.3}.tuition-total{margin:0 14px 12px;padding:10px 12px;border-radius:11px;background:#0f5ea8;color:#fff;display:flex;justify-content:space-between;align-items:center}.tuition-total b{font-size:19px}.tu-save{margin:0 14px 10px;width:calc(100% - 28px);background:#17864d}.saved-at{display:block;text-align:center;color:#7a8d9e;margin:0 0 12px}.adj-table-wrap{overflow:auto}.adj-table{border-collapse:collapse;width:100%;min-width:1040px}.adj-table th{background:#0d315c;color:#fff;padding:9px;text-align:left;position:sticky;top:0}.adj-table td{border-bottom:1px solid #e4ebf2;padding:8px;vertical-align:middle}.adj-table input{width:110px;padding:8px;border:1px solid #c7d6e6;border-radius:8px}.adj-status{display:inline-block;padding:5px 8px;border-radius:999px;font-size:11px;font-weight:900}.tuition-title .adj-status{background:#fff}.adj-status.ok{background:#e3f6ea;color:#16803a}.adj-status.pending{background:#fff0d5;color:#a46500}.adj-status.changed{background:#eaf2ff;color:#17579e}.adj-table td small{display:block;color:#7b8b9a;font-size:10px;margin-top:3px}.adj-history>div{display:grid;grid-template-columns:1.2fr 1fr auto;gap:8px;padding:9px 0;border-bottom:1px solid #edf1f5}.adj-history span{font-weight:700;color:#35546f}.adj-history small{color:#7b8b9a}@media(max-width:900px){.tuition-grid{grid-template-columns:1fr}}@media(max-width:700px){.adj-kpis{grid-template-columns:1fr}.adj-head{align-items:flex-start;flex-direction:column}.adj-history>div{grid-template-columns:1fr}.tuition-ref,.tuition-edit,.planos-2027{grid-template-columns:1fr}.tuition-edit label.first{grid-column:auto}}
    `;document.head.appendChild(style);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{inject();render()});else{inject();render()}
})();