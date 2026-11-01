(() => {
  'use strict';
  const currentYear=()=>window.CoraYears?.activeYear||2026;
  
  const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  let deferredInstall = null;
  let daySelected = '';
  let selectedMonth = new Date().getFullYear() === (window.CoraYears?.activeYear||2026) ? new Date().getMonth() : 0;
  const el = id => document.getElementById(id);
  function safe(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function stored(key, fallback) {
    try { const x = JSON.parse(localStorage.getItem(key) || 'null');return x === null ? fallback : x; }
    catch (_) { return fallback; }
  }
  function allEvents() {
    const api=window.CoraYears;
    if(api)return api.filterVisible(api.getEvents(api.activeYear));
    const current=stored(`cora_calendario_eventos_${currentYear()}_v1`,[]);
    return Array.isArray(current)?current:[];
  }
  function findEvent(id) {return allEvents().find(function(e) {return String(e.id) === id;});}
  function nextDay(day) {
    const d = new Date(day + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate()+1);
    return d.toISOString().slice(0,10);
  }
  function compact(day) {return day.replace(/-/g,'');}
  function timed(event) {
    return !!event.time && /^\d{2}:\d{2}$/.test(event.time) && !isNaN(Date.parse(event.date+'T'+event.time+':00-03:00'));
  }
  function interval(event) {
    if (!timed(event)) return [compact(event.date),compact(nextDay(event.date))];
    const start = new Date(event.date+'T'+event.time+':00-03:00');
    const end = new Date(start.getTime() + Math.max(15,Math.min(480,Number(event.duration)||60))*60000);
    const fmt = date => date.toISOString().replace(/[-:]/g,'').replace('.000','');
    return [fmt(start),fmt(end)];
  }
  function calendarGoogle(event) {
    const range = interval(event);
    const description = [event.notes || '',event.meet ? 'Google Meet: '+event.meet : '', 'Calendário escolar '+currentYear()+' — Colégio Cora Coralina'].filter(Boolean).join('\n\n');
    const p = new URLSearchParams({action:'TEMPLATE',text:event.title,dates:range[0]+'/'+range[1],details:description,location:event.mode==='online' ? (event.meet||'Google Meet') : (event.place||''),ctz:'America/Fortaleza'});
    return 'https://calendar.google.com/calendar/render?' + p.toString();
  }
  function openGoogle(event) {
    const url = calendarGoogle(event);
    const link = document.createElement('a');
    link.href = url;link.target = '_blank';link.rel = 'noopener noreferrer';
    document.body.appendChild(link);link.click();link.remove();
  }
  function openDay(date) {
    daySelected = date;
    const parts = date.split('-'), list=allEvents().filter(function(e){return e.date===date;});
    el('dayEventsTitle').textContent = Number(parts[2])+' de '+MONTHS[Number(parts[1])-1]+' de '+parts[0];
    el('dayEventsList').innerHTML = list.length ? list.map(function(e){
      return '<article class="day-event-entry"><div><strong>'+safe(e.title)+'</strong><p>'+safe(e.type||'Evento')+(e.time?' · '+safe(e.time):' · Dia inteiro')+'</p>'+(e.notes?'<small>'+safe(e.notes)+'</small>':'')+'</div><div class="day-event-buttons"><button type="button" class="btn btn-outline" data-google="'+safe(e.id)+'">Google Agenda</button>'+(e.meet && /^https:\/\/meet\.google\.com\//.test(e.meet) ? '<a class="btn btn-outline" rel="noopener noreferrer" href="'+safe(e.meet)+'" target="_blank">Entrar no Meet</a>':'')+'</div></article>';
    }).join(''):'<p>Não há atividades cadastradas neste dia.</p>';
    el('dayEventsModal').showModal();
  }
  window.coraOpenDayEvents = openDay;
  function icsEscape(value) {
    return String(value||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  }
  function toIcs(items) {
    const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Cora Coralina//Agenda Escolar 2026//PT-BR','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Colégio Cora Coralina '+currentYear()];
    const stamp = new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    items.forEach(function(e) {
      const range = interval(e),t=timed(e);
      lines.push('BEGIN:VEVENT','UID:'+String(e.id).replace(/[^a-zA-Z0-9_-]/g,'')+'@agenda-escolar-cora','DTSTAMP:'+stamp,
        'DTSTART'+(t?':':';VALUE=DATE:')+range[0], 'DTEND'+(t?':':';VALUE=DATE:')+range[1],
        'SUMMARY:'+icsEscape(e.title),'DESCRIPTION:'+icsEscape([e.notes||'',e.meet?'Google Meet: '+e.meet:''].filter(Boolean).join('\n')),
        'LOCATION:'+icsEscape(e.mode==='online'?'Google Meet':e.place||''),
        'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEscape('Lembrete: '+e.title),'TRIGGER:'+(t?'-PT1H':'-P1D'),'END:VALARM','END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n')+'\r\n';
  }
  function downloadMonth(all) {
    const published=allEvents().filter(function(e){return (e.status||'Publicado')==='Publicado';});
    const list = all ? published : published.filter(function(e){return Number(e.date.slice(5,7))===selectedMonth+1;});
    if(!list.length){alert('Nenhum evento cadastrado para exportar.');return;}
    const blob = new Blob([toIcs(list)],{type:'text/calendar;charset=utf-8'});
    const u=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=u;a.download=all?'Agenda_Cora_Coralina_'+currentYear()+'.ics':'Agenda_Cora_'+MONTHS[selectedMonth]+'_'+currentYear()+'.ics';
    document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},10000);
  }
  function upcoming() {
    const banner=el('upcomingReminder');if(!banner)return;
    const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const next=allEvents().filter(function(e){
      if((e.status||'Publicado')!=='Publicado')return false;
      const d=new Date(e.date+'T12:00:00');
      const days=Math.round((new Date(d.getFullYear(),d.getMonth(),d.getDate())-today)/86400000);
      return days>=0 && days<=7;
    });
    banner.textContent=next.length?'Próximos 7 dias: '+next.length+' atividade(s) — '+next.slice(0,3).map(function(e){return e.date.slice(8,10)+'/'+e.date.slice(5,7)+' '+e.title;}).join(' • '):'';
    banner.hidden=!next.length;
  }
  function help(platform) {
    const ios=platform==='ios';
    el('installHelpTitle').textContent=ios?'Instalar no iPhone / iPad':'Instalar no Android';
    el('installHelpText').textContent=ios?
      'Abra este site no Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”. Confirme “Adicionar”. O app ficará na tela inicial, sem precisar da App Store.':
      'Abra este site no Chrome, toque no menu ⋮ e escolha “Instalar app” ou “Adicionar à tela inicial”. Se estiver disponível, aceite a instalação. Não é necessário baixar APK.';
    el('installHelpModal').showModal();
  }
  function bind() {
    el('eventMode').addEventListener('change',function(){el('eventMeetWrap').hidden=this.value!=='online';});
    const meetHelp=document.createElement('a');meetHelp.href='https://meet.google.com/new';meetHelp.target='_blank';meetHelp.rel='noopener noreferrer';meetHelp.textContent='Criar um link no Google Meet';meetHelp.className='meet-create-link';el('eventMeetWrap').appendChild(meetHelp);
    el('closeDayEvents').addEventListener('click',function(){el('dayEventsModal').close();});
    el('closeDayEventsBottom').addEventListener('click',function(){el('dayEventsModal').close();});
    el('createDayEvent').addEventListener('click',function(){el('dayEventsModal').close();el('addEventBtn').click();el('eventDate').value=daySelected;});
    document.addEventListener('click',function(evt){
      const btn=evt.target.closest('[data-google]');
      if(!btn)return;
      evt.preventDefault();
      const event=findEvent(btn.dataset.google);
      if(event){if(event.status==='Em revisão'&&!confirm('Este evento ainda está em revisão. Deseja mesmo abri-lo no Google Agenda?'))return;openGoogle(event);}
    });
    el('exportIcsBtn').addEventListener('click',function(){downloadMonth(false);});
    const yearBtn=document.createElement('button');
    yearBtn.type='button';yearBtn.className='btn btn-outline';yearBtn.id='exportYearIcsBtn';yearBtn.textContent='Baixar agenda completa 2026 (.ics)';
    el('exportIcsBtn').insertAdjacentElement('afterend',yearBtn);
    yearBtn.addEventListener('click',function(){downloadMonth(true);});
    const subscribeBtn=document.createElement('button');
    subscribeBtn.type='button';subscribeBtn.className='btn btn-install-soft';subscribeBtn.id='subscribeOfficialBtn';
    subscribeBtn.textContent='Assinar calendário oficial 2026';
    yearBtn.insertAdjacentElement('afterend',subscribeBtn);
    subscribeBtn.addEventListener('click',async function(){
      const feed=new URL('./agenda-oficial-2026.ics',window.location.href).href;
      const tab=window.open('https://calendar.google.com/calendar/u/0/r/settings/addbyurl','_blank','noopener,noreferrer');
      try{
        if(navigator.clipboard && navigator.clipboard.writeText){
          await navigator.clipboard.writeText(feed);
          alert('Link do calendário oficial copiado. No Google Agenda, escolha Adicionar pela URL e cole o link. Depois ative os lembretes dessa agenda.');
        }else{
          window.prompt('Copie o endereço e cole em Google Agenda > Outras agendas > Adicionar pela URL:',feed);
        }
      }catch(_){
        window.prompt('Copie o endereço e cole em Google Agenda > Outras agendas > Adicionar pela URL:',feed);
      }
      if(!tab) console.info('Abra Google Agenda e escolha Adicionar pela URL.');
    });
    const alertBox=document.createElement('div');alertBox.id='upcomingReminder';alertBox.className='upcoming-reminder';alertBox.hidden=true;
    el('calendar').parentElement.parentElement.insertAdjacentElement('beforebegin',alertBox);
    window.addEventListener('cora-month-changed',function(e){selectedMonth=e.detail.month;el('exportIcsBtn').textContent='Baixar '+MONTHS[selectedMonth]+' (.ics)';upcoming();});
    upcoming();
    window.addEventListener('cora-year-changed',()=>{
      selectedMonth=window.CoraYears?.month||0;
      el('exportYearIcsBtn').textContent='Baixar agenda '+currentYear()+' (.ics)';
      el('subscribeOfficialBtn').hidden=currentYear()!==2026;
      upcoming();
    });
    el('subscribeOfficialBtn').hidden=currentYear()!==2026;
    el('installIos').addEventListener('click',function(){help('ios');});
    el('installAndroid').addEventListener('click',async function(){
      if(!deferredInstall){help('android');return;}
      const prompt=deferredInstall;deferredInstall=null;
      await prompt.prompt();
    });
    window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredInstall=e;el('installAndroid').textContent='Instalar app Android';});
    window.addEventListener('appinstalled',function(){deferredInstall=null;el('installAndroid').textContent='App instalado';el('installAndroid').disabled=true;});
    ['closeInstallHelp','installHelpOk'].forEach(function(id){el(id).addEventListener('click',function(){el('installHelpModal').close();});});
  }
  bind();
})();
