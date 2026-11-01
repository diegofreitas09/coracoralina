/* Cora Coralina – Gestão / Equipe Pedagógica.
 * Data is shared only after an authorized management publication. No passwords in client code.
 */
(() => {
 'use strict';
 const API='/calendario-anual/api', $=s=>document.querySelector(s);
 const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
 const eventsKey=y=>'cora_calendario_eventos_'+y+'_v1',noticeKey=y=>'cora_portal_draft_notices_'+y;
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dateStr=(date)=>{const d=new Date(date);return Number.isNaN(d.getTime())?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
 const isoNow=()=>{const d=new Date();return `${dateStr(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};
 const app=$('#app'),root=document.createElement('div');root.id='coraPortal';document.body.prepend(root);
 let role='',chosen='gestao',data=null,year=Number(window.CoraYears?.activeYear)||2026,availableYears=[2026],month=new Date().getFullYear()===2026?new Date().getMonth():0,tab='resumo',selectedStage=0,managerNotices=[],leadDays=3,timer=null,showBell=false;
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
  document.body.classList.add('portal-locked');document.body.classList.remove('portal-loading');role='';
  root.innerHTML=`<div class="cp-gateway"><div class="cp-login-shell"><div class="cp-login-head"><img id="cpGatewayLogo" alt="Brasão Cora Coralina"><div><small>COLÉGIO CORA CORALINA · PDF SOLUÇÃO EDUCACIONAL</small><h1>Portal do Calendário Escolar</h1><p>Selecione seu ambiente de trabalho</p></div></div><div class="cp-role-grid"><button type="button" class="cp-role ${chosen==='gestao'?'active':''}" data-cp-role="gestao"><span class="cp-role-icon">⚙</span><strong>Gestão</strong><span>Organizar o ano, editar eventos e publicar avisos para toda a equipe</span></button><button type="button" class="cp-role ${chosen==='equipe'?'active':''}" data-cp-role="equipe"><span class="cp-role-icon">▦</span><strong>Equipe Pedagógica</strong><span>Consultar o calendário, receber alertas e baixar os materiais publicados</span></button></div><form id="cpLoginForm" class="cp-auth"><div><label for="cpPassword">Senha de acesso · <span id="cpRoleLabel">${chosen==='gestao'?'Gestão':'Equipe Pedagógica'}</span></label><input type="password" id="cpPassword" autocomplete="current-password" required placeholder="Digite sua senha"></div><button type="submit" class="cp-btn">Entrar no painel</button><p class="cp-error" role="alert">${safe(error)}</p></form><div class="cp-gateway-foot"><span>A Gestão publica · a Equipe acompanha</span><span>Calendário 2026 · Acesso restrito</span></div></div></div>`;
  $('#cpGatewayLogo').src=logo();
  root.querySelectorAll('[data-cp-role]').forEach(b=>b.onclick=()=>{chosen=b.dataset.cpRole;root.querySelectorAll('[data-cp-role]').forEach(x=>x.classList.toggle('active',x===b));$('#cpRoleLabel').textContent=chosen==='gestao'?'Gestão':'Equipe Pedagógica';$('#cpPassword').focus()});
  $('#cpLoginForm').onsubmit=async e=>{e.preventDefault();const btn=$('#cpLoginForm button[type=submit]');btn.disabled=true;try{const r=await api('login',{role:chosen,password:$('#cpPassword').value});role=r.role;await enter();}catch(err){gateway('Senha incorreta ou serviço indisponível. '+(err.status===503?'Contate a administração.':''));}finally{btn.disabled=false;}};
 }
 async function logout(){try{await api('logout',{})}catch{}clearInterval(timer);timer=null;gateway();}
 async function enter(){if(role==='gestao')manager();else await team();}
 function manager(){
  year=Number(window.CoraYears?.activeYear)||2026;
  document.body.classList.remove('portal-locked','portal-loading');
  managerNotices=loadNoticeDraft();try{leadDays=Number(localStorage.getItem('cora_default_lead_days_'+year))||3}catch{}
  root.innerHTML=`<div class="cp-manager-bar"><strong>⚙ Gestão</strong><small>Publicações para a Equipe Pedagógica</small><span class="cp-spacer"></span><span id="cpPubStatus" class="cp-status">Ainda não publicado neste acesso</span><button id="cpTogglePanel" class="cp-btn gold">🔔 Publicações e alertas</button><button id="cpPublishNow" class="cp-btn">Publicar para equipe</button><button id="cpLogout" class="cp-btn soft">Sair</button></div><section id="cpManagerPanel" class="cp-manager-panel cp-hidden"><h2>Comunicação com a equipe</h2><p>Os avisos ficam como rascunho neste dispositivo até você clicar em “Publicar para equipe”. Os eventos locais serão enviados junto com os avisos.</p><div class="cp-form-grid"><label>Título do aviso<input id="cpNoticeTitle" maxlength="130" placeholder="Ex.: Reunião de planejamento"></label><label>Tipo<select id="cpNoticeType"><option>Informativo</option><option>Urgente</option><option>Reunião</option><option>Avaliação</option></select></label><label>Data de início da publicação<input id="cpNoticePublish" type="datetime-local" value="${isoNow()}"></label><label class="cp-wide">Mensagem<textarea id="cpNoticeBody" placeholder="Escreva o recado, orientações ou uma alteração do calendário"></textarea></label><label>Data do evento (opcional)<input type="date" id="cpNoticeEventDate" min="2026-01-01" max="2026-12-31"></label><label>Alertar com antecedência<select id="cpNoticeLead"><option value="0">No dia</option><option value="1">1 dia antes</option><option value="2">2 dias antes</option><option value="3" selected>3 dias antes</option><option value="5">5 dias antes</option><option value="7">7 dias antes</option><option value="14">14 dias antes</option><option value="30">30 dias antes</option></select></label><label>Antecedência padrão de eventos<select id="cpDefaultLead"><option value="0">No dia</option><option value="1">1 dia</option><option value="2">2 dias</option><option value="3">3 dias</option><option value="5">5 dias</option><option value="7">7 dias</option><option value="14">14 dias</option></select></label><div class="cp-wide"><button type="button" class="cp-btn soft" id="cpAddNotice" aria-live="polite">Adicionar aviso</button><span id="cpNoticeSaveFeedback" class="cp-save-feedback" role="status" aria-live="polite"></span></div></div><h3>Avisos preparados</h3><div id="cpNoticeRows"></div><div style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-top:13px"><button class="cp-btn gold" id="cpPublishPanel">Publicar calendário + avisos</button><span class="cp-status">Atualizações não são enviadas automaticamente ao salvar o rascunho.</span></div></section>`;
  $('#cpDefaultLead').value=String(leadDays);
  $('#cpPublishNow').textContent='Publicar '+year+' para equipe';
  const field=$('#cpNoticeEventDate');if(field){field.min=year+'-01-01';field.max=year+'-12-31';}
  window.addEventListener('cora-year-changed',e=>{
   if(role!=='gestao')return;
   year=Number(e.detail?.year)||2026;managerNotices=loadNoticeDraft(year);
   renderNoticeRows();
   const current=$('#cpPubStatus');if(current)current.textContent='Ano '+year+' · pronto para publicar';
   const btn=$('#cpPublishNow');if(btn)btn.textContent='Publicar '+year+' para equipe';
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
  }).catch(()=>{});

 }
 function renderNoticeRows(){const area=$('#cpNoticeRows');if(!area)return;area.innerHTML=managerNotices.length?managerNotices.map(n=>`<div class="cp-notice-row"><span><span class="cp-notice-saved">✓ Adicionado</span> <strong>${safe(n.title)}</strong> · ${safe(n.type)} · ${safe(n.publishAt).replace('T',' ')}${n.eventDate?' · Evento '+safe(n.eventDate):''}</span><button class="cp-btn soft" data-cp-remove="${safe(n.id)}">Excluir</button></div>`).join(''):'<p class="cp-muted">Nenhum aviso criado. O calendário oficial ainda pode ser publicado.</p>';area.querySelectorAll('[data-cp-remove]').forEach(b=>b.onclick=()=>{managerNotices=managerNotices.filter(n=>n.id!==b.dataset.cpRemove);localStorage.setItem(noticeKey(year),JSON.stringify(managerNotices));renderNoticeRows()});}
 async function publish(){
  const year=Number(window.CoraYears?.activeYear)||2026;const events=loadEventDraft(year),btn=$('#cpPublishNow');if(!btn)return;btn.disabled=true;
  try{
   // Evita que uma primeira publicação apague o cadastro institucional anterior.
   const previous=await api('state',undefined,'year='+year);
   window.CoraBirthdays?.importBaseline?.(previous.publication?.birthdays||[]);
   const birthdays=window.CoraBirthdays?.all?.()||previous.publication?.birthdays||[];
   const stages=window.CoraStages?.get?.(year)||[];const projects=window.CoraYears?.getProjects?.(year)||[];
   const res=await api('publish',{year,events,notices:managerNotices,birthdays,stages,projects,config:{defaultLeadDays:leadDays}});
   $('#cpPubStatus').textContent='Publicado: '+new Date(res.updatedAt).toLocaleString('pt-BR');
   toast(`Publicado ${year} para a equipe: ${res.counts.events} eventos, ${res.counts.notices} avisos e ${res.counts.birthdays??birthdays.length} aniversariantes.`);
  }catch(e){toast('Não foi possível publicar: '+e.message);}finally{btn.disabled=false;}
 }
 function teamNav(){return `<div class="cp-team-head"><img id="cpTeamLogo" alt="Brasão do Colégio Cora Coralina"><div><small>COLÉGIO CORA CORALINA · AMBIENTE DE CONSULTA</small><h1>Equipe Pedagógica</h1></div><label class="cp-year-label">Ano letivo <select id="cpTeamYear" aria-label="Ano letivo">${availableYears.map(y=>`<option value="${y}" ${year===y?'selected':''}>${y}</option>`).join('')}</select></label><span class="cp-spacer"></span><button class="cp-btn soft" type="button" id="cpEnableAlerts" title="Funciona com aplicativo aberto; push em segundo plano depende de configuração do servidor">Avisos no celular (app aberto)</button><button class="cp-btn cp-bell" id="cpBell" aria-label="Abrir notificações">🔔<em id="cpBellCount" style="display:none">0</em></button><button class="cp-btn" id="cpRefresh">Atualizar</button><button class="cp-btn" id="cpTeamLogout">Sair</button></div>`}
 async function team(){year=2026;if(new URLSearchParams(location.search).get('avisos')==='1')showBell=true;document.body.classList.add('portal-locked');document.body.classList.remove('portal-loading');root.innerHTML=`<div class="cp-team">${teamNav()}<div class="cp-team-main"><div id="cpView"><p class="cp-muted">Carregando publicações da Gestão...</p></div></div></div>`;$('#cpTeamLogo').src=logo();$('#cpTeamLogout').onclick=logout;$('#cpRefresh').onclick=refresh;$('#cpEnableAlerts').onclick=enableLocalNotifications;$('#cpBell').onclick=()=>{showBell=!showBell;drawTeam()};$('#cpTeamYear').onchange=e=>{year=Number(e.target.value)||2026;month=0;showBell=false;tab='resumo';refresh()};await refresh();clearInterval(timer);timer=setInterval(refresh,60000);}
 async function refresh(){try{const result=await api('state',undefined,'year='+year);availableYears=Array.isArray(result.availableYears)?result.availableYears:[2026];data=result.publication;const picker=$('#cpTeamYear');if(picker){picker.innerHTML=availableYears.map(y=>`<option value="${y}" ${year===y?'selected':''}>${y}</option>`).join('');picker.value=String(year)}drawTeam();checkLocalNotifications()}catch(e){if(e.status===401){clearInterval(timer);gateway('Sessão expirada. Entre novamente.');return;}toast('Falha ao atualizar: '+e.message);}}

 const localNoticesKey=()=>('cora_team_notified_'+year+'_v1');
 async function showDeviceNotice(title,body,tag){
  if(!('serviceWorker' in navigator))return false;
  try{
   const reg=await navigator.serviceWorker.ready;
   await reg.showNotification(title,{body,tag,icon:'./app-icon-192.png',badge:'./app-icon-192.png',data:{url:'./?avisos=1'},renotify:false});
   return true;
  }catch{return false}
 }
 async function enableLocalNotifications(){
  if(!('Notification' in window)||!('serviceWorker' in navigator)){toast('Este navegador não oferece notificações para o aplicativo.');return}
  const result=await Notification.requestPermission();
  if(result!=='granted'){toast('Ative a permissão de notificações nas configurações do aparelho.');return}
  try{
   localStorage.setItem('cora_team_device_alerts_enabled','1');
   const already=new Set(JSON.parse(localStorage.getItem(localNoticesKey())||'[]'));
   upcoming().forEach(n=>already.add(n.id));
   localStorage.setItem(localNoticesKey(),JSON.stringify([...already]));
  }catch{}
  const ok=await showDeviceNotice('Alertas do Colégio Cora Coralina','Avisos ativos enquanto o aplicativo estiver aberto.','cora-alerts-enabled');
  toast(ok?'Permissão ativada. Novos avisos serão exibidos no aparelho com o aplicativo aberto.':'Permissão concedida, mas não foi possível exibir o aviso do aparelho.');
 }
 async function checkLocalNotifications(){
  if(role!=='equipe'||!data||!('Notification' in window)||Notification.permission!=='granted')return;
  if(localStorage.getItem('cora_team_device_alerts_enabled')!=='1')return;
  let notified=[];
  try{notified=JSON.parse(localStorage.getItem(localNoticesKey())||'[]')}catch{}
  const known=new Set(Array.isArray(notified)?notified:[]);
  const list=upcoming().filter(a=>!known.has(a.id)).slice(0,3);
  for(const item of list){
   if(await showDeviceNotice(item.title,String(item.desc||'Atividade do calendário')+(item.date?' · '+item.date:''),'cora-'+year+'-'+item.id))known.add(item.id);
  }
  if(list.length)try{localStorage.setItem(localNoticesKey(),JSON.stringify([...known]))}catch{}
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
   return [...notices,...reminders,...events].map(n=>({...n,unread:!seen.has(n.id)}));
 }
 function eventHtml(e){const stage=(data?.stages||[]).find(st=>st.start&&st.end&&e.date>=st.start&&e.date<=st.end);return `<article class="cp-list-entry"><time>${safe(e.date.slice(8,10))}/${safe(e.date.slice(5,7))}</time><div><strong>${safe(e.title)}</strong><span class="cp-tag">${safe(e.type||'Atividade')}</span>${stage?`<span class="cp-tag cp-tag-stage">${stage.number}ª etapa · até ${safe(stage.end.slice(8,10)+'/'+stage.end.slice(5,7))}</span>`:''}${e.notes?`<p>${safe(e.notes)}</p>`:''}</div></article>`}
 function noticeHtml(n){return `<article class="cp-notice ${n.type==='Urgente'?'urgent':''}"><small>${safe(n.type)} · ${safe((n.publishAt||'').replace('T',' '))}</small><h3>${safe(n.title)}</h3><p>${safe(n.body)}</p>${n.eventDate?`<small>Data relacionada: ${safe(n.eventDate)} · Alerta ${Number(n.leadDays)||0} dia(s) antes</small>`:''}</article>`}
 function drawTeam(){const here=$('#cpView');if(!here)return;
  const events=filteredEvents(),notes=activeNotices(),assess=events.filter(e=>isAssessment(e)&&!isSecond(e)),alertList=upcoming(),unread=alertList.filter(a=>a.unread).length;
  const badge=$('#cpBellCount');if(badge){badge.style.display=unread?'block':'none';badge.textContent=unread>99?'99+':String(unread);badge.setAttribute('aria-label',unread+' alertas não lidos')}const bell=$('#cpBell');if(bell){bell.classList.toggle('has-unread',unread>0);bell.setAttribute('aria-label',unread?unread+' alertas novos. Abrir notificações':'Abrir notificações')}
  const sections=[['resumo','Visão Geral'],['calendario','Calendário '+year],['etapas','Etapas letivas'],['avaliacoes','Avaliações e Simulados'],['aniversarios','🎂 Aniversariantes'],['avisos','Avisos'],['pdf','PDF Anual']];
  const tabs=`<div class="cp-tabs">${sections.map(([id,label])=>`<button class="${tab===id?'active':''}" data-cp-tab="${id}">${label}</button>`).join('')}</div>`;
  let content='';
  if(!data){content='<div class="cp-paper"><h2>Nenhuma publicação disponível</h2><p class="cp-muted">A Gestão ainda não publicou o calendário e os comunicados para a equipe. O conteúdo ficará disponível aqui após a primeira publicação.</p></div>'}
  else if(showBell){content=`<div class="cp-bell-panel"><div class="cp-main-heading"><div class="cp-alert-heading-left"><button type="button" class="cp-btn soft cp-back-alert" id="cpBackFromBell" aria-label="Voltar à Equipe Pedagógica">← Voltar</button><h2>🔔 Central de alertas</h2></div><button class="cp-btn soft" id="cpMarkRead">Marcar como lidos</button></div>${alertList.length?alertList.map(a=>`<div class="cp-list-entry"><time>${safe(String(a.date).slice(0,10))}</time><div><strong>${safe(a.title)}</strong><p>${safe(a.desc||'')}</p>${a.unread?'<span class="cp-tag">Novo</span>':''}</div></div>`).join(''):'<p class="cp-muted">Nenhuma atividade ou aviso exige atenção no período configurado.</p>'}</div>`;}
  else if(tab==='resumo'){
   const today=dateStr(new Date());const future=events.filter(e=>e.date>=today).slice(0,9);
   const thisMonth=new Date().getMonth()+1;
   const birthdayList=publishedBirthdays().filter(p=>Number(p.month)===thisMonth);
   const nextMonth=thisMonth===12?1:thisMonth+1;
   const nextBirthdays=publishedBirthdays().filter(p=>Number(p.month)===nextMonth);
   content=`<div class="cp-main-heading"><h2>Atividades e próximos compromissos</h2></div><div class="cp-list">${future.length?future.map(eventHtml).join(''):'<p class="cp-muted">Nenhum evento futuro publicado para este ano.</p>'}</div>
   <div class="cp-birthday-teaser"><div class="cp-main-heading"><h2>🎂 Aniversariantes de ${MONTHS[thisMonth-1]}</h2><button class="cp-btn soft" id="cpSeeBirthdays">Ver todos os meses</button></div>
   <div class="cp-list">${birthdayList.length?birthdayList.map(birthdayEntry).join(''):'<p class="cp-muted">Nenhum aniversariante publicado para este mês.</p>'}</div><div class="cp-birthday-next"><strong>Próximo mês · ${MONTHS[nextMonth-1]}</strong><div class="cp-birthday-preview">${nextBirthdays.length?nextBirthdays.map(p=>`<span>${safe(String(p.day).padStart(2,'0'))}/${safe(String(p.month).padStart(2,'0'))} · ${safe(p.name)}</span>`).join(''):'<span>Nenhum aniversariante cadastrado</span>'}</div></div></div>
   <h2 style="color:#12375e;margin-top:28px">Comunicados recentes</h2>${notes.slice(0,3).map(noticeHtml).join('')||'<p class="cp-muted">Sem avisos recentes.</p>'}`;
  }else if(tab==='calendario'||tab==='avaliacoes'){
   const arr=(tab==='avaliacoes'?assess:events).filter(e=>Number(e.date.slice(5,7))===month+1);
   content=`<div class="cp-main-heading"><h2>${tab==='avaliacoes'?'Avaliações, simulados e sondagens':'Calendário escolar'}</h2><select id="cpMonthPicker" aria-label="Mês do calendário">${MONTHS.map((m,i)=>`<option value="${i}" ${month===i?'selected':''}>${m} de ${year}</option>`).join('')}</select></div><div class="cp-list">${arr.length?arr.map(eventHtml).join(''):'<p class="cp-muted">Nenhuma atividade publicada neste mês.</p>'}</div>`;
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
  else content=`<div class="cp-main-heading"><h2>Calendário anual ${year}</h2></div><div class="cp-paper"><h3>Documento publicado pela Gestão</h3><p>Inclui os 12 meses de ${year}, com atividades, etapas e projetos publicados.</p><button class="cp-btn gold" id="cpDownloadPublished">↓ Baixar PDF anual ${year}</button><p class="cp-status" id="cpPdfProgress"></p></div>`;

  here.innerHTML=`${showBell?'':`<div class="cp-overview"><div class="cp-metric"><small>Atividades publicadas</small><strong>${events.length}</strong></div><div class="cp-metric"><small>Avaliações e simulados</small><strong>${assess.length}</strong></div><div class="cp-metric"><small>Avisos disponíveis</small><strong>${notes.length}</strong></div></div>${tabs}`}${content}<p class="cp-updated">Última publicação da Gestão: ${data?new Date(data.updatedAt).toLocaleString('pt-BR'):'ainda não publicada'} · Atualização automática enquanto o aplicativo estiver aberto.</p>`;
  here.querySelectorAll('[data-cp-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.cpTab;showBell=false;drawTeam()});
  $('#cpMonthPicker')?.addEventListener('change',e=>{month=Number(e.target.value);drawTeam()});
  $('#cpStagePicker')?.addEventListener('change',e=>{selectedStage=Number(e.target.value)||0;drawTeam()});
  $('#cpBackFromBell')?.addEventListener('click',()=>{showBell=false;drawTeam();});
  $('#cpMarkRead')?.addEventListener('click',()=>{let arr=[];try{arr=JSON.parse(localStorage.getItem('cora_team_seen_alerts_'+year)||'[]')}catch{}const seen=new Set(Array.isArray(arr)?arr:[]);upcoming().forEach(a=>seen.add(a.id));localStorage.setItem('cora_team_seen_alerts_'+year,JSON.stringify([...seen]));drawTeam()});
  $('#cpSeeBirthdays')?.addEventListener('click',()=>{tab='aniversarios';month=new Date().getMonth();showBell=false;drawTeam();});
  $('#cpDownloadOfficial')?.addEventListener('click',downloadPdf);
  $('#cpDownloadPublished')?.addEventListener('click',downloadPublishedPdf);
  if(tab==='pdf'&&year===2026&&!showBell&&data)loadPage(month+2).then(url=>{const x=$('#cpPdfMonth');if(x)x.src=url}).catch(()=>toast('Imagem indisponível neste momento.'));
 }
 const loaded={};function loadPage(page){if(window.CORA_OFFICIAL_PAGE_DATA?.[page])return Promise.resolve(window.CORA_OFFICIAL_PAGE_DATA[page]);if(loaded[page])return loaded[page];loaded[page]=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=`./official-page-${String(page).padStart(2,'0')}.js`;s.onload=()=>window.CORA_OFFICIAL_PAGE_DATA?.[page]?resolve(window.CORA_OFFICIAL_PAGE_DATA[page]):reject(new Error('Página ausente'));s.onerror=reject;document.head.append(s)});return loaded[page]}

 async function downloadPublishedPdf(){
  const btn=$('#cpDownloadPublished'),status=$('#cpPdfProgress');if(btn)btn.disabled=true;
  try{
   const W=1684,H=1190,stageList=Array.isArray(data?.stages)?data.stages:[],all=filteredEvents();
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
       const stage=marks.find(st=>st.start===iso||st.end===iso);
       if(stage)paintText(g,(stage.start===iso?'INÍCIO ':'FIM ')+stage.number+'ª',cx+73,cy+28,14,'#ad5500');
     }
     g.fillStyle='#ecf4fc';g.fillRect(65,988,W-130,126);
     paintText(g,'PROJETOS DO MÊS',75,1017,23);
     const projects=Array.isArray(data?.projects?.[month])?data.projects[month]:[];
     projects.slice(0,8).forEach((v,i)=>paintText(g,ellipsis(g,v,700),85+(i%2)*760,1050+Math.floor(i/2)*21,17,'#123b64'));
     if(!projects.length)paintText(g,'Nenhum projeto publicado.',84,1054,18,'#73869b');
     paintText(g,'PDF SOLUÇÃO EDUCACIONAL · COLÉGIO CORA CORALINA',68,1156,18,'#567089');
     return c;
   };
   const canvases=[];
   for(let m=0;m<12;m++){if(status)status.textContent='Preparando '+MONTHS[m]+'...';canvases.push(make(m))}
   const file=window.CoraPDF.fromCanvases(canvases,{pageWidth:1180,pageHeight:834,title:'Calendário Cora Coralina '+year});
   const url=URL.createObjectURL(file),anchor=document.createElement('a');anchor.href=url;anchor.download='Calendario_Cora_Coralina_'+year+'.pdf';
   document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
   if(status)status.textContent='PDF anual preparado com 12 meses.';
  }catch(e){if(status)status.textContent='Falha ao gerar PDF: '+e.message}
  finally{if(btn)btn.disabled=false;}
 }

 async function downloadPdf(){const btn=$('#cpDownloadOfficial'),status=$('#cpPdfProgress');if(btn)btn.disabled=true;try{const pages=[];for(let i=1;i<=14;i++){if(status)status.textContent=`Preparando página ${i}/14...`;const uri=await loadPage(i);pages.push({width:1180,height:664,toDataURL(){return uri}});}const file=window.CoraPDF.fromCanvases(pages,{pageWidth:1180,pageHeight:664,title:'Calendário Cora Coralina 2026'});const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download='Calendario_Oficial_Cora_Coralina_2026.pdf';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);if(status)status.textContent='PDF preparado.'}catch(e){if(status)status.textContent='Não foi possível preparar o PDF. Tente novamente.'}finally{if(btn)btn.disabled=false}}
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
   const s=await api('me');
   if(s.role){role=s.role;await enter()}else gateway();
  }catch(e){unavailable(e);}
 }
 if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',event=>{
   if(event.data?.type==='cora-open-alerts'&&role==='equipe'){showBell=true;drawTeam()}
 });
 start();
})();