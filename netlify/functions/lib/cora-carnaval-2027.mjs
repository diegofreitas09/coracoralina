/* Regra institucional de Carnaval 2027 — Colégio Cora Coralina.
 * Remove somente a duplicação equivocada de feriados em 15, 16 e 17/02/2027.
 * Preserva eventos legítimos nesses dias e todos os registros dos demais anos.
 */
const BAD_DATES=new Set(['2027-02-15','2027-02-16','2027-02-17']);
const plain=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function isCarnaval2027Duplicate(event){
  if(!event||!BAD_DATES.has(String(event.date||'')))return false;
  const title=plain(event.title);
  const holiday=plain(event.type)==='feriado'||event.holidayManaged===true||
    /(?:sem aula|feriado|ponto facultativo)/.test(title);
  if(!holiday)return false;
  return /carnaval|quarta(?:-feira)? de cinzas/.test(title);
}
export function reconcileCarnaval2027(events,year){
  if(!Array.isArray(events))return {events,removed:[]};
  if(Number(year)!==2027)return {events,removed:[]};
  const removed=events.filter(isCarnaval2027Duplicate);
  if(!removed.length)return {events,removed};
  return {events:events.filter(e=>!isCarnaval2027Duplicate(e)),removed};
}
