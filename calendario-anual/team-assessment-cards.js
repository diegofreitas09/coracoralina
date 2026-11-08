/* Colégio Cora Coralina — resumo das avaliações para a Equipe Pedagógica.
   Fonte exclusiva: eventos e etapas efetivamente publicados pela Gestão.
   Não acessa rascunhos locais da Gestão nem presume datas ainda não publicadas.
 */
(() => {
 'use strict';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const plain=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const validDate=x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x||''))?String(x):'';
 const dmy=x=>validDate(x)?x.slice(8,10)+'/'+x.slice(5,7):'A definir';
 const kind=e=>{
  const value=plain((e?.title||'')+' '+(e?.notes||''));
  if(/simulado/.test(value))return 'SIMULADO';
  if(/diagnostic|\bad\b/.test(value))return 'AD';
  if(/parciais|\bap2\b|\bap1\b/.test(value))return 'AP2';
  if(/recomposic|recuperac|\bar\b/.test(value))return 'AR';
  if(/sondagem/.test(value))return 'SONDAGEM';
  return 'AVALIAÇÃO';
 };
 const priority={SIMULADO:0,AP2:1,AD:2,AR:3,SONDAGEM:4,'AVALIAÇÃO':5};
 const name=e=>String(e?.title||'Avaliação').replace(/^(?:Início|Fim)\s*:\s*/i,'')
  .replace(/\s*[—–-]\s*[1-4][ªºa]?\s*etapa\s*$/i,'').trim();
 const shortName=(e,k)=>{
  const t=name(e);
  if(k==='SIMULADO')return t.replace(/\s*[—–-]\s*[1-4][ªºa]?\s*etapa\s*$/i,'');
  return t||'Avaliação';
 };
 const matchStage=e=>{
  const n=Number(e?.stageNumber);
  if(Number.isInteger(n)&&n>=1&&n<=4)return n;
  const id=String(e?.id||'').match(/^cora-(?:periodo-avaliacao|simulado-sae|entrega-avaliacoes)-\d{4}-([1-4])(?:-|$)/);
  if(id)return Number(id[1]);
  const nameMatch=String(e?.title||'').match(/(?:^|[—–-]|\s)([1-4])\s*[ªºa]?\s*etapa\b/i);
  if(nameMatch)return Number(nameMatch[1]);
  return null;
 };
 const reference2027=[
  ['2027-01-18','2027-04-02'],['2027-04-05','2027-06-23'],
  ['2027-07-26','2027-10-01'],['2027-10-04','2027-11-30']
 ];
 const stageOf=(e,year,stages)=>{
  const explicit=matchStage(e);if(explicit)return explicit;
  const date=validDate(e?.date);if(!date)return null;
  const published=stages.find(st=>validDate(st.start)&&validDate(st.end)&&date>=st.start&&date<=st.end);
  if(published)return Number(published.number);
  // Referência só para classificar quando as datas da etapa ainda não foram publicadas.
  // Não exibir os limites de referência como se fossem oficiais.
  if(year===2027&&stages.every(st=>!validDate(st.start)||!validDate(st.end))){
   const index=reference2027.findIndex(([start,end])=>date>=start&&date<=end);
   if(index>=0)return index+1;
  }
  return null;
 };
 const periodFromNotes=e=>{
  const m=String(e?.notes||'').match(/Per[ií]odo\s*:\s*(\d{2})\/(\d{2})\/(\d{4})\s*(?:a|até|[–—-])\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  if(!m)return null;
  const start=m[3]+'-'+m[2]+'-'+m[1],end=m[6]+'-'+m[5]+'-'+m[4];
  return validDate(start)&&validDate(end)&&start<=end?{start,end}:null;
 };
 const isAssessment=e=>{
  if(!e||!validDate(e.date)||!String(e.title||'').trim()||e.assessmentDelivery===true)return false;
  if(/^(?:entrega|prazo)\s+(?:das?\s+)?avalia/i.test(plain(e.title)))return false;
  if(e.assessmentWindow===true||/^cora-(?:periodo-avaliacao|simulado-sae)-/.test(String(e.id||'')))return true;
  return /avalia[cç][aã]o|avaliac|simulado|sondagem|recomposi[cç]|recomposic|prova|diagn[oó]stic|\bap2\b|\bad\b/.test(plain(e.title+' '+(e.type||'')));
 };
 const isWindow=e=>e.assessmentWindow===true||/^cora-periodo-avaliacao-/.test(String(e.id||''))||
  /^(?:Início|Fim)\s*:\s*/i.test(String(e.title||''));
 function collect({year,events=[],stages=[]}={}){
  const y=Number(year),publishedStages=Array.isArray(stages)?stages.filter(st=>Number(st?.number)>=1&&Number(st.number)<=4):[],
   relevant=(Array.isArray(events)?events:[]).filter(e=>String(e.date||'').startsWith(y+'-')&&isAssessment(e)),
   uniqueEvents=new Map();
  for(const e of relevant){
   const id=String(e.id||'')||[e.date,e.title,e.type].join('|');
   uniqueEvents.set(id,e);
  }
  const groups=new Map(),extra=[];
  const stageRows=[1,2,3,4].map(n=>({
   number:n,stage:publishedStages.find(s=>Number(s.number)===n)||null,items:[]
  }));
  for(const e of uniqueEvents.values()){
   const st=stageOf(e,y,publishedStages);
   const k=kind(e),window=isWindow(e);
   const title=shortName(e,k);
   const original=String(e.id||'');
   const rootId=original.replace(/-(?:inicio|fim)$/,'');
   const common=window?rootId.match(/^cora-periodo-avaliacao-\d{4}-[1-4]-\d+$/)
     ?rootId:plain(title).replace(/[^a-z0-9]+/g,'-')
     :original||e.date+'-'+plain(title);
   const key=(st||'out')+'|'+(window?'periodo:':'evento:')+common;
   if(!groups.has(key)){
    groups.set(key,{title,label:k,start:e.date,end:e.date,stage:st,originals:[],isWindow:window,notes:'',simulado:k==='SIMULADO'});
   }
   const item=groups.get(key);item.originals.push(e);
   if(e.date<item.start)item.start=e.date;
   if(e.date>item.end)item.end=e.date;
   const range=window?periodFromNotes(e):null;
   if(range){
    if(range.start<item.start)item.start=range.start;
    if(range.end>item.end)item.end=range.end;
   }
   if(!item.notes&&e.notes)item.notes=String(e.notes);
  }
  for(const item of groups.values()){
   // Caso só exista o evento 'Fim', não inventar o início do período.
   const group=item.stage?stageRows[item.stage-1].items:extra;
   group.push(item);
  }
  const ordered=a=>a.sort((x,y)=>x.start.localeCompare(y.start)||priority[x.label]-priority[y.label]||x.title.localeCompare(y.title,'pt-BR'));
  stageRows.forEach(row=>ordered(row.items));ordered(extra);
  const all=[...stageRows.flatMap(x=>x.items),...extra];
  return {year:y,stages:stageRows,extras:extra,totals:{
   periods:all.filter(e=>!e.simulado).length,simulados:all.filter(e=>e.simulado).length,all:all.length
  }};
 }
 const dateRange=item=>item.start===item.end?dmy(item.start):dmy(item.start)+' a '+dmy(item.end);
 function renderRows(items){
  if(!items.length)return '<div class="cta-assess-empty"><strong>Nenhuma avaliação publicada nesta etapa.</strong><span>O cronograma será exibido quando a Gestão validar e publicar as datas.</span></div>';
  return '<ul class="cta-assess-list">'+items.map(e=>{
   const typeClass=e.label==='SIMULADO'?'is-simulado':e.label==='AD'?'is-ad':e.label==='AP2'?'is-ap2':e.label==='AR'?'is-ar':'is-other';
   const simulated=/\bsae\b/i.test(e.title)?' · 2º EF à 3ª série EM':'';
   return '<li class="cta-assess-item"><span class="cta-assess-tag '+typeClass+'">'+esc(e.label)+'</span>'+
     '<div class="cta-assess-item-body"><strong>'+esc(e.title)+'</strong>'+
     '<span class="cta-assess-date"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></svg>'+esc(dateRange(e))+'</span>'+
     (e.simulado&&simulated?'<small class="cta-assess-scope">Participantes: 2º ano EF à 3ª série EM</small>':'')+
     '</div></li>';
  }).join('')+'</ul>';
 }
 function render(source={}){
  const data=collect(source);
  const cards=data.stages.map(row=>{
   const stage=row.stage||{},hasDate=validDate(stage.start)&&validDate(stage.end);
   const period=hasDate?dmy(stage.start)+' a '+dmy(stage.end):'Datas da etapa ainda não publicadas';
   const count=row.items.length;
   return '<article class="cta-stage-card cta-stage-'+row.number+'" aria-label="'+row.number+'ª etapa">'+
    '<div class="cta-stage-head"><span class="cta-stage-number">'+String(row.number).padStart(2,'0')+'</span>'+
    '<div class="cta-stage-heading"><h3>'+row.number+'ª etapa</h3><small>'+esc(period)+'</small></div>'+
    '<span class="cta-stage-count">'+count+' '+(count===1?'avaliação':'avaliações')+'</span></div>'+
    renderRows(row.items)+'</article>';
  }).join('');
  return '<section class="cta-assessments" aria-label="Resumo anual de avaliações por etapa">'+
   '<div class="cta-assess-hero"><div><small>COLÉGIO CORA CORALINA · EQUIPE PEDAGÓGICA</small>'+
   '<h2>Avaliações por etapa</h2><p>Confira as provas, avaliações diagnósticas, recomposições e simulados do ano letivo.</p></div>'+
   '<span class="cta-assess-year">'+esc(data.year)+'</span></div>'+
   '<div class="cta-assess-totals"><span><strong>4</strong> etapas</span>'+
   '<span><strong>'+data.totals.periods+'</strong> avaliações e períodos</span>'+
   '<span><strong>'+data.totals.simulados+'</strong> simulados</span></div>'+
   '<div class="cta-assess-grid">'+cards+'</div>'+
   (data.extras.length?'<section class="cta-assess-extras"><h3>Outras avaliações publicadas</h3>'+
     '<p>Atividades cuja etapa não foi identificada na publicação. A Gestão pode revisar a classificação.</p>'+
     renderRows(data.extras)+'</section>':'')+
   '<p class="cta-assess-foot">Somente informações publicadas pela Gestão. Os <b>Prazos de entrega</b> à coordenação ficam na página <b>Entregas</b>. '+
   'Cada período é apresentado uma única vez, mesmo quando o calendário registra início e fim separadamente.</p></section>';
 }
 window.CoraTeamAssessmentCards={collect,render,isAssessment,kind};
})();