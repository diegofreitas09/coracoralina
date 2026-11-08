/* Auditoria cruzada de integração — Gestão, Equipe, calendário, etapas e PDFs.
 * Relatório automático ao consultar publicação autenticada (não consulta senhas).
 * Reparos locais só para duplicações byte-a-byte com cópia de segurança.
 */
(() => {
 'use strict';
 const KEY=year=>'cora_calendario_eventos_'+year+'_v1';
 const LAST=year=>'cora_ultima_auditoria_'+year+'_v1';
 const fmt=date=>/^\d{4}-\d{2}-\d{2}$/.test(String(date||''))?date.slice(8,10)+'/'+date.slice(5,7)+'/'+date.slice(0,4):'—';
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;','\'':'&#39;'}[c]));
 const dateValid=(date,year)=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||''))||!String(date).startsWith(year+'-'))return false;
  const d=new Date(date+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===date;
 };
 const hasDuplicate=(items)=>{
  const seen=new Map(),exact=[],different=[];
  for(const item of Array.isArray(items)?items:[]){
   const id=String(item?.id||'');
   if(!id)continue;
   if(!seen.has(id)){seen.set(id,item);continue;}
   if(JSON.stringify(seen.get(id))===JSON.stringify(item))exact.push(item);
   else different.push(item);
  }
  return {exact,different};
 };
 const canonical=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 function inspect({year,localEvents=[],approved=[],publication=null,stages=[],assessments=null,localBirthdays=[]}={}){
  const y=Number(year),issues=[],warnings=[],pass=[];
  const local=Array.isArray(localEvents)?localEvents:[];
  const ready=Array.isArray(approved)?approved:[];
  const remote=Array.isArray(publication?.events)?publication.events:[];
  const problems=(severity,key,title,detail)=>{
   issues.push({severity,key,title,detail});
  };
  if(!Number.isInteger(y)||y<2026||y>2099){
   problems('critical','year','Ano inválido','Selecione um ano letivo válido.');
   return {year:y,issues,warnings,pass,score:'critical',updatedAt:null,metrics:{}};
  }
  const remoteValid=remote.filter(e=>dateValid(e?.date,y));
  if(!publication){
   problems('warning','publication','Ano ainda sem publicação','A Gestão precisa validar o calendário e publicar para a Equipe Pedagógica.');
  }else if(!dateValid(String(publication.updatedAt||'').slice(0,10),Number(String(publication.updatedAt||'').slice(0,4)))){
   // updatedAt pode ser nulo em arquivos legados; não precisa bloquear o conteúdo.
   warnings.push('A publicação não possui horário verificável; confira a última atualização.');
  }else pass.push('Servidor retornou o calendário publicado do ano letivo.');
  const invalid=remote.filter(e=>!dateValid(e?.date,y));
  if(invalid.length)problems('critical','remote-date','Datas inválidas publicadas',
    invalid.length+' evento(s) têm datas inexistentes ou fora de '+y+'. Corrija antes de republicar.');
  else if(publication)pass.push('Datas publicadas pertencem ao ano selecionado.');
  const dupRemote=hasDuplicate(remote),dupLocal=hasDuplicate(local);
  if(dupRemote.exact.length||dupRemote.different.length)problems('critical','remote-duplicate','IDs duplicados no servidor',
    (dupRemote.exact.length+dupRemote.different.length)+' registro(s) com identificador repetido. Não remova eventos distintos automaticamente.');
  else if(publication)pass.push('Identificadores dos eventos publicados são únicos.');
  if(dupLocal.different.length)problems('warning','local-conflict','Conflitos no calendário deste dispositivo',
    dupLocal.different.length+' IDs locais representam eventos diferentes. A Gestão precisa escolher a versão correta.');
  if(dupLocal.exact.length)problems('warning','local-exact','Cópias idênticas no calendário local',
    dupLocal.exact.length+' cópia(s) repetida(s). É possível eliminar apenas estas com backup, sem alterar o servidor.');
  const carnivalLocal=window.CoraCalendarIntegrity?.find?.(local)||[];
  const carnivalRemote=window.CoraCalendarIntegrity?.find?.(remote)||[];
  if(carnivalRemote.length)problems('critical','carnival-remote','Carnaval incorreto ainda publicado',
    carnivalRemote.length+' data(s) de Carnaval em 15, 16 ou 17/02/2027. O servidor precisa aplicar a correção.');
  else if(y===2027&&publication)pass.push('Carnaval de 2027 não aparece duplicado na publicação.');
  if(carnivalLocal.length)problems('warning','carnival-local','Registros antigos no navegador',
    carnivalLocal.length+' data(s) de Carnaval antigas permanecem no rascunho. Estão ocultas no calendário, mas não devem ser reaprovadas.');
  const byId=new Map(remote.filter(e=>e?.id).map(e=>[String(e.id),e]));
  const absent=[],changed=[];
  for(const event of ready){
   const id=String(event?.id||''),server=byId.get(id);
   if(!id||!dateValid(event.date,y))continue;
   if(!server)absent.push(event);
   else if(server.date!==event.date||server.title!==event.title||server.type!==event.type)changed.push(event);
  }
  if(publication&&(absent.length||changed.length))problems('warning','pending-publication','Gestão e Equipe com diferenças',
   absent.length+' evento(s) aprovados ausentes da publicação e '+changed.length+
   ' com título, data ou categoria alterados. Revise e publique apenas o que estiver aprovado.');
  else if(publication)pass.push('Todos os eventos aprovados neste dispositivo estão publicados com os mesmos títulos e datas.');
  const stageList=Array.isArray(stages)?stages:[];
  const remoteStages=Array.isArray(publication?.stages)?publication.stages:[];
  if(publication&&remoteStages.length!==4)problems('warning','stages','Etapas não sincronizadas',
    'O servidor não recebeu as quatro etapas do ano.');
  if(publication&&stageList.length===4&&remoteStages.length===4){
   const mismatches=stageList.filter((s,i)=>!s.needsReview&&s.start&&s.end&&
    (remoteStages[i]?.start!==s.start||remoteStages[i]?.end!==s.end));
   if(mismatches.length)problems('warning','stages-pending','Limites das etapas diferentes',
     mismatches.length+' etapa(s) validadas neste dispositivo diferem da publicação. Confira antes de republicar.');
   else pass.push('Etapas letivas conferidas com a publicação.');
  }
  const academic=(assessments&&Array.isArray(assessments.items))?assessments.items:[];
  const activeStages=stageList.length===4?stageList:remoteStages;
  const assessmentProblems=[];
  for(const row of academic){
   const stage=activeStages.find(s=>Number(s.number)===Number(row.stage));
   for(const exam of Array.isArray(row.items)?row.items:[]){
    if(!dateValid(exam.start,y)||!dateValid(exam.end,y)||exam.start>exam.end){
     assessmentProblems.push('Datas inválidas em '+row.stage+'ª etapa');continue;
    }
    if(stage?.start&&stage?.end&&(exam.start<stage.start||exam.end>stage.end))
     assessmentProblems.push('Prova fora dos limites da '+row.stage+'ª etapa');
    if(y===2027&&exam.start<='2027-07-25'&&exam.end>='2027-06-24')
     assessmentProblems.push('Prova durante o recesso da Copa Feminina 2027');
   }
  }
  if(assessmentProblems.length)problems('warning','academic-conflicts','Avaliações precisam de revisão',
   [...new Set(assessmentProblems)].join(' · ')+'. Datas de entrega não serão alteradas automaticamente.');
  if(y===2027&&academic.length===4&&
    academic.some(row=>row.items?.length&&row.items.some(x=>x.end>'2027-06-23'&&Number(row.stage)===2)))
   problems('warning','academic-copa','2ª etapa com avaliação após 23/06',
    'Verifique as provas do primeiro semestre e o início do recesso da Copa. Não copie 2026 automaticamente.');
  if(!assessmentProblems.length&&academic.length===4)pass.push('Nenhuma avaliação fora de etapa ou durante o recesso foi identificada nos cadastros locais.');
  const bday=new Set();let repeated=0;
  for(const person of Array.isArray(publication?.birthdays)?publication.birthdays:[]){
   const k=[canonical(person.name),Number(person.day),Number(person.month)].join('|');
   if(bday.has(k))repeated++;bday.add(k);
  }
  if(repeated)problems('warning','birthdays','Aniversariantes duplicados',
    repeated+' repetição(ões) no calendário publicado. Não alterar o cadastro sem validação.');
  const localDuplicates=hasDuplicate(local);
  const info={
   year:y,updatedAt:publication?.updatedAt||null,
   metrics:{local:local.length,approved:ready.length,published:remoteValid.length,
    localDuplicates:localDuplicates.exact.length,changes:changed.length,missing:absent.length,
    publishedBirthdays:(publication?.birthdays||[]).length,stages:remoteStages.filter(s=>s?.start&&s.end).length,
    approvedStages:academic.length?Array.isArray(assessments.approvedStages)?assessments.approvedStages.length:(assessments.approved?4:0):0
   },issues,warnings,pass,
   score:issues.some(x=>x.severity==='critical')?'critical':issues.length?'warning':'ok'
  };
  return info;
 }
 function render(audit){
  if(!audit)return '';
  const issues=audit.issues||[];
  const status=audit.score==='ok'?'Nenhuma divergência encontrada nesta verificação':
   audit.score==='critical'?'Divergência importante detectada':'Pontos que precisam de conferência';
  const tone=audit.score==='ok'?'is-ok':audit.score==='critical'?'is-critical':'is-warning';
  return '<div class="cora-int-header"><strong>Auditoria automática · '+escape(audit.year)+'</strong>'+
   '<span class="'+tone+'">'+escape(status)+'</span></div>'+
   '<div class="cora-int-metrics"><span>Gestão: <b>'+audit.metrics.local+'</b> eventos locais</span>'+
   '<span>Prontos: <b>'+audit.metrics.approved+'</b></span>'+
   '<span>Equipe: <b>'+audit.metrics.published+'</b> publicados</span>'+
   '<span>Etapas: <b>'+audit.metrics.stages+'/4</b> publicadas</span>'+
   '<span>Aniversários: <b>'+audit.metrics.publishedBirthdays+'</b></span></div>'+
   (issues.length?'<ul class="cora-int-issues">'+issues.map(item=>
    '<li class="'+(item.severity==='critical'?'is-critical':'is-warning')+'"><strong>'+escape(item.title)+'</strong><span>'+escape(item.detail)+'</span></li>').join('')+'</ul>':
    '<p class="cora-int-good">Nenhuma inconsistência detectada entre os dados que foi possível comparar.</p>')+
   (audit.warnings.length?'<p class="cora-int-note">'+audit.warnings.map(escape).join(' · ')+'</p>':'')+
   '<div class="cora-int-actions"><button type="button" id="coraAuditRefresh">Reverificar Gestão e Equipe</button>'+
   (audit.metrics.localDuplicates?'<button type="button" id="coraAuditExactFix">Corrigir '+audit.metrics.localDuplicates+' cópia(s) local(is) idêntica(s)</button>':'')+
   '</div><p class="cora-int-note">A comparação utiliza a publicação autenticada. Não executa publicações, não modifica entregas nem inventa datas. Envios push precisam ser testados no aparelho.</p>';
 }
 function repairExact(year){
  const y=Number(year),key=KEY(y);
  if(!Number.isInteger(y)||y<2026||y>2099)return {ok:false,error:'Ano inválido'};
  try{
   const raw=localStorage.getItem(key);
   if(!raw)return {ok:true,removed:0};
   const list=JSON.parse(raw);
   if(!Array.isArray(list))return {ok:false,error:'Formato de eventos inválido'};
   const seen=new Map(),kept=[];
   for(const event of list){
    const id=String(event?.id||'');
    const fingerprint=JSON.stringify(event);
    if(id&&seen.has(id)&&seen.get(id)===fingerprint)continue;
    if(id&&!seen.has(id))seen.set(id,fingerprint);
    kept.push(event);
   }
   const removed=list.length-kept.length;
   if(!removed)return {ok:true,removed:0};
   const backup='cora_integracoes_backup_'+y+'_'+new Date().toISOString().replace(/[:.]/g,'-');
   localStorage.setItem(backup,raw);
   try{localStorage.setItem(key,JSON.stringify(kept))}
   catch(error){localStorage.setItem(key,raw);throw error}
   return {ok:true,removed,backup};
  }catch(error){return {ok:false,error:String(error?.message||error)}}
 }
 function storeReport(report){
  try{localStorage.setItem(LAST(report.year),JSON.stringify({
   at:new Date().toISOString(),status:report.score,issues:report.issues.map(i=>({key:i.key,severity:i.severity}))
  }))}catch{}
 }
 window.CoraIntegrationAudit={inspect,render,repairExact,storeReport,dateValid,hasDuplicate};
})();