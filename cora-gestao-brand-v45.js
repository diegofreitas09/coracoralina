(function(){
  const FECH_KEY='cora2027_fechamento_reajustes_v2';
  const ALUNOS_KEY='cora2027_alunos_oficial_v1';

  function read(key){try{return JSON.parse(localStorage.getItem(key)||'{}')||{}}catch(e){return {}}}
  function num(v){return Number(v)||0}

  function applyBrand(){
    document.title='Cora Gestão | Matrículas 2027';
    let apple=document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if(!apple){apple=document.createElement('meta');apple.name='apple-mobile-web-app-title';document.head.appendChild(apple)}
    apple.content='Cora Gestão';
    const brand=document.querySelector('header .brand');
    if(brand){
      const small=brand.querySelector('small');
      const strong=brand.querySelector('strong');
      if(small)small.textContent='PLATAFORMA ESTRATÉGICA · MATRÍCULAS 2027';
      if(strong)strong.textContent='CORA GESTÃO';
    }
  }

  function plausibleMoney(v,annuity){
    let n=Number(v)||0;
    const a=Number(annuity)||0;
    if(n<=0)return n;
    if(n>5000 && n/100>0 && (!a || n/100<a)) n=n/100;
    if(a>0 && n>a && n/100<a) n=n/100;
    return Math.round(n*100)/100;
  }

  function sanitizeDbObject(db){
    if(!db||typeof db!=='object')return db;
    if(db.tuition&&typeof db.tuition==='object'){
      Object.values(db.tuition).forEach(r=>{
        if(!r||typeof r!=='object')return;
        const ann=Number(r.annuity)||0;
        r.first=plausibleMoney(r.first,ann);
        r.planA=plausibleMoney(r.planA,ann);
        r.planB=plausibleMoney(r.planB,ann);
        if(Number(r.late26)>20000 && Number(r.late26)/100<20000)r.late26=Number(r.late26)/100;
      });
    }
    return db;
  }

  function repairStorage(){
    try{
      const raw=localStorage.getItem(FECH_KEY);
      if(!raw)return false;
      const db=JSON.parse(raw);
      const before=JSON.stringify(db);
      sanitizeDbObject(db);
      const after=JSON.stringify(db);
      if(before!==after){localStorage.setItem(FECH_KEY,after);return true}
    }catch(e){}
    return false;
  }

  function hardenStorage(){
    if(window.__coraMoneyStorageHardened)return;
    window.__coraMoneyStorageHardened=true;
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      if(key===FECH_KEY){
        try{value=JSON.stringify(sanitizeDbObject(JSON.parse(String(value))))}catch(e){}
      }
      return original.call(this,key,value);
    };
  }

  function sanitizeInputs(){
    document.querySelectorAll('.tuition-card').forEach(card=>{
      const first=card.querySelector('.tu-first'),ann=card.querySelector('.tu-annuity');
      if(!first||!ann)return;
      const current=Number(first.value)||0,fixed=plausibleMoney(current,Number(ann.value)||0);
      if(fixed!==current){first.value=fixed.toFixed(2);first.dispatchEvent(new Event('input',{bubbles:true}))}
      first.max='5000';first.min='0';
      if(first.dataset.guardBound==='1')return;
      first.dataset.guardBound='1';
      first.addEventListener('change',()=>{
        const v=Number(first.value)||0,a=Number(ann.value)||0;
        if(v>5000||(a>0&&v>a)){
          const corrected=plausibleMoney(v,a);
          first.value=corrected.toFixed(2);
          first.dispatchEvent(new Event('input',{bubbles:true}));
          alert('Valor da 1ª parcela corrigido. O sistema bloqueou um valor incompatível com a anuidade.');
        }
      });
    });
  }

  function syncReportOfficialState(){
    repairStorage();
    const db=sanitizeDbObject(read(FECH_KEY));
    const alunos=read(ALUNOS_KEY);
    const st=window.state;
    if(!st)return false;

    st.studentGoals=st.studentGoals||{};
    Object.entries(alunos||{}).forEach(([serie,r])=>{const v=num(r?.valor);if(v>0)st.studentGoals[serie]=Math.round(v)});

    st.tuitionRates=st.tuitionRates||{};
    Object.entries(db.tuition||{}).forEach(([seg,r])=>{if(r?.saved)st.tuitionRates[seg]=num(r.rate)});

    st.materialRates=st.materialRates||{};
    st.uniformRates=st.uniformRates||{};
    let stiRate=null;
    Object.entries(db.records||{}).forEach(([id,r])=>{
      if(!r?.saved)return;
      if(r.category==='Materiais / Livros'&&r.segment)st.materialRates[r.segment]=num(r.rate);
      if(r.category==='Fardamento'&&r.segment)st.uniformRates[r.segment==='Todos'?'Todos':r.segment]=num(r.rate);
      if(r.category==='STI / Tempo Integral'&&stiRate===null)stiRate=num(r.rate);
    });
    if(stiRate!==null)st.stiRate=stiRate;

    try{localStorage.setItem('cora2027_v16_state',JSON.stringify(st))}catch(e){}

    // Faz o gerador antigo do PDF enxergar os planos oficiais já fechados.
    const originalTuple=window.__coraOriginalTuitionTuple||(window.__coraOriginalTuitionTuple=window.tuitionTuple);
    if(typeof originalTuple==='function'){
      window.tuitionTuple=function(seg,status,plan){
        const d=originalTuple(seg,status,plan);
        const r=read(FECH_KEY).tuition?.[seg];
        if(!r?.saved)return d;
        const rate=num(r.rate),factor=1+rate/100;
        const installment=plan==='B'?num(r.planB):num(r.planA);
        if(factor>0&&installment>0)d.p26=installment/factor;
        return d;
      };
    }
    return true;
  }

  async function prepareFullReport(){
    try{
      if(window.CoraGestaoSync?.hydrateCloud)await window.CoraGestaoSync.hydrateCloud(true);
    }catch(e){console.warn('Relatório: falha ao atualizar nuvem',e)}
    syncReportOfficialState();
    try{window.CoraReceitaRefresh?.()}catch(e){}
    document.dispatchEvent(new CustomEvent('cora:official-values'));
  }

  function bindReportGuard(){
    const btn=document.getElementById('pdfDownload');
    if(!btn||btn.dataset.officialGuard==='1')return;
    btn.dataset.officialGuard='1';
    btn.addEventListener('click',async e=>{
      if(btn.dataset.officialReady==='1'){
        btn.dataset.officialReady='0';
        return;
      }
      e.preventDefault();e.stopImmediatePropagation();
      const old=btn.textContent;
      btn.disabled=true;btn.textContent='Atualizando dados oficiais...';
      await prepareFullReport();
      btn.disabled=false;btn.textContent=old;
      btn.dataset.officialReady='1';
      btn.click();
    },true);
  }

  function refreshIfRepaired(){
    if(!repairStorage())return;
    setTimeout(()=>{try{document.querySelector('#nav button.active')?.click()}catch(e){}},80);
  }

  function init(){
    applyBrand();hardenStorage();refreshIfRepaired();sanitizeInputs();syncReportOfficialState();bindReportGuard();
    new MutationObserver(()=>{sanitizeInputs();bindReportGuard()}).observe(document.body,{childList:true,subtree:true});
    setInterval(()=>{refreshIfRepaired();sanitizeInputs();bindReportGuard()},1500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  window.addEventListener('load',()=>{applyBrand();refreshIfRepaired();sanitizeInputs();syncReportOfficialState();bindReportGuard()});
  window.CoraPrepareFullReport=prepareFullReport;
})();