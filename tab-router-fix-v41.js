(function(){
  function normalizeSections(activeId){
    document.querySelectorAll('main > section').forEach(sec=>{
      sec.style.removeProperty('display');
      sec.classList.toggle('active',sec.id===activeId);
    });
    document.querySelectorAll('#nav button[data-tab]').forEach(btn=>{
      btn.classList.toggle('active',btn.dataset.tab===activeId);
    });
  }
  function route(id){
    if(!id||!document.getElementById(id))return;
    normalizeSections(id);
    try{
      if(id==='graficos'&&typeof window.renderGraphs==='function')window.renderGraphs();
      if(id==='receita'&&typeof window.renderFinance==='function')window.renderFinance();
      if(id==='alunos'&&typeof window.renderStudents==='function')window.renderStudents();
      if(id==='mensalidades'&&typeof window.renderTuitionPortfolio==='function')window.renderTuitionPortfolio();
      if(id==='materiais'&&typeof window.renderMaterials==='function')window.renderMaterials();
    }catch(e){console.warn('Falha ao atualizar aba',id,e)}
    window.scrollTo(0,0);
  }
  function install(){
    document.querySelectorAll('main > section').forEach(sec=>sec.style.removeProperty('display'));
    const current=document.querySelector('main > section.active');
    if(current)normalizeSections(current.id);
  }
  document.addEventListener('click',function(e){
    const btn=e.target.closest&&e.target.closest('#nav button[data-tab]');
    if(!btn)return;
    const id=btn.dataset.tab;
    if(!id)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    route(id);
  },true);
  const mo=new MutationObserver(()=>{
    const active=[...document.querySelectorAll('main > section.active')];
    if(active.length>1){
      const activeBtn=document.querySelector('#nav button[data-tab].active');
      const keep=activeBtn?.dataset.tab||active[0]?.id;
      if(keep)normalizeSections(keep);
    }
    document.querySelectorAll('main > section:not(.active)').forEach(sec=>{
      if(sec.style.display==='block')sec.style.removeProperty('display');
    });
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{install();mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']})});
  else{install();mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']})}
  window.coraRouteTab=route;
})();
