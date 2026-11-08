(() => {
  'use strict';
  let YEAR = window.CoraYears?.activeYear || 2026;
  const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const WEEK = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
  let STORE = `cora_calendario_eventos_${YEAR}_v1`;
  let FILE_DB = `cora_calendario_documentos_${YEAR}_v1`;
  const $ = (selector) => document.querySelector(selector);
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, match => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[match]));
  const isCurrentYear = () => new Date().getFullYear() === YEAR;
  let selectedMonth = window.CoraYears?.month ?? (isCurrentYear() ? new Date().getMonth() : 0);
  // Prefere uma lista concisa no celular; pode ser alternada a qualquer momento.
  const MONTH_VIEW_KEY='cora_month_events_view_v1';
  const MONTH_PREVIEW_SIZE=5;
  let monthView='resumida';
  try {monthView=localStorage.getItem(MONTH_VIEW_KEY)==='estendida'?'estendida':'resumida'} catch {}
  function changeMonthView(mode){
    monthView=mode==='estendida'?'estendida':'resumida';
    try{localStorage.setItem(MONTH_VIEW_KEY,monthView)}catch{}
    renderEvents();
  }

  let events = [];
  let allFiles = [];
  let editing = null;
  let toastTimer;
  let database;

  function notify(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 5000);
  }
  let OFFICIAL_REMOVED_KEY = `cora_official_${YEAR}_removed_v1`;
  function readRemovedOfficial() {try{return new Set(JSON.parse(localStorage.getItem(OFFICIAL_REMOVED_KEY)||'[]'));}catch{return new Set();}}
  function loadEvents() {
    try {
      const list=JSON.parse(localStorage.getItem(STORE)||'[]');
      events=Array.isArray(list)?list.filter(item=>item&&String(item.date||'').startsWith(YEAR+'-')):[];
    } catch {events=[];notify('Não foi possível ler os eventos salvos.');}
    const previous=new Set(events.map(item=>item.id)),removed=readRemovedOfficial();
    let imported=0;
    for(const item of (YEAR===2026?(window.CORA_OFFICIAL_2026?.events||[]):[])) {
      if(!previous.has(item.id)&&!removed.has(item.id)){events.push({...item});imported++;}
    }
    if(imported)saveEvents();
  }
  function saveEvents() {
    try { localStorage.setItem(STORE, JSON.stringify(events)); return true; }
    catch { notify('Armazenamento de eventos indisponível neste navegador.'); return false; }
  }
  function openDB() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB indisponível'));
      const req = indexedDB.open(FILE_DB, 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('files')) req.result.createObjectStore('files', {keyPath:'id'}); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  function dbRequest(mode, operation) {
    if (!database) return Promise.reject(new Error('Banco de documentos não disponível'));
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('files', mode);
      const request = operation(transaction.objectStore('files'));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
  async function refreshFiles() {
    allFiles = database ? (await dbRequest('readonly', store => store.getAll())) : [];
    allFiles.sort((a,b) => (a.month - b.month) || String(a.name).localeCompare(String(b.name)));
  }
  const filesFor = month => allFiles.filter(item => item.month === month);
  const eventsFor = month => (window.CoraYears?.filterVisible(events)||events).filter(item => Number(item.date?.slice(5,7)) - 1 === month).sort((a,b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  const birthdaysFor=month=>window.CoraCalendarBirthdays?.monthly?.(window.CoraCalendarBirthdays.local(),month)||[];
  function render() {
    renderNav(); renderCalendar(); renderEvents(); renderBirthdays(); renderFiles(); renderStats();
    $('#currentMonthTitle').innerHTML = `${MONTHS[selectedMonth]} <small>${YEAR}</small>`;
    $('#filesMonthTitle').textContent = MONTHS[selectedMonth];
    $('#todayMonth').textContent = `${MONTHS[selectedMonth]} de ${YEAR}`;
    if($('#welcomeYear'))$('#welcomeYear').textContent=YEAR;
    window.CoraYears?.setActiveMonth?.(YEAR,selectedMonth);
    window.dispatchEvent(new CustomEvent('cora-month-changed',{detail:{month:selectedMonth,year:YEAR}}));
  }
  function renderNav() {
    $('#monthNav').innerHTML = MONTHS.map((name,i) => `<button type="button" data-month="${i}" class="${selectedMonth===i?'active':''}" aria-current="${selectedMonth===i?'date':'false'}"><span>${name}</span>${eventsFor(i).length+filesFor(i).length+birthdaysFor(i).length?`<span class="count">${eventsFor(i).length+filesFor(i).length+birthdaysFor(i).length}</span>`:''}</button>`).join('');
    $('#monthNav').querySelectorAll('[data-month]').forEach(button => button.addEventListener('click', () => {selectedMonth = Number(button.dataset.month);render();}));
  }
  function renderStats() {
    $('#statEvents').textContent = (window.CoraYears?.filterVisible(events)||events).length;
    $('#statFiles').textContent = allFiles.length;
    $('#statCurrent').textContent = eventsFor(selectedMonth).length;
  }
  function renderBirthdays(){
    const area=$('#monthlyBirthdayList'),heading=$('#monthBirthdayHeading');
    if(!area)return;
    if(heading)heading.textContent='Aniversariantes de '+MONTHS[selectedMonth]+' · '+YEAR;
    const list=birthdaysFor(selectedMonth);
    area.innerHTML=window.CoraCalendarBirthdays?.listHTML?.(list)||'<p>Nenhum aniversariante registrado.</p>';
  }
  function renderCalendar() {
    const startDay = new Date(YEAR, selectedMonth,1).getDay();
    const count = new Date(YEAR, selectedMonth+1,0).getDate();
    const today = new Date();
    let html = '<div class="weekdays">' + WEEK.map(w=>`<div class="weekday">${w}</div>`).join('') + '</div><div class="day-grid">';
    const cells = Math.ceil((startDay+count)/7)*7;
    for(let i=0; i<cells; i++) {
      const day = i-startDay+1;
      if (day<1||day>count) { html += '<div class="day blank"></div>'; continue; }
      const date = `${YEAR}-${String(selectedMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const list = (window.CoraYears?.filterVisible(events)||events).filter(item=>item.date===date);
      const isToday = today.getFullYear()===YEAR && today.getMonth()===selectedMonth && today.getDate()===day;
      const stage=window.CoraStages?.get?.(YEAR)?.find(st=>st.start===date||st.end===date);
      const birthdayPeople=birthdaysFor(selectedMonth).filter(b=>b.day===day);
      const birthdayLabel=birthdayPeople.map(b=>b.name).join(' • ');
      html += `<button type="button" class="day ${isToday?'today':''} ${list.length?'has-event':''} ${stage?'has-stage-boundary':''} ${birthdayPeople.length?'has-birthday':''}" data-date="${date}" title="${escapeHtml([list.map(item=>item.title).join(' • '),birthdayLabel?'Aniversariantes: '+birthdayLabel:''].filter(Boolean).join(' • ')||'Adicionar evento em '+day+'/'+(selectedMonth+1)+'/'+YEAR)}" aria-label="${day} de ${MONTHS[selectedMonth]}: ${list.length} evento(s)${birthdayLabel?' · Aniversariantes: '+escapeHtml(birthdayLabel):''}"><span class="date-num">${day}</span>${birthdayPeople.length?'<span class="cora-birthday-chip" aria-hidden="true">Aniv. '+birthdayPeople.length+'</span>':''}${stage?`<span class="stage-mark">${stage.start===date?'Início':'Fim'} da ${stage.number}ª etapa</span>`:''}${list.length?`<span class="event-markers" aria-hidden="true">${list.slice(0,3).map(item=>`<i class="event-marker ${item.type==='Reunião'?'marker-meeting':item.type==='Avaliação'?'marker-exam':item.type==='Feriado'?'marker-holiday':'marker-general'}"></i>`).join('')}</span><span class="event-quantity">${list.length} ${list.length===1?'evento':'eventos'}</span>`:''}</button>`;
    }
    $('#calendar').innerHTML = html + '</div>';
    $('#calendar').querySelectorAll('[data-date]').forEach(button => button.addEventListener('click',() => {const date=button.dataset.date;if(eventsFor(selectedMonth).some(item=>item.date===date)&&typeof window.coraOpenDayEvents==='function')window.coraOpenDayEvents(date);else openEventModal(date);}));
  }

  // A Gestão guarda eventos localmente; eles só chegam à Equipe após revisão
  // (quando importados) e publicação explícita do ano pela administração.
  function renderPublicationStatus(list){
    const box=$('#monthPublicationStatus');
    if(!box)return;
    if(YEAR<=2026){box.hidden=true;box.innerHTML='';return}
    const pending=list.filter(e=>e?.status==='Em revisão'||e?.needsReview===true).length;
    const ready=list.length-pending;
    const month=MONTHS[selectedMonth];
    const comparison=window.CoraMonthlyPublication?.year===YEAR?
      window.CoraMonthlyPublication.months?.[selectedMonth]:null;
    const remoteCount=comparison?Number(comparison.published)||0:null;
    const needsUpdate=comparison&&remoteCount!==Number(comparison.ready);
    const message=comparison
      ?pending>0?'Confira as datas das atividades importadas antes de liberar a publicação.'
       :needsUpdate?'Existem eventos aprovados na Gestão que ainda não chegaram à Equipe. Publique o ano letivo.'
       :'A publicação foi conferida. Novas alterações exigem outra publicação.'
      :'Ainda conferindo a publicação na Equipe. Salvar na Gestão não envia eventos automaticamente.';
    box.hidden=false;
    box.innerHTML='<div class="month-publication-counts">'+
      '<strong>'+list.length+' cadastrado(s) em '+month+' de '+YEAR+'</strong>'+
      '<span>'+pending+' em revisão · '+ready+' aprovado(s)'+
       (remoteCount===null?'':' · '+remoteCount+' publicado(s) na Equipe')+'</span></div>'+
      '<p>'+message+'</p>'+
      '<div class="month-publication-actions">'+
      (pending?'<button type="button" data-month-review>Conferir '+pending+' evento(s) importado(s)</button>':'')+
      (ready?'<button type="button" data-month-publish>Publicar apenas '+month+' aprovado na Equipe</button>':'')+
      '</div>';
    box.querySelector('[data-month-review]')?.addEventListener('click',()=>{
      const opened=window.CoraYearReview?.requestOpen?.(YEAR,selectedMonth);
      if(!opened)notify('Entre na Gestão e abra Conferência dos 12 meses → Conferir atividades importadas.');
    });
    box.querySelector('[data-month-publish]')?.addEventListener('click',async event=>{
      const button=event.currentTarget;
      const publisher=window.CoraMonthPublisher?.publish;
      if(typeof publisher!=='function'){notify('Entre na Gestão para publicar os eventos aprovados.');return;}
      button.disabled=true;
      try{await publisher(YEAR,selectedMonth)}
      finally{button.disabled=false}
    });
  }
  function renderEvents() {
    const list = eventsFor(selectedMonth);
    renderPublicationStatus(list);
    const summary=monthView==='resumida';
    const preview=summary?list.slice(0,MONTH_PREVIEW_SIZE):list;
    const panel=document.querySelector('.events-panel');
    panel?.classList.toggle('is-compact',summary);
    const compact=$('#monthViewCompact'),extended=$('#monthViewExtended');
    if(compact){compact.classList.toggle('is-active',summary);compact.setAttribute('aria-pressed',String(summary))}
    if(extended){extended.classList.toggle('is-active',!summary);extended.setAttribute('aria-pressed',String(!summary))}
    const counter=$('#monthViewCount'),footer=$('#monthViewFooter'),all=$('#monthViewAll');
    if(counter)counter.textContent=list.length===0?'Nenhum evento cadastrado neste mês':summary&&list.length>MONTH_PREVIEW_SIZE?
      'Exibindo '+preview.length+' de '+list.length+' eventos · '+(list.length-preview.length)+' outros disponíveis':
      list.length+' evento'+(list.length===1?'':'s')+' neste mês';
    if(footer)footer.hidden=!(summary&&list.length>MONTH_PREVIEW_SIZE);
    if(all)all.textContent='Ver todos os '+list.length+' eventos';
    if (!list.length) { $('#eventList').innerHTML = '<div class="empty"><div class="empty-icon">▦</div>Nenhum evento neste mês.<br/>Clique no calendário para começar.</div>'; return; }
    $('#eventList').innerHTML = preview.map(event => `<div class="event"><div class="event-date"><b>${Number(event.date.slice(8,10))}</b><small>${MONTHS[selectedMonth].slice(0,3)}</small></div><div class="event-info"><strong>${escapeHtml(event.title)}</strong>${event.notes?`<small>${escapeHtml(event.notes)}</small>`:''}<span class="tag">${escapeHtml(event.type)}</span>${event.time?`<small class="event-meta">Horário: ${escapeHtml(event.time)} ${event.mode==='online'?' · On-line':''}</small>`:''}${event.status==='Em revisão'||event.needsReview===true?'<small class="review-event">Em revisão · não divulgar</small>':''}${event.audience&&event.audience!=='Todos'?`<small class="event-meta">Para: ${escapeHtml(event.audience)}</small>`:''}</div><div class="event-actions"><button data-google="${escapeHtml(event.id)}" aria-label="Adicionar ao Google Agenda" title="Google Agenda">G</button><button data-edit="${escapeHtml(event.id)}" aria-label="Editar evento" title="Editar">✎</button><button data-delete="${escapeHtml(event.id)}" aria-label="Excluir evento" title="Excluir">✕</button></div></div>`).join('');
    $('#eventList').querySelectorAll('[data-edit]').forEach(button=>button.addEventListener('click',eventClick=>{
      eventClick.preventDefault();
      const item=events.find(event=>String(event.id)===String(button.dataset.edit));
      if(item)openEventModal(item.date,item);
      else notify('Evento não encontrado neste ano. Atualize o calendário.');
    }));
    $('#eventList').querySelectorAll('[data-delete]').forEach(button=>button.addEventListener('click',()=>{if(!confirm('Excluir este evento?'))return;const item=events.find(e=>e.id===button.dataset.delete);if(item?.id?.startsWith('oficial-2026-')){const removed=readRemovedOfficial();removed.add(item.id);try{localStorage.setItem(OFFICIAL_REMOVED_KEY,JSON.stringify([...removed]));}catch{}}events=events.filter(item=>item.id!==button.dataset.delete);saveEvents();render();}));
  }
  function fileSize(bytes) {return bytes<1024?'0 KB':bytes<1024*1024?`${Math.round(bytes/1024)} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;}
  function fileLabel(file){const ext=file.name.split('.').pop().toUpperCase();return ext.length>4?'ARQ':ext;}
  function renderFiles() {
    const list = filesFor(selectedMonth);
    $('#filesList').innerHTML = list.length ? list.map(file => `<article class="file-card"><div class="file-type">${escapeHtml(fileLabel(file))}</div><div class="file-info"><strong title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</strong><small>${fileSize(file.size)} · ${MONTHS[file.month]} ${YEAR}</small></div><div class="file-actions"><select data-move="${escapeHtml(file.id)}" aria-label="Mover para outro mês">${MONTHS.map((name,i)=>`<option value="${i}" ${file.month===i?'selected':''}>${name}</option>`).join('')}</select><button data-download="${escapeHtml(file.id)}" title="Baixar arquivo" aria-label="Baixar arquivo">↓</button><button data-remove="${escapeHtml(file.id)}" title="Excluir arquivo" aria-label="Excluir arquivo">✕</button></div></article>`).join('') : '<div class="empty">Nenhum documento neste mês. Importe um arquivo para começar.</div>';
    $('#filesList').querySelectorAll('[data-move]').forEach(select => select.addEventListener('change', async () => {
      const file=allFiles.find(item=>item.id===select.dataset.move);
      if(!file)return;file.month=Number(select.value);try{await dbRequest('readwrite',store=>store.put(file));render();notify('Documento movido para '+MONTHS[file.month]+'.');}catch{notify('Não foi possível mover o documento.');}
    }));
    $('#filesList').querySelectorAll('[data-download]').forEach(button=>button.addEventListener('click',()=>{
      const file=allFiles.find(item=>item.id===button.dataset.download);if(file) downloadBlob(file.blob,file.name);
    }));
    $('#filesList').querySelectorAll('[data-remove]').forEach(button=>button.addEventListener('click',async()=>{
      if(!confirm('Excluir este documento do app?'))return;
      try{await dbRequest('readwrite',store=>store.delete(button.dataset.remove));await refreshFiles();render();}catch{notify('Não foi possível excluir o arquivo.');}
    }));
  }
  function openEventModal(date, event=null){
    editing=event?.id||null;
    $('#modalTitle').textContent=event?'Editar evento':'Novo evento';
    $('#eventTitle').value=event?.title||'';
    $('#eventDate').value=date||`${YEAR}-${String(selectedMonth+1).padStart(2,'0')}-01`;
    $('#eventType').value=event?.type||'Pedagógico';
    $('#eventNotes').value=event?.notes||'';
    $('#eventTime').value=event?.time||'';
    $('#eventDuration').value=event?.duration||60;
    $('#eventMode').value=event?.mode||'presencial';
    $('#eventPlace').value=event?.place||'';
    $('#eventMeet').value=event?.meet||'';
    $('#eventMeetWrap').hidden=$('#eventMode').value!=='online';
    $('#eventAudience').value=event?.audience||'Todos';
    $('#eventStatus').value=event?.status||'Publicado';
    // Native dialog entra no topo da página, inclusive no navegador do Android.
    const modal=$('#eventModal');
    if(!modal.open)modal.showModal();
    requestAnimationFrame(()=>$('#eventTitle')?.focus({preventScroll:true}));
  }
  function autoMonth(filename) {
    const n=filename.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const names=['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const matchName=names.findIndex(m=>new RegExp(`(?:^|[^a-z])${m}(?:[^a-z]|$)`).test(n));
    if(matchName>=0)return matchName;
    let m=n.match(/(?:^|\D)2026[-_ .](0?[1-9]|1[0-2])(?:\D|$)/);
    if(m)return Number(m[1])-1;
    m=n.match(/(?:^|\D)(0?[1-9]|1[0-2])[-_ .]2026(?:\D|$)/);
    if(m)return Number(m[1])-1;
    return selectedMonth;
  }
  async function importFiles(list) {
    if(!database){notify('Armazenamento do navegador indisponível. Não foi possível salvar documentos.');return;}
    let added=0, failed=0;
    for(const f of list){
      const ext = (f.name.split('.').pop()||'').toLowerCase();
      if(!['pdf','doc','docx','xls','xlsx','csv','jpg','jpeg','png','webp'].includes(ext)||f.size>75*1024*1024){failed++;continue;}
      try{await dbRequest('readwrite',store=>store.put({id:uid(),name:f.name,month:autoMonth(f.name),size:f.size,type:f.type||'application/octet-stream',blob:f,lastModified:f.lastModified||Date.now()}));added++;}catch{failed++;}
    }
    await refreshFiles();render();
    notify(`${added} arquivo(s) importado(s).${failed?` ${failed} ignorado(s) (formato/tamanho/armazenamento).`:''}`);
  }
  function downloadBlob(blob, filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}
  const toBase64 = blob => new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
  async function downloadBackup(){
    try{
      const documents=[];for(const file of allFiles)documents.push({id:file.id,name:file.name,month:file.month,size:file.size,type:file.type,lastModified:file.lastModified,data:await toBase64(file.blob)});
      downloadBlob(new Blob([JSON.stringify({app:'calendario-anual-cora',year:YEAR,version:3,exportedAt:new Date().toISOString(),events,documents,officialRemoved:[...readRemovedOfficial()],projects:window.CoraYears?.getProjects(YEAR)||[],planning:JSON.parse(localStorage.getItem(`cora_planejamento_${YEAR}_v1`)||'{}'),cardDrafts:JSON.parse(localStorage.getItem(`cora_cards_${YEAR}_v1`)||'{}'),birthdays:JSON.parse(localStorage.getItem('cora_aniversariantes_v1')||'[]')})],{type:'application/json'}),`backup-calendario-cora-${YEAR}.json`);
      notify('Backup com eventos, arquivos, planejamentos, aniversariantes e cards criado.');
    }catch(error){console.error(error);notify('Falha ao gerar backup.');}
  }
  async function restoreBackup(f){
    try{
      const data=JSON.parse(await f.text());
      if(data.year!==YEAR||!Array.isArray(data.events)||!Array.isArray(data.documents))throw Error('Backup incompatível');
      if(!confirm('Restaurar backup? Eventos com o mesmo ID serão atualizados.'))return;
      const byId=new Map(events.map(item=>[item.id,item]));
      for(const event of data.events){if(typeof event.title==='string' && /^\d{4}-\d\d-\d\d$/.test(event.date||'')&&event.date.startsWith(YEAR+'-')){byId.set(event.id||uid(),{id:event.id||uid(),title:event.title.slice(0,170),date:event.date,type:event.type||'Evento',notes:event.notes||'',time:event.time||'',duration:Number(event.duration)||60,mode:event.mode||'presencial',place:event.place||'',meet:event.meet||'',audience:event.audience||'Todos',status:event.status||'Publicado'});}}
      events=[...byId.values()];if(Array.isArray(data.projects)&&data.projects.length===12)window.CoraYears?.saveProjects(YEAR,data.projects);if(Array.isArray(data.officialRemoved))try{localStorage.setItem(OFFICIAL_REMOVED_KEY,JSON.stringify(data.officialRemoved));}catch{}saveEvents();
      if(database)for(const file of data.documents){
        if(!file||typeof file.data!=='string'||!file.data.startsWith('data:'))continue;
        const response=await fetch(file.data);const blob=await response.blob();
        await dbRequest('readwrite',store=>store.put({id:file.id||uid(),name:file.name||'documento',month:Math.min(11,Math.max(0,Number(file.month)||0)),size:blob.size,type:file.type||blob.type,lastModified:file.lastModified||Date.now(),blob}));
      }
      if(data.planning&&typeof data.planning==='object'&&!Array.isArray(data.planning))localStorage.setItem(`cora_planejamento_${YEAR}_v1`,JSON.stringify(data.planning));
      if(data.cardDrafts&&typeof data.cardDrafts==='object'&&!Array.isArray(data.cardDrafts))localStorage.setItem(`cora_cards_${YEAR}_v1`,JSON.stringify(data.cardDrafts));
      if(Array.isArray(data.birthdays)){const valid=data.birthdays.filter(p=>p&&typeof p.name==='string'&&Number(p.month)>=1&&Number(p.month)<=12&&Number(p.day)>=1&&Number(p.day)<=31).map(p=>({id:String(p.id||uid()),name:p.name.slice(0,100),role:String(p.role||'').slice(0,85),day:Number(p.day),month:Number(p.month)}));localStorage.setItem('cora_aniversariantes_v1',JSON.stringify(valid));}
      await refreshFiles();render();window.dispatchEvent(new CustomEvent('cora-backup-restored'));notify('Backup restaurado com sucesso.');
    }catch(error){console.error(error);notify('Backup inválido ou armazenamento insuficiente.');}
  }

  // Geração do PDF: cada página do calendário é desenhada num canvas, mantendo todos os acentos.
  // PDFs e imagens importados são anexados de verdade às respectivas seções mensais.
  const PAGE_W = 1684, PAGE_H=1190, INK='#19344f', GREY='#6e849b', BLUE='#2462b1';
  function canvasBase(){const c=document.createElement('canvas');c.width=PAGE_W;c.height=PAGE_H;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,PAGE_W,PAGE_H);return [c,g];}
  function text(g,value,x,y,size=28,color=INK,weight='400',maxWidth=0){g.fillStyle=color;g.font=`${weight} ${size}px Arial, sans-serif`; if(maxWidth)g.fillText(String(value),x,y,maxWidth);else g.fillText(String(value),x,y);}
  function ellipsis(g,value,max){let s=String(value);while(s.length>1&&g.measureText(s).width>max)s=s.slice(0,-2)+'…';return s;}
  function wrapText(g,value,maxWidth,maxLines=4){const words=String(value).split(/\s+/),lines=[];let line='';for(const word of words){const proposed=line?line+' '+word:word;if(g.measureText(proposed).width>maxWidth&&line){lines.push(line);line=word;if(lines.length===maxLines)break;}else line=proposed;}if(line&&lines.length<maxLines)lines.push(line);return lines;}
  function rounded(g,x,y,w,h,r,fill){g.fillStyle=fill;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();}
  function coverCanvas(){
    const [c,g]=canvasBase();const grad=g.createLinearGradient(0,0,PAGE_W,PAGE_H);grad.addColorStop(0,'#0b2547');grad.addColorStop(1,'#2865ac');g.fillStyle=grad;g.fillRect(0,0,PAGE_W,PAGE_H);
    g.globalAlpha=.10;for(let i=0;i<6;i++){g.strokeStyle='#fff';g.lineWidth=4;g.beginPath();g.arc(1360,90,i*135+60,0,Math.PI*2);g.stroke();}g.globalAlpha=1;
    const badge=$('#schoolLogo');if(badge?.complete && badge.naturalWidth){rounded(g,98,72,124,150,14,'#fff');g.drawImage(badge,102,77,116,139);}else{rounded(g,99,100,82,82,15,'#ffffff23');text(g,'C',122,161,53,'#fff','700');}text(g,'COLÉGIO CORA CORALINA',239,153,29,'#d6e7ff','700');
    rounded(g,104,330,390,54,24,'#ffffff25');text(g,'PLANEJAMENTO EDUCACIONAL',133,366,22,'#d8eaff','700');
    text(g,'CALENDÁRIO',101,514,106,'#fff','800');text(g,'ANUAL',101,650,140,'#fff','800');text(g,String(YEAR),101,818,170,'#a9ceff','800');
    g.fillStyle='#ffffff57';g.fillRect(107,934,1420,2);text(g,'JANEIRO — DEZEMBRO  •  EVENTOS E DOCUMENTOS',106,995,31,'#e6f1ff','700');text(g,'Exportação completa do planejamento escolar',106,1045,24,'#b5d3f5');return c;
  }
  function headerCanvas(name,sub){const [c,g]=canvasBase();g.fillStyle='#102a4c';g.fillRect(0,0,PAGE_W,155);text(g,'CORA CORALINA  /  CALENDÁRIO ANUAL '+YEAR,76,75,22,'#c8d9ef','700');text(g,name,76,133,48,'#fff','700');const badge=$('#schoolLogo');if(badge?.complete&&badge.naturalWidth){rounded(g,PAGE_W-163,11,112,136,10,'#fff');g.drawImage(badge,PAGE_W-160,13,106,130);}text(g,sub,78,201,25,GREY);return [c,g];}
  function footerCanvas(g,section='CALENDÁRIO ANUAL '+YEAR){g.fillStyle='#e4ebf3';g.fillRect(70,1130,PAGE_W-140,2);text(g,section,74,1162,18,GREY,'700');text(g,'COLÉGIO CORA CORALINA',PAGE_W-400,1162,18,GREY,'700');text(g,'Tecnologia: PDF Solução Educacional',PAGE_W-400,1132,15,BLUE,'700');}
  function calendarCanvas(month){
  const [c,g]=canvasBase(), all=eventsFor(month);
  const projects=window.CoraYears?.getProjects?.(YEAR)?.[month]||[];
  const width=PAGE_W-136,x0=68,step=width/7;
  const first=new Date(YEAR,month,1).getDay(),last=new Date(YEAR,month+1,0).getDate();
  const rows=Math.ceil((first+last)/7),gridY=218,gridBottom=970,cellH=(gridBottom-gridY)/rows;
  const accent='#ffcf2d',white='#ffffff',navy='#0b2d54',light='#f5f9ff';
  const palette=type=>type==='Feriado'?'#cf4753':type==='Reunião'?'#246bb1':type==='Avaliação'?'#df9220':/simulado/i.test(type)?'#9b62b5':type==='Pedagógico'?'#27846c':'#3369a2';
  g.fillStyle=white;g.fillRect(0,0,PAGE_W,PAGE_H);
  g.fillStyle=navy;g.fillRect(0,0,PAGE_W,146);
  g.fillStyle=accent;g.fillRect(0,146,PAGE_W,8);
  text(g,MONTHS[month].toUpperCase(),72,85,62,white,'800');
  text(g,String(YEAR),PAGE_W-350,89,68,'#f9d456','800');
  text(g,'COLÉGIO CORA CORALINA · CALENDÁRIO ESCOLAR',73,128,21,'#dfebfd','700');
  const badge=$('#schoolLogo');
  if(badge?.complete&&badge.naturalWidth){rounded(g,PAGE_W-117,18,83,105,10,white);g.drawImage(badge,PAGE_W-114,21,78,99)}
  // Referência visual do calendário oficial de 2026: mês na lateral, grade semanal e projetos abaixo.
  g.save();g.translate(43,925);g.rotate(-Math.PI/2);
  text(g,MONTHS[month].toUpperCase()+' '+YEAR,0,0,28,'#d8a600','800');g.restore();
  WEEK.forEach((wd,i)=>{
    rounded(g,x0+i*step+1,168,step-2,40,0,'#135e85');
    text(g,wd,x0+i*step+step/2-21,195,22,white,'800');
  });
  function symbol(event,x,y,color){
    const type=String(event.type||'');
    g.save();g.strokeStyle=color;g.fillStyle=color;g.lineWidth=2.6;g.lineCap='round';g.lineJoin='round';
    if(/feriado/i.test(type)){
      g.beginPath();g.moveTo(x,y);g.lineTo(x,y+16);g.moveTo(x+2,y+1);g.lineTo(x+15,y+1);g.lineTo(x+11,y+9);g.lineTo(x+2,y+9);g.stroke();
    }else if(/avalia|simulad|sondag/i.test(type+' '+event.title)){
      g.strokeRect(x+1,y,13,17);g.beginPath();g.moveTo(x+4,y+6);g.lineTo(x+11,y+6);g.moveTo(x+4,y+11);g.lineTo(x+11,y+11);g.stroke();
    }else if(/reuni|encontro/i.test(type+' '+event.title)){
      g.beginPath();g.arc(x+6,y+4,3,0,7);g.arc(x+15,y+4,3,0,7);g.moveTo(x,y+17);g.quadraticCurveTo(x+3,y+8,x+7,y+12);g.moveTo(x+10,y+12);g.quadraticCurveTo(x+17,y+8,x+21,y+17);g.stroke();
    }else{
      g.beginPath();g.moveTo(x+2,y+14);g.lineTo(x+2,y+1);g.lineTo(x+10,y+4);g.lineTo(x+18,y+1);g.lineTo(x+18,y+14);g.lineTo(x+10,y+17);g.closePath();g.stroke();
    }
    g.restore();
  }
  for(let cell=0;cell<rows*7;cell++){
    const row=Math.floor(cell/7),col=cell%7,day=cell-first+1;
    const x=x0+col*step,y=gridY+row*cellH;
    const valid=day>=1&&day<=last;
    g.fillStyle=!valid?'#eef3f8':col===0?'#fff0ee':(col===6?'#f3f8fc':white);
    g.fillRect(x+1,y+1,step-2,cellH-2);
    g.strokeStyle='#aebdcc';g.lineWidth=1.5;g.strokeRect(x,y,step,cellH);
    if(!valid)continue;
    text(g,String(day),x+11,y+29,25,navy,'800');
    const date=`${YEAR}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const daily=all.filter(e=>e.date===date);
    const visible=Math.min(daily.length,rows===6?2:3);
    const lineTop=y+36;
    daily.slice(0,visible).forEach((ev,j)=>{
      const cy=lineTop+j*(rows===6?37:38),color=palette(ev.type);
      rounded(g,x+7,cy,step-14,32,5,ev.status==='Em revisão'?'#fff3dc':light);
      g.fillStyle=color;g.fillRect(x+7,cy,4,32);
      symbol(ev,x+16,cy+7,color);
      g.font='700 16px Arial,sans-serif';
      const label=(ev.time?String(ev.time)+' · ':'')+String(ev.title||'Evento');
      text(g,ellipsis(g,label,step-58),x+42,cy+21,16,navy,'700');
    });
    const stage=window.CoraStages?.get?.(YEAR)?.find(st=>st.start===date||st.end===date);
    if(stage){
      rounded(g,x+8,y+cellH-32,step-16,27,6,'#ffedb2');
      text(g,(stage.start===date?'INÍCIO ':'FIM ')+stage.number+'ª ETAPA',x+14,y+cellH-14,16,'#885800','800');
    }
    if(daily.length===1&&daily[0].notes&&!stage){
      g.font='500 14px Arial,sans-serif';
      text(g,ellipsis(g,daily[0].notes,step-23),x+10,lineTop+visible*38+15,14,'#61768b');
    }
    const birthdayPeople=birthdaysFor(month).filter(p=>p.day===day);
    if(birthdayPeople.length){
      rounded(g,x+step-70,y+6,58,27,6,'#f8df9b');
      text(g,'ANIV. '+birthdayPeople.length,x+step-64,y+25,13,'#6e4c05','800');
    }
    if(daily.length>visible)text(g,`+ ${daily.length-visible} atividade(s)`,x+9,y+cellH-9,14,'#60788c','700');
  }
  rounded(g,68,987,PAGE_W-136,130,6,'#f4f8fc');
  text(g,'PROJETOS DO MÊS',PAGE_W/2-126,1013,23,navy,'800');
  const shown=projects.slice(0,6);
  if(!shown.length){
    text(g,'Nenhum projeto cadastrado neste mês.',PAGE_W/2-210,1063,19,'#708498','600');
  }else{
    g.font='700 17px Arial,sans-serif';
    shown.forEach((name,i)=>{
      const col=i%2,row=Math.floor(i/2),x=90+col*765,y=1045+row*21;
      g.fillStyle=accent;g.fillRect(x,y-12,7,12);
      text(g,ellipsis(g,String(name),712),x+16,y,17,navy,'700');
    });
    if(projects.length>6)text(g,`+ ${projects.length-6} projetos adicionais na página seguinte`,100,1110,15,'#56708b','600');
  }
  footerCanvas(g);
  return c;
}
  function birthdayCanvas(month){
    const list=birthdaysFor(month),[c,g]=headerCanvas('Aniversariantes de '+MONTHS[month],
      'Datas recorrentes da equipe · '+YEAR+' · '+list.length+' colaborador(es)');
    if(!list.length){
      text(g,'Nenhum aniversariante registrado neste mês.',85,338,28,GREY,'600');
    }else{
      window.CoraCalendarBirthdays.drawBlock(g,list,{x:85,y:250,width:PAGE_W-170,
       title:'ANIVERSARIANTES · '+MONTHS[month].toUpperCase(),font:24,rowHeight:44,columns:2,maxRows:14});
    }
    footerCanvas(g,'ANIVERSARIANTES · '+MONTHS[month].toUpperCase());
    return c;
  }
  // Compactação por mês: duas colunas, mantendo a leitura e sem folhas quase vazias.
  const LISTING_ROWS=18, LISTING_PER_PAGE=LISTING_ROWS*2;
  function listingCanvas(month,kind,items,part,total){
    const title=kind==='events'?'Eventos detalhados':kind==='projects'?'Projetos do mês':'Índice de documentos';
    const all=Array.isArray(items)?items:[];
    const [c,g]=headerCanvas(MONTHS[month]+' — '+title,
      'Página '+(part+1)+' de '+total+' • Anexo ao calendário de '+MONTHS[month]+' · '+YEAR);
    const first=part*LISTING_PER_PAGE;
    const portion=all.slice(first,first+LISTING_PER_PAGE);
    // A coluna da direita começa apenas após a metade da lista desta página.
    // Assim, 18 ou 22 eventos ficam equilibrados, sem uma coluna vazia.
    const rows=Math.ceil(portion.length/2);
    const gap=32,left=75,top=258,colW=(PAGE_W-150-gap)/2,rowHeight=47;
    g.fillStyle='#f1f6fc';g.fillRect(left,219,PAGE_W-150,28);
    text(g,'DATA  •  EVENTO / DESCRIÇÃO',left+12,240,16,BLUE,'700');
    text(g,kind==='events'?'ATIVIDADES DO MÊS':'ITENS DO MÊS',left+colW+gap+12,240,16,BLUE,'700');
    g.strokeStyle='#dce6f2';g.lineWidth=2;g.beginPath();
    g.moveTo(left+colW+gap/2,250);g.lineTo(left+colW+gap/2,1105);g.stroke();
    portion.forEach((item,i)=>{
      const col=i<rows?0:1,row=i<rows?i:i-rows;
      const x=left+col*(colW+gap),y=top+row*rowHeight;
      if(row%2===0){g.fillStyle='#f1f5fa';g.fillRect(x,y-21,colW,44);}
      const labelX=x+(kind==='events'?104:62);
      const contentWidth=colW-(labelX-x)-14;
      if(kind==='events'){
        const date=String(item.date||'').slice(8,10)+'/'+String(month+1).padStart(2,'0');
        text(g,date,x+12,y+2,20,BLUE,'700');
        g.font='700 19px Arial, sans-serif';
        text(g,ellipsis(g,item.title||'Atividade sem título',contentWidth),labelX,y+1,19,INK,'700');
        const details=[item.type,item.time,item.notes].filter(Boolean).join(' • ');
        if(details){g.font='400 15px Arial, sans-serif';text(g,ellipsis(g,details,contentWidth),labelX,y+21,15,GREY);}
      }else if(kind==='projects'){
        text(g,String(first+i+1).padStart(2,'0'),x+12,y+2,19,BLUE,'700');
        g.font='700 19px Arial, sans-serif';
        text(g,ellipsis(g,String(item),contentWidth),labelX,y+2,19,INK,'700');
      }else{
        text(g,String(first+i+1).padStart(2,'0'),x+12,y+2,19,BLUE,'700');
        g.font='700 18px Arial, sans-serif';
        text(g,ellipsis(g,item.name||'Documento',contentWidth),labelX,y,18,INK,'700');
        g.font='400 15px Arial, sans-serif';
        text(g,ellipsis(g,fileLabel(item)+' • '+fileSize(item.size),contentWidth),labelX,y+21,15,GREY);
      }
    });
    footerCanvas(g,title.toUpperCase()+' • '+portion.length+' de '+all.length+' itens');
    return c;
  }
  function pdfErrorCanvas(file,error){const [c,g]=headerCanvas('Documento não incorporado',file.name);text(g,'O arquivo consta no índice do mês, mas não foi possível',85,335,32,INK);text(g,'anexar seu conteúdo ao PDF completo.',85,385,32,INK);text(g,'Motivo: '+String(error).slice(0,140),85,468,23,GREY);footerCanvas(g);return c;}
  function scriptFrom(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Não foi possível carregar a biblioteca PDF'));document.head.appendChild(s);});}
  async function getPDFLib(){if(window.PDFLib)return window.PDFLib;await scriptFrom('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js');if(!window.PDFLib)throw Error('Biblioteca PDF indisponível');return window.PDFLib;}
  async function attachCanvas(document,canvas){const bytes=await fetch(canvas.toDataURL('image/jpeg',0.87)).then(r=>r.arrayBuffer());const image=await document.embedJpg(bytes);const page=document.addPage([842,595]);page.drawImage(image,{x:0,y:0,width:842,height:595});}
  async function appendFile(pdf,file){
    const ext=file.name.split('.').pop().toLowerCase(),bytes=await file.blob.arrayBuffer();
    if(ext==='pdf'){
      const { PDFDocument }=window.PDFLib;
      const original=await PDFDocument.load(bytes);
      const pages=await pdf.copyPages(original,original.getPageIndices());pages.forEach(page=>pdf.addPage(page));
    }else if(['png','jpg','jpeg','webp'].includes(ext)){
      let image, width, height;
      if(ext==='png')image=await pdf.embedPng(bytes);
      else if(ext==='jpg'||ext==='jpeg')image=await pdf.embedJpg(bytes);
      else{
        const bitmap=await createImageBitmap(file.blob), c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;c.getContext('2d').drawImage(bitmap,0,0);image=await pdf.embedPng(await fetch(c.toDataURL('image/png')).then(r=>r.arrayBuffer()));bitmap.close();
      }
      width=image.width;height=image.height;
      const page=pdf.addPage([842,595]), scale=Math.min(812/width,565/height);
      page.drawImage(image,{x:(842-width*scale)/2,y:(595-height*scale)/2,width:width*scale,height:height*scale});
    }
  }
  async function exportPDF(){
    const btn=$('#exportBtn');if(btn.disabled)return;btn.disabled=true;btn.textContent='Gerando PDF...';notify('Montando capa, 12 meses e documentos.');
    try{
      const {PDFDocument}=await getPDFLib();const pdf=await PDFDocument.create();
      pdf.setTitle('Calendário Anual '+YEAR+' — Colégio Cora Coralina');pdf.setAuthor('Colégio Cora Coralina');
      await attachCanvas(pdf,coverCanvas());
      const problems=[];let attachedOriginals=0;
      for(let month=0;month<12;month++){
        await attachCanvas(pdf,calendarCanvas(month));
        if(birthdaysFor(month).length)await attachCanvas(pdf,birthdayCanvas(month));
        const projects=window.CoraYears?.getProjects?.(YEAR)?.[month]||[];
        const extraProjects=projects.slice(6);
        for(let part=0,total=Math.ceil(extraProjects.length/LISTING_PER_PAGE);part<total;part++)
          await attachCanvas(pdf,listingCanvas(month,'projects',extraProjects,part,total));
        const items=eventsFor(month);
        for(let part=0,total=Math.ceil(items.length/LISTING_PER_PAGE);part<total;part++)
          await attachCanvas(pdf,listingCanvas(month,'events',items,part,total));
        const files=filesFor(month);
        for(let part=0,total=Math.ceil(files.length/LISTING_PER_PAGE);part<total;part++)
          await attachCanvas(pdf,listingCanvas(month,'files',files,part,total));
        for(const file of files){
          try{
            if(/\.(pdf|png|jpg|jpeg|webp)$/i.test(file.name)){
              await appendFile(pdf,file);
            }else{
              // Word, Excel e outros formatos não devem sumir silenciosamente do PDF completo.
              // O original é preservado como anexo sem fingir que foi convertido em página.
              await pdf.attach(await file.blob.arrayBuffer(),file.name,{
                mimeType:file.blob.type||'application/octet-stream',
                description:'Arquivo original do calendário escolar'
              });
              attachedOriginals++;
            }
          }catch(error){problems.push(file.name);await attachCanvas(pdf,pdfErrorCanvas(file,error.message||error));}
        }
      }
      const data=await pdf.save();downloadBlob(new Blob([data],{type:'application/pdf'}),`Calendario_Anual_Cora_Coralina_${YEAR}_Completo.pdf`);
      notify(`PDF completo criado: ${pdf.getPageCount()} páginas.${attachedOriginals?` ${attachedOriginals} arquivo(s) original(is) anexado(s).`:''}${problems.length?` ${problems.length} anexo(s) com erro.`:''}`);
    }catch(error){console.error(error);notify('Exportação direta indisponível. Use a impressão do navegador e selecione “Salvar como PDF”.');printCalendar();}
    finally{btn.disabled=false;btn.textContent='↓ Baixar PDF completo';}
  }
  function printCalendar(){
    let root=document.getElementById('print-pages');if(root)root.remove();root=document.createElement('section');root.id='print-pages';
    root.style.cssText='display:none';
    const page=(content)=>`<div class="print-page">${content}</div>`;
    root.innerHTML=page(`<h1>CALENDÁRIO ANUAL ${YEAR}</h1><h2>COLÉGIO CORA CORALINA</h2><p>Planejamento de janeiro a dezembro</p>`)+MONTHS.map((name,m)=>{
      const first=new Date(YEAR,m,1).getDay(),length=new Date(YEAR,m+1,0).getDate();let cells=WEEK.map(day=>`<th>${day}</th>`).join('');const rows=[];
      for(let i=0;i<Math.ceil((first+length)/7);i++){let row='';for(let j=0;j<7;j++){const d=i*7+j-first+1,list=events.filter(e=>e.date===`${YEAR}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);row+=d<1||d>length?'<td></td>':`<td><b>${d}</b>${list.map(item=>`<div>${escapeHtml(item.title)}</div>`).join('')}</td>`;}rows.push('<tr>'+row+'</tr>');}
      const projects=window.CoraYears?.getProjects?.(YEAR)?.[m]||[];
      return page(`<h2>${name} ${YEAR}</h2><table><thead><tr>${cells}</tr></thead><tbody>${rows.join('')}</tbody></table><h3>PROJETOS DO MÊS</h3><ul>${projects.length?projects.map(p=>`<li>${escapeHtml(p)}</li>`).join(''):'<li>Nenhum projeto definido neste mês.</li>'}</ul><h3>Documentos: ${filesFor(m).length}</h3><p>${filesFor(m).map(f=>escapeHtml(f.name)).join(' · ')}</p>`);
    }).join('');
    document.body.append(root);
    if(!document.getElementById('print-style')){const style=document.createElement('style');style.id='print-style';style.textContent='@media print{body>*:not(#print-pages){display:none!important}#print-pages{display:block!important}.print-page{page-break-after:always;padding:15mm;font:12px Arial,sans-serif}.print-page h1{font-size:42px}.print-page h2{font-size:28px;color:#102a4c}.print-page table{width:100%;border-collapse:collapse;table-layout:fixed}.print-page th,.print-page td{border:1px solid #cbd9e9;padding:7px;vertical-align:top}.print-page td{height:75px}.print-page td div{font-size:9px;color:#245fac}.print-page p{overflow-wrap:anywhere}}';document.head.append(style);}
    window.addEventListener('afterprint',()=>root.remove(),{once:true});window.print();
  }

  function markEventAdded(state=''){
    ['addEventBtn','quickEvent'].forEach(id=>{
      const button=$('#'+id);
      if(!button)return;
      if(!button.dataset.initialLabel)button.dataset.initialLabel=button.textContent.trim();
      button.classList.toggle('event-added',Boolean(state));
      button.textContent=state==='duplicate'?'✓ Evento já cadastrado':state?'✓ Evento adicionado':button.dataset.initialLabel;
      button.setAttribute('aria-label',state?'Evento registrado. Clique para adicionar outro evento.':button.dataset.initialLabel);
    });
  }
  function bind(){
    $('#prevMonth').addEventListener('click',()=>{selectedMonth=(selectedMonth+11)%12;render();});
    $('#nextMonth').addEventListener('click',()=>{selectedMonth=(selectedMonth+1)%12;render();});
    $('#todayMonth').addEventListener('click',()=>{selectedMonth=isCurrentYear()?new Date().getMonth():0;render();});
    $('#jumpAssessment')?.addEventListener('click',()=>document.getElementById('coraAssessmentPanel')?.scrollIntoView({behavior:'smooth',block:'start'}));
    ['addEventBtn','quickEvent'].forEach(id=>$('#'+id).addEventListener('click',()=>{
      markEventAdded('');
      openEventModal();
    }));
    $('#closeModal').addEventListener('click',()=>$('#eventModal').close());
    $('#cancelEvent').addEventListener('click',()=>$('#eventModal').close());
    $('#eventMode').addEventListener('change',()=>{
      $('#eventMeetWrap').hidden=$('#eventMode').value!=='online';
    });
    $('#eventModal').addEventListener('close',()=>{
      $('#eventTitle').setCustomValidity('');
    });
    $('#eventForm').addEventListener('submit',event=>{
      event.preventDefault();
      const date=$('#eventDate').value,title=$('#eventTitle').value.trim();
      if(!/^\d{4}-\d\d-\d\d$/.test(date)||!date.startsWith(YEAR+'-')||!title){notify(`Informe um título e uma data de ${YEAR}.`);return;}
      const original=editing?events.find(e=>e.id===editing):null;
      const item={...(original||{}),id:editing||uid(),title,date,type:$('#eventType').value,notes:$('#eventNotes').value.trim(),time:$('#eventTime').value,duration:Math.min(480,Math.max(15,Number($('#eventDuration').value)||60)),mode:$('#eventMode').value,place:$('#eventPlace').value.trim(),meet:$('#eventMode').value==='online'?$('#eventMeet').value.trim():'',audience:$('#eventAudience').value,status:$('#eventStatus').value,needsReview:$('#eventStatus').value==='Em revisão'};
      const normalize=s=>String(s||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');
      const duplicated=!editing&&events.some(e=>e.date===date&&normalize(e.title)===normalize(title)&&String(e.type||'')===item.type);
      if(duplicated){
        $('#eventModal').close();
        markEventAdded('duplicate');
        notify('✓ Este evento já está cadastrado para esta data. Nenhuma cópia foi criada.');
        return;
      }
      const previous=events;
      // Preserva a posição do evento editado e evita que ele seja duplicado.
      events=editing?events.map(e=>e.id===editing?item:e):events.concat(item);
      if(!saveEvents()){events=previous;return;}
      selectedMonth=Number(date.slice(5,7))-1;
      $('#eventModal').close();
      render();
      window.dispatchEvent(new CustomEvent('cora-events-updated',{detail:{year:YEAR,month:selectedMonth,eventId:item.id}}));
      markEventAdded('saved');
      notify(editing?'✓ Evento atualizado com sucesso.':'✓ Evento adicionado ao calendário. Para enviar à equipe, clique em Publicar.');
    });
    ['uploadBtn','secondaryUpload'].forEach(id=>$('#'+id).addEventListener('click',()=>$('#filePicker').click()));
    $('#dropzone').addEventListener('click',()=>$('#filePicker').click());
    $('#dropzone').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();$('#filePicker').click();}});
    $('#filePicker').addEventListener('change',async event=>{await importFiles([...event.target.files]);event.target.value='';});
    const area=$('#dropzone');
    ['dragenter','dragover'].forEach(type=>area.addEventListener(type,event=>{event.preventDefault();area.classList.add('dragging');}));
    ['dragleave','drop'].forEach(type=>area.addEventListener(type,event=>{event.preventDefault();area.classList.remove('dragging');}));
    area.addEventListener('drop',event=>importFiles([...event.dataTransfer.files]));
    $('#monthViewCompact')?.addEventListener('click',()=>changeMonthView('resumida'));
    $('#monthViewExtended')?.addEventListener('click',()=>changeMonthView('estendida'));
    $('#monthViewAll')?.addEventListener('click',()=>changeMonthView('estendida'));
    $('#backupBtn').addEventListener('click',downloadBackup);
    $('#restoreBtn').addEventListener('click',()=>$('#restorePicker').click());
    $('#restorePicker').addEventListener('change',async event=>{if(event.target.files[0])await restoreBackup(event.target.files[0]);event.target.value='';});
    $('#exportBtn').addEventListener('click',()=>{if(window.CoraYears?.exportMonthlyPDF)return window.CoraYears.exportMonthlyPDF();return exportPDF();});
    $('#downloadMonthBirthdayPDF')?.addEventListener('click',async()=>{
      const button=$('#downloadMonthBirthdayPDF');
      if(!button||button.disabled)return;
      button.disabled=true;
      try{
       const lib=await getPDFLib(),pdf=await lib.PDFDocument.create(),m=selectedMonth;
       pdf.setTitle('Calendário '+MONTHS[m]+' '+YEAR+' com aniversariantes');
       await attachCanvas(pdf,calendarCanvas(m));
       if(birthdaysFor(m).length)await attachCanvas(pdf,birthdayCanvas(m));
       downloadBlob(new Blob([await pdf.save()],{type:'application/pdf'}),'Calendario_'+MONTHS[m]+'_Cora_'+YEAR+'.pdf');
       notify('Calendário do mês baixado com os aniversariantes.');
      }catch(e){console.error(e);notify('Não foi possível baixar o calendário mensal: '+e.message)}
      finally{button.disabled=false}
    });
    window.addEventListener('cora-restore-official-request',()=>{
      try{localStorage.removeItem(OFFICIAL_REMOVED_KEY);}catch{}
      const ids=new Set(events.map(item=>item.id));let restored=0;
      for(const item of (YEAR===2026?(window.CORA_OFFICIAL_2026?.events||[]):[]))if(!ids.has(item.id)){events.push({...item});restored++;}
      saveEvents();render();notify(`Calendário oficial conferido: ${restored} evento(s) restaurado(s).`);
    });
  }

  async function copyFilesBetweenYears(fromYear,toYear,months){
    if(!('indexedDB' in window))return {count:0,error:'Arquivos não podem ser copiados: armazenamento indisponível.'};
    const openYearDB=year=>new Promise((resolve,reject)=>{
      const req=indexedDB.open('cora_calendario_documentos_'+year+'_v1',1);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('files'))req.result.createObjectStore('files',{keyPath:'id'})};
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
    const getItems=db=>new Promise((resolve,reject)=>{
      const r=db.transaction('files','readonly').objectStore('files').getAll();
      r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);
    });
    let fromDB=null,toDB=null;
    try{
      fromDB=await openYearDB(fromYear);toDB=await openYearDB(toYear);
      const allowed=new Set(months),source=(await getItems(fromDB)).filter(file=>allowed.has(Number(file.month)));
      const existing=await getItems(toDB);
      const fingerprint=file=>[file.month,file.name,file.size,file.lastModified].join('|');
      const present=new Set(existing.map(fingerprint));
      const pending=source.filter(file=>!present.has(fingerprint(file)));
      let copied=0;
      for(const file of pending){
        await new Promise((resolve,reject)=>{
          const tx=toDB.transaction('files','readwrite');
          const cloned={...file,id:uid(),copiedFromYear:fromYear,originFileId:file.id};
          tx.objectStore('files').put(cloned);
          tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
        });
        copied++;
      }
      return {count:copied};
    }catch(e){return {count:0,error:'Não foi possível copiar todos os arquivos: '+String(e.message||e)}}
    finally{
      fromDB?.close();toDB?.close();
      if(YEAR===toYear&&database)try{await refreshFiles();render()}catch{}
    }
  }
  window.CoraApp={copyFilesBetweenYears};

  async function switchYear(y){
    if(Number(y)===YEAR)return;
    YEAR=Number(y);STORE=`cora_calendario_eventos_${YEAR}_v1`;FILE_DB=`cora_calendario_documentos_${YEAR}_v1`;OFFICIAL_REMOVED_KEY=`cora_official_${YEAR}_removed_v1`;
    editing=null;if($('#eventModal').open)$('#eventModal').close();
    if(database){database.close();database=null;}
    events=[];allFiles=[];loadEvents();
    $('#eventDate').min=`${YEAR}-01-01`;$('#eventDate').max=`${YEAR}-12-31`;
    selectedMonth=Number(window.CoraYears?.month)||0;
    render();
    try{database=await openDB();if(Number(y)!==YEAR){database.close();return;}await refreshFiles();render();}
    catch(error){console.error(error);notify('Documentos deste ano não puderam ser carregados.');}
  }
  async function initialize(){
    const schoolLogo=$('#schoolLogo');if(schoolLogo&&window.CORA_SCHOOL_LOGO)schoolLogo.src=window.CORA_SCHOOL_LOGO;
    loadEvents();
    bind();
    $('#eventDate').min=`${YEAR}-01-01`;$('#eventDate').max=`${YEAR}-12-31`;
    window.addEventListener('cora-year-changed',e=>switchYear(e.detail.year));
    window.addEventListener('cora-birthdays-changed',()=>{renderCalendar();renderBirthdays();});
    window.addEventListener('cora-audience-changed',()=>render());
    window.addEventListener('cora-projects-changed',e=>{if(Number(e.detail?.year)===YEAR)render();});
    window.addEventListener('cora-stages-updated',e=>{if(Number(e.detail?.year)===YEAR)render();});
    window.addEventListener('cora-data-changed',e=>{if(Number(e.detail?.year)===YEAR){loadEvents();render();if(e.detail?.source==='holiday-file'&&database)void refreshFiles().then(render).catch(()=>{});}});
    window.addEventListener('cora-month-publication-updated',e=>{
     if(Number(e.detail?.year)===YEAR)renderPublicationStatus(eventsFor(selectedMonth));
    });
    try{database=await openDB();await refreshFiles();}catch(error){console.error(error);notify('Os arquivos não podem ser salvos neste navegador.');}
    render();
    if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  }
  initialize();
})();