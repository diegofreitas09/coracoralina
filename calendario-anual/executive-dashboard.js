/* Cora Coralina • Navegação por páginas e visão executiva (Gestão / Equipe).
   Complemento progressivo: não altera autenticação, publicação ou armazenamento. */
(() => {
  'use strict';
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ICON = {
    overview:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
    events:'<path d="M8 3v4m8-4v4M4 9h16M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="m9 15 2 2 4-4"/>',
    people:'<circle cx="9" cy="8" r="3"/><path d="M2 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M17 14c3 0 5 2 5 5v1"/>',
    gift:'<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M2 9h20M12 9v12M12 9c-7-1-8-6-5-7 3-1 5 4 5 7Zm0 0c7-1 8-6 5-7-3-1-5 4-5 7Z"/>',
    document:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
    message:'<path d="M21 11a8 8 0 0 1-8 8 9 9 0 0 1-4-.9L3 21l2-5a8 8 0 1 1 16-5Z"/>',
    shield:'<path d="m12 2 9 4v6c0 6-4 9-9 10-5-1-9-4-9-10V6Z"/><path d="m8 12 3 3 5-6"/>',
    menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
    x:'<path d="M6 6l12 12M18 6 6 18"/>',
    chevron:'<path d="m9 6 6 6-6 6"/>'
  };
  const icon = (name) => '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(ICON[name]||ICON.calendar)+'</svg>';
  const ROUTES = [
    ['overview','Visão geral','overview'],['calendar','Calendário e meses','calendar'],
    ['evaluations','Avaliações e entregas','events'],['stages','Etapas letivas','clock'],
    ['meetings','Reuniões e planejamento','people'],['holidays','Feriados e dias letivos','calendar'],
    ['birthdays','Aniversariantes','gift'],['staff','Equipe e segmentos','people'],
    ['notices','Avisos e publicações','message'],['files','Arquivos e PDFs','document'],
    ['tools','Ferramentas pedagógicas','events'],['compliance','Conformidade escolar','shield']
  ];
  const TEAM_ROUTES = [
    ['resumo','Visão geral','overview'],['calendario','Calendário anual','calendar'],
    ['etapas','Etapas letivas','clock'],['feriados','Feriados e aulas','calendar'],
    ['avaliacoes','Avaliações','events'],['entregas','Prazos e entregas','clock'],
    ['aniversarios','Aniversariantes','gift'],['avisos','Comunicados','message'],
    ['equipe','Equipe em números','people'],['tools','Ferramentas do professor','document'],
    ['correcao','Corretor de gabaritos','events'],['pdf','PDFs e downloads','document']
  ];
  const state={manager:'overview',team:'resumo',teamTools:false,drawer:false,accounts:null,accountsLoading:false,accountError:false};
  const stored = (key,fallback) => {try {const data=JSON.parse(localStorage.getItem(key)||'null');return data===null?fallback:data;}catch{return fallback;}};
  const currentYear = () => Number(window.CoraYears?.activeYear)||Number($('#schoolYearSelect')?.value)||2026;
  const managementEvents = year => {
    if(typeof window.CoraYears?.getEvents==='function')return window.CoraYears.getEvents(year);
    const removed=new Set(year===2026?stored('cora_official_2026_removed_v1',[]):[]);
    const map=new Map();
    if(year===2026)for(const e of (window.CORA_OFFICIAL_2026?.events||[]))
      if(e?.id&&!removed.has(e.id))map.set(e.id,e);
    const local=stored('cora_calendario_eventos_'+year+'_v1',[]);
    if(Array.isArray(local))for(const e of local){
      if(e?.id&&String(e.date||'').startsWith(year+'-')&&!removed.has(e.id))map.set(e.id,e);
    }
    return [...map.values()].filter(e=>/^\d{4}-\d{2}-\d{2}$/.test(e.date||''));
  };
  const countWeekdays = year => {
    const days=Array(7).fill(0);
    for(let m=0;m<12;m++) for(let d=1,last=new Date(Date.UTC(year,m+1,0)).getUTCDate();d<=last;d++)
      days[new Date(Date.UTC(year,m,d)).getUTCDay()]++;
    return days;
  };
  const metrics = (events,birthdays,year,canEdit) => {
    const records=Array.isArray(events)?events.filter(e=>String(e?.date||'').startsWith(year+'-')):[];
    const matches=(r)=>records.filter(e=>r.test(String(e.type||'')+' '+String(e.title||'')));
    const meeting = matches(/reuni[aã]o|encontro (pedag[oó]gico|de professores|com professores)|conselho de classe/i);
    const family = meeting.filter(e=>/fam[ií]lia|pais|respons[aá]veis|escola e fam/i.test(String(e.title||'')+' '+String(e.type||'')));
    const pedagogy=meeting.filter(e=>/pedag[oó]gic|professor|forma[cç][aã]o|coordena[cç][aã]o|planejamento/i.test(String(e.title||'')+' '+String(e.type||''))&&!family.includes(e));
    const evaluations=matches(/avalia[cç][aã]o|simulado|prova|AP1|AP2|AD\b|AR\b|segunda chamada/i);
    const deliveries=matches(/entrega|prazo|conte[uú]do.*coordena[cç][aã]o/i);
    const schoolSaturdays=matches(/s[aá]bado (letivo|de aula)|reposi[cç][aã]o (letiva|de aula)/i)
      .filter(e=>new Date(e.date+'T12:00:00Z').getUTCDay()===6);
    const b=Array.isArray(birthdays)?birthdays:[];
    const teachers=b.filter(p=>/profess|docente/i.test(String(p.role||'')));
    const staff=b.filter(p=>!teachers.includes(p));
    let holidays=null, holidayCaption='Conforme calendário publicado';
    if(canEdit&&window.CoraHolidays?.officialList){
      const config=window.CoraHolidays.config(year);
      const list=window.CoraHolidays.officialList(year,config.uf||'CE',config.city||'');
      const valid=list.filter(h=>h.verified!==false);
      holidays=new Set(valid.map(h=>h.date)).size;
      holidayCaption=config.city?'Base oficial selecionada; confira as decisões':'Base de referência; escolha o município';
    } else {
      holidays=new Set(records.filter(e=>e.type==='Feriado'||e.holidayManaged||/feriado/i.test(String(e.type||'')))
        .map(e=>e.date)).size;
    }
    return {year,events:records.length,meetings:meeting.length,family:family.length,
      pedagogy:pedagogy.length,evaluations:evaluations.length,deliveries:deliveries.length,
      birthdays:b.length,teacherBirthdays:teachers.length,staffBirthdays:staff.length,
      holidays,holidayCaption,saturdays:new Set(schoolSaturdays.map(e=>e.date)).size,weekdays:countWeekdays(year)};
  };
  const card=(label,value,note,ico='events')=>'<article class="cora-exec-card">'+
    '<div class="cora-exec-icon">'+icon(ico)+'</div>'+
    '<strong>'+esc(value===null?'—':value)+'</strong><span>'+esc(label)+'</span>'+
    (note?'<small>'+esc(note)+'</small>':'')+'</article>';
  const countStr = n => Number.isInteger(n)&&n>=0?n.toLocaleString('pt-BR'):'—';
  function overviewContent(model,mode) {
    const days=['Domingos','Segundas','Terças','Quartas','Quintas','Sextas','Sábados'];
    const week=model.weekdays.map((n,i)=>card(days[i],n,'Dias no calendário','calendar')).join('');
    const hasAccounts=mode==='manager'&&state.accounts&&Array.isArray(state.accounts.members);
    const members=hasAccounts?state.accounts.members:[];
    const teachers=members.filter(m=>/professor/i.test(String(m.profile||m.role||'')));
    const countBySeg=segment=>teachers.filter(m=>Array.isArray(m.segments)&&m.segments.includes(segment)).length;
    const fundamentalTotal=teachers.filter(m=>Array.isArray(m.segments)&&m.segments.some(s=>s==='Ensino Fundamental I'||s==='Ensino Fundamental II')).length;
    const others=members.filter(m=>!/professor/i.test(String(m.profile||m.role||'')));
    let accountCards='';
    if(mode==='manager'){
      accountCards='<h3>Equipe cadastrada</h3><div class="cora-exec-grid">'+
        card('Professores cadastrados',hasAccounts?countStr(teachers.length):'—','Contas do servidor','people')+
        card('Outros colaboradores',hasAccounts?countStr(others.length):'—','Contas do servidor','people')+
        card('Ensino Fundamental (total)',hasAccounts?countStr(fundamentalTotal):'—','Professores únicos de F1 e F2','people')+
        [['Educação Infantil','Educação Infantil'],['Fundamental I','Ensino Fundamental I'],
          ['Fundamental II','Ensino Fundamental II'],['Ensino Médio','Ensino Médio']].map(x=>
          card(x[0],hasAccounts?countStr(countBySeg(x[1])):'—','Professores vinculados','people')).join('')+
        '</div><p class="cora-exec-note">O Ensino Fundamental é mostrado por Fundamental I e II, evitando dupla contagem. Um professor de mais de um segmento aparece em cada segmento correspondente. '+
        (state.accountError?'Contas indisponíveis no momento.':hasAccounts?'Dados lidos do cadastro autorizado.':'Consultando contas autorizadas...')+'</p>';
    }
    return '<section class="cora-exec" aria-label="Dashboard do ano letivo"><div class="cora-exec-heading">'+
      '<div><small>COLÉGIO CORA CORALINA • PAINEL '+(mode==='manager'?'DA GESTÃO':'DA EQUIPE')+'</small>'+
      '<h2>Visão geral de '+esc(model.year)+'</h2><p>Indicadores do calendário e dos registros do ano selecionado.</p></div>'+
      '<span class="cora-exec-year">'+esc(model.year)+'</span></div>'+
      '<h3>Distribuição dos dias da semana</h3><div class="cora-exec-grid cora-exec-week">'+week+'</div>'+
      '<h3>Agenda pedagógica e institucional</h3><div class="cora-exec-grid">'+
      card('Eventos e atividades',model.events,'Registros do ano','events')+
      card('Avisos e comunicados',model.notices??'—',mode==='manager'?'Rascunhos da Gestão':'Publicados para a equipe','message')+
      card('Feriados',model.holidays,model.holidayCaption,'calendar')+
      (mode==='manager'&&model.invalidMovable>0?card('Datas móveis para revisar',model.invalidMovable,'Abra Feriados e dias letivos → Conferir divergências','shield'):'')+
      card('Sábados com aula',model.saturdays,'Identificados nas atividades','calendar')+
      card('Avaliações e simulados',model.evaluations,'Pelo tipo ou descrição','document')+
      card('Prazos e entregas',model.deliveries,'Registros do calendário','clock')+
      card('Reuniões e encontros',model.meetings,'Reuniões cadastradas','people')+
      card('Reuniões de famílias',model.family,'Classificadas no calendário','people')+
      card('Reuniões pedagógicas',model.pedagogy,'Classificadas no calendário','people')+
      card('Aniversariantes',model.birthdays,'Cadastros recorrentes','gift')+
      card('Aniversariantes professores',model.teacherBirthdays,'Conforme função cadastrada','gift')+
      card('Aniversariantes colaboradores',model.staffBirthdays,'Demais funções cadastradas','gift')+
      '</div>'+accountCards+
      '<p class="cora-exec-note">Contagem de ocorrências cadastradas, não de dias letivos oficiais. Reuniões podem aparecer simultaneamente no total de eventos. '+
      (mode==='manager'?'Dados locais precisam ser publicados para aparecer na Equipe Pedagógica.':'Somente dados autorizados e publicados pela Gestão aparecem neste painel.')+
      '</p></section>';
  }
  function fetchAccounts() {
    if(state.accountsLoading||state.accounts)return;
    state.accountsLoading=true;
    fetch('/calendario-anual/api?action=accounts',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}})
      .then(r=>{if(!r.ok)throw Error('Consulta negada');return r.json()})
      .then(r=>{state.accounts=r;state.accountError=false})
      .catch(()=>{state.accountError=true})
      .finally(()=>{state.accountsLoading=false;renderManagerDashboard()});
  }
  function renderManagerDashboard() {
    if(!$('.cp-manager-bar')||document.body.classList.contains('portal-locked'))return;
    const main=$('#app main.content');if(!main)return;
    let view=$('#coraExecutiveSummary');
    if(!view){view=document.createElement('div');view.id='coraExecutiveSummary';const welcome=$('.welcome',main);welcome?.insertAdjacentElement('afterend',view);}
    if(state.manager!=='overview')return;
    const year=currentYear(),sourceEvents=managementEvents(year),
      events=window.CoraCalendarIntegrity?.filterEvents?.(sourceEvents)||sourceEvents,
      invalidMovable=window.CoraCalendarIntegrity?.find?.(sourceEvents)||[],
      birthdays=window.CoraBirthdays?.all?.()||[];
    const model=metrics(events,birthdays,year,true);
    model.notices=(stored('cora_portal_draft_notices_'+year,[])||[]).length;
    model.invalidMovable=invalidMovable.length;
    view.innerHTML=overviewContent(model,'manager');
    if(!state.accounts&&!state.accountsLoading&&!state.accountError)fetchAccounts();
  }
  const mainPageFor = el => {
    if(el.id==='coraExecutiveSummary')return 'overview';
    if(el.matches('.stats'))return 'calendar';
    if(el.matches('#planningStudio'))return 'meetings';
    if(el.matches('#birthdayStudio'))return 'birthdays';
    if(el.matches('#cardStudio'))return 'tools';
    if(el.matches('#coraAssessmentPanel'))return 'evaluations';
    if(el.matches('#cora2027Replan'))return 'evaluations';
    if(el.matches('#coraStages')||el.matches('.stage-panel')||el.matches('#yearStagePanel'))return 'stages';
    if(el.matches('.files-section'))return 'files';
    if(el.matches('.studio-shortcuts'))return 'tools';
    if(el.matches('.welcome, footer, .cora-route-title'))return 'persistent';
    if(el.matches('#officialBanner, .official-banner, #officialCalendarSection, .month-area, #yearCarryTools, #yearProjects'))return 'calendar';
    return 'calendar';
  };
  function applyManagerRoute() {
    if(!$('.cp-manager-bar')||document.body.classList.contains('portal-locked'))return;
    document.body.classList.add('cora-exec-manager');
    const main=$('#app main.content');if(!main)return;
    $$('#app main.content > *').forEach(el=>{
      const category=mainPageFor(el);
      el.classList.toggle('cora-route-hidden',category!=='persistent'&&category!==state.manager);
    });
    const extras={
      '#cpYearSync':'stages','#coraHolidayManager':'holidays','#cpLegalCompliance':'compliance',
      '#cpSinepe27':'compliance','#cpManagerPanel':'notices','#cpAccountsPanel':'staff'
    };
    Object.entries(extras).forEach(([selector,page])=>{const node=$(selector);if(node)node.classList.toggle('cora-route-hidden',state.manager!==page);});
    $('#monthNav')?.classList.toggle('cora-route-hidden',state.manager!=='calendar');
    $$('#coraManageNav [data-page]').forEach(btn=>{
      const active=btn.dataset.page===state.manager;btn.classList.toggle('is-active',active);btn.setAttribute('aria-current',active?'page':'false');
    });
    const label=ROUTES.find(x=>x[0]===state.manager)?.[1]||'Visão geral';
    const title=$('#coraPageTitle');if(title)title.textContent=label;
    const actions=$('#app .welcome-actions');if(actions)actions.classList.toggle('cora-route-hidden',!['calendar','files'].includes(state.manager));
    if(state.manager==='staff'&&$('#cpAccountsPanel')?.classList.contains('cp-hidden'))$('#cpAccountsOpen')?.click();
    if(state.manager==='notices'&&$('#cpManagerPanel')?.classList.contains('cp-hidden'))$('#cpTogglePanel')?.click();
    if(state.manager==='holidays')$('#chManager')?.setAttribute('open','');
    if(state.manager==='compliance'){$('#cpLegalDetails')?.setAttribute('open','');$('#cpSinepe27 details')?.setAttribute('open','');}
    if(state.manager==='overview')renderManagerDashboard();
  }
  function managerNav(){
    const aside=$('#app .sidebar');if(!aside||$('#coraManageNav'))return;
    const nav=document.createElement('nav');nav.id='coraManageNav';nav.setAttribute('aria-label','Páginas da Gestão');
    nav.innerHTML='<div class="cora-nav-caption">PAINEL ESCOLAR</div>'+
      ROUTES.map(([id,label,ico])=>'<button type="button" data-page="'+id+'">'+icon(ico)+'<span>'+esc(label)+'</span>'+icon('chevron')+'</button>').join('')+
      '<div class="cora-nav-caption">SELECIONE UM MÊS NA PÁGINA CALENDÁRIO</div>';
    aside.insertBefore(nav,$('#monthNav'));
    nav.onclick=e=>{
      const button=e.target.closest('[data-page]');if(!button)return;
      state.manager=button.dataset.page;
      state.drawer=false;document.body.classList.remove('cora-nav-open');
      applyManagerRoute();window.scrollTo({top:0,behavior:'instant'});
    };
    const bar=$('.cp-manager-headline')||$('.cp-manager-bar');
    if(bar&&!$('#coraManagerMenu')){
      const toggle=document.createElement('button');toggle.id='coraManagerMenu';toggle.type='button';
      toggle.className='cora-menu-toggle';toggle.setAttribute('aria-label','Abrir menu da Gestão');
      toggle.innerHTML=icon('menu');
      toggle.onclick=()=>{document.body.classList.toggle('cora-nav-open')};
      bar.prepend(toggle);
    }
    if(!$('#coraPageTitle')){
      const title=document.createElement('div');title.className='cora-route-title';
      title.innerHTML='<span>PAINEL / </span><strong id="coraPageTitle">Visão geral</strong>';
      $('#app main.content .welcome')?.insertAdjacentElement('beforebegin',title);
    }
  }
  function teamSnapshot(){return window.CoraPortalSnapshot?.()||null;}
  function updateTeamOverview() {
    const snap=teamSnapshot(),view=$('#cpView');
    if(!snap||snap.role!=='equipe'||!view)return;
    const team=$('.cp-team');if(!team)return;
    const current=snap.tab||'resumo';
    team.dataset.coraTab=current;
    if(current!=='resumo')state.teamTools=false;
    if(!state.teamTools){state.team=current;}
    team.dataset.coraTools=state.teamTools&&current==='resumo'?'yes':'no';
    if(current==='resumo'&&!snap.showBell){
      let section=$('#coraTeamExecutive');
      if(!section){section=document.createElement('div');section.id='coraTeamExecutive';view.prepend(section);}
      const signature=JSON.stringify([snap.year,(snap.events||[]).map(e=>[e.id,e.date,e.title,e.type]),(snap.birthdays||[]).map(b=>[b.id,b.day,b.month,b.role]),(snap.notices||[]).length]);
      if(section.dataset.signature!==signature){const model=metrics(snap.events,snap.birthdays,snap.year,false);model.notices=(snap.notices||[]).length;
        section.innerHTML=overviewContent(model,'team');section.dataset.signature=signature;}
      if(state.teamTools){
        const tools=$('.cp-teacher-tools',view);
        if(tools&&!$('#coraToolsHeading')){
          tools.insertAdjacentHTML('afterbegin','<div id="coraToolsHeading" class="cora-tools-heading"><h2>Ferramentas pedagógicas</h2><p>Atalhos oficiais para roteiros, notas e recursos do professor.</p></div>');
        }
      }
    }
    $$('#coraTeamDrawer [data-team-tab]').forEach(btn=>{
      const active=btn.dataset.teamTab===(state.teamTools?'tools':current);
      btn.classList.toggle('is-active',active);btn.setAttribute('aria-current',active?'page':'false');
    });
  }
  function teamNav(){
    const team=$('#coraPortal .cp-team');if(!team||$('#coraTeamDrawer'))return;
    const holder=$('.cp-head-tools',team);if(!holder)return;
    const toggle=document.createElement('button');
    toggle.type='button';toggle.id='coraTeamMenu';toggle.className='cora-menu-toggle';
    toggle.setAttribute('aria-label','Abrir páginas da Equipe');toggle.setAttribute('aria-expanded','false');toggle.innerHTML=icon('menu');
    holder.prepend(toggle);
    const nav=document.createElement('aside');nav.id='coraTeamDrawer';nav.setAttribute('aria-label','Páginas do professor');
    nav.innerHTML='<div class="cora-team-drawer-head"><strong>Menu da Equipe</strong><button type="button" id="coraTeamClose" aria-label="Fechar menu">'+icon('x')+'</button></div>'+
      TEAM_ROUTES.map(([id,label,ico])=>'<button type="button" data-team-tab="'+id+'">'+icon(ico)+'<span>'+esc(label)+'</span>'+icon('chevron')+'</button>').join('');
    team.append(nav);
    function close(){team.classList.remove('cora-team-drawer-open');toggle.setAttribute('aria-expanded','false')}
    toggle.onclick=()=>{team.classList.toggle('cora-team-drawer-open');toggle.setAttribute('aria-expanded',team.classList.contains('cora-team-drawer-open')?'true':'false')};
    $('#coraTeamClose').onclick=close;
    nav.onclick=e=>{
      const b=e.target.closest('[data-team-tab]');if(!b)return;
      const desired=b.dataset.teamTab;
      state.teamTools=desired==='tools';
      const route=state.teamTools?'resumo':desired;
      const target=$('#cpView [data-cp-tab="'+route+'"]');
      if(target){target.click()} else if(route!=='resumo'){state.teamTools=false;}
      state.team=desired;
      updateTeamOverview();close();window.scrollTo({top:0,behavior:'instant'});
    };
    updateTeamOverview();
  }
  function check(){
    const manager=$('.cp-manager-bar')&&!document.body.classList.contains('portal-locked');
    const team=$('#coraPortal .cp-team');
    if(manager){
      if($('#coraTeamDrawer'))state.teamTools=false;
      managerNav();renderManagerDashboard();applyManagerRoute();
    } else {document.body.classList.remove('cora-exec-manager','cora-nav-open');state.accounts=null;state.accountError=false;}
    if(team){teamNav();updateTeamOverview();}
  }
  let pending=false;
  function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;check()});}
  function bind(){
    const portal=$('#coraPortal');
    if(portal)new MutationObserver(schedule).observe(portal,{childList:true,subtree:true});
    for(const evt of ['cora-year-changed','cora-events-updated','cora-data-changed','cora-assessments-changed',
       'cora-birthdays-changed','cora-projects-changed','cora-month-publication-updated']){
      window.addEventListener(evt,()=>{renderManagerDashboard();applyManagerRoute();});
    }
    window.addEventListener('keydown',e=>{if(e.key==='Escape'){document.body.classList.remove('cora-nav-open');$('.cp-team')?.classList.remove('cora-team-drawer-open')}});
    check();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
