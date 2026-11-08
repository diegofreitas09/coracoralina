/* Diagnóstico de integrações Cora Coralina: Gestão ↔ publicação ↔ Equipe.
 * Somente leitura. Não publica, apaga nem modifica registros pedagógicos.
 * A verificação roda com uma resposta autenticada da API, sem expor dados pessoais.
 */
(() => {
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const date=y=>/^\d{4}-\d{2}-\d{2}$/.test(String(y||''))&&new Date(y+'T12:00:00Z').toISOString().slice(0,10)===y;
 const groupYear=(value,y)=>Number(String(value||'').slice(0,4))===Number(y);
 const dateFmt=v=>date(v)?v.slice(8,10)+'/'+v.slice(5,7)+'/'+v.slice(0,4):'Não informado';
 const keyOf=e=>String(e?.id||'');
 const publishedStatus=e=>e?.status!=='Em revisão'&&e?.needsReview!==true;
 function analyze({year,publication,localEvents=[],role='equipe',now=new Date().toISOString()}={}){
  const y=Number(year)||2026,issues=[],records=Array.isArray(publication?.events)?publication.events:[],
   stages=Array.isArray(publication?.stages)?publication.stages:[],
   events=records.filter(e=>e&&groupYear(e.date,y)),ids=new Map();
  const add=(level,title,detail,code)=>issues.push({level,title,detail,code});
  if(!publication){
   add('attention','Ano ainda não publicado','A equipe não recebe atividades deste ano até a Gestão publicar o calendário.','not-published');
  }else{
   const invalidDates=records.filter(e=>!e||!date(e.date)||!groupYear(e.date,y));
   if(invalidDates.length)add('error','Datas inválidas na publicação',invalidDates.length+' registro(s) com data vazia, impossível ou de outro ano.','invalid-date');
   for(const e of events){
    const id=keyOf(e);
    if(!id){add('error','Atividade sem identificador','A publicação contém um evento sem ID.','missing-id');continue;}
    ids.set(id,(ids.get(id)||0)+1);
   }
   const duplicateIds=[...ids].filter(([,n])=>n>1);
   if(duplicateIds.length)add('error','Eventos duplicados',duplicateIds.length+' ID(s) repetidos na publicação.','duplicate-id');
   const unreviewed=events.filter(e=>!publishedStatus(e));
   if(unreviewed.length)add('error','Rascunhos divulgados',unreviewed.length+' item(ns) em revisão aparecem na publicação.','unreviewed');
   const invalidCarnaval=events.filter(e=>window.CoraCalendarIntegrity?.isInvalidCarnaval2027?.(e));
   if(invalidCarnaval.length)add('error','Carnaval em datas incorretas',invalidCarnaval.length+' ocorrência(s) de 15, 16 ou 17/02/2027 precisam ser retiradas.','carnaval');
   const invalidStages=stages.filter(s=>Boolean(s.start)!==Boolean(s.end)||(s.start&&s.end&&(!date(s.start)||!date(s.end)||s.start>s.end||!groupYear(s.start,y)||!groupYear(s.end,y))));
   if(invalidStages.length)add('error','Etapas com limites inválidos',invalidStages.length+' etapa(s) com início ou fim inconsistentes.','stages');
   if(y===2027){
    const outside=events.filter(e=>{
     if(!/cora-periodo-avaliacao-|^cora-simulado-sae-/.test(keyOf(e))&&!e.assessmentWindow)return false;
     if(e.assessmentDelivery)return false;
     return e.date>='2027-06-24'&&e.date<='2027-07-25';
    });
    if(outside.length)add('attention','Avaliações no recesso da Copa',outside.length+' registro(s) de avaliações entre 24/06 e 25/07/2027. Confira com a coordenação.','copa');
    const adStages=new Set(events.filter(e=>/diagnostic|\bad\b/.test(norm(e.title))&&
       (/cora-periodo-avaliacao-/.test(keyOf(e))||e.assessmentWindow)).map(e=>{
        const id=keyOf(e).match(/^cora-periodo-avaliacao-2027-([1-4])-/);
        return Number(e.stageNumber)||Number(id?.[1])||null;
       }).filter(Boolean));
    const simStages=new Set(events.filter(e=>/^cora-simulado-sae-2027-[1-4]$/.test(keyOf(e))).map(e=>Number(keyOf(e).slice(-1))));
    const missing=[...adStages].filter(n=>!simStages.has(n));
    if(missing.length)add('attention','Simulado SAE ainda não publicado','AD cadastrada na(s) etapa(s) '+missing.join(', ')+' sem Simulado SAE na publicação.','sae');
   }
   if(role==='gestao'&&Array.isArray(localEvents)){
    const approved=localEvents.filter(e=>e&&publishedStatus(e)&&groupYear(e.date,y) && !window.CoraCalendarIntegrity?.isInvalidCarnaval2027?.(e));
    const current=new Map(events.map(e=>[keyOf(e),e]));
    const altered=approved.filter(e=>{
     const saved=current.get(keyOf(e));
     return saved&&(saved.date!==e.date||saved.title!==e.title||saved.type!==e.type);
    });
    const notPublished=approved.filter(e=>!current.has(keyOf(e)));
    if(altered.length||notPublished.length)add('attention','Alterações da Gestão ainda não publicadas',
      altered.length+' registro(s) alterados e '+notPublished.length+' não publicados neste dispositivo. Confirme antes de sincronizar.','pending-local');
   }
  }
  const errors=issues.filter(i=>i.level==='error').length,attention=issues.filter(i=>i.level==='attention').length;
  return {year:y,role,connected:Boolean(publication),updatedAt:publication?.updatedAt||'',
   checkedAt:now,events:events.length,stages:stages.filter(s=>s.start&&s.end).length,
   issues,errors,attention,status:errors?'error':attention?'attention':'ok'};
 }
 const panels=new Map();
 const statusLabel=v=>v==='error'?'Erros detectados':v==='attention'?'Atenção necessária':'Integração sem falhas detectadas';
 const statusText=v=>v==='error'?'Os dados exigem revisão da Gestão.':v==='attention'?'Alguns itens precisam de conferência.':'Os dados publicados passaram nas verificações disponíveis.';
 function render(data){
  const target=panels.get(data.role);
  if(!target)return;
  target.className='cora-integration-audit '+(data.status==='error'?'has-error':data.status==='attention'?'has-warning':'is-ok');
  const when=data.updatedAt&&Number.isFinite(Date.parse(data.updatedAt))?new Date(data.updatedAt).toLocaleString('pt-BR'):'Ainda não publicado';
  target.innerHTML='<div class="cora-audit-title"><div><small>INTEGRAÇÃO GESTÃO ↔ EQUIPE</small>'+
   '<h3>'+esc(statusLabel(data.status))+'</h3><p>'+esc(statusText(data.status))+'</p></div>'+
   '<span class="cora-audit-pill">'+(data.status==='ok'?'Verificado':data.errors+' erro(s) · '+data.attention+' aviso(s)')+'</span></div>'+
   '<div class="cora-audit-stat"><span>Dados publicados: <b>'+data.events+' atividades</b></span>'+
   '<span>Ano: <b>'+data.year+'</b></span><span>Etapas definidas: <b>'+data.stages+'/4</b></span></div>'+
   (data.issues.length?'<ul class="cora-audit-issues">'+data.issues.map(issue=>
    '<li class="'+(issue.level==='error'?'is-error':'is-warning')+'"><strong>'+esc(issue.title)+'</strong><small>'+esc(issue.detail)+'</small></li>').join('')+'</ul>':'')+
   '<p class="cora-audit-meta">Última publicação: '+esc(when)+
   ' · Verificação automática enquanto o app estiver aberto. Os registros não são modificados por esta auditoria.</p>';
 }
 function mount(role,host){
  if(!host||!['gestao','equipe'].includes(role))return null;
  const id='coraIntegrationAudit-'+role;
  let element=host.querySelector('#'+id);
  if(!element){
   element=document.createElement('section');
   element.id=id;element.className='cora-integration-audit';element.setAttribute('aria-label','Situação da integração do calendário');
   element.innerHTML='<p>Conferindo dados publicados da Gestão...</p>';
   const anchor=role==='gestao'?host.querySelector('#cpYearSync'):host.querySelector('#cpWelcome');
   if(anchor)anchor.insertAdjacentElement('afterend',element);
   else host.prepend(element);
  }
  panels.set(role,element);return element;
 }
 function failed(role,year,error){
  const target=panels.get(role);
  if(!target)return;
  const msg=error?.status===401?'A sessão expirou. Entre novamente.':'Não foi possível consultar a publicação. Verifique a conexão e use Atualizar.';
  target.className='cora-integration-audit has-error';
  target.innerHTML='<h3>Sincronização não verificada</h3><p>'+esc(msg)+'</p><small>Ano '+Number(year)+' · Sem confirmação de atualização.</small>';
 }
 const update=args=>{const data=analyze(args);render(data);return data;};
 window.CoraIntegrationAudit={mount,analyze,update,failed};
})();