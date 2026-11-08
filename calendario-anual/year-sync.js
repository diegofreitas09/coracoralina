/* Auditoria segura: compara a Gestão local com o que foi publicado para cada mês. */
(() => {
 'use strict';
 const months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
 const inMonth=(v,i)=>Number(String(v?.date||'').slice(5,7))===i+1;
 const evKey=v=>[v.id,v.date,v.title,v.type,v.notes,v.time,v.place,v.mode,v.audience,v.deliveryTypes,v.holidayDecision].map(x=>String(x??'').trim()).join('|');
 const stringList=v=>Array.isArray(v)?v.map(s=>String(s||'').trim()).filter(Boolean):[];
 const projectKey=v=>JSON.stringify(stringList(v).slice().sort());
 const bKey=v=>[String(v.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase(),Number(v.day),Number(v.month)].join('|');
 const birthdays=v=>Array.isArray(v)?v.filter(x=>x&&x.name&&Number(x.day)>=1&&Number(x.day)<=31&&Number(x.month)>=1&&Number(x.month)<=12):[];
 const equalEvents=(a,b)=>{
  const clean=x=>(Array.isArray(x)?x:[]).map(evKey).sort().join('\n');
  return clean(a)===clean(b);
 };
 function compare({year,drafts=[],approved=[],publication=null,projects=[],birthdaysLocal=[],stages=[]}){
  const visible=events=>window.CoraCalendarIntegrity?.filterEvents?.(events)||events||[];
  const published=visible(publication?.events||[]),localApproved=visible(approved),publishedProjects=publication?.projects||[],
   birthdaysPublished=birthdays(publication?.birthdays),localBirthdays=birthdays(birthdaysLocal);
  const hasPublished=Boolean(publication);
  const monthsReport=months.map((name,i)=>{
   const localReady=localApproved.filter(v=>inMonth(v,i)),publicEvents=published.filter(v=>inMonth(v,i));
   const pending=drafts.filter(v=>inMonth(v,i)&&(v.status==='Em revisão'||v.needsReview===true));
   const localP=stringList(projects?.[i]),publishedP=stringList(publishedProjects?.[i]);
   const localB=localBirthdays.filter(v=>Number(v.month)===i+1);
   const publishedB=birthdaysPublished.filter(v=>Number(v.month)===i+1);
   const sameBirthdays=localB.map(bKey).sort().join('\n')===publishedB.map(bKey).sort().join('\n');
   const stagesPending=(Array.isArray(stages)?stages:[]).filter(st=>st?.needsReview&&
      (Number(String(st.start||'').slice(5,7))===i+1||Number(String(st.end||'').slice(5,7))===i+1)).length;
   const localStage=(Array.isArray(stages)?stages:[]).filter(st=>
      Number(String(st.start||'').slice(5,7))===i+1||Number(String(st.end||'').slice(5,7))===i+1);
   const publishedStage=Array.isArray(publication?.stages)?publication.stages:[];
   const stageChanges=localStage.filter(st=>{
     const server=publishedStage.find(x=>Number(x.number)===Number(st.number));
     return !st.needsReview&&Boolean(st.start&&st.end)&&Boolean(server)&&
       (st.start!==server.start||st.end!==server.end);
   }).length;
   const changed=hasPublished&&(
    !equalEvents(localReady,publicEvents)||projectKey(localP)!==projectKey(publishedP)||!sameBirthdays||stageChanges>0);
   const noAcademicActivities=!localReady.length&&!publicEvents.length&&!localP.length&&!publishedP.length;
   const status=!hasPublished?'Não publicado':pending.length||stagesPending?'Em revisão':
    changed?'Atualização pendente':noAcademicActivities?'Sem atividades pedagógicas':'Sincronizado';
   return {name,month:i,ready:localReady.length,published:publicEvents.length,
    pending:pending.length,projects:localP.length,publishedProjects:publishedP.length,
    birthdays:localB.length,publishedBirthdays:publishedB.length,stagesPending,stageChanges,changed,status};
  });
  return {year:Number(year),hasPublished,updatedAt:publication?.updatedAt||null,
   months:monthsReport,counts:{
    synchronized:monthsReport.filter(m=>m.status==='Sincronizado').length,
    empty:monthsReport.filter(m=>m.status==='Sem atividades pedagógicas').length,
    pending:monthsReport.filter(m=>m.status==='Em revisão').length,
    stale:monthsReport.filter(m=>m.status==='Atualização pendente').length,
    unpublished:monthsReport.filter(m=>m.status==='Não publicado').length
   }};
 }
 window.CoraYearSync={compare,months};
})();
