(function(){
  const FECH_KEY='cora2027_fechamento_reajustes_v2';

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
      if(before!==after){
        localStorage.setItem(FECH_KEY,after);
        return true;
      }
    }catch(e){}
    return false;
  }

  function hardenStorage(){
    if(window.__coraMoneyStorageHardened)return;
    window.__coraMoneyStorageHardened=true;
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      if(key===FECH_KEY){
        try{
          const db=sanitizeDbObject(JSON.parse(String(value)));
          value=JSON.stringify(db);
        }catch(e){}
      }
      return original.call(this,key,value);
    };
  }

  function sanitizeInputs(){
    document.querySelectorAll('.tuition-card').forEach(card=>{
      const first=card.querySelector('.tu-first');
      const ann=card.querySelector('.tu-annuity');
      if(!first||!ann)return;
      const current=Number(first.value)||0;
      const fixed=plausibleMoney(current,Number(ann.value)||0);
      if(fixed!==current){
        first.value=fixed.toFixed(2);
        first.dispatchEvent(new Event('input',{bubbles:true}));
      }
      first.max='5000';
      first.min='0';
      if(first.dataset.moneyGuard!=='1'){
        first.dataset.moneyGuard='1';
        first.addEventListener('change',()=>{
          const v=Number(first.value)||0;
          const a=Number(ann.value)||0;
          if(v>5000 || (a>0&&v>a)){
            const corrected=plausibleMoney(v,a);
            first.value=corrected.toFixed(2);
            first.dispatchEvent(new Event('input',{bubbles:true}));
            alert('Valor da 1ª parcela corrigido. O sistema bloqueou um valor incompatível com a anuidade.');
          }
        });
      }
    });
  }

  function refreshIfRepaired(){
    if(!repairStorage())return;
    setTimeout(()=>{
      try{document.querySelector('#nav button.active')?.click()}catch(e){}
    },80);
  }

  let receitaAtualizando=false;
  let ultimaNuvem=0;

  function receitaVisivel(){
    const sec=document.getElementById('receita');
    return !!(sec&&(sec.classList.contains('active')||sec.offsetParent!==null));
  }

  function travarPrecoNaReceita(){
    ['finTuRate','finMatRate','finUniRate','finStiRate'].forEach(id=>{
      const el=document.getElementById(id);
      if(el){
        el.disabled=true;
        el.title='Valor definido no Fechamento 2027';
      }
    });
  }

  async function atualizarReceitaOficial(forcarNuvem){
    if(receitaAtualizando)return;
    receitaAtualizando=true;
    try{
      repairStorage();
      const agora=Date.now();
      if((forcarNuvem||agora-ultimaNuvem>15000) && window.CoraGestaoSync && typeof window.CoraGestaoSync.hydrateCloud==='function'){
        await window.CoraGestaoSync.hydrateCloud(true);
        ultimaNuvem=Date.now();
        repairStorage();
      }
      if(typeof window.CoraReceitaRefresh==='function')window.CoraReceitaRefresh();
      travarPrecoNaReceita();
    }catch(e){
      console.warn('Receita: falha ao espelhar Fechamento 2027',e);
      try{if(typeof window.CoraReceitaRefresh==='function')window.CoraReceitaRefresh()}catch(_){}
    }finally{
      receitaAtualizando=false;
    }
  }

  function init(){
    applyBrand();
    hardenStorage();
    refreshIfRepaired();
    sanitizeInputs();
    new MutationObserver(()=>{sanitizeInputs();if(receitaVisivel())travarPrecoNaReceita()}).observe(document.body,{childList:true,subtree:true});
    setInterval(()=>{refreshIfRepaired();sanitizeInputs();if(receitaVisivel())atualizarReceitaOficial(false)},5000);
  }

  document.addEventListener('click',e=>{
    const alvo=e.target.closest('button,[data-tab],[data-page],.tab,.navbtn');
    if(!alvo)return;
    const texto=(alvo.textContent||'').toLowerCase();
    const tab=(alvo.getAttribute('data-tab')||alvo.getAttribute('data-page')||'').toLowerCase();
    if(texto.includes('receita')||tab==='receita')setTimeout(()=>atualizarReceitaOficial(true),80);
  },true);

  document.addEventListener('cora:official-values',()=>{
    if(receitaVisivel())setTimeout(()=>atualizarReceitaOficial(false),30);
  });

  window.addEventListener('focus',()=>{
    applyBrand();
    refreshIfRepaired();
    sanitizeInputs();
    if(receitaVisivel())setTimeout(()=>atualizarReceitaOficial(true),80);
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  window.addEventListener('load',()=>{applyBrand();refreshIfRepaired();sanitizeInputs();if(receitaVisivel())atualizarReceitaOficial(true)});
  window.CoraReceitaOficialRefresh=()=>atualizarReceitaOficial(true);
})();