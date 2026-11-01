/* Consulta ao calendário oficial de 2026 — páginas visuais preservadas por mês. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const LABELS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const source=window.CORA_OFFICIAL_2026||{events:[],projects:Array.from({length:12},()=>[])};
  const loaded={};
  let month=0;
  let generation=0;
  function alertUser(message){const toast=$('toast');if(!toast)return;toast.textContent=message;toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),5000);}
  function getMonth(){const active=document.querySelector('#monthNav button.active[data-month]');return active?Number(active.dataset.month):month;}
  function loadPage(page){
    window.CORA_OFFICIAL_PAGE_DATA=window.CORA_OFFICIAL_PAGE_DATA||{};
    if(window.CORA_OFFICIAL_PAGE_DATA[page])return Promise.resolve(window.CORA_OFFICIAL_PAGE_DATA[page]);
    if(loaded[page])return loaded[page];
    loaded[page]=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=`./official-page-${String(page).padStart(2,'0')}.js`;
      script.async=true;
      script.onload=()=>window.CORA_OFFICIAL_PAGE_DATA[page]?resolve(window.CORA_OFFICIAL_PAGE_DATA[page]):reject(new Error('Página indisponível'));
      script.onerror=()=>reject(new Error('Erro ao carregar o calendário oficial'));
      document.head.appendChild(script);
    }).catch(error=>{delete loaded[page];throw error});
    return loaded[page];
  }
  async function viewMonth(m){
    month=m;
    if($('officialCalendarSection').hidden)return;
    const seq=++generation;
    $('officialMonthLabel').textContent=LABELS[month];
    $('officialLoading').hidden=false;
    $('officialMonthImage').hidden=true;
    const projects=source.projects?.[month]||[];
    $('officialProjectList').innerHTML=projects.length?projects.map(item=>`<li>${String(item).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</li>`).join(''):'<li>Conferir projetos no documento original.</li>';
    $('officialEventCount').textContent=(source.events||[]).filter(item=>item.date.slice(5,7)===String(month+1).padStart(2,'0')).length;
    try{
      const uri=await loadPage(month+2);
      if(seq!==generation)return;
      $('officialMonthImage').src=uri;
      $('officialMonthImage').alt=`Calendário escolar oficial: ${LABELS[month]} de 2026`;
      $('officialImageLink').href=uri;
      $('officialMonthImage').hidden=false;
      $('officialLoading').hidden=true;
    }catch(error){if(seq!==generation)return;$('officialLoading').textContent='Não foi possível carregar a imagem. Verifique a conexão.';alertUser(error.message);}
  }
  async function downloadOfficial(){
    const btn=$('downloadOfficialBtn');if(btn.disabled)return;
    btn.disabled=true;
    const original=btn.textContent;
    try{
      const sourcePages=[];
      for(let page=1;page<=14;page++){
        btn.textContent=`Preparando ${page}/14...`;
        const uri=await loadPage(page);
        sourcePages.push({width:1180,height:664,toDataURL(){return uri}});
      }
      if(!window.CoraPDF?.fromCanvases)throw Error('Exportação PDF não disponível');
      const pdf=window.CoraPDF.fromCanvases(sourcePages,{pageWidth:1180,pageHeight:664,title:'Calendario Anual Oficial 2026 - Colegio Cora Coralina'});
      const url=URL.createObjectURL(pdf),a=document.createElement('a');a.href=url;a.download='Calendario_Anual_Oficial_Cora_Coralina_2026.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
      alertUser('Calendário oficial de 2026: 14 páginas prontas para baixar.');
    }catch(error){console.error(error);alertUser('Não foi possível gerar o PDF oficial. Verifique a conexão e tente novamente.');}
    finally{btn.disabled=false;btn.textContent=original;}
  }
  function show(){const panel=$('officialCalendarSection');panel.hidden=false;viewMonth(getMonth());panel.scrollIntoView({block:'start',behavior:'smooth'});}
  $('showOfficialButton')?.addEventListener('click',show);
  $('closeOfficialButton')?.addEventListener('click',()=>{$('officialCalendarSection').hidden=true;$('showOfficialButton')?.scrollIntoView({behavior:'smooth',block:'center'});});
  $('downloadOfficialBtn')?.addEventListener('click',downloadOfficial);
  $('resetOfficialDates')?.addEventListener('click',()=>{if(confirm('Restaurar atividades oficiais anteriormente excluídas? As alterações feitas nos eventos existentes serão preservadas.'))window.dispatchEvent(new Event('cora-restore-official-request'));});
  window.addEventListener('cora-month-changed',event=>{month=event.detail.month;if(!$('officialCalendarSection')?.hidden)viewMonth(month);});
})();