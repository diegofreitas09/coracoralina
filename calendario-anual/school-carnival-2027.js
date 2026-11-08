/* Funcionamento escolar confirmado pela Gestão · Colégio Cora Coralina · Carnaval 2027.
 * Trata-se de decisão institucional de calendário, NÃO de uma declaração de feriado
 * nacional ou estadual. Sábado e domingo já não possuem aula regular.
 * O armazenamento e a publicação das decisões formais de 08/09/10 continuam
 * sob o controle do Gestor de Feriados.
 */
(() => {
 'use strict';
 const days=[
  ['2027-02-06','Sem aula','Início do período de Carnaval; sábado sem aulas regulares','fim-de-semana'],
  ['2027-02-07','Sem aula','Domingo; sem aulas regulares','fim-de-semana'],
  ['2027-02-08','Sem aula','Segunda-feira de Carnaval; sem aulas','suspensao'],
  ['2027-02-09','Sem aula','Terça-feira de Carnaval; sem aulas','suspensao'],
  ['2027-02-10','Sem aula','Quarta-feira de Cinzas; sem aulas durante todo o dia','suspensao'],
  ['2027-02-11','Aula normal','Quinta-feira; retorno às atividades escolares','aula'],
  ['2027-02-12','Aula normal','Sexta-feira; aulas regulares','aula'],
  ['2027-02-15','Aula normal','Segunda-feira; aulas regulares, sem Carnaval','aula'],
  ['2027-02-16','Aula normal','Terça-feira; aulas regulares, sem Carnaval','aula'],
  ['2027-02-17','Aula normal','Quarta-feira; aulas regulares, sem Carnaval','aula']
 ];
 const byDate=new Map(days.map(([date,status,description,kind])=>[date,{date,status,description,kind}]));
 const status=date=>byDate.get(String(date))||null;
 const isInvalidLegacy=e=>{
  const date=String(e?.date||'');
  if(!['2027-02-15','2027-02-16','2027-02-17'].includes(date))return false;
  const title=String(e?.title||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return /carnaval|quarta(?:-feira)? de cinzas/.test(title) &&
   (String(e?.type||'').toLowerCase()==='feriado'||
    e?.holidayManaged===true||/sem aula|feriado|ponto facultativo/i.test(title));
 };
 const summary={
  start:'2027-02-06',end:'2027-02-10',returnDate:'2027-02-11',
  regularDays:['2027-02-11','2027-02-12','2027-02-15','2027-02-16','2027-02-17'],
  noClassDays:['2027-02-06','2027-02-07','2027-02-08','2027-02-09','2027-02-10'],
  decision:'Cora Coralina · calendário escolar 2027; não altera a classificação legal dos feriados'
 };
 window.CoraSchoolCarnival2027={days:days.map(([date])=>status(date)),status,isInvalidLegacy,summary};
})();