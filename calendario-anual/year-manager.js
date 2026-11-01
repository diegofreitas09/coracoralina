(() => {
  'use strict';
  const YEAR_KEY='cora_active_year_v1';
  const REGISTER='cora_registered_years_v1';
  const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const validYear=y=>Number.isInteger(Number(y))&&Number(y)>=2000&&Number(y)<=2100;
  const stored=(key, fallback)=>{try{const d=JSON.parse(localStorage.getItem(key)||'null');return d===null?fallback:d;}catch{return fallback;}};
  const save=(key,v)=>localStorage.setItem(key,JSON.stringify(v));
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let activeYear=validYear(stored(YEAR_KEY,2026))?Number(stored(YEAR_KEY,2026)):2026;
  let audience='Todos';
  let viewMonth=new Date().getFullYear()===activeYear?new Date().getMonth():0;
  const years=()=>Array.from(new Set([...Array.from({length:Math.max(7,new Date().getFullYear()-2024+4)},(_,i)=>2024+i),...stored(REGISTER,[]),activeYear])).filter(validYear).map(Number).sort((a,b)=>a-b);
  const eventKey=y=>`cora_calendario_eventos_${y}_v1`;
  const projectKey=y=>`cora_calendario_projetos_${y}_v1`;
  function getEvents(y) {
    y=Number(y);const map=new Map();
    const removed=new Set(y===2026?stored('cora_official_2026_removed_v1',[]):[]);
    if(y===2026)(window.CORA_OFFICIAL_2026?.events||[]).forEach(e=>{if(!removed.has(e.id))map.set(e.id,{...e});});
    const own=stored(eventKey(y),[]);
    if(Array.isArray(own))own.forEach(e=>{if(e&&e.id&&typeof e.date==='string'&&e.date.startsWith(y+'-')&&!removed.has(e.id))map.set(e.id,{...e});});
    return [...map.values()].filter(e=>/^\d{4}-\d\d-\d\d$/.test(e.date||'')).sort((a,b)=>a.date.localeCompare(b.date)||String(a.title).localeCompare(String(b.title)));
  }
  function getProjects(y) {
    const data=stored(projectKey(y),null);
    if(Array.isArray(data)&&data.length===12)return data.map(month=>Array.isArray(month)?month.map(String):[]);
    if(Number(y)===2026)return (window.CORA_OFFICIAL_2026?.projects||[]).map(month=>[...(month||[])]);
    return Array.from({length:12},()=>[]);
  }
  function saveProjects(y,projects) {
    if(!Array.isArray(projects)||projects.length!==12)throw Error('São necessários doze meses de projetos.');
    save(projectKey(y),projects);
    window.dispatchEvent(new CustomEvent('cora-projects-changed',{detail:{year:Number(y)}}));
  }
  const pad=v=>String(v).padStart(2,'0');
  function dateWithYear(date,y,mode='same-date',type='') {
    const parts=date.split('-').map(Number),sy=parts[0],mo=parts[1]-1,dy=parts[2];
    const last=new Date(y,mo+1,0).getDate();
    const same=`${y}-${pad(mo+1)}-${pad(Math.min(last,dy))}`;
    if(mode!=='weekday'||type==='Feriado')return same;
    const old=new Date(sy,mo,dy),weekday=old.getDay();
    const ordinal=Math.ceil(dy/7);
    const oldIsLast=dy+7>new Date(sy,mo+1,0).getDate();
    const first=new Date(y,mo,1).getDay();
    let newDay=1+(weekday-first+7)%7+(ordinal-1)*7;
    if(oldIsLast||newDay>last){
      const endDay=new Date(y,mo,last).getDay();
      newDay=last-(endDay-weekday+7)%7;
    }
    return `${y}-${pad(mo+1)}-${pad(newDay)}`;
  }
  function cloneYear(source,target,mode='same-date'){
    source=Number(source);target=Number(target);
    if(!validYear(source)||!validYear(target)||source===target)throw Error('Selecione dois anos diferentes.');
    const data=getEvents(source),existing=getEvents(target);
    if(existing.length||getProjects(target).some(month=>month.length))throw Error('O ano de destino já possui informações. Nenhum dado será sobrescrito.');
    const migrated=data.map((e,i)=>({
      ...e,id:`cora-${target}-copy-${i}-${Math.random().toString(36).slice(2,8)}`,
      date:dateWithYear(e.date,target,mode,e.type),
      title:String(e.title||'').replace(new RegExp(String(source),'g'),String(target)),
      notes:String(e.notes||'').replace(new RegExp(String(source),'g'),String(target)),
      source:`Modelo ${source} — revisão necessária`,clonedFrom:e.id||'',
      meet:'',status:'Em revisão',needsReview:true
    }));
    save(eventKey(target),migrated);
    saveProjects(target,getProjects(source));
    const copyNamedStore=(prefix)=>{
      const data=stored(prefix+source+'_v1',null);
      if(data&&typeof data==='object'){
        const next=JSON.parse(JSON.stringify(data).replace(new RegExp(String(source),'g'),String(target)));
        save(prefix+target+'_v1',next);
      }
    };
    copyNamedStore('cora_planejamento_');
    copyNamedStore('cora_cards_');
    save(REGISTER,[...new Set([...years(),target])]);
    return {count:migrated.length,projects:getProjects(target).reduce((n,m)=>n+m.length,0)};
  }
  function makeYear(y){
    y=Number(y);if(!validYear(y))throw Error('Informe um ano entre 2000 e 2100.');
    save(REGISTER,[...new Set([...years(),y])]);
    if(!localStorage.getItem(eventKey(y)))save(eventKey(y),[]);
    if(!localStorage.getItem(projectKey(y)))save(projectKey(y),Array.from({length:12},()=>[]));
  }
  function setYear(y){
    y=Number(y);if(!validYear(y))return;
    activeYear=y;save(YEAR_KEY,y);renderYears();updateHeadings();
    window.dispatchEvent(new CustomEvent('cora-year-changed',{detail:{year:y}}));
  }
  function updateHeadings(){
    document.title=`Calendário Escolar ${activeYear} | Cora Coralina`;
    if($('yearHeading'))$('yearHeading').textContent=String(activeYear);
    if($('yearTag'))$('yearTag').textContent=String(activeYear);
    if($('yearWelcomeLabel'))$('yearWelcomeLabel').textContent=`PLANEJAMENTO · ${activeYear}`;
    if($('officialBannerSection'))$('officialBannerSection').hidden=activeYear!==2026;
    if($('officialCalendarSection')&&activeYear!==2026)$('officialCalendarSection').hidden=true;
    if($('yearDataNote'))$('yearDataNote').textContent=`Ano letivo ${activeYear}. Alterações salvas neste dispositivo até existir uma base compartilhada com autenticação.`;
  }
  function renderYears(){
    if(!$('yearSelect'))return;
    $('yearSelect').innerHTML=years().map(y=>`<option value="${y}">${y}</option>`).join('');
    $('yearSelect').value=String(activeYear);
    if($('cloneSource')){
      $('cloneSource').innerHTML=years().map(y=>`<option value="${y}">${y}</option>`).join('');
      $('cloneSource').value=String(activeYear);
    }
    $('yearModelBadge').textContent=activeYear===2026?'Modelo oficial 2026':'Ano editável';
  }
  function renderProjects(){
    if(!$('projectsEditor'))return;
    const items=getProjects(activeYear)[viewMonth]||[];
    $('yearProjectsLabel').textContent=`Projetos de ${MONTHS[viewMonth]} de ${activeYear}`;
    $('projectsEditor').value=items.join('\n');
    $('projectCount').textContent=`${items.length} projeto(s) neste mês`;
    $('projectsPreview').innerHTML=items.length?items.map(s=>`<li>${esc(s)}</li>`).join(''):'<li>Nenhum projeto cadastrado para este mês.</li>';
  }
  function saveCurrentProjects(){
    const data=getProjects(activeYear);
    data[viewMonth]=$('projectsEditor').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,50);
    try{saveProjects(activeYear,data);renderProjects();toast(`Projetos de ${MONTHS[viewMonth]} salvos.`);}
    catch(e){toast('Não foi possível salvar: '+e.message);}
  }
  function toast(msg){const box=$('toast');if(box){box.textContent=msg;box.classList.add('visible');setTimeout(()=>box.classList.remove('visible'),4500);}}
  function submitClone(e){
    e.preventDefault();
    const source=Number($('cloneSource').value),target=Number($('cloneTarget').value),mode=$('cloneMode').value,blank=$('startBlankYear').checked;
    try{
      if(getEvents(target).length||getProjects(target).some(m=>m.length))throw Error(`O ano ${target} já possui dados e não será sobrescrito.`);
      let count=0,projectCount=0;
      if(blank)makeYear(target);
      else{const result=cloneYear(source,target,mode);count=result.count;projectCount=result.projects;}
      $('cloneYearDialog').close();setYear(target);
      toast(blank?`Ano ${target} criado em branco.`:`${count} eventos e ${projectCount} projetos de ${source} copiados. Revise todas as datas.`);
    }catch(error){$('cloneError').textContent=error.message;}
  }
  function filterVisible(entries){
    if(audience==='Todos')return entries;
    return entries.filter(e=>(e.status||'Publicado')==='Publicado' && ((e.audience||'Todos')==='Todos'||(e.audience||'Todos')===audience));
  }
  function renderAudienceSummary(){
    if(!$('audienceTotal'))return;
    const count=filterVisible(getEvents(activeYear)).length;
    $('audienceTotal').textContent=`${count} atividades visíveis em ${activeYear}`;
    $('audienceExplanation').textContent=audience==='Todos'
      ?'Diretório principal: todos os registros, incluindo eventos copiados em revisão.'
      :`Prévia da comunicação para ${audience.toLowerCase()}. Não é um controle de acesso seguro.`;
  }
  function summaryForType(){return $('summaryType')?.value||'Todas as atividades';}
  function filteredSummaryEvents(){
    const type=summaryForType();let entries=filterVisible(getEvents(activeYear));
    if(type==='Projetos')return [];
    if(type!=='Todas as atividades')entries=entries.filter(e=>e.type===type||(type==='Avaliação'&&/avalia|simulado|prova/i.test(e.title)));
    if(($('summaryScope')?.value||'month')==='month')entries=entries.filter(e=>Number(e.date.slice(5,7))===viewMonth+1);
    return entries;
  }
  const api={
    get activeYear(){return activeYear;},get audience(){return audience;},get month(){return viewMonth;},
    getEvents,getProjects,saveProjects,cloneYear,makeYear,setYear,years,filterVisible,filteredSummaryEvents,summaryForType,
    dateWithYear,renderProjects,saveCurrentProjects,toast,MONTHS
  };
  window.CoraYears=api;
  function init(){
    $('yearSelect').addEventListener('change',e=>setYear(Number(e.target.value)));
    $('createYearBtn').addEventListener('click',()=>{
      $('cloneSource').value=String(activeYear);$('cloneTarget').value=String(activeYear+1);
      $('cloneMode').value='same-date';$('cloneError').textContent='';$('startBlankYear').checked=false;
      $('cloneYearDialog').showModal();
    });
    $('cloneYearForm').addEventListener('submit',submitClone);
    $('cancelClone').addEventListener('click',()=>$('cloneYearDialog').close());
    $('closeClone').addEventListener('click',()=>$('cloneYearDialog').close());
    $('audienceView').addEventListener('change',e=>{
      audience=e.target.value;renderAudienceSummary();
      window.dispatchEvent(new CustomEvent('cora-audience-changed',{detail:{audience}}));
    });
    $('saveProjectsBtn').addEventListener('click',saveCurrentProjects);
    window.addEventListener('cora-month-changed',e=>{viewMonth=e.detail.month;renderProjects();renderAudienceSummary();});
    window.addEventListener('cora-year-changed',()=>{renderProjects();renderAudienceSummary();});
    renderYears();updateHeadings();renderProjects();renderAudienceSummary();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
