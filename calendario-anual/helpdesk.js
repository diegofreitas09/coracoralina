/* Atendimento pedagógico. Os dados ficam no servidor; nada é publicado no calendário. */
(() => {
 'use strict';
 const API='/calendario-anual/api';
 const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const dateTime=value=>{try{return new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});}catch{return ''}};
 let ctx=null,clock=null,loading=false;
 async function request(action,payload,params={}){
  const url=new URL(API,location.origin);url.searchParams.set('action',action);
  for(const [key,value] of Object.entries(params))url.searchParams.set(key,value);
  const opt={credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}};
  if(payload!==undefined){opt.method='POST';opt.headers['content-type']='application/json';opt.headers['x-cora-request']='portal';opt.body=JSON.stringify(payload);}
  const response=await fetch(url,opt);let json={};try{json=await response.json()}catch{}
  if(!response.ok)throw new Error(json.error||'Falha de comunicação. Tente novamente.');
  return json;
 }
 function teardown(){
  if(clock)clearInterval(clock);clock=null;
  if(ctx?.layer)ctx.layer.remove();
  if(ctx?.button)ctx.button.remove();
  ctx=null;
 }
 function showError(message){
  const el=ctx?.layer?.querySelector('#cpHelpMessage');
  if(el){el.textContent=message||'';el.hidden=!message;}
 }
 function badge(){
  if(!ctx)return;
  const count=ctx.mode==='gestao'
   ?ctx.threads.filter(x=>x.status==='Aguardando Gestão').length
   :ctx.threads.filter(x=>x.status==='Respondida').length;
  const node=ctx.button.querySelector('.cp-help-count');
  if(node){node.textContent=count>99?'99+':String(count);node.hidden=count===0;}
 }
 async function fetchList(){
  if(!ctx||loading)return;
  loading=true;
  const local=ctx;
  try{
   const data=await request('help-list');
   if(ctx!==local)return;
   local.threads=data.threads||[];
   local.error='';
   badge();
   if(local.open)renderList();
  }catch(e){
   if(ctx!==local)return;
   local.error=e.message;
   if(local.open)showError(e.message);
  }finally{loading=false;}
 }
 function isPending(t){return t.status==='Aguardando Gestão'}
 function renderList(){
  if(!ctx)return;
  const box=ctx.layer.querySelector('#cpHelpList');
  if(!box)return;
  const items=ctx.threads.filter(t=>ctx.filter==='todos'||(ctx.filter==='pendentes'?isPending(t):!isPending(t)));
  box.innerHTML=items.length?items.map(t=>'<button type="button" class="cp-help-thread'+(ctx.current?.id===t.id?' active':'')+
   '" data-help-thread="'+escapeHTML(t.id)+'" data-help-owner="'+escapeHTML(t.ownerId)+'">'+
   '<span class="cp-help-thread-top"><strong>'+escapeHTML(t.title)+'</strong><time>'+escapeHTML(dateTime(t.lastAt))+'</time></span>'+
   (ctx.mode==='gestao'?'<small>'+escapeHTML(t.author?.name||'Colaborador')+'</small>':'')+
   '<span class="cp-help-thread-sub"><span class="cp-help-pill '+(isPending(t)?'pending':'answered')+'">'+
   (ctx.mode==='gestao'?(isPending(t)?'Aguardando resposta':'Respondida'):(isPending(t)?'Aguardando Gestão':'Respondida'))+
   '</span><small>'+escapeHTML(t.category)+'</small></span></button>').join(''):
   '<p class="cp-help-empty">'+(ctx.mode==='gestao'?'Nenhuma solicitação encontrada.':'Nenhuma pergunta cadastrada. Envie sua primeira dúvida.')+'</p>';
  const total=ctx.layer.querySelector('#cpHelpSummary');
  if(total)total.textContent=ctx.mode==='gestao'?
   (ctx.threads.filter(isPending).length+' aguardando resposta · '+ctx.threads.length+' atendimento(s)'):
   (ctx.threads.length+' atendimento(s) registrado(s)');
  if(ctx.mode==='gestao'){
   const filter=ctx.layer.querySelector('#cpHelpFilter');
   if(filter)filter.value=ctx.filter;
  }
 }
 function renderThread(){
  if(!ctx)return;
  const pane=ctx.layer.querySelector('#cpHelpConversation');
  if(!pane)return;
  const data=ctx.current;
  if(ctx.composing){
   pane.innerHTML='<div class="cp-help-intro"><h3>Nova dúvida para a Gestão</h3><p>Descreva sua solicitação de forma clara. A conversa ficará disponível apenas à sua conta e à Gestão Escolar.</p>'+
    '<form id="cpHelpCreate" class="cp-help-form">'+
    '<label>Assunto<input name="title" maxlength="120" minlength="5" required placeholder="Ex.: Prazo para entrega das avaliações"></label>'+
    '<label>Categoria<select name="category" required><option value="Planejamento">Planejamento</option><option value="Avaliações e provas">Avaliações e provas</option><option value="Calendário e eventos">Calendário e eventos</option><option value="Acesso ao aplicativo">Acesso ao aplicativo</option><option value="Outros">Outros</option></select></label>'+
    '<label>Sua pergunta<textarea name="body" rows="6" minlength="12" maxlength="2500" required placeholder="Escreva aqui sua dúvida para a Coordenação..."></textarea></label>'+
    '<div class="cp-help-form-actions"><button class="cp-help-primary" type="submit">Enviar pergunta</button><button class="cp-help-secondary" type="button" data-help-cancel>Cancelar</button></div></form></div>';
   pane.scrollTop=0;return;
  }
  if(!data){
   pane.innerHTML='<div class="cp-help-intro"><div class="cp-help-intro-icon">?</div><h3>Atendimento pedagógico</h3><p>'+
    (ctx.mode==='gestao'?'Selecione uma solicitação ao lado para ler e responder ao professor.':'Envie suas dúvidas sobre planejamento, avaliações, calendário ou acesso ao aplicativo.')+
    '</p>'+(ctx.mode==='equipe'?'<button type="button" class="cp-help-primary" data-help-new>Fazer uma pergunta</button>':'')+'</div>';
   return;
  }
  const messages=ctx.messages||[];
  pane.innerHTML='<div class="cp-help-conversation-head"><small>'+escapeHTML(data.category)+
   '</small><h3>'+escapeHTML(data.title)+'</h3><span>'+escapeHTML(data.author?.name||'Professor(a)')+
   ' · '+escapeHTML(dateTime(data.createdAt))+'</span></div>'+
   '<div class="cp-help-messages">'+messages.map(message=>{
    const own=(ctx.mode==='gestao'&&message.from==='gestao')||(ctx.mode==='equipe'&&message.from==='equipe');
    return '<article class="cp-help-bubble '+(own?'own':'other')+'"><small>'+
     escapeHTML(message.name|| (message.from==='gestao'?'Gestão Escolar':'Professor(a)'))+
     ' · '+escapeHTML(dateTime(message.at))+'</small><p>'+escapeHTML(message.body)+'</p></article>';
   }).join('')+'</div>'+
   '<form id="cpHelpReply" class="cp-help-reply-form"><label for="cpHelpReplyText">Sua resposta</label>'+
   '<textarea id="cpHelpReplyText" name="body" maxlength="2500" minlength="3" required rows="3" placeholder="'+
   (ctx.mode==='gestao'?'Digite a orientação da Coordenação...':'Escreva uma nova mensagem para a Gestão...')+
   '"></textarea><div class="cp-help-form-actions"><button class="cp-help-primary" type="submit">Enviar resposta</button>'+
   '<button class="cp-help-secondary" type="button" data-help-update>Atualizar conversa</button></div></form>';
  const scroll=pane.querySelector('.cp-help-messages');
  if(scroll)scroll.scrollTop=scroll.scrollHeight;
 }
 async function showThread(id,ownerId){
  if(!ctx)return;const token=ctx, pane=ctx.layer.querySelector('#cpHelpConversation');
  token.composing=false;token.current={id,ownerId};token.messages=[];
  if(pane)pane.innerHTML='<p class="cp-help-empty">Carregando conversa...</p>';
  try{
   const reply=await request('help-thread',undefined,{id,ownerId});
   if(ctx!==token||ctx.current?.id!==id)return;
   token.current=reply.thread;token.messages=reply.messages||[];showError('');renderThread();renderList();
  }catch(e){if(ctx===token)showError(e.message);}
 }
 async function sendNew(form){
  const button=form.querySelector('[type=submit]'),payload=Object.fromEntries(new FormData(form));
  button.disabled=true;showError('');
  try{
   const response=await request('help-create',payload);
   if(!ctx)return;
   ctx.composing=false;
   await fetchList();
   await showThread(response.id,response.ownerId);
  }catch(e){showError(e.message);button.disabled=false;}
 }
 async function sendReply(form){
  if(!ctx?.current)return;
  const button=form.querySelector('[type=submit]'),body=form.elements.body.value;
  const ticket={...ctx.current};button.disabled=true;showError('');
  try{
   await request('help-reply',{id:ticket.id,ownerId:ticket.ownerId,body});
   if(!ctx)return;
   await fetchList();
   await showThread(ticket.id,ticket.ownerId);
  }catch(e){showError(e.message);button.disabled=false;}
 }
 async function open(){
  if(!ctx)return;
  ctx.open=true;ctx.layer.hidden=false;document.body.classList.add('cp-help-visible');
  ctx.button.setAttribute('aria-expanded','true');
  showError('');await fetchList();
  if(ctx.current?.id)await showThread(ctx.current.id,ctx.current.ownerId);
  else renderThread();
  const close=ctx.layer.querySelector('#cpHelpClose');close?.focus();
 }
 function close(){
  if(!ctx)return;
  ctx.open=false;ctx.layer.hidden=true;document.body.classList.remove('cp-help-visible');
  ctx.button.setAttribute('aria-expanded','false');ctx.button.focus();
 }
 function mount(mode,root){
  teardown();
  if(!['gestao','equipe'].includes(mode)||!root)return;
  const bar=root.querySelector(mode==='gestao'?'.cp-manager-bar':'.cp-team-head');
  if(!bar)return;
  const button=document.createElement('button');button.type='button';button.className='cp-help-launch';
  button.setAttribute('aria-expanded','false');
  button.innerHTML='<span aria-hidden="true">✉</span> '+(mode==='gestao'?'Dúvidas da equipe':'Tire suas dúvidas')+
   '<span class="cp-help-count" hidden>0</span>';
  const before=bar.querySelector(mode==='gestao'?'#cpLogout':'#cpTeamLogout');
  if(before)bar.insertBefore(button,before);else bar.append(button);
  const layer=document.createElement('div');layer.className='cp-help-overlay';layer.hidden=true;
  layer.innerHTML='<section class="cp-help-dialog" role="dialog" aria-modal="true" aria-label="Tire suas dúvidas">'+
   '<header class="cp-help-header"><div><small>COLÉGIO CORA CORALINA · ATENDIMENTO PEDAGÓGICO</small><h2>'+
   (mode==='gestao'?'Dúvidas da equipe':'Tire suas dúvidas')+'</h2><p>Canal direto entre a Gestão Escolar e a Equipe Pedagógica</p></div>'+
   '<button type="button" id="cpHelpClose" aria-label="Fechar atendimento">×</button></header>'+
   '<div id="cpHelpMessage" class="cp-help-alert" role="status" hidden></div>'+
   '<div class="cp-help-layout"><aside class="cp-help-sidebar"><div class="cp-help-side-head">'+
   (mode==='equipe'?'<button type="button" class="cp-help-primary" data-help-new>+ Nova pergunta</button>':
    '<label>Exibir <select id="cpHelpFilter"><option value="pendentes">Aguardando resposta</option><option value="todos">Todas</option><option value="respondidas">Respondidas</option></select></label>')+
   '<button type="button" class="cp-help-refresh" data-help-update title="Atualizar mensagens" aria-label="Atualizar mensagens">↻</button></div>'+
   '<p id="cpHelpSummary" class="cp-help-summary">Carregando atendimentos...</p>'+
   '<div id="cpHelpList" class="cp-help-list"></div></aside>'+
   '<section id="cpHelpConversation" class="cp-help-conversation" aria-label="Conversa selecionada"></section></div>'+
   '<footer class="cp-help-footer">As conversas ficam registradas no sistema. Cada colaborador acessa suas próprias solicitações; a Gestão acompanha os atendimentos.</footer>'+
   '</section>';
  root.appendChild(layer);
  ctx={mode,root,button,layer,threads:[],current:null,messages:[],composing:false,filter:mode==='gestao'?'pendentes':'todos',open:false};
  button.addEventListener('click',()=>{void open()});
  layer.addEventListener('click',e=>{
   if(e.target===layer||e.target.closest('#cpHelpClose')){close();return;}
   const t=e.target.closest('[data-help-thread]');
   if(t){void showThread(t.dataset.helpThread,t.dataset.helpOwner);return;}
   if(e.target.closest('[data-help-new]')){ctx.composing=true;ctx.current=null;renderThread();return;}
   if(e.target.closest('[data-help-cancel]')){ctx.composing=false;renderThread();return;}
   if(e.target.closest('[data-help-update]')){
    void fetchList().then(()=>{if(ctx?.current&&!ctx.composing)void showThread(ctx.current.id,ctx.current.ownerId);});return;
   }
  });
  layer.addEventListener('submit',e=>{
   if(e.target.id==='cpHelpCreate'){e.preventDefault();void sendNew(e.target);}
   if(e.target.id==='cpHelpReply'){e.preventDefault();void sendReply(e.target);}
  });
  layer.addEventListener('change',e=>{
   if(e.target.id==='cpHelpFilter'){ctx.filter=e.target.value;renderList();}
  });
  layer.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}});
  void fetchList();
  clock=setInterval(()=>{if(ctx&&!document.hidden&&!ctx.open)void fetchList();},45000);
  if(new URLSearchParams(location.search).get('duvidas')==='1')void open();
 }
 window.CoraHelpdesk={mount,open,teardown};
})();
