/* Replanejamento pedagógico Cora 2027 — referência SINEPE-CE e ExpoCora 2026.
   Atualiza somente datas das etapas e janelas de avaliações após confirmação local.
   Preserva integralmente as entregas e exige validação/publicação posteriores. */
(()=>{
 'use strict';
 const YEAR=2027, ASSESS_KEY='cora_prazos_avaliacoes_2027_v1',EVENTS_KEY='cora_calendario_eventos_2027_v1';
 const BACKUP_KEY='cora_replanejamento_pedagogico_2027_backups_v1';
 const $=(s,r=document)=>r.querySelector(s),json=x=>JSON.parse(JSON.stringify(x));
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=x=>x?String(x).slice(8,10)+'/'+String(x).slice(5,7):'—';
 const STAGES=[
  {number:1,start:'2027-01-18',end:'2027-04-02'},
  {number:2,start:'2027-04-05',end:'2027-06-23'},
  {number:3,start:'2027-07-26',end:'2027-10-01'},
  {number:4,start:'2027-10-04',end:'2027-11-30'}
 ];
 const WINDOWS=[
  [{kind:'AP2',title:'Avaliações parciais — AP2',start:'2027-03-01',end:'2027-03-05'},
   {kind:'AD',title:'Avaliações diagnósticas — AD',start:'2027-03-22',end:'2027-03-24'}],
  [{kind:'AP2',title:'Avaliações parciais — AP2',start:'2027-05-17',end:'2027-05-21'},
   {kind:'AD',title:'Avaliações diagnósticas — AD',start:'2027-06-14',end:'2027-06-18'}],
  [{kind:'AR',title:'Avaliações de recomposição — 1º semestre (AR)',start:'2027-08-16',end:'2027-08-20'},
   {kind:'AP2',title:'Avaliações parciais — AP2',start:'2027-08-30',end:'2027-09-03'},
   {kind:'AD',title:'Avaliações diagnósticas — AD',start:'2027-09-20',end:'2027-09-24'}],
  [{kind:'AP2',title:'Avaliações parciais — AP2',start:'2027-10-25',end:'2027-10-29'},
   {kind:'AR',title:'Avaliações de recomposição — 2º semestre (AR)',start:'2027-11-08',end:'2027-11-12'},
   {kind:'AD',title:'Avaliações diagnósticas — AD',start:'2027-11-22',end:'2027-11-26'}]
 ];
 // Conjunto da ExpoCora: mesmo formato pedagógico de 2026, deslocado para 11 a 16/09/2027.
 const FAIR=[
  {date:'2027-09-11',title:'ExpoCora 2027 — abertura e apresentações artísticas',type:'Evento',
   notes:'Sábado de abertura da Feira Cultural com apresentações artísticas. Horários e equipes sujeitos à definição da Gestão. A convocação docente exige avaliação da CCT e das jornadas.'},
  {date:'2027-09-13',title:'ExpoCora 2027 — organização das salas',type:'Pedagógico',
   notes:'Segunda-feira dedicada à organização dos espaços, trabalhos e ambientes para as apresentações da Feira Cultural.'},
  {date:'2027-09-14',title:'ExpoCora 2027 — exposição para as famílias (1º dia)',type:'Evento',
   notes:'Terça-feira de exposições e apresentação dos trabalhos para pais e responsáveis.'},
  {date:'2027-09-15',title:'ExpoCora 2027 — exposição para as famílias (2º dia)',type:'Evento',
   notes:'Quarta-feira de exposições e apresentação dos trabalhos para pais, responsáveis e convidados.'},
  {date:'2027-09-16',title:'ExpoCora 2027 — jogos do Ensino Fundamental (manhã)',type:'Evento',
   notes:'Quinta-feira, pela manhã: jogos do Ensino Fundamental. Não haverá aulas regulares nesse turno; haverá atividade escolar programada. A Gestão deve definir turmas, frequência, servidores e escalas.'},
  {date:'2027-09-16',title:'ExpoCora 2027 — resultado e encerramento',type:'Evento',
   notes:'Quinta-feira: divulgação dos resultados e encerramento da Feira Cultural. Horário a confirmar pela Gestão.'}
 ];
 const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v===null?fallback:v}catch{return fallback;}};
 const currentYear=()=>Number(window.CoraYears?.activeYear||2026);
 const normalized=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const kind=s=>{const t=normalized(s);if(/\bap2\b|avaliac(ao|oes) parciais/.test(t))return 'AP2';
   if(/\bad\b|diagnostic/.test(t))return 'AD';
   if(/\bar\b|recomposic|recuperac/.test(t))return 'AR';
   return null;};
 const isWeekend=x=>[0,6].includes(new Date(String(x)+'T12:00:00Z').getUTCDay());
 const HOLIDAYS=new Set(['2027-03-19','2027-03-25','2027-03-26','2027-04-21','2027-09-07','2027-10-12','2027-11-02','2027-11-15']);
 function allDates(start,end){const a=[],d=new Date(start+'T12:00:00Z'),last=new Date(end+'T12:00:00Z');
   for(let i=0;d<=last&&i<100;i++,d.setUTCDate(d.getUTCDate()+1))a.push(d.toISOString().slice(0,10));
   return a;}
 function validatePlan(stages=STAGES,windows=WINDOWS){
   const issues=[];
   if(stages.length!==4||windows.length!==4)issues.push('A proposta deve conter quatro etapas.');
   for(let i=0;i<Math.min(stages.length,windows.length);i++){
     const stage=stages[i],arr=windows[i],prev=stages[i-1];
     if(prev&&prev.end>=stage.start)issues.push('Sobreposição entre etapas '+i+' e '+(i+1));
     for(const entry of arr){
       if(entry.start<stage.start||entry.end>stage.end||entry.start>entry.end)issues.push(entry.kind+' fora da '+stage.number+'ª etapa.');
       for(const d of allDates(entry.start,entry.end)){
         if(isWeekend(d))issues.push(entry.kind+' da '+stage.number+'ª etapa inclui fim de semana: '+d);
         if(HOLIDAYS.has(d))issues.push(entry.kind+' da '+stage.number+'ª etapa inclui feriado: '+d);
         if(d>='2027-06-24'&&d<='2027-07-25')issues.push(entry.kind+' da '+stage.number+'ª etapa no recesso da Copa: '+d);
         if(d>='2027-09-11'&&d<='2027-09-16')issues.push(entry.kind+' da '+stage.number+'ª etapa conflita com a ExpoCora: '+d);
       }
     }
   }
   return [...new Set(issues)];
 }
 function mergeAssessment(existing){
   const data=json(existing);
   if(!Array.isArray(data.items)||data.items.length!==4)throw Error('Cadastro de avaliações incompleto.');
   const warnings=[];
   for(const [i,row] of data.items.entries()){
     const old=Array.isArray(row.items)?row.items:[];
     const known=new Map();
     const extra=[];
     for(const item of old){
       const k=kind(item.title);
       if(k&&!known.has(k))known.set(k,item);
       else extra.push(item);
     }
     row.items=WINDOWS[i].map(w=>({title:known.get(w.kind)?.title||w.title,start:w.start,end:w.end}));
     if(extra.length){
       row.items.push(...extra);
       warnings.push('A '+(i+1)+'ª etapa tem '+extra.length+' avaliação(ões) específica(s) preservada(s) e que precisam de revisão manual.');
     }
   }
   data.approved=false;data.approvedStages=[];
   data.source='Proposta SINEPE-CE 2027 / replanejamento Cora — avaliações pendentes de validação';
   return {data,warnings};
 }
 function fairImported(e){
   const title=normalized(e.title);
   return e?.originYear===2026||String(e?.id||'').startsWith('carry-2027-2026-')
     ? /expocora|exposicao cultural|interclasse fundamental|reorganizacao interna|organizacao interna/.test(title) &&
       String(e?.date||'')>='2027-09-11'&&String(e?.date||'')<='2027-09-17' : false;
 }
 function proposedFair(before){
   if(!Array.isArray(before))throw Error('Eventos do calendário estão indisponíveis neste navegador.');
   const old=before.filter(e=>fairImported(e));
   const kept=before.filter(e=>!fairImported(e));
   const incoming=[];
   for(let i=0;i<FAIR.length;i++){
     const event=FAIR[i],id='cora-expocora-2027-'+String(i+1).padStart(2,'0');
     if(kept.some(e=>String(e.id)===id)){continue;}
     incoming.push({...event,id,status:'Em revisão',needsReview:true,
       audience:'Todos',source:'ExpoCora 2027 · proposta da Gestão com referência no calendário institucional 2026'});
   }
   return {events:kept.concat(incoming),removed:old.length,created:incoming.length};
 }
 let host=null;
 const area=()=>$('#cora2027Replan',host);
 const status=s=>{const e=$('#cora2027ReplanStatus',area());if(e)e.textContent=s};
 const layout=()=>{
   if(!area())return;
   const show=currentYear()===YEAR;area().hidden=!show;
   if(!show)return;
   const existing=window.CoraStages?.get?.(YEAR)||[],data=window.CoraAssessments?.get?.(YEAR);
   const counts=data?.items?.map(x=>x.items?.length||0)||[];
   const stageMismatch=STAGES.filter((s,i)=>existing[i]?.start!==s.start||existing[i]?.end!==s.end);
   const checks=validatePlan();
   $('#cora2027ReplanRows',area()).innerHTML=STAGES.map((s,i)=>'<tr><th>'+s.number+'ª</th><td>'+fmt(s.start)+'–'+fmt(s.end)+'</td><td>'+
     WINDOWS[i].map(w=>'<span class="cora-2027-window"><b>'+esc(w.kind)+'</b> '+fmt(w.start)+'–'+fmt(w.end)+'</span>').join('')+
     '</td><td>'+esc(data?.items?.[i]?.due||'').replace(/^(\d{4})-(\d{2})-(\d{2})$/,'$3/$2/$1').replace(/^$/,'Ainda não cadastrada')+
     '</td></tr>').join('');
   $('#cora2027ReplanNote',area()).textContent=stageMismatch.length
     ?'Há '+stageMismatch.length+' etapa(s) com limites diferentes do modelo SINEPE. A aplicação vai deixá-las EM REVISÃO, sem publicação automática.'
     :'Os limites das etapas coincidem com o modelo SINEPE. Janelas novas continuarão em revisão.';
   $('#cora2027ReplanExtra',area()).textContent='Períodos anteriores: '+counts.join(' + ')+
    '. Semana anterior à 1ª etapa: 22 a 24/03 (apenas 3 dias letivos disponíveis; 25/03 e 26/03 não entram). As entregas existentes serão mantidas exatamente como estão.';
   $('#cora2027ReplanApply',area()).disabled=Boolean(checks.length);
   if(checks.length)status('Conflitos na proposta: '+checks.join(' | '));
 };
 const backup=()=>{
   const old=read(BACKUP_KEY,[]),snapshot={at:new Date().toISOString(),year:YEAR,
     stages:window.CoraStages.get(YEAR),assessments:window.CoraAssessments.get(YEAR),
     fairEvents:read(EVENTS_KEY,[])};
   const next=Array.isArray(old)?old.slice(-4):[];
   next.push(snapshot);localStorage.setItem(BACKUP_KEY,JSON.stringify(next));
   return snapshot;
 };
 function applyAssessments(){
   if(currentYear()!==YEAR)return;
   const stageSource=window.CoraSinepe2027?.STAGES;
   if(!Array.isArray(stageSource)||stageSource.length!==4){status('Modelo SINEPE não disponível. Não foi feita nenhuma alteração.');return;}
   if(validatePlan().length){status('Proposta contém conflito e não pode ser aplicada.');return;}
   const original=window.CoraAssessments?.get?.(YEAR),current=window.CoraStages?.get?.(YEAR);
   if(!original||!Array.isArray(current)||current.length!==4){status('Cadastros indisponíveis. Nenhum dado alterado.');return;}
   const {data,warnings}=mergeAssessment(original);
   const oldDues=original.items.map(r=>r.due),newDues=data.items.map(r=>r.due);
   if(JSON.stringify(oldDues)!==JSON.stringify(newDues))throw Error('A proposta tentou modificar datas de entrega.');
   const changed=STAGES.filter((s,i)=>s.start!==current[i].start||s.end!==current[i].end).length;
   const message='AJUSTAR O CALENDÁRIO DE 2027?\n\n'+
    '• Adequar '+changed+' limite(s) de etapa(s) ao modelo SINEPE-CE;\n'+
    '• Definir as janelas de AP2, AD e AR conforme a prévia;\n'+
    '• PRESERVAR exatamente todas as datas de entrega à coordenação;\n'+
    '• Voltar todas as quatro avaliações para EM REVISÃO até validação da Gestão.\n\n'+
    'Atenção: atividades já publicadas para os professores não serão alteradas até nova publicação. Confirmar?';
   if(!confirm(message))return;
   let snapshot;
   try{
     snapshot=backup();
     const nextStages=current.map((s,i)=>{
       const ref=STAGES[i],different=s.start!==ref.start||s.end!==ref.end;
       return different?{number:i+1,start:ref.start,end:ref.end,needsReview:true,originYear:YEAR}:s;
     });
     const st=window.CoraStages.save(YEAR,nextStages);
     if(!st.ok)throw Error(st.message||'Não foi possível salvar os limites das etapas.');
     const saved=window.CoraAssessments.save(data);
     if(!saved.ok){
       window.CoraStages.save(YEAR,snapshot.stages);
       throw Error(saved.error||'Não foi possível salvar as avaliações. As etapas originais foram restauradas.');
     }
     window.dispatchEvent(new CustomEvent('cora-data-changed',{detail:{year:YEAR,source:'2027-assessments-replan'}}));
     window.dispatchEvent(new CustomEvent('cora-2027-planning-updated',{detail:{year:YEAR}}));
     layout();window.CoraAssessments?.display?.();
     status('Proposta de avaliações salva EM REVISÃO. Entregas preservadas. '+(warnings.join(' ')||'Valide as quatro etapas e as janelas antes de publicar.'));
   }catch(e){status('Não foi possível salvar: '+String(e.message||e)+'. Confira o backup da Gestão.');}
 }
 function applyFair(){
   if(currentYear()!==YEAR)return;
   const old=read(EVENTS_KEY,[]);
   if(!Array.isArray(old)){status('Armazenamento do calendário inválido. Restaure o backup antes de alterar.');return;}
   const proposed=proposedFair(old);
   if(!proposed.created&&!proposed.removed){status('A ExpoCora já está cadastrada neste navegador. Confira os eventos em revisão.');return;}
   if(!confirm('ORGANIZAR A EXPOCORA 2027 DE 11 A 16/09?\n\n'+
    '• Sábado, dia 11: abertura artística;\n• Segunda, dia 13: organização de salas;\n'+
    '• Terça e quarta, dias 14 e 15: exposições às famílias;\n'+
    '• Quinta, dia 16: jogos do Fundamental pela manhã, sem aulas regulares nesse turno; resultado e encerramento.\n\n'+
    'Substituir '+proposed.removed+' evento(s) antigos importados de 2026, mantendo os demais registros? Os novos eventos ficarão EM REVISÃO.'))return;
   try{
     backup();
     localStorage.setItem(EVENTS_KEY,JSON.stringify(proposed.events));
     window.dispatchEvent(new CustomEvent('cora-events-updated',{detail:{year:YEAR,source:'expocora-2027'}}));
     window.dispatchEvent(new CustomEvent('cora-data-changed',{detail:{year:YEAR,source:'expocora-2027'}}));
     status('ExpoCora 2027 organizada: '+proposed.created+' evento(s) em revisão; '+proposed.removed+
      ' importação(ões) antigas removida(s) somente deste dispositivo. Valide e publique para atualizar a Equipe.');
   }catch(e){status('Não foi possível salvar a ExpoCora: '+String(e.message||e));}
 }
 function init(){
   const anchor=document.getElementById('coraAssessmentPanel');if(!anchor||document.getElementById('cora2027Replan'))return;
   host=anchor.parentElement;
   const node=document.createElement('section');node.id='cora2027Replan';node.className='cora-2027-replan assess-panel';
   node.innerHTML='<div class="cora-2027-replan-heading"><div><small>2027 • MODELO SINEPE-CE / REFERÊNCIA EXPOCORA 2026</small>'+
    '<h2>Reorganização das avaliações e Feira Cultural</h2><p>Proposta para as quatro etapas, com encerramento das avaliações antes das férias da Copa. As datas de entrega permanecem intocadas.</p></div></div>'+
    '<div class="cora-2027-table-wrap"><table><thead><tr><th>Etapa</th><th>Limites</th><th>Janelas de avaliação propostas</th><th>Entrega atual (preservada)</th></tr></thead><tbody id="cora2027ReplanRows"></tbody></table></div>'+
    '<div class="cora-2027-message" id="cora2027ReplanNote"></div><p class="cora-2027-message" id="cora2027ReplanExtra"></p>'+
    '<div class="cora-2027-actions"><button type="button" id="cora2027ReplanApply">Aplicar janelas de avaliações 2027</button></div>'+
    '<h3>ExpoCora 2027 · 11 a 16 de setembro</h3>'+
    '<ol class="cora-2027-fair">'+FAIR.map(e=>'<li><b>'+fmt(e.date)+'</b> '+esc(e.title)+'</li>').join('')+'</ol>'+
    '<div class="cora-2027-actions"><button type="button" id="cora2027FairApply">Organizar Feira Cultural 2027</button></div>'+
    '<p class="cora-2027-message">As datas geradas ficam em revisão e só chegam à Equipe após a publicação administrativa. Sábados e jogos exigem conferência das escalas, da jornada e do registro dos dias letivos.</p>'+
    '<p id="cora2027ReplanStatus" role="status" aria-live="polite"></p>';
   anchor.insertAdjacentElement('beforebegin',node);
   $('#cora2027ReplanApply',node).addEventListener('click',applyAssessments);
   $('#cora2027FairApply',node).addEventListener('click',applyFair);
   for(const event of ['cora-year-changed','cora-stages-updated','cora-assessments-changed'])
     window.addEventListener(event,layout);
   layout();
 }
 document.addEventListener('DOMContentLoaded',init);
 window.CoraAcademic2027={STAGES,WINDOWS,FAIR,validatePlan,mergeAssessment,proposedFair,kind};
})();