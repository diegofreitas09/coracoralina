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
   activeYear:getYear(),month:getMonth(),filterVisible:events=>window.CoraCalendarIntegrity?.filterEvents?.(events)||events,
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

 // Sugestões anuais: conserva cadastros existentes; novas datas exigem validação.
 const managedAssessmentEvent=e=>/^cora-(?:entrega-avaliacoes|periodo-avaliacao|simulado-sae)-/.test(String(e?.id||''));
 const managedHolidayEvent=e=>String(e?.type||'').toLowerCase()==='feriado'||e?.holidayManaged===true;
 const suggestedDate=(value,from,to,title='Atividade escolar')=>String(value||'').startsWith(from+'-')?(targetDate(value,to,'Pedagógico',title)?.date||''):'';
 function suggestedRange(start,end,from,to,title){
   const moved=suggestedDate(start,from,to,title);
   const span=Math.round((Date.parse(end+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/86400000);
   if(!moved||!Number.isFinite(span)||span<0)return null;
   const shiftedEnd=new Date(Date.parse(moved+'T12:00:00Z')+span*86400000).toISOString().slice(0,10);
   return shiftedEnd.startsWith(to+'-')?{start:moved,end:shiftedEnd}:null;
 }
 function academicPreview(from,to){
   const previous=window.CoraStages?.get?.(from)||[],current=window.CoraStages?.get?.(to)||[];
   const former=window.CoraAssessments?.get?.(from)?.items||[],now=window.CoraAssessments?.get?.(to)?.items||[];
   const ranges=previous.filter((x,i)=>x.start&&x.end&&!current[i]?.start&&!current[i]?.end);
   const deliveries=former.filter((x,i)=>(x.due||x.items?.length)&&!now[i]?.due&&!now[i]?.items?.length&&!now[i]?.deliveryTypes);
   return {stages:ranges.length,assessments:deliveries.length,
     firstStage:ranges[0]?suggestedDate(ranges[0].start,from,to):'',
     firstDue:deliveries[0]?suggestedDate(deliveries[0].due,from,to,'Entrega de avaliações'):''};
 }
 function copyAcademicSuggestions(from,to,{stages=true,assessments=true}={}){
   const result={stages:0,assessments:0,warnings:[]};
   if(!Number.isInteger(from)||!Number.isInteger(to)||from>=to)return {...result,warnings:['Selecione anos válidos.']};
   if(stages&&window.CoraStages){
     const earlier=window.CoraStages.get(from),next=window.CoraStages.get(to);
     for(let i=0;i<4;i++){
       const source=earlier[i],current=next[i];
       if(!source?.start||!source.end||!current||current.start||current.end)continue;
       const start=suggestedDate(source.start,from,to),end=suggestedDate(source.end,from,to);
       if(!start||!end||start>end){result.warnings.push('Revisar etapa '+(i+1)+'.');continue;}
       const previousEnd=next[i-1]?.end||'',followingStart=next[i+1]?.start||'';
       if((previousEnd&&start<=previousEnd)||(followingStart&&end>=followingStart)){
         result.warnings.push('Sugestão da '+(i+1)+'ª etapa não copiada porque conflita com uma etapa já preenchida. Confira as datas na Gestão.');
         continue;
       }
       next[i]={number:i+1,start,end,needsReview:true,originYear:from};result.stages++;
     }
     if(result.stages){
       const saved=window.CoraStages.save(to,next);
       if(!saved.ok){result.warnings.push('Etapas não importadas: '+(saved.message||'períodos incompatíveis'));result.stages=0;}
     }
   }
   if(assessments&&window.CoraAssessments){
     const former=window.CoraAssessments.get(from),target=window.CoraAssessments.get(to);
     for(let i=0;i<4;i++){
       const source=former.items?.[i],current=target.items?.[i];
       if(!source||!current||current.due||current.items?.length||current.deliveryTypes)continue;
       const due=source.due?suggestedDate(source.due,from,to,'Entrega de avaliações'):'';
       const items=[];
       for(const item of source.items||[]){
         const range=suggestedRange(item.start,item.end,from,to,item.title);
         if(!range){result.warnings.push('Revisar avaliação: '+item.title);continue;}
         items.push({title:String(item.title||'').replace(new RegExp('\\b'+from+'\\b','g'),String(to)),...range});
       }
       if(!due&&!items.length)continue;
       target.items[i]={stage:i+1,due,deliveryTypes:source.deliveryTypes||'',items};
       target.source='Sugestão de '+from+' · verificar antes de publicar';result.assessments++;
     }
     if(result.assessments){
       const saved=window.CoraAssessments.save(target);
       if(!saved.ok){result.warnings.push('Entregas não importadas: '+(saved.error||'datas incompatíveis'));result.assessments=0;}
     }
   }
   return result;
 }
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
   const fullYearButton=$('carryWholeYear');if(fullYearButton)fullYearButton.hidden=year<=2026;
   const topImport=$('importYearSuggestions');if(topImport){topImport.hidden=year<=2026;topImport.textContent='↻ Importar '+(year-1)+' → '+year;}
   const help=$('yearCarryHelp');if(help)help.textContent=year<=2026?'Ano de referência preservado. Selecione 2027 para iniciar um novo planejamento.':'Reaproveite atividades, projetos e planejamento do mês anterior, com datas revisáveis.';
   const footer=document.querySelector('main > footer');if(footer){const original=footer.dataset.original||footer.innerHTML;footer.dataset.original=original;footer.innerHTML=original.replace('CALENDÁRIO ANUAL 2026','CALENDÁRIO ANUAL '+year);}
   const originalSection=$('officialCalendarSection');if(year>2026&&originalSection)originalSection.hidden=true;
   const official=$('officialBanner');
   if(official){
    official.hidden=year!==2026;
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
   const fullYearBtn=document.createElement('button');
   fullYearBtn.type='button';fullYearBtn.id='carryWholeYear';fullYearBtn.className='btn btn-dark';
   fullYearBtn.textContent='↻ Importar ano completo';
   $('yearCarryTools')?.appendChild(fullYearBtn);
   fullYearBtn.hidden=CoraYears.activeYear<=2026;
   fullYearBtn.addEventListener('click',()=>showFullYearWizard(CoraYears.activeYear));
   $('importYearSuggestions')?.addEventListener('click',()=>showFullYearWizard(CoraYears.activeYear));
   $('editMonthProjects')?.addEventListener('click',()=>{
      const year=CoraYears.activeYear,month=CoraYears.month;
      const list=getProjects(year);
      const answer=prompt('Projetos de '+MONTHS[month]+' de '+year+' (um por linha):',list[month].join('\n'));
      if(answer===null)return;
      list[month]=answer.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).slice(0,60);
      if(saveProjects(year,list)){putProjects(year,month);window.dispatchEvent(new CustomEvent('cora-projects-changed',{detail:{year,month}}));}
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
    '<label class="year-carry-project"><input id="carryFiles" type="checkbox" checked /> Copiar também os documentos deste mês</label>'+
     '<div class="year-carry-academic"><strong>Sugestões para todo o ano</strong><label><input id="carryStages" type="checkbox" checked /> Início e fim das quatro etapas</label><label><input id="carryAssessments" type="checkbox" checked /> Prazos e períodos das avaliações</label><small>Importa sugestões anuais mesmo ao selecionar só um mês. Não altera dados existentes e exige conferência.</small></div>'+
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
   preview=readEvents(sourceYear,targetMonth).filter(e=>!managedAssessmentEvent(e)&&!managedHolidayEvent(e)).map(e=>({...e,adjusted:targetDate(e.date,targetYear,e.type,e.title)}));
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
 async function importSelection(){
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
   const academic=copyAcademicSuggestions(sourceYear,targetYear,{stages:!!$('carryStages')?.checked,assessments:!!$('carryAssessments')?.checked});
    const docs=$('carryFiles')?.checked?await window.CoraApp?.copyFilesBetweenYears?.(sourceYear,targetYear,[targetMonth]):null;
   chooser.close();
   window.dispatchEvent(new CustomEvent('cora-data-changed',{detail:{year:targetYear}}));
   putProjects(targetYear,targetMonth);
   const message=(docs?.count?docs.count+' arquivo(s) importados. ':'')+(docs?.error?docs.error+' ':'')+created+' evento(s) importados e marcados para revisão. '+(copiedProjects?copiedProjects+' projeto(s). ':'')+(copiedPlan?'Planejamento reaproveitado. ':'')+(duplicates?duplicates+' já existentes ignorados. ':'')+(skipped?skipped+' data(s) não importadas. ':'')+academic.stages+' etapas sugeridas; '+academic.assessments+' cronogramas de avaliações sugeridos. '+academic.warnings.join(' ');
   const alert=$('toast');if(alert){alert.textContent=message;alert.classList.add('visible');setTimeout(()=>alert.classList.remove('visible'),6000);}
 }

 function copyYearMonth(from,to,month,includeProjects,includePlan){
   const events=readEvents(from,month).filter(e=>!managedAssessmentEvent(e)&&!managedHolidayEvent(e)),key=EVENT_KEY(to),existing=stored(key,[]);
   const next=Array.isArray(existing)?[...existing]:[];
   let added=0,duplicates=0;
   for(const event of events){
     const calculated=targetDate(event.date,to,event.type,event.title);
     if(!calculated?.date)continue;
     const id='carry-'+to+'-'+from+'-'+String(event.id||identify(event));
     const duplicate=next.some(p=>p.id===id||(p.originId===event.id&&Number(p.originYear)===from)||
       (p.date===calculated.date&&identify(p)===identify(event)&&p.type===event.type));
     if(duplicate){duplicates++;continue}
     next.push({...event,id,date:calculated.date,
       title:String(event.title||'').replace(new RegExp('\\b'+from+'\\b','g'),String(to)),
       notes:String(event.notes||'').replace(new RegExp('\\b'+from+'\\b','g'),String(to)),
       source:'Importado de '+from,originId:event.id,originYear:from,status:'Em revisão',needsReview:true});
     added++;
   }
   if(added&&!save(key,next))throw Error('Não foi possível salvar os eventos de '+MONTHS[month]);
   let projectCount=0,planCopied=false;
   if(includeProjects){
     const p=getProjects(to),fromProjects=getProjects(from)[month]||[];
     if(!p[month]?.length&&fromProjects.length){p[month]=[...fromProjects];if(saveProjects(to,p))projectCount=fromProjects.length}
   }
   if(includePlan){
     const fromPlans=stored(PLAN_KEY(from),{}),toPlans=stored(PLAN_KEY(to),{});
     if(fromPlans[month]&&!toPlans[month]){
       const plan={...fromPlans[month]};
       // Não levar datas de 2026 textualmente para um novo ano. A lista de eventos é a fonte das datas.
       plan.meetingDate='';
       plan.schedule='';
       plan.projects=(getProjects(to)[month]||[]).join('\n');
       plan.birthdays=''; // Os aniversários são consultados no cadastro recorrente, não no texto do ano-base.
       plan.copiedFromYear=from;plan.needsReview=true;
       toPlans[month]=plan;
       planCopied=save(PLAN_KEY(to),toPlans);
     }
   }
   localStorage.setItem(FLAG_KEY(to,month),'imported');
   return {added,duplicates,projectCount,planCopied};
 }
 function showFullYearWizard(year){
   if(year<=2026)return;
   if(chooser.open)chooser.close();
   const sourceYear=year-1;
   chooser.innerHTML='<form method="dialog" class="year-carry-head"><div><small>GESTÃO · NOVO ANO</small><h2>Importar calendário completo para '+year+'</h2><p>Copiar eventos, projetos e planejamentos para cada mês do novo ano, mantendo '+sourceYear+' intacto.</p></div><button type="submit" aria-label="Fechar">✕</button></form>'+
   '<div class="year-carry-body"><div class="year-carry-options"><label>Ano de origem<select id="fullSource">'+Array.from({length:year-2026},(_,i)=>year-1-i).map(y=>'<option value="'+y+'">'+y+'</option>').join('')+'</select></label><p class="year-carry-policy">Feriados fixos mantêm o dia. Eventos escolares usam a mesma ocorrência do dia da semana; todas as datas importadas precisam de revisão.</p></div>'+
   '<p id="fullSummary" class="year-carry-summary"></p><div id="fullMonths" class="year-full-months"></div>'+
   '<label class="year-carry-project"><input type="checkbox" id="fullProjects" checked /> Incluir todos os projetos mensais</label>'+
   '<label class="year-carry-project"><input type="checkbox" id="fullPlanning" checked /> Incluir os planejamentos pedagógicos</label>'+ 
   '<label class="year-carry-project"><input type="checkbox" id="fullFiles" checked /> Incluir documentos anexados dos meses selecionados</label>'+
    '<div class="year-carry-academic"><strong>Etapas e prazos pedagógicos</strong><label><input type="checkbox" id="fullStages" checked /> Sugerir início e fim das quatro etapas letivas</label><label><input type="checkbox" id="fullAssessments" checked /> Sugerir entregas e avaliações AP2, AD e AR</label><div id="fullAcademicPreview" class="year-carry-academic-preview" aria-live="polite"></div><small>As datas serão rascunhos. Eventos e etapas já preenchidos permanecem intactos.</small></div>'+
   '<p class="year-carry-warning">Atividades já cadastradas não serão apagadas nem duplicadas. Após importar, clique nos eventos para editar a data e salvar.</p></div>'+
   '<div class="year-carry-actions"><button id="fullCancel" type="button" class="btn btn-ghost">Cancelar</button><button id="fullConfirm" type="button" class="btn btn-primary">Importar ano selecionado</button></div>';
   chooser.showModal();
   const refresh=()=>{
     const from=Number($('fullSource').value);
     const suggested=academicPreview(from,year),output=$('fullAcademicPreview');
     if(output)output.textContent=suggested.stages+' etapa(s) e '+suggested.assessments+' cronograma(s) disponíveis.'+(suggested.firstStage?' Primeira etapa sugerida: '+fmtBR(suggested.firstStage)+'.':'')+(suggested.firstDue?' Primeira entrega: '+fmtBR(suggested.firstDue)+'.':'');
     const counts=MONTHS.map((name,month)=>({name,month,n:readEvents(from,month).filter(e=>!managedAssessmentEvent(e)&&!managedHolidayEvent(e)).length,p:getProjects(from)[month]?.length||0}));
     $('fullSummary').textContent=counts.reduce((a,b)=>a+b.n,0)+' eventos e '+counts.reduce((a,b)=>a+b.p,0)+' projetos disponíveis em '+from+'.';
     $('fullMonths').innerHTML=counts.map(c=>'<label><input type="checkbox" data-full-month="'+c.month+'" checked /><strong>'+c.name+'</strong><small>'+c.n+' eventos · '+c.p+' projetos</small></label>').join('');
   };
   $('fullSource').addEventListener('change',refresh);
   $('fullCancel').addEventListener('click',()=>chooser.close());
   $('fullConfirm').addEventListener('click',async()=>{
     const from=Number($('fullSource').value),months=[...chooser.querySelectorAll('[data-full-month]:checked')].map(el=>Number(el.dataset.fullMonth));
     if(!months.length){alert('Selecione pelo menos um mês.');return}
     const stats={added:0,duplicates:0,projectCount:0,plans:0};
     try{
       for(const month of months){
         const result=copyYearMonth(from,year,month,$('fullProjects').checked,$('fullPlanning').checked);
         stats.added+=result.added;stats.duplicates+=result.duplicates;stats.projectCount+=result.projectCount;if(result.planCopied)stats.plans++;
       }
     }catch(e){alert(e.message);return}
     const academic=copyAcademicSuggestions(from,year,{stages:!!$('fullStages')?.checked,assessments:!!$('fullAssessments')?.checked});
      const docs=$('fullFiles').checked?await window.CoraApp?.copyFilesBetweenYears?.(from,year,months):null;
     chooser.close();
     window.dispatchEvent(new CustomEvent('cora-data-changed',{detail:{year,month:CoraYears.month}}));
     window.dispatchEvent(new CustomEvent('cora-projects-changed',{detail:{year,month:CoraYears.month}}));
     window.dispatchEvent(new CustomEvent('cora-planning-copied',{detail:{year,month:CoraYears.month}}));
     putProjects(year,CoraYears.month);
     const msg='Importação concluída: '+stats.added+' atividades, '+stats.projectCount+' projetos, '+stats.plans+' planejamentos, '+academic.stages+' etapas sugeridas, '+academic.assessments+' cronogramas de avaliação e '+(docs?.count||0)+' documentos. '+(docs?.error||'')+' '+stats.duplicates+' eventos anteriores preservados. '+academic.warnings.join(' ')+' Confira as datas antes de publicar.';
     const toast=$('toast');if(toast){toast.textContent=msg;toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),7000)}
   });
   refresh();
 }

 window.CoraYearPlanner={targetDate,readEvents,showWizard,showFullYearWizard,copyYearMonth,importSelection,academicPreview,copyAcademicSuggestions};
})();
