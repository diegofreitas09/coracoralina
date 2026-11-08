/* Auditoria de feriados móveis: identifica cópias de outro ano e corrige registros
   publicados só após autorização explícita da Gestão. */
(() => {
 'use strict';
 const $=(s,root=document)=>root.querySelector(s);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const localKey=y=>'cora_calendario_eventos_'+y+'_v1';
 const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v===null?fallback:v}catch{return fallback}};
 const date=(iso,offset)=>{const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10)};
 function easter(y) {
   const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),f=Math.floor((b+8)/25),
     g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),
     k=c%4,l=(32+2*(b%4)+2*i-h-k+7)%7,m=Math.floor((a+11*h+22*l)/451);
   const mon=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;
   return y+'-'+String(mon).padStart(2,'0')+'-'+String(day).padStart(2,'0');
 }
 function expected(event,year) {
   if(!event||!String(event.date||'').startsWith(year+'-'))return null;
   const title=String(event.title||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
   const type=String(event.type||'').toLowerCase();
   if(type!=='feriado'&&!event.holidayManaged&&!/feriado|sem aula|ponto facultativo/.test(title))return null;
   let delta=null,kind='';
   if(/quarta-feira de cinzas|quarta de cinzas/.test(title)){delta=-46;kind='Quarta-feira de Cinzas'}
   else if(/carnaval/.test(title)) {
     const weekday=new Date(String(event.date).slice(0,10)+'T12:00:00Z').getUTCDay();
     if(weekday===1){delta=-48;kind='Segunda-feira de Carnaval'}
     if(weekday===2){delta=-47;kind='Terça-feira de Carnaval'}
   }else if(/corpus christi/.test(title)){delta=60;kind='Corpus Christi'}
   else if(/sexta-feira santa|sexta-feira da paixao|paixao de cristo/.test(title)){delta=-2;kind='Sexta-feira da Paixão'}
   else if(/pascoa/.test(title)){delta=0;kind='Páscoa'}
   if(delta===null)return null;
   return {expected:date(easter(year),delta),kind};
 }
 const fromPriorYear=(e,y)=>Number(e.originYear)>0&&Number(e.originYear)<y ||
   new RegExp('^carry-'+y+'-\\d{4}-').test(String(e.id||'')) ||
   /^(planejamento de |importado de )\d{4}/i.test(String(e.source||''));
 function findConflicts(events,year){
   if(!Array.isArray(events))return [];
   return events.flatMap(e=>{
     const result=expected(e,year);
     if(!result||result.expected===e.date)return [];
     return [{...result,id:String(e.id||''),date:String(e.date||''),title:String(e.title||''),
       imported:fromPriorYear(e,year),schoolConfirmedDuplicate:year===2027&&Boolean(window.CoraSchoolCarnival2027?.isInvalidLegacy?.(e)),event:e}];
   });
 }
 let panel=null,working=false,scanData=null,fnApi=null,fnYear=null,notify=null;
 const format=iso=>String(iso||'').slice(8,10)+'/'+String(iso||'').slice(5,7)+'/'+String(iso||'').slice(0,4);
 const show=message=>{const el=$('#coraAuditStatus',panel);if(el)el.textContent=message;};
 function setBusy(b){working=b;panel?.querySelectorAll('button').forEach(x=>{x.disabled=b});}
 function current(){return Number(fnYear?.()||2027)}
 function renderResult(){
   if(!panel||!scanData)return;
   const {year,remote,local,proposed,localProposed,manual}=scanData;
   const rows=arr=>arr.map(e=>'<li><strong>'+esc(format(e.date))+' · '+esc(e.title)+'</strong>'+
     '<span>O calendário correto é '+esc(format(e.expected))+' ('+esc(e.kind)+').'+(e.imported?' Origem: importação anterior.':e.schoolConfirmedDuplicate?' Carnaval 2027: data inválida confirmada pela escola.':' Origem não confirmada; revisão manual.')+'</span></li>').join('');
   $('#coraAuditDetails',panel).innerHTML='<p><strong>'+remote.length+'</strong> divergência(s) no calendário publicado; <strong>'+local.length+'</strong> nos registros deste navegador.</p>'+
      (remote.length?'<ul class="cora-audit-list">'+rows(remote)+'</ul>':'<p>Nenhuma divergência publicada encontrada para '+year+'.</p>')+
      (manual.length?'<p class="cora-audit-warning">'+manual.length+' registro(s) exigem edição manual. Não serão excluídos por esta ferramenta.</p>':'')+
      (proposed.length||localProposed.length?'<p class="cora-audit-good">'+proposed.length+' evento(s) publicado(s) e '+localProposed.length+' rascunho(s) importado(s) poderão ser retirados após confirmação. As datas corretas e os demais eventos serão preservados.</p>':
        '<p>Não há exclusões automáticas autorizadas. Confira eventuais divergências manualmente na Gestão.</p>');
   $('#coraAuditBackup',panel).hidden=!remote.length;
   $('#coraAuditFix',panel).hidden=!proposed.length&&!localProposed.length;
 }
 async function scan(){
   if(working||!panel)return;
   const y=current();
   if(y<2027){show('Esta auditoria é destinada aos anos importados a partir de 2027.');return}
   setBusy(true);show('Conferindo dados publicados e registros locais...');
   try{
     const response=await fnApi('state',undefined,'year='+y);
     const publication=response.publication||{},remoteEvents=Array.isArray(publication.events)?publication.events:[];
     const localEvents=read(localKey(y),[]);
     const remote=findConflicts(remoteEvents,y),local=findConflicts(localEvents,y);
     const eligible=e=>Boolean(e.id)&&(e.imported||e.schoolConfirmedDuplicate);
     const proposed=remote.filter(eligible);
     const localProposed=local.filter(eligible);
     const manual=[...remote.filter(e=>!eligible(e)),...local.filter(e=>!eligible(e))];
     scanData={year:y,publication,remoteEvents,localEvents,remote,local,proposed,localProposed,manual,updatedAt:publication.updatedAt};
     renderResult();
     show(remote.length||local.length?'Auditoria concluída: confira as divergências abaixo.':'Nenhuma divergência de feriado móvel encontrada para '+y+'.');
   }catch(e){scanData=null;$('#coraAuditDetails',panel).textContent='';show('Não foi possível consultar a publicação: '+String(e.message||e))}
   finally{setBusy(false)}
 }
 function backup(){
   if(!scanData)return;
   const blob=new Blob([JSON.stringify({app:'cora-calendario-auditoria',year:scanData.year,exportedAt:new Date().toISOString(),
     publication:scanData.publication},null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='backup-publicacao-'+scanData.year+'-antes-correcao.json';document.body.append(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1500);
 }
 async function correct(){
   if(working||!scanData||(!scanData.proposed.length&&!scanData.localProposed.length)||current()!==scanData.year)return;
   const d=scanData;
   const title=[...d.proposed,...d.localProposed].map(e=>format(e.date)+' — '+e.title).filter((v,i,a)=>a.indexOf(v)===i).join('\n');
   if(!confirm('CONFIRMAR A RETIRADA DOS REGISTROS IMPORTADOS COM DATAS INCORRETAS DE '+d.year+'?\n\n'+title+
      '\n\nOutros registros, reuniões, feriados corretos, aniversariantes e avisos serão preservados. Faça o backup disponível antes de continuar.'))return;
   setBusy(true);show('Validando a versão publicada antes da correção...');
   try{
     const latest=await fnApi('state',undefined,'year='+d.year);
     const currentPublication=latest.publication||{},currentEvents=Array.isArray(currentPublication.events)?currentPublication.events:[];
     const fresh=findConflicts(currentEvents,d.year).filter(e=>e.id&&(e.imported||e.schoolConfirmedDuplicate));
     const old=new Set(d.proposed.map(e=>e.id+'|'+e.date));
     const same=fresh.length===d.proposed.length&&fresh.every(e=>old.has(e.id+'|'+e.date));
     if(!same||String(currentPublication.updatedAt||'')!==String(d.updatedAt||'')){
       throw Error('A publicação mudou após a conferência. Atualize a auditoria antes de corrigir.');
     }
     const ids=new Set(fresh.map(e=>e.id));
     const next=currentEvents.filter(e=>!ids.has(String(e.id)));
     if(ids.size){
       const config={...currentPublication.config};
       await fnApi('publish',{year:d.year,events:next,
         notices:Array.isArray(currentPublication.notices)?currentPublication.notices:[],
         birthdays:Array.isArray(currentPublication.birthdays)?currentPublication.birthdays:[],
         stages:Array.isArray(currentPublication.stages)?currentPublication.stages:[],
         projects:Array.isArray(currentPublication.projects)?currentPublication.projects:[],
         config});
       const verified=await fnApi('state',undefined,'year='+d.year);
       const still=(verified.publication?.events||[]).filter(e=>ids.has(String(e.id)));
       if(still.length)throw Error('O servidor não confirmou todas as exclusões. Confira o calendário publicado.');
     }
     const own=read(localKey(d.year),[]);
     if(Array.isArray(own)){
       const cleaned=own.filter(e=>!ids.has(String(e.id))&&!findConflicts([e],d.year).some(x=>x.imported||x.schoolConfirmedDuplicate));
       try{localStorage.setItem(localKey(d.year),JSON.stringify(cleaned))}catch{show('Servidor corrigido; não foi possível atualizar o armazenamento local deste navegador.')}
     }
     window.dispatchEvent(new CustomEvent('cora-data-changed',{detail:{year:d.year,source:'audit-movable-holidays'}}));
     window.dispatchEvent(new CustomEvent('cora-events-updated',{detail:{year:d.year,source:'audit-movable-holidays'}}));
     if(typeof notify==='function')notify('Calendário '+d.year+': '+d.proposed.length+' registros publicados corrigidos e rascunhos locais divergentes revisados.');
     scanData=null;$('#coraAuditDetails',panel).textContent='';
     show(d.proposed.length?'Correção confirmada no servidor. Confira as datas corretas no Gestor de Feriados e no aplicativo do professor.':'Rascunhos incorretos deste navegador removidos. A publicação do servidor já estava correta.');
     $('#coraAuditFix',panel).hidden=true;$('#coraAuditBackup',panel).hidden=true;
   }catch(e){show('Correção não concluída: '+String(e.message||e)+'. Nenhuma exclusão local foi feita antes da confirmação no servidor.')}
   finally{setBusy(false)}
 }
 function mount({host,getYear,api,toast}={}){
   if(!host||!api||$('#coraHolidayAudit',host))return;
   const parent=$('#coraHolidayManager',host);if(!parent)return;
   fnApi=api;fnYear=getYear;notify=toast;
   panel=document.createElement('section');panel.id='coraHolidayAudit';panel.className='cora-holiday-audit';
   panel.innerHTML='<div class="cora-audit-head"><div><small>CONFERÊNCIA DE DATAS MÓVEIS</small><h3>Auditoria do Carnaval e feriados móveis</h3><p>Verifique registros do ano anterior reaproveitados em datas diferentes do calendário oficial. A limpeza exige confirmação da Gestão.</p></div></div>'+
    '<div class="cora-audit-buttons"><button type="button" id="coraAuditScan">Conferir divergências</button>'+
    '<button type="button" id="coraAuditBackup" hidden>Baixar backup da publicação</button>'+
    '<button type="button" id="coraAuditFix" hidden>Retirar datas importadas incorretas</button></div>'+
    '<div id="coraAuditStatus" role="status" aria-live="polite">Selecione o ano letivo e clique em Conferir divergências.</div>'+
    '<div id="coraAuditDetails"></div>';
   parent.append(panel);
   $('#coraAuditScan',panel).onclick=scan;$('#coraAuditBackup',panel).onclick=backup;
   $('#coraAuditFix',panel).onclick=correct;
   window.addEventListener('cora-year-changed',()=>{scanData=null;
     $('#coraAuditDetails',panel).textContent='';$('#coraAuditFix',panel).hidden=true;$('#coraAuditBackup',panel).hidden=true;
     show('Ano alterado. Clique em Conferir divergências para atualizar os registros.');});
 }
 window.CoraHolidayAudit={mount,findConflicts,expected,easter};
})();