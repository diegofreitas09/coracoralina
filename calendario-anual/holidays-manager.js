/* Feriados e dias letivos: decisões locais da Gestão, publicadas pelo portal existente. */
(() => {
 'use strict';
 const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
 const STATES=[['AC','Acre'],['AL','Alagoas'],['AP','Amapá'],['AM','Amazonas'],['BA','Bahia'],['CE','Ceará'],['DF','Distrito Federal'],['ES','Espírito Santo'],['GO','Goiás'],['MA','Maranhão'],['MT','Mato Grosso'],['MS','Mato Grosso do Sul'],['MG','Minas Gerais'],['PA','Pará'],['PB','Paraíba'],['PR','Paraná'],['PE','Pernambuco'],['PI','Piauí'],['RJ','Rio de Janeiro'],['RN','Rio Grande do Norte'],['RS','Rio Grande do Sul'],['RO','Rondônia'],['RR','Roraima'],['SC','Santa Catarina'],['SP','São Paulo'],['SE','Sergipe'],['TO','Tocantins']];
 const KEY=y=>'cora_feriados_dias_letivos_'+y+'_v1';
 const EVENTS=y=>'cora_calendario_eventos_'+y+'_v1';
 const EVIDENCE='https://www.planalto.gov.br/ccivil_03/leis/l9093.htm';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\u0027':'&#39;'}[c]));
 const pad=n=>String(n).padStart(2,'0');
 const make=(y,m,d)=>String(y)+'-'+pad(m)+'-'+pad(d);
 const normal=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const read=(key,fallback)=>{try{const o=JSON.parse(localStorage.getItem(key)||'null');return o===null?fallback:o}catch{return fallback}};
 const valid=(s,year)=>{if(!/^\d{4}-\d\d-\d\d$/.test(String(s)))return false;const [y,m,d]=s.split('-').map(Number);const x=new Date(Date.UTC(y,m-1,d));return y===year&&x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d};
 const addDays=(iso,days)=>{const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
 const printable=iso=>String(iso||'').slice(8,10)+'/'+String(iso||'').slice(5,7)+'/'+String(iso||'').slice(0,4);
 function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k+7)%7,m=Math.floor((a+11*h+22*l)/451);const mo=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;return make(y,mo,day)}
 function idFor(d,title,scope){const t=normal(title),hash=Array.from(t).reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7).toString(36);return d+'-'+t.slice(0,66)+'-'+hash+'-'+normal(scope).slice(0,12)}
 function row(date,title,scope,law,verified=true){
  return {id:idFor(date,title,scope),date,title,scope,law,verified};
 }
 function officialList(year,uf,city){
  const y=Number(year),e=easter(y),items=[
   row(make(y,1,1),'Confraternização Universal','Nacional','Lei 662/1949'),
   row(make(y,4,21),'Tiradentes','Nacional','Lei 662/1949'),
   row(make(y,5,1),'Dia do Trabalho','Nacional','Lei 662/1949'),
   row(make(y,9,7),'Independência do Brasil','Nacional','Lei 662/1949'),
   row(make(y,10,12),'Nossa Senhora Aparecida','Nacional','Lei 6802/1980'),
   row(make(y,11,2),'Finados','Nacional','Lei 662/1949'),
   row(make(y,11,15),'Proclamação da República','Nacional','Lei 662/1949'),
   row(make(y,11,20),'Dia Nacional de Zumbi e da Consciência Negra','Nacional','Lei 14759/2023'),
   row(make(y,12,25),'Natal','Nacional','Lei 662/1949')
  ];
  items.push(row(addDays(e,-48),'Carnaval (segunda-feira)','Ponto facultativo','Não é feriado nacional; verificar atos locais',false));
  items.push(row(addDays(e,-47),'Carnaval (terça-feira)','Ponto facultativo','Não é feriado nacional; verificar atos locais',false));
  items.push(row(addDays(e,-46),'Quarta-feira de Cinzas','Ponto facultativo','Não é feriado nacional; verificar horário local',false));
  if(uf==='CE')items.push(row(make(y,3,25),'Data Magna do Ceará','Estadual','Constituição do Estado do Ceará, art. 18, parágrafo único'));
  const fortaleza=uf==='CE'&&normal(city)==='fortaleza';
  items.push(row(addDays(e,-2),'Sexta-feira da Paixão',fortaleza?'Municipal':'A confirmar','Lei municipal religiosa; verificar no município',fortaleza));
  items.push(row(addDays(e,60),'Corpus Christi',fortaleza?'Municipal':'A confirmar',fortaleza?'Lei municipal de Fortaleza 8796/2003':'Não é feriado nacional; verificar lei municipal',fortaleza));
  if(fortaleza){
   items.push(row(make(y,3,19),'São José','Municipal','Lei de Fortaleza 8796/2003'));
   items.push(row(make(y,8,15),'Nossa Senhora da Assunção','Municipal','Lei de Fortaleza 8796/2003'));
   if(y===2026)items.push(row(make(y,4,13),'Aniversário de 300 anos de Fortaleza (2026)','Municipal','Lei municipal 11649/2026'));
  }
  return items.sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title,'pt-BR'));
 }
 let host=null,activeYear=2027,displayMonth='all',record=null,rows=[],busy=false;
 const initial=y=>({year:y,uf:'CE',city:'',cityCode:'',decisions:{},custom:[],attachments:[],savedAt:''});
 const config=y=>{const v=read(KEY(y),null);return v&&v.year===y&&v.decisions&&typeof v.decisions==='object'?{...initial(y),...v}:initial(y)};
 function refreshRows(){rows=[...officialList(activeYear,record.uf,record.city),...(record.custom||[])].sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title,'pt-BR'))}
 function monthRows(){return displayMonth==='all'?rows:rows.filter(r=>Number(r.date.slice(5,7))===Number(displayMonth)+1)}
 function saved(){localStorage.setItem(KEY(activeYear),JSON.stringify(record))}
 function load(y){activeYear=y;record=config(y);refreshRows();render();void fillCities()}
 function getYear(){return Number(window.CoraYears?.activeYear)||activeYear}
 function notice(message){const e=host?.querySelector('#chStatus');if(e)e.textContent=message}
 function selectDate(d){return esc(d)}
 function statusName(s){return {pendente:'A definir',sem:'Sem aula',com:'Haverá aula',antecipado:'Antecipado',manter:'Manter programação'}[s]||'A definir'}
 function currentDecision(r){const d=record.decisions[r.id];return d&&typeof d==='object'?d:{status:'pendente',movedTo:''}}
 function render(){
  if(!host)return;
  const picker=host.querySelector('#chYear');
  if(!picker)return;
  picker.value=String(activeYear);
  host.querySelector('#chUf').value=record.uf;
  host.querySelector('#chMonth').value=displayMonth;
  const city=host.querySelector('#chCityText');if(city&&document.activeElement!==city)city.value=record.city;
  const total=rows.filter(r=>currentDecision(r).status!=='pendente').length;
  const confirmed=rows.filter(r=>r.verified).length;
  const weekdays=Array.from({length:366},(_,i)=>{const d=new Date(Date.UTC(activeYear,0,i+1));return d.getUTCFullYear()===activeYear?d:null}).filter(Boolean);
  const closed=new Set(rows.filter(r=>currentDecision(r).status==='sem').map(r=>r.date));
  const extra=new Set(rows.filter(r=>currentDecision(r).status==='com'||currentDecision(r).status==='antecipado').map(r=>r.date));
  rows.filter(r=>currentDecision(r).status==='antecipado'&&valid(currentDecision(r).movedTo,activeYear)).forEach(r=>closed.add(currentDecision(r).movedTo));
  const potential=weekdays.filter(d=>{const day=d.getUTCDay(),str=d.toISOString().slice(0,10);return ((day>0&&day<6)||extra.has(str))&&!closed.has(str)}).length;
  host.querySelector('#chMetrics').innerHTML='<span><strong>'+rows.length+'</strong> datas apresentadas</span><span><strong>'+confirmed+'</strong> feriados identificados na base</span><span><strong>'+total+'</strong> decisões preenchidas</span><span><strong>'+potential+'</strong> dias úteis potenciais*</span>';
  const schoolCarnaval=host.querySelector('#chSchoolCarnaval2027');
  const school=window.CoraSchoolCarnival2027;
  if(schoolCarnaval){
   const on=activeYear===2027&&record.uf==='CE'&&school;
   schoolCarnaval.hidden=!on;
   if(on){
    const confirmedDates=rows.filter(r=>['2027-02-08','2027-02-09','2027-02-10'].includes(r.date)&&currentDecision(r).status==='sem').length;
    schoolCarnaval.innerHTML='<div class="ch-cora-carnival-head"><strong>Carnaval 2027 · funcionamento do Cora Coralina</strong>'+
     '<span>'+confirmedDates+'/3 dias úteis marcados sem aula</span></div>'+
     '<p><b>06 a 10/02:</b> sem aula. Os dias 6 e 7 são sábado e domingo, sem aulas regulares. '+
      '<b>11/02:</b> retorno com aula normal. Aulas normais também nos dias <b>12, 15, 16 e 17/02.</b></p>'+
     '<div class="ch-cora-carnival-grid">'+school.days.map(d=>
      '<div><time>'+esc(printable(d.date))+'</time><span class="'+(d.kind==='aula'?'is-class':'is-closed')+'">'+esc(d.status)+'</span>'+
      '<small>'+esc(d.description)+'</small></div>').join('')+'</div>'+
     '<button type="button" class="ch-outline" id="chCoraCarnavalApply">Definir 08, 09 e 10/02 como SEM AULA</button>'+
     '<p class="ch-cora-carnival-foot">Regra exclusiva deste calendário escolar. Os dias 15, 16 e 17/02 não são Carnaval. '+
      'Depois de marcar, use “Salvar e publicar para a equipe”. Registros antigos devem ser conferidos na auditoria.</p>';
   }
  }
  const area=host.querySelector('#chRows');
  const data=monthRows();
  area.innerHTML=data.length?data.map(r=>{
   const d=currentDecision(r);
   return '<div class="ch-row" data-id="'+esc(r.id)+'"><div class="ch-date">'+esc(r.date.slice(8,10))+'<small>'+esc(MONTHS[Number(r.date.slice(5,7))-1].slice(0,3))+'</small></div>'+
    '<div class="ch-info"><strong>'+esc(r.title)+'</strong><span>'+esc(r.scope)+' · '+esc(r.law)+'</span>'+(!r.verified?'<small class="ch-review">Exige conferência da legislação local</small>':'')+'</div>'+
    '<div class="ch-decision"><label>Funcionamento <select data-decision="'+esc(r.id)+'">'+
    [['pendente','A definir'],['sem','Sem aula'],['com','Haverá aula'],['antecipado','Antecipar / transferir'],['manter','Manter como está']].map(o=>'<option value="'+o[0]+'" '+(d.status===o[0]?'selected':'')+'>'+o[1]+'</option>').join('')+
    '</select></label>'+(d.status==='antecipado'?'<label>Nova data sem aula <input type="date" data-moved="'+esc(r.id)+'" min="'+activeYear+'-01-01" max="'+activeYear+'-12-31" value="'+esc(d.movedTo||'')+'" required></label>':'')+
    (r.scope==='Importado'?'<button type="button" data-remove="'+esc(r.id)+'" class="ch-remove">Excluir data</button>':'')+'</div></div>';
  }).join(''):'<p class="ch-empty">Nenhuma data no mês escolhido. Você pode adicionar uma data específica.</p>';
  host.querySelector('#chFoot').textContent='*Estimativa de segunda a sexta, ajustada pelas decisões. Não substitui a apuração dos 200 dias letivos nem considera automaticamente férias, recessos e sábados letivos.';
  const a=host.querySelector('#chAttachments');if(a)a.textContent=record.attachments.length?'Documentos anexados neste ano: '+record.attachments.map(x=>x.name).join(' · '):'Nenhum documento de referência anexado neste ano.';
 }
 async function fillCities(){
  if(!host)return;
  const select=host.querySelector('#chCitySelect'),uf=record.uf,city=record.city;
  select.innerHTML='<option value="">Consultando municípios do IBGE...</option>';
  try{
   const resp=await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/'+encodeURIComponent(uf)+'/municipios?orderBy=nome',{cache:'force-cache'});
   if(!resp.ok)throw Error('Municípios indisponíveis');
   const all=await resp.json();
   if(!host||record.uf!==uf)return;
   select.innerHTML='<option value="">Selecione ou digite o município</option>'+all.map(i=>'<option value="'+esc(i.nome)+'" data-ibge="'+esc(i.id)+'" '+(normal(i.nome)===normal(city)?'selected':'')+'>'+esc(i.nome)+'</option>').join('');
  }catch{if(host)select.innerHTML='<option value="">Digite o município ao lado</option>';notice('Não foi possível consultar municípios do IBGE. A digitação manual continua disponível.')}
 }
 function applyDecision(id,status,movedTo){
  record.decisions[id]={status,movedTo:movedTo||record.decisions[id]?.movedTo||''};
 }
 function makeEvent(r,decision,date,extra=false){
  const dec=decision.status,title=extra?'Sem aula antecipada — '+r.title:dec==='sem'?'Sem aula — '+r.title:dec==='com'?'Haverá aula — '+r.title:dec==='antecipado'?'Feriado antecipado — '+r.title:'Feriado · manter programação — '+r.title;
  const operation=extra?'SEM AULA (data transferida de '+printable(r.date)+')':
   dec==='sem'?'SEM AULA':dec==='com'?'HAVERÁ AULA':dec==='antecipado'?'TRANSFERIDO para '+printable(decision.movedTo):'MANTER PROGRAMAÇÃO EXISTENTE';
  return {id:'cora-hm-'+normal(r.id)+'-'+(extra?'transfer':'principal'),date,title,type:'Feriado',notes:'Funcionamento escolar: '+operation+'. '+r.scope+'. '+r.law+'. Decisão da Gestão.',source:'Gestão · Feriados e dias letivos',status:'Publicado',needsReview:false,audience:'Todos',holidayManaged:true,holidayDecision:extra?'sem':dec,holidayOriginalDate:r.date,holidayScope:r.scope,holidayTransferredTo:dec==='antecipado'?decision.movedTo:'',holidayReference:r.law,mode:'presencial',time:'',duration:60,place:'',meet:''};
 }
 function commit(){
  if(rows.some(r=>currentDecision(r).status==='antecipado'&&(!valid(currentDecision(r).movedTo,activeYear)||r.date===currentDecision(r).movedTo)))throw Error('Há antecipações sem nova data válida ou com a mesma data original.');
  const next=[];
  rows.forEach(r=>{const d=currentDecision(r);if(d.status==='pendente')return;next.push(makeEvent(r,d,r.date));if(d.status==='antecipado')next.push(makeEvent(r,d,d.movedTo,true))});
  const own=read(EVENTS(activeYear),[]);
  if(!Array.isArray(own))throw Error('Não foi possível ler os eventos locais.');
  const keep=own.filter(e=>!e.holidayManaged);
  const before=JSON.stringify(own);
  const after=JSON.stringify(keep.concat(next));
  localStorage.setItem(EVENTS(activeYear),after);
  record.savedAt=new Date().toISOString();saved();
  if(after!==before){
   window.dispatchEvent(new CustomEvent('cora-data-changed',{detail:{year:activeYear,source:'holidays'}}));
   window.dispatchEvent(new CustomEvent('cora-events-updated',{detail:{year:activeYear,source:'holidays'}}));
  }
  return next.length;
 }
 async function saveAndPublish(callback){
  if(busy)return;
  busy=true;
  try{
   const amount=commit();
   notice(amount+' registro(s) incluído(s) no calendário da Gestão. '+(callback?'Enviando para a Equipe...':'Use Publicar para equipe para sincronizar.'));
   if(callback){const published=await callback();notice(published?'Decisões publicadas e conferidas na Equipe Pedagógica.':'Decisões salvas na Gestão. A publicação para a Equipe não foi concluída.')}
  }catch(error){notice('Atenção: '+error.message)}
  finally{busy=false}
 }
 function addCustom(date,title){
  if(!valid(date,activeYear)||!title.trim())throw Error('Informe data válida e descrição da data.');
  const r=row(date,title.trim().slice(0,140),'Importado','Cadastro ou arquivo fornecido pela Gestão',false);
  if(!record.custom.some(x=>x.id===r.id))record.custom.push(r);
  refreshRows();saved();render();return r;
 }
 async function attach(file){
  if(file.size>75*1024*1024)throw Error('Arquivo maior que 75 MB.');
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('cora_calendario_documentos_'+activeYear+'_v1',1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('files'))request.result.createObjectStore('files',{keyPath:'id'})};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
  const uuid='feriado-doc-'+activeYear+'-'+Date.now()+'-'+Math.random().toString(36).slice(2);
  try{
   await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put({id:uuid,name:file.name,month:displayMonth==='all'?0:Number(displayMonth),size:file.size,type:file.type||'application/octet-stream',blob:file,lastModified:file.lastModified||Date.now(),holidayReference:true});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
  }finally{db.close()}
  record.attachments.push({id:uuid,name:file.name,month:displayMonth});
  saved();
  window.dispatchEvent(new CustomEvent('cora-data-changed',{detail:{year:activeYear,source:'holiday-file'}}));
 }
 async function importFiles(files){
  if(busy)return;busy=true;let dates=0,docs=0,fail=0;
  try{
   for(const file of Array.from(files)){
    try{
     const ext=(file.name.split('.').pop()||'').toLowerCase();
     if(!['csv','txt','json','ics','pdf','doc','docx','xls','xlsx'].includes(ext))throw Error('Formato não aceito');
     if(['csv','txt','json','ics'].includes(ext)){
      const raw=(await file.text()).slice(0,2000000);
      let candidates=[];
      if(ext==='json'){
       const obj=JSON.parse(raw);
       const list=Array.isArray(obj)?obj:(Array.isArray(obj.events)?obj.events:Array.isArray(obj.dates)?obj.dates:[]);
       candidates=list.map(x=>({date:String(x.date||x.data||''),title:String(x.title||x.name||x.nome||'Data importada')}));
      }else if(ext==='ics'){
       const pieces=raw.split(/BEGIN:VEVENT/i).slice(1);
       candidates=pieces.map(x=>{const hit=x.match(/DTSTART(?:;[^:]*)?:(\d{8})/i);const title=x.match(/SUMMARY:([^\r\n]+)/i);return {date:hit?hit[1].slice(0,4)+'-'+hit[1].slice(4,6)+'-'+hit[1].slice(6,8):'',title:title?title[1].trim():'Data importada'}});
      }else{
       candidates=raw.split(/\r?\n/).map(line=>{const hit=line.match(/\b(\d{4}-\d\d-\d\d)\b|\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);if(!hit)return {date:'',title:''};const date=hit[1]||(hit[4]+'-'+pad(hit[3])+'-'+pad(hit[2]));return {date,title:line.replace(hit[0],'').replace(/^[;,\s\-]+|[;,\s\-]+$/g,'').slice(0,140)||'Data importada'}});
      }
      candidates.forEach(c=>{if(valid(c.date,activeYear)&&c.title.trim()&&!/^(date|data|title|nome)$/i.test(c.title.trim())){addCustom(c.date,c.title);dates++}});
     }
     await attach(file);docs++;
    }catch(e){fail++;console.warn('Documento não importado',file.name,e)}
   }
   refreshRows();render();notice('Importação: '+docs+' arquivo(s) salvo(s), '+dates+' data(s) identificada(s) para conferência.'+(fail?' '+fail+' arquivo(s) com erro.':'')+' PDFs/Word são anexados como referência; suas datas exigem conferência.');
  }finally{busy=false}
 }
 function panel(){
  const y=activeYear;
  const years=Array.from({length:Math.min(74,Math.max(12,activeYear-2026+6))},(_,i)=>2026+i);
  return '<details id="chManager" class="ch-panel"><summary><span class="ch-icon" aria-hidden="true">▦</span><strong>Feriados e dias letivos</strong><small>Ano, estado, município e funcionamento escolar</small></summary>'+
   '<div class="ch-body"><p class="ch-lead">Confira os feriados da localidade, decida se haverá aula e publique as decisões no calendário dos professores. Feriados não podem ser alterados por decisão escolar; o que se registra aqui é o funcionamento da escola.</p>'+
   '<div class="ch-filters"><label>Ano letivo<select id="chYear">'+years.map(x=>'<option value="'+x+'" '+(x===y?'selected':'')+'>'+x+'</option>').join('')+'</select></label>'+
   '<label>Estado (UF)<select id="chUf">'+STATES.map(x=>'<option value="'+x[0]+'" '+(x[0]===record.uf?'selected':'')+'>'+x[1]+'</option>').join('')+'</select></label>'+
   '<label>Município (IBGE)<select id="chCitySelect"><option>Carregando...</option></select></label>'+
   '<label>Ou digite o município<input id="chCityText" type="text" maxlength="110" value="'+esc(record.city)+'" placeholder="Ex.: Fortaleza"></label>'+
   '<label>Exibir<select id="chMonth"><option value="all">Ano inteiro · 12 meses</option>'+MONTHS.map((m,i)=>'<option value="'+i+'">'+m+'</option>').join('')+'</select></label></div>'+
   '<div id="chMetrics" class="ch-metrics"></div><div id="chSchoolCarnaval2027" class="ch-cora-carnival" hidden></div>'+
   '<div class="ch-actions"><button type="button" id="chAllNo" class="ch-outline">Marcar sem aula · período exibido</button><button type="button" id="chAllKeep" class="ch-outline">Manter programação · período exibido</button><button type="button" id="chClear" class="ch-outline">Voltar para A definir</button></div>'+
   '<div id="chRows" class="ch-rows"></div>'+
   '<form id="chExtra" class="ch-extra"><strong>Adicionar feriado, recesso ou dia especial</strong><input type="date" id="chExtraDate" min="'+y+'-01-01" max="'+y+'-12-31" required><input type="text" id="chExtraName" placeholder="Descrição da data" maxlength="140" required><button type="submit" class="ch-outline">Adicionar data</button></form>'+
   '<div class="ch-upload"><strong>Documentos e calendário de referência</strong><p>Arraste ou selecione PDF, Word, Excel, CSV, TXT, JSON ou ICS. Datas em CSV/TXT/JSON/ICS são propostas para revisão; outros arquivos ficam anexados ao mês ou ao ano.</p><div id="chDrop" class="ch-drop" tabindex="0" role="button">Arraste o documento aqui ou toque para selecionar<input type="file" id="chFiles" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.json,.ics" hidden></div><small id="chAttachments"></small></div>'+
   '<p class="ch-foot" id="chFoot"></p><div class="ch-end"><button type="button" id="chSave" class="ch-primary">Salvar no calendário da Gestão</button><button type="button" id="chPublish" class="ch-primary">Salvar e publicar para a equipe</button><span id="chStatus" role="status" aria-live="polite">Aguardando conferência da Gestão.</span></div>'+
   '<p class="ch-warning">Os feriados municipais fora de Fortaleza precisam ser conferidos com a legislação local e podem ser adicionados por arquivo. Pontos facultativos não são automaticamente dias sem aula. Decisões salvas no navegador só aparecem aos professores após publicação pela Gestão.</p></div></details>';
 }
 function mountManager({host:parent,getYear:fn,onPublish}={}){
  if(!parent)return;
  const position=parent.querySelector('#cpYearSync')||parent.querySelector('.cp-manager-bar');if(!position)return;
  const wrapper=document.createElement('div');wrapper.id='coraHolidayManager';position.insertAdjacentElement('afterend',wrapper);
  host=wrapper;activeYear=Number(fn?.()||getYear())||2027;record=config(activeYear);
  wrapper.innerHTML=panel();refreshRows();render();void fillCities();
  wrapper.querySelector('#chYear').onchange=e=>{const y=Number(e.target.value);if(window.CoraYears?.setYear)window.CoraYears.setYear(y);load(y)};
  wrapper.querySelector('#chUf').onchange=e=>{record.uf=e.target.value;record.city='';record.cityCode='';refreshRows();saved();render();void fillCities()};
  wrapper.querySelector('#chCitySelect').onchange=e=>{if(!e.target.value)return;record.city=e.target.value;record.cityCode=e.target.selectedOptions[0]?.dataset.ibge||'';refreshRows();saved();render()};
  wrapper.querySelector('#chCityText').onchange=e=>{record.city=e.target.value.trim();record.cityCode='';refreshRows();saved();render()};
  wrapper.querySelector('#chMonth').onchange=e=>{displayMonth=e.target.value;render()};
  wrapper.querySelector('#chRows').onchange=e=>{
   const el=e.target;
   if(el.matches('[data-decision]')){applyDecision(el.dataset.decision,el.value);render();}
   if(el.matches('[data-moved]')){const id=el.dataset.moved;applyDecision(id,'antecipado',el.value);saved();render();}
  };
  wrapper.querySelector('#chRows').onclick=e=>{const el=e.target.closest('[data-remove]');if(!el)return;record.custom=record.custom.filter(r=>r.id!==el.dataset.remove);delete record.decisions[el.dataset.remove];refreshRows();saved();render()};
  wrapper.querySelector('#chAllNo').onclick=()=>{monthRows().forEach(r=>applyDecision(r.id,'sem'));saved();render()};
  wrapper.querySelector('#chAllKeep').onclick=()=>{monthRows().forEach(r=>applyDecision(r.id,'manter'));saved();render()};
  wrapper.querySelector('#chClear').onclick=()=>{monthRows().forEach(r=>applyDecision(r.id,'pendente'));saved();render()};
  wrapper.querySelector('#chSchoolCarnaval2027').addEventListener('click',event=>{
   if(!event.target.closest('#chCoraCarnavalApply')||activeYear!==2027||record.uf!=='CE')return;
   const days=new Set(['2027-02-08','2027-02-09','2027-02-10']);
   const targets=rows.filter(r=>days.has(r.date)&&/carnaval|cinzas/i.test(r.title)&&r.scope==='Ponto facultativo');
   if(targets.length!==3){notice('O período não foi encontrado na base de feriados. Confira as configurações antes de aplicar.');return;}
   targets.forEach(r=>applyDecision(r.id,'sem',''));
   saved();render();
   notice('Carnaval 2027: 08, 09 e 10/02 marcados SEM AULA. Sábado 06 e domingo 07 já são não letivos. Retorno em 11/02. Clique em Salvar e publicar para a equipe.');
  });
  wrapper.querySelector('#chExtra').onsubmit=e=>{e.preventDefault();try{addCustom(wrapper.querySelector('#chExtraDate').value,wrapper.querySelector('#chExtraName').value);wrapper.querySelector('#chExtraName').value='';notice('Data cadastrada. Escolha o funcionamento e salve.')}catch(error){notice(error.message)}};
  wrapper.querySelector('#chSave').onclick=()=>saveAndPublish(null);
  wrapper.querySelector('#chPublish').onclick=()=>saveAndPublish(onPublish);
  wrapper.querySelector('#chFiles').onchange=e=>{void importFiles(e.target.files);e.target.value=''};
  const drop=wrapper.querySelector('#chDrop');drop.onclick=()=>wrapper.querySelector('#chFiles').click();
  drop.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();wrapper.querySelector('#chFiles').click()}};
  drop.ondragover=e=>{e.preventDefault();drop.classList.add('ch-drag')};
  drop.ondragleave=()=>drop.classList.remove('ch-drag');
  drop.ondrop=e=>{e.preventDefault();drop.classList.remove('ch-drag');void importFiles(e.dataTransfer.files)};
  window.addEventListener('cora-year-changed',e=>{if(host===wrapper&&Number(e.detail?.year)!==activeYear)load(Number(e.detail.year))});
  return wrapper;
 }
 function teacherPanel(year,events,month='all'){
  const list=(Array.isArray(events)?events:[]).filter(e=>(e.type==='Feriado'||e.holidayManaged)&&Number(e.date?.slice(0,4))===Number(year)).filter(e=>month==='all'||Number(e.date.slice(5,7))===Number(month)+1).sort((a,b)=>a.date.localeCompare(b.date));
  const region=(list.find(x=>x.holidayScope)||{}).holidayScope;
  const school=Number(year)===2027&&(month==='all'||Number(month)===1)?window.CoraSchoolCarnival2027:null;
  const schoolInfo=school?'<div class="ch-cora-team-info"><strong>Carnaval 2027 · funcionamento do Cora Coralina</strong>'+
   '06 e 07/02: sábado e domingo, sem aulas regulares. 08, 09 e 10/02: sem aula (Carnaval e Cinzas). '+
   '<b>Retorno: quinta-feira, 11/02, com aula normal.</b> Também haverá aula normal em 12, 15, 16 e 17/02. '+
   'Os dias 15, 16 e 17 não são Carnaval.</div>':'';
  return '<section class="ch-team"><h2>Feriados e funcionamento escolar · '+esc(year)+'</h2><p>Datas e decisões divulgadas pela Gestão. O funcionamento pode mudar mediante novo comunicado.</p>'+schoolInfo+
   (list.length?'<div class="ch-team-list">'+list.map(e=>'<article><time>'+esc(printable(e.date))+'</time><div><strong>'+esc(e.title)+'</strong><p>'+esc(e.holidayDecision?statusName(e.holidayDecision):'Calendário publicado · confirmar funcionamento')+(e.holidayDecision==='antecipado'?' — '+esc(printable(e.holidayTransferredTo)):'')+'</p></div></article>').join('')+'</div>':'<p>Nenhum feriado divulgado para este período.</p>')+'</section>';
 }
 window.CoraHolidays={mountManager,teacherPanel,officialList,config,KEY};
})();