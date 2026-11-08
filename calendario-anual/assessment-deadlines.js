/* Prazos pedagógicos plurianuais — Cora Coralina.
 * Base 2026: dois comunicados da coordenação. Novos anos exigem validação humana.
 * O navegador guarda rascunhos; somente "Publicar para equipe" compartilha registros.
 */
(() => {
 'use strict';
 const KEY=y=>'cora_prazos_avaliacoes_'+y+'_v1';
 const FUND='coordenacaofundamentalcora@gmail.com';
 const MED='coordenacaomediocora@gmail.com';
 const SCHOOL='Colégio Cora Coralina';
 const HOLIDAYS_2027={'2027-01-01':'Confraternização Universal','2027-02-08':'Carnaval (ponto facultativo)','2027-02-09':'Carnaval (ponto facultativo)','2027-03-19':'São José','2027-03-25':'Data Magna do Ceará','2027-03-26':'Sexta-feira Santa','2027-04-21':'Tiradentes','2027-05-01':'Dia do Trabalho','2027-05-27':'Corpus Christi (conferir legislação local)','2027-09-07':'Independência','2027-10-12':'Nossa Senhora Aparecida','2027-11-02':'Finados','2027-11-15':'Proclamação da República','2027-11-20':'Consciência Negra','2027-12-25':'Natal'};
 const ORIGINAL=[
  {stage:1,due:'2026-01-05',items:[{title:'Avaliações parciais — AP2',start:'2026-03-02',end:'2026-03-06'},{title:'Avaliações diagnósticas — AD',start:'2026-04-13',end:'2026-04-17'}]},
  {stage:2,due:'2026-03-06',items:[{title:'Avaliações parciais — AP2',start:'2026-05-18',end:'2026-05-22'},{title:'Avaliações diagnósticas — AD',start:'2026-06-22',end:'2026-06-26'}],deliveryTypes:'AP2, AD e Recomposição do 1º semestre'},
  {stage:3,due:'2026-06-29',items:[{title:'Avaliações de recomposição — 1º semestre (AR)',start:'2026-08-24',end:'2026-08-28'},{title:'Avaliações parciais — AP2',start:'2026-09-12',end:'2026-09-18'},{title:'Avaliações diagnósticas — AD',start:'2026-09-28',end:'2026-10-02'}],deliveryTypes:'AD'},
  {stage:4,due:'2026-08-28',items:[{title:'Avaliações parciais — AP2',start:'2026-10-26',end:'2026-10-30'},{title:'Avaliações diagnósticas — AD',start:'2026-11-23',end:'2026-11-27'},{title:'Avaliações de recomposição — 2º semestre (AR)',start:'2026-12-14',end:'2026-12-18'}],deliveryTypes:'AP2, AD e Recomposição do 2º semestre'}
 ];
 ORIGINAL[0].deliveryTypes='AP2 e AD';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
 const iso=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''))?String(s):'';
 const display=date=>iso(date)?date.slice(8,10)+'/'+date.slice(5,7)+'/'+date.slice(0,4):'A definir';
 const activeYear=()=>Number(window.CoraYears?.activeYear)||2026;
 const clone=x=>JSON.parse(JSON.stringify(x));
 const baseline=()=>({year:2026,approved:true,source:'Comunicados pedagógicos de 2026',items:clone(ORIGINAL)});
 const blank=y=>({year:y,approved:false,approvedStages:[],source:'Rascunho anual sujeito a validação',items:[1,2,3,4].map(stage=>({stage,due:'',deliveryTypes:'',items:[]}))});
 // Compatibilidade: as aprovações anuais existentes continuam aprovadas nas quatro etapas.
 function approvedSet(data){
  const original=Array.isArray(data.approvedStages)?data.approvedStages:(data.approved?[1,2,3,4]:[]);
  return new Set(original.map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=4));
 }
 const isStageApproved=(data,number)=>approvedSet(data).has(number);
 let selectedStage=1;
 function get(y=activeYear()){
  try{
   const saved=JSON.parse(localStorage.getItem(KEY(y))||'null');
   if(saved&&Array.isArray(saved.items)&&saved.items.length===4)return saved;
  }catch{}
  return y===2026?baseline():blank(y);
 }
 function save(data){
  const y=Number(data.year);
  if(!Number.isInteger(y)||y<2026||y>2099||!Array.isArray(data.items)||data.items.length!==4)return {ok:false,error:'Ano ou etapas inválidas.'};
  for(const [i,row] of data.items.entries()){
   if(row.stage!==i+1)return {ok:false,error:'Ordem das etapas incorreta.'};
   if(row.due&&(!iso(row.due)||!row.due.startsWith(y+'-')))return {ok:false,error:'Confira a data de entrega da '+(i+1)+'ª etapa.'};
   for(const a of row.items){
    if(!a.title?.trim()||!iso(a.start)||!iso(a.end)||a.start>a.end||!a.start.startsWith(y+'-')||!a.end.startsWith(y+'-'))return {ok:false,error:'Confira o nome e o período das avaliações da '+(i+1)+'ª etapa.'};
   }
  }
  const validStages=approvedSet(data);data.approvedStages=[...validStages].sort((a,b)=>a-b);data.approved=validStages.size===4;
  try{localStorage.setItem(KEY(y),JSON.stringify(data));syncToCalendar(y);window.dispatchEvent(new CustomEvent('cora-assessments-changed',{detail:{year:y}}));return {ok:true}}
  catch{return {ok:false,error:'Não foi possível salvar neste navegador. Faça backup.'}}
 }
 function alignWeek(isoDate,y){
  const [oldY,m,d]=isoDate.split('-').map(Number);
  const old=new Date(Date.UTC(oldY,m-1,d)).getUTCDay();
  const week=Math.ceil(d/7);
  const start=new Date(Date.UTC(y,m-1,1)).getUTCDay();
  let day=1+(old-start+7)%7+7*(week-1);
  const last=new Date(Date.UTC(y,m,0)).getUTCDate();
  if(day>last)day-=7;
  return y+'-'+String(m).padStart(2,'0')+'-'+String(day).padStart(2,'0');
 }
 function draftFrom(y=activeYear(),source=2026){
  if(y<=2026)return {ok:false,error:'O ano-base 2026 não deve ser substituído.'};
  if(y===2027)return {ok:false,error:'O cronograma de 2027 deve seguir o calendário SINEPE-CE/Copa aprovado pela Gestão. Não copie automaticamente provas e entregas de 2026.'};
  const previous=get(source);
  const data={year:y,approved:false,source:'Referência '+source+' — revisar todas as datas',items:previous.items.map(s=>({
    stage:s.stage,due:s.due?alignWeek(s.due,y):'',deliveryTypes:s.deliveryTypes,
    items:s.items.map(a=>{const start=a.start?alignWeek(a.start,y):'';const duration=Math.round((Date.parse(a.end+'T12:00:00Z')-Date.parse(a.start+'T12:00:00Z'))/86400000);const end=start&&Number.isFinite(duration)?new Date(Date.parse(start+'T12:00:00Z')+duration*86400000).toISOString().slice(0,10):'';return {...a,start,end};})
  }))};
  const result=save(data);
  if(result.ok)render();
  return result;
 }
 function issues(data,stageFilter=0){
  const y=data.year,out=[];
  const stages=window.CoraStages?.get?.(y)||[];
  if(y>2026&&(stageFilter?(!stages.some(s=>Number(s.number)===stageFilter&&s.start&&s.end)):stages.filter(s=>s.start&&s.end).length<4))out.push(stageFilter?'Defina o período letivo da '+stageFilter+'ª etapa de '+y+' antes de validar.':'Defina as quatro etapas letivas de '+y+' antes de publicar.');
  for(const r of data.items){
   if(stageFilter&&r.stage!==stageFilter)continue;
   if(!r.due){out.push('Entrega da '+r.stage+'ª etapa ainda não definida.');continue;}
   if(y===2027&&HOLIDAYS_2027[r.due])out.push('A entrega da '+r.stage+'ª etapa coincide com '+HOLIDAYS_2027[r.due]+' ('+display(r.due)+').');
   if(y===2027&&r.due>='2027-06-24'&&r.due<='2027-07-25')out.push('Prazo da '+r.stage+'ª etapa durante a Copa Feminina 2027 ('+display(r.due)+'): revisar recesso escolar.');
   for(const a of r.items){
    if(y===2027){
     const start=new Date(a.start+'T12:00:00Z'),end=new Date(a.end+'T12:00:00Z');
     if(start.getUTCDay()===0||start.getUTCDay()===6)out.push(a.title+' da '+r.stage+'ª etapa começa em fim de semana ('+display(a.start)+').');
     for(let t=start.getTime(),limit=0;Number.isFinite(t)&&t<=end.getTime()&&limit<50;t+=86400000,limit++){
      const d=new Date(t).toISOString().slice(0,10);
      if(HOLIDAYS_2027[d])out.push(a.title+' inclui '+HOLIDAYS_2027[d]+' ('+display(d)+').');
     }
     if(a.start<='2027-07-25'&&a.end>='2027-06-24')out.push(a.title+' ocorre durante a Copa Feminina 2027; ajustar férias e avaliações.');
    }
    const st=stages.find(s=>Number(s.number)===r.stage);
    if(st?.start&&st?.end&&(a.start<st.start||a.end>st.end))out.push(a.title+' da '+r.stage+'ª etapa ultrapassa os limites ('+display(st.start)+' a '+display(st.end)+').');
   }
  }
  if(y===2027&&!stageFilter)out.push('Fortaleza sediará jogos da Copa do Mundo Feminina (24/06 a 25/07/2027): ajuste o recesso e o calendário conforme o Parecer CNE/CEB nº 7/2026, homologado pelo MEC.');
  if(y>2026)out.push('Confira feriados municipais, recessos, sábados letivos, carga horária e mínimo legal de 200 dias antes da publicação.');
  return [...new Set(out)];
 }
 function publicationEvents(y=activeYear()){
  const data=get(y);
  const result=[];
  for(const row of data.items){
   if(!isStageApproved(data,row.stage))continue;
   const label=row.stage+'ª etapa';
   if(row.due)result.push({
    id:'cora-entrega-avaliacoes-'+y+'-'+row.stage,
    date:row.due,title:'Entrega das avaliações à coordenação — '+label,
    type:'Avaliação',status:'Publicado',audience:'Professores',assessmentDelivery:true,
    stageNumber:row.stage,leadDays:5,deliveryTypes:row.deliveryTypes,
    fundamentalEmail:FUND,medioEmail:MED,
    notes:'Prazo de entrega: '+(row.deliveryTypes||'Avaliações')+'. Ensino Fundamental: '+FUND+'. Ensino Médio: '+MED+'. Lembrete 5 dias antes.',
    source:SCHOOL+' · Cronograma pedagógico '+y
   });
   for(const [i,item] of row.items.entries()){
    const base='cora-periodo-avaliacao-'+y+'-'+row.stage+'-'+i;
    result.push({
     id:base+'-inicio',date:item.start,title:'Início: '+item.title+' — '+label,
     type:'Avaliação',status:'Publicado',audience:'Professores',assessmentWindow:true,stageNumber:row.stage,
     notes:'Período: '+display(item.start)+' a '+display(item.end),source:SCHOOL+' · Cronograma pedagógico '+y
    });
    if(item.end!==item.start)result.push({
     id:base+'-fim',date:item.end,title:'Fim: '+item.title+' — '+label,
     type:'Avaliação',status:'Publicado',audience:'Professores',assessmentWindow:true,stageNumber:row.stage,
     notes:'Período: '+display(item.start)+' a '+display(item.end),source:SCHOOL+' · Cronograma pedagógico '+y
    });
   }
  }
  return result;
 }
 function syncToCalendar(y=activeYear()){
  // Evita duplicar os períodos já registrados no PDF oficial de 2026.
  const approved=publicationEvents(y).filter(e=>y!==2026||e.assessmentDelivery);
  const key='cora_calendario_eventos_'+y+'_v1';
  let existing=[];try{existing=JSON.parse(localStorage.getItem(key)||'[]')}catch{}
  if(!Array.isArray(existing))existing=[];
  const clean=existing.filter(e=>!/^cora-(entrega-avaliacoes|periodo-avaliacao)-/.test(String(e.id||'')));
  const next=clean.concat(approved);
  if(JSON.stringify(next)!==JSON.stringify(existing)){
   try{localStorage.setItem(key,JSON.stringify(next));window.dispatchEvent(new CustomEvent('cora-data-changed',{detail:{year:y}}));}catch{}
  }
 }

 function selectedCard(){
  const y=activeYear(),data=get(y),row=data.items[selectedStage-1],valid=isStageApproved(data,selectedStage);
  if(!row)return '';
  const alertItems=issues(data,selectedStage);
  const windows=row.items.map((item,i)=>'<div data-assessment-item class="assess-eval-item">'+
   '<div class="assess-eval-title"><span class="assess-eval-index">'+String(i+1).padStart(2,'0')+'</span>'+
   '<input aria-label="Nome da avaliação '+(i+1)+'" data-assessment-title value="'+esc(item.title)+'" placeholder="Nome da avaliação"></div>'+
   '<div class="assess-dates"><label>Início<input type="date" data-assessment-start value="'+esc(item.start)+'" min="'+y+'-01-01" max="'+y+'-12-31"></label>'+
   '<label>Fim<input type="date" data-assessment-end value="'+esc(item.end)+'" min="'+y+'-01-01" max="'+y+'-12-31"></label></div>'+
   '<button type="button" data-remove-assessment>Remover avaliação</button></div>').join('');
  return '<div class="assess-stage-detail" data-assessment-stage="'+selectedStage+'">'+
   '<div class="assess-stage-title"><div><span class="assess-eyebrow">ETAPA SELECIONADA</span><h3>'+selectedStage+'ª etapa · '+y+'</h3></div>'+
   '<span class="assess-pill '+(valid?'is-approved':'')+'">'+(valid?'Validada':'A validar')+'</span></div>'+
   '<div class="assess-primary-fields"><label>Data de entrega à coordenação<input type="date" data-assessment-due value="'+esc(row.due)+'" min="'+y+'-01-01" max="'+y+'-12-31"></label>'+
   '<label>Avaliações que devem ser entregues<input type="text" data-assessment-types value="'+esc(row.deliveryTypes||'')+'" placeholder="AP2, AD, AR"></label></div>'+
   '<details class="assess-windows" id="assessWindows" '+(row.items.length===0?'open':'')+'><summary>Períodos de avaliações <span>'+row.items.length+' registrado(s)</span></summary>'+
   '<div class="assess-item-list">'+windows+'</div><button type="button" class="assess-add" data-add-assessment>+ Adicionar avaliação</button></details>'+
   '<div class="assess-notes"><strong>Conferência desta etapa</strong><div>'+
     (alertItems.length?alertItems.slice(0,9).map(t=>'<p>• '+esc(t)+'</p>').join(''):'<p>Nenhum conflito automático identificado para a etapa selecionada.</p>')+
   '</div></div></div>';
 }
 function readSelected(){
  const host=document.getElementById('coraAssessmentPanel');
  const card=host?.querySelector('[data-assessment-stage]');
  if(!card)return null;
  return {stage:selectedStage,due:card.querySelector('[data-assessment-due]')?.value||'',
    deliveryTypes:card.querySelector('[data-assessment-types]')?.value?.trim()||'',
    items:[...card.querySelectorAll('[data-assessment-item]')].map(el=>({
     title:el.querySelector('[data-assessment-title]')?.value?.trim()||'',
     start:el.querySelector('[data-assessment-start]')?.value||'',
     end:el.querySelector('[data-assessment-end]')?.value||''
    }))
  };
 }
 function saveSelected(){
  const y=activeYear(),data=get(y),next=readSelected();
  if(!next)return {ok:false,error:'Etapa não encontrada.'};
  if(JSON.stringify(data.items[selectedStage-1])===JSON.stringify(next))return {ok:true,changed:false};
  data.items[selectedStage-1]=next;
  const approved=approvedSet(data);approved.delete(selectedStage);
  data.approvedStages=[...approved];data.approved=false;
  const result=save(data);
  return {...result,changed:Boolean(result.ok)};
 }
 function render(){
  const host=document.getElementById('coraAssessmentPanel');if(!host)return;
  const y=activeYear(),data=get(y),valid=approvedSet(data),defined=data.items.filter(x=>x.due).length;
  host.innerHTML='<div class="assess-heading"><div><span class="assess-eyebrow">GESTÃO · PRAZOS PEDAGÓGICOS · '+y+'</span>'+
   '<h2>Entregas e avaliações</h2><p>Selecione uma etapa para conferir suas datas e validar individualmente.</p></div>'+
   '<span class="assess-pill '+(valid.size===4?'is-approved':'')+'">'+valid.size+'/4 validadas</span></div>'+
   '<div class="assess-summary"><span><b>'+defined+'/4</b> entregas definidas</span><span><b>5 dias</b> de antecedência</span></div>'+
   '<div class="assess-picker"><label for="assessStageSelect">Escolher etapa letiva</label><select id="assessStageSelect" aria-label="Selecionar etapa para editar e validar">'+
   data.items.map(row=>'<option value="'+row.stage+'" '+(row.stage===selectedStage?'selected':'')+'>'+row.stage+'ª etapa'+
    (isStageApproved(data,row.stage)?' · validada':' · revisar')+'</option>').join('')+'</select>'+
   '<div class="assess-stage-progress" aria-label="Situação das quatro etapas">'+data.items.map(row=>
    '<span class="'+(isStageApproved(data,row.stage)?'done':'')+(selectedStage===row.stage?' selected':'')+'">'+row.stage+'ª '+(isStageApproved(data,row.stage)?'✓':'○')+'</span>').join('')+'</div></div>'+
   selectedCard()+
   '<div class="assess-actions">'+(y>2027?'<button type="button" class="btn btn-outline" id="assessImportYear">Importar 2026 como rascunho</button>':'')+
   '<button type="button" class="btn btn-outline" id="assessSave">Salvar esta etapa</button>'+
   '<button type="button" class="btn btn-primary" id="assessApprove">Validar '+selectedStage+'ª etapa</button></div>'+
   '<p class="assess-feedback" id="assessStatus" role="status" aria-live="polite"></p>'+
   '<div class="assess-email-note"><strong>Coordenação:</strong> Fundamental <a href="mailto:'+FUND+'">'+FUND+'</a> · Médio <a href="mailto:'+MED+'">'+MED+'</a>.</div>'+
   '<p class="assess-foot">A validação é individual. Para compartilhar as datas aprovadas, clique em <b>Publicar para equipe</b> na barra superior da Gestão. Os e-mails não são enviados automaticamente.</p>';
  const status=message=>{const e=document.getElementById('assessStatus');if(e)e.textContent=message;};
  const picker=document.getElementById('assessStageSelect');
  picker.addEventListener('change',()=>{
    const next=Number(picker.value),saved=saveSelected();
    if(!saved.ok){picker.value=String(selectedStage);status(saved.error||'Confira as datas antes de mudar de etapa.');return}
    selectedStage=next;render();
    if(saved.changed)status('Alterações da etapa anterior salvas como rascunho. Valide-a antes de publicar.');
  });
  host.querySelectorAll('[data-assessment-due],[data-assessment-types],[data-assessment-title],[data-assessment-start],[data-assessment-end]').forEach(el=>{
   el.addEventListener('input',()=>status('Alterações ainda não salvas. Ao trocar de etapa, o rascunho será salvo automaticamente.'));
  });
  const add=host.querySelector('[data-add-assessment]');
  add?.addEventListener('click',()=>{
   const list=host.querySelector('.assess-item-list'),item=document.createElement('div');
   item.className='assess-eval-item';item.dataset.assessmentItem='';
   item.innerHTML='<div class="assess-eval-title"><span class="assess-eval-index">+</span><input aria-label="Nome da avaliação" data-assessment-title placeholder="Nome da avaliação"></div>'+
    '<div class="assess-dates"><label>Início<input type="date" data-assessment-start min="'+y+'-01-01" max="'+y+'-12-31"></label>'+
    '<label>Fim<input type="date" data-assessment-end min="'+y+'-01-01" max="'+y+'-12-31"></label></div>'+
    '<button type="button" data-remove-assessment>Remover avaliação</button>';
   list.append(item);status('Preencha as datas da avaliação adicionada.');item.querySelector('[data-assessment-title]')?.focus();
  });
  host.onclick=event=>{
    const btn=event.target.closest('[data-remove-assessment]');
    if(!btn||!host.contains(btn))return;
    btn.closest('[data-assessment-item]')?.remove();
    status('Avaliação removida do formulário. Salve a etapa para confirmar.');
  };
  document.getElementById('assessImportYear')?.addEventListener('click',()=>{
   if(!confirm('Importar os prazos de 2026 como rascunho de '+y+'? Os dados deste ano ainda precisarão de validação por etapa.'))return;
   const result=draftFrom(y,2026);if(!result.ok)status(result.error);
  });
  document.getElementById('assessSave').addEventListener('click',()=>{
   const result=saveSelected();
   if(!result.ok){status(result.error);return}
   const message=result.changed?'Rascunho da '+selectedStage+'ª etapa salvo. Valide para liberá-la.':'Nenhuma alteração pendente nesta etapa.';
   const opened=Boolean(document.getElementById('assessWindows')?.open);
   render();document.getElementById('assessWindows').open=opened;status(message);
  });
  document.getElementById('assessApprove').addEventListener('click',()=>{
   const initial=saveSelected();if(!initial.ok){status(initial.error);return}
   const data=get(y),row=data.items[selectedStage-1];
   if(!row.due||!row.deliveryTypes||!row.items.length){status('Preencha a entrega, os tipos de prova e pelo menos um período de avaliação.');return}
   if(y>2026){const st=window.CoraStages?.get?.(y)?.find(x=>Number(x.number)===selectedStage);if(!st?.start||!st?.end||st.needsReview){status('Confira e valide primeiro o início e o fim da '+selectedStage+'ª etapa letiva.');return}}
   if(y===2027){
    const st=window.CoraStages?.get?.(y)?.find(x=>Number(x.number)===selectedStage);
    const out=row.items.filter(a=>
     a.start<st.start||a.end>st.end||
     a.start<='2027-07-25'&&a.end>='2027-06-24'
    );
    if(out.length){
     status('Validação bloqueada: '+out.length+' período(s) de prova fora da etapa ou durante o recesso da Copa Feminina. Corrija as avaliações, sem alterar as datas de entrega.');
     return;
    }
   }
   const warnings=issues(data,selectedStage);
   const question=warnings.length?'Esta etapa possui '+warnings.length+' conferência(s):\n\n'+warnings.slice(0,5).join('\n')+'\n\nVocê conferiu e aprova as datas desta etapa?':
     'Confirma que o prazo de entrega e as avaliações da '+selectedStage+'ª etapa de '+y+' estão corretos?';
   if(!confirm(question)){status('Etapa salva como rascunho, sem nova validação.');return}
   const approvals=approvedSet(data);approvals.add(selectedStage);
   data.approvedStages=[...approvals];data.approved=approvals.size===4;
   const result=save(data);
   if(!result.ok){status(result.error);return}
   render();status('✓ '+selectedStage+'ª etapa validada. Publique na Gestão para a equipe visualizar.');
  });
 }
 document.addEventListener('DOMContentLoaded',()=>{
  const anchor=document.getElementById('coraStages')||document.getElementById('yearProjects');
  if(!anchor)return;
  const section=document.createElement('section');section.id='coraAssessmentPanel';section.className='assess-panel';
  anchor.insertAdjacentElement('afterend',section);syncToCalendar(activeYear());render();
  window.addEventListener('cora-year-changed',()=>{selectedStage=1;syncToCalendar(activeYear());render()});
  window.addEventListener('cora-stages-updated',render);
 });
 window.CoraAssessments={get,save,draftFrom,issues,publicationEvents,isStageApproved,display,FUND,MED};
})();