(function(){
  const IMG='https://raw.githubusercontent.com/diegofreitas09/cora-familia/main/fachada-cora-familia.jpg';

  function organizeStudents(){
    const inicio=document.getElementById('inicio');
    const alunos=document.getElementById('alunos');
    if(!inicio||!alunos)return;

    let resumo=document.getElementById('alunosResumo2027');
    if(!resumo){
      const grid=inicio.querySelector(':scope > .grid');
      if(grid){
        resumo=document.createElement('div');
        resumo.id='alunosResumo2027';
        resumo.className='alunos-resumo-geral';
        resumo.innerHTML='<div class="alunos-resumo-title"><small>RESUMO GERAL</small><h3>Alunos — base, crescimento e planejamento</h3></div>';
        resumo.appendChild(grid);

        const lead=alunos.querySelector('.lead');
        if(lead)lead.insertAdjacentElement('afterend',resumo);
        else alunos.prepend(resumo);
      }
    }

    const audit=[...inicio.querySelectorAll(':scope > .note')].find(el=>(el.textContent||'').includes('Auditoria da base'));
    if(audit){
      audit.classList.add('alunos-auditoria-movida');
      if(resumo)resumo.insertAdjacentElement('afterend',audit);
      else alunos.prepend(audit);
    }
  }

  function installFacade(){
    const sec=document.getElementById('inicio');
    if(!sec)return;
    let box=document.getElementById('fachadaGestao2027');
    if(!box){
      box=document.createElement('div');
      box.id='fachadaGestao2027';
      box.className='fachada-gestao-card';
      box.innerHTML=`<img src="${IMG}" alt="Fachada do Colégio Cora Coralina" loading="eager"><div class="fachada-gestao-overlay"><span>COLÉGIO CORA CORALINA</span><strong>42 anos de História.</strong><small>O próximo capítulo começa agora.</small></div>`;
    }
    const hero=sec.querySelector('.hero');
    if(hero&&box.previousElementSibling!==hero)hero.insertAdjacentElement('afterend',box);
    else if(!box.isConnected)sec.prepend(box);
  }

  function style(){
    if(document.getElementById('fachada-gestao-style'))return;
    const s=document.createElement('style');
    s.id='fachada-gestao-style';
    s.textContent=`
      .fachada-gestao-card{position:relative;margin:18px 0 22px;border-radius:22px;overflow:hidden;height:440px;box-shadow:0 14px 34px rgba(7,31,61,.18);background:#dce8f4}
      .fachada-gestao-card img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 52%}
      .fachada-gestao-overlay{position:absolute;left:0;right:0;bottom:0;padding:72px 26px 24px;color:#fff;background:linear-gradient(180deg,transparent 0%,rgba(3,24,49,.24) 30%,rgba(3,24,49,.94) 100%)}
      .fachada-gestao-overlay span{display:inline-block;font-size:11px;font-weight:900;letter-spacing:.12em;background:rgba(255,255,255,.16);backdrop-filter:blur(5px);padding:7px 10px;border-radius:999px;margin-bottom:8px}
      .fachada-gestao-overlay strong{display:block;font-size:30px;line-height:1.08;margin-bottom:5px;text-shadow:0 2px 8px rgba(0,0,0,.3)}
      .fachada-gestao-overlay small{font-size:15px;font-weight:700;opacity:.96}
      .alunos-resumo-geral{margin:14px 0 16px;padding:16px;border:1px solid #d7e4ef;border-radius:16px;background:#f8fbfe}
      .alunos-resumo-title{margin-bottom:10px}.alunos-resumo-title small{font-size:10px;font-weight:900;letter-spacing:.08em;color:#63809a}.alunos-resumo-title h3{margin:3px 0 0;color:#0d3c69;font-size:18px}
      .alunos-resumo-geral>.grid{margin:0}.alunos-auditoria-movida{margin-top:0!important;margin-bottom:16px!important}
      @media(max-width:760px){.fachada-gestao-card{height:300px}.fachada-gestao-overlay{padding:50px 16px 16px}.fachada-gestao-overlay strong{font-size:22px}.fachada-gestao-overlay small{font-size:13px}}
    `;
    document.head.appendChild(s);
  }

  function apply(){style();organizeStudents();installFacade()}
  function init(){apply();new MutationObserver(()=>apply()).observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();