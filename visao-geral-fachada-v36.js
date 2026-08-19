(function(){
  const IMG='https://raw.githubusercontent.com/diegofreitas09/cora-familia/main/fachada-cora-familia.jpg';
  function install(){
    const sec=document.getElementById('inicio');
    if(!sec||document.getElementById('fachadaGestao2027'))return;
    const hero=sec.querySelector('.hero');
    const box=document.createElement('div');
    box.id='fachadaGestao2027';
    box.className='fachada-gestao-card';
    box.innerHTML=`<img src="${IMG}" alt="Fachada do Colégio Cora Coralina" loading="eager"><div class="fachada-gestao-overlay"><span>COLÉGIO CORA CORALINA</span><strong>42 anos de História.</strong><small>O próximo capítulo começa agora.</small></div>`;
    if(hero)hero.insertAdjacentElement('afterend',box);else sec.prepend(box);
  }
  function style(){
    if(document.getElementById('fachada-gestao-style'))return;
    const s=document.createElement('style');
    s.id='fachada-gestao-style';
    s.textContent=`
      .fachada-gestao-card{position:relative;margin:18px 0 22px;border-radius:22px;overflow:hidden;min-height:310px;box-shadow:0 14px 34px rgba(7,31,61,.18);background:#dce8f4}
      .fachada-gestao-card img{display:block;width:100%;height:100%;min-height:310px;max-height:460px;object-fit:cover;object-position:center}
      .fachada-gestao-overlay{position:absolute;left:0;right:0;bottom:0;padding:54px 24px 22px;color:#fff;background:linear-gradient(180deg,transparent 0%,rgba(3,24,49,.28) 28%,rgba(3,24,49,.92) 100%)}
      .fachada-gestao-overlay span{display:inline-block;font-size:11px;font-weight:900;letter-spacing:.12em;background:rgba(255,255,255,.16);backdrop-filter:blur(5px);padding:7px 10px;border-radius:999px;margin-bottom:8px}
      .fachada-gestao-overlay strong{display:block;font-size:28px;line-height:1.08;margin-bottom:5px;text-shadow:0 2px 8px rgba(0,0,0,.3)}
      .fachada-gestao-overlay small{font-size:15px;font-weight:700;opacity:.96}
      @media(max-width:760px){.fachada-gestao-card,.fachada-gestao-card img{min-height:230px}.fachada-gestao-card img{max-height:320px}.fachada-gestao-overlay{padding:40px 16px 16px}.fachada-gestao-overlay strong{font-size:22px}.fachada-gestao-overlay small{font-size:13px}}
    `;
    document.head.appendChild(s);
  }
  function init(){style();install();new MutationObserver(install).observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();