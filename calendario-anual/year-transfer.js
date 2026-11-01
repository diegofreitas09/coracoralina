/* Gestão do calendário plurianual: importação mensal, datas revisáveis e projetos. */
(() => {
 'use strict';
 const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
 const DAYS=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
 const YEAR_KEY='cora_active_school_year_v1',MONTH_KEY='cora_active_school_month_v1';
 const FLAG_KEY=(y,m)=>'cora_month_import_decision_'+y+'_'+m+'_v1';
 const EVENT_KEY=y=>'cora_calendario_eventos_'+y+'_v1';
 const PLAN_KEY=y=>'cora_planejamento_'+y+'_v1';
 const PROJECT_KEY=y=>'cora_month_projects_'+y+'_v1';
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const stored=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback}catch{return fallback}};
 const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
 const getYear=()=>Math.max(2026,Math.min(2099,Number(localStorage.getItem(YEAR_KEY))||2026));
 const getMonth=()=>{const raw=localStorage.getItem(MONTH_KEY);if(raw===null)return getYear()===new Date().getFullYear()?new Date().getMonth():0;const n=Number(raw);return Number.isInteger(n)&&n>=0&&n<=11?n:0};
 const makeProjects=()=>Array.from({length:12},()=>[]);
 const getProjects=y=>{
   const value=stored(PROJECT_KEY(y),null);
   if(Array.isArray(value)&&value.length===12)return value.map(a=>Array.isArray(a)?a.filter(v=>typeof v==='string'):[]);
   return Number(y)===2026?(window.CORA_OFFICIAL_2026?.projects||makeProjects()).map(x=>Array.isArray(x)?[...x]:[]):makeProjects();
 };
 const saveProjects=(y,p)=>Array.isArray(p)&&p.length===12&&save(PROJECT_KEY(y),p);
 const CoraYears={
   activeYear:getYear(),month:getMonth(),filterVisible:events=>events,
   getProjects,saveProjects,
   setActiveMonth(year,month){if(year!==this.activeYear)return;this.month=month;localStorage.setItem(MONTH_KEY,String(month));}
 };
 window.CoraYears=CoraYears;
 const readEvents=(year,month)=>{
   const records=stored(EVENT_KEY(year),[]);
   const local=Array.isArray(records)?records.filter(e=>e&&String(e.date||'').startsWith(year+'-')):[];
   if(year!==2026)return local.filter(e=>Number(String(e.date).slice(5,7))===month+1);
   const deleted=new Set(stored('cora_official_2026_removed_v1',[]));
   const combined=new Map();
   for(const e of window.CORA_OFFICIAL_2026?.events||[])if(!deleted.has(e.id))combined.set(e.id,e);
   for(const e of local)combined.set(e.id,e);
   return [...combined.values()].filter(e=>Number(String(e.date||'').slice(5,7))===month+1);
 };
 function targetDate(iso,year,type,title){
   const [origin,month,day]=String(iso).split('-').map(Number);
   if(!origin||!month||!day)return null;
   const last=new Date(Date.UTC(year,month,0)).getUTCDate();
   const moving=/carnaval|páscoa|pascoa|corpus christi|cinzas|semana santa|sexta-feira santa|pentecostes/i.test(title||'');
   const fixed=type==='Feriado'&&!moving;
   if(fixed)return {date:fmt(year,month,Math.min(last,day)),rule:'Data fixa',verify:day>last};
   const week=new Date(Date.UTC(origin,month-1,day)).getUTCDay();
   const nth=Math.ceil(day/7);
   const first=new Date(Date.UTC(year,month-1,1)).getUTCDay();
   let calculated=1+(week-first+7)%7+(nth-1)*7;
   if(calculated>last)calculated-=7;
   return {date:fmt(year,month,calculated),rule:moving?'Feriado móvel · confirmar':'Mesmo dia da semana',verify:moving};
 }
 function fmt(y,m,d){return String(y)+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0')}
 function fmtBR(s){const [y,m,d]=String(s).split('-');return d+'/'+m+'/'+y;}
 function identify(e){return String(e.title||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('pt-BR');}
 function sameEvent(a,b){
   return (String(b.originId||'')===String(a.id)&&Number(b.originYear)===Number(a.date?.slice(0,4)))||
    (String(b.date)===String(a.targetDate||a.date)&&identify(b)===identify(a));
 }
 const chooser=document.createElement('dialog');chooser.id='yearCarryDialog';chooser.className='year-carry-dialog';
 document.addEventListener('DOMContentLoaded',()=>{document.body.appendChild(chooser);mount();});
 let openKey='', preview=[], sourceYear=2026, targetYear=2027, targetMonth=0, promptLater=false,changing=false;
 function fillYears(){
   const select=$('schoolYearSelect');if(!select)return;
   const y=Math.max(2026,CoraYears.activeYear);
   const last=Math.max(2035,y+3);
   select.innerHTML=Array.from({length:last-2026+1},(_,i)=>'<option value="'+(2026+i)+'">'+(2026+i)+'</option>').join('');
   select.value=String(y);
   const badge=$('sidebarYearCount');if(badge)badge.textContent=y===2026?'Ano base':'Novo ano';
 }
 function syncYearLayout(){
   const year=CoraYears.activeYear;
   fillYears();
   const title=$('welcomeYear');if(title)title.textContent=year;
   const yearLabel=document.querySelector('.welcome .eyebrow');if(yearLabel)yearLabel.textContent='PLANEJAMENTO · '+year;
   const short=document.querySelector('.sidebar-foot');if(short)short.textContent=year===2026?'Ano base · Dados preservados':'Ano '+year+' · Rascunhos em revisão neste dispositivo';
   const importButton=$('carryMonthManual');if(importButton)importButton.hidden=year<=2026;
   const help=$('yearCarryHelp');if(help)help.textContent=year<=2026?'Ano de referência preservado. Selecione 2027 para iniciar um novo planejamento.':'Reaproveite atividades, projetos e planejamento do mês anterior, com datas revisáveis.';
   const official=$('officialBanner');
   if(official){
    const label=official.querySelector('.official-banner-copy strong');
    const description=official.querySelector('.official-banner-copy span');
    if(label)label.textContent=year===2026?'Calendário escolar oficial integrado':'Referência institucional · calendário de 2026';
    if(description)description.textContent=year===2026?'Consulte o documento original e suas datas.':'O PDF de 2026 é apenas referência. O calendário de '+year+' é independente e pode ser planejado mês a mês.';
   }
 }
 function putProjects(year,month){
   const area=$('yearProjects');if(!area)return;
   const projects=getProjects(year)[month]||[];
   const title=$('yearProjectTitle');if(title)title.textContent='Projetos de '+MONTHS[month]+' de '+year;
   const list=$('yearProjectItems');if(list)list.innerHTML=projects.length?projects.map(n=>'<span class="year-project-chip">'+esc(n)+'</span>').join(''):'<span class="year-project-empty">Nenhum projeto definido para este mês.</span>';
 }
 function mount(){
   syncYearLayout();putProjects(CoraYears.activeYear,CoraYears.month);
   if(CoraYears.activeYear>2026&&!localStorage.getItem(FLAG_KEY(CoraYears.activeYear,CoraYears.month))&&!readEvents(CoraYears.activeYear,CoraYears.month).length)showWizard(CoraYears.activeYear,CoraYears.month,false);
   $('schoolYearSelect')?.addEventListener('change',()=>{
      const newYear=Number($('schoolYearSelect').value);
      if(newYear===CoraYears.activeYear)return;
      chooser.close?.();changing=true;CoraYears.activeYear=newYear;CoraYears.month=0;
      localStorage.setItem(YEAR_KEY,String(newYear));localStorage.setItem(MONTH_KEY,'0');
      syncYearLayout();
      window.dispatchEvent(new CustomEvent('cora-year-changed',{detail:{year:newYear,month:0}}));
      changing=false;
   });
   $('nextSchoolYear')?.addEventListener('click',()=>{
      const next=Math.min(2099,Number($('schoolYearSelect').value)+1);
      fillYears();$('schoolYearSelect').value=String(next);$('schoolYearSelect').dispatchEvent(new Event('change'));
   });
   $('carryMonthManual')?.addEventListener('click',()=>showWizard(CoraYears.activeYear,CoraYears.month,true));
   $('editMonthProjects')?.addEventListener('click',()=>{
      const year=CoraYears.activeYear,month=CoraYears.month;
      const list=getProjects(year);
      const answer=prompt('Projetos de '+MONTHS[month]+' de '+year+' (um por linha):',list[month].join('\n'));
      if(answer===null)return;
      list[month]=answer.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).slice(0,60);
      if(saveProjects(year,list))putProjects(year,month);
   });
   window.addEventListener('cora-month-changed',e=>{
     const month=Number(e.detail?.month),year=Number(e.detail?.year)||CoraYears.activeYear;
     if(year!==CoraYears.activeYear||!Number.isInteger(month))return;
     CoraYears.month=month;localStorage.setItem(MONTH_KEY,String(month));
     putProjects(year,month);
     if(changing||year<=2026||chooser.open)return;
     if(!localStorage.getItem(FLAG_KEY(year,month))&&!readEvents(year,month).length)showWizard(year,month,false);
   });
 }
 function sourceOptions(targetYear,month){
   const years=[];for(let y=targetYear-1;y>=2026;y--){
     if(readEvents(y,month).length||getProjects(y)[month]?.length||stored(PLAN_KEY(y),{})[month])years.push(y);
     if(years.length===4)break;
   }
   if(!years.length)years.push(targetYear-1);
   return years;
 }
 function showWizard(year,month,manual){
   if(year<=2026)return;
   if(chooser.open)chooser.close();
   targetYear=year;targetMonth=month;
   const years=sourceOptions(year,month);sourceYear=years[0];
   openKey=year+'-'+month;
   const caption='Planejar '+MONTHS[month]+' de '+year;
   chooser.innerHTML='<form method="dialog" class="year-carry-head"><div><small>GESTÃO · INICIAR NOVO ANO</small><h2>'+esc(caption)+'</h2><p>Aproveite o mês de outro ano e confira as novas datas antes de importar.</p></div><button type="submit" aria-label="Fechar">✕</button></form>'+
    '<div class="year-carry-body"><div class="year-carry-options"><label>Usar como referência <select id="carrySourceYear">'+years.map(y=>'<option value="'+y+'">'+y+'</option>').join('')+'</select></label><div class="year-carry-policy"><strong>Como as datas são ajustadas?</strong><span>Datas fixas permanecem no mesmo dia; atividades escolares usam o mesmo dia da semana e a mesma posição no mês. Feriados móveis exigem conferência.</span></div></div>'+
    '<div id="carrySummary" class="year-carry-summary"></div><div id="carryPreview" class="year-carry-preview"></div>'+
    '<label class="year-carry-project"><input id="carryProjects" type="checkbox" checked /> Copiar também os projetos do mês</label>'+
    '<label class="year-carry-project"><input id="carryPlanning" type="checkbox" checked /> Reaproveitar planejamento pedagógico, quando existir (revisar datas)</label>'+
    '<p class="year-carry-warning">Os registros importados serão marcados como “Em revisão”. Nada será publicado para professores sem conferência da Gestão.</p></div>'+
    '<div class="year-carry-actions"><button type="button" id="carrySkip" class="btn btn-ghost">Começar mês vazio</button><button type="button" id="carryConfirm" class="btn btn-primary">Importar seleção</button></div>';
   chooser.showModal();
   const renderSource=()=>{sourceYear=Number($('carrySourceYear').value);refreshPreview()};
   $('carrySourceYear').addEventListener('change',renderSource);
   $('carrySkip').addEventListener('click',()=>{localStorage.setItem(FLAG_KEY(year,month),'dismissed');chooser.close();});
   $('carryConfirm').addEventListener('click',importSelection);
   chooser.addEventListener('close',()=>{if(!localStorage.getItem(FLAG_KEY(year,month)))localStorage.setItem(FLAG_KEY(year,month),'dismissed');},{once:true});
   refreshPreview();
 }
 function refreshPreview(){
   preview=readEvents(sourceYear,targetMonth).map(e=>({...e,adjusted:targetDate(e.date,targetYear,e.type,e.title)}));
   const count=preview.length;
   const projects=getProjects(sourceYear)[targetMonth]||[];
   const srcPlan=stored(PLAN_KEY(sourceYear),{})[targetMonth];
   $('carrySummary').textContent=count+' evento(s) encontrados em '+MONTHS[targetMonth]+' de '+sourceYear+'. '+projects.length+' projeto(s) e '+(srcPlan?'um planejamento':'nenhum planejamento')+'.';
   $('carryPreview').innerHTML=count?preview.map((e,i)=>{
     const target=e.adjusted;return '<label class="year-carry-entry"><input type="checkbox" data-carry-check="'+i+'" checked />'+
      '<span class="year-carry-title"><strong>'+esc(e.title)+'</strong><small>'+esc(fmtBR(e.date))+' · '+esc(e.type||'Atividade')+' → <b>'+esc(target?.rule||'Revisar')+'</b></small></span>'+
      '<input aria-label="Nova data de '+esc(e.title)+'" type="date" data-carry-date="'+i+'" value="'+esc(target?.date||'')+'" min="'+targetYear+'-'+String(targetMonth+1).padStart(2,'0')+'-01" max="'+targetYear+'-'+String(targetMonth+1).padStart(2,'0')+'-'+String(new Date(targetYear,targetMonth+1,0).getDate()).padStart(2,'0')+'" />'+
      (target?.verify?'<span class="year-carry-verify">Conferir data</span>':'')+'</label>';
   }).join(''):'<div class="year-carry-empty">Nenhuma atividade encontrada neste mês. Você pode começar do zero ou escolher outra referência.</div>';
 }
 function importSelection(){
   if(!chooser.open||openKey!==targetYear+'-'+targetMonth)return;
   const key=EVENT_KEY(targetYear),prior=stored(key,[]),existing=Array.isArray(prior)?prior:[];
   const next=[...existing];let created=0,duplicates=0,skipped=0;
   for(let i=0;i<preview.length;i++){
     if(!chooser.querySelector('[data-carry-check="'+i+'"]')?.checked)continue;
     const e=preview[i],date=chooser.querySelector('[data-carry-date="'+i+'"]')?.value;
     if(!date||!date.startsWith(fmt(targetYear,targetMonth+1,1).slice(0,7))) {skipped++;continue;}
     const id='carry-'+targetYear+'-'+sourceYear+'-'+String(e.id||i);
     if(next.some(p=>p.id===id||p.originId===e.id&&Number(p.originYear)===sourceYear||p.date===date&&identify(p)===identify(e))){duplicates++;continue;}
     const title=String(e.title||'').replace(new RegExp('\\b'+sourceYear+'\\b','g'),String(targetYear));
     next.push({...e,id,title,date,source:'Planejamento de '+sourceYear,originId:e.id,originYear:sourceYear,
       notes:String(e.notes||'').slice(0,550),status:'Em revisão',needsReview:true,adjusted:undefined});
     created++;
   }
   if(created&&!save(key,next)){alert('Não foi possível salvar. Verifique o armazenamento do navegador.');return;}
   let copiedProjects=0,copiedPlan=false;
   if($('carryProjects')?.checked){
     const oldProjects=getProjects(sourceYear)[targetMonth]||[],dest=getProjects(targetYear);
     if(!dest[targetMonth]?.length&&oldProjects.length){dest[targetMonth]=[...oldProjects];if(saveProjects(targetYear,dest))copiedProjects=oldProjects.length;}
   }
   if($('carryPlanning')?.checked){
     const src=stored(PLAN_KEY(sourceYear),{}),dest=stored(PLAN_KEY(targetYear),{});
     if(src[targetMonth]&&!dest[targetMonth]){
       const plan={...src[targetMonth]};
       if(plan.meetingDate)plan.meetingDate='';
       plan.closing=String(plan.closing||'')+'\nPlanejamento reaproveitado de '+sourceYear+'. Conferir datas, pautas e responsáveis.';
       dest[targetMonth]=plan;
       copiedPlan=save(PLAN_KEY(targetYear),dest);
       window.dispatchEvent(new CustomEvent('cora-planning-copied',{detail:{year:targetYear,month:targetMonth}}));
     }
   }
   localStorage.setItem(FLAG_KEY(targetYear,targetMonth),'imported');
   chooser.close();
   window.dispatchEvent(new CustomEvent('cora-data-changed',{detail:{year:targetYear}}));
   putProjects(targetYear,targetMonth);
   const message=created+' evento(s) importados e marcados para revisão. '+(copiedProjects?copiedProjects+' projeto(s). ':'')+(copiedPlan?'Planejamento reaproveitado. ':'')+(duplicates?duplicates+' já existentes ignorados. ':'')+(skipped?skipped+' data(s) não importadas.':'');
   const alert=$('toast');if(alert){alert.textContent=message;alert.classList.add('visible');setTimeout(()=>alert.classList.remove('visible'),6000);}
 }
 window.CoraYearPlanner={targetDate,readEvents,showWizard,importSelection};
})();
