(function(){
  function limparDisplayInline(){
    document.querySelectorAll('main > section').forEach(s=>s.style.removeProperty('display'));
  }
  function abrirFechamento(){
    const sec=document.getElementById('fechamento2027');
    const btn=document.querySelector('#nav button[data-tab="fechamento2027"]');
    if(!sec||!btn)return;
    limparDisplayInline();
    document.querySelectorAll('main > section').forEach(s=>s.classList.toggle('active',s===sec));
    document.querySelectorAll('#nav button[data-tab]').forEach(b=>b.classList.toggle('active',b===btn));
    window.scrollTo(0,0);
  }
  document.addEventListener('click',function(e){
    const btn=e.target.closest&&e.target.closest('#nav button[data-tab="fechamento2027"]');
    if(!btn)return;
    abrirFechamento();
  });
  window.addEventListener('hashchange',()=>{if(location.hash==='#fechamento2027')abrirFechamento()});
  window.addEventListener('load',()=>{limparDisplayInline();if(location.hash==='#fechamento2027')setTimeout(abrirFechamento,120)});
})();
