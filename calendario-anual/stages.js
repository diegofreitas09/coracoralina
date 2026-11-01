/* Datas de etapas letivas: informação de referência editável pela Gestão, anual. */
(() => {
 'use strict';
 const BASE=[
  {number:1,start:'2026-01-20',end:'2026-04-17'},
  {number:2,start:'2026-04-20',end:'2026-06-30'},
  {number:3,start:'2026-08-03',end:'2026-09-25'},
  {number:4,start:'2026-10-05',end:'2026-11-27'}
 ];
 const names=['1ª etapa','2ª etapa','3ª etapa','4ª etapa'];
 const $=id=>document.getElementById(id);
 const key=y=>'cora_etapas_'+y+'_v1';
 const year=()=>Number(window.CoraYears?.activeYear)||2026;
 function get(y=year()){
  try{
   const saved=JSON.parse(localStorage.getItem(key(y))||'null');
   if(Array.isArray(saved)&&saved.length===4)return saved.map((x,i)=>({number:i+1,start:String(x.start||''),end:String(x.end||''),needsReview:Boolean(x.needsReview),originYear:Number(x.originYear)||null}));
  }catch{}
  return y===2026?BASE.map(e=>({...e})):names.map((_,i)=>({number:i+1,start:'',end:''}));
 }
 function valid(y,list){
  let previous='';
  for(const item of list){
   if(Boolean(item.start)!==Boolean(item.end))return 'Informe início e fim da '+names[item.number-1]+'.';
   if(item.start&&(!item.start.startsWith(y+'-')||!item.end.startsWith(y+'-')||item.start>item.end))return 'Confira as datas da '+names[item.number-1]+'.';
   if(item.start&&previous&&item.start<=previous)return 'As etapas devem seguir ordem cronológica, sem sobreposição.';
   previous=item.end||previous;
  }
  return '';
 }
 function save(y,list){
  const message=valid(y,list);if(message)return {ok:false,message};
  try{localStorage.setItem(key(y),JSON.stringify(list));window.dispatchEvent(new CustomEvent('cora-stages-updated',{detail:{year:y,stages:list}}));render();return {ok:true}}catch{return {ok:false,message:'Não foi possível salvar neste dispositivo'}}
 }
 function find(date,y=year()){return get(y).find(x=>x.start&&x.end&&date>=x.start&&date<=x.end)||null}
 function monthPeriods(y,month){const prefix=y+'-'+String(month+1).padStart(2,'0');return get(y).filter(e=>e.start.startsWith(prefix)||e.end.startsWith(prefix))}
 function render(){
  const container=$('coraStages');if(!container)return;
  const y=year(),list=get(y),month=Number(window.CoraYears?.month)||0,found=monthPeriods(y,month);
  const fmt=d=>d?d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4):'A definir';
  const choice=container.querySelector('#stageSelector')?.value||'1';
  container.innerHTML='<div class="stage-head"><strong>Etapas letivas · '+y+'</strong><span>'+list.filter(e=>e.start&&e.end).length+'/4 períodos definidos</span></div>'+
   '<div class="stage-timeline">'+list.map(x=>'<div class="stage-period '+(x.start?'':'missing')+(x.needsReview?' pending':'')+'"><b>'+names[x.number-1]+'</b><small>'+fmt(x.start)+' até '+fmt(x.end)+'</small>'+(x.needsReview?'<small class="stage-proposal-note">Sugestão de '+(x.originYear||'ano anterior')+' · validar</small>':'')+'</div>').join('')+'</div>'+
   '<div class="stage-current"><strong>Consulta:</strong> '+(found.length?found.map(x=>names[x.number-1]+' · início '+fmt(x.start)+' · fim '+fmt(x.end)).join(' · '):'Nenhuma mudança de etapa registrada neste mês.')+'</div>'+
   '<div class="stage-edit"><label>Editar etapa <select id="stageSelector">'+list.map(x=>'<option value="'+x.number+'">'+names[x.number-1]+'</option>').join('')+'</select></label>'+
   '<label>Início <input id="stageStart" type="date" min="'+y+'-01-01" max="'+y+'-12-31"></label>'+
   '<label>Fim <input id="stageEnd" type="date" min="'+y+'-01-01" max="'+y+'-12-31"></label>'+
   '<button type="button" class="btn btn-primary" id="stageSave">Conferir e validar etapa</button></div><p class="stage-message" id="stageMessage">Etapas importadas são sugestões. Confira as datas, valide cada etapa e só depois publique para a equipe.</p>';
  const fill=()=>{
   const x=list.find(e=>e.number===Number($('stageSelector').value));
   $('stageStart').value=x?.start||'';$('stageEnd').value=x?.end||'';
  };
  $('stageSelector').value=choice;fill();
  $('stageSelector').addEventListener('change',fill);
  $('stageSave').addEventListener('click',()=>{
   const n=Number($('stageSelector').value);
   const newList=get(y);
   newList[n-1]={number:n,start:$('stageStart').value,end:$('stageEnd').value,needsReview:false,originYear:null};
   const result=save(y,newList);$('stageMessage').textContent=result.ok?'✓ Período salvo. Publique na Gestão para a equipe visualizar.':result.message;
  });
 }
 document.addEventListener('DOMContentLoaded',()=>{
   const host=$('yearProjects');if(!host)return;
   const panel=document.createElement('section');panel.id='coraStages';panel.className='stage-panel';
   host.insertAdjacentElement('afterend',panel);render();
   window.addEventListener('cora-month-changed',()=>render());
   window.addEventListener('cora-year-changed',()=>render());
   window.addEventListener('cora-data-changed',()=>render());
 });
 window.CoraStages={get,save,find,monthPeriods};
})();
