/* Alternância de tema do Calendário Cora, compartilhada entre Gestão e Equipe. */
(() => {
 'use strict';
 const KEY='cora_ui_theme_v1';
 const doc=document.documentElement;
 const media=window.matchMedia?.('(prefers-color-scheme:dark)');
 const saved=()=>{try{const s=localStorage.getItem(KEY);return s==='light'||s==='dark'?s:null}catch{return null}};
 const current=()=>doc.dataset.coraTheme==='dark'?'dark':'light';
 const moon='<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/></svg>';
 const sun='<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2m10-10h-2M4 12H2m17.1-7.1-1.4 1.4M6.3 17.7l-1.4 1.4m14.2 0-1.4-1.4M6.3 6.3 4.9 4.9"/></svg>';
 const markup=()=>'<button type="button" class="cora-theme-toggle" data-cora-theme-toggle aria-label="Alternar entre modo dia e noite" aria-pressed="'+String(current()==='dark')+'" title="'+(current()==='dark'?'Ativar modo dia':'Ativar modo noite')+'"><span class="cora-theme-moon">'+moon+'</span><span class="cora-theme-sun">'+sun+'</span><span class="cora-theme-night-label">Modo noite</span><span class="cora-theme-day-label">Modo dia</span></button>';
 function install(){
   const root=document.querySelector('#coraPortal');
   if(!root)return;
   const slots=[root.querySelector('.cp-manager-actions'),root.querySelector('.cp-head-bottom-actions'),root.querySelector('.cp-login-head')];
   slots.forEach(slot=>{if(slot&&!slot.querySelector('[data-cora-theme-toggle]'))slot.insertAdjacentHTML(slot.classList.contains('cp-manager-actions')?'afterbegin':'beforeend',markup())});
 }
 function apply(theme,persist=false){
  const mode=theme==='dark'?'dark':'light';
  doc.dataset.coraTheme=mode;
  if(persist){try{localStorage.setItem(KEY,mode)}catch{}}
  document.querySelectorAll('[data-cora-theme-toggle]').forEach(btn=>{
    btn.setAttribute('aria-pressed',String(mode==='dark'));
    btn.title=mode==='dark'?'Ativar modo dia':'Ativar modo noite';
  });
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.content=mode==='dark'?'#0b1729':'#102a4c';
 }
 document.addEventListener('click',event=>{
   const target=event.target instanceof Element?event.target.closest('[data-cora-theme-toggle]'):null;
   if(target)apply(current()==='dark'?'light':'dark',true);
 });
 if(media){
  const onSystemChange=()=>{if(!saved())apply(media.matches?'dark':'light')};
  if(media.addEventListener)media.addEventListener('change',onSystemChange);
  else media.addListener?.(onSystemChange);
 }
 document.addEventListener('DOMContentLoaded',()=>{
  install();
  const root=document.querySelector('#coraPortal');
  if(root)new MutationObserver(install).observe(root,{childList:true,subtree:true});
 });
 apply(saved()||(media?.matches?'dark':'light'));
})();