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
 const blank=y=>({year:y,approved:false,source:'Rascunho anual sujeito a validação',items:[1,2,3,4].map(stage=>({stage,due:'',deliveryTypes:'',items:[]}))});
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
  try{localStorage.setItem(KEY(y),JSON.stringify(data));window.dispatchEvent(new CustomEvent('cora-assessments-changed',{detail:{year:y}}));return {ok:true}}
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
  const previous=get(source);
  const data={year:y,approved:false,source:'Referência '+source+' — revisar todas as datas',items:previous.items.map(s=>({
    stage:s.stage,due:s.due?alignWeek(s.due,y):'',deliveryTypes:s.deliveryTypes,
    items:s.items.map(a=>{const start=a.start?alignWeek(a.start,y):'';const duration=Math.round((Date.parse(a.end+'T12:00:00Z')-Date.parse(a.start+'T12:00:00Z'))/86400000);const end=start&&Number.isFinite(duration)?new Date(Date.parse(start+'T12:00:00Z')+duration*86400000).toISOString().slice(0,10):'';return {...a,start,end};})
  }))};
  const result=save(data);
  if(result.ok)render();
  return result;
 }
 function issues(data){
  const y=data.year,out=[];
  const stages=window.CoraStages?.get?.(y)||[];
  if(y>2026&&stages.filter(s=>s.start&&s.end).length<4)out.push('Defina as quatro etapas do ano letivo '+y+' antes de liberar o calendário.');
  for(const r of data.items){
   if(!r.due){out.push('Entrega da '+r.stage+'ª etapa ainda não definida.');continue;}
   if(HOLIDAYS_2027[r.due])out.push('A entrega da '+r.stage+'ª etapa coincide com '+HOLIDAYS_2027[r.due]+' ('+display(r.due)+').');
   for(const a of r.items){
    if(y===2027)for(const d of [a.start,a.end])if(HOLIDAYS_2027[d])out.push(a.title+' coincide com '+HOLIDAYS_2027[d]+' ('+display(d)+').');
    const st=stages.find(s=>Number(s.number)===r.stage);
    if(st?.start&&st?.end&&(a.start<st.start||a.end>st.end))out.push(a.title+' da '+r.stage+'ª etapa ultrapassa os limites ('+display(st.start)+' a '+display(st.end)+').');
   }
  }
  if(y===2027)out.push('Fortaleza sediará jogos da Copa do Mundo Feminina (24/06 a 25/07/2027): ajuste o recesso e o calendário conforme o Parecer CNE/CEB nº 7/2026, homologado pelo MEC.');
  if(y>2026)out.push('Confira feriados municipais, recessos, sábados letivos, carga horária e mínimo legal de 200 dias antes da publicação.');
  return [...new Set(out)];
 }
 function publicationEvents(y=activeYear()){
  const data=get(y);if(!data.approved)return [];
  const result=[];
  for(const row of data.items){
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
 function readForm(){
  const y=activeYear(),data=get(y);
  const cards=[...document.querySelectorAll('#coraAssessmentPanel [data-assessment-stage]')];
  if(cards.length!==4)return null;
  data.items=cards.map(card=>({
   stage:Number(card.dataset.assessmentStage),due:card.querySelector('[data-assessment-due]')?.value||'',
   deliveryTypes:card.querySelector('[data-assessment-types]')?.value?.trim()||'',
   items:[...card.querySelectorAll('[data-assessment-item]')].map(el=>({
    title:el.querySelector('[data-assessment-title]').value.trim(),
    start:el.querySelector('[data-assessment-start]').value,
    end:el.querySelector('[data-assessment-end]').value
   }))
  }));
  data.approved=false;return data;
 }
 function render(){
  const host=document.getElementById('coraAssessmentPanel');if(!host)return;
  const y=activeYear(),d=get(y),alerts=issues(d),count=d.items.filter(x=>x.due).length;
  host.innerHTML='<div class="assess-heading"><div><span class="assess-eyebrow">GESTÃO · PRAZOS PEDAGÓGICOS · '+y+'</span><h2>Entregas e avaliações integradas</h2><p>Datas e janelas de provas por etapa. Edite aqui, salve e depois use <b>Publicar para equipe</b> na Gestão.</p></div><span class="assess-pill '+(d.approved?'is-approved':'')+'">'+(d.approved?'Pronto para publicar':'Em revisão')+'</span></div>'+
  '<div class="assess-summary"><span><b>'+count+'/4</b> entregas definidas</span><span><b>5 dias</b> antecedência do lembrete</span><span><b>'+d.items.reduce((s,r)=>s+r.items.length,0)+'</b> janelas de avaliação</span></div>'+
  '<p class="assess-email-note"><strong>Destinos:</strong> Fundamental: <a href="mailto:'+FUND+'">'+FUND+'</a> · Médio: <a href="mailto:'+MED+'">'+MED+'</a>. O disparo de e-mail não é automático.</p>'+
  '<div class="assess-stage-grid">'+d.items.map(row=>'<article class="assess-stage-card" data-assessment-stage="'+row.stage+'">'+
    '<h3>'+row.stage+'ª etapa</h3><label>Entrega à coordenação<input type="date" data-assessment-due value="'+esc(row.due)+'" min="'+y+'-01-01" max="'+y+'-12-31"></label>'+
    '<label>Avaliações a entregar<input type="text" data-assessment-types value="'+esc(row.deliveryTypes||'')+'" placeholder="AP2, AD, AR"></label>'+
    '<div class="assess-item-list">'+row.items.map(item=>'<div data-assessment-item class="assess-eval-item"><input aria-label="Nome da avaliação" data-assessment-title value="'+esc(item.title)+'" placeholder="Avaliação"><div class="assess-dates"><label>Início<input type="date" data-assessment-start value="'+esc(item.start)+'"></label><label>Fim<input type="date" data-assessment-end value="'+esc(item.end)+'"></label></div><button type="button" data-remove-assessment title="Remover este período">Remover</button></div>').join('')+'</div>'+
    '<button type="button" class="assess-add" data-add-assessment>+ Adicionar avaliação</button></article>').join('')+'</div>'+
  '<div class="assess-notes"><strong>Conferências necessárias</strong><div>'+(alerts.length?alerts.slice(0,12).map(t=>'<p>• '+esc(t)+'</p>').join(''):'<p>Nenhum conflito detectado pelas regras automáticas.</p>')+'</div></div>'+
  '<div class="assess-actions">'+(y>2026?'<button type="button" class="btn btn-outline" id="assessImportYear">Importar 2026 como rascunho</button>':'')+
  '<button type="button" class="btn btn-outline" id="assessSave">Salvar rascunho</button><button type="button" class="btn btn-primary" id="assessApprove">Validar datas e liberar para publicação</button><span role="status" id="assessStatus"></span></div>'+
  '<p class="assess-foot">Importar um ano não substitui a definição do calendário letivo; feriados e recessos mudam. A liberação só envia dados quando a Gestão publicar.</p>';
  const status=message=>{const e=document.getElementById('assessStatus');if(e)e.textContent=message;};
  host.querySelectorAll('[data-add-assessment]').forEach(btn=>btn.onclick=()=>{
   const container=btn.parentElement.querySelector('.assess-item-list');
   const template=document.createElement('div');template.className='assess-eval-item';template.dataset.assessmentItem='';
   template.innerHTML='<input aria-label="Nome da avaliação" data-assessment-title placeholder="Nome da avaliação"><div class="assess-dates"><label>Início<input type="date" data-assessment-start></label><label>Fim<input type="date" data-assessment-end></label></div><button type="button" data-remove-assessment>Remover</button>';
   template.querySelector('[data-remove-assessment]').onclick=()=>template.remove();container.append(template);
  });
  host.querySelectorAll('[data-remove-assessment]').forEach(btn=>btn.onclick=()=>btn.closest('[data-assessment-item]').remove());
  document.getElementById('assessImportYear')?.addEventListener('click',()=>{
    if(!confirm('Importar os prazos de 2026 como um novo rascunho de '+y+'? As datas ainda precisam de validação.'))return;
    const result=draftFrom(y,2026);if(!result.ok)status(result.error);
  });
  document.getElementById('assessSave').onclick=()=>{
   const draft=readForm(),result=draft?save(draft):{ok:false,error:'Formulário incompleto.'};
   if(result.ok){render();const e=document.getElementById('assessStatus');if(e)e.textContent='Rascunho salvo. Falta validar e publicar.'}else status(result.error);
  };
  document.getElementById('assessApprove').onclick=()=>{
   const draft=readForm();if(!draft){status('Formulário incompleto.');return}
   if(y>2026&&(!window.CoraStages?.get?.(y)||window.CoraStages.get(y).some(s=>!s.start||!s.end))){status('Defina e salve primeiro as quatro etapas letivas de '+y+'.');return}
   const result=save(draft);if(!result.ok){status(result.error);return}
   const warnings=issues(draft);
   if(warnings.length&&!confirm('Atenção: '+warnings.length+' conferência(s) pendente(s).\n\n'+warnings.slice(0,4).join('\n')+'\n\nAs datas foram verificadas e aprovadas pela Gestão?')){status('Rascunho salvo, mas não liberado.');return}
   if(!warnings.length&&!confirm('Confirma que as datas de '+y+' foram conferidas no calendário letivo oficial da escola?'))return;
   draft.approved=true;const approved=save(draft);if(approved.ok){render();document.getElementById('assessStatus').textContent='Datas liberadas. Clique em Publicar para equipe na barra superior.'}else status(approved.error);
  };
 }
 document.addEventListener('DOMContentLoaded',()=>{
  const anchor=document.getElementById('coraStages')||document.getElementById('yearProjects');
  if(!anchor)return;
  const section=document.createElement('section');section.id='coraAssessmentPanel';section.className='assess-panel';
  anchor.insertAdjacentElement('afterend',section);render();
  window.addEventListener('cora-year-changed',render);
  window.addEventListener('cora-stages-updated',render);
 });
 window.CoraAssessments={get,save,draftFrom,issues,publicationEvents,display,FUND,MED};
})();