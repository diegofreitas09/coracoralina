/* Integridade do calendário escolar — feriados móveis.
 * Detecta cópias inválidas de um ano anterior no calendário, sem excluir dados persistidos.
 * O filtro é usado na Gestão, Equipe e nos PDFs. A exclusão definitiva permanece auditável
 * e depende de confirmação administrativa na página de Feriados.
 */
(() => {
 'use strict';
 const isoDate=(iso,offset=0)=>{
  const d=new Date(String(iso)+'T12:00:00Z');
  if(!Number.isFinite(d.getTime()))return '';
  d.setUTCDate(d.getUTCDate()+offset);
  return d.toISOString().slice(0,10);
 };
 const easter=y=>{
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),
    f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),
    h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),
    k=c%4,l=(32+2*(b%4)+2*i-h-k+7)%7,
    m=Math.floor((a+11*h+22*l)/451),n=h+l-7*m+114,
    month=Math.floor(n/31),day=n%31+1;
  return String(y)+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
 };
 const normalized=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function check(event){
  const date=String(event?.date||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
  const year=Number(date.slice(0,4));
  if(year<2026||year>2099)return null;
  const title=normalized(event?.title);
  const type=normalized(event?.type);
  // Não confundir bailinhos, apresentações e projetos com feriados.
  const holiday=type==='feriado'||event?.holidayManaged===true||
    /^(?:sem aula|feriado|ponto facultativo|feriado antecipado)\s*[—:-]/.test(title);
  if(!holiday)return null;
  const pascoa=easter(year);
  let valid=[],label='';
  if(/quarta(?:-feira)? de cinzas/.test(title)){
   valid=[isoDate(pascoa,-46)];label='Quarta-feira de Cinzas';
  } else if(/carnaval/.test(title)){
   valid=[isoDate(pascoa,-48),isoDate(pascoa,-47)];
   label='Carnaval (segunda e terça-feira)';
   if(/segunda(?:-feira)?/.test(title))valid=[valid[0]];
   else if(/terca(?:-feira)?/.test(title))valid=[valid[1]];
  } else if(/corpus christi/.test(title)){
   valid=[isoDate(pascoa,60)];label='Corpus Christi';
  } else if(/sexta-feira santa|sexta-feira da paixao|paixao de cristo/.test(title)){
   valid=[isoDate(pascoa,-2)];label='Sexta-feira da Paixão';
  } else if(/pascoa/.test(title)){
   valid=[pascoa];label='Páscoa';
  } else return null;
  if(valid.includes(date))return null;
  // Antecipações autorizadas requerem verificação humana em vez de ocultação.
  if(event.holidayManaged&&event.holidayDecision==='antecipado')return null;
  return {id:String(event.id||''),date,title:String(event.title||''),year,kind:label,
   expectedDates:valid,source:String(event.source||''),reason:'Feriado móvel fora da data calculada para o ano'};
 }
 const find=events=>(Array.isArray(events)?events:[]).map(check).filter(Boolean);
 const filterEvents=events=>{
  if(!Array.isArray(events))return events;
  return events.filter(e=>check(e)===null);
 };
 const report=events=>({invalid:find(events),valid:filterEvents(events)});
 window.CoraCalendarIntegrity={easter,check,find,filterEvents,report};
})();
