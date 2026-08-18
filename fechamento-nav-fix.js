(function(){
  function abrirFechamento(){
    const sec=document.getElementById('fechamento2027');
    const btn=document.querySelector('#nav button[data-tab="fechamento2027"]');
    if(!sec||!btn)return;
    document.querySelectorAll('main > section').forEach(s=>s.classList.remove('active'));
    sec.classList.add('active');
    document.querySelectorAll('#nav button[data-tab]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    sec.style.display='block';
    setTimeout(()=>{
      document.querySelectorAll('main > section').forEach(s=>{if(s!==sec)s.classList.remove('active')});
      sec.classList.add('active');
      sec.style.display='block';
      window.scrollTo({top:Math.max(0,sec.offsetTop-120),behavior:'smooth'});
    },30);
  }
  document.addEventListener('click',function(e){
    const btn=e.target.closest&&e.target.closest('#nav button[data-tab="fechamento2027"]');
    if(!btn)return;
    abrirFechamento();
    setTimeout(abrirFechamento,80);
  },true);
  window.addEventListener('hashchange',()=>{if(location.hash==='#fechamento2027')abrirFechamento()});
  window.addEventListener('load',()=>{if(location.hash==='#fechamento2027')setTimeout(abrirFechamento,300)});
})();
