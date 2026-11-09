/* Interface integrada de Roteiros — Gestão e Equipe Pedagógica. */
(() => {
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))?v.slice(8,10)+'/'+v.slice(5,7)+'/'+v.slice(0,4):'A definir';
 const unique=(a)=>[...new Set(a)];
 const inst=new WeakMap();
 const types=['AP2','AD','AR','SONDAGEM','2ª CHAMADA','SIMULADO SAE','OUTRA'];
 const opt=(items,chosen,placeholder='Selecione')=>'<option value="">'+esc(placeholder)+'</option>'+items.map(s=>'<option '+(s===chosen?'selected ':'')+'value="'+esc(s)+'">'+esc(s)+'</option>').join('');
 const label=(name,value,type='text',required=false)=>'<label>'+esc(name)+'<input name="'+esc(value)+'" type="'+type+'" '+(required?'required ':'')+'maxlength="180"></label>';
 const blank=()=>({book:'',unit:'',chapter:'',theme:'',pages:''});
 const idFor=x=>[x.stage,String(x.assessment).toUpperCase(),String(x.grade).toUpperCase(),String(x.subject).toUpperCase()].join('|');
 const byDate=(a,b)=>a.date.localeCompare(b.date)||a.grade.localeCompare(b.grade,'pt-BR')||(a.order||0)-(b.order||0);
 const safeFileName=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'_').replace(/^_+|_+$/g,'').slice(0,70);
 const sourceUrl='https://docs.google.com/spreadsheets/d/1Jiy-g9kC7BJ6lR5Hh5cfgBJSAHmdZDS2BwjqIr0WOOc/edit';
 function currentGrade(s){return s.grade||s.types?.grades?.[10]||'6º ano'}
 function gradeOptions(s){return opt(s.types?.grades||[],currentGrade(s))}
 function subjectList(s){return s.types?.subjectsByGrade?.[currentGrade(s)]||[]}
 function currentSubject(s){return subjectList(s).includes(s.subject)?s.subject:subjectList(s)[0]||''}
 const stageSelect=stage=>[1,2,3,4].map(n=>'<option '+(Number(stage)===n?'selected ':'')+'value="'+n+'">'+n+'ª etapa</option>').join('');
 function api(s,body,params=''){return s.api('roteiros',body,'year='+s.year+(params?'&'+params:''))}
 async function fetchData(s){const answer=await api(s,undefined);
  s.types=answer.types;s.profileSegments=answer.profileSegments||[];s.people=answer.people||[];s.assignments=answer.assignments||[];s.documents=answer.documents||[];
  s.plans=answer.plans||[];s.scheduleRevision=answer.scheduleRevision||'';if(!s.planId&&s.plans.length)s.planId=s.plans[0].id;s.schedule=answer.schedule||[];s.composite=answer.composite||[];s.loaded=true;
  s.templates=answer.templates||[];s.teacherLinks=answer.teacherLinks||[];
  s.canvaReport=answer.canvaReport||null;s.canvaSource=answer.canvaSource||null;
  if(!s.grade)s.grade=s.role==='equipe'&&s.assignments.length?s.assignments[0].grade:'6º ano';
  s.subject=currentSubject(s);
 }
 function statusBadge(status){
  const txt={rascunho:'Rascunho',enviado:'Aguardando Gestão',aprovado:'Aprovado',devolvido:'Devolvido',
   'referencia-historica':'Referência 2026','modelo-canva-pendente':'Modelo Canva para revisar'}[status]||'Não iniciado';
  return '<span class="cr-status '+esc(status||'')+'">'+esc(txt)+'</span>';
 }
 const alert=s=>s.message?'<div class="cr-feedback" role="status">'+esc(s.message)+'</div>':'';
 function header(s){return '<header class="cr-heading"><div><small>COLÉGIO CORA CORALINA · '+(s.role==='gestao'?'GESTÃO':'EQUIPE PEDAGÓGICA')+'</small>'+
   '<h2>Roteiros das avaliações</h2><p>Livro → Unidade → Capítulo → Temas → Páginas. Organização anual integrada.</p></div>'+
   '<label class="cr-year">Ano do roteiro<select id="crWorkYear">'+opt(Array.from({length:10},(_,i)=>String(2026+i)),String(s.year))+'</select></label></header>'}
 function selectedSegments(s){
  if(s.selfSegments)return s.selfSegments;
  const config=s.types.segments||{};
  return unique([...s.profileSegments.filter(x=>config[x]),...Object.keys(config).filter(segment=>s.assignments.some(x=>config[segment].includes(x.grade)))]);
 }
 function selfAssignmentForm(s){
  const items=s.selfPending||s.assignments,config=s.types.segments||{},selected=selectedSegments(s);
  return '<section class="cr-card"><h3>Meus segmentos, turmas e disciplinas · '+s.year+'</h3><p>Os segmentos cadastrados no seu perfil já aparecem marcados. Você pode atuar em mais de um segmento e em disciplinas diferentes.</p>'+
   '<fieldset class="cr-segments"><legend>1. Em quais segmentos você leciona?</legend>'+Object.keys(config).map(segment=>'<label><input type="checkbox" data-self-segment="'+esc(segment)+'" '+(selected.includes(segment)?'checked':'')+'> '+esc(segment)+'</label>').join('')+'</fieldset>'+
   selected.map(segment=>{
    const chosen=(s.selfGrades||{})[segment]||[],subjects=chosen.length?(s.types.subjectsByGrade[chosen[0]]||[]).filter(subject=>chosen.every(grade=>(s.types.subjectsByGrade[grade]||[]).includes(subject))):[];
    return '<fieldset class="cr-segments"><legend>'+esc(segment)+'</legend><p>2. Marque uma ou mais turmas para esta disciplina.</p>'+config[segment].map(grade=>'<label><input type="checkbox" data-self-grade="'+esc(grade)+'" data-segment="'+esc(segment)+'" '+(chosen.includes(grade)?'checked':'')+'> '+esc(grade)+'</label>').join('')+
     '<label>3. Disciplina dessas turmas<select data-self-subject="'+esc(segment)+'">'+opt(subjects,(s.selfSubjects||{})[segment]||subjects[0],chosen.length?'Escolha a disciplina':'Selecione as turmas primeiro')+'</select></label>'+
     '<p class="cr-help">A lista mostra as disciplinas disponíveis nas turmas marcadas. Para outra disciplina, escolha suas respectivas turmas e adicione novamente.</p><button type="button" class="cr-btn" data-self-add="'+esc(segment)+'" '+(!chosen.length?'disabled':'')+'>Adicionar disciplina às turmas marcadas</button></fieldset>';
   }).join('')+
   '<h4>Minhas atribuições</h4><div>'+items.map((x,i)=>'<p>'+esc(x.grade)+' · '+esc(x.subject)+' <button type="button" data-self-remove="'+i+'">Retirar</button></p>').join('')+'</div>'+
   '<button type="button" id="crSelfSave" class="cr-btn primary">Confirmar segmentos, turmas e carregar roteiros</button></section>';
 }
 function teacherForm(s){
  const grades=unique(s.assignments.map(x=>x.grade)),chosen=grades.includes(s.grade)?s.grade:grades[0];
  if(!chosen)return '<div class="cr-empty"><strong>Você ainda não possui turmas e disciplinas vinculadas.</strong><p>Cadastre suas séries e disciplinas acima para começar.</p></div>';
  s.grade=chosen;
  const subs=unique(s.assignments.filter(a=>a.grade===chosen).map(a=>a.subject)),subject=subs.includes(s.subject)?s.subject:subs[0];s.subject=subject;
  const id=idFor({grade:chosen,subject,assessment:s.assessment||'AP2',stage:s.stage||1});
  const doc=s.documents.find(x=>idFor(x)===id)||null;
  const template=s.templates.find(x=>idFor(x)===id)||null;
  const parts=s.editorParts||doc?.blocks||[blank()];
  const original=s.editorSourceText??doc?.sourceText??template?.rawText??'';
  const list=s.documents.slice().sort((a,b)=>Number(a.stage)-Number(b.stage)||a.grade.localeCompare(b.grade));
  return '<div class="cr-grid"><section class="cr-card"><h3>Verificar e editar roteiro</h3><p class="cr-help">Os roteiros do ano anterior e do acervo Canva são referências para revisão. Escolha a etapa, o modelo da prova e confira o texto antes de enviar. Os campos abaixo permitem detalhar livro, unidade, capítulo, temas e páginas.</p>'+
   '<div class="cr-actions">'+[1,2,3,4].map(n=>'<button type="button" data-choose-stage="'+n+'" class="cr-btn '+(Number(s.stage)===n?'primary':'')+'">'+n+'ª etapa</button>').join('')+'</div><form id="crEditorForm"><div class="cr-fields">'+
   '<label>Série/turma<select id="crGrade">'+opt(grades,chosen)+'</select></label>'+
   '<label>Disciplina<select id="crSubject">'+opt(subs,subject)+'</select></label>'+
   '<label>Etapa<select id="crStage">'+stageSelect(s.stage||1)+'</select></label>'+
   '<label>Modelo de avaliação<select id="crAssessment">'+opt(s.types?.tests||types,s.assessment||'AP2')+'</select></label></div>'+
   '<div class="cr-canva-source"><div class="cr-source-heading"><strong>Roteiro original do Canva</strong>'+
   (template?'<small>Referência de '+(template.sourceYear||template.year||2026)+(template.sourcePage?' · página '+template.sourcePage:'')+' · revisar para '+s.year+'</small>':
    '<small>Não há modelo preenchido do Canva para esta combinação. Comece um roteiro novo.</small>')+
   '</div><label>Texto completo para conferência e edição<textarea id="crCanvaText" rows="9" maxlength="9000" placeholder="O roteiro do Canva aparecerá aqui quando existir nesta etapa e disciplina.">'+esc(original)+'</textarea></label>'+
   '<p>Não é necessário reescrever o texto. Confira e ajuste o roteiro herdado; ele não será enviado automaticamente.</p></div>'+
   '<div class="cr-editor-title"><h4>Detalhamento por unidade/capítulo (opcional para o texto original revisado)</h4><button type="button" class="cr-small" id="crAddBlock">+ Acrescentar capítulo</button></div>'+
   '<div id="crBlocks">'+parts.map((b,i)=>'<fieldset class="cr-block"><legend>Item '+(i+1)+'</legend>'+
   '<label>1. Livro ou material didático<input name="book" maxlength="100" value="'+esc(b.book)+'" placeholder="Ex.: Livro 1 · SAE Digital"></label>'+
   '<label>2. Unidade<input name="unit" maxlength="160" value="'+esc(b.unit)+'" placeholder="Ex.: Unidade 2 — Ciências humanas"></label>'+
   '<label>3. Capítulo<input name="chapter" maxlength="180" value="'+esc(b.chapter)+'" placeholder="Ex.: Capítulo 3 — O mundo moderno"></label>'+
   '<label>4. Temas e assuntos<textarea name="theme" maxlength="900" rows="3" placeholder="Escreva os conteúdos, habilidades e orientações para estudar.">'+esc(b.theme)+'</textarea></label>'+
   '<label>5. Páginas<input name="pages" maxlength="150" value="'+esc(b.pages)+'" placeholder="Ex.: páginas 18 a 26; exercícios 1 a 8"></label>'+
   '<button class="cr-remove" type="button" data-remove-block="'+i+'">Remover este item</button></fieldset>').join('')+'</div>'+
   '<label>Observação adicional (opcional)<textarea name="instructions" id="crInstructions" rows="2" maxlength="1800">'+esc(s.editorInstructions??doc?.instructions??'')+'</textarea></label>'+
   '<label class="cr-source-confirm"><input type="checkbox" id="crConfirmCanva"> Conferi o conteúdo, as páginas e a etapa e autorizo o envio deste roteiro à Gestão.</label>'+
   '<div class="cr-actions"><button class="cr-btn" id="crSaveDraft" type="submit" data-submit-status="rascunho">Salvar rascunho</button>'+
   '<button class="cr-btn primary" type="submit" data-submit-status="enviado">Enviar para Gestão</button></div>'+
   '<p class="cr-help">Status atual: '+statusBadge(doc?.status||(template?'modelo-canva-pendente':''))+
   ' · O conteúdo do Canva é uma proposta de roteiro até o professor salvar, enviar e a Gestão aprovar.</p></form>'+
   '<div class="cr-source"><button type="button" id="crLoadLegacy" class="cr-small">Consultar modelo histórico de 2026</button>'+
   '<p>A referência antiga não substitui o conteúdo revisado. A autoria de 2026 não está identificada na planilha.</p><div id="crLegacyView"></div></div></section>'+
   '<section class="cr-card"><h3>Meus roteiros</h3><div class="cr-mini-list">'+(list.length?list.map(x=>
    '<div><strong>'+esc(x.grade)+' · '+esc(x.subject)+'</strong><small>'+x.stage+'ª etapa · '+esc(x.assessment)+' · '+fmt(x.updatedAt?.slice(0,10))+'</small>'+statusBadge(x.status)+'</div>').join(''):'<p>Nenhum roteiro salvo. Comece pelo formulário.</p>')+
    '</div><div class="cr-notice">A Coordenação recebe automaticamente o roteiro enviado. Se precisar fazer ajustes depois da aprovação, solicite a devolução pela Gestão.</div></section></div>';
 }
 function activePlan(s){return (s.plans||[]).find(p=>p.id===s.planId)}
 function planRows(s){return (s.composite||[]).filter(r=>r.planId===s.planId)}
 function planDays(start,end){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start||'')||!/^\d{4}-\d{2}-\d{2}$/.test(end||'')||end<start)return [];
  const dates=[];for(let d=Date.parse(start+'T12:00:00Z');d<=Date.parse(end+'T12:00:00Z')&&dates.length<62;d+=86400000)dates.push(new Date(d).toISOString().slice(0,10));return dates;
 }
 function planBuilder(s){
  const d=s.planDraft;
  const selection='<section class="cr-card"><div class="cr-actions"><h3>Cronogramas por série</h3><button id="crNewPlan" class="cr-btn primary">Criar novo roteiro</button></div><label>Roteiro em acompanhamento<select id="crPlanSelect">'+
   '<option value="">Selecione</option>'+(s.plans||[]).map(p=>'<option value="'+esc(p.id)+'" '+(p.id===s.planId?'selected':'')+'>'+esc(p.grade+' · '+p.assessment+' · '+p.stage+'ª etapa · '+fmt(p.start)+' a '+fmt(p.end))+'</option>').join('')+'</select></label>'+
   (activePlan(s)?'<button id="crEditPlan" class="cr-btn">Editar período e disciplinas</button>':'')+'</section>';
  if(!d)return selection;
  const dates=planDays(d.start,d.end),subjects=s.types.subjectsByGrade[d.grade]||[];
  return selection+'<section class="cr-card"><h3>'+ (d.id?'Editar':'Criar novo')+' roteiro</h3><div class="cr-fields">'+
   '<label>Série<select id="crPlanGrade">'+opt(s.types.grades,d.grade)+'</select></label><label>Modalidade de prova<select id="crPlanTest">'+opt(s.types.tests,d.assessment)+'</select></label><label>Etapa<select id="crPlanStage">'+stageSelect(d.stage)+'</select></label>'+
   '<label>Início<input id="crPlanStart" type="date" min="'+s.year+'-01-01" max="'+s.year+'-12-31" value="'+esc(d.start)+'"></label><label>Fim<input id="crPlanEnd" type="date" min="'+s.year+'-01-01" max="'+s.year+'-12-31" value="'+esc(d.end)+'"></label></div>'+
   '<p>Distribua as disciplinas na ordem das provas. Datas sem disciplinas ficam fora do documento.</p>'+dates.map((date,i)=>'<fieldset class="cr-segments"><legend>Dia '+(i+1)+' · '+fmt(date)+'</legend><select data-day-subject="'+date+'">'+opt(subjects,'')+'</select><button data-day-add="'+date+'" class="cr-btn">Adicionar disciplina</button><ol class="cr-day-list">'+d.items.map((r,index)=>r.date===date?'<li>'+esc(r.subject)+' <button data-plan-move="'+index+'" data-dir="-1" aria-label="Subir disciplina">↑</button> <button data-plan-move="'+index+'" data-dir="1" aria-label="Descer disciplina">↓</button> <button data-plan-remove="'+index+'">Retirar</button></li>':'').join('')+'</ol></fieldset>').join('')+
   '<div class="cr-actions"><button id="crSavePlan" class="cr-btn primary">Salvar cronograma e acompanhar envios</button><button id="crCancelPlan" class="cr-btn">Cancelar edição</button></div></section>';
 }
 function progressData(s){
  const rows=planRows(s),tasks=[],seen=new Set(),unassigned=[];
  for(const row of rows){
   const owners=(s.assignments||[]).filter(a=>a.items.some(x=>x.grade===row.grade&&x.subject===row.subject));
   if(!owners.length&&!unassigned.some(x=>idFor(x)===idFor(row)))unassigned.push(row);
   for(const owner of owners){
    const key=owner.teacher.id+'|'+idFor(row);if(seen.has(key))continue;seen.add(key);
    const doc=s.documents.find(d=>d.authorId===owner.teacher.id&&idFor(d)===idFor(row));
    tasks.push({teacher:owner.teacher,row,status:doc?.status||'nao-enviado'});
   }
  }
  const pending=tasks.filter(x=>!['enviado','aprovado'].includes(x.status));
  return {rows,tasks,unassigned,pending,teachers:unique(pending.map(x=>x.teacher.id)).length};
 }
 function progressView(s){
  if(!activePlan(s))return '<section class="cr-card">Crie ou selecione um roteiro para acompanhar os professores.</section>';
  const p=progressData(s),ready=p.rows.length&&p.rows.every(x=>x.condition==='aprovado')&&!p.pending.length&&!p.unassigned.length;
  return '<section class="cr-card"><h3>Andamento dos roteiros</h3><div class="cr-progress-grid">'+[
   [p.tasks.length,'Entregas previstas'],[p.teachers,'Professores com envio pendente'],[p.tasks.filter(x=>x.status==='enviado').length,'Aguardando análise'],[p.tasks.filter(x=>x.status==='aprovado').length,'Aprovados'],[p.unassigned.length,'Disciplinas sem professor vinculado']].map(([n,t])=>'<div><strong>'+n+'</strong><span>'+t+'</span></div>').join('')+'</div><p>'+(ready?'Tudo organizado: roteiro liberado para baixar.':'Acompanhe abaixo os envios e as correções pendentes.')+'</p>'+
   '<ul>'+p.pending.map(x=>'<li><b>'+esc(x.teacher.name)+'</b> · '+esc(x.row.subject)+' · '+(x.status==='devolvido'?'Devolvido para correção':x.status==='rascunho'?'Rascunho, ainda não enviado':'Não enviado')+'</li>').join('')+p.unassigned.map(x=>'<li>'+esc(x.subject)+' · aguardando autocadastro de um professor nesta série.</li>').join('')+'</ul><p class="cr-help">Os números consideram as disciplinas deste cronograma e os vínculos salvos pelos professores. Atualização automática a cada 30 segundos fora da edição.</p></section>';
 }
 function documentList(s){
  const chosen=activePlan(s);const docs=s.documents.filter(d=>d.status!=='rascunho'&&(!chosen||(d.grade===chosen.grade&&d.assessment===chosen.assessment&&d.stage===chosen.stage))).slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  return '<section class="cr-card"><h3>2. Roteiros recebidos dos professores</h3>'+
   '<p class="cr-help">Aprovar permite a inclusão no material final. Devolver solicita correções mantendo a autoria e o histórico do roteiro.</p>'+
   (docs.length?'<div class="cr-documents">'+docs.map(d=>'<article><div class="cr-document-top"><div><strong>'+esc(d.grade)+' · '+esc(d.subject)+'</strong>'+
    '<small>'+esc(d.authorName)+' · '+d.stage+'ª etapa · '+esc(d.assessment)+'</small></div>'+statusBadge(d.status)+'</div>'+
    '<details><summary>Ver roteiro completo</summary>'+d.blocks.map(b=>
     '<div class="cr-doc-block"><b>Livro:</b> '+esc(b.book)+'<p><b>Unidade:</b> '+esc(b.unit)+'</p>'+
     '<p><b>Capítulo:</b> '+esc(b.chapter)+'</p><p><b>Temas:</b> '+esc(b.theme)+'</p><p><b>Páginas:</b> '+esc(b.pages)+'</p></div>').join('')+
    (d.sourceText?'<div class="cr-doc-block"><b>Texto do roteiro revisado:</b><pre class="cr-legacy">'+esc(d.sourceText)+'</pre></div>':'')+
    (d.instructions?'<p>Observações: '+esc(d.instructions)+'</p>':'')+'</details>'+
    '<div class="cr-actions">'+(d.status==='enviado'?'<button data-review="aprovado" data-author="'+esc(d.authorId)+'" data-doc="'+esc(d.id)+'" data-revision="'+d.revision+'" class="cr-btn primary">Aprovar</button>':'')+
    (d.status==='enviado'||d.status==='aprovado'?'<button data-review="devolvido" data-author="'+esc(d.authorId)+'" data-doc="'+esc(d.id)+'" data-revision="'+d.revision+'" class="cr-btn">Devolver</button>':'')+'</div></article>').join('')+'</div>':'<div class="cr-empty">Ainda não há roteiros digitados por professores neste ano.</div>')+
   '</section>';
 }
 function composeView(s){
  const list=planRows(s),pending=list.filter(x=>x.condition!=='aprovado');
  const ref=s.year===2026?'<p class="cr-help">O roteiro de 2026 pode aparecer apenas como referência histórica, nunca como material aprovado sem conferência da Gestão.</p>':'';
  return '<section class="cr-card"><div class="cr-preview-head"><div><h3>4. Prévia para famílias</h3><p>Roteiros agrupados automaticamente por data, série e disciplina.</p></div>'+
   '<div class="cr-actions"><label class="cr-page-label">Página PNG <input id="crPngPage" type="number" min="1" max="100" value="'+(s.pngPage||1)+'"></label><button class="cr-btn" id="crExportPNG">Baixar PNG</button><button class="cr-btn primary" id="crExportPDF">Baixar PDF desta série</button></div></div>'+
   '<p class="cr-help">'+list.length+' disciplina(s) programada(s) · '+pending.length+' pendência(s). Os arquivos com pendências terão a marca PRÉVIA PARA CONFERÊNCIA.</p>'+ref+
   '<div class="cr-preview-list">'+(list.length?list.slice().sort(byDate).map(row=>
    '<article class="cr-preview-item"><div><time>'+fmt(row.date)+'</time><strong>'+esc(row.grade)+' · '+esc(row.subject)+'</strong><span>'+esc(row.assessment)+' · '+row.stage+'ª etapa</span></div>'+
     statusBadge(row.roteiro?.status||(row.template?'modelo-canva-pendente':row.legacy?.status)||'')+
     (row.roteiro?.sourceText?'<pre class="cr-legacy">'+esc(row.roteiro.sourceText)+'</pre>':
      row.roteiro?.blocks?.length?'<div class="cr-preview-text">'+row.roteiro.blocks.map(b=>
      '<p><b>Livro:</b> '+esc(b.book)+' | <b>Unidade:</b> '+esc(b.unit)+' | <b>Capítulo:</b> '+esc(b.chapter)+
      '<br><b>Temas:</b> '+esc(b.theme)+' | <b>Páginas:</b> '+esc(b.pages)+'</p>').join('')+'</div>':
      row.template?'<div class="cr-preview-text"><b>Modelo Canva · página '+row.template.sourcePage+' · aguardando revisão</b>'+
       '<pre class="cr-legacy">'+esc(row.template.rawText)+'</pre></div>':
      row.legacy?'<pre class="cr-legacy">'+esc(row.legacy.legacyText)+'</pre>':
      '<p class="cr-missing">Aguardando envio e aprovação do professor vinculado à disciplina.</p>')+
    '</article>').join(''):'<div class="cr-empty">Cadastre o cronograma acima para formar os roteiros automaticamente.</div>')+'</div>'+
    '</section>';
 }
function managerForm(s){return planBuilder(s)+progressView(s)+'<div class="cr-grid">'+documentList(s)+composeView(s)+'</div>'}
 function render(s){
  s.host.innerHTML=header(s)+alert(s)+(s.role==='gestao'?managerForm(s):selfAssignmentForm(s)+teacherForm(s))+
   '<footer class="cr-footer"><button type="button" id="crReload" class="cr-small">Atualizar dados</button>'+
   '<small>Acesso restrito · salvamento no servidor · fontes históricas somente para conferência.</small></footer>';
  bind(s);
 }
 function readBlocks(form){return [...form.querySelectorAll('.cr-block')].map(el=>{
  const get=name=>el.querySelector('[name="'+name+'"]')?.value||'';
  return {book:get('book'),unit:get('unit'),chapter:get('chapter'),theme:get('theme'),pages:get('pages')};
 })}
 function readPartForm(s){const el=s.host.querySelector('#crEditorForm');if(!el)return;
  s.editorParts=readBlocks(el);s.editorInstructions=el.querySelector('#crInstructions')?.value||'';
  s.editorSourceText=el.querySelector('#crCanvaText')?.value||'';
 }
 function changeGrade(s,key,subKey){const select=s.host.querySelector('#'+key);if(!select)return;
  s.grade=select.value;s.subject=subjectList(s)[0]||'';
  const other=s.host.querySelector('#'+subKey);
  if(other)other.innerHTML=opt(subjectList(s),s.subject);
 }
 function send(s,operation,body){return api(s,{operation,...body})}
 async function reload(s){s.message='';await fetchData(s);s.pendingAssignments=null;s.pendingSchedule=null;s.editorParts=null;s.editorInstructions=null;s.editorSourceText=null;render(s)}
 function err(s,error){s.message=error?.message||'Não foi possível salvar os dados.';render(s)}
 function bind(s){
  const $=q=>s.host.querySelector(q);
  $('#crReload')?.addEventListener('click',()=>void reload(s).catch(e=>err(s,e)));
  $('#crWorkYear')?.addEventListener('change',async e=>{
   s.year=Number(e.target.value);s.loaded=false;s.grade='';s.subject='';s.selfPending=null;s.selfSegments=null;s.selfGrades={};s.selfSubjects={};s.planDraft=null;s.planId='';s.pendingSchedule=null;s.pendingAssignments=null;s.editorParts=null;s.editorSourceText=null;s.editorInstructions=null;
   try{await fetchData(s);render(s)}catch(e){err(s,e)}
  });
  if(s.role==='equipe'){
   s.host.querySelectorAll('[data-self-segment]').forEach(box=>box.onchange=()=>{
    readPartForm(s);s.selfSegments=[...s.host.querySelectorAll('[data-self-segment]:checked')].map(x=>x.dataset.selfSegment);
    const allowed=s.selfSegments.flatMap(x=>s.types.segments[x]);s.selfPending=(s.selfPending||s.assignments).filter(x=>allowed.includes(x.grade));render(s);
   });
   s.host.querySelectorAll('[data-self-grade]').forEach(box=>box.onchange=()=>{
    readPartForm(s);const segment=box.dataset.segment;s.selfGrades=s.selfGrades||{};
    s.selfGrades[segment]=[...s.host.querySelectorAll('[data-self-grade]:checked')].filter(x=>x.dataset.segment===segment).map(x=>x.dataset.selfGrade);render(s);
   });
   s.host.querySelectorAll('[data-self-subject]').forEach(select=>select.onchange=()=>{s.selfSubjects=s.selfSubjects||{};s.selfSubjects[select.dataset.selfSubject]=select.value;});
   s.host.querySelectorAll('[data-self-add]').forEach(btn=>btn.onclick=()=>{
    readPartForm(s);const segment=btn.dataset.selfAdd,grades=(s.selfGrades||{})[segment]||[];
    const subject=[...s.host.querySelectorAll('[data-self-subject]')].find(x=>x.dataset.selfSubject===segment)?.value;
    if(!subject||!grades.length)return;const items=s.selfPending||[...s.assignments];
    for(const grade of grades)if(!items.some(x=>x.grade===grade&&x.subject===subject))items.push({grade,subject});
    s.selfPending=items;render(s);
   });
   s.host.querySelectorAll('[data-self-remove]').forEach(btn=>btn.onclick=()=>{readPartForm(s);s.selfPending=(s.selfPending||s.assignments).filter((_,i)=>i!==Number(btn.dataset.selfRemove));render(s)});
   $('#crSelfSave')?.addEventListener('click',async()=>{
    try{await send(s,'selfAssign',{items:s.selfPending||s.assignments,segments:selectedSegments(s)});s.selfPending=null;s.editorParts=null;s.editorSourceText=null;s.editorInstructions=null;await fetchData(s);s.message='Turmas cadastradas. Escolha uma das quatro etapas para revisar e encaminhar seus roteiros.';render(s)}catch(e){err(s,e)}
   });
   s.host.querySelectorAll('[data-choose-stage]').forEach(btn=>btn.onclick=()=>{s.stage=Number(btn.dataset.chooseStage);s.editorParts=null;s.editorInstructions=null;s.editorSourceText=null;render(s)});
   $('#crGrade')?.addEventListener('change',()=>{readPartForm(s);s.grade=$('#crGrade').value;s.subject='';s.editorParts=null;s.editorInstructions=null;s.editorSourceText=null;render(s)});
   $('#crSubject')?.addEventListener('change',()=>{s.subject=$('#crSubject').value;s.editorParts=null;s.editorInstructions=null;s.editorSourceText=null;render(s)});
   $('#crStage')?.addEventListener('change',()=>{s.stage=Number($('#crStage').value);s.editorParts=null;s.editorInstructions=null;s.editorSourceText=null;render(s)});
   $('#crAssessment')?.addEventListener('change',()=>{s.assessment=$('#crAssessment').value;s.editorParts=null;s.editorInstructions=null;s.editorSourceText=null;render(s)});
   $('#crAddBlock')?.addEventListener('click',()=>{readPartForm(s);s.editorParts.push(blank());render(s)});
   s.host.querySelectorAll('[data-remove-block]').forEach(b=>b.onclick=()=>{
    readPartForm(s);if(s.editorParts.length>1)s.editorParts.splice(Number(b.dataset.removeBlock),1);render(s);
   });
   const form=$('#crEditorForm');
   if(form)form.querySelectorAll('[data-submit-status]').forEach(btn=>btn.onclick=()=>{form.dataset.status=btn.dataset.submitStatus});
   form?.addEventListener('submit',async event=>{
    event.preventDefault();const button=event.submitter,status=button?.dataset.submitStatus||form.dataset.status||'rascunho';
    const confirmed=s.host.querySelector('#crConfirmCanva')?.checked===true;
    readPartForm(s);
    if(status==='enviado'&&!confirmed){
     s.message='Antes de encaminhar, confirme que revisou o roteiro e suas páginas.';render(s);return;
    }
    const input={year:s.year,grade:s.grade,subject:s.subject,assessment:s.assessment||'AP2',stage:s.stage||1,
     blocks:s.editorParts,instructions:s.editorInstructions,sourceText:s.editorSourceText,
     confirmed:status==='enviado'&&confirmed,status};
    const old=s.documents.find(x=>idFor(x)===idFor(input));input.revision=old?.revision||0;
    try{await send(s,'save',{document:input});s.message=status==='enviado'?'Roteiro encaminhado com sucesso à Gestão, identificado com seu nome. Aguarde a conferência.':'Rascunho salvo na sua conta.';
     await fetchData(s);s.editorParts=null;s.editorInstructions=null;s.editorSourceText=null;render(s);}
    catch(e){s.message=e.message;render(s)}
   });
   $('#crLoadLegacy')?.addEventListener('click',async()=>{
    readPartForm(s);
    const params=new URLSearchParams({mode:'legacy',stage:String(s.stage||1),grade:s.grade,subject:s.subject,assessment:s.assessment||'AP2'});
    try{const result=await api(s,undefined,params.toString());
     const target=$('#crLegacyView');if(!target)return;const ref=result.reference?.[0];
     target.innerHTML=ref?'<p>Referência histórica: '+esc(ref.sourceTab)+' · '+esc(ref.sourceCell)+'</p>'+
       '<pre class="cr-legacy">'+esc(ref.legacyText)+'</pre>'+
       '<button type="button" id="crUseLegacy" class="cr-small">Copiar texto como esboço (revisar)</button>':
       '<p>Nenhum modelo histórico localizado para esta combinação.</p>';
     $('#crUseLegacy')?.addEventListener('click',()=>{
      const first=s.editorParts?.[0]||blank();first.theme=ref.legacyText.slice(0,900);
      s.editorParts=[first,...(s.editorParts||[]).slice(1)];render(s);s.message='';
     });
    }catch(e){s.message=e.message;render(s)}
   });
  }else{
   $('#crNewPlan')?.addEventListener('click',()=>{s.planDraft={grade:'6º ano',assessment:'AP2',stage:1,start:'',end:'',items:[]};render(s)});
   $('#crPlanSelect')?.addEventListener('change',e=>{s.planId=e.target.value;s.planDraft=null;render(s)});
   $('#crEditPlan')?.addEventListener('click',()=>{s.planDraft={...activePlan(s),items:s.schedule.filter(x=>x.planId===s.planId).map(x=>({...x}))};render(s)});
   $('#crCancelPlan')?.addEventListener('click',()=>{s.planDraft=null;render(s)});
   for(const [id,key] of [['crPlanGrade','grade'],['crPlanTest','assessment'],['crPlanStage','stage'],['crPlanStart','start'],['crPlanEnd','end']])$('#'+id)?.addEventListener('change',e=>{
    const d=s.planDraft,previous=d[key];d[key]=key==='stage'?Number(e.target.value):e.target.value;
    if((key==='start'||key==='end')&&d.start&&d.end){const outside=d.items.filter(x=>x.date<d.start||x.date>d.end);if(outside.length){if(confirm('A mudança de período retirará '+outside.length+' disciplina(s) fora das novas datas. Confirmar?'))d.items=d.items.filter(x=>x.date>=d.start&&x.date<=d.end);else d[key]=previous;}}
    if(key==='grade')d.items=d.items.filter(x=>(s.types.subjectsByGrade[d.grade]||[]).includes(x.subject));
    render(s);
   });
   s.host.querySelectorAll('[data-day-add]').forEach(btn=>btn.onclick=()=>{
    const date=btn.dataset.dayAdd,subject=[...s.host.querySelectorAll('[data-day-subject]')].find(el=>el.dataset.daySubject===date)?.value;
    if(!subject)return;const d=s.planDraft;if(!d.items.some(x=>x.date===date&&x.subject===subject))d.items.push({date,subject});render(s);
   });
   s.host.querySelectorAll('[data-plan-remove]').forEach(btn=>btn.onclick=()=>{s.planDraft.items.splice(Number(btn.dataset.planRemove),1);render(s)});
   s.host.querySelectorAll('[data-plan-move]').forEach(btn=>btn.onclick=()=>{
    const rows=s.planDraft.items,i=Number(btn.dataset.planMove),dir=Number(btn.dataset.dir);let j=i+dir;
    while(j>=0&&j<rows.length&&rows[j].date!==rows[i].date)j+=dir;
    if(j>=0&&j<rows.length)[rows[i],rows[j]]=[rows[j],rows[i]];render(s);
   });
   $('#crSavePlan')?.addEventListener('click',async()=>{
    try{const result=await send(s,'savePlan',{plan:s.planDraft,baseRevision:s.scheduleRevision});s.planId=result.planId;s.planDraft=null;await fetchData(s);s.message='Cronograma salvo. Os envios dos professores serão organizados automaticamente.';render(s)}catch(e){err(s,e)}
   });
   s.host.querySelectorAll('[data-review]').forEach(btn=>btn.onclick=async()=>{
    const {review,author,doc,revision}=btn.dataset;
    const note=review==='devolvido'?prompt('Orientações para o professor corrigir o roteiro:'):'';
    if(review==='devolvido'&&note===null)return;
    if(review==='aprovado'&&!confirm('Aprovar este roteiro para a organização destinada às famílias?'))return;
    try{await send(s,'review',{authorId:author,documentId:doc,revision:Number(revision),status:review,reviewNote:note});
     s.message='Situação do roteiro atualizada.';await fetchData(s);render(s)}catch(e){err(s,e)}
   });
   $('#crPngPage')?.addEventListener('change',e=>{s.pngPage=Math.max(1,Math.min(100,Number(e.target.value)||1))});
   $('#crExportPNG')?.addEventListener('click',()=>exportFile(s,'png'));
   $('#crExportPDF')?.addEventListener('click',()=>exportFile(s,'pdf'));
  }
 }
 function wrap(ctx,text,maxWidth){
  const lines=[];for(const par of String(text||'').split(/\r?\n/)){
   let cur='';for(const w of par.split(/\s+/).filter(Boolean)){
    const candidate=cur?cur+' '+w:w;
    if(ctx.measureText(candidate).width>maxWidth&&cur){lines.push(cur);cur=w;}else cur=candidate;
   }
   lines.push(cur);
  }return lines;
 }
 function makePages(s){
  const rows=s.composite.slice().sort((a,b)=>a.grade.localeCompare(b.grade,'pt-BR')||byDate(a,b)),pages=[],W=1190,H=1684,margin=72,maxX=W-margin;
  let canvas,ctx,y;
  const addPage=()=>{
   canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;ctx=canvas.getContext('2d');
   ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);
   ctx.fillStyle='#0f3459';ctx.fillRect(0,0,W,172);
   ctx.fillStyle='#f0c947';ctx.fillRect(0,172,W,9);
   ctx.font='bold 22px Arial';ctx.fillStyle='#f9d979';ctx.fillText('COLÉGIO CORA CORALINA',margin,68);
   ctx.font='bold 39px Arial';ctx.fillStyle='#fff';ctx.fillText('ROTEIROS DAS AVALIAÇÕES',margin,128);
   ctx.font='20px Arial';ctx.fillStyle='#54718b';ctx.fillText('CALENDÁRIO '+s.year+'   ·   COORDENAÇÃO PEDAGÓGICA',margin,224);
   ctx.fillStyle='#e4eaf0';ctx.fillRect(margin,253,W-2*margin,2);y=288;pages.push(canvas);
  };
  const ensure=h=>{if(y+h>H-130)addPage()};
  const line=(text,size=20,bold=false,color='#163e60',indented=0,justify=false)=>{
   ctx.font=(bold?'bold ':'')+size+'px Arial';ctx.fillStyle=color;
   for(const paragraph of String(text||'').split(/\r?\n/)){
    const all=wrap(ctx,paragraph,W-2*margin-indented);
    for(let index=0;index<all.length;index++){
     const str=all[index];ensure(size*1.4+6);ctx.font=(bold?'bold ':'')+size+'px Arial';ctx.fillStyle=color;
     const words=str.split(/\s+/).filter(Boolean);
     if(justify&&index<all.length-1&&words.length>1){
      const width=words.reduce((sum,word)=>sum+ctx.measureText(word).width,0),gap=(W-2*margin-indented-width)/(words.length-1);let x=margin+indented;
      for(const word of words){ctx.fillText(word,x,y);x+=ctx.measureText(word).width+gap;}
     }else ctx.fillText(str,margin+indented,y);
     y+=size*1.38;
    }
   }
  };
  addPage();
  const entries=rows.filter(x=>x.date);
  if(!entries.length){line('Nenhuma avaliação programada neste ano.',28);}
  let currentDate='',currentGrade='';
  for(const row of entries){
   if(row.grade!==currentGrade){
    if(currentGrade)addPage();currentGrade=row.grade;currentDate='';
    line('ROTEIRO DE AVALIAÇÃO · '+row.grade.toUpperCase(),28,true);y+=16;
    if(s.outputPlan){line(s.outputPlan.assessment+' · '+s.outputPlan.stage+'ª ETAPA',21,true);line('PERÍODO: '+fmt(s.outputPlan.start)+' A '+fmt(s.outputPlan.end),19);y+=12;}
    line('DATA / DISCIPLINAS',22,true);
    const summary=new Map();for(const r of entries.filter(x=>x.grade===currentGrade)){
     const subjects=summary.get(r.date)||[];subjects.push(r.subject+' ('+r.assessment+' · '+r.stage+'ª etapa)');summary.set(r.date,subjects);
    }
    for(const [date,subjects] of summary){
     ctx.font='18px Arial';const wrapped=wrap(ctx,subjects.join(' / '),W-2*margin-205),height=Math.max(52,wrapped.length*26+24);
     ensure(height+12);ctx.fillStyle='#edf3f8';ctx.fillRect(margin,y-20,W-2*margin,height);
     ctx.fillStyle='#163e60';ctx.font='bold 18px Arial';ctx.fillText(fmt(date),margin+12,y+4);
     ctx.font='18px Arial';wrapped.forEach((text,index)=>ctx.fillText(text,margin+190,y+4+index*26));y+=height+8;
    }
    y+=28;
   }
   if(row.date!==currentDate){
    currentDate=row.date;ensure(82);ctx.fillStyle='#dbeaf4';ctx.fillRect(margin,y-26,W-2*margin,56);
    line('DATA: '+fmt(row.date),25,true,'#144f7b',12);y+=15;
   }
   ensure(108);line(row.grade.toUpperCase()+' · '+row.subject,24,true);line(row.assessment+' · '+row.stage+'ª ETAPA',17,true,'#698098');y+=10;
   if(row.roteiro?.sourceText){
     line(row.roteiro.sourceText,19,false,'#163e60',0,true);
   }else if(row.roteiro?.blocks?.length){
    for(const b of row.roteiro.blocks){
     line('LIVRO / MATERIAL: '+b.book,19,false);
     line('UNIDADE: '+b.unit,19,false);
     line('CAPÍTULO: '+b.chapter,19,false);
     line('TEMAS: '+b.theme,19,false,'#163e60',0,true);
     line('PÁGINAS: '+b.pages,19,false);
     y+=12;
    }
   }else if(row.template){
    line('MODELO DO CANVA · PENDENTE DE REVISÃO E APROVAÇÃO',18,true,'#a46b1f');
    line(row.template.rawText,18,false,'#324b61');
   }else if(row.legacy){
    line('REFERÊNCIA HISTÓRICA 2026 · REVISÃO OBRIGATÓRIA',18,true,'#a46b1f');
    line(row.legacy.legacyText,18,false,'#324b61');
   }else line('ROTEIRO AINDA NÃO APROVADO / NÃO CADASTRADO',20,true,'#a34836');
   if(row.roteiro?.instructions){line('ORIENTAÇÕES: '+row.roteiro.instructions,18);}
   if(row.condition!=='aprovado'){ensure(34);line('PRÉVIA PARA CONFERÊNCIA · NÃO DISTRIBUIR',17,true,'#aa6645')}
   y+=18;ensure(30);ctx.fillStyle='#e2e8f0';ctx.fillRect(margin,y-16,W-2*margin,2);
  }
  for(let i=0;i<pages.length;i++){
   const c=pages[i],g=c.getContext('2d');g.font='17px Arial';g.fillStyle='#678199';
   g.fillText('COLÉGIO CORA CORALINA · ROTEIROS INSTITUCIONAIS',margin,H-63);
   g.fillText('PÁGINA '+(i+1)+' / '+pages.length,W-margin-135,H-63);
  }
  return pages;
 }
 function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),40000)}
 async function exportFile(s,kind){
  const progress=progressData(s),selected=planRows(s);
  if(!selected.length){s.message='Defina e salve ao menos uma avaliação no cronograma antes de exportar.';render(s);return}
  if(selected.some(x=>x.condition!=='aprovado')||progress.pending.length||progress.unassigned.length){s.message='O download final será liberado após o envio e a aprovação de todas as disciplinas deste roteiro.';render(s);return;}
  const plan=activePlan(s),list=makePages({...s,composite:selected,outputPlan:plan}),base='Cora_Roteiro_'+safeFileName(plan.grade+'_'+plan.assessment+'_'+plan.stage+'_etapa_'+s.year);
  try{
   if(kind==='pdf'){
    if(!window.CoraPDF?.fromCanvases)throw Error('Gerador PDF indisponível. Atualize o aplicativo.');
    download(window.CoraPDF.fromCanvases(list,{title:'Roteiros de Avaliações Cora '+s.year}),base+'.pdf');
    s.message='PDF com '+list.length+' página(s) preparado.';render(s);
   }else{
    const index=Math.max(0,Math.min(list.length-1,Number(s.pngPage||1)-1));
    list[index].toBlob(blob=>{if(blob)download(blob,base+'_pagina_'+(index+1)+'.png');else{s.message='Não foi possível gerar PNG.';render(s)}},'image/png');
    s.pngPage=index+1;
    s.message='PNG da página '+(index+1)+'/'+list.length+' gerado. O PDF reúne todas as páginas.';
    render(s);
   }
  }catch(e){s.message=e.message;render(s)}
 }
 async function mount({role,host,year,api:callApi}={}){
  if(!host||typeof callApi!=='function')return;
  if(inst.get(host)?.year===year&&inst.get(host)?.loaded)return;
  if(inst.get(host)?.timer)clearInterval(inst.get(host).timer);
  const s={role,host,year,api:callApi,grade:'',subject:'',stage:1,assessment:'AP2',message:'',loaded:false,
   assignments:[],documents:[],schedule:[],composite:[],people:[],templates:[],teacherLinks:[],editorSourceText:null};inst.set(host,s);
  host.innerHTML='<div class="cr-loading">Carregando roteiros e vínculos pedagógicos...</div>';
  try{await fetchData(s);render(s);if(role==='gestao'){s.timer=setInterval(async()=>{if(!host.isConnected){clearInterval(s.timer);return;}if(s.planDraft||document.hidden||s.refreshing)return;s.refreshing=true;try{await fetchData(s);render(s)}catch{}finally{s.refreshing=false}},30000);}}catch(e){host.innerHTML='<div class="cr-error">Não foi possível acessar os roteiros: '+esc(e.message)+
   '<p>Confirme seu login individual e atualize a página.</p></div>'}
 }
 window.CoraRoteiros={mount,makePages,compositionKey:idFor,progressData,planDays};
})();