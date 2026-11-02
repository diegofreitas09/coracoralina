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
  root.innerHTML=`<div class="cp-gateway"><div class="cp-login-shell"><div class="cp-login-head"><img id="cpGatewayLogo" alt="Brasão Cora Coralina"><div><small>COLÉGIO CORA CORALINA · PDF SOLUÇÃO EDUCACIONAL</small><h1>Portal do Calendário Escolar</h1><p>Selecione seu ambiente de trabalho</p></div></div><div class="cp-role-grid"><button type="button" class="cp-role ${chosen==='gestao'?'active':''}" data-cp-role="gestao"><span class="cp-role-icon">⚙</span><strong>Gestão</strong><span>Organizar o ano, editar eventos e publicar avisos para toda a equipe</span></button><button type="button" class="cp-role ${chosen==='equipe'?'active':''}" data-cp-role="equipe"><span class="cp-role-icon">▦</span><strong>Equipe Pedagógica</strong><span>Consultar o calendário, receber alertas e baixar os materiais publicados</span></button></div><form id="cpLoginForm" class="cp-auth"><div id="cpEmailWrap" ${chosen==='gestao'?'hidden':''}><label for="cpEmail">E-mail individual do colaborador</label><input type="email" id="cpEmail" autocomplete="username" placeholder="professor@exemplo.com" ${chosen==='equipe'?'required':''}></div><label id="cpLegacyWrap" class="cp-legacy-option" ${chosen==='gestao'||individualRequired?'hidden':''}><input type="checkbox" id="cpUseLegacy"> Usar senha coletiva temporária (migração)</label><div><label for="cpPassword">Senha pessoal · <span id="cpRoleLabel">${chosen==='gestao'?'Gestão':'Equipe Pedagógica'}</span></label><input type="password" id="cpPassword" autocomplete="current-password" required placeholder="Digite sua senha"></div><button type="submit" class="cp-btn">Entrar no painel</button><div id="cpFirstAccessWrap" class="cp-first-access" ${chosen==='gestao'?'hidden':''}><button type="button" id="cpFirstAccess">Primeiro acesso? Ativar convite</button><small>Seu acesso precisa ser criado pela Gestão. O cadastro na planilha, sozinho, não gera senha.</small></div><p class="cp-error" role="alert">${safe(error)}</p></form><div class="cp-gateway-foot"><span>A Gestão publica · a Equipe acompanha</span><span>Calendário 2026 · Acesso restrito</span></div></div></div>`;
  $('#cpGatewayLogo').src=logo();
  root.querySelectorAll('[data-cp-role]').forEach(b=>b.onclick=()=>{chosen=b.dataset.cpRole;root.querySelectorAll('[data-cp-role]').forEach(x=>x.classList.toggle('active',x===b));$('#cpRoleLabel').textContent=chosen==='gestao'?'Gestão':'Equipe Pedagógica';$('#cpEmailWrap').hidden=chosen==='gestao';$('#cpLegacyWrap').hidden=chosen==='gestao'||individualRequired;$('#cpUseLegacy').checked=false;$('#cpFirstAccessWrap').hidden=chosen==='gestao';$('#cpEmail').required=chosen==='equipe';(chosen==='equipe'?$('#cpEmail'):$('#cpPassword')).focus()});
  $('#cpUseLegacy').onchange=()=>{const collective=$('#cpUseLegacy').checked;$('#cpEmailWrap').hidden=collective;$('#cpEmail').required=!collective};
  $('#cpFirstAccess').onclick=()=>activationGateway(true);
   $('#cpLoginForm').onsubmit=async e=>{e.preventDefault();const btn=$('#cpLoginForm button[type=submit]');btn.disabled=true;try{const r=await api('login',{role:chosen,email:chosen==='equipe'&&!$('#cpUseLegacy').checked?$('#cpEmail').value.trim():'',password:$('#cpPassword').value});role=r.role;await enter();}catch(err){gateway((err.message||'Credenciais inválidas.')+' '+(err.status===503?'Contate a administração.':''));}finally{btn.disabled=false;}};
 }
 async function logout(){teacherProfile=null;try{await api('logout',{})}catch{}clearInterval(timer);timer=null;gateway();}
 async function enter(){if(role==='gestao')manager();else await team();}
 function manager(){
  year=Number(window.CoraYears?.activeYear)||2026;
  document.body.classList.remove('portal-locked','portal-loading');
  managerNotices=loadNoticeDraft();try{leadDays=Number(localStorage.getItem('cora_default_lead_days_'+year))||3}catch{}
  root.innerHTML=`<div class="cp-manager-bar"><strong>⚙ Gestão</strong><small>Publicações para a Equipe Pedagógica</small><span class="cp-spacer"></span><span id="cpPubStatus" class="cp-status">Ainda não publicado neste acesso</span><button id="cpTogglePanel" class="cp-btn gold">🔔 Publicações e alertas</button><button id="cpPublishNow" class="cp-btn">Publicar para equipe</button><button id="cpLogout" class="cp-btn soft">Sair</button></div><section id="cpManagerPanel" class="cp-manager-panel cp-hidden"><h2>Comunicação com a equipe</h2><p>Os avisos ficam como rascunho neste dispositivo até você clicar em “Publicar para equipe”. Os eventos locais serão enviados junto com os avisos.</p><div class="cp-form-grid"><label>Título do aviso<input id="cpNoticeTitle" maxlength="130" placeholder="Ex.: Reunião de planejamento"></label><label>Tipo<select id="cpNoticeType"><option>Informativo</option><option>Urgente</option><option>Reunião</option><option>Avaliação</option></select></label><label>Data de início da publicação<input id="cpNoticePublish" type="datetime-local" value="${isoNow()}"></label><label class="cp-wide">Mensagem<textarea id="cpNoticeBody" placeholder="Escreva o recado, orientações ou uma alteração do calendário"></textarea></label><label>Data do evento (opcional)<input type="date" id="cpNoticeEventDate" min="2026-01-01" max="2026-12-31"></label><label>Alertar com antecedência<select id="cpNoticeLead"><option value="0">No dia</option><option value="1">1 dia antes</option><option value="2">2 dias antes</option><option value="3" selected>3 dias antes</option><option value="5">5 dias antes</option><option value="7">7 dias antes</option><option value="14">14 dias antes</option><option value="30">30 dias antes</option></select></label><label>Antecedência padrão de eventos<select id="cpDefaultLead"><option value="0">No dia</option><option value="1">1 dia</option><option value="2">2 dias</option><option value="3">3 dias</option><option value="5">5 dias</option><option value="7">7 dias</option><option value="14">14 dias</option></select></label><div class="cp-wide"><button type="button" class="cp-btn soft" id="cpAddNotice" aria-live="polite">Adicionar aviso</button><span id="cpNoticeSaveFeedback" class="cp-save-feedback" role="status" aria-live="polite"></span></div></div><h3>Avisos preparados</h3><div id="cpNoticeRows"></div><div style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin-top:13px"><button class="cp-btn gold" id="cpPublishPanel">Publicar calendário + avisos</button><span class="cp-status">Atualizações não são enviadas automaticamente ao salvar o rascunho.</span></div></section>`;
  // Gestão: o cadastro da planilha é espelho administrativo; a autorização efetiva ocorre neste painel.
  root.insertAdjacentHTML('beforeend','<section id="cpAccountsPanel" class="cp-accounts-panel cp-hidden">'+
   '<div class="cp-accounts-head"><div><small>SEGURANÇA E COLABORADORES</small><h2>Gestão de colaboradores e acessos</h2><p>O cadastro, a autenticação e o histórico de logins são gerenciados aqui. A planilha é apenas uma cópia administrativa.</p></div><button class="cp-btn soft" id="cpAccountsClose" type="button">Fechar</button></div>'+
   '<p><a href="https://docs.google.com/spreadsheets/d/1tnOgWrN04AMiK88lkCCePeP3iOJ0AHnbN_91SpK5kyA/edit" target="_blank" rel="noopener noreferrer">Abrir planilha Cora Família · Acessos Calendário</a></p>'+
   '<div class="cp-audit-export"><div><strong>Histórico de acessos — fonte: Gestão</strong><p>Veja abaixo a ativação, o primeiro e último acesso e a contagem de logins. A planilha não controla permissões: recebe uma cópia destes dados quando a integração Google está autorizada.</p><p class="cp-mirror-status" id="cpMirrorStatus" role="status">Verificando conexão da planilha...</p></div><div class="cp-mirror-actions"><button type="button" id="cpSyncMirror" class="cp-btn" disabled>Sincronizar cópia no Google Sheets</button><button type="button" id="cpCopyAudit" class="cp-btn soft">Copiar relatório (alternativa manual)</button></div></div>'+
    '<div class="cp-invite-howto"><strong>Como o professor recebe a senha?</strong><p><b>1.</b> A Gestão cadastra o e-mail aqui (a planilha sozinha não cria a conta). <b>2.</b> Gere o convite e envie o link ao professor. <b>3.</b> O professor abre o link e cria uma senha pessoal. <b>4.</b> A conta muda de Pendente para Ativo. <b>Não existe envio automático de e-mail.</b></p></div>'+
   '<form id="cpAccountCreate" class="cp-account-form"><label>Nome completo<input name="name" required minlength="5" maxlength="100"></label><label>E-mail individual<input name="email" type="email" required></label>'+
   '<label>Função<select name="profile"><option>Professor</option><option>Coordenação</option><option>Funcionário</option></select></label>'+
   '<fieldset class="cp-segment-fieldset"><legend>Segmentos de atuação <small>(marque todos)</small></legend>'+segmentCheckboxes()+'</fieldset>'+
   '<button class="cp-btn" type="submit">Criar acesso e convite</button></form>'+
   '<div id="cpAccountInvite" class="cp-account-invite" hidden><strong>Convite gerado · aguardando envio</strong><p>O sistema gerou o link de ativação, mas <b>não enviou nenhum e-mail ainda</b>. Escolha uma das opções e entregue o convite apenas ao professor autorizado. Validade: 7 dias.</p>'+
   '<textarea id="cpAccountInviteUrl" readonly rows="3" aria-label="Link de ativação individual"></textarea><div class="cp-invite-buttons"><button type="button" id="cpCopyInvite" class="cp-btn soft">Copiar link de ativação</button><a id="cpEmailInvite" href="#" class="cp-btn" target="_self">Preparar e-mail de convite</a></div><p class="cp-invite-email-notice" id="cpInviteEmailNotice">Preparar e-mail abre o aplicativo de e-mail; você ainda precisa tocar em Enviar.</p></div>'+
   '<div class="cp-account-cutover"><strong id="cpCutoverTitle">Acesso coletivo em migração</strong><p id="cpCutoverDescription">Cadastre e ative as contas antes de exigir login individual para toda a escola.</p><button id="cpEnforceIndividual" type="button" class="cp-btn gold">Exigir login individual para todos</button></div>'+
   '<p role="status" id="cpAccountsStatus" aria-live="polite"></p><div id="cpAccountsList"></div></section>');
  $('#cpPublishNow').insertAdjacentHTML('beforebegin','<button id="cpAccountsOpen" class="cp-btn soft" type="button">Acessos da equipe</button>');
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
    const label={suspend:'Suspender',disable:'Desativar',enable:'Reativar',reinvite:'Reemitir convite'}[operation];
    if(operation!=='updateSegments'&&!confirm(label+' '+email+'?'))return;
    btn.disabled=true;
    try{
      const input={operation,email};
      if(operation==='updateSegments'){
        input.segments=selectedSegments(row.querySelector('.cp-segment-editor'));
        if(!validSelectedSegments(input.segments))throw new Error('Marque um ou mais segmentos; Todos deve ser usado sozinho.');
      }
      const result=await api('accounts',input);
      if(result.inviteUrl)showInvite(result.inviteUrl,result.member?.email);
      await loadAccounts();
    }catch(error){$('#cpAccountsStatus').textContent=error.message}finally{btn.disabled=false}
  };
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
 function showInvite(link,email=''){
  $('#cpAccountInvite').hidden=false;$('#cpAccountInviteUrl').value=link;
  const mailSubject='Colégio Cora Coralina — ativação do Calendário';
  const mailBody='Olá!\n\nA Gestão do Colégio Cora Coralina autorizou seu acesso individual à Equipe Pedagógica do Calendário Anual.\n\nAbra o link abaixo, confira seu e-mail e defina uma senha pessoal com pelo menos 10 caracteres, letras e números:\n\n'+link+'\n\nO convite vale por 7 dias e pode ser usado apenas uma vez. Não compartilhe este link.\n\nAtenciosamente,\nCoordenação Pedagógica';
  $('#cpEmailInvite').href='mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent(mailSubject)+'&body='+encodeURIComponent(mailBody);
  $('#cpInviteEmailNotice').textContent='Nenhum e-mail foi enviado automaticamente. Use Preparar e-mail e confirme o envio, ou copie o link.';
  $('#cpAccountsStatus').textContent='Convite gerado para '+email+'. Agora envie o link; a conta só ficará Ativa quando o professor criar a senha.';
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
    list.innerHTML=(data.members||[]).length?data.members.map(member=>{
     const operations=member.status==='Ativo'?['suspend','disable','reinvite']:member.status==='Suspenso'?['enable','disable','reinvite']:member.status==='Desativado'?['enable']:['reinvite','disable'];
     const labels={suspend:'Suspender',disable:'Desativar',enable:'Reativar',reinvite:'Reemitir convite'};
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
 async function publish(){
  const year=Number(window.CoraYears?.activeYear)||2026;const drafts=loadEventDraft(year);const added=(window.CoraAssessments?.publicationEvents?.(year)||[]).filter(e=>year!==2026||e.assessmentDelivery);const events=[...drafts.filter(e=>e.status!=='Em revisão'&&!e.needsReview&&!/^cora-(entrega-avaliacoes|periodo-avaliacao)-/.test(String(e.id||''))),...added],btn=$('#cpPublishNow');if(!btn)return;btn.disabled=true;
  try{
   // Evita que uma primeira publicação apague o cadastro institucional anterior.
   const previous=await api('state',undefined,'year='+year);
   window.CoraBirthdays?.importBaseline?.(previous.publication?.birthdays||[]);
   const birthdays=window.CoraBirthdays?.all?.()||previous.publication?.birthdays||[];
   const stages=(window.CoraStages?.get?.(year)||[]).map(s=>s.needsReview?{number:s.number,start:'',end:''}:s);const projects=window.CoraYears?.getProjects?.(year)||[];
   const res=await api('publish',{year,events,notices:managerNotices,birthdays,stages,projects,config:{defaultLeadDays:leadDays}});
   $('#cpPubStatus').textContent='Publicado: '+new Date(res.updatedAt).toLocaleString('pt-BR');
   const status=res.push?.registered
     ?' · Web Push: '+res.push.sent+' envio(s) aceitos entre '+res.push.registered+' aparelho(s) cadastrado(s)'
     :' · Web Push: nenhum aparelho inscrito';
   toast('Publicado '+year+': '+res.counts.events+' eventos e '+res.counts.notices+' comunicados'+status+'.');
  }catch(e){toast('Não foi possível publicar: '+e.message);}finally{btn.disabled=false;}
 }
 function teamNav(){return `<div class="cp-team-head"><img id="cpTeamLogo" alt="Brasão do Colégio Cora Coralina"><div><small>COLÉGIO CORA CORALINA · AMBIENTE DE CONSULTA</small><h1>Equipe Pedagógica</h1></div><label class="cp-year-label">Ano letivo <select id="cpTeamYear" aria-label="Ano letivo">${availableYears.map(y=>`<option value="${y}" ${year===y?'selected':''}>${y}</option>`).join('')}</select></label><span class="cp-spacer"></span><button class="cp-btn soft" type="button" id="cpEnableAlerts" title="Ativar notificações mesmo com o aplicativo fechado">Ativar notificações</button><button class="cp-btn cp-bell" id="cpBell" aria-label="Abrir notificações">🔔<em id="cpBellCount" style="display:none">0</em></button><button class="cp-btn" id="cpRefresh">Atualizar</button><button class="cp-btn" id="cpTeamLogout">Sair</button></div>`}

 // Conta individual autenticada fornece o nome; nunca reutilizar o e-mail digitado sem validação.
 function shortWelcomeName(full){
  const words=String(full||'').trim().split(/\s+/).filter(Boolean);
  if(!words.length)return 'professor(a)';
  const compact=words.length>2?[words[0],words[words.length-1]]:words;
  return compact.map(w=>w.toLocaleLowerCase('pt-BR').replace(/(^|[-’'])\p{L}/gu,v=>v.toLocaleUpperCase('pt-BR'))).join(' ');
 }
 function renderTeamWelcome(){
  const area=$('#cpWelcome');if(!area||role!=='equipe')return;
  const fullName=teacherProfile?.name||'';
  const greeting='Olá, '+shortWelcomeName(fullName)+'!';
  const supported='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
  const blocked=supported&&Notification.permission==='denied';
  const info=pushConfirmed
   ?'<div class="cp-welcome-push is-enabled"><span class="cp-welcome-push-symbol" aria-hidden="true">✓</span><div><strong>Notificações ativadas</strong><small>Seu aparelho está cadastrado para avisos da Gestão.</small></div></div>'
   :!pushChecked
    ?'<div class="cp-welcome-push"><span class="cp-welcome-push-symbol" aria-hidden="true">◌</span><div><strong>Verificando notificações</strong><small>Consultando as permissões deste aparelho.</small></div></div>'
    :blocked
     ?'<div class="cp-welcome-push needs-setup"><span class="cp-welcome-push-symbol" aria-hidden="true">!</span><div><strong>Notificações bloqueadas</strong><small>Autorize o Calendário nas configurações do navegador ou Android.</small></div></div>'
     :!supported
      ?'<div class="cp-welcome-push"><span class="cp-welcome-push-symbol" aria-hidden="true">i</span><div><strong>Notificações não disponíveis</strong><small>Abra o aplicativo pelo Chrome no Android para verificar o suporte.</small></div></div>'
      :'<div class="cp-welcome-push needs-setup"><span class="cp-welcome-push-symbol" aria-hidden="true">!</span><div><strong>Ative as notificações</strong><small>Receba avisos da Gestão e lembretes de entregas.</small></div><button type="button" id="cpWelcomeEnablePush">Ativar agora</button></div>';
  area.innerHTML='<div class="cp-welcome-person"><span class="cp-welcome-avatar" aria-hidden="true">'+
   safe((fullName.trim()[0]||'P').toLocaleUpperCase('pt-BR'))+
   '</span><div><small>ACESSO À EQUIPE PEDAGÓGICA</small><h2>'+safe(greeting)+'</h2></div></div>'+info;
  $('#cpWelcomeEnablePush')?.addEventListener('click',enableLocalNotifications);
 }
 async function team(){teacherProfile=null;pushChecked=false;pushConfirmed=false;const deep=new URLSearchParams(location.search);year=Number(deep.get('ano'))||2026;if(deep.get('avisos')==='1')showBell=true;document.body.classList.add('portal-locked');document.body.classList.remove('portal-loading');root.innerHTML=`<div class="cp-team">${teamNav()}<div class="cp-team-main"><section id="cpWelcome" class="cp-welcome" aria-label="Boas-vindas e notificações"></section><div id="cpView"><p class="cp-muted">Carregando publicações da Gestão...</p></div></div></div>`;$('#cpTeamLogo').src=logo();$('#cpTeamLogout').onclick=logout;$('#cpRefresh').onclick=refresh;$('#cpEnableAlerts').onclick=enableLocalNotifications;$('#cpBell').onclick=()=>{showBell=!showBell;drawTeam()};$('#cpTeamYear').onchange=e=>{year=Number(e.target.value)||2026;month=0;showBell=false;tab='resumo';refresh()};await refresh();void confirmDevicePush();clearInterval(timer);timer=setInterval(()=>{if(!document.hidden)refresh()},30000);}
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
    const picker=$('#cpTeamYear');if(picker){picker.innerHTML=availableYears.map(y=>`<option value="${y}" ${year===y?'selected':''}>${y}</option>`).join('');picker.value=String(year)}renderTeamWelcome();drawTeam();checkLocalNotifications()}catch(e){if(e.status===401){clearInterval(timer);gateway('Sessão expirada. Entre novamente.');return;}toast('Falha ao atualizar: '+e.message);}}


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
   }catch(error){console.warn('Aviso do Android indisponível',error);return false}
 }

 const urlBase64ToUint8=base64=>{
  const padding='='.repeat((4-base64.length%4)%4);
  const raw=atob((base64+padding).replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from(raw,ch=>ch.charCodeAt(0));
 };
 async function registerDeviceForPush(){
  if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){
   throw new Error('Este navegador não oferece Web Push. Abra o app instalado pelo Chrome do Android.');
  }
  let permission=Notification.permission;
  if(permission!=='granted')permission=await Notification.requestPermission();
  if(permission!=='granted')throw new Error('Notificações bloqueadas nas permissões do Android.');
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
  const button=$('#cpEnableAlerts');
  const welcomeButton=$('#cpWelcomeEnablePush');if(welcomeButton){welcomeButton.disabled=true;welcomeButton.textContent='Ativando...'}
  if(button){button.disabled=true;button.textContent='Conectando...'}
  try{
   const subscription=await registerDeviceForPush();
   updatePushButton(true);
   try{
     const result=await api('push-test',{subscription:subscription.toJSON()});
     toast(result.sent?'Celular inscrito! Teste de push enviado pelo servidor: confira a notificação do Android.':'Celular inscrito; teste ainda não confirmado.');
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
  button.textContent=active?'✓ Notificações ativas':'Ativar notificações';
  button.title=active?'Este aparelho está inscrito para receber avisos publicados pela Gestão.':'Autorize o Android para receber avisos com o aplicativo fechado.';
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
 function drawTeam(){const here=$('#cpView');if(!here)return;
  const events=filteredEvents(),notes=activeNotices(),assess=events.filter(e=>isAssessment(e)&&!isSecond(e)),alertList=upcoming(),unread=alertList.filter(a=>a.unread).length;
  const badge=$('#cpBellCount');if(badge){badge.style.display=unread?'block':'none';badge.textContent=unread>99?'99+':String(unread);badge.setAttribute('aria-label',unread+' alertas não lidos')}const bell=$('#cpBell');if(bell){bell.classList.toggle('has-unread',unread>0);bell.setAttribute('aria-label',unread?unread+' alertas novos. Abrir notificações':'Abrir notificações')}
  const sections=[['resumo','Visão Geral'],['calendario','Calendário '+year],['etapas','Etapas letivas'],['avaliacoes','Avaliações e Simulados'],['entregas','Prazos de entrega'],['aniversarios','🎂 Aniversariantes'],['avisos','Avisos'],['pdf','PDF Anual']];
  const tabs=`<div class="cp-tabs">${sections.map(([id,label])=>`<button class="${tab===id?'active':''}" data-cp-tab="${id}">${label}</button>`).join('')}</div>`;
  const alertPrompt=!showBell&&unread?'<button type="button" id="cpUnreadPrompt" class="cp-unread-banner">🔔 '+unread+' alerta(s) não lido(s) · Toque para ver os recados da Gestão</button>':'';

  const fmtStage=date=>date?date.slice(8,10)+'/'+date.slice(5,7):'A definir';
  const stageList=Array.isArray(data?.stages)?data.stages:[];
  const todayISO=dateStr(new Date());
  const currentStage=stageList.find(st=>st.start&&st.end&&todayISO>=st.start&&todayISO<=st.end);
  const closestStage=currentStage||stageList.find(st=>st.start&&st.start>todayISO)||stageList.find(st=>st.start);
  const flowStages=[1,2,3,4].map(n=>{
   const st=stageList.find(x=>Number(x.number)===n)||{};
   const active=st.start&&st.end&&todayISO>=st.start&&todayISO<=st.end;
   return '<button type="button" class="cp-flow-stage '+(active?'active':'')+'" data-cp-stage="'+n+'">'+
    '<span class="cp-flow-stage-num">0'+n+'</span><strong>'+n+'ª etapa</strong>'+
    '<span class="cp-flow-stage-date"><small>Início</small>'+fmtStage(st.start)+'</span>'+
    '<span class="cp-flow-stage-date"><small>Fim</small>'+fmtStage(st.end)+'</span>'+
    (active?'<em>Em andamento</em>':'')+'</button>';
  }).join('');
  const quickLinks=[['calendario','▦','Calendário','Atividades e projetos'],['avaliacoes','✓','Avaliações','Provas e simulados'],
    ['entregas','⌛','Entregas','Prazos e e-mails'],['avisos','✉','Comunicados','Orientações da Gestão'],['pdf','↓','PDF anual','Documento completo']].map(item=>
    '<button type="button" class="cp-flow-link" data-cp-tab="'+item[0]+'"><span class="cp-flow-icon">'+item[1]+'</span>'+
    '<span><strong>'+item[2]+'</strong><small>'+item[3]+'</small></span><b>›</b></button>').join('');
  // Área de ferramentas externas da Equipe; SVG provisório do Gestor será trocado pela marca original.
  const roteiroIcon='<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="3" width="14.5" height="18" rx="2"></rect><path d="M8 3v18M11 8h5M11 12h5M11 16h3"></path><path d="m15.9 17.2 3.6-3.6 1.4 1.4-3.6 3.6-2.2.8z"></path></svg>';
  const gestorIcon='<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.2 12 4l9 6.2"></path><path d="M5.5 9.8V20h13V9.8"></path><path d="M10 20v-6.5h4V20"></path><path d="M8 10h.01M16 10h.01"></path><path d="M9 6.1V3h6v3.1"></path></svg>';
  // Abrimos o endereço oficial do Classroom: o atalho "Agenda" depende da conta e da interface Google.
  const classroomIcon='<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2"></rect><path d="M7 3v4M17 3v4M3.5 10h17M8 14h3M8 17h7"></path></svg>';
  const saeIcon='<svg viewBox="0 0 24 24" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 5.5 12 3l8.5 2.5v13L12 21l-8.5-2.5z"></path><path d="M12 3v18M7 8l2.8 1M7 12l2.8 1M15 9l2.4-1M15 13l2.4-1"></path></svg>';
  const openIcon='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5h6v6M19 5l-9 9"></path><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"></path></svg>';
  const teacherTools='<section class="cp-teacher-tools" aria-labelledby="cpTeacherToolsTitle">'+
   '<div class="cp-teacher-tools-head"><div><small>ACESSOS PEDAGÓGICOS</small><h3 id="cpTeacherToolsTitle">Ferramentas do professor</h3></div><span>Roteiros, notas, agenda e materiais digitais</span></div>'+
   '<div class="cp-teacher-tools-grid">'+
    '<a class="cp-teacher-tool" href="'+TEACHER_LINKS.roteiros+'" target="_blank" rel="noopener noreferrer" aria-label="Abrir Digitação de roteiros em nova aba">'+
     '<span class="cp-teacher-tool-icon cp-teacher-tool-roteiros" aria-hidden="true">'+roteiroIcon+'</span>'+
     '<span class="cp-teacher-tool-copy"><strong>Digitação de roteiros</strong><small>Planilha de roteiros pedagógicos</small></span>'+
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
  const flowHeader=showBell?'':'<section class="cp-flow-hero"><div class="cp-flow-hero-text">'+
   '<small>COLÉGIO CORA CORALINA · EQUIPE PEDAGÓGICA</small><h2>Seu ano letivo, organizado.</h2>'+
   '<p>Uma visão clara das atividades, avaliações e informações da Gestão para '+year+'.</p>'+
   '<div class="cp-flow-tags"><span>'+events.length+' atividades</span><span>'+assess.length+' avaliações</span><span>'+notes.length+' comunicados</span></div></div>'+
   '<div class="cp-flow-feature"><small>ETAPAS DO ANO · '+year+'</small><strong>'+(closestStage?closestStage.number+'ª etapa':'Períodos letivos')+'</strong>'+
   '<span>'+(closestStage?fmtStage(closestStage.start)+' até '+fmtStage(closestStage.end):'A definir pela Gestão')+'</span>'+
   '<button type="button" data-cp-tab="etapas">Consultar etapas ›</button></div></section>'+
   '<div class="cp-flow-links">'+quickLinks+'</div>'+
   teacherTools+
   '<section class="cp-flow-stage-section"><div class="cp-flow-stage-title"><div><small>PLANEJAMENTO · '+year+'</small>'+
   '<h3>Início e fim das etapas</h3></div><span>Consulte antes de planejar avaliações</span></div>'+
   '<div class="cp-flow-stage-grid">'+flowStages+'</div></section>';
  let content='';
  if(!data){content='<div class="cp-paper"><h2>Nenhuma publicação disponível</h2><p class="cp-muted">A Gestão ainda não publicou o calendário e os comunicados para a equipe. O conteúdo ficará disponível aqui após a primeira publicação.</p></div>'}
  else if(showBell){content=`<div class="cp-bell-panel"><div class="cp-main-heading"><div class="cp-alert-heading-left"><button type="button" class="cp-btn soft cp-back-alert" id="cpBackFromBell" aria-label="Voltar à Equipe Pedagógica">← Voltar</button><h2>🔔 Central de alertas</h2></div><button class="cp-btn soft" id="cpMarkRead">Marcar como lidos</button></div>${alertList.length?alertList.map(a=>`<article class="cp-alert-entry ${a.unread?'unread':''}"><time>${safe(String(a.date||'').slice(0,10))}</time><div><small>${a.kind==='notice'?'Comunicado da Gestão':a.kind==='reminder'?'Lembrete programado':'Evento próximo'}</small><strong>${safe(a.title)}</strong><p>${safe(a.desc||'')}</p>${a.unread?'<span class="cp-tag cp-tag-new">Novo · não lido</span>':''}</div><button class="cp-btn soft" type="button" data-cp-read="${safe(a.id)}">✓ Lido</button></article>`).join(''):'<p class="cp-muted">Nenhuma atividade ou aviso exige atenção no período configurado.</p>'}</div>`;}
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
    }).join(''):'<p class="cp-muted">Nenhuma entrega de avaliações publicada para '+year+'.</p>';
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
  else content=`<div class="cp-main-heading"><h2>Calendário anual ${year}</h2></div><div class="cp-paper"><h3>Documento publicado pela Gestão</h3><p>Inclui os 12 meses de ${year}, com atividades, etapas e projetos publicados.</p><button class="cp-btn gold" id="cpDownloadPublished">↓ Baixar PDF anual ${year}</button><p class="cp-status" id="cpPdfProgress"></p></div>`;

  here.innerHTML=`${flowHeader}${showBell?'':`<div class="cp-overview"><div class="cp-metric"><small>Atividades publicadas</small><strong>${events.length}</strong></div><div class="cp-metric"><small>Avaliações e simulados</small><strong>${assess.length}</strong></div><div class="cp-metric"><small>Avisos disponíveis</small><strong>${notes.length}</strong></div></div>${tabs}`}${alertPrompt}${content}<p class="cp-updated">Última publicação da Gestão: ${data?new Date(data.updatedAt).toLocaleString('pt-BR'):'ainda não publicada'} · Atualização automática enquanto o aplicativo estiver aberto.</p>`;
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

  here.querySelectorAll('[data-cp-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.cpTab;showBell=false;drawTeam()});
  here.querySelectorAll('[data-cp-stage]').forEach(b=>b.onclick=()=>{selectedStage=Number(b.dataset.cpStage)||0;tab='etapas';showBell=false;drawTeam()});
  $('#cpMonthPicker')?.addEventListener('change',e=>{month=Number(e.target.value);drawTeam()});
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
   if(activationGateway())return;
   const s=await api('me');individualRequired=Boolean(s.individualRequired);
   if(s.role){role=s.role;await enter()}else gateway();
  }catch(e){unavailable(e);}
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&role==='equipe')refresh()});
 window.addEventListener('focus',()=>{if(role==='equipe'&&!document.hidden)refresh()});
 if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('message',event=>{
   if(event.data?.type==='cora-open-alerts'&&role==='equipe'){showBell=true;drawTeam()}
 });
 start();
})();