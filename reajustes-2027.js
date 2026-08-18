(function(){
  const STORAGE_KEY='cora2027_fechamento_reajustes_v1';
  const SHEET_URL='https://docs.google.com/spreadsheets/d/1dHrXFN8Gddha5zIoqZou2WfjV7EYbcyHh4-EOFC_qBg/edit';
  const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
  const pct=v=>(Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
  const now=()=>new Date().toLocaleString('pt-BR',{timeZone:'America/Fortaleza'});
  let db={records:{},history:[]};
  try{db=Object.assign(db,JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'));db.records=db.records||{};db.history=db.history||[]}catch(e){}
  function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(db));}

  function monthlyRows(){
    const rows=[];
    (window.TUITION||TUITION||[]).forEach(r=>{
      const defs=[
        ['Anuidade','Até vencimento',r.due26],['Anuidade','Após vencimento',r.late26],
        ['Plano A','Até vencimento',r.A26_due],['Plano A','Após vencimento',r.A26_late],
        ['Plano B','Até vencimento',r.B26_due],['Plano B','Após vencimento',r.B26_late]
      ];
      defs.forEach(d=>rows.push({cat:'Mensalidades',id:`M|${r.segmento}|${d[0]}|${d[1]}`,segment:r.segmento,item:d[0],detail:d[1],v26:Number(d[2])||0,defaultRate:(state?.tuitionRates?.[r.segmento]??5)}));
    });
    return rows;
  }
  function materialRows(){return (window.MATERIALS||MATERIALS||[]).map(r=>({cat:'Materiais / Livros',id:`L|${r.segment}|${r.name}`,segment:r.segment,item:r.name,detail:(r.series||[]).join(', '),v26:Number(r.v26)||0,defaultRate:(state?.materialRates?.[r.segment]??5)}));}
  function uniformRows(){return (window.UNIFORMS||UNIFORMS||[]).map((r,i)=>({cat:'Fardamento',id:`F|${i}|${r.segment}|${r.name}`,segment:r.segment,item:r.name,detail:r.scope==='optional'?'Opcional':r.scope==='infivv'?'Infantil IV/V':'Segmento',v26:Number(r.v26)||0,defaultRate:(state?.uniformRates?.[r.segment==='Todos'?'Todos':r.segment]??5)}));}
  function allRows(){return [...monthlyRows(),...materialRows(),...uniformRows()];}
  function rec(row){const s=db.records[row.id];return s||{rate:row.defaultRate,v27:row.v26*(1+row.defaultRate/100),saved:false,savedAt:''};}
  function saveRow(row,rate,v27){
    rate=Number(rate)||0;v27=Number(v27)||0;
    db.records[row.id]={rate,v27,saved:true,savedAt:now(),category:row.cat,segment:row.segment,item:row.item,detail:row.detail,v26:row.v26};
    db.history.unshift({at:db.records[row.id].savedAt,...db.records[row.id]});
    if(db.history.length>500)db.history=db.history.slice(0,500);
    persist();
  }
  function saveCategory(cat){
    document.querySelectorAll(`tr[data-cat="${CSS.escape(cat)}"]`).forEach(tr=>{
      const row=allRows().find(x=>x.id===tr.dataset.id);if(!row)return;
      const rate=tr.querySelector('.adj-rate').value;const v27=tr.querySelector('.adj-v27').value;
      saveRow(row,rate,v27);
    });
    render();
  }
  function tableHTML(rows,cat){
    return `<div class="adj-table-wrap"><table class="adj-table"><thead><tr><th>Segmento</th><th>Item</th><th>Detalhe</th><th>2026</th><th>Reajuste %</th><th>Valor 2027</th><th>Status</th><th>Ação</th></tr></thead><tbody>${rows.map(row=>{
      const r=rec(row);return `<tr data-cat="${cat}" data-id="${row.id}"><td>${row.segment}</td><td><b>${row.item}</b></td><td>${row.detail}</td><td>${money(row.v26)}</td><td><input class="adj-rate" type="number" step="0.01" value="${Number(r.rate).toFixed(2)}"></td><td><input class="adj-v27" type="number" step="0.01" value="${Number(r.v27).toFixed(2)}"></td><td><span class="adj-status ${r.saved?'ok':'pending'}">${r.saved?'SALVO':'PENDENTE'}</span>${r.savedAt?`<small>${r.savedAt}</small>`:''}</td><td><button class="adj-save-row">💾 Salvar</button></td></tr>`}).join('')}</tbody></table></div>`;
  }
  function summary(){const rows=allRows(),saved=rows.filter(r=>db.records[r.id]?.saved).length;return {total:rows.length,saved,pending:rows.length-saved};}
  function render(){
    const sec=document.getElementById('fechamento2027');if(!sec)return;
    const s=summary();
    sec.innerHTML=`<h2 class="title">Fechamento oficial de valores 2027</h2><p class="lead">Use esta área para transformar as projeções em valores realmente aprovados. Cada linha pode ser salva individualmente e fica registrada com data e hora.</p>
    <div class="adj-kpis"><div><small>Itens totais</small><b>${s.total}</b></div><div><small>Salvos</small><b>${s.saved}</b></div><div><small>Pendentes</small><b>${s.pending}</b></div></div>
    <div class="adj-actions"><a href="${SHEET_URL}" target="_blank" rel="noopener" class="adj-main">📊 Abrir planilha oficial</a><button id="adjExport">⬇️ Baixar planilha CSV</button><button id="adjSaveAll">💾 Salvar tudo</button></div>
    <div class="adj-note"><b>Importante:</b> a aba de simulação continua servindo para testar percentuais. Aqui ficam os valores fechados de 2027, com histórico de salvamento.</div>
    <div class="adj-block"><div class="adj-head"><h3>💳 Mensalidades</h3><button data-save-cat="Mensalidades">Salvar mensalidades</button></div>${tableHTML(monthlyRows(),'Mensalidades')}</div>
    <div class="adj-block"><div class="adj-head"><h3>📚 Materiais / Livros</h3><button data-save-cat="Materiais / Livros">Salvar materiais</button></div>${tableHTML(materialRows(),'Materiais / Livros')}</div>
    <div class="adj-block"><div class="adj-head"><h3>👕 Fardamento</h3><button data-save-cat="Fardamento">Salvar fardamento</button></div>${tableHTML(uniformRows(),'Fardamento')}</div>
    <div class="adj-block"><h3>🕘 Histórico recente</h3><div class="adj-history">${db.history.length?db.history.slice(0,20).map(h=>`<div><b>${h.category}</b> — ${h.segment} / ${h.item}<span>${money(h.v26)} → ${money(h.v27)} (${pct(h.rate)})</span><small>${h.at}</small></div>`).join(''):'<p>Nenhum reajuste salvo ainda.</p>'}</div></div>`;
    bind();
  }
  function bind(){
    document.querySelectorAll('.adj-rate').forEach(inp=>inp.addEventListener('input',e=>{const tr=e.target.closest('tr'),row=allRows().find(x=>x.id===tr.dataset.id);const rate=Number(e.target.value)||0;tr.querySelector('.adj-v27').value=(row.v26*(1+rate/100)).toFixed(2);tr.querySelector('.adj-status').textContent='ALTERADO';tr.querySelector('.adj-status').className='adj-status changed';}));
    document.querySelectorAll('.adj-v27').forEach(inp=>inp.addEventListener('input',e=>{const tr=e.target.closest('tr'),row=allRows().find(x=>x.id===tr.dataset.id);const v=Number(e.target.value)||0;tr.querySelector('.adj-rate').value=((v/row.v26-1)*100).toFixed(2);tr.querySelector('.adj-status').textContent='ALTERADO';tr.querySelector('.adj-status').className='adj-status changed';}));
    document.querySelectorAll('.adj-save-row').forEach(btn=>btn.onclick=()=>{const tr=btn.closest('tr'),row=allRows().find(x=>x.id===tr.dataset.id);saveRow(row,tr.querySelector('.adj-rate').value,tr.querySelector('.adj-v27').value);render();});
    document.querySelectorAll('[data-save-cat]').forEach(btn=>btn.onclick=()=>saveCategory(btn.dataset.saveCat));
    document.getElementById('adjSaveAll').onclick=()=>{document.querySelectorAll('.adj-save-row').forEach(b=>{const tr=b.closest('tr'),row=allRows().find(x=>x.id===tr.dataset.id);saveRow(row,tr.querySelector('.adj-rate').value,tr.querySelector('.adj-v27').value)});render();};
    document.getElementById('adjExport').onclick=exportCSV;
  }
  function exportCSV(){
    const lines=[['Categoria','Segmento','Item','Detalhe','Valor 2026','Reajuste %','Valor 2027','Status','Salvo em']];
    allRows().forEach(row=>{const r=rec(row);lines.push([row.cat,row.segment,row.item,row.detail,row.v26,r.rate,r.v27,r.saved?'SALVO':'PENDENTE',r.savedAt||''])});
    const csv='\ufeff'+lines.map(cols=>cols.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Cora-2027-Reajustes.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  }
  function inject(){
    if(document.getElementById('fechamento2027'))return;
    const nav=document.getElementById('nav');const main=document.querySelector('main');if(!nav||!main)return;
    const b=document.createElement('button');b.dataset.tab='fechamento2027';b.textContent='💾 Fechamento 2027';nav.appendChild(b);
    const sec=document.createElement('section');sec.id='fechamento2027';main.appendChild(sec);
    b.addEventListener('click',()=>{document.querySelectorAll('main section').forEach(s=>s.classList.toggle('active',s.id==='fechamento2027'));document.querySelectorAll('#nav button[data-tab]').forEach(x=>x.classList.toggle('active',x===b));window.scrollTo(0,0);render();});
    const style=document.createElement('style');style.textContent=`
      .adj-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}.adj-kpis>div{background:#fff;border:1px solid #d9e5f2;border-radius:16px;padding:16px}.adj-kpis small{display:block;color:#6d7f92}.adj-kpis b{font-size:28px;color:#0d315c}.adj-actions{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}.adj-actions a,.adj-actions button,.adj-head button,.adj-save-row{border:0;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer;background:#0f5ea8;color:#fff;text-decoration:none}.adj-actions .adj-main{background:#1b8f4d}.adj-note{background:#eef7ff;border-left:4px solid #1aa7e1;padding:14px;border-radius:10px;margin-bottom:18px;color:#35546f}.adj-block{background:#fff;border:1px solid #dae5ef;border-radius:18px;padding:16px;margin:16px 0;box-shadow:0 7px 20px rgba(16,52,87,.06)}.adj-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.adj-table-wrap{overflow:auto}.adj-table{border-collapse:collapse;width:100%;min-width:1040px}.adj-table th{background:#0d315c;color:#fff;padding:9px;text-align:left;position:sticky;top:0}.adj-table td{border-bottom:1px solid #e4ebf2;padding:8px;vertical-align:middle}.adj-table input{width:110px;padding:8px;border:1px solid #c7d6e6;border-radius:8px}.adj-status{display:inline-block;padding:5px 8px;border-radius:999px;font-size:11px;font-weight:900}.adj-status.ok{background:#e3f6ea;color:#16803a}.adj-status.pending{background:#fff0d5;color:#a46500}.adj-status.changed{background:#eaf2ff;color:#17579e}.adj-table td small{display:block;color:#7b8b9a;font-size:10px;margin-top:3px}.adj-history>div{display:grid;grid-template-columns:1.2fr 1fr auto;gap:8px;padding:9px 0;border-bottom:1px solid #edf1f5}.adj-history span{font-weight:700;color:#35546f}.adj-history small{color:#7b8b9a}@media(max-width:700px){.adj-kpis{grid-template-columns:1fr}.adj-head{align-items:flex-start;flex-direction:column}.adj-history>div{grid-template-columns:1fr}}
    `;document.head.appendChild(style);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{inject();render()});else{inject();render()}
})();