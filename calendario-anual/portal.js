/* Cora Coralina – Gestão / Equipe Pedagógica.
 * Data is shared only after an authorized management publication. No passwords in client code.
 */
(() => {
 'use strict';
 const API='/calendario-anual/api', $=s=>document.querySelector(s);
 const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
 const EVENTS_KEY='cora_calendario_eventos_2026_v1',NOTICE_KEY='cora_portal_draft_notices_2026';
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dateStr=(date)=>{const d=new Date(date);return Number.isNaN(d.getTime())?'':`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
 const isoNow=()=>{const d=new Date();return `${dateStr(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`};
 const app=$('#app'),root=document.createElement('div');root.id='coraPortal';document.body.prepend(root);
 let role='',chosen='gestao',data=null,month=new Date().getFullYear()===2026?new Date().getMonth():0,tab='resumo',managerNotices=[],leadDays=3,timer=null,showBell=false;
 const endpoint=action=>`${API}?action=${encodeURIComponent(action)}`;
 async function api(action,payload){
  const opts={credentials:'same-origin',cache:'no-store',headers:{'accept':'application/json'}};
  if(payload!==undefined){opts.method='POST';opts.headers['content-type']='application/json';opts.headers['x-cora-request']='portal';opts.body=JSON.stringify(payload);}
  const response=await fetch(endpoint(action),opts);let body={};try{body=await response.json()}catch{}
  if(!response.ok){const e=new Error(body.error||`Erro ${response.status}`);e.status=response.status;throw e;}
  return body;
 }
 function toast(message){let t=$('.cp-portal-toast');if(t)t.remove();t=document.createElement('div');t.className='cp-portal-toast';t.textContent=message;document.body.append(t);setTimeout(()=>t.remove(),4500)}
 function officialEvents(){return Array.isArray(window.CORA_OFFICIAL_2026?.events)?window.CORA_OFFICIAL_2026.events:[]}
 function loadEventDraft(){try{const local=JSON.parse(localStorage.getItem(EVENTS_KEY)||'[]');return Array.isArray(local)&&local.length?local:officialEvents()}catch{return officialEvents()}}
 function loadNoticeDraft(){try{const v=JSON.parse(localStorage.getItem(NOTICE_KEY)||'[]');return Array.isArray(v)?v:[]}catch{return []}}
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
  document.body.classList.remove('portal-locked','portal-loading');
  managerNotices=loadNoticeDraft();try{leadDays=Number(localStorage.getItem('cora_default_lead_days_2026'))||3}catch{}
  root.innerHTML=`<div class="cp-manager-bar"><strong>⚙ Gestão</strong><small>Publicações para a Equipe Pedagógica</small><span class="cp-spacer"></span><span id="cpPubStatus" class="cp-status">Ainda não publicado neste acesso</span><button id="cpTogglePanel" class="cp-btn gold">🔔 Publicações e alertas</button><button id="cpPublishNow" class="cp-btn">Publicar para equipe</button><button id="cpLogout" class="cp-btn soft">Sair</button></div><section id="cpManagerPanel" class="cp-manager-panel cp-hidden"><h2>Comunicação com a equipe</h2><p>Os avisos ficam como rascunho neste dispositivo até você clicar em “Publicar para equipe”. Os eventos locais serão enviados junto com os avisos.</p><div class="cp-form-grid"><label>Título do aviso<input id="cpNoticeTitle" maxlength="130" placeholder="Ex.: Reunião de planejamento"></label><label>Tipo<select id="cpNoticeType"><option>Informativo</option><option>Urgente</option><option>Reunião</option><option>Avaliação</option></select></label><label>Data de início da publicação<input id="cpNoticePublish" type="datetime-local" value="${isoNow()}"></label><label class="cp-wide">Mensagem<textarea id="cpNoticeBody" placeholder="Escreva o recado, orientações ou uma alteração do calendário"></textarea></label><label>Data do evento (opcional)<input type="date" id="cpNoticeEventDate" min="2026-01-01" max="2026-12-31"></label><label>Alertar com antecedência<select id="cpNoticeLead"><option value="0">No dia</option><option value="1">1 dia antes</option><option value="2">2 dias antes</option><option value="3" selected>3 dias antes</option><option value="5">5 dias antes</option><option value="7">7 dias antes</option><option value="14">14 dias antes</option><option value="30">30 dias antes</option></select></label><label>Antecedência padrão de eventos<select id="cpDefaultLead"><option value="0">No dia</option><option value="1">1 dia</option><option value="2">2 dias</option><option value="3">3 dias</option><option value="5">5 dias</option><option value="7">7 dias</option><option value="14">14 dias</option></select></label><div class="cp-wide"><button type="button" class="cp-btn soft" id="cpAddNotice" aria-live="polite">Adicionar aviso</button><span id="cpNoticeSaveFeedback" class="cp-save-feedback" role="status" aria-live="polite"></span></div></div><h3>Avisos preparados</h3><div id="cpNoticeRows"></div><div style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-top:13px"><button class="cp-btn gold" id="cpPublishPanel">Publicar calendário + avisos</button><span class="cp-status">Atualizações não são enviadas automaticamente ao salvar o rascunho.</span></div></section>`;
  $('#cpDefaultLead').value=String(leadDays);
  $('#cpTogglePanel').onclick=()=>$('#cpManagerPanel').classList.toggle('cp-hidden');
  $('#cpLogout').onclick=logout;$('#cpPublishNow').onclick=publish;$('#cpPublishPanel').onclick=publish;
  $('#cpDefaultLead').onchange=()=>{leadDays=Number($('#cpDefaultLead').value)||3;localStorage.setItem('cora_default_lead_days_2026',String(leadDays))};
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
    try{localStorage.setItem(NOTICE_KEY,JSON.stringify(managerNotices));}
    catch(e){managerNotices.pop();toast('Não foi possível salvar o aviso neste dispositivo.');return;}
    $('#cpNoticeTitle').value='';$('#cpNoticeBody').value='';
    setNoticeState('saved');
    renderNoticeRows();
    toast('✓ Aviso adicionado como rascunho. Publique para a Equipe Pedagógica receber.');
  };
  renderNoticeRows();
  api('state').then(x=>{const status=$('#cpPubStatus');if(status&&x.publication)status.textContent='Última publicação: '+new Date(x.publication.updatedAt).toLocaleString('pt-BR')}).catch(()=>{});
 }
 function renderNoticeRows(){const area=$('#cpNoticeRows');if(!area)return;area.innerHTML=managerNotices.length?managerNotices.map(n=>`<div class="cp-notice-row"><span><span class="cp-notice-saved">✓ Adicionado</span> <strong>${safe(n.title)}</strong> · ${safe(n.type)} · ${safe(n.publishAt).replace('T',' ')}${n.eventDate?' · Evento '+safe(n.eventDate):''}</span><button class="cp-btn soft" data-cp-remove="${safe(n.id)}">Excluir</button></div>`).join(''):'<p class="cp-muted">Nenhum aviso criado. O calendário oficial ainda pode ser publicado.</p>';area.querySelectorAll('[data-cp-remove]').forEach(b=>b.onclick=()=>{managerNotices=managerNotices.filter(n=>n.id!==b.dataset.cpRemove);localStorage.setItem(NOTICE_KEY,JSON.stringify(managerNotices));renderNoticeRows()});}
 async function publish(){const events=loadEventDraft(),btn=$('#cpPublishNow');if(!btn)return;btn.disabled=true;try{
   const res=await api('publish',{events,notices:managerNotices,config:{defaultLeadDays:leadDays}});
   $('#cpPubStatus').textContent='Publicado: '+new Date(res.updatedAt).toLocaleString('pt-BR');toast(`Publicado para a equipe: ${res.counts.events} eventos e ${res.counts.notices} avisos.`);
  }catch(e){toast('Não foi possível publicar: '+e.message);}finally{btn.disabled=false;}}
 function teamNav(){return `<div class="cp-team-head"><img id="cpTeamLogo" alt="Brasão do Colégio Cora Coralina"><div><small>COLÉGIO CORA CORALINA · AMBIENTE DE CONSULTA</small><h1>Equipe Pedagógica</h1></div><span class="cp-spacer"></span><button class="cp-btn cp-bell" id="cpBell" aria-label="Abrir notificações">🔔<em id="cpBellCount" style="display:none">0</em></button><button class="cp-btn" id="cpRefresh">Atualizar</button><button class="cp-btn" id="cpTeamLogout">Sair</button></div>`}
 async function team(){document.body.classList.add('portal-locked');document.body.classList.remove('portal-loading');root.innerHTML=`<div class="cp-team">${teamNav()}<div class="cp-team-main"><div id="cpView"><p class="cp-muted">Carregando publicações da Gestão...</p></div></div></div>`;$('#cpTeamLogo').src=logo();$('#cpTeamLogout').onclick=logout;$('#cpRefresh').onclick=refresh;$('#cpBell').onclick=()=>{showBell=!showBell;drawTeam()};await refresh();clearInterval(timer);timer=setInterval(refresh,90000);}
 async function refresh(){try{const result=await api('state');data=result.publication;drawTeam()}catch(e){if(e.status===401){clearInterval(timer);gateway('Sessão expirada. Entre novamente.');return;}toast('Falha ao atualizar: '+e.message);}}
 const isSecond=e=>/2[ªaº°]?\s*chamada|segunda\s+chamada/i.test(`${e.title} ${e.notes||''}`);
 const isAssessment=e=>/avaliaç|avaliação|simulado|sondagem|recomposiç|prova/i.test(`${e.title} ${e.type||''}`);
 function filteredEvents(){return (data?.events||[]).filter(e=>String(e.date||'').startsWith('2026-')).sort((a,b)=>a.date.localeCompare(b.date))}
 function activeNotices(){const now=new Date();return (data?.notices||[]).filter(n=>{const start=n.publishAt?new Date(n.publishAt):null;const end=n.expiresAt?new Date(n.expiresAt):null;return (!start||start<=now)&&(!end||end>=now)}).sort((a,b)=>String(b.publishAt||'').localeCompare(String(a.publishAt||'')))}
 function upcoming(){const today=new Date();today.setHours(0,0,0,0);const dmax=Number(data?.config?.defaultLeadDays??3);let read=[];try{read=JSON.parse(localStorage.getItem('cora_team_seen_alerts_2026')||'[]')}catch{}const seen=new Set(Array.isArray(read)?read:[]);
  const events=filteredEvents().filter(e=>{const date=new Date(e.date+'T12:00:00'),delta=Math.ceil((date-today)/86400000);return delta>=0&&delta<=dmax}).map(e=>({id:'event-'+e.id,title:e.title,date:e.date,desc:e.type}));
  const notes=activeNotices().filter(n=>!n.eventDate||(()=>{const d=new Date(n.eventDate+'T12:00:00');const delta=Math.ceil((d-today)/86400000);return delta>=0&&delta<=Number(n.leadDays||0)})()).map(n=>({id:n.id,title:n.title,date:n.eventDate||n.publishAt,desc:n.type}));
  return [...notes,...events].map(n=>({...n,unread:!seen.has(n.id)}));}
 function eventHtml(e){return `<article class="cp-list-entry"><time>${safe(e.date.slice(8,10))}/${safe(e.date.slice(5,7))}</time><div><strong>${safe(e.title)}</strong><span class="cp-tag">${safe(e.type||'Atividade')}</span>${e.notes?`<p>${safe(e.notes)}</p>`:''}</div></article>`}
 function noticeHtml(n){return `<article class="cp-notice ${n.type==='Urgente'?'urgent':''}"><small>${safe(n.type)} · ${safe((n.publishAt||'').replace('T',' '))}</small><h3>${safe(n.title)}</h3><p>${safe(n.body)}</p>${n.eventDate?`<small>Data relacionada: ${safe(n.eventDate)} · Alerta ${Number(n.leadDays)||0} dia(s) antes</small>`:''}</article>`}
 function drawTeam(){const here=$('#cpView');if(!here)return;
  const events=filteredEvents(),notes=activeNotices(),assess=events.filter(e=>isAssessment(e)&&!isSecond(e)),alertList=upcoming(),unread=alertList.filter(a=>a.unread).length;
  const badge=$('#cpBellCount');if(badge){badge.style.display=unread?'block':'none';badge.textContent=String(unread)}
  const sections=[['resumo','Visão Geral'],['calendario','Calendário 2026'],['avaliacoes','Avaliações e Simulados'],['avisos','Avisos'],['pdf','PDF Anual']];
  const tabs=`<div class="cp-tabs">${sections.map(([id,label])=>`<button class="${tab===id?'active':''}" data-cp-tab="${id}">${label}</button>`).join('')}</div>`;
  let content='';
  if(!data){content='<div class="cp-paper"><h2>Nenhuma publicação disponível</h2><p class="cp-muted">A Gestão ainda não publicou o calendário e os comunicados para a equipe. O conteúdo ficará disponível aqui após a primeira publicação.</p></div>'}
  else if(showBell){content=`<div class="cp-bell-panel"><div class="cp-main-heading"><h2>🔔 Central de alertas</h2><button class="cp-btn soft" id="cpMarkRead">Marcar como lidos</button></div>${alertList.length?alertList.map(a=>`<div class="cp-list-entry"><time>${safe(String(a.date).slice(0,10))}</time><div><strong>${safe(a.title)}</strong><p>${safe(a.desc||'')}</p>${a.unread?'<span class="cp-tag">Novo</span>':''}</div></div>`).join(''):'<p class="cp-muted">Nenhuma atividade ou aviso exige atenção no período configurado.</p>'}</div>`;}
  else if(tab==='resumo'){
   const today=dateStr(new Date());const future=events.filter(e=>e.date>=today).slice(0,9);
   content=`<div class="cp-main-heading"><h2>Atividades e próximos compromissos</h2></div><div class="cp-list">${future.length?future.map(eventHtml).join(''):'<p class="cp-muted">Nenhum evento futuro publicado em 2026.</p>'}</div><h2 style="color:#12375e;margin-top:28px">Comunicados recentes</h2>${notes.slice(0,3).map(noticeHtml).join('')||'<p class="cp-muted">Sem avisos recentes.</p>'}`;
  }else if(tab==='calendario'||tab==='avaliacoes'){
   const arr=(tab==='avaliacoes'?assess:events).filter(e=>Number(e.date.slice(5,7))===month+1);
   content=`<div class="cp-main-heading"><h2>${tab==='avaliacoes'?'Avaliações, simulados e sondagens':'Calendário escolar'}</h2><select id="cpMonthPicker" aria-label="Mês do calendário">${MONTHS.map((m,i)=>`<option value="${i}" ${month===i?'selected':''}>${m} de 2026</option>`).join('')}</select></div><div class="cp-list">${arr.length?arr.map(eventHtml).join(''):'<p class="cp-muted">Nenhuma atividade publicada neste mês.</p>'}</div>`;
  }else if(tab==='avisos')content=`<div class="cp-main-heading"><h2>Avisos da Gestão</h2></div>${notes.length?notes.map(noticeHtml).join(''):'<p class="cp-muted">Ainda não há avisos para a equipe.</p>'}`;
  else content=`<div class="cp-main-heading"><h2>Calendário anual oficial 2026</h2><select id="cpMonthPicker" aria-label="Mês do PDF">${MONTHS.map((m,i)=>`<option value="${i}" ${month===i?'selected':''}>${m} de 2026</option>`).join('')}</select></div><div class="cp-pdf-sample"><div class="cp-paper"><img class="cp-pdf-image" id="cpPdfMonth" alt="Página do calendário oficial do mês selecionado"><p class="cp-muted">Visualização do documento institucional; conteúdo somente para consulta.</p></div><div class="cp-paper"><h3>Calendário oficial para download</h3><p class="cp-muted">Arquivo com capa, 12 meses e anotações, em formato PDF. Selecione o mês para visualizar a página correspondente.</p><button class="cp-btn gold" id="cpDownloadOfficial">↓ Baixar calendário completo (PDF)</button><p class="cp-status" id="cpPdfProgress"></p></div></div>`;
  here.innerHTML=`${showBell?'':`<div class="cp-overview"><div class="cp-metric"><small>Atividades publicadas</small><strong>${events.length}</strong></div><div class="cp-metric"><small>Avaliações e simulados</small><strong>${assess.length}</strong></div><div class="cp-metric"><small>Avisos disponíveis</small><strong>${notes.length}</strong></div></div>${tabs}`}${content}<p class="cp-updated">Última publicação da Gestão: ${data?new Date(data.updatedAt).toLocaleString('pt-BR'):'ainda não publicada'} · Atualização automática enquanto o aplicativo estiver aberto.</p>`;
  here.querySelectorAll('[data-cp-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.cpTab;showBell=false;drawTeam()});
  $('#cpMonthPicker')?.addEventListener('change',e=>{month=Number(e.target.value);drawTeam()});
  $('#cpMarkRead')?.addEventListener('click',()=>{let arr=[];try{arr=JSON.parse(localStorage.getItem('cora_team_seen_alerts_2026')||'[]')}catch{}const seen=new Set(Array.isArray(arr)?arr:[]);upcoming().forEach(a=>seen.add(a.id));localStorage.setItem('cora_team_seen_alerts_2026',JSON.stringify([...seen]));drawTeam()});
  $('#cpDownloadOfficial')?.addEventListener('click',downloadPdf);
  if(tab==='pdf'&&!showBell&&data)loadPage(month+2).then(url=>{const x=$('#cpPdfMonth');if(x)x.src=url}).catch(()=>toast('Imagem indisponível neste momento.'));
 }
 const loaded={};function loadPage(page){if(window.CORA_OFFICIAL_PAGE_DATA?.[page])return Promise.resolve(window.CORA_OFFICIAL_PAGE_DATA[page]);if(loaded[page])return loaded[page];loaded[page]=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=`./official-page-${String(page).padStart(2,'0')}.js`;s.onload=()=>window.CORA_OFFICIAL_PAGE_DATA?.[page]?resolve(window.CORA_OFFICIAL_PAGE_DATA[page]):reject(new Error('Página ausente'));s.onerror=reject;document.head.append(s)});return loaded[page]}
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
 start();
})();