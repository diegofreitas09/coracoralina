(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const KEY='cora_calendar_manage_panel_v1';
  function setManaging(on){
    document.body.classList.toggle('is-managing',on);
    $('manageToggle').setAttribute('aria-expanded',on?'true':'false');
    $('manageToggle').textContent=on?'Fechar ferramentas':'Ferramentas de gestão';
    try{localStorage.setItem(KEY,on?'1':'0');}catch(_){}
    if(!on)window.scrollTo({top:0,behavior:'smooth'});
  }
  function init(){
    let saved=false;try{saved=localStorage.getItem(KEY)==='1';}catch(_){}
    setManaging(saved);
    $('manageToggle').addEventListener('click',()=>setManaging(!document.body.classList.contains('is-managing')));
    $('quickAddEvent').addEventListener('click',()=>$('addEventBtn').click());
    $('quickExportPDF').addEventListener('click',()=>$('exportBtn').click());
    $('openNotifications').addEventListener('click',()=>$('alertsDialog').showModal());
    $('closeAlerts').addEventListener('click',()=>$('alertsDialog').close());
    $('alertsGoogleBtn').addEventListener('click',()=>{
      const year=window.CoraYears?.activeYear||2026;
      if(year===2026){
        $('subscribeOfficialBtn')?.click();
      }else{
        $('exportYearIcsBtn')?.click();
        alert('O arquivo da agenda do ano foi preparado. Importe-o ao Google Agenda e configure os lembretes.');
      }
    });
    window.CoraFocus={openTools(){setManaging(true);},closeTools(){setManaging(false);}};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();