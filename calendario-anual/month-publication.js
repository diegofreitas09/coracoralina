/* Publicação isolada do mês, mantendo registros já publicados nos outros meses. */
(() => {
 'use strict';
 const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
 const monthOf=e=>Number(String(e?.date||'').slice(5,7))-1;
 function validYearDate(s,year){
  const value=String(s||'');if(!new RegExp('^'+year+'-\\d{2}-\\d{2}$').test(value))return false;
  const [y,m,d]=value.split('-').map(Number),check=new Date(Date.UTC(y,m-1,d));
  return check.getUTCFullYear()===y&&check.getUTCMonth()===m-1&&check.getUTCDate()===d;
 }
 function makePayload({year,month,previous,approved,birthdays=[],projects=[],defaultLeadDays=3}={}){
  const y=Number(year),m=Number(month);
  if(!Number.isInteger(y)||y<2027||y>2099||!Number.isInteger(m)||m<0||m>11)throw Error('Ano e mês inválidos.');
  const chosen=(Array.isArray(approved)?approved:[]).filter(e=>monthOf(e)===m);
  if(!chosen.length)throw Error('Nenhum evento aprovado para publicar neste mês.');
  for(const item of chosen){
   if(!item.id||!String(item.title||'').trim()||!validYearDate(item.date,y)||item.needsReview===true||item.status==='Em revisão')
    throw Error('Há eventos sem data válida ou ainda em revisão. Confira-os antes de publicar.');
  }
  const existing=Array.isArray(previous?.events)?previous.events:[];
  const merged=new Map();
  for(const item of existing){
   if(!item?.id||!validYearDate(item.date,y))throw Error('Há eventos já publicados com dados inconsistentes. Verifique antes de atualizar.');
   merged.set(String(item.id),item);
  }
  for(const item of chosen)merged.set(String(item.id),item);
  const events=[...merged.values()].sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.title).localeCompare(String(b.title),'pt-BR'));
  if(events.length>5000)throw Error('O calendário ultrapassou o limite de eventos.');
  const savedProjects=Array.isArray(previous?.projects)&&previous.projects.length===12?previous.projects:projects;
  return {
   year:y,events,notices:Array.isArray(previous?.notices)?previous.notices:[],
   birthdays:Array.isArray(previous?.birthdays)?previous.birthdays:birthdays,
   stages:Array.isArray(previous?.stages)?previous.stages:[],
   projects:Array.isArray(savedProjects)?savedProjects:[],
   config:{defaultLeadDays:Number(previous?.config?.defaultLeadDays??defaultLeadDays)||3},
   month:m
  };
 }
 function matches(publication,items){
  const saved=new Map((publication?.events||[]).map(e=>[String(e.id||''),e]));
  return items.every(item=>{
   const current=saved.get(String(item.id||''));
   return current?.date===item.date&&current?.title===item.title;
  });
 }
 window.CoraMonthPublication={makePayload,matches,monthOf,MONTHS};
})();