/* Integridade do Carnaval 2027 no calendário, exportação PDF e visão do professor. */
(() => {
 'use strict';
 const invalid=e=>{
  if(!e||!['2027-02-15','2027-02-16','2027-02-17'].includes(String(e.date||'')))return false;
  const title=String(e.title||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const type=String(e.type||'').toLowerCase();
  if(type!=='feriado'&&e.holidayManaged!==true&&!/sem aula|feriado|ponto facultativo/.test(title))return false;
  return /carnaval|quarta(?:-feira)? de cinzas/.test(title);
 };
 const find=events=>Array.isArray(events)?events.filter(invalid):[];
 const filterEvents=events=>Array.isArray(events)?events.filter(e=>!invalid(e)):events;
 window.CoraCalendarIntegrity={isInvalidCarnaval2027:invalid,find,filterEvents};
})();