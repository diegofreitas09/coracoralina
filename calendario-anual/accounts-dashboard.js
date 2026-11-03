/* Gestão Cora Coralina — Dashboard de contas, usando exclusivamente o retorno autenticado da API. */
(() => {
 'use strict';
 const state={query:'',status:'todos',profile:'todos',sort:'nome',page:1};
 const PAGE_SIZE=8;
 const collator=new Intl.Collator('pt-BR',{sensitivity:'base',numeric:true});
 const fmtNumber=value=>Number(value).toLocaleString('pt-BR');
 const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
 const norm=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
 const countLogins=member=>{
  const value=member?.accessCount;
  if(value===null||value===undefined||value==='')return null;
  const numeric=Number(value);
  return Number.isSafeInteger(numeric)&&numeric>=0?numeric:null;
 };
 const validDate=value=>{if(!value)return 0;const t=Date.parse(value);return Number.isFinite(t)?t:0};
 const fmtDate=value=>{if(!value||!validDate(value))return 'Ainda não registrado';return new Date(value).toLocaleString('pt-BR',{timeZone:'America/Fortaleza',dateStyle:'short',timeStyle:'short'})};
 const isTeacher=member=>/^professor/i.test(String(member?.profile||'').trim());
 const keyProfile=member=>{
  const p=norm(member?.profile);
  if(p.startsWith('professor'))return 'Professor';
  if(p.includes('coorden'))return 'Coordenação';
  if(p.includes('funcion'))return 'Funcionário';
  return 'Outros';
 };
 const statusClasses={Ativo:'active',Pendente:'pending',Suspenso:'suspended',Desativado:'disabled'};
 const statusLabel=status=>status==='Pendente'?'Aguardando ativação':status||'Não informado';
 let members=[],panel=null,segmentInputs=()=>'',loaded=false;
 const root=()=>panel&&panel.isConnected?panel:null;
 const byId=id=>root()?.querySelector('#'+id);
 const icon=name=>{
  const shapes={
   people:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
   teacher:'<path d="m2 9 10-5 10 5-10 5-10-5Z"/><path d="M6 11v6c3.4 3 8.6 3 12 0v-6M22 9v7"/>',
   check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
   clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
   visits:'<path d="M4 20h16M6 16v-5m6 5V5m6 11V9"/><path d="M3 3h18"/>'
  };
  return '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(shapes[name]||shapes.people)+'</svg>';
 };
 function metric(label,value,description,style,iconName){
  return '<article class="cp-access-kpi cp-access-kpi-'+style+'"><span class="cp-access-kpi-icon" aria-hidden="true">'+icon(iconName)+'</span>'+
   '<span class="cp-access-kpi-value">'+safe(value)+'</span><strong>'+safe(label)+'</strong><small>'+safe(description)+'</small></article>';
 }
 function distribution(title,legend,groups,total){
  return '<section class="cp-access-chart"><h4>'+safe(title)+'</h4><p>'+safe(legend)+'</p>'+
    groups.map(g=>{const count=members.filter(g.test).length,percent=total?Math.round(count/total*100):0;
     return '<div class="cp-access-chart-row"><span>'+safe(g.label)+'</span><strong>'+fmtNumber(count)+'</strong></div>'+
      '<div class="cp-access-chart-track" role="img" aria-label="'+safe(g.label)+': '+count+' de '+total+'"><span class="cp-access-chart-fill '+safe(g.style)+'" style="width:'+percent+'%"></span></div>';
    }).join('')+'</section>';
 }
 function renderDashboard(){
  const area=byId('cpAccessDashboard');if(!area)return;
  const total=members.length,teachers=members.filter(isTeacher).length,active=members.filter(m=>m.status==='Ativo').length,pending=members.filter(m=>m.status==='Pendente').length;
  const logged=members.filter(m=>countLogins(m)!==null);
  const visits=logged.reduce((sum,m)=>sum+countLogins(m),0);
  const statusGroups=[
   {label:'Ativos',test:m=>m.status==='Ativo',style:'active'},
   {label:'Pendentes',test:m=>m.status==='Pendente',style:'pending'},
   {label:'Suspensos',test:m=>m.status==='Suspenso',style:'suspended'},
   {label:'Desativados',test:m=>m.status==='Desativado',style:'disabled'}
  ];
  const otherStatus=members.filter(m=>!statusGroups.some(g=>g.test(m))).length;
  if(otherStatus)statusGroups.push({label:'Outras situações',test:m=>!['Ativo','Pendente','Suspenso','Desativado'].includes(m.status),style:'other'});
  const profileGroups=[
   {label:'Professores',test:m=>keyProfile(m)==='Professor',style:'teacher'},
   {label:'Coordenação',test:m=>keyProfile(m)==='Coordenação',style:'coord'},
   {label:'Funcionários',test:m=>keyProfile(m)==='Funcionário',style:'staff'},
   {label:'Outros',test:m=>keyProfile(m)==='Outros',style:'other'}
  ].filter(g=>members.some(g.test));
  area.innerHTML='<div class="cp-access-dashboard-heading"><div><small>CONTROLE DE CONTAS · DADOS DA GESTÃO</small><h3>Painel de acessos</h3><p>Indicadores atualizados a partir dos cadastros e históricos disponíveis na plataforma.</p></div><span class="cp-access-data-label">Dados reais</span></div>'+
   '<div class="cp-access-kpis">'+
    metric('Colaboradores cadastrados',fmtNumber(total),'Todas as funções','total','people')+
    metric('Professores cadastrados',fmtNumber(teachers),'Contas com função Professor','teacher','teacher')+
    metric('Contas ativas',fmtNumber(active),'Acesso autorizado','active','check')+
    metric('Aguardando ativação',fmtNumber(pending),'Convites pendentes','pending','clock')+
    metric('Acessos monitorados',logged.length?fmtNumber(visits):'—',logged.length+' de '+total+' contas com histórico','visits','visits')+'</div>'+
   '<div class="cp-access-chart-grid">'+
     distribution('Situação dos cadastros','Distribuição das contas cadastradas',statusGroups,total)+
     distribution('Equipe por função','Contagem de contas por perfil',profileGroups,total)+
   '</div>'+
   (logged.length<total?'<p class="cp-access-coverage">Histórico de acessos disponível para '+logged.length+' de '+total+' contas. A soma não inclui registros anteriores indisponíveis; ela não representa visitantes únicos nem visualizações de páginas.</p>':
    '<p class="cp-access-coverage">Acessos monitorados = soma dos logins registrados, não visitantes únicos nem visualizações de páginas.</p>');
 }
 function controls(){
  const area=byId('cpAccessFilters');if(!area)return;
  area.innerHTML='<div class="cp-access-directory-head"><div><small>CONSULTA INDIVIDUAL</small><h3>Colaboradores cadastrados</h3><p>Toque no nome para consultar o histórico e gerenciar a conta.</p></div><span id="cpAccessResultsCount" aria-live="polite"></span></div>'+
   '<div class="cp-access-filter-row">'+
    '<label class="cp-access-search"><span>Buscar colaborador</span><input type="search" id="cpAccessQuery" placeholder="Nome ou e-mail..." autocomplete="off" value="'+safe(state.query)+'" /></label>'+
    '<label><span>Situação</span><select id="cpAccessStatus"><option value="todos">Todas</option><option value="Ativo">Ativos</option><option value="Pendente">Pendentes</option><option value="Suspenso">Suspensos</option><option value="Desativado">Desativados</option></select></label>'+
    '<label><span>Função</span><select id="cpAccessProfile"><option value="todos">Todas</option><option value="Professor">Professores</option><option value="Coordenação">Coordenação</option><option value="Funcionário">Funcionários</option><option value="Outros">Outros</option></select></label>'+
    '<label><span>Ordenar</span><select id="cpAccessSort"><option value="nome">Nome (A–Z)</option><option value="recentes">Último acesso</option><option value="mais">Mais acessos</option></select></label>'+
   '</div>';
  byId('cpAccessStatus').value=state.status;
  byId('cpAccessProfile').value=state.profile;
  byId('cpAccessSort').value=state.sort;
 }
 function record(m){
  const status=String(m.status||'Não informado'),count=countLogins(m);
  const operations=status==='Ativo'?['resetPassword','suspend','disable']:status==='Suspenso'?['enable','disable','reinvite']:status==='Desativado'?['enable']:['reinvite','disable'];
  const labels={resetPassword:'Redefinir senha',suspend:'Suspender',disable:'Desativar',enable:'Reativar',reinvite:'Reemitir convite'};
  const displayName=String(m.name||'Colaborador sem nome');
  const initials=displayName.split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toLocaleUpperCase('pt-BR')||'—';
  const segments=Array.isArray(m.segments)?m.segments:[];
  return '<details class="cp-account-person"><summary class="cp-person-summary">'+
   '<span class="cp-person-avatar" aria-hidden="true">'+safe(initials)+'</span>'+
   '<span class="cp-person-name"><strong>'+safe(displayName)+'</strong><small>'+safe(m.email)+'</small></span>'+
   '<span class="cp-person-profile">'+safe(m.profile||'Sem função')+'</span>'+
   '<span class="cp-account-status cp-account-status-'+(statusClasses[status]||'other')+'">'+safe(statusLabel(status))+'</span>'+
   '<span class="cp-person-logins"><strong>'+(count===null?'—':fmtNumber(count))+'</strong><small>acessos</small></span>'+
   '<span class="cp-person-chevron" aria-hidden="true">⌄</span></summary>'+
   '<div class="cp-account-details"><p class="cp-person-segments"><b>Segmentos:</b> '+safe(segments.length?segments.join(', '):(m.segment||'Não informado'))+'</p>'+
   '<div class="cp-account-audit">'+
    '<span><b>Ativação</b>'+safe(fmtDate(m.activatedAt))+'</span>'+
    '<span><b>Primeiro acesso monitorado</b>'+safe(fmtDate(m.firstAccessAt))+'</span>'+
    '<span><b>Último acesso</b>'+safe(fmtDate(m.lastLogin))+'</span>'+
    '<span><b>Acessos registrados</b>'+(count===null?'Histórico anterior não disponível':fmtNumber(count))+'</span></div>'+
   '<div class="cp-account-buttons">'+operations.map(action=>'<button type="button" data-account-operation="'+safe(action)+'" data-account-email="'+safe(m.email)+'">'+safe(labels[action])+'</button>').join('')+
    '<button type="button" data-account-operation="editSegments" data-account-email="'+safe(m.email)+'">Editar segmentos</button></div>'+
   '<div class="cp-segment-editor" hidden><strong>Segmentos de atuação</strong>'+segmentInputs(segments)+
    '<button type="button" data-account-operation="updateSegments" data-account-email="'+safe(m.email)+'">Salvar segmentos</button></div></div></details>';
 }
 function filtered(){
  const query=norm(state.query.trim());
  const result=members.filter(m=>{
   if(state.status!=='todos'&&m.status!==state.status)return false;
   if(state.profile!=='todos'&&keyProfile(m)!==state.profile)return false;
   if(query&&!norm((m.name||'')+' '+(m.email||'')).includes(query))return false;
   return true;
  });
  result.sort((a,b)=>{
   if(state.sort==='recentes')return validDate(b.lastLogin)-validDate(a.lastLogin)||collator.compare(a.name||'',b.name||'');
   if(state.sort==='mais')return (countLogins(b)??-1)-(countLogins(a)??-1)||collator.compare(a.name||'',b.name||'');
   return collator.compare(a.name||'',b.name||'');
  });
  return result;
 }
 function renderList(){
  const list=byId('cpAccountsList'),pager=byId('cpAccessPager');if(!list||!pager)return;
  const data=filtered(),totalPages=Math.max(1,Math.ceil(data.length/PAGE_SIZE));
  state.page=Math.max(1,Math.min(state.page,totalPages));
  const first=(state.page-1)*PAGE_SIZE,slice=data.slice(first,first+PAGE_SIZE);
  list.innerHTML=data.length?slice.map(record).join(''):'<div class="cp-access-no-results">Nenhum cadastro corresponde à busca ou aos filtros selecionados.</div>';
  const count=byId('cpAccessResultsCount');
  if(count)count.textContent=data.length===0?'0 resultados':'Mostrando '+fmtNumber(first+1)+'–'+fmtNumber(first+slice.length)+' de '+fmtNumber(data.length);
  pager.innerHTML=data.length>PAGE_SIZE?
   '<span>Página '+state.page+' de '+totalPages+'</span><div>'+
   '<button type="button" data-cp-page="prev" '+(state.page===1?'disabled':'')+'>Anterior</button>'+
   '<button type="button" data-cp-page="next" '+(state.page===totalPages?'disabled':'')+'>Próxima</button></div>':'';
 }
 function bind(){
  if(!root()||panel.dataset.accountsDashBound==='1')return;
  panel.dataset.accountsDashBound='1';
  panel.addEventListener('input',e=>{
   if(e.target?.id==='cpAccessQuery'){state.query=e.target.value;state.page=1;renderList();}
  });
  panel.addEventListener('change',e=>{
   const id=e.target?.id;
   if(id==='cpAccessStatus')state.status=e.target.value;
   else if(id==='cpAccessProfile')state.profile=e.target.value;
   else if(id==='cpAccessSort')state.sort=e.target.value;
   else return;
   state.page=1;renderList();
  });
  panel.addEventListener('click',e=>{
   const button=e.target.closest?.('[data-cp-page]');if(!button||button.disabled)return;
   state.page+=button.dataset.cpPage==='next'?1:-1;
   renderList();
  });
 }
 function mount(data,renderer){
  panel=document.getElementById('cpAccountsPanel');
  if(!panel)return;
  members=Array.isArray(data)?data:[];
  segmentInputs=typeof renderer==='function'?renderer:()=>'<p>Segmentos indisponíveis</p>';
  if(!loaded||!byId('cpAccessFilters')?.querySelector('#cpAccessQuery'))controls();
  bind();
  renderDashboard();
  renderList();
  loaded=true;
 }
 window.CoraAccountsUI={mount};
})();