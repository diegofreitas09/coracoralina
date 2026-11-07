/* Visão de todos os anos: um modelo único, somente com o que a Gestão publicou. */
(() => {
 'use strict';
 const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
 const DAYS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
 const esc=x=>String(x??'').replace(/[&<>"']/g,v=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v]));
 const iso=(y,m,d)=>y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
 const inMonth=(item,m)=>Number(String(item?.date||'').slice(5,7))===m+1;
 const fmt=isoDate=>/^\d{4}-\d{2}-\d{2}$/.test(String(isoDate||''))?isoDate.slice(8,10)+'/'+isoDate.slice(5,7)+'/'+isoDate.slice(0,4):'A definir';
 const goodMonth=m=>Number.isInteger(m)&&m>=0&&m<12;
 const normalize=({year,month,events=[],stages=[],birthdays=[],projects=[]}={})=>{
  const y=Number(year),m=Number(month);
  return {year:Number.isInteger(y)&&y>=2026&&y<=2099?y:2026,month:goodMonth(m)?m:0,
   events:Array.isArray(events)?events.filter(e=>e&&e.date&&e.title):[],
   stages:Array.isArray(stages)?stages:[],
   birthdays:Array.isArray(birthdays)?birthdays.filter(e=>e&&e.name&&Number(e.day)>=1&&Number(e.day)<=31&&Number(e.month)>=1&&Number(e.month)<=12):[],
   projects:Array.isArray(projects)?projects:[]};
 };
 const totals=(source)=>{
  const a=normalize(source);
  return MONTHS.map((name,i)=>({name,month:i,
   activities:a.events.filter(e=>inMonth(e,i)).length,
   assessments:a.events.filter(e=>inMonth(e,i)&&/avalia|prova|simulado|sondagem/i.test(e.title+' '+(e.type||''))).length,
   projects:Array.isArray(a.projects?.[i])?a.projects[i].length:0,
   birthdays:a.birthdays.filter(p=>Number(p.month)===i+1).length,
   stages:a.stages.filter(s=>s?.start&&Number(String(s.start).slice(5,7))===i+1).length
  }));
 };
 function yearSummary(source,{selectedMonth=0,compact=false}={}){
  const a=normalize(source),reports=totals(a),all=reports.reduce((o,m)=>({activities:o.activities+m.activities,assessments:o.assessments+m.assessments,projects:o.projects+m.projects}),{activities:0,assessments:0,projects:0});
  const publishedStages=a.stages.filter(x=>x.start&&x.end).length;
  return '<section class="cy-summary" aria-label="Panorama anual de '+a.year+'">'+
    '<div class="cy-summary-heading"><div><small>COLÉGIO CORA CORALINA · EQUIPE PEDAGÓGICA</small><h3>Planejamento anual '+a.year+'</h3><p>Dados aprovados e publicados pela Gestão, de janeiro a dezembro.</p></div><span class="cy-pill">'+publishedStages+'/4 etapas com datas</span></div>'+
    '<div class="cy-summary-stats"><div><strong>'+all.activities+'</strong><small>Atividades</small></div><div><strong>'+all.assessments+'</strong><small>Avaliações</small></div><div><strong>'+all.projects+'</strong><small>Projetos mensais</small></div><div><strong>'+a.birthdays.length+'</strong><small>Aniversariantes</small></div></div>'+
    '<div class="cy-summary-months">'+reports.map((m,i)=>
      '<button class="cy-summary-month '+(i===selectedMonth?'is-selected':'')+'" type="button" data-cp-open-month="'+i+'"><strong>'+esc(m.name)+'</strong>'+
      '<span>'+m.activities+' atividades · '+m.projects+' projetos</span><small>'+m.birthdays+' aniversários · '+m.assessments+' avaliações</small></button>').join('')+'</div>'+
    (!compact?'<div class="cy-summary-stages">'+[1,2,3,4].map(number=>{
      const st=a.stages.find(x=>Number(x.number)===number)||{};
      return '<div class="cy-summary-stage"><b>'+number+'ª etapa</b><span>'+fmt(st.start)+' — '+fmt(st.end)+'</span></div>';
     }).join('')+'</div>':'')+
    (all.activities===0?'<p class="cy-publication-note">Ainda não há atividades pedagógicas publicadas para '+a.year+'. Os aniversários e projetos disponíveis continuam visíveis. A Gestão precisa conferir as datas importadas e publicar o calendário aprovado.</p>':'')+
  '</section>';
 }
 function monthGrid(source,{pdf=false}={}){
  const a=normalize(source),start=new Date(a.year,a.month,1).getDay(),last=new Date(a.year,a.month+1,0).getDate(),
   count=Math.ceil((start+last)/7)*7,monthEvents=a.events.filter(e=>inMonth(e,a.month));
  let days='<div class="cy-weekdays">'+DAYS.map(x=>'<span>'+x+'</span>').join('')+'</div><div class="cy-day-grid">';
  for(let i=0;i<count;i++){
   const d=i-start+1;
   if(d<1||d>last){days+='<div class="cy-day is-out" aria-hidden="true"></div>';continue}
   const date=iso(a.year,a.month,d),ev=monthEvents.filter(e=>e.date===date),
    names=a.birthdays.filter(p=>Number(p.month)===a.month+1&&Number(p.day)===d),
    boundaries=a.stages.flatMap(st=>st.start===date?['Início '+st.number+'ª etapa']:st.end===date?['Fim '+st.number+'ª etapa']:[]);
   const labels=[...boundaries,...ev.map(x=>String(x.title||'')).filter(Boolean),...names.map(x=>'Aniv.: '+x.name)];
   days+='<div class="cy-day'+(labels.length?' has-events':'')+'" aria-label="'+esc(d+' de '+MONTHS[a.month]+': '+(labels.join('; ')||'sem compromissos'))+'">'+
      '<span class="cy-day-num">'+d+'</span>'+
      labels.slice(0,pdf?2:3).map((label,j)=>'<span class="cy-day-item '+(label.startsWith('Aniv.:')?'is-birthday':label.startsWith('Início ')||label.startsWith('Fim ')?'is-stage':'is-event')+'">'+esc(label)+'</span>').join('')+
      (labels.length>(pdf?2:3)?'<small class="cy-extra">+'+(labels.length-(pdf?2:3))+' item(ns)</small>':'')+
    '</div>';
  }
  days+='</div>';
  const events=monthEvents.length,projects=Array.isArray(a.projects?.[a.month])?a.projects[a.month]:[];
  const names=a.birthdays.filter(p=>Number(p.month)===a.month+1);
  return '<section class="cy-month '+(pdf?'is-pdf-preview':'')+'" aria-label="Calendário mensal de '+MONTHS[a.month]+' de '+a.year+'">'+
   '<header class="cy-month-header"><div><small>COLÉGIO CORA CORALINA · CALENDÁRIO ESCOLAR</small><h3>'+MONTHS[a.month]+' '+a.year+'</h3></div><span>'+events+' atividade(s)</span></header>'+
   days+
   '<footer class="cy-month-footer"><div><strong>Projetos do mês</strong>'+ (projects.length?'<ul>'+projects.slice(0,6).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p>Não há projetos publicados.</p>')+'</div>'+
    '<div><strong>Aniversariantes</strong>'+ (names.length?'<ul>'+names.slice(0,10).map(x=>'<li>'+String(x.day).padStart(2,'0')+'/'+String(x.month).padStart(2,'0')+' · '+esc(x.name)+'</li>').join('')+'</ul>':'<p>Não há aniversários neste mês.</p>')+'</div></footer>'+
   '<p class="cy-source-note">Fonte: calendário publicado pela Gestão · '+a.year+'. Datas não publicadas não são exibidas.</p></section>';
 }
 window.CoraTeacherCalendar={yearSummary,monthGrid,totals,normalize};
})();