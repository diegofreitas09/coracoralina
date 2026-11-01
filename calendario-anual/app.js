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
    try { localStorage.setItem(STORE, JSON.stringify(events)); }
    catch { notify('Armazenamento de eventos indisponível neste navegador.'); }
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
  function render() {
    renderNav(); renderCalendar(); renderEvents(); renderFiles(); renderStats();
    $('#currentMonthTitle').innerHTML = `${MONTHS[selectedMonth]} <small>${YEAR}</small>`;
    $('#filesMonthTitle').textContent = MONTHS[selectedMonth];
    $('#todayMonth').textContent = `${MONTHS[selectedMonth]} de ${YEAR}`;
    if($('#welcomeYear'))$('#welcomeYear').textContent=YEAR;
    window.dispatchEvent(new CustomEvent('cora-month-changed',{detail:{month:selectedMonth}}));
  }
  function renderNav() {
    $('#monthNav').innerHTML = MONTHS.map((name,i) => `<button type="button" data-month="${i}" class="${selectedMonth===i?'active':''}" aria-current="${selectedMonth===i?'date':'false'}"><span>${name}</span>${eventsFor(i).length+filesFor(i).length?`<span class="count">${eventsFor(i).length+filesFor(i).length}</span>`:''}</button>`).join('');
    $('#monthNav').querySelectorAll('[data-month]').forEach(button => button.addEventListener('click', () => {selectedMonth = Number(button.dataset.month);render();}));
  }
  function renderStats() {
    $('#statEvents').textContent = (window.CoraYears?.filterVisible(events)||events).length;
    $('#statFiles').textContent = allFiles.length;
    $('#statCurrent').textContent = eventsFor(selectedMonth).length;
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
      html += `<button type="button" class="day ${isToday?'today':''} ${list.length?'has-event':''}" data-date="${date}" title="${list.length?escapeHtml(list.map(item=>item.title).join(' • ')):'Adicionar evento em '+day+'/'+(selectedMonth+1)+'/'+YEAR}" aria-label="${day} de ${MONTHS[selectedMonth]}: ${list.length} evento(s)"><span class="date-num">${day}</span>${list.length?`<span class="event-markers" aria-hidden="true">${list.slice(0,3).map(item=>`<i class="event-marker ${item.type==='Reunião'?'marker-meeting':item.type==='Avaliação'?'marker-exam':item.type==='Feriado'?'marker-holiday':'marker-general'}"></i>`).join('')}</span><span class="event-quantity">${list.length} ${list.length===1?'evento':'eventos'}</span>`:''}</button>`;
    }
    $('#calendar').innerHTML = html + '</div>';
    $('#calendar').querySelectorAll('[data-date]').forEach(button => button.addEventListener('click',() => {const date=button.dataset.date;if(eventsFor(selectedMonth).some(item=>item.date===date)&&typeof window.coraOpenDayEvents==='function')window.coraOpenDayEvents(date);else openEventModal(date);}));
  }
  function renderEvents() {
    const list = eventsFor(selectedMonth);
    if (!list.length) { $('#eventList').innerHTML = '<div class="empty"><div class="empty-icon">▦</div>Nenhum evento neste mês.<br/>Clique no calendário para começar.</div>'; return; }
    $('#eventList').innerHTML = list.map(event => `<div class="event"><div class="event-date"><b>${Number(event.date.slice(8,10))}</b><small>${MONTHS[selectedMonth].slice(0,3)}</small></div><div class="event-info"><strong>${escapeHtml(event.title)}</strong>${event.notes?`<small>${escapeHtml(event.notes)}</small>`:''}<span class="tag">${escapeHtml(event.type)}</span>${event.time?`<small class="event-meta">Horário: ${escapeHtml(event.time)} ${event.mode==='online'?' · On-line':''}</small>`:''}${event.status==='Em revisão'?'<small class="review-event">Em revisão · não divulgar</small>':''}${event.audience&&event.audience!=='Todos'?`<small class="event-meta">Para: ${escapeHtml(event.audience)}</small>`:''}</div><div class="event-actions"><button data-google="${escapeHtml(event.id)}" aria-label="Adicionar ao Google Agenda" title="Google Agenda">G</button><button data-edit="${escapeHtml(event.id)}" aria-label="Editar evento" title="Editar">✎</button><button data-delete="${escapeHtml(event.id)}" aria-label="Excluir evento" title="Excluir">✕</button></div></div>`).join('');
    $('#eventList').querySelectorAll('[data-edit]').forEach(button=>button.addEventListener('click',()=>{const event=events.find(item=>item.id===button.dataset.edit);if(event) openEventModal(event.date,event);}));
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
    $('#eventModal').showModal();
    $('#eventTitle').focus();
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
      downloadBlob(new Blob([JSON.stringify({app:'calendario-anual-cora',year:YEAR,version:3,exportedAt:new Date().toISOString(),events,documents,officialRemoved:[...readRemovedOfficial()],projects:window.CoraYears?.getProjects(YEAR)||[],planning:JSON.parse(localStorage.getItem(`cora_planejamento_${YEAR}_v1`)||'{}'),cardDrafts:JSON.parse(localStorage.getItem(`cora_cards_${YEAR}_v1`)||'{}')})],{type:'application/json'}),`backup-calendario-cora-${YEAR}.json`);
      notify('Backup com eventos, arquivos, planejamentos e cards criado.');
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
    text(g,'CALENDÁRIO',101,514,106,'#fff','800');text(g,'ANUAL',101,650,140,'#fff','800');text(g,'2026',101,818,170,'#a9ceff','800');
    g.fillStyle='#ffffff57';g.fillRect(107,934,1420,2);text(g,'JANEIRO — DEZEMBRO  •  EVENTOS E DOCUMENTOS',106,995,31,'#e6f1ff','700');text(g,'Exportação completa do planejamento escolar',106,1045,24,'#b5d3f5');return c;
  }
  function headerCanvas(name,sub){const [c,g]=canvasBase();g.fillStyle='#102a4c';g.fillRect(0,0,PAGE_W,155);text(g,'CORA CORALINA  /  CALENDÁRIO ANUAL 2026',76,75,22,'#c8d9ef','700');text(g,name,76,133,48,'#fff','700');const badge=$('#schoolLogo');if(badge?.complete&&badge.naturalWidth){rounded(g,PAGE_W-163,11,112,136,10,'#fff');g.drawImage(badge,PAGE_W-160,13,106,130);}text(g,sub,78,201,25,GREY);return [c,g];}
  function footerCanvas(g,section='CALENDÁRIO ANUAL 2026'){g.fillStyle='#e4ebf3';g.fillRect(70,1130,PAGE_W-140,2);text(g,section,74,1162,18,GREY,'700');text(g,'COLÉGIO CORA CORALINA',PAGE_W-400,1162,18,GREY,'700');}
  function calendarCanvas(month){
    const [c,g]=headerCanvas(`${MONTHS[month].toUpperCase()} ${YEAR}`,`${eventsFor(month).length} evento(s) cadastrado(s)  ·  ${filesFor(month).length} documento(s) anexado(s)`);
    const x0=72, y0=275, w=(PAGE_W-144)/7, h=125;
    WEEK.forEach((name,i)=>{rounded(g,x0+i*w+3,230,w-6,38,5,'#edf3fa');text(g,name,x0+i*w+15,257,20,BLUE,'700');});
    const start=new Date(YEAR,month,1).getDay(),last=new Date(YEAR,month+1,0).getDate();
    for(let cell=0;cell<42;cell++){
      const col=cell%7,row=Math.floor(cell/7),x=x0+col*w,y=y0+row*h;
      const day=cell-start+1, valid=day>0&&day<=last;
      g.fillStyle=valid?'#fff':'#f7f9fc';g.fillRect(x+1,y+1,w-2,h-2);
      g.strokeStyle='#dfe6ef';g.lineWidth=2;g.strokeRect(x,y,w,h);
      if(!valid)continue;
      text(g,day,x+13,y+34,25,INK,'700');
      const dayDate=`${YEAR}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const list=events.filter(item=>item.date===dayDate);
      g.font='700 18px Arial, sans-serif';
      list.slice(0,3).forEach((event,j)=>{
        rounded(g,x+9,y+43+j*23,w-20,21,3,'#e9f2fd');
        text(g,ellipsis(g,event.title,w-34),x+14,y+59+j*23,17,BLUE,'700');
      });
      if(list.length>3)text(g,`+ ${list.length-3} mais`,x+13,y+118,15,GREY);
    }
    const infoY=1070;text(g,'Documentos deste mês: '+filesFor(month).length+'   •   Eventos: '+eventsFor(month).length,75,infoY,23,BLUE,'700');footerCanvas(g);return c;
  }
  function listingCanvas(month,kind,items,part,total){
    const title=kind==='events'?'Eventos detalhados':'Índice de documentos';
    const [c,g]=headerCanvas(`${MONTHS[month]} — ${title}`,`Página ${part+1} de ${total} • Anexo ao calendário de ${MONTHS[month]}`);
    const first=part*16;
    items.slice(first,first+16).forEach((item,i)=>{
      const y=254+i*51;
      if(i%2===0){g.fillStyle='#f1f5fa';g.fillRect(72,y-29,PAGE_W-144,45);}
      if(kind==='events'){
        const day=Number(item.date.slice(8,10)).toString().padStart(2,'0');
        text(g,day+'/'+String(month+1).padStart(2,'0'),88,y,24,BLUE,'700');
        text(g,ellipsis(g,item.title,950),220,y,24,INK,'700');
        text(g,ellipsis(g,item.type+'  '+(item.notes||''),350),1220,y,20,GREY);
      }else{
        text(g,String(first+i+1).padStart(2,'0'),88,y,23,BLUE,'700');
        text(g,ellipsis(g,item.name,940),145,y,23,INK,'700');
        text(g,fileLabel(item)+'  •  '+fileSize(item.size),1150,y,20,GREY);
      }
    });
    footerCanvas(g,title.toUpperCase());return c;
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
      pdf.setTitle('Calendário Anual 2026 — Colégio Cora Coralina');pdf.setAuthor('Colégio Cora Coralina');
      await attachCanvas(pdf,coverCanvas());
      const problems=[];
      for(let month=0;month<12;month++){
        await attachCanvas(pdf,calendarCanvas(month));
        const items=eventsFor(month);for(let part=0;part<Math.ceil(items.length/16);part++)await attachCanvas(pdf,listingCanvas(month,'events',items,part,Math.ceil(items.length/16)));
        const files=filesFor(month);for(let part=0;part<Math.ceil(files.length/16);part++)await attachCanvas(pdf,listingCanvas(month,'files',files,part,Math.ceil(files.length/16)));
        for(const file of files){if(!/\.(pdf|png|jpg|jpeg|webp)$/i.test(file.name))continue;
          try{await appendFile(pdf,file);}catch(error){problems.push(file.name);await attachCanvas(pdf,pdfErrorCanvas(file,error.message||error));}
        }
      }
      const data=await pdf.save();downloadBlob(new Blob([data],{type:'application/pdf'}),`Calendario_Anual_Cora_Coralina_${YEAR}_Completo.pdf`);
      notify(`PDF completo criado: ${pdf.getPageCount()} páginas.${problems.length?` ${problems.length} anexo(s) ilegível(is).`:''}`);
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
      return page(`<h2>${name} ${YEAR}</h2><table><thead><tr>${cells}</tr></thead><tbody>${rows.join('')}</tbody></table><h3>Documentos: ${filesFor(m).length}</h3><p>${filesFor(m).map(f=>escapeHtml(f.name)).join(' · ')}</p>`);
    }).join('');
    document.body.append(root);
    if(!document.getElementById('print-style')){const style=document.createElement('style');style.id='print-style';style.textContent='@media print{body>*:not(#print-pages){display:none!important}#print-pages{display:block!important}.print-page{page-break-after:always;padding:15mm;font:12px Arial,sans-serif}.print-page h1{font-size:42px}.print-page h2{font-size:28px;color:#102a4c}.print-page table{width:100%;border-collapse:collapse;table-layout:fixed}.print-page th,.print-page td{border:1px solid #cbd9e9;padding:7px;vertical-align:top}.print-page td{height:75px}.print-page td div{font-size:9px;color:#245fac}.print-page p{overflow-wrap:anywhere}}';document.head.append(style);}
    window.addEventListener('afterprint',()=>root.remove(),{once:true});window.print();
  }

  function bind(){
    $('#prevMonth').addEventListener('click',()=>{selectedMonth=(selectedMonth+11)%12;render();});
    $('#nextMonth').addEventListener('click',()=>{selectedMonth=(selectedMonth+1)%12;render();});
    $('#todayMonth').addEventListener('click',()=>{selectedMonth=isCurrentYear()?new Date().getMonth():0;render();});
    ['addEventBtn','quickEvent'].forEach(id=>$('#'+id).addEventListener('click',()=>openEventModal()));
    $('#closeModal').addEventListener('click',()=>$('#eventModal').close());
    $('#cancelEvent').addEventListener('click',()=>$('#eventModal').close());
    $('#eventForm').addEventListener('submit',event=>{
      event.preventDefault();const date=$('#eventDate').value,title=$('#eventTitle').value.trim();
      if(!/^\d{4}-\d\d-\d\d$/.test(date)||!date.startsWith(YEAR+'-')||!title){notify(`Informe um título e uma data de ${YEAR}.`);return;}
      const item={id:editing||uid(),title,date,type:$('#eventType').value,notes:$('#eventNotes').value.trim(),time:$('#eventTime').value,duration:Math.min(480,Math.max(15,Number($('#eventDuration').value)||60)),mode:$('#eventMode').value,place:$('#eventPlace').value.trim(),meet:$('#eventMode').value==='online'?$('#eventMeet').value.trim():'',audience:$('#eventAudience').value,status:$('#eventStatus').value,needsReview:$('#eventStatus').value==='Em revisão'};
      if(editing)events=events.filter(e=>e.id!==editing);events.push(item);saveEvents();selectedMonth=Number(date.slice(5,7))-1;$('#eventModal').close();render();notify('Evento salvo.');
    });
    ['uploadBtn','secondaryUpload'].forEach(id=>$('#'+id).addEventListener('click',()=>$('#filePicker').click()));
    $('#dropzone').addEventListener('click',()=>$('#filePicker').click());
    $('#dropzone').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();$('#filePicker').click();}});
    $('#filePicker').addEventListener('change',async event=>{await importFiles([...event.target.files]);event.target.value='';});
    const area=$('#dropzone');
    ['dragenter','dragover'].forEach(type=>area.addEventListener(type,event=>{event.preventDefault();area.classList.add('dragging');}));
    ['dragleave','drop'].forEach(type=>area.addEventListener(type,event=>{event.preventDefault();area.classList.remove('dragging');}));
    area.addEventListener('drop',event=>importFiles([...event.dataTransfer.files]));
    $('#backupBtn').addEventListener('click',downloadBackup);
    $('#restoreBtn').addEventListener('click',()=>$('#restorePicker').click());
    $('#restorePicker').addEventListener('change',async event=>{if(event.target.files[0])await restoreBackup(event.target.files[0]);event.target.value='';});
    $('#exportBtn').addEventListener('click',()=>{if(window.CoraYears?.exportMonthlyPDF)return window.CoraYears.exportMonthlyPDF();return exportPDF();});
    window.addEventListener('cora-restore-official-request',()=>{
      try{localStorage.removeItem(OFFICIAL_REMOVED_KEY);}catch{}
      const ids=new Set(events.map(item=>item.id));let restored=0;
      for(const item of (YEAR===2026?(window.CORA_OFFICIAL_2026?.events||[]):[]))if(!ids.has(item.id)){events.push({...item});restored++;}
      saveEvents();render();notify(`Calendário oficial conferido: ${restored} evento(s) restaurado(s).`);
    });
  }
  async function switchYear(y){
    if(Number(y)===YEAR)return;
    YEAR=Number(y);STORE=`cora_calendario_eventos_${YEAR}_v1`;FILE_DB=`cora_calendario_documentos_${YEAR}_v1`;OFFICIAL_REMOVED_KEY=`cora_official_${YEAR}_removed_v1`;
    editing=null;if($('#eventModal').open)$('#eventModal').close();
    if(database){database.close();database=null;}
    events=[];allFiles=[];loadEvents();
    $('#eventDate').min=`${YEAR}-01-01`;$('#eventDate').max=`${YEAR}-12-31`;
    selectedMonth=isCurrentYear()?new Date().getMonth():selectedMonth;
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
    window.addEventListener('cora-audience-changed',()=>render());
    window.addEventListener('cora-data-changed',e=>{if(Number(e.detail.year)===YEAR){loadEvents();render();}});
    try{database=await openDB();await refreshFiles();}catch(error){console.error(error);notify('Os arquivos não podem ser salvos neste navegador.');}
    render();
    if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  }
  initialize();
})();