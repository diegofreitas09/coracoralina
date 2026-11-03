/* Cora Coralina · mobile-first application experience. Functions reuse existing controls. */
(function(){
 'use strict';
 const icons={
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
  clipboard:'<rect x="5" y="4" width="14" height="18" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 13h6M9 17h6"/>',
  check:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 9h18m-12 6 2 2 4-4"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  people:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9H3Z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>'
 };
 const svg=function(name){
  return '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(icons[name]||icons.home)+'</svg>';
 };
 const adminShortcuts=[
  ['calendar','calendar','Calendário','Eventos e datas'],
  ['planning','clipboard','Planejamento','Organização anual'],
  ['assess','check','Avaliações','Provas e prazos'],
  ['files','folder','Documentos','Arquivos por mês']
 ];
 const managerNav=[
  ['home','home','Início'],['calendar','calendar','Agenda'],
  ['publications','bell','Publicações'],['team','people','Equipe']
 ];
 const teacherNav=[
  ['resumo','home','Início'],['calendario','calendar','Agenda'],
  ['avaliacoes','check','Avaliações'],['avisos','bell','Avisos'],
  ['entregas','clock','Prazos']
 ];
 const scrollToElement=function(element){
  if(element&&element.getClientRects().length){
   element.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});
  }
 };
 const home=function(){window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});};
 function goAdmin(action){
  const q=function(selector){return document.querySelector(selector)};
  if(action==='home'){home();return}
  if(action==='calendar'){scrollToElement(q('#app .month-area'));return}
  if(action==='planning'){const b=q('#jumpPlanning');if(b)b.click();else scrollToElement(q('#app .studio-shortcuts'));return}
  if(action==='assess'){const b=q('#jumpAssessment');if(b)b.click();return}
  if(action==='files'){scrollToElement(q('#app .files-section'));return}
  if(action==='publications'){
   const panel=q('#cpManagerPanel');
   if(panel&&panel.classList.contains('cp-hidden'))q('#cpTogglePanel')?.click();
   scrollToElement(panel);return;
  }
  if(action==='team'){
   const panel=q('#cpAccountsPanel');
   if(panel&&panel.classList.contains('cp-hidden'))q('#cpAccountsOpen')?.click();
   scrollToElement(panel);
  }
 }
 function goTeacher(action){
  const view=document.querySelector('#cpView');
  if(!view)return;
  if(view.querySelector('#cpBackFromBell'))view.querySelector('#cpBackFromBell').click();
  const tab=view.querySelector('[data-cp-tab="'+action+'"]');
  if(tab){tab.click();home();}
 }
 function createDock(kind,items,handler){
  const nav=document.createElement('nav');
  nav.className='cora-app-dock cora-app-dock-'+kind;
  nav.setAttribute('aria-label',kind==='gestao'?'Navegação da Gestão':'Navegação da Equipe Pedagógica');
  nav.innerHTML=items.map(function(item,i){
   return '<button type="button" class="cora-dock-button'+(i===0?' is-active':'')+'" data-cora-dock="'+item[0]+'" aria-label="'+item[2]+'"'+(i===0?' aria-current="page"':'')+'>'+
    svg(item[1])+'<span>'+item[2]+'</span></button>';
  }).join('');
  nav.addEventListener('click',function(event){
   const button=event.target.closest('[data-cora-dock]');
   if(!button)return;
   handler(button.dataset.coraDock);
   if(kind==='gestao')setActive(nav,button.dataset.coraDock);
  });
  return nav;
 }
 function setActive(nav,selection){
  nav.querySelectorAll('[data-cora-dock]').forEach(function(b){
   const active=b.dataset.coraDock===selection;
   if(b.classList.contains('is-active')!==active)b.classList.toggle('is-active',active);
   if(active){if(b.getAttribute('aria-current')!=='page')b.setAttribute('aria-current','page')}
   else if(b.hasAttribute('aria-current'))b.removeAttribute('aria-current');
  });
 }
 function mountAdmin(){
  const main=document.querySelector('#app .content');
  const hero=main?.querySelector('.welcome');
  if(!hero)return;
  if(!main.querySelector('.cora-app-shortcuts')){
   const block=document.createElement('section');
   block.className='cora-app-shortcuts';
   block.setAttribute('aria-label','Acesso rápido às ferramentas da Gestão');
   block.innerHTML='<div class="cora-app-section-title"><div><small>PAINEL DE TRABALHO</small><h2>Acesso rápido</h2></div><span>Suas principais ferramentas</span></div>'+
    '<div class="cora-app-shortcut-grid">'+adminShortcuts.map(function(item){
      return '<button type="button" class="cora-app-shortcut" data-cora-go="'+item[0]+'">'+
       '<span class="cora-app-shortcut-icon">'+svg(item[1])+'</span>'+
       '<strong>'+item[2]+'</strong><small>'+item[3]+'</small></button>';
    }).join('')+'</div>';
   block.addEventListener('click',function(event){
    const button=event.target.closest('[data-cora-go]');
    if(button)goAdmin(button.dataset.coraGo);
   });
   hero.insertAdjacentElement('afterend',block);
  }
  if(!hero.querySelector('.cora-hero-intro')){
   const intro=document.createElement('div');
   intro.className='cora-hero-intro';
   intro.innerHTML='<strong>Olá, Gestão!</strong><span>O que vamos organizar hoje?</span>';
   hero.insertBefore(intro,hero.firstChild);
  }
  if(!document.querySelector('.cora-app-dock-gestao')){
   const dock=createDock('gestao',managerNav,goAdmin);
   document.body.appendChild(dock);
  }
 }
 function mountTeam(){
  const root=document.querySelector('.cp-team');
  if(!root)return;
  let dock=root.querySelector('.cora-app-dock-equipe');
  if(!dock){
   dock=createDock('equipe',teacherNav,goTeacher);
   root.appendChild(dock);
  }
  const active=document.querySelector('#cpView .cp-tabs button.active');
  const tab= document.querySelector('#cpBackFromBell')?'avisos':(active?.dataset.cpTab||'resumo');
  setActive(dock,tab);
 }
 function mount(){
  const manager=Boolean(document.querySelector('.cp-manager-bar'));
  const team=Boolean(document.querySelector('.cp-team'));
  document.body.classList.toggle('cora-experience-manager',manager);
  document.body.classList.toggle('cora-experience-team',team);
  if(manager)mountAdmin();
  else document.querySelector('.cora-app-dock-gestao')?.remove();
  if(team)mountTeam();
 }
 let pending=false;
 function schedule(){
  if(pending)return;
  pending=true;
  requestAnimationFrame(function(){pending=false;mount()});
 }
 function start(){
  if(!document.body)return;
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{childList:true,subtree:true});
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();