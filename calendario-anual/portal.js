/* Cora Coralina – Gestão / Equipe Pedagógica.
 * Data is shared only after an authorized management publication. No passwords in client code.
 */
(() => {
 'use strict';
 const API='/calendario-anual/api', $=s=>document.querySelector(s);
 const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
 const TEACHER_LINKS=Object.freeze({roteiros:'https://docs.google.com/spreadsheets/d/1Jiy-g9kC7BJ6lR5Hh5cfgBJSAHmdZDS2BwjqIr0WOOc/edit?usp=sharing',gestor:'https://escola.computex.com.br/escola619/index2.php',classroom:'https://classroom.google.com/',sae:'https://sae.digital/'});
 const SEGMENT_OPTIONS=['Educação Infantil','Ensino Fundamental I','Ensino Fundamental II','Ensino Médio','Administrativo','Todos'];
 const segmentCheckboxes=(selected=[])=>'<div class="cp-segment-checks">'+SEGMENT_OPTIONS.map(option=>
  '<label class="cp-segment-choice"><input type="checkbox" name="segments" value="'+safe(option)+'" '+(selected.includes(option)?'checked':'')+'><span>'+safe(option)+'</span></label>').join('')+'</div>';
 const selectedSegments=container=>[...container.querySelectorAll('input[name="segments"]:checked')].map(x=>x.value);
 const validSelectedSegments=segments=>segments.length>0&&!(segments.includes('Todos')&&segments.length>1);
 const eventsKey=y=>'cora_calendario_eventos_'+y+'_v1',noticeKey=y=>'cora_portal_draft_notices_'+y;
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dateStr=(date)=>{const d=new Date(date);return Number.isNaN(d.getTime())?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
 const isoNow=()=>{const d=new Date();return `${dateStr(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};
 const app=$('#app'),root=document.createElement('div');root.id='coraPortal';document.body.prepend(root);
 let role='',chosen='gestao',data=null,year=Number(window.CoraYears?.activeYear)||2026,availableYears=[2026],month=new Date().getFullYear()===2026?new Date().getMonth():0,tab='resumo',selectedStage=0,managerNotices=[],leadDays=3,timer=null,showBell=false,teacherProfile=null,teacherSaving=false,individualRequired=false,pushChecked=false,pushConfirmed=false;
 const seenPublicationIds=new Map();
 let teamStats=null,teamStatsAt=0,teamStatsLoading=false,teamStatsError='';
 async function loadTeamStats(force=false){
  if(role!=='equipe'||teamStatsLoading||(!force&&teamStats&&Date.now()-teamStatsAt<120000))return;
  teamStatsLoading=true;teamStatsError='';
  try{teamStats=await api('team-stats');teamStatsAt=Date.now()}
  catch(error){teamStatsError=error.message||'Indicadores indisponíveis.'}
  finally{teamStatsLoading=false;if(role==='equipe'&&tab==='equipe')drawTeam()}
 }

 const endpoint=action=>`${API}?action=${encodeURIComponent(action)}`;
 async function api(action,payload,query=''){
  const opts={credentials:'same-origin',cache:'no-store',headers:{'accept':'application/json'}};
  if(payload!==undefined){opts.method='POST';opts.headers['content-type']='application/json';opts.headers['x-cora-request']='portal';opts.body=JSON.stringify(payload);}
  const response=await fetch(endpoint(action)+(query?'&'+query:''),opts);let body={};try{body=await response.json()}catch{}
  if(!response.ok){const e=new Error(body.error||`Erro ${response.status}`);e.status=response.status;throw e;}
  return body;
 }
 function toast(message){let t=$('.cp-portal-toast');if(t)t.remove();t=document.createElement('div');t.className='cp-portal-toast';t.textContent=message;document.body.append(t);setTimeout(()=>t.remove(),4500)}
 function officialEvents(){return Array.isArray(window.CORA_OFFICIAL_2026?.events)?window.CORA_OFFICIAL_2026.events:[]}
 function loadEventDraft(y=year){
  try{
   const local=JSON.parse(localStorage.getItem(eventsKey(y))||'[]');
   if(Array.isArray(local)){
     if(y!==2026)return local.filter(e=>String(e.date||'').startsWith(y+'-'));
     const removed=new Set(JSON.parse(localStorage.getItem('cora_official_2026_removed_v1')||'[]'));
     const merged=new Map();
     for(const e of officialEvents())if(!removed.has(e.id))merged.set(e.id,e);
     for(const e of local)merged.set(e.id,e);
     return [...merged.values()].filter(e=>String(e.date||'').startsWith('2026-'));
   }
  }catch{}
  return y===2026?officialEvents():[];
 }
 function loadNoticeDraft(y=year){try{const v=JSON.parse(localStorage.getItem(noticeKey(y))||'[]');return Array.isArray(v)?v:[]}catch{return []}}
 function logo(){return window.CORA_SCHOOL_LOGO||window.CORA_STUDIO_ASSETS?.logo||''}
 function gateway(error=''){
  window.CoraMonthPublisher=null;
  window.CoraMonthlyPublication=null;
  window.CoraGrader?.reset?.();
  window.CoraHelpdesk?.teardown();
  document.body.classList.add('portal-locked');document.body.classList.remove('portal-loading');role='';
  root.innerHTML=`<div class="cp-gateway"><div class="cp-login-shell"><div class="cp-login-head"><img id="cpGatewayLogo" alt="Brasão Cora Coralina"><div><small>COLÉGIO CORA CORALINA · PDF SOLUÇÃO EDUCACIONAL</small><h1>Portal do Calendário Escolar</h1><p>Selecione seu ambiente de trabalho</p></div></div><div class="cp-role-grid"><button type="button" class="cp-role ${chosen==='gestao'?'active':''}" data-cp-role="gestao"><span class="cp-role-icon">⚙</span><strong>Gestão</strong><span>Organizar o ano, editar eventos e publicar avisos para toda a equipe</span></button><button type="button" class="cp-role ${chosen==='equipe'?'active':''}" data-cp-role="equipe"><span class="cp-role-icon">▦</span><strong>Equipe Pedagógica</strong><span>Consultar o calendário, receber alertas e baixar os materiais publicados</span></button></div><form id="cpLoginForm" class="cp-auth"><div id="cpEmailWrap" ${chosen==='gestao'?'hidden':''}><label for="cpEmail">E-mail individual do colaborador</label><input type="email" id="cpEmail" autocomplete="username" placeholder="professor@exemplo.com" ${chosen==='equipe'?'required':''}></div><label id="cpLegacyWrap" class="cp-legacy-option" ${chosen==='gestao'||individualRequired?'hidden':''}><input type="checkbox" id="cpUseLegacy"> Usar senha coletiva temporária (migração)</label><div><label for="cpPassword">Senha pessoal · <span id="cpRoleLabel">${chosen==='gestao'?'Gestão':'Equipe Pedagógica'}</span></label><input type="password" id="cpPassword" autocomplete="current-password" required placeholder="Digite sua senha"></div><button type="submit" class="cp-btn">Entrar no painel</button><div id="cpFirstAccessWrap" class="cp-first-access" ${chosen==='gestao'?'hidden':''}><button type="button" id="cpFirstAccess">Primeiro acesso? Ativar convite</button><small>Seu acesso precisa ser criado pela Gestão. O cadastro na planilha, sozinho, não gera senha.</small></div><div id="cpForgotWrap" class="cp-forgot-wrap" ${chosen==='gestao'?'hidden':''}><button type="button" id="cpForgotPassword" aria-expanded="false">Esqueci minha senha</button><p id="cpForgotInstructions" hidden>Para recuperar o acesso, solicite à Coordenação um <strong>link individual de redefinição</strong>. A Gestão encontrará seu cadastro em <strong>Acessos da equipe → Redefinir senha</strong>. O link expira em 24 horas. Não compartilhe sua senha nem seu link.</p></div><p class="cp-error" role="alert">${safe(error)}</p></form><div class="cp-gateway-foot"><span>A Gestão publica · a Equipe acompanha</span><span>Calendário 2026 · Acesso restrito</span></div></div></div>`;
  $('#cpGatewayLogo').src=logo();
  root.querySelectorAll('[data-cp-role]').forEach(b=>b.onclick=()=>{chosen=b.dataset.cpRole;root.querySelectorAll('[data-cp-role]').forEach(x=>x.classList.toggle('active',x===b));$('#cpRoleLabel').textContent=chosen==='gestao'?'Gestão':'Equipe Pedagógica';$('#cpEmailWrap').hidden=chosen==='gestao';$('#cpLegacyWrap').hidden=chosen==='gestao'||individualRequired;$('#cpUseLegacy').checked=false;$('#cpFirstAccessWrap').hidden=chosen==='gestao';$('#cpForgotWrap').hidden=chosen==='gestao';$('#cpEmail').required=chosen==='equipe';(chosen==='equipe'?$('#cpEmail'):$('#cpPassword')).focus()});
  $('#cpUseLegacy').onchange=()=>{const collective=$('#cpUseLegacy').checked;$('#cpEmailWrap').hidden=collective;$('#cpEmail').required=!collective};
  $('#cpFirstAccess').onclick=()=>activationGateway(true);
  $('#cpForgotPassword').onclick=()=>{
    const instructions=$('#cpForgotInstructions'),btn=$('#cpForgotPassword');
    const expanded=instructions.hidden;
    instructions.hidden=!expanded;btn.setAttribute('aria-expanded',String(expanded));
  };
   $('#cpLoginForm').onsubmit=async e=>{e.preventDefault();const btn=$('#cpLoginForm button[type=submit]');btn.disabled=true;try{const r=await api('login',{role:chosen,email:chosen==='equipe'&&!$('#cpUseLegacy').checked?$('#cpEmail').value.trim():'',password:$('#cpPassword').value});role=r.role;await enter();}catch(err){gateway((err.message||'Credenciais inválidas.')+' '+(err.status===503?'Contate a administração.':''));}finally{btn.disabled=false;}};
 }
 async function logout(){window.CoraHelpdesk?.teardown();teacherProfile=null;try{await api('logout',{})}catch{}clearInterval(timer);timer=null;gateway();}
 async function enter(){if(role==='gestao')manager();else await team();}

 function publicationCandidates(targetYear){
  const drafts=loadEventDraft(targetYear);
  const added=(window.CoraAssessments?.publicationEvents?.(targetYear)||[])
   .filter(e=>targetYear!==2026||e.assessmentDelivery);
  const ready=[...drafts.filter(e=>e.status!=='Em revisão'&&!e.needsReview&&
    !/^cora-(entrega-avaliacoes|periodo-avaliacao)-/.test(String(e.id||''))),...added];
  return {drafts,ready};
 }
 let syncRevision=0;
 async function checkYearSync(targetYear=Number(window.CoraYears?.activeYear)||2026){
  if(role!=='gestao')return;
  const area=$('#cpYearSyncGrid'),status=$('#cpYearSyncStatus');
  if(!area||!status||!window.CoraYearSync)return;
  const current=++syncRevision;
  status.textContent='Conferindo '+targetYear+'...';
  try{
   const reply=await api('state',undefined,'year='+targetYear);
   if(current!==syncRevision||role!=='gestao'||Number(window.CoraYears?.activeYear)!==targetYear)return;
   const {drafts,ready}=publicationCandidates(targetYear);
   const report=window.CoraYearSync.compare({
    year:targetYear,drafts,approved:ready,publication:reply.publication,
    projects:window.CoraYears?.getProjects?.(targetYear)||[],
    birthdaysLocal:window.CoraBirthdays?.all?.()||[],
    stages:window.CoraStages?.get?.(targetYear)||[]
   });
   window.CoraMonthlyPublication={year:targetYear,
    updatedAt:reply.publication?.updatedAt||null,
    months:report.months.map(m=>({month:m.month,ready:m.ready,pending:m.pending,
      published:m.published,projects:m.projects,publishedProjects:m.publishedProjects,
      stagesPending:m.stagesPending,status:m.status}))};
   window.dispatchEvent(new CustomEvent('cora-month-publication-updated',{detail:{year:targetYear}}));
   const n=report.counts;
   status.textContent=targetYear+' · '+n.synchronized+' meses com atividades sincronizadas · '+n.empty+' sem atividades pedagógicas · '+n.pending+' em revisão · '+n.stale+' com alterações · '+n.unpublished+' sem publicação';
   area.innerHTML=report.months.map(m=>{
    const className=m.status==='Em revisão'?'is-review':m.status==='Atualização pendente'?'is-stale':m.status==='Não publicado'?'is-unpublished':'';
    return '<button type="button" class="cp-sync-month '+className+'" data-cp-sync-month="'+m.month+'">'+
     '<strong>'+safe(m.name)+'</strong>'+
     '<small>Na Gestão: '+m.ready+' aprovados · '+m.pending+' em revisão</small>'+
     '<small>Na Equipe: '+m.published+' publicados</small>'+
     '<small>Projetos: '+m.publishedProjects+'/'+m.projects+' · Aniversários: '+m.publishedBirthdays+'</small>'+
     '<span class="cp-sync-status">'+safe(m.status)+(m.stagesPending?' · '+m.stagesPending+' etapa(s) por revisar':'')+'</span></button>';
   }).join('');
   area.querySelectorAll('[data-cp-sync-month]').forEach(btn=>btn.onclick=()=>{
    const i=Number(btn.dataset.cpSyncMonth);
    const selector='#monthNav [data-month="'+i+'"]';
    document.querySelector(selector)?.click();
    document.querySelector('.month-area')?.scrollIntoView({behavior:'smooth',block:'start'});
   });
   const note=$('#cpSyncLastCheck');
   if(note)note.textContent=report.hasPublished?
    'Comparação com a publicação de '+new Date(report.updatedAt).toLocaleString('pt-BR')+
    '. Rascunhos e datas importadas precisam ser revisados na Gestão antes da publicação.':
    'Este ano ainda não foi publicado para a Equipe. Confira os meses antes de usar “Publicar para equipe”.';
  }catch(e){
   if(current===syncRevision){status.textContent='Não foi possível conferir a sincronização';area.textContent=e.message||'Falha de conexão';}
  }
 }
 function manager(){
  year=Number(window.CoraYears?.activeYear)||2026;
  window.CoraMonthPublisher={publish:publishApprovedMonth};
  document.body.classList.remove('portal-locked','portal-loading');
  managerNotices=loadNoticeDraft();try{leadDays=Number(localStorage.getItem('cora_default_lead_days_'+year))||3}catch{}
  const adminIcon=(name)=>{
    const paths={
      cog:'<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.04.04-1.9 1.9-.04-.04a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.56V20h-2.7v-.07a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.87.34l-.04.04-1.9-1.9.04-.04A1.7 1.7 0 0 0 6.6 15a1.7 1.7 0 0 0-1.56-1H5v-2.7h.04A1.7 1.7 0 0 0 6.6 10a1.7 1.7 0 0 0-.34-1.87l-.04-.04 1.9-1.9.04.04A1.7 1.7 0 0 0 10 6.6 1.7 1.7 0 0 0 11 5.04V5h2.7v.04A1.7 1.7 0 0 0 14.7 6.6a1.7 1.7 0 0 0 1.87-.34l.04-.04 1.9 1.9-.04.04A1.7 1.7 0 0 0 18.1 10a1.7 1.7 0 0 0 1.56 1H20v2.7h-.04A1.7 1.7 0 0 0 18.4 15Z"/>',
      bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
      send:'<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
      log:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
      users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'
    };
    return '<svg class="cp-admin-icon" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||'')+'</svg>';
  };
  root.innerHTML=`<header class="cp-manager-bar" aria-label="Central administrativa">
    <div class="cp-manager-headline">
      <div class="cp-manager-identity">
        <span class="cp-manager-emblem">${adminIcon('cog')}</span>
        <span class="cp-manager-identity-text"><small>COLÉGIO CORA CORALINA · ADMINISTRAÇÃO</small><strong>Central de Gestão</strong></span>
      </div>
      <button id="cpLogout" class="cp-btn soft cp-manager-logout" title="Sair da Gestão" type="button">${adminIcon('log')}<span>Sair</span></button>
    </div>
    <div class="cp-manager-statusline"><span class="cp-status-indicator" aria-hidden="true"></span><span id="cpPubStatus" class="cp-status" role="status">Verificando a última publicação...</span></div>
    <nav class="cp-manager-actions" aria-label="Ações da Gestão">
      <button id="cpTogglePanel" class="cp-btn cp-manager-secondary" type="button">${adminIcon('bell')}<span>Publicações e alertas</span></button>
      <button id="cpPublishNow" class="cp-btn cp-manager-publish" type="button">${adminIcon('send')}<span>Publicar para equipe</span></button>
    </nav>
  </header><section id="cpManagerPanel" class="cp-manager-panel cp-hidden"><h2>Comunicação com a equipe</h2><p>Os avisos ficam como rascunho neste dispositivo até você clicar em “Publicar para equipe”. Os eventos locais serão enviados junto com os avisos.</p><div class="cp-form-grid"><label>Título do aviso<input id="cpNoticeTitle" maxlength="130" placeholder="Ex.: Reunião de planejamento"></label><label>Tipo<select id="cpNoticeType"><option>Informativo</option><option>Urgente</option><option>Reunião</option><option>Avaliação</option></select></label><label>Data de início da publicação<input id="cpNoticePublish" type="datetime-local" value="${isoNow()}"></label><label class="cp-wide">Mensagem<textarea id="cpNoticeBody" placeholder="Escreva o recado, orientações ou uma alteração do calendário"></textarea></label><label>Data do evento (opcional)<input type="date" id="cpNoticeEventDate" min="2026-01-01" max="2026-12-31"></label><label>Alertar com antecedência<select id="cpNoticeLead"><option value="0">No dia</option><option value="1">1 dia antes</option><option value="2">2 dias antes</option><option value="3" selected>3 dias antes</option><option value="5">5 dias antes</option><option value="7">7 dias antes</option><option value="14">14 dias antes</option><option value="30">30 dias antes</option></select></label><label>Antecedência padrão de eventos<select id="cpDefaultLead"><option value="0">No dia</option><option value="1">1 dia</option><option value="2">2 dias</option><option value="3">3 dias</option><option value="5">5 dias</option><option value="7">7 dias</option><option value="14">14 dias</option></select></label><div class="cp-wide"><button type="button" class="cp-btn soft" id="cpAddNotice" aria-live="polite">Adicionar aviso</button><span id="cpNoticeSaveFeedback" class="cp-save-feedback" role="status" aria-live="polite"></span></div></div><h3>Avisos preparados</h3><div id="cpNoticeRows"></div><div style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-top:13px"><button class="cp-btn gold" id="cpPublishPanel">Publicar calendário + avisos</button><span class="cp-status">Atualizações não são enviadas automaticamente ao salvar o rascunho.</span></div></section>`;
  root.querySelector('.cp-manager-bar')?.insertAdjacentHTML('afterend',
   '<details id="cpYearSync" class="cp-year-sync"><summary>Conferência dos 12 meses · Gestão e Equipe <span id="cpYearSyncStatus" class="cp-sync-caption">Verificando...</span></summary>'+
   '<p>Compare o que está organizado neste aparelho com os eventos aprovados e publicados. Importações em revisão não são enviadas aos professores.</p>'+
   '<div class="cp-sync-controls"><button type="button" id="cpSyncReload">Conferir sincronização</button>'+
   '<button type="button" id="cpPrepareSchoolYear">Importar estrutura do ano anterior</button>'+
   '<button type="button" id="cpReviewImportedYear">Conferir atividades importadas</button>'+
   '<span id="cpSyncLastCheck" role="status"></span></div>'+
   '<div id="cpYearSyncGrid" class="cp-sync-year-grid" aria-live="polite"></div></details>');
  window.CoraHolidays?.mountManager({host:root,getYear:()=>Number(window.CoraYears?.activeYear)||year,onPublish:publish});
  const reviewController=window.CoraYearReview?.mount({
   host:$('#cpYearSync'),getYear:()=>Number(window.CoraYears?.activeYear)||2026,
   onChange:(targetYear)=>void checkYearSync(targetYear),notify:toast
  });
  if(window.CoraYearReview)window.CoraYearReview.requestOpen=(requestedYear,requestedMonth)=>{
   if(role!=='gestao'||Number(window.CoraYears?.activeYear)!==Number(requestedYear)||!reviewController)return false;
   reviewController.open(requestedMonth);
   return true;
  };
  $('#cpSyncReload')?.addEventListener('click',()=>void checkYearSync());
  window.addEventListener('cora-events-updated',e=>{
   if(role==='gestao'&&Number(e.detail?.year)===Number(window.CoraYears?.activeYear))void checkYearSync();
  });
  window.addEventListener('cora-data-changed',e=>{
   if(role==='gestao'&&Number(e.detail?.year)===Number(window.CoraYears?.activeYear))void checkYearSync();
  });
  $('#cpReviewImportedYear')?.addEventListener('click',()=>{
   reviewController?.open(Math.max(0,Math.min(11,Number(window.CoraYears?.month)||0)));
  });
  $('#cpPrepareSchoolYear')?.addEventListener('click',()=>{
   const target=Number(window.CoraYears?.activeYear)||2026;
   if(target<=2026)return;
   window.CoraYearPlanner?.showFullYearWizard?.(target);
  });
  const prepareButton=$('#cpPrepareSchoolYear');
  if(prepareButton)prepareButton.hidden=year<=2026;
  const reviewButton=$('#cpReviewImportedYear');
  if(reviewButton)reviewButton.hidden=year<=2026;
  window.CoraHelpdesk?.mount('gestao',root);
  // Gestão: o cadastro da planilha é espelho administrativo; a autorização efetiva ocorre neste painel.
  root.insertAdjacentHTML('beforeend','<section id="cpAccountsPanel" class="cp-accounts-panel cp-hidden">'+
   '<div class="cp-accounts-head"><div><small>SEGURANÇA E COLABORADORES</small><h2>Gestão de colaboradores e acessos</h2><p>O cadastro, a autenticação e o histórico de logins são gerenciados aqui. A planilha é apenas uma cópia administrativa.</p></div><button class="cp-btn soft" id="cpAccountsClose" type="button">Fechar</button></div>'+
   '<div id="cpAccessDashboard" class="cp-access-dashboard" aria-label="Indicadores e gráficos de acessos" aria-live="polite"></div>'+ 
   '<details class="cp-access-section" id="cpAccessSync"><summary>Relatórios e integração com a planilha <span>Expandir</span></summary>'+ 
   '<div class="cp-access-section-body"><p><a href="https://docs.google.com/spreadsheets/d/1tnOgWrN04AMiK88lkCCePeP3iOJ0AHnbN_91SpK5kyA/edit" target="_blank" rel="noopener noreferrer">Abrir planilha Cora Família · Acessos Calendário</a></p>'+
   '<div class="cp-audit-export"><div><strong>Histórico de acessos — fonte: Gestão</strong><p>Veja abaixo a ativação, o primeiro e último acesso e a contagem de logins. A planilha não controla permissões: recebe uma cópia destes dados quando a integração Google está autorizada.</p><p class="cp-mirror-status" id="cpMirrorStatus" role="status">Verificando conexão da planilha...</p></div><div class="cp-mirror-actions"><button type="button" id="cpSyncMirror" class="cp-btn" disabled>Sincronizar cópia no Google Sheets</button><button type="button" id="cpCopyAudit" class="cp-btn soft">Copiar relatório (alternativa manual)</button></div></div></div></details>'+
    '<details class="cp-access-section" id="cpAccessCreate"><summary>Cadastrar professor ou colaborador <span>Expandir</span></summary><div class="cp-access-section-body">'+ 
    '<div class="cp-invite-howto"><strong>Como o professor recebe a senha?</strong><p><b>1.</b> A Gestão cadastra o e-mail aqui (a planilha sozinha não cria a conta). <b>2.</b> Gere o convite e envie o link ao professor. <b>3.</b> O professor abre o link e cria uma senha pessoal. <b>4.</b> A conta muda de Pendente para Ativo. <b>Não existe envio automático de e-mail.</b></p></div>'+
   '<form id="cpAccountCreate" class="cp-account-form"><label>Nome completo<input name="name" required minlength="5" maxlength="100"></label><label>E-mail individual<input name="email" type="email" required></label>'+
   '<label>Função<select name="profile"><option>Professor</option><option>Coordenação</option><option>Funcionário</option></select></label>'+
   '<fieldset class="cp-segment-fieldset"><legend>Segmentos de atuação <small>(marque todos)</small></legend>'+segmentCheckboxes()+'</fieldset>'+
   '<button class="cp-btn" type="submit">Criar acesso e convite</button></form></div></details>'+
   '<div id="cpAccountInvite" class="cp-account-invite" hidden><strong id="cpInviteTitle">Convite gerado · aguardando envio</strong><p id="cpInviteDescription">O sistema gerou o link de ativação, mas <b>não enviou nenhum e-mail ainda</b>. Escolha uma das opções e entregue o convite apenas ao professor autorizado. Validade: 7 dias.</p>'+
   '<textarea id="cpAccountInviteUrl" readonly rows="3" aria-label="Link de ativação individual"></textarea><div class="cp-invite-buttons"><button type="button" id="cpCopyInvite" class="cp-btn soft">Copiar link de ativação</button><a id="cpEmailInvite" href="#" class="cp-btn" target="_self">Preparar e-mail de convite</a></div><p class="cp-invite-email-notice" id="cpInviteEmailNotice">Preparar e-mail abre o aplicativo de e-mail; você ainda precisa tocar em Enviar.</p></div>'+
   '<details class="cp-access-section" id="cpAccessPolicy"><summary>Segurança e política de acesso <span>Expandir</span></summary><div class="cp-access-section-body">'+
   '<div class="cp-account-cutover"><strong id="cpCutoverTitle">Acesso coletivo em migração</strong><p id="cpCutoverDescription">Cadastre e ative as contas antes de exigir login individual para toda a escola.</p><button id="cpEnforceIndividual" type="button" class="cp-btn gold">Exigir login individual para todos</button></div></div></details>'+
   '<p role="status" id="cpAccountsStatus" aria-live="polite"></p>'+ 
   '<section class="cp-access-directory" aria-label="Lista de colaboradores"><div id="cpAccessFilters"></div><div id="cpAccountsList"></div><div id="cpAccessPager"></div></section></section>');
  $('#cpPublishNow').insertAdjacentHTML('beforebegin','<button id="cpAccountsOpen" class="cp-btn soft" type="button">'+adminIcon('users')+'<span>Acessos da equipe</span></button>');
  $('#cpSyncMirror').onclick=async()=>{
   const button=$('#cpSyncMirror');button.disabled=true;
   try{
    const result=await api('accounts-sheet',{confirm:true});
    if(!result.synced)throw new Error(result.error||result.reason||'Google Sheets não configurado.');
    toast('Cópia administrativa atualizada: '+result.rows+' colaboradores.');
    await loadAccounts();
   }catch(error){$('#cpMirrorStatus').textContent='Falha de sincronização: '+(error.message||error)}
   finally{button.disabled=false}
  };
  $('#cpCopyAudit').onclick=async()=>{
   const button=$('#cpCopyAudit');button.disabled=true;
   try{
    const response=await api('accounts'),members=response.members||[];
    const fmt=iso=>iso?new Date(iso).toLocaleString('pt-BR',{timeZone:'America/Fortaleza',dateStyle:'short',timeStyle:'short'}):'';
    const escapeSheet=value=>{
     const clean=String(value??'').replace(/[\t\r\n]/g,' ').trim();
     return /^[=+@-]/.test(clean)?"'"+clean:clean;
    };
    const rows=[['E-mail de acesso','Nome do colaborador','Situação','Data de ativação','Primeiro acesso monitorado','Último acesso','Quantidade de acessos']];
    for(const member of members)rows.push([member.email,member.name,member.status,fmt(member.activatedAt),fmt(member.firstAccessAt),fmt(member.lastLogin),member.accessCount==null?'':member.accessCount]);
    const tsv=rows.map(row=>row.map(escapeSheet).join('\t')).join('\n');
    await navigator.clipboard.writeText(tsv);
    toast('Relatório copiado ('+members.length+' colaboradores). Cole na aba Auditoria de Logins da planilha, na célula A1.');
    const status=$('#cpAccountsStatus');if(status)status.textContent='Relatório copiado. Cole na aba Auditoria de Logins, célula A1. Esta transferência é manual.';
   }catch(e){toast('Não foi possível copiar relatório: '+e.message)}finally{button.disabled=false}
  };
  $('#cpAccountsOpen').onclick=()=>{$('#cpAccountsPanel').classList.remove('cp-hidden');void loadAccounts()};
  $('#cpAccountsClose').onclick=()=>$('#cpAccountsPanel').classList.add('cp-hidden');
  $('#cpEnforceIndividual').onclick=async()=>{
   if(!confirm('ATENÇÃO: depois da confirmação, a senha coletiva da Equipe deixará de abrir o calendário. Professores sem conta individual ativa não conseguirão entrar. Confirmar?'))return;
   try{
     await api('accounts-policy',{confirmed:true});individualRequired=true;toast('Login individual obrigatório ativado. Senha coletiva revogada.');
     await loadAccounts();
   }catch(error){$('#cpAccountsStatus').textContent=error.message}
  };
  $('#cpCopyInvite').onclick=async()=>{
    const link=$('#cpAccountInviteUrl').value;
    try{await navigator.clipboard.writeText(link);toast('Link copiado. Envie ao professor por mensagem ou e-mail.')}catch{window.prompt('Copie este link e envie ao professor:',link)}
  };
  $('#cpEmailInvite').onclick=()=>{
    $('#cpInviteEmailNotice').textContent='Abra o aplicativo de e-mail, confira o destinatário e toque em Enviar. Se nada abrir, copie o link acima e envie manualmente.';
  };
  $('#cpAccountCreate').onsubmit=async event=>{
    event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');button.disabled=true;
    try{
      const input=Object.fromEntries(new FormData(form).entries());input.segments=selectedSegments(form);
      if(!validSelectedSegments(input.segments))throw new Error('Marque um ou mais segmentos; Todos deve ser usado sozinho.');
      const result=await api('accounts',{...input,operation:'create'});
      showInvite(result.inviteUrl,result.member?.email);form.reset();await loadAccounts();
    }catch(error){$('#cpAccountsStatus').textContent=error.message}finally{button.disabled=false}
  };
  $('#cpAccountsList').onclick=async event=>{
    const btn=event.target.closest('[data-account-operation]');if(!btn)return;
    const operation=btn.dataset.accountOperation,email=btn.dataset.accountEmail,row=btn.closest('.cp-account-person');
    if(operation==='editSegments'){
      const editor=row?.querySelector('.cp-segment-editor');if(editor)editor.hidden=!editor.hidden;
      return;
    }
    const label={resetPassword:'Redefinir senha',suspend:'Suspender',disable:'Desativar',enable:'Reativar',reinvite:'Reemitir convite'}[operation];
    const confirmation=operation==='resetPassword'?'Gerar um link de recuperação para '+email+'? Confira a identidade do colaborador antes de compartilhar. A senha atual só será substituída quando ele criar uma nova.':label+' '+email+'?';
    if(operation!=='updateSegments'&&!confirm(confirmation))return;
    btn.disabled=true;
    try{
      const input={operation,email};
      if(operation==='updateSegments'){
        input.segments=selectedSegments(row.querySelector('.cp-segment-editor'));
        if(!validSelectedSegments(input.segments))throw new Error('Marque um ou mais segmentos; Todos deve ser usado sozinho.');
      }
      const result=await api('accounts',input);
      if(result.inviteUrl)showInvite(result.inviteUrl,result.member?.email);
      if(result.resetUrl)showInvite(result.resetUrl,result.member?.email,'recovery');
      await loadAccounts();
    }catch(error){$('#cpAccountsStatus').textContent=error.message}finally{btn.disabled=false}
  };
  $('#cpDefaultLead').value=String(leadDays);
  $('#cpPublishNow').textContent='Publicar '+year+' para equipe';
  const field=$('#cpNoticeEventDate');if(field){field.min=year+'-01-01';field.max=year+'-12-31';}
  window.addEventListener('cora-year-changed',e=>{
   if(role!=='gestao')return;
   year=Number(e.detail?.year)||2026;managerNotices=loadNoticeDraft(year);
   window.CoraMonthlyPublication=null;
   renderNoticeRows();
   const current=$('#cpPubStatus');if(current)current.textContent='Ano '+year+' · pronto para publicar';
   void checkYearSync(year);
   const btn=$('#cpPublishNow');if(btn)btn.textContent='Publicar '+year+' para equipe';
   const prepareButton=$('#cpPrepareSchoolYear');if(prepareButton)prepareButton.hidden=year<=2026;
   const reviewButton=$('#cpReviewImportedYear');if(reviewButton)reviewButton.hidden=year<=2026;
   for(const field of ['cpNoticeEventDate']){const input=$('#'+field);if(input){input.min=year+'-01-01';input.max=year+'-12-31';input.value=''}}
  });
  $('#cpTogglePanel').onclick=()=>$('#cpManagerPanel').classList.toggle('cp-hidden');
  $('#cpLogout').onclick=logout;$('#cpPublishNow').onclick=publish;$('#cpPublishPanel').onclick=publish;
  $('#cpDefaultLead').onchange=()=>{leadDays=Number($('#cpDefaultLead').value)||3;localStorage.setItem('cora_default_lead_days_'+year,String(leadDays))};
  const addNoticeBtn=$('#cpAddNotice'),saveFeedback=$('#cpNoticeSaveFeedback');
  function setNoticeState(state=''){
    const added=state==='saved',duplicate=state==='duplicate';
    addNoticeBtn.disabled=added||duplicate;
    addNoticeBtn.classList.toggle('cp-added',added||duplicate);
    addNoticeBtn.textContent=added?'✓ Aviso adicionado':duplicate?'✓ Aviso já cadastrado':'Adicionar aviso';
    saveFeedback.textContent=added?'✓ Aviso salvo como rascunho. Falta clicar em “Publicar para equipe”.':duplicate?'Este aviso já está na lista. Nenhuma cópia foi criada.':'';
  }
  ['cpNoticeTitle','cpNoticeBody','cpNoticeType','cpNoticePublish','cpNoticeEventDate','cpNoticeLead'].forEach(id=>{
    const input=$('#'+id);
    input.addEventListener('input',()=>{if(addNoticeBtn.disabled)setNoticeState();});
    input.addEventListener('change',()=>{if(addNoticeBtn.disabled)setNoticeState();});
  });
  addNoticeBtn.onclick=()=>{
    if(addNoticeBtn.disabled)return;
    const title=$('#cpNoticeTitle').value.trim(),body=$('#cpNoticeBody').value.trim();
    if(!title||!body){toast('Informe título e mensagem antes de adicionar.');return;}
    const notice={id:'msg-'+Date.now()+'-'+Math.random().toString(16).slice(2),title,body,type:$('#cpNoticeType').value,publishAt:$('#cpNoticePublish').value||isoNow(),expiresAt:'',eventDate:$('#cpNoticeEventDate').value,leadDays:Number($('#cpNoticeLead').value)||0};
    const normalize=s=>String(s||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');
    const duplicate=managerNotices.some(n=>normalize(n.title)===normalize(notice.title)&&normalize(n.body)===normalize(notice.body)&&String(n.eventDate||'')===notice.eventDate&&String(n.type||'')===notice.type);
    if(duplicate){setNoticeState('duplicate');toast('Este aviso já estava cadastrado. Não foi duplicado.');return;}
    managerNotices.push(notice);
    try{localStorage.setItem(noticeKey(year),JSON.stringify(managerNotices));}
    catch(e){managerNotices.pop();toast('Não foi possível salvar o aviso neste dispositivo.');return;}
    $('#cpNoticeTitle').value='';$('#cpNoticeBody').value='';
    setNoticeState('saved');
    renderNoticeRows();
    toast('✓ Aviso adicionado como rascunho. Publique para a Equipe Pedagógica receber.');
  };
  renderNoticeRows();
  api('state',undefined,'year='+year).then(x=>{
    const status=$('#cpPubStatus');
    if(status&&x.publication)status.textContent='Última publicação: '+new Date(x.publication.updatedAt).toLocaleString('pt-BR');
    // Somente a Gestão incorpora a lista institucional ao cadastro local.
    window.CoraBirthdays?.importBaseline?.(x.publication?.birthdays||[]);
    window.CoraBirthdays?.importConfirmedStaff?.(x.publication?.birthdays||[]);
    void checkYearSync(year);
  }).catch(()=>{void checkYearSync(year)});

 }
 function renderNoticeRows(){const area=$('#cpNoticeRows');if(!area)return;area.innerHTML=managerNotices.length?managerNotices.map(n=>`<div class="cp-notice-row"><span><span class="cp-notice-saved">✓ Adicionado</span> <strong>${safe(n.title)}</strong> · ${safe(n.type)} · ${safe(n.publishAt).replace('T',' ')}${n.eventDate?' · Evento '+safe(n.eventDate):''}</span><button class="cp-btn soft" data-cp-remove="${safe(n.id)}">Excluir</button></div>`).join(''):'<p class="cp-muted">Nenhum aviso criado. O calendário oficial ainda pode ser publicado.</p>';area.querySelectorAll('[data-cp-remove]').forEach(b=>b.onclick=()=>{managerNotices=managerNotices.filter(n=>n.id!==b.dataset.cpRemove);localStorage.setItem(noticeKey(year),JSON.stringify(managerNotices));renderNoticeRows()});}
 function showInvite(link,email='',kind='activation'){
  const recovery=kind==='recovery';
  $('#cpAccountInvite').hidden=false;$('#cpAccountInviteUrl').value=link;
  $('#cpInviteTitle').textContent=recovery?'Recuperação de senha · link gerado':'Convite gerado · aguardando envio';
  $('#cpInviteDescription').textContent=recovery
   ?'A senha atual permanece válida até o colaborador cadastrar uma nova. Este link individual expira em 24 horas, funciona uma única vez e deve ser entregue somente ao titular. Nenhum e-mail foi enviado automaticamente.'
   :'O convite de ativação expira em 7 dias. Envie o link apenas ao colaborador autorizado; nenhum e-mail foi enviado automaticamente.';
  $('#cpCopyInvite').textContent=recovery?'Copiar link de redefinição':'Copiar link de ativação';
  $('#cpEmailInvite').textContent=recovery?'Preparar e-mail de recuperação':'Preparar e-mail de convite';
  const mailSubject=recovery?'Colégio Cora Coralina — redefinição de senha':'Colégio Cora Coralina — ativação do Calendário';
  const mailBody=recovery
   ?'Olá!\n\nA Coordenação do Colégio Cora Coralina gerou um link individual de recuperação de acesso.\n\nAbra o link abaixo e crie uma nova senha pessoal com pelo menos 10 caracteres, letras e números:\n\n'+link+'\n\nO link expira em 24 horas e pode ser utilizado apenas uma vez. Não compartilhe este link. Seu cadastro e histórico de acessos serão mantidos. Após redefinir, entre novamente no aplicativo e confira as notificações.\n\nAtenciosamente,\nCoordenação Pedagógica'
   :'Olá!\n\nA Gestão do Colégio Cora Coralina autorizou seu acesso individual à Equipe Pedagógica do Calendário Anual.\n\nAbra o link abaixo, confira seu e-mail e defina uma senha pessoal com pelo menos 10 caracteres, letras e números:\n\n'+link+'\n\nO convite vale por 7 dias e pode ser usado apenas uma vez. Não compartilhe este link.\n\nAtenciosamente,\nCoordenação Pedagógica';
  $('#cpEmailInvite').href='mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent(mailSubject)+'&body='+encodeURIComponent(mailBody);
  $('#cpInviteEmailNotice').textContent='O e-mail não foi enviado. Confira o endereço e envie manualmente; o link também pode ser copiado.';
  $('#cpAccountsStatus').textContent=recovery
   ?'Link de redefinição criado para '+email+'. Entregue somente ao titular após conferir a identidade. O cadastro e o histórico foram preservados.'
   :'Convite gerado para '+email+'. Envie o link; a conta ficará Ativa após o professor criar a senha.';
  $('#cpAccountInvite').scrollIntoView({behavior:'smooth',block:'center'});
 }
 const fmtAccess=iso=>iso?new Date(iso).toLocaleString('pt-BR',{timeZone:'America/Fortaleza',dateStyle:'short',timeStyle:'short'}):'Ainda não registrado';
 async function loadAccounts(){
  const list=$('#cpAccountsList');if(!list)return;
  list.textContent='Consultando colaboradores...';
  try{
    const [data,policy,mirror]=await Promise.all([api('accounts'),api('accounts-policy'),api('accounts-sheet').catch(()=>({configured:false}))]);
    const syncButton=$('#cpSyncMirror'),syncStatus=$('#cpMirrorStatus');
    syncButton.disabled=!mirror.configured;
    const lastSync=mirror.lastSuccessAt?new Date(mirror.lastSuccessAt).toLocaleString('pt-BR',{timeZone:'America/Fortaleza'}):'nenhuma sincronização';
    syncStatus.textContent=mirror.configured?
      'Espelho Google conectado · última cópia: '+lastSync+(mirror.lastError?' · última falha: '+mirror.lastError:''):
      'Espelho Google não conectado. Os registros da Gestão estão disponíveis; a planilha depende de autorização Google. O relatório manual continua disponível.';
    const enforcing=policy.enforced===true;
    $('#cpEnforceIndividual').hidden=enforcing;
    $('#cpCutoverTitle').textContent=enforcing?'Login individual obrigatório':'Acesso coletivo ainda permitido';
    $('#cpCutoverDescription').textContent=enforcing?'A senha coletiva não permite mais consultar publicações. Suspender uma conta bloqueia o acesso imediatamente.':'Distribua os convites e confira as ativações. Depois, ative a exigência de login pessoal para todos.';
    if(window.CoraAccountsUI?.mount){window.CoraAccountsUI.mount(data.members||[],segmentCheckboxes);return}
    list.innerHTML=(data.members||[]).length?data.members.map(member=>{
     const operations=member.status==='Ativo'?['resetPassword','suspend','disable']:member.status==='Suspenso'?['enable','disable','reinvite']:member.status==='Desativado'?['enable']:['reinvite','disable'];
     const labels={resetPassword:'Redefinir senha',suspend:'Suspender',disable:'Desativar',enable:'Reativar',reinvite:'Reemitir convite'};
     return '<div class="cp-account-person"><div><strong>'+safe(member.name)+'</strong><small>'+safe(member.email)+' · '+safe(member.profile)+' · '+safe(member.segment)+'</small></div>'+
      '<span class="cp-account-status">'+(member.status==='Pendente'?'Aguardando ativação':safe(member.status))+'</span>'+
       '<div class="cp-account-audit"><span><b>Ativação</b>'+safe(fmtAccess(member.activatedAt))+'</span><span><b>Primeiro acesso monitorado</b>'+safe(fmtAccess(member.firstAccessAt))+'</span><span><b>Último acesso</b>'+safe(fmtAccess(member.lastLogin))+'</span><span><b>Acessos registrados</b>'+(member.accessCount==null?'Histórico anterior não disponível':String(member.accessCount))+'</span></div>'+
       '<div class="cp-account-buttons">'+operations.map(action=>
       '<button type="button" data-account-operation="'+action+'" data-account-email="'+safe(member.email)+'">'+labels[action]+'</button>').join('')+
       '<button type="button" data-account-operation="editSegments" data-account-email="'+safe(member.email)+'">Editar segmentos</button></div>'+
       '<div class="cp-segment-editor" hidden><strong>Segmentos de atuação</strong>'+segmentCheckboxes(member.segments||[])+
       '<button type="button" data-account-operation="updateSegments" data-account-email="'+safe(member.email)+'">Salvar segmentos</button></div></div>';
    }).join(''):'<p class="cp-muted">Ainda não há colaboradores cadastrados.</p>';
  }catch(error){list.textContent='Erro ao consultar colaboradores: '+error.message}
 }
 function recoveryGateway(){
  const params=new URLSearchParams(location.hash.slice(1));
  const code=params.get('redefinir')||'';
  if(!code)return false;
  const email=params.get('email')||'';
  role='';chosen='equipe';
  document.body.classList.add('portal-locked');
  document.body.classList.remove('portal-loading');
  root.innerHTML='<div class="cp-gateway"><div class="cp-login-shell"><div class="cp-login-head"><img id="cpRecoveryLogo" alt="Colégio Cora Coralina"><div><small>COLÉGIO CORA CORALINA · ACESSO INDIVIDUAL</small><h1>Redefinir minha senha</h1><p>Crie uma nova senha para continuar acessando o Calendário Escolar.</p></div></div>'+
   '<div class="cp-activation-help"><strong>Recuperação autorizada pela Gestão</strong><p>Este link é individual e expira em 24 horas. Sua nova senha substitui a anterior, sem excluir sua conta nem seu histórico. Após a troca, ative novamente as notificações do aparelho.</p></div>'+
   '<form id="cpRecoveryForm" class="cp-auth"><label>E-mail do colaborador<input id="cpRecoveryEmail" type="email" autocomplete="username" required></label>'+
   '<label>Nova senha (mínimo 10 caracteres, com letras e números)<input id="cpRecoveryPassword" type="password" minlength="10" maxlength="120" autocomplete="new-password" required></label>'+
   '<label>Confirme a nova senha<input id="cpRecoveryConfirmation" type="password" minlength="10" maxlength="120" autocomplete="new-password" required></label>'+
   '<button class="cp-btn" type="submit">Salvar minha nova senha</button><p id="cpRecoveryError" class="cp-error" role="alert"></p></form>'+
   '<div class="cp-activation-footer"><button type="button" class="cp-btn soft" id="cpRecoveryBack">Voltar ao login</button></div></div></div>';
  $('#cpRecoveryLogo').src=logo();
  $('#cpRecoveryEmail').value=email;
  $('#cpRecoveryBack').onclick=()=>{
   history.replaceState(null,'',location.pathname+location.search);
   gateway();
  };
  $('#cpRecoveryForm').onsubmit=async event=>{
   event.preventDefault();
   const button=$('#cpRecoveryForm button[type=submit]');
   const password=$('#cpRecoveryPassword').value,confirmation=$('#cpRecoveryConfirmation').value;
   if(password!==confirmation){$('#cpRecoveryError').textContent='As senhas não conferem. Digite novamente.';return}
   if(password.length<10||!/[A-Za-zÀ-ÿ]/.test(password)||!/[0-9]/.test(password)){
    $('#cpRecoveryError').textContent='A senha precisa ter no mínimo 10 caracteres, incluindo letras e números.';return;
   }
   button.disabled=true;
   try{
    const reply=await api('reset-password',{email:$('#cpRecoveryEmail').value.trim(),code,password});
    history.replaceState(null,'',location.pathname+location.search);
    role=reply.role;chosen='equipe';
    await enter();
   }catch(error){
    $('#cpRecoveryError').textContent=error.message||'Não foi possível redefinir a senha. Solicite outro link à Gestão.';
    button.disabled=false;
   }
  };
  return true;
 }
 function activationGateway(manual=false){
  const params=new URLSearchParams(location.hash.slice(1)),initialCode=params.get('ativar')||'',email=params.get('email')||'';
  if(!initialCode&&!manual)return false;
  role='';document.body.classList.add('portal-locked');document.body.classList.remove('portal-loading');
  root.innerHTML='<div class="cp-gateway"><div class="cp-login-shell"><div class="cp-login-head"><img id="cpActivationLogo" alt="Colégio Cora Coralina"><div><small>PRIMEIRO ACESSO · EQUIPE PEDAGÓGICA</small><h1>Ativar minha conta</h1><p>Use o link ou código fornecido pela Gestão e crie sua senha pessoal.</p></div></div>'+
   '<div class="cp-activation-help"><strong>Como ativar</strong><p>1. A Gestão cadastra seu e-mail e gera um convite. 2. Abra o link recebido ou cole abaixo o link/código. 3. Crie sua senha pessoal. O e-mail cadastrado na planilha, sozinho, não libera o acesso.</p></div>'+
   '<form id="cpActivationForm" class="cp-auth"><label>E-mail autorizado<input id="cpActivationEmail" type="email" autocomplete="username" required></label>'+
   '<label>Link ou código de convite<input id="cpActivationCode" type="text" autocomplete="off" required spellcheck="false" placeholder="Cole o link recebido da Gestão"></label>'+
   '<label>Nova senha pessoal (mínimo 10 caracteres, com letras e números)<input id="cpActivationPassword" type="password" minlength="10" maxlength="120" autocomplete="new-password" required></label>'+
   '<button class="cp-btn" type="submit">Criar minha senha e ativar conta</button><p id="cpActivationError" class="cp-error" role="alert"></p></form>'+
   '<div class="cp-activation-footer"><button id="cpBackToLogin" type="button" class="cp-btn soft">Voltar ao login</button></div></div></div>';
  $('#cpActivationLogo').src=logo();$('#cpActivationEmail').value=email;
  $('#cpActivationCode').value=initialCode;
  $('#cpBackToLogin').onclick=()=>{history.replaceState(null,'',location.pathname+location.search);chosen='equipe';gateway()};
  $('#cpActivationForm').onsubmit=async event=>{
   event.preventDefault();const button=$('#cpActivationForm button');button.disabled=true;
   try{
    const raw=$('#cpActivationCode').value.trim();
    let code=raw;
    if(raw.includes('#ativar=')){
      const hash=raw.slice(raw.indexOf('#')+1);
      code=new URLSearchParams(hash).get('ativar')||'';
    }
    if(!code)throw new Error('Não encontrei o código no convite. Solicite outro link à Gestão.');
    const response=await api('activate',{email:$('#cpActivationEmail').value.trim(),code,password:$('#cpActivationPassword').value});
    history.replaceState(null,'',location.pathname+location.search);
    role=response.role;chosen='equipe';await enter();
   }catch(error){$('#cpActivationError').textContent=error.message||'Não foi possível ativar. Confira e-mail e convite.';button.disabled=false}
  };
  return true;
 }
 let monthPublicationBusy=false;
 async function publishApprovedMonth(targetYear,targetMonth){
  const y=Number(targetYear),m=Number(targetMonth);
  if(role!=='gestao'){toast('A publicação requer acesso administrativo da Gestão.');return false}
  if(y!==Number(window.CoraYears?.activeYear)||y<=2026||!Number.isInteger(m)||m<0||m>11){
   toast('Selecione um mês e ano letivo válidos na Gestão.');return false
  }
  if(monthPublicationBusy)return false;
  const drafts=loadEventDraft(y).filter(e=>Number(String(e.date||'').slice(5,7))===m+1);
  const pending=drafts.filter(e=>e.status==='Em revisão'||e.needsReview);
  const approved=drafts.filter(e=>e.status!=='Em revisão'&&!e.needsReview);
  const monthName=window.CoraMonthPublication?.MONTHS?.[m]||'mês selecionado';
  if(!approved.length){
   toast('Não há eventos aprovados em '+monthName+'. Confira as datas importadas primeiro.');
   window.CoraYearReview?.requestOpen?.(y,m);
   return false;
  }
  const preview=approved.slice(0,10).map(e=>String(e.date||'').slice(8,10)+'/'+String(e.date||'').slice(5,7)+' — '+String(e.title||'')).join('\n');
  if(!window.confirm('PUBLICAR '+monthName.toUpperCase()+' DE '+y+' PARA A EQUIPE?\n\n'+
   approved.length+' evento(s) aprovado(s) serão enviados.\n'+
   pending.length+' evento(s) ainda em revisão NÃO serão enviados.\n\n'+preview+
   (approved.length>10?'\n... e mais '+(approved.length-10)+' evento(s).':'')+
   '\n\nAs publicações dos outros meses serão preservadas. Confirma as datas?'))return false;
  monthPublicationBusy=true;let posted=false;
  try{
   const response=await api('state',undefined,'year='+y);
   if(y!==Number(window.CoraYears?.activeYear))throw Error('O ano letivo mudou. Repita a operação.');
   const previous=response.publication;
   const payload=window.CoraMonthPublication?.makePayload?.({
    year:y,month:m,previous,approved,
    birthdays:window.CoraBirthdays?.all?.()||[],
    projects:window.CoraYears?.getProjects?.(y)||[],
    defaultLeadDays:leadDays
   });
   if(!payload)throw Error('Preparação do mês indisponível. Atualize o aplicativo.');
   await api('publish',payload);posted=true;
   const confirmation=await api('state',undefined,'year='+y);
   if(!window.CoraMonthPublication.matches(confirmation.publication,approved))
    throw Error('Servidor não confirmou todos os eventos. Verifique a publicação antes de repetir.');
   const savedCount=(confirmation.publication?.events||[]).filter(e=>Number(String(e.date||'').slice(5,7))===m+1).length;
   toast('✓ '+monthName+' '+y+': '+savedCount+' evento(s) publicados e confirmados na Equipe. Outros meses preservados.');
   await checkYearSync(y);
   return true;
  }catch(error){
   toast((posted?'A publicação foi enviada, mas precisa de conferência: ':'Não foi possível publicar o mês: ')+(error.message||'Falha desconhecida.'));
   return false;
  }finally{monthPublicationBusy=false}
 }
 async function publish(){
  const year=Number(window.CoraYears?.activeYear)||2026;const {drafts,ready:events}=publicationCandidates(year);
  const pending=drafts.filter(e=>e.status==='Em revisão'||e.needsReview);
  const btn=$('#cpPublishNow');if(!btn)return;
  if(pending.length&&!confirm('Atenção: '+pending.length+' evento(s) de '+year+' ainda estão em revisão e NÃO serão enviados à Equipe. Deseja publicar somente os eventos aprovados?'))return;
  btn.disabled=true;
  try{
   // Evita que uma primeira publicação apague o cadastro institucional anterior.
   const previous=await api('state',undefined,'year='+year);
   window.CoraBirthdays?.importBaseline?.(previous.publication?.birthdays||[]);
   window.CoraBirthdays?.importConfirmedStaff?.(previous.publication?.birthdays||[]);
   const birthdays=window.CoraBirthdays?.all?.()||previous.publication?.birthdays||[];
   const stages=(window.CoraStages?.get?.(year)||[]).map(s=>s.needsReview?{number:s.number,start:'',end:''}:s);const projects=window.CoraYears?.getProjects?.(year)||[];
   const res=await api('publish',{year,events,notices:managerNotices,birthdays,stages,projects,config:{defaultLeadDays:leadDays}});
   $('#cpPubStatus').textContent='Publicado: '+new Date(res.updatedAt).toLocaleString('pt-BR');
   const status=res.push?.registered
     ?' · Web Push: '+res.push.sent+' envio(s) aceitos entre '+res.push.registered+' aparelho(s) cadastrado(s)'
     :' · Web Push: nenhum aparelho inscrito';
   toast('Publicado '+year+': '+res.counts.events+' eventos e '+res.counts.notices+' comunicados'+status+'.');
   void checkYearSync(year);
  }catch(e){toast('Não foi possível publicar: '+e.message);}finally{btn.disabled=false;}
 }

 function cpTeamIcon(name){
  const shapes={
   bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
   refresh:'<path d="M20 11a8 8 0 0 0-14.6-4.4L3 9"/><path d="M3 3v6h6"/><path d="M4 13a8 8 0 0 0 14.6 4.4L21 15"/><path d="M15 15h6v6"/>',
   download:'<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v4h16v-4"/>',
   exit:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
   alerts:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>'
  };
  return '<svg class="cp-action-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(shapes[name]||'')+'</svg>';
 }
 function teamNav(){return `<header class="cp-team-head" aria-label="Navegação da Equipe Pedagógica">
   <div class="cp-head-top">
     <div class="cp-head-brand"><img id="cpTeamLogo" alt="Brasão do Colégio Cora Coralina"><div class="cp-head-title"><small>COLÉGIO CORA CORALINA</small><h1>Equipe Pedagógica</h1></div></div>
     <div class="cp-head-tools" aria-label="Ações rápidas">
       <button class="cp-btn cp-icon-button cp-bell" type="button" id="cpBell" title="Central de notificações" aria-label="Abrir notificações">${cpTeamIcon('bell')}<em id="cpBellCount" style="display:none">0</em></button>
       <button class="cp-btn cp-icon-button" type="button" id="cpRefresh" title="Atualizar dados" aria-label="Atualizar dados">${cpTeamIcon('refresh')}<span class="cp-action-label">Atualizar</span></button>
       <button class="cp-btn cp-icon-button cp-logout" type="button" id="cpTeamLogout" title="Sair da conta" aria-label="Sair da conta">${cpTeamIcon('exit')}<span class="cp-action-label">Sair</span></button>
     </div>
   </div>
   <div class="cp-head-bottom">
     <label class="cp-year-label">Ano letivo <select id="cpTeamYear" aria-label="Selecionar ano letivo">${availableYears.map(y=>`<option value="${y}" ${year===y?'selected':''}>${y}</option>`).join('')}</select></label>
     <div class="cp-head-bottom-actions">
       <button class="cp-btn soft cp-alert-button" type="button" id="cpEnableAlerts" title="Ativar notificações mesmo com o aplicativo fechado">${cpTeamIcon('alerts')}<span class="cp-alert-label">Ativar notificações</span></button>
       <button class="cp-btn cp-install-app" type="button" id="cpInstallApp" title="Instalar ou atualizar a Agenda Cora neste dispositivo">${cpTeamIcon('download')}<span>${isHomeScreenApp()?'Atualizar aplicativo':'Instalar aplicativo'}</span></button>
     </div>
   </div>
 </header>`}


 // Conta individual autenticada fornece o nome; nunca reutilizar o e-mail digitado sem validação.
 function shortWelcomeName(full){
  const words=String(full||'').trim().split(/\s+/).filter(Boolean);
  if(!words.length)return 'professor(a)';
  const compact=words.length>2?[words[0],words[words.length-1]]:words;
  return compact.map(w=>w.toLocaleLowerCase('pt-BR').replace(/(^|[-’'])\p{L}/gu,v=>v.toLocaleUpperCase('pt-BR'))).join(' ');
 }
 const isIOSDevice=()=>/iPad|iPhone|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const isHomeScreenApp=()=>Boolean(window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true);
 function showAppInstallGuide(){
  if(typeof window.CoraInstallApp?.open==='function'){window.CoraInstallApp.open();return}
  const entry=document.getElementById('installCalendarApp');
  if(entry){entry.click();return}
  const dialog=document.getElementById('calendarInstallDialog');
  if(dialog&&typeof dialog.showModal==='function'&&!dialog.open){dialog.showModal();return}
  toast('No iPhone, abra o calendário no Safari, toque em Compartilhar e escolha Adicionar à Tela de Início.');
 }
 function renderTeamWelcome(){
  const area=$('#cpWelcome');if(!area||role!=='equipe')return;
  const fullName=teacherProfile?.name||'';
  const greeting='Olá, '+shortWelcomeName(fullName)+'!';
  const needsIOSInstall=isIOSDevice()&&!isHomeScreenApp();
  const supported=!needsIOSInstall&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
  const blocked=supported&&Notification.permission==='denied';
  const info=pushConfirmed
   ?'<div class="cp-welcome-push is-enabled"><span class="cp-welcome-push-symbol" aria-hidden="true">✓</span><div><strong>Notificações ativadas</strong><small>Seu aparelho está cadastrado para avisos da Gestão.</small></div></div>'
   :!pushChecked
    ?'<div class="cp-welcome-push"><span class="cp-welcome-push-symbol" aria-hidden="true">◌</span><div><strong>Verificando notificações</strong><small>Consultando as permissões deste aparelho.</small></div></div>'
    :blocked
     ?'<div class="cp-welcome-push needs-setup"><span class="cp-welcome-push-symbol" aria-hidden="true">!</span><div><strong>Notificações bloqueadas</strong><small>Autorize o Calendário em Ajustes → Notificações no aparelho.</small></div></div>'
     :needsIOSInstall
      ?'<div class="cp-welcome-push needs-setup"><span class="cp-welcome-push-symbol" aria-hidden="true">i</span><div><strong>Instale no iPhone</strong><small>Abra no Safari, toque em Compartilhar → Adicionar à Tela de Início. Depois abra o ícone para ativar as notificações.</small></div><button type="button" id="cpWelcomeInstallIOS">Como instalar</button></div>'
     :!supported
      ?'<div class="cp-welcome-push"><span class="cp-welcome-push-symbol" aria-hidden="true">i</span><div><strong>Notificações não disponíveis</strong><small>Verifique o navegador e a versão do sistema. No iPhone, é necessário iOS 16.4 ou superior e abrir o app instalado.</small></div></div>'
      :'<div class="cp-welcome-push needs-setup"><span class="cp-welcome-push-symbol" aria-hidden="true">!</span><div><strong>Ative as notificações</strong><small>Receba avisos da Gestão e lembretes de entregas.</small></div><button type="button" id="cpWelcomeEnablePush">Ativar agora</button></div>';
  area.innerHTML='<div class="cp-welcome-person"><span class="cp-welcome-avatar" aria-hidden="true">'+
   safe((fullName.trim()[0]||'P').toLocaleUpperCase('pt-BR'))+
   '</span><div><small>ACESSO À EQUIPE PEDAGÓGICA</small><h2>'+safe(greeting)+'</h2></div></div>'+info;
  $('#cpWelcomeEnablePush')?.addEventListener('click',enableLocalNotifications);
  $('#cpWelcomeInstallIOS')?.addEventListener('click',showAppInstallGuide);
 }
 async function team(){teamStats=null;teamStatsAt=0;teamStatsLoading=false;teamStatsError='';teacherProfile=null;pushChecked=false;pushConfirmed=false;const deep=new URLSearchParams(location.search);year=Number(deep.get('ano'))||2026;if(deep.get('avisos')==='1')showBell=true;document.body.classList.add('portal-locked');document.body.classList.remove('portal-loading');root.innerHTML=`<div class="cp-team">${teamNav()}<div class="cp-team-main"><section id="cpWelcome" class="cp-welcome" aria-label="Boas-vindas e notificações"></section><div id="cpView"><p class="cp-muted">Carregando publicações da Gestão...</p></div></div></div>`;$('#cpTeamLogo').src=logo();$('#cpTeamLogout').onclick=logout;$('#cpRefresh').onclick=refresh;$('#cpEnableAlerts').onclick=enableLocalNotifications;$('#cpInstallApp').onclick=showAppInstallGuide;$('#cpBell').onclick=()=>{showBell=!showBell;drawTeam()};$('#cpTeamYear').onchange=e=>{year=Number(e.target.value)||2026;month=0;showBell=false;tab='resumo';refresh()};window.CoraHelpdesk?.mount('equipe',root);await refresh();void confirmDevicePush();clearInterval(timer);timer=setInterval(()=>{if(!document.hidden)refresh()},30000);}
 async function refresh(){try{const [result,identity]=await Promise.all([api('state',undefined,'year='+year),api('delivery-profile',undefined,'year='+year).catch(()=>({identified:false,statuses:{}}))]);teacherProfile=identity.identified?identity:null;availableYears=Array.isArray(result.availableYears)?result.availableYears:[2026];data=result.publication;
    const newNoticeIds=new Set(activeNotices().map(n=>String(n.id)));
    const knownIds=seenPublicationIds.get(year);
    if(knownIds){
      const fresh=(data?.notices||[]).filter(n=>newNoticeIds.has(String(n.id))&&!knownIds.has(String(n.id)));
      if(fresh.length&&role==='equipe'){
        vibrationFeedback();
        toast(fresh.length===1?'🔔 Novo aviso da Gestão: '+fresh[0].title:'🔔 '+fresh.length+' novos comunicados da Gestão. Toque no sininho.');
      }
    }
    seenPublicationIds.set(year,newNoticeIds);
    const picker=$('#cpTeamYear');if(picker){picker.innerHTML=availableYears.map(y=>`<option value="${y}" ${year===y?'selected':''}>${y}</option>`).join('');picker.value=String(year)}renderTeamWelcome();drawTeam();if(tab==='equipe')void loadTeamStats();checkLocalNotifications()}catch(e){if(e.status===401){clearInterval(timer);gateway('Sessão expirada. Entre novamente.');return;}toast('Falha ao atualizar: '+e.message);}}


 // Marcadores de leitura são separados das notificações entregues ao aparelho.
 // A versão anterior marcava mensagens como 'notificadas' antes de exibi-las.
 const deliveredKey=()=>('cora_team_delivered_v2_'+year);
 let deliveringAlerts=false;
 function vibrationFeedback(){
   try{return Boolean(navigator.vibrate&&navigator.vibrate([180,90,180]))}catch{return false}
 }
 async function showDeviceNotice(title,body,tag){
   if(!('serviceWorker' in navigator)||!('Notification' in window)||Notification.permission!=='granted')return false;
   try{
     const registration=await navigator.serviceWorker.ready;
     await registration.showNotification(String(title).slice(0,150),{
       body:String(body||'').slice(0,270),tag:'cora-'+tag,icon:'./app-icon-192.png',badge:'./app-icon-192.png',
       vibrate:[180,90,180],silent:false,renotify:false,data:{url:'./?avisos=1'}
     });
     return true;
   }catch(error){console.warn('Aviso do aparelho indisponível',error);return false}
 }

 const urlBase64ToUint8=base64=>{
  const padding='='.repeat((4-base64.length%4)%4);
  const raw=atob((base64+padding).replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from(raw,ch=>ch.charCodeAt(0));
 };
 async function registerDeviceForPush(){
  if(isIOSDevice()&&!isHomeScreenApp())throw new Error('No iPhone, instale o calendário pelo Safari em Compartilhar → Adicionar à Tela de Início e abra o ícone instalado.');
  if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){
   throw new Error('Este aparelho não oferece Web Push neste modo. No iPhone, é necessário iOS 16.4 ou superior e o app aberto pela Tela de Início.');
  }
  let permission=Notification.permission;
  if(permission!=='granted')permission=await Notification.requestPermission();
  if(permission!=='granted')throw new Error('Permissão não concedida. Verifique os ajustes de notificações do aparelho.');
  const config=await api('push-key');
  if(!config?.publicKey)throw new Error('O servidor de notificações ainda não está pronto.');
  const reg=await navigator.serviceWorker.ready;
  let subscription=await reg.pushManager.getSubscription();
  if(subscription){
   const k=subscription.options?.applicationServerKey;
   if(k){
    const existing=btoa(String.fromCharCode(...new Uint8Array(k))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    if(existing!==config.publicKey){await subscription.unsubscribe();subscription=null}
   }
  }
  if(!subscription)subscription=await reg.pushManager.subscribe({
   userVisibleOnly:true,applicationServerKey:urlBase64ToUint8(config.publicKey)
  });
  await api('push-register',{subscription:subscription.toJSON()});
  localStorage.setItem('cora_team_push_active','1');
  localStorage.setItem('cora_team_device_alerts_enabled','1');
  return subscription;
 }
 async function enableLocalNotifications(){
  if(isIOSDevice()&&!isHomeScreenApp()){showAppInstallGuide();return}
  const button=$('#cpEnableAlerts');
  const welcomeButton=$('#cpWelcomeEnablePush');if(welcomeButton){welcomeButton.disabled=true;welcomeButton.textContent='Ativando...'}
  if(button){button.disabled=true;button.textContent='Conectando...'}
  try{
   const subscription=await registerDeviceForPush();
   updatePushButton(true);
   try{
     const result=await api('push-test',{subscription:subscription.toJSON()});
     toast(result.sent?'Dispositivo cadastrado! Teste enviado: confira as notificações do aparelho.':'Dispositivo cadastrado; teste ainda não confirmado.');
   }catch(testError){
     toast('Celular inscrito, mas o teste de envio falhou: '+String(testError.message||testError));
   }
  }catch(e){
   toast('Não foi possível ativar o push: '+String(e?.message||e));
   updatePushButton(false);
  }finally{if(button)button.disabled=false}
 }
 function updatePushButton(active){
  pushChecked=true;pushConfirmed=Boolean(active);
  const button=$('#cpEnableAlerts');if(!button){renderTeamWelcome();return;}
  button.classList.toggle('cp-push-active',Boolean(active));
  const label=button.querySelector('.cp-alert-label');
  const caption=active?'Notificações ativas':(isIOSDevice()&&!isHomeScreenApp()?'Instalar no iPhone':'Ativar notificações');
  if(label)label.textContent=caption;else button.textContent=caption;
  button.title=active?'Este aparelho está inscrito para receber avisos publicados pela Gestão.':(isIOSDevice()&&!isHomeScreenApp()?'Instale pelo Safari e abra o ícone da Tela de Início para ativar os avisos.':'Ative as notificações para receber avisos com o aplicativo fechado.');
  renderTeamWelcome();
 }
 async function confirmDevicePush(){
  if(role!=='equipe')return;
  if(!('serviceWorker' in navigator)||!('PushManager' in window)){updatePushButton(false);return}
  try{
   const reg=await navigator.serviceWorker.ready;
   const sub=await reg.pushManager.getSubscription();
   if(sub&&Notification.permission==='granted'){
    await api('push-register',{subscription:sub.toJSON()});
    localStorage.setItem('cora_team_push_active','1');updatePushButton(true);
   }else updatePushButton(false);
  }catch{updatePushButton(false)}
 }
 async function checkLocalNotifications(){
   if(deliveringAlerts||role!=='equipe'||!data||!('Notification' in window)||Notification.permission!=='granted')return;
   if(localStorage.getItem('cora_team_device_alerts_enabled')!=='1')return;
  const serverPushActive=localStorage.getItem('cora_team_push_active')==='1';
   deliveringAlerts=true;
   try{
     let ids=[];
     try{ids=JSON.parse(localStorage.getItem(deliveredKey())||'[]')}catch{}
     const known=new Set(Array.isArray(ids)?ids:[]);
     const now=Date.now();
     // Avisos recém-publicados ou lembretes ativos. Não bombardear com todo o histórico.
     const pending=upcoming().filter(a=>{
       if(!a.unread||known.has(a.id))return false;
       if(serverPushActive&&a.kind!=='assessment-deadline')return false;
       if(a.kind!=='notice')return true;
       const source=(data.notices||[]).find(n=>String(n.id)===String(a.id));
       const published=Date.parse(source?.publishAt||'');
       return !Number.isFinite(published)||now-published<=7*86400000;
     }).slice(0,3);
     let delivered=0;
     for(const item of pending){
       if(await showDeviceNotice(item.title,item.desc||item.type||'Comunicado',year+'-'+item.id)){
         known.add(item.id);delivered++;
       }
     }
     if(delivered){
       vibrationFeedback();
       try{localStorage.setItem(deliveredKey(),JSON.stringify([...known].slice(-500)))}catch{}
     }
   }finally{deliveringAlerts=false}
 }
 function publishedBirthdays(){
  return (Array.isArray(data?.birthdays)?data.birthdays:[])
    .filter(p=>p&&p.name&&Number(p.day)>=1&&Number(p.day)<=31&&Number(p.month)>=1&&Number(p.month)<=12)
    .sort((a,b)=>Number(a.month)-Number(b.month)||Number(a.day)-Number(b.day)||String(a.name).localeCompare(String(b.name),'pt-BR'));
 }
 function birthdayEntry(p){
  const date=String(p.day).padStart(2,'0')+'/'+String(p.month).padStart(2,'0');
  return `<article class="cp-list-entry cp-birthday-entry"><time>${safe(date)}</time><div><strong>${safe(p.name)}</strong><span class="cp-tag">Aniversário</span>${p.role?`<p>${safe(p.role)}</p>`:''}</div></article>`;
 }
 const isSecond=e=>/2[ªaº°]?\s*chamada|segunda\s+chamada/i.test(`${e.title} ${e.notes||''}`);
 const isAssessment=e=>/avaliaç|avaliação|simulado|sondagem|recomposiç|prova/i.test(`${e.title} ${e.type||''}`);
 function filteredEvents(){return (data?.events||[]).filter(e=>String(e.date||'').startsWith(year+'-')).sort((a,b)=>a.date.localeCompare(b.date))}
 function activeNotices(){const now=new Date();return (data?.notices||[]).filter(n=>{const start=n.publishAt?new Date(n.publishAt):null;const end=n.expiresAt?new Date(n.expiresAt):null;return (!start||start<=now)&&(!end||end>=now)}).sort((a,b)=>String(b.publishAt||'').localeCompare(String(a.publishAt||'')))}

 // Comunicados são mensagens imediatamente disponíveis. A antecedência cria lembretes extras.
 const dayDifference=iso=>{
   if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso||'')))return null;
   const [y,m,d]=iso.split('-').map(Number),today=new Date();
   return Math.round((Date.UTC(y,m-1,d)-Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()))/86400000);
 };
 function upcoming(){
   if(!data)return [];
   let previous=[];try{previous=JSON.parse(localStorage.getItem('cora_team_seen_alerts_'+year)||'[]')}catch{}
   const seen=new Set(Array.isArray(previous)?previous:[]);
   const notices=activeNotices().map(n=>({id:String(n.id),kind:'notice',
     title:n.title,desc:String(n.body||n.type||''),type:n.type||'Informativo',
     date:n.eventDate||String(n.publishAt||'').slice(0,10)}));
   const dmax=Math.max(0,Number(data.config?.defaultLeadDays??3));
   const events=filteredEvents().filter(e=>{
     if(e.assessmentDelivery||e.type==='Entrega de conteúdo')return false;
     const delta=dayDifference(e.date);return delta!==null&&delta>=0&&delta<=dmax;
   }).map(e=>({id:'event-'+e.id,kind:'event',title:e.title,date:e.date,desc:e.notes||e.type||'',
     type:e.type||'Atividade'}));
   const reminders=activeNotices().filter(n=>{
     if(!n.eventDate)return false;
     const delta=dayDifference(n.eventDate);
     return delta!==null&&delta>=0&&delta<=Math.max(0,Number(n.leadDays||0));
   }).map(n=>({id:'reminder-'+n.id+'-'+n.eventDate,kind:'reminder',
     title:'Lembrete: '+n.title,date:n.eventDate,desc:String(n.body||n.type||''),
     type:n.type||'Informativo'}));
   const assessmentDeadlines=filteredEvents().filter(e=>e.assessmentDelivery).filter(e=>{if(teacherProfile?.statuses?.[e.stageNumber]?.status==='entregue')return false;const delta=dayDifference(e.date),current=dateStr(new Date());const stage=(data?.stages||[]).find(s=>Number(s.number)===Number(e.stageNumber));const active=stage?.start&&stage?.end&&current>=stage.start&&current<=stage.end;return (delta!==null&&delta>=0&&delta<=5)||Boolean(active&&delta<0);}).map(e=>({id:'deadline-'+e.id+'-'+e.date,kind:'assessment-deadline',title:'Lembrete: entregar avaliações — '+e.stageNumber+'ª etapa',date:e.date,desc:'Encaminhe '+(e.deliveryTypes||'as avaliações')+' à coordenação até '+e.date.split('-').reverse().join('/')+'. Fundamental: '+(e.fundamentalEmail||'coordenacaofundamentalcora@gmail.com')+'. Médio: '+(e.medioEmail||'coordenacaomediocora@gmail.com')+'.',type:'Entrega de avaliações'}));
    const contents=filteredEvents().filter(e=>e.type==='Entrega de conteúdo').filter(e=>{const delta=dayDifference(e.date);return delta!==null&&delta>=0&&delta<=5;}).map(e=>({id:'content-'+e.id+'-'+e.date,kind:'assessment-deadline',title:'Lembrete: entrega de conteúdo',date:e.date,desc:(e.title||'Entrega de conteúdo')+' · '+(e.notes||'Encaminhar à coordenação pedagógica até a data prevista.'),type:'Entrega de conteúdo'}));
    return [...notices,...reminders,...assessmentDeadlines,...contents,...events].map(n=>({...n,unread:!seen.has(n.id)}));
 }
 function eventHtml(e){const stage=(data?.stages||[]).find(st=>st.start&&st.end&&e.date>=st.start&&e.date<=st.end);return `<article class="cp-list-entry"><time>${safe(e.date.slice(8,10))}/${safe(e.date.slice(5,7))}</time><div><strong>${safe(e.title)}</strong><span class="cp-tag">${safe(e.type||'Atividade')}</span>${stage?`<span class="cp-tag cp-tag-stage">${stage.number}ª etapa · até ${safe(stage.end.slice(8,10)+'/'+stage.end.slice(5,7))}</span>`:''}${e.notes?`<p>${safe(e.notes)}</p>`:''}</div></article>`}
 function noticeHtml(n){return `<article class="cp-notice ${n.type==='Urgente'?'urgent':''}"><small>${safe(n.type)} · ${safe((n.publishAt||'').replace('T',' '))}</small><h3>${safe(n.title)}</h3><p>${safe(n.body)}</p>${n.eventDate?`<small>Data relacionada: ${safe(n.eventDate)} · Alerta ${Number(n.leadDays)||0} dia(s) antes</small>`:''}</article>`}
 function cpTeamTileIcon(name){
  const shapes={
   calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
   check:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 9h18m-12 6 2 2 4-4"/>',
   clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
   people:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 1-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
   message:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8v.5Z"/><path d="M8.5 11.5h8"/>',
   pdf:'<path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z"/><path d="M13 3v7h7M8 14h8M8 18h6"/>',
   install:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>'
  };
  return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(shapes[name]||shapes.calendar)+'</svg>';
 }
 function drawTeam(){const here=$('#cpView');if(!here)return;
  // Preserva identificações e correções digitadas durante atualizações automáticas.
  if(tab==='correcao'&&!showBell&&$('#coraGrader')?.querySelector('#cgTestForm, #cgResultForm'))return;
  const events=filteredEvents(),notes=activeNotices(),assess=events.filter(e=>isAssessment(e)&&!isSecond(e)),alertList=upcoming(),unread=alertList.filter(a=>a.unread).length;
  const badge=$('#cpBellCount');if(badge){badge.style.display=unread?'block':'none';badge.textContent=unread>99?'99+':String(unread);badge.setAttribute('aria-label',unread+' alertas não lidos')}const bell=$('#cpBell');if(bell){bell.classList.toggle('has-unread',unread>0);bell.setAttribute('aria-label',unread?unread+' alertas novos. Abrir notificações':'Abrir notificações')}
  const annualSource={year,month,events,stages:Array.isArray(data?.stages)?data.stages:[],
   birthdays:publishedBirthdays(),projects:Array.isArray(data?.projects)?data.projects:[]};
  const sameYearView=window.CoraTeacherCalendar;
  const fullYearSummary=()=>sameYearView?.yearSummary?.(annualSource,{selectedMonth:month})||'';
  const compactYearSummary=()=>sameYearView?.yearSummary?.(annualSource,{selectedMonth:month,compact:true})||'';
  const selectedMonthGrid=(assessmentOnly=false,pdf=false)=>sameYearView?.monthGrid?.(
   {...annualSource,events:assessmentOnly?assess:events,
    birthdays:assessmentOnly?[]:annualSource.birthdays,projects:assessmentOnly?[]:annualSource.projects},{pdf,assessmentsOnly:assessmentOnly})||'';
  const sections=[['resumo','Visão Geral'],['calendario','Calendário '+year],['feriados','Feriados e dias letivos'],['etapas','Etapas letivas'],['avaliacoes','Avaliações e Simulados'],['entregas','Prazos de entrega'],['aniversarios','🎂 Aniversariantes'],['avisos','Avisos'],['equipe','Equipe em números'],['correcao','Corretor de gabaritos'],['pdf','PDF Anual']];
  const tabs=`<div class="cp-tabs">${sections.map(([id,label])=>`<button class="${tab===id?'active':''}" data-cp-tab="${id}">${label}</button>`).join('')}</div>`;
  const alertPrompt=!showBell&&unread?'<button type="button" id="cpUnreadPrompt" class="cp-unread-banner">🔔 '+unread+' alerta(s) não lido(s) · Toque para ver os recados da Gestão</button>':'';

  const fmtStage=date=>date?date.slice(8,10)+'/'+date.slice(5,7):'A definir';
  const stageList=Array.isArray(data?.stages)?data.stages:[];
  const todayISO=dateStr(new Date());
  const currentStage=stageList.find(st=>st.start&&st.end&&todayISO>=st.start&&todayISO<=st.end);
  const closestStage=currentStage||stageList.find(st=>st.start&&st.start>todayISO)||stageList.find(st=>st.start);
  const quickLinks=[['calendario','calendar','Calendário','Atividades e projetos'],['feriados','calendar','Feriados','Aulas e recessos'],['avaliacoes','check','Avaliações','Provas e simulados'],
    ['entregas','clock','Entregas','Prazos e e-mails'],['avisos','message','Comunicados','Orientações da Gestão'],['equipe','people','Equipe em números','Professores e acessos'],['correcao','check','Corretor de gabaritos','Captura e notas da turma'],['pdf','pdf','PDF anual','Documento completo']].map(item=>
    '<button type="button" class="cp-flow-link" data-cp-tab="'+item[0]+'"><span class="cp-flow-icon">'+cpTeamTileIcon(item[1])+'</span>'+
    '<span><strong>'+item[2]+'</strong><small>'+item[3]+'</small></span></button>').join('')+
    '<button type="button" class="cp-flow-link cp-install-shortcut" id="cpQuickInstall" aria-label="'+(isHomeScreenApp()?'Atualizar':'Instalar')+' aplicativo Agenda Cora">'+
    '<span class="cp-flow-icon">'+cpTeamTileIcon('install')+'</span><span><strong>'+(isHomeScreenApp()?'Atualizar aplicativo':'Instalar aplicativo')+'</strong><small>'+(isHomeScreenApp()?'Orientações e ícone do app':'Android e iPhone')+'</small></span></button>';
  // Área de ferramentas externas da Equipe; usa a marca original do Gestor Escolar.
  const roteiroIcon='<img src="google-sheets-icon.svg?v=20261102" width="41" height="41" alt="" loading="lazy" />';
  const gestorIcon='<img src="gestor-escolar-icon.svg?v=20261102" width="41" height="41" alt="" loading="lazy" />';
  // Abrimos o endereço oficial do Classroom: o atalho "Agenda" depende da conta e da interface Google.
  const classroomIcon='<img src="google-classroom-icon.svg?v=20261102" width="41" height="41" alt="" loading="lazy" />';
  const saeIcon='<img src="sae-digital-icon.svg?v=20261102" width="41" height="41" alt="" loading="lazy" />';
  const openIcon='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5h6v6M19 5l-9 9"></path><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"></path></svg>';
  const teacherTools='<section class="cp-teacher-tools" aria-labelledby="cpTeacherToolsTitle">'+
   '<div class="cp-teacher-tools-head"><div><small>ACESSOS PEDAGÓGICOS</small><h3 id="cpTeacherToolsTitle">Ferramentas do professor</h3></div><span>Roteiros, notas, agenda e materiais digitais</span></div>'+
   '<div class="cp-teacher-tools-grid">'+
    '<a class="cp-teacher-tool" href="'+TEACHER_LINKS.roteiros+'" target="_blank" rel="noopener noreferrer" aria-label="Abrir planilha de roteiros para professores do Fundamental II e Ensino Médio em nova aba">'+
     '<span class="cp-teacher-tool-icon cp-teacher-tool-roteiros" aria-hidden="true">'+roteiroIcon+'</span>'+
     '<span class="cp-teacher-tool-copy"><strong>Digitação de roteiros</strong><small>Professores do Fundamental II e Ensino Médio</small></span>'+
     '<span class="cp-teacher-tool-open" aria-hidden="true">'+openIcon+'</span></a>'+
    '<a class="cp-teacher-tool" href="'+TEACHER_LINKS.gestor+'" target="_blank" rel="noopener noreferrer" aria-label="Abrir Gestor Escolar para digitação de notas em nova aba">'+
     '<span class="cp-teacher-tool-icon cp-teacher-tool-gestor" data-tool-icon="gestor" aria-hidden="true">'+gestorIcon+'</span>'+
     '<span class="cp-teacher-tool-copy"><strong>Gestor Escolar</strong><small>Digitação de notas</small></span>'+
     '<span class="cp-teacher-tool-open" aria-hidden="true">'+openIcon+'</span></a>'+
    '<a class="cp-teacher-tool" href="'+TEACHER_LINKS.classroom+'" target="_blank" rel="noopener noreferrer" aria-label="Abrir Google Sala de Aula para consultar a agenda das turmas em nova aba">'+
     '<span class="cp-teacher-tool-icon cp-teacher-tool-classroom" aria-hidden="true">'+classroomIcon+'</span>'+
     '<span class="cp-teacher-tool-copy"><strong>Agenda do Classroom</strong><small>Atividades e prazos das turmas</small></span>'+
     '<span class="cp-teacher-tool-open" aria-hidden="true">'+openIcon+'</span></a>'+
    '<a class="cp-teacher-tool" href="'+TEACHER_LINKS.sae+'" target="_blank" rel="noopener noreferrer" aria-label="Abrir SAE Digital em nova aba">'+
     '<span class="cp-teacher-tool-icon cp-teacher-tool-sae" aria-hidden="true">'+saeIcon+'</span>'+
     '<span class="cp-teacher-tool-copy"><strong>SAE Digital</strong><small>Portal e recursos pedagógicos</small></span>'+
     '<span class="cp-teacher-tool-open" aria-hidden="true">'+openIcon+'</span></a>'+
   '</div></section>';
  const previewEvents=events.filter(e=>e.date>=todayISO&&String(e.title||'').trim()).slice(0,2);
  const preview='<section class="cp-next-preview"><div class="cp-next-preview-head"><h3>Próximos compromissos</h3><button type="button" data-cp-tab="calendario">Ver agenda completa ›</button></div>'+
   (previewEvents.length?'<div class="cp-next-preview-grid">'+previewEvents.map(e=>
    '<button type="button" class="cp-next-preview-item" data-cp-tab="calendario"><span class="cp-next-preview-date"><strong>'+safe(e.date.slice(8,10))+'</strong><small>'+safe(MONTHS[Number(e.date.slice(5,7))-1]?.slice(0,3)||'Mês')+'</small></span><span class="cp-next-preview-info"><strong>'+safe(e.title)+'</strong><small>'+safe(e.type||'Atividade escolar')+'</small></span></button>').join('')+'</div>':
    '<div class="cp-next-preview-empty">Nenhum compromisso futuro publicado para este ano.</div>')+'</section>';
  const flowHeader=(showBell||tab!=='resumo')?'':'<section class="cp-flow-hero"><div class="cp-flow-hero-text">'+
   '<small>COLÉGIO CORA CORALINA · EQUIPE PEDAGÓGICA</small><h2>Seu ano letivo, organizado.</h2>'+
   '<p>Uma visão clara das atividades, avaliações e informações da Gestão para '+year+'.</p>'+
   '<div class="cp-flow-tags"><span>'+events.length+' atividades</span><span>'+assess.length+' avaliações</span><span>'+notes.length+' comunicados</span></div></div>'+
   '<div class="cp-flow-feature"><small>ETAPAS DO ANO · '+year+'</small><strong>'+(closestStage?closestStage.number+'ª etapa':'Períodos letivos')+'</strong>'+
   '<span>'+(closestStage?fmtStage(closestStage.start)+' até '+fmtStage(closestStage.end):'A definir pela Gestão')+'</span>'+
   '<button type="button" data-cp-tab="etapas">Consultar etapas ›</button></div></section>'+
   fullYearSummary()+
   '<div class="cp-quick-header"><h3>Acesso rápido</h3><small>Ferramentas do ano letivo</small></div>'+
   '<div class="cp-flow-links">'+quickLinks+'</div>'+
   preview+
   teacherTools;
  let content='';
  if(tab==='correcao'&&!showBell){
   content=window.CoraGrader?.placeholder()||'<p>Corretor indisponível. Recarregue o aplicativo.</p>';
  }else if(tab==='equipe'&&!showBell){
   content=teamStats?window.CoraTeamStats?.render(teamStats)||'<p class="cp-muted">Painel indisponível.</p>':
    '<section class="cp-team-metrics"><div class="cp-main-heading"><h2>Equipe em números</h2></div><p class="cp-muted">'+(teamStatsError?'Não foi possível carregar: '+safe(teamStatsError):'Consultando indicadores da equipe...')+'</p><button type="button" class="cp-btn soft" id="cpRetryTeamStats">Atualizar indicadores</button></section>';
  }else if(!data){content='<div class="cp-paper"><h2>Nenhuma publicação disponível</h2><p class="cp-muted">A Gestão ainda não publicou o calendário e os comunicados para a equipe. O conteúdo ficará disponível aqui após a primeira publicação.</p></div>'}
  else if(showBell){content=`<div class="cp-bell-panel"><div class="cp-main-heading"><div class="cp-alert-heading-left"><button type="button" class="cp-btn soft cp-back-alert" id="cpBackFromBell" aria-label="Voltar à Equipe Pedagógica">← Voltar</button><h2>🔔 Central de alertas</h2></div><button class="cp-btn soft" id="cpMarkRead">Marcar como lidos</button></div>${alertList.length?alertList.map(a=>`<article class="cp-alert-entry ${a.unread?'unread':''}"><time>${safe(String(a.date||'').slice(0,10))}</time><div><small>${a.kind==='notice'?'Comunicado da Gestão':a.kind==='reminder'?'Lembrete programado':'Evento próximo'}</small><strong>${safe(a.title)}</strong><p>${safe(a.desc||'')}</p>${a.unread?'<span class="cp-tag cp-tag-new">Novo · não lido</span>':''}</div><button class="cp-btn soft" type="button" data-cp-read="${safe(a.id)}">✓ Lido</button></article>`).join(''):'<p class="cp-muted">Nenhuma atividade ou aviso exige atenção no período configurado.</p>'}</div>`;}
  else if(tab==='resumo'){
   const now=new Date();
   const thisMonth=year===now.getFullYear()?now.getMonth()+1:month+1;
   const birthdayList=publishedBirthdays().filter(p=>Number(p.month)===thisMonth);
   const nextMonth=thisMonth===12?1:thisMonth+1;
   const nextBirthdays=publishedBirthdays().filter(p=>Number(p.month)===nextMonth);
   content=`<div class="cp-birthday-teaser"><div class="cp-main-heading"><h2>🎂 Aniversariantes de ${MONTHS[thisMonth-1]}</h2><button class="cp-btn soft" id="cpSeeBirthdays">Ver todos os meses</button></div>
   <div class="cp-list">${birthdayList.length?birthdayList.map(birthdayEntry).join(''):'<p class="cp-muted">Nenhum aniversariante publicado para este mês.</p>'}</div><div class="cp-birthday-next"><strong>Próximo mês · ${MONTHS[nextMonth-1]}</strong><div class="cp-birthday-preview">${nextBirthdays.length?nextBirthdays.map(p=>`<span>${safe(String(p.day).padStart(2,'0'))}/${safe(String(p.month).padStart(2,'0'))} · ${safe(p.name)}</span>`).join(''):'<span>Nenhum aniversariante cadastrado</span>'}</div></div></div>
   <h2 style="color:#12375e;margin-top:28px">Comunicados recentes</h2>${notes.slice(0,3).map(noticeHtml).join('')||'<p class="cp-muted">Sem avisos recentes.</p>'}`;
  }else if(tab==='feriados'){
   content=window.CoraHolidays?.teacherPanel?.(year,events,'all')||'<p>Calendário de feriados indisponível.</p>';
  }else if(tab==='calendario'||tab==='avaliacoes'){
   const arr=(tab==='avaliacoes'?assess:events).filter(e=>Number(e.date.slice(5,7))===month+1);
   const yearOverview=compactYearSummary();

   const annualBirthdays=tab==='calendario'
     ?'<details class="cp-birthday-calendar-list"><summary><strong>Ver os aniversariantes do ano inteiro</strong></summary><div class="cp-annual-birthday-grid">'+
       MONTHS.map((name,i)=>{
        const people=publishedBirthdays().filter(p=>Number(p.month)===i+1);
        return '<article class="cp-annual-birthday-card"><strong>'+safe(name)+'</strong>'+
          (window.CoraCalendarBirthdays?.listHTML?.(people)||'<p>Sem registros</p>')+'</article>';
       }).join('')+'</div></details>':'';
   content=`<div class="cp-main-heading"><h2>${tab==='avaliacoes'?'Avaliações, simulados e sondagens':'Calendário escolar'}</h2><select id="cpMonthPicker" aria-label="Mês do calendário">${MONTHS.map((m,i)=>`<option value="${i}" ${month===i?'selected':''}>${m} de ${year}</option>`).join('')}</select></div>
   ${selectedMonthGrid(tab==='avaliacoes')}
   ${arr.length?'<details class="cp-calendar-agenda" open><summary>'+ (tab==='avaliacoes'?'Avaliações e simulados':'Compromissos do mês')+' · '+arr.length+'</summary><div class="cp-list">'+arr.map(eventHtml).join('')+'</div></details>':
     '<p class="cp-calendar-empty-note">'+(tab==='avaliacoes'?'Nenhuma avaliação aprovada e publicada em '+MONTHS[month]+' de '+year+'.':
      'Nenhuma atividade pedagógica aprovada e publicada em '+MONTHS[month]+' de '+year+'. Os projetos e aniversariantes já aparecem no próprio calendário. A Gestão pode ter eventos aguardando revisão.')+'</p>'}
   ${tab==='calendario'?'<div class="cg-toolbar"><button class="cp-btn gold" id="cpDownloadMonth" type="button">↓ PDF completo de '+safe(MONTHS[month])+'</button></div>':''}${yearOverview}${annualBirthdays}`;
  }else if(tab==='entregas'){
    const rows=events.filter(e=>e.assessmentDelivery).sort((a,b)=>Number(a.stageNumber)-Number(b.stageNumber));
    const contents=events.filter(e=>e.type==='Entrega de conteúdo').sort((a,b)=>a.date.localeCompare(b.date));
    const fmt=d=>d?d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4):'A definir';
    const fundamental='coordenacaofundamentalcora@gmail.com',medio='coordenacaomediocora@gmail.com';
    const today=dateStr(new Date()),profile=teacherProfile,stages=data?.stages||[];
    const isActive=n=>{const st=stages.find(x=>Number(x.number)===n);return Boolean(st?.start&&st?.end&&today>=st.start&&today<=st.end)};
    const names=['Primeira','Segunda','Terceira','Quarta'];
    const identified=Boolean(profile?.identified);
    const identityHtml='<div class="cp-delivery-identity is-authenticated"><div><small>IDENTIFICAÇÃO PESSOAL</small><strong>'+safe(profile?.name||'Professor')+'</strong><p>Conta institucional: '+safe(profile?.email||'')+'. Seus registros são individuais.</p></div></div>';
    const cards=rows.length?rows.map(e=>{
      const stage=Number(e.stageNumber),state=profile?.statuses?.[stage],value=state?.status||'pendente';
      const ended=e.date<today,active=isActive(stage);
      const highlight=active&&value!=='entregue';
      const heading=value==='entregue'?'Entregue — registro realizado':value==='nao_entregou'?'Não entregou · atenção necessária':active?'Pendente de confirmação':'Sem confirmação registrada';
      const detail=state?.updatedAt?' · registrado em '+new Date(state.updatedAt).toLocaleDateString('pt-BR'):'';
      return '<article class="cp-delivery-stage cp-delivery-stage-'+stage+(highlight?' is-focus needs-action':'')+(value==='entregue'?' is-delivered':'')+'" data-delivery-stage="'+stage+'">'+
       '<div class="cp-delivery-stage-top"><div class="cp-delivery-stage-step"><span>'+String(stage).padStart(2,'0')+'</span><div><small>'+names[stage-1]+' etapa</small><strong>'+stage+'ª etapa · '+year+'</strong></div></div>'+
       '<span class="cp-delivery-time '+(active?'is-active':'')+'">'+(active?'Etapa em andamento':ended?'Prazo encerrado':'Prazo programado')+'</span></div>'+
       '<div class="cp-delivery-body"><div><small>ENTREGA À COORDENAÇÃO</small><h3>'+fmt(e.date)+'</h3><p>'+safe(e.deliveryTypes||'AP2 / AD / AR')+'</p></div>'+
       '<div class="cp-delivery-personal '+(value==='entregue'?'done':value==='nao_entregou'?'late':'pending')+'">'+
       '<span class="cp-delivery-alarm" aria-hidden="true">'+(value==='entregue'?'✓':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg>')+'</span>'+
       '<div><small>MINHA SITUAÇÃO</small><strong>'+heading+'</strong><p>'+(identified?'Informado pelo professor'+detail:'Identifique-se acima para registrar')+'</p></div></div></div>'+
       '<div class="cp-delivery-action-row"><button type="button" class="cp-delivery-action is-submit" data-cp-delivery-status="entregue" data-cp-delivery-stage="'+stage+'" '+(!identified?'disabled':'')+' aria-pressed="'+(value==='entregue')+'">✓ Entregue</button>'+
       '<button type="button" class="cp-delivery-action is-missing" data-cp-delivery-status="nao_entregou" data-cp-delivery-stage="'+stage+'" '+(!identified?'disabled':'')+' aria-pressed="'+(value==='nao_entregou')+'">Não entregou</button></div>'+
       '<details class="cp-delivery-contact"><summary>Ver e-mails da coordenação</summary><div>Ensino Fundamental: <a href="mailto:'+fundamental+'">'+fundamental+'</a><br>Ensino Médio: <a href="mailto:'+medio+'">'+medio+'</a></div></details>'+
       '</article>';
    }).join(''):[1,2,3,4].map(n=>
      '<article class="cp-delivery-stage"><div class="cp-delivery-stage-top"><div class="cp-delivery-stage-step"><span>'+String(n).padStart(2,'0')+'</span><div><small>'+names[n-1]+' etapa</small><strong>'+n+'ª etapa · '+year+'</strong></div></div>'+
      '<span class="cp-delivery-time">A definir pela Gestão</span></div>'+
      '<p class="cp-muted">Nenhum prazo de entrega aprovado e publicado para esta etapa. O registro do professor será habilitado quando houver uma data confirmada.</p></article>'
    ).join('');
    content='<div class="cp-main-heading"><h2>Entregas pedagógicas · '+year+'</h2></div>'+
     '<p class="cp-muted">Acompanhe os prazos por etapa. A marcação é uma declaração pessoal, não confirma o recebimento do arquivo pela coordenação.</p>'+
     identityHtml+'<p class="cp-delivery-feedback" id="cpDeliveryFeedback" role="status" aria-live="polite"></p>'+
     '<div class="cp-delivery-stage-grid">'+cards+'</div>'+
     '<div class="cp-main-heading" style="margin-top:24px"><h2>Entrega de conteúdos à coordenação</h2></div>'+
     (contents.length?contents.map(e=>'<article class="cp-deadline-card"><small>'+fmt(e.date)+'</small><h3>'+safe(e.title)+'</h3><p>'+safe(e.notes||'Conteúdo pedagógico programado para entrega')+'</p><p class="cp-deadline-count">Lembrete: 5 dias antes</p></article>').join(''):'<p class="cp-muted">Nenhuma entrega de conteúdo publicada para este ano.</p>');
  }else if(tab==='etapas'){
   const stages=Array.isArray(data?.stages)?data.stages:[];
   const fmt=val=>val?val.slice(8,10)+'/'+val.slice(5,7)+'/'+val.slice(0,4):'A definir';
   content='<div class="cp-main-heading"><h2>Etapas letivas de '+year+'</h2><select id="cpStagePicker" aria-label="Selecionar etapa"><option value="0">Todas as etapas</option>'+[1,2,3,4].map(n=>'<option value="'+n+'" '+(selectedStage===n?'selected':'')+'>'+n+'ª etapa</option>').join('')+'</select></div><p class="cp-muted">Consulte os limites de cada etapa para planejar avaliações e simulados.</p>'+
   '<div class="cp-stage-grid">'+[1,2,3,4].filter(n=>!selectedStage||n===selectedStage).map(number=>{
     const st=stages.find(x=>Number(x.number)===number)||{};
     const today=dateStr(new Date());
     const active=st.start&&st.end&&today>=st.start&&today<=st.end;
     return '<article class="cp-stage-card '+(active?'active':'')+'"><strong>'+number+'ª etapa</strong><span>Início: '+fmt(st.start)+'</span><span>Fim: '+fmt(st.end)+'</span>'+(active?'<small>Etapa em andamento</small>':'')+'</article>';
   }).join('')+'</div>';
  }else if(tab==='aniversarios'){
   const names=publishedBirthdays().filter(p=>Number(p.month)===month+1);
   content=`<div class="cp-birthday-panel"><div class="cp-main-heading"><h2>🎂 Aniversariantes do mês</h2><select id="cpMonthPicker" aria-label="Escolher mês dos aniversariantes">${MONTHS.map((m,i)=>`<option value="${i}" ${month===i?'selected':''}>${m}</option>`).join('')}</select></div>
    <p class="cp-muted">Consulte também os próximos meses e prepare as homenagens com antecedência.</p>
    <div class="cp-list">${names.length?names.map(birthdayEntry).join(''):'<p class="cp-muted">Nenhum aniversariante informado neste mês.</p>'}</div></div>`;
  }else if(tab==='avisos')content=`<div class="cp-main-heading"><h2>Avisos da Gestão</h2></div>${notes.length?notes.map(noticeHtml).join(''):'<p class="cp-muted">Ainda não há avisos para a equipe.</p>'}`;
  else if(year===2026) content=`<div class="cp-main-heading"><h2>Calendário anual oficial 2026</h2><select id="cpMonthPicker" aria-label="Mês do PDF">${MONTHS.map((m,i)=>`<option value="${i}" ${month===i?'selected':''}>${m} de ${year}</option>`).join('')}</select></div><div class="cp-pdf-sample"><div class="cp-paper"><img class="cp-pdf-image" id="cpPdfMonth" alt="Página do calendário oficial do mês selecionado"><p class="cp-muted">Visualização do documento institucional; conteúdo somente para consulta.</p></div><div class="cp-paper"><h3>Calendário oficial para download</h3><p class="cp-muted">Arquivo com capa, 12 meses e anotações, em formato PDF. Selecione o mês para visualizar a página correspondente.</p><button class="cp-btn gold" id="cpDownloadOfficial">↓ Baixar calendário completo (PDF)</button><p class="cp-status" id="cpPdfProgress"></p></div></div>`;
  else content=`<div class="cp-main-heading"><h2>Calendário anual ${year}</h2><select id="cpMonthPicker" aria-label="Mês da prévia do calendário">${MONTHS.map((m,i)=>`<option value="${i}" ${month===i?'selected':''}>${m} de ${year}</option>`).join('')}</select></div>
   <div class="cp-paper"><h3>Prévia mensal · ${MONTHS[month]} de ${year}</h3><p class="cp-muted">Visualização do conteúdo publicado para o mês. O PDF inclui a grade do calendário e a relação completa das atividades, com títulos, datas e observações disponíveis. Os dados vêm da publicação da Gestão.</p>
   ${selectedMonthGrid(false,true)}
   <div class="cg-toolbar"><button class="cp-btn gold" id="cpDownloadMonth" type="button">↓ PDF mensal completo</button>
    <button class="cp-btn gold" id="cpDownloadPublished" type="button">↓ PDF anual completo</button></div>
   <p class="cp-status" id="cpPdfProgress"></p></div>${compactYearSummary()}`;

  here.innerHTML=`${showBell?'':`<div class="cp-overview"><div class="cp-metric"><small>Atividades publicadas</small><strong>${events.length}</strong></div><div class="cp-metric"><small>Avaliações e simulados</small><strong>${assess.length}</strong></div><div class="cp-metric"><small>Avisos disponíveis</small><strong>${notes.length}</strong></div></div>${tabs}`}${flowHeader}${alertPrompt}${content}<p class="cp-updated">Última publicação da Gestão: ${data?new Date(data.updatedAt).toLocaleString('pt-BR'):'ainda não publicada'} · Atualização automática enquanto o aplicativo estiver aberto.</p>`;
  if(tab==='correcao'&&!showBell)window.CoraGrader?.mount({root:here,callApi:api,toast,profile:teacherProfile});
  here.querySelectorAll('[data-cp-delivery-status]').forEach(button=>button.addEventListener('click',async()=>{
    if(teacherSaving||!teacherProfile?.identified)return;
    const stage=Number(button.dataset.cpDeliveryStage),status=button.dataset.cpDeliveryStatus;
    if(!confirm('Registrar a '+stage+'ª etapa como "'+(status==='entregue'?'Entregue':'Não entregou')+'" para '+teacherProfile.name+'?'))return;
    teacherSaving=true;
    const buttons=here.querySelectorAll('[data-cp-delivery-status]');buttons.forEach(x=>x.disabled=true);
    try{
      const result=await api('delivery-mark',{year,stage,status});
      teacherProfile={...teacherProfile,statuses:result.statuses};
      drawTeam();toast('Situação da '+stage+'ª etapa registrada: '+(status==='entregue'?'Entregue':'Não entregou')+'.');
    }catch(error){buttons.forEach(x=>x.disabled=false);toast('Não foi possível registrar: '+error.message)}
    finally{teacherSaving=false}
  }));

  here.querySelectorAll('[data-cp-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.cpTab;showBell=false;drawTeam();if(tab==='equipe')void loadTeamStats()});
  $('#cpRetryTeamStats')?.addEventListener('click',()=>{void loadTeamStats(true)});
  $('#cpUpdateTeamStats')?.addEventListener('click',()=>{void loadTeamStats(true)});
  here.querySelector('#cpQuickInstall')?.addEventListener('click',showAppInstallGuide);
  here.querySelectorAll('[data-cp-stage]').forEach(b=>b.onclick=()=>{selectedStage=Number(b.dataset.cpStage)||0;tab='etapas';showBell=false;drawTeam()});
  $('#cpMonthPicker')?.addEventListener('change',e=>{month=Number(e.target.value);drawTeam()});
  here.querySelectorAll('[data-cp-month]').forEach(button=>button.addEventListener('click',()=>{
   month=Number(button.dataset.cpMonth)||0;drawTeam();
  }));
  here.querySelectorAll('[data-cp-open-month]').forEach(button=>button.addEventListener('click',()=>{
   month=Number(button.dataset.cpOpenMonth)||0;
   tab='calendario';showBell=false;drawTeam();
  }));
  $('#cpStagePicker')?.addEventListener('change',e=>{selectedStage=Number(e.target.value)||0;drawTeam()});
  $('#cpBackFromBell')?.addEventListener('click',()=>{showBell=false;drawTeam();});
  $('#cpUnreadPrompt')?.addEventListener('click',()=>{showBell=true;drawTeam()});
  here.querySelectorAll('[data-cp-read]').forEach(button=>button.addEventListener('click',()=>{
    const k='cora_team_seen_alerts_'+year;let ids=[];
    try{ids=JSON.parse(localStorage.getItem(k)||'[]')}catch{}
    const seen=new Set(Array.isArray(ids)?ids:[]);seen.add(button.dataset.cpRead);
    localStorage.setItem(k,JSON.stringify([...seen]));drawTeam();
  }));
  $('#cpMarkRead')?.addEventListener('click',()=>{let arr=[];try{arr=JSON.parse(localStorage.getItem('cora_team_seen_alerts_'+year)||'[]')}catch{}const seen=new Set(Array.isArray(arr)?arr:[]);upcoming().forEach(a=>seen.add(a.id));localStorage.setItem('cora_team_seen_alerts_'+year,JSON.stringify([...seen]));drawTeam()});
  $('#cpSeeBirthdays')?.addEventListener('click',()=>{tab='aniversarios';month=new Date().getMonth();showBell=false;drawTeam();});
  $('#cpDownloadOfficial')?.addEventListener('click',()=>downloadPdf(null));
  $('#cpDownloadPublished')?.addEventListener('click',()=>downloadPublishedPdf(null));
  $('#cpDownloadMonth')?.addEventListener('click',()=>year===2026?downloadPdf(month):downloadPublishedPdf(month));
  if(tab==='pdf'&&year===2026&&!showBell&&data)loadPage(month+2).then(url=>{const x=$('#cpPdfMonth');if(x)x.src=url}).catch(()=>toast('Imagem indisponível neste momento.'));
 }
 const loaded={};function loadPage(page){if(window.CORA_OFFICIAL_PAGE_DATA?.[page])return Promise.resolve(window.CORA_OFFICIAL_PAGE_DATA[page]);if(loaded[page])return loaded[page];loaded[page]=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=`./official-page-${String(page).padStart(2,'0')}.js`;s.onload=()=>window.CORA_OFFICIAL_PAGE_DATA?.[page]?resolve(window.CORA_OFFICIAL_PAGE_DATA[page]):reject(new Error('Página ausente'));s.onerror=reject;document.head.append(s)});return loaded[page]}

 async function downloadPublishedPdf(monthOnly=null){
  const single=Number.isInteger(monthOnly)&&monthOnly>=0&&monthOnly<12;
  const btn=$(single?'#cpDownloadMonth':'#cpDownloadPublished'),status=$('#cpPdfProgress');if(btn)btn.disabled=true;
  try{
   const W=1684,H=1350,stageList=Array.isArray(data?.stages)?data.stages:[],all=filteredEvents();
   const logo=window.CORA_SCHOOL_LOGO||window.CORA_STUDIO_ASSETS?.logo||'';
   const image=logo?await new Promise(resolve=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>resolve(null);i.src=logo}):null;
   const paintText=(g,v,x,y,size=25,color='#163759',bold=true)=>{
     g.font=(bold?'700 ':'400 ')+size+'px Arial, sans-serif';g.fillStyle=color;g.fillText(String(v),x,y);
   };
   const ellipsis=(g,v,max)=>{let t=String(v);while(t.length>3&&g.measureText(t).width>max)t=t.slice(0,-2)+'…';return t};
   const make=(month)=>{
     const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
     g.fillStyle='#fff';g.fillRect(0,0,W,H);
     g.fillStyle='#0d315b';g.fillRect(0,0,W,148);g.fillStyle='#ffca2a';g.fillRect(0,148,W,8);
     paintText(g,MONTHS[month].toUpperCase(),70,84,65,'#fff');paintText(g,String(year),1342,86,68,'#ffda49');
     paintText(g,'COLÉGIO CORA CORALINA · CALENDÁRIO PEDAGÓGICO',72,127,21,'#cce3fb');
     if(image)g.drawImage(image,1510,9,101,130);
     const x=65,top=225,cw=(W-130)/7,rows=6,ch=125;
     const days=['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
     days.forEach((name,j)=>{g.fillStyle='#1e6696';g.fillRect(x+j*cw+1,174,cw-2,44);paintText(g,name,x+j*cw+14,203,22,'#fff')});
     const start=new Date(year,month,1).getDay(),last=new Date(year,month+1,0).getDate();
     const events=all.filter(e=>Number(e.date.slice(5,7))===month+1);
     const birthdayPeople=publishedBirthdays().filter(p=>Number(p.month)===month+1);
     const marks=stageList.filter(st=>st.start?.startsWith(year+'-'+String(month+1).padStart(2,'0'))||st.end?.startsWith(year+'-'+String(month+1).padStart(2,'0')));
     for(let ix=0;ix<rows*7;ix++){
       const col=ix%7,row=Math.floor(ix/7),day=ix-start+1,cx=x+col*cw,cy=top+row*ch;
       g.fillStyle=day<1||day>last?'#f3f6fa':col===0?'#fff2f0':'#fff';
       g.fillRect(cx+1,cy+1,cw-2,ch-2);g.strokeStyle='#cbd8e5';g.strokeRect(cx,cy,cw,ch);
       if(day<1||day>last)continue;
       paintText(g,day,cx+10,cy+29,25);
       const iso=year+'-'+String(month+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
       const dayEvents=events.filter(a=>a.date===iso);
       dayEvents.slice(0,3).forEach((e,i)=>{const y=cy+55+i*23;g.fillStyle='#dcecfb';g.fillRect(cx+6,y-18,cw-12,22);paintText(g,ellipsis(g,e.title,cw-22),cx+10,y,15,'#204f7d')});
       if(dayEvents.length>3)paintText(g,'+'+(dayEvents.length-3)+' atividades',cx+8,cy+118,13,'#5e7389');
       const born=birthdayPeople.filter(p=>Number(p.day)===day);
       if(born.length){
        g.fillStyle='#ffebae';g.fillRect(cx+cw-84,cy+6,78,26);
        paintText(g,'ANIV. '+born.length,cx+cw-78,cy+25,14,'#76550f');
       }
       const stage=marks.find(st=>st.start===iso||st.end===iso);
       if(stage)paintText(g,(stage.start===iso?'INÍCIO ':'FIM ')+stage.number+'ª',cx+73,cy+28,14,'#ad5500');
     }
     g.fillStyle='#ecf4fc';g.fillRect(65,988,W-130,126);
     paintText(g,'PROJETOS DO MÊS',75,1017,23);
     const projects=Array.isArray(data?.projects?.[month])?data.projects[month]:[];
     projects.slice(0,8).forEach((v,i)=>paintText(g,ellipsis(g,v,700),85+(i%2)*760,1050+Math.floor(i/2)*21,17,'#123b64'));
     if(!projects.length)paintText(g,'Nenhum projeto publicado.',84,1054,18,'#73869b');
     window.CoraCalendarBirthdays?.drawBlock?.(g,birthdayPeople,{x:65,y:1124,width:W-130,
       title:'ANIVERSARIANTES DE '+MONTHS[month].toUpperCase(),font:18,rowHeight:25,columns:3,maxRows:4});
     paintText(g,events.length?'RESUMO VISUAL · ATIVIDADES COMPLETAS NAS PRÓXIMAS PÁGINAS':'PDF SOLUÇÃO EDUCACIONAL · COLÉGIO CORA CORALINA',68,1316,18,'#567089');
     return c;
   };
   const renderer=window.CoraPDFActivities;
   if(!renderer)throw Error('O módulo do PDF completo ainda não carregou. Atualize o aplicativo.');
   const canvases=[];
   if(!single)canvases.push(renderer.annualCover({
     year,events:all,stages:stageList,projects:data?.projects||[],
     birthdays:publishedBirthdays(),logo:image
   }));
   const months=single?[monthOnly]:Array.from({length:12},(_,i)=>i);
   let detailed=0;
   for(const m of months){
    if(status)status.textContent='Preparando '+MONTHS[m]+' e suas atividades completas...';
    canvases.push(make(m));
    const monthItems=all.filter(e=>Number(e.date.slice(5,7))===m+1);
    const extras=renderer.detailPages({year,month:m,events:monthItems,logo:image});
    canvases.push(...extras);
    detailed+=monthItems.length;
   }
   const file=window.CoraPDF.fromCanvases(canvases,{pageWidth:1180,pageHeight:946,title:'Calendário completo Cora Coralina '+year});
   const url=URL.createObjectURL(file),anchor=document.createElement('a');anchor.href=url;
   anchor.download=single?'Calendario_Cora_Coralina_'+year+'_'+MONTHS[monthOnly]+'.pdf':'Calendario_Cora_Coralina_'+year+'.pdf';
   document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
   if(status)status.textContent=(single?'PDF mensal':'PDF anual')+
     ' completo: '+canvases.length+' página(s), '+detailed+' atividade(s) detalhada(s), projetos e aniversariantes.';
  }catch(e){console.error('Erro ao gerar calendário completo:',e);if(status)status.textContent='Falha ao gerar PDF completo: '+e.message;else toast('Falha ao gerar PDF completo: '+e.message)}
  finally{if(btn)btn.disabled=false;}
 }

 async function downloadPdf(monthOnly=null){
  const single=Number.isInteger(monthOnly)&&monthOnly>=0&&monthOnly<12;
  const btn=$(single?'#cpDownloadMonth':'#cpDownloadOfficial'),status=$('#cpPdfProgress');
  if(btn)btn.disabled=true;
  try{
   const pages=[],monthPages=single?[monthOnly+2]:Array.from({length:14},(_,i)=>i+1);
   for(const page of monthPages){
    if(status)status.textContent='Preparando página '+page+'...';
    const uri=await loadPage(page);
    pages.push(await window.CoraCalendarBirthdays.officialPage(uri,page,publishedBirthdays()));
   }
   const file=window.CoraPDF.fromCanvases(pages,{pageWidth:1180,pageHeight:770,
     title:'Calendário Cora Coralina 2026 com aniversariantes'});
   const url=URL.createObjectURL(file),anchor=document.createElement('a');
   anchor.href=url;anchor.download=single?'Calendario_Cora_Coralina_2026_'+MONTHS[monthOnly]+'.pdf':'Calendario_Oficial_Cora_Coralina_2026.pdf';
   document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
   if(status)status.textContent=single?'PDF mensal com aniversariantes preparado.':'PDF anual com aniversariantes preparado.';
  }catch(e){console.error(e);if(status)status.textContent='Não foi possível preparar o PDF.';else toast('Não foi possível preparar o PDF: '+e.message)}
  finally{if(btn)btn.disabled=false}
 }
 function unavailable(error){
  document.body.classList.add('portal-locked');
  document.body.classList.remove('portal-loading');
  const detail=error?.status===503
    ? 'O serviço de acesso ainda não reconheceu as credenciais protegidas. É necessário um novo deploy após configurar as variáveis no Netlify.'
    : 'Não foi possível conectar ao serviço de acesso neste momento. Confira a conexão e tente novamente.';
  root.innerHTML='<div class="cp-gateway"><div class="cp-login-shell" style="max-width:620px;text-align:center;padding:32px"><h1>Portal Cora Coralina</h1><p style="margin:20px 0">'+safe(detail)+'</p><p style="color:#526982">Por segurança, o painel de Gestão não é exibido sem autenticação.</p><button type="button" class="cp-btn" id="cpTryAgain" style="margin-top:18px">Tentar novamente</button></div></div>';
  $('#cpTryAgain').onclick=()=>start();
 }
 async function start(){
  document.body.classList.add('portal-loading');
  try{
   if(recoveryGateway()||activationGateway())return;
   const s=await api('me');individualRequired=Boolean(s.individualRequired);
   if(s.role){role=s.role;await enter()}else gateway();
  }catch(e){unavailable(e);}
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&role==='equipe')refresh()});
 window.addEventListener('focus',()=>{if(role==='equipe'&&!document.hidden)refresh()});
 if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',event=>{
   if(event.data?.type==='cora-open-alerts'&&role==='equipe'){showBell=true;drawTeam()}
   if(event.data?.type==='cora-open-helpdesk'&&role)window.CoraHelpdesk?.open();
 });
 start();
})();