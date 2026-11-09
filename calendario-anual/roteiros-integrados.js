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
 const byDate=(a,b)=>a.date.localeCompare(b.date)||a.grade.localeCompare(b.grade,'pt-BR');
 const safeFileName=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'_').replace(/^_+|_+$/g,'').slice(0,70);
 const sourceUrl='https://docs.google.com/spreadsheets/d/1Jiy-g9kC7BJ6lR5Hh5cfgBJSAHmdZDS2BwjqIr0WOOc/edit';
 function currentGrade(s){return s.grade||s.types?.grades?.[10]||'6º ano'}
 function gradeOptions(s){return opt(s.types?.grades||[],currentGrade(s))}
 function subjectList(s){return s.types?.subjectsByGrade?.[currentGrade(s)]||[]}
 function currentSubject(s){return subjectList(s).includes(s.subject)?s.subject:subjectList(s)[0]||''}
 const stageSelect=stage=>[1,2,3,4].map(n=>'<option '+(Number(stage)===n?'selected ':'')+'value="'+n+'">'+n+'ª etapa</option>').join('');
 function api(s,body,params=''){return s.api('roteiros',body,'year='+s.year+(params?'&'+params:''))}
 async function fetchData(s){const answer=await api(s,undefined);
  s.types=answer.types;s.people=answer.people||[];s.assignments=answer.assignments||[];s.documents=answer.documents||[];
  s.schedule=answer.schedule||[];s.composite=answer.composite||[];s.loaded=true;
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
   '<span class="cr-year">'+s.year+'</span></header>'}
 function teacherForm(s){
  const grades=unique(s.assignments.map(x=>x.grade)),chosen=grades.includes(s.grade)?s.grade:grades[0];
  if(!chosen)return '<div class="cr-empty"><strong>Você ainda não possui turmas e disciplinas vinculadas.</strong><p>Solicite à Gestão a associação de suas séries e disciplinas no cadastro de professores. O acesso individual já está preparado.</p></div>';
  s.grade=chosen;
  const subs=unique(s.assignments.filter(a=>a.grade===chosen).map(a=>a.subject)),subject=subs.includes(s.subject)?s.subject:subs[0];s.subject=subject;
  const id=idFor({grade:chosen,subject,assessment:s.assessment||'AP2',stage:s.stage||1});
  const doc=s.documents.find(x=>idFor(x)===id)||null;
  const template=s.templates.find(x=>idFor(x)===id)||null;
  const parts=s.editorParts||doc?.blocks||[blank()];
  const original=s.editorSourceText??doc?.sourceText??template?.rawText??'';
  const list=s.documents.slice().sort((a,b)=>Number(a.stage)-Number(b.stage)||a.grade.localeCompare(b.grade));
  return '<div class="cr-grid"><section class="cr-card"><h3>Verificar e editar roteiro</h3><p class="cr-help">O roteiro de 2026 vem do Canva original para revisão. Escolha a etapa, o modelo da prova e confira o texto antes de enviar. Os campos abaixo permitem detalhar livro, unidade, capítulo, temas e páginas.</p>'+
   '<form id="crEditorForm"><div class="cr-fields">'+
   '<label>Série/turma<select id="crGrade">'+opt(grades,chosen)+'</select></label>'+
   '<label>Disciplina<select id="crSubject">'+opt(subs,subject)+'</select></label>'+
   '<label>Etapa<select id="crStage">'+stageSelect(s.stage||1)+'</select></label>'+
   '<label>Modelo de avaliação<select id="crAssessment">'+opt(s.types?.tests||types,s.assessment||'AP2')+'</select></label></div>'+
   '<div class="cr-canva-source"><div class="cr-source-heading"><strong>Roteiro original do Canva</strong>'+
   (template?'<small>Modelo localizado · página '+template.sourcePage+' · '+s.year+'</small>':
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
 function assignmentEditor(s){
  const teachers=s.people.filter(p=>p.profile==='Professor'||p.profile==='Coordenação'),email=s.teacherEmail||teachers[0]?.email||'';
  s.teacherEmail=email;
  const owner=s.assignments.find(a=>a.teacher?.email===email),items=s.pendingAssignments||owner?.items||[];
  const grade=currentGrade(s),subject=currentSubject(s);
  return '<section class="cr-card"><h3>1. Vincular professor, séries e disciplinas</h3>'+
    '<p class="cr-help">O e-mail vem dos colaboradores cadastrados na Gestão. Cada professor terá acesso somente às turmas autorizadas.</p>'+
    '<label>Professor<select id="crTeacher">'+opt(teachers.map(t=>t.email),email,'Escolha um professor')+'</select></label>'+
    '<div class="cr-fields"><label>Série<select id="crAssignGrade">'+gradeOptions(s)+'</select></label>'+
    '<label>Disciplina<select id="crAssignSubject">'+opt(subjectList(s),subject)+'</select></label></div>'+
    '<button id="crAddAssignment" class="cr-small" type="button">+ Adicionar associação</button>'+
    '<div class="cr-assignment-list">'+items.map((x,i)=>'<div><strong>'+esc(x.grade)+'</strong> · '+esc(x.subject)+
       '<button type="button" class="cr-remove" data-unassign="'+i+'">Retirar</button></div>').join('')+'</div>'+
    '<button id="crSaveAssignments" class="cr-btn primary" type="button">Salvar atribuições deste professor</button></section>';
 }
 function scheduleEditor(s){
  const grade=currentGrade(s),subject=currentSubject(s);
  const rows=s.pendingSchedule||s.schedule||[];
  return '<section class="cr-card"><h3>3. Programar datas das avaliações</h3>'+
   '<p class="cr-help">Escolha o dia e as disciplinas. Os roteiros enviados e aprovados serão vinculados automaticamente à programação.</p>'+
   '<div class="cr-fields"><label>Data<input id="crScheduleDate" type="date" value="'+esc(s.scheduleDate||'')+'" min="'+s.year+'-01-01" max="'+s.year+'-12-31"></label>'+
   '<label>Série<select id="crScheduleGrade">'+gradeOptions(s)+'</select></label>'+
   '<label>Disciplina<select id="crScheduleSubject">'+opt(subjectList(s),subject)+'</select></label>'+
   '<label>Modelo<select id="crScheduleTest">'+opt(s.types?.tests||types,'AD')+'</select></label>'+
   '<label>Etapa<select id="crScheduleStage">'+stageSelect(s.stage||1)+'</select></label></div>'+
   '<button id="crAddSchedule" class="cr-small" type="button">+ Incluir disciplina nesta data</button>'+
   '<div class="cr-schedule-list">'+(rows.length?rows.slice().sort(byDate).map((r,i)=>{
    const original=rows.indexOf(r);return '<div><time>'+fmt(r.date)+'</time><span>'+esc(r.grade)+' · '+esc(r.subject)+' · '+esc(r.assessment)+' · '+r.stage+'ª etapa</span>'+
      '<button class="cr-remove" type="button" data-remove-schedule="'+original+'">Retirar</button></div>';}).join(''):'<p>Nenhuma data programada.</p>')+'</div>'+
   '<button class="cr-btn primary" id="crSaveSchedule" type="button">Salvar cronograma de avaliações</button></section>';
 }
 function documentList(s){
  const docs=s.documents.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
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
  const list=s.composite||[],pending=list.filter(x=>x.condition!=='aprovado');
  const ref=s.year===2026?'<p class="cr-help">O roteiro de 2026 pode aparecer apenas como referência histórica, nunca como material aprovado sem conferência da Gestão.</p>':'';
  return '<section class="cr-card"><div class="cr-preview-head"><div><h3>4. Prévia para famílias</h3><p>Roteiros agrupados automaticamente por data, série e disciplina.</p></div>'+
   '<div class="cr-actions"><label class="cr-page-label">Página PNG <input id="crPngPage" type="number" min="1" max="100" value="'+(s.pngPage||1)+'"></label><button class="cr-btn" id="crExportPNG">Baixar PNG</button><button class="cr-btn primary" id="crExportPDF">Baixar PDF completo</button></div></div>'+
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
 function teacherRoster(s){
 const rows=s.teacherLinks||[],pending=rows.filter(x=>x.status==='pendente'||x.status==='segmento-nao-autorizado');
 return '<section class="cr-card cr-full"><div class="cr-editor-title"><h3>Professores e disciplinas vinculadas</h3>'+
  '<button class="cr-btn" type="button" id="crApplyTeacherPlan">Conferir/aplicar os 15 cadastros</button></div>'+
  '<p class="cr-help">'+rows.length+' profissionais previstos · '+pending.length+' precisam de cadastro ou ajuste de segmento. Os vínculos são por e-mail institucional já cadastrado, sem criação de contas falsas.</p>'+
  '<div class="cr-roster-grid">'+rows.map(x=>'<div><strong>'+esc(x.person)+'</strong><small>'+esc(x.teacher?.name||x.reason||'Aguardando cadastro')+
  '</small><span>'+x.linked+' combinações vinculadas</span></div>').join('')+'</div></section>';
}
function managerForm(s){return teacherRoster(s)+'<div class="cr-grid">'+assignmentEditor(s)+documentList(s)+scheduleEditor(s)+composeView(s)+'</div>'}
 function render(s){
  s.host.innerHTML=header(s)+alert(s)+(s.role==='gestao'?managerForm(s):teacherForm(s))+
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
  if(s.role==='equipe'){
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
    if(status==='enviado'&&!s.host.querySelector('#crConfirmCanva')?.checked){
     s.message='Antes de encaminhar, confirme que revisou o roteiro e suas páginas.';render(s);return;
    }
    readPartForm(s);const input={year:s.year,grade:s.grade,subject:s.subject,assessment:s.assessment||'AP2',stage:s.stage||1,
     blocks:s.editorParts,instructions:s.editorInstructions,sourceText:s.editorSourceText,
     confirmed:status==='enviado',status};
    const old=s.documents.find(x=>idFor(x)===idFor(input));input.revision=old?.revision||0;
    try{await send(s,'save',{document:input});s.message=status==='enviado'?'Roteiro enviado à Gestão. Aguarde a conferência.':'Rascunho salvo na sua conta.';
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
   $('#crApplyTeacherPlan')?.addEventListener('click',async()=>{
    try{
     const preview=await send(s,'applyTeacherPlan',{dryRun:true});
     const matched=(preview.preview||[]).filter(x=>x.items).length,pending=(preview.preview||[]).filter(x=>!x.items);
     if(!confirm('Vincular os '+matched+' professores encontrados e preservar atribuições manuais existentes? '+
       pending.length+' cadastro(s) ainda precisam de conferência.'))return;
     const applied=await send(s,'applyTeacherPlan',{dryRun:false,confirm:true,replaceExisting:false});
     s.message='Vínculos conferidos: '+(applied.applied||[]).filter(x=>x.status==='aplicado').length+
       ' aplicados; vínculos manuais anteriores preservados.';await fetchData(s);render(s);
    }catch(e){err(s,e)}
   });
   $('#crTeacher')?.addEventListener('change',()=>{s.teacherEmail=$('#crTeacher').value;s.pendingAssignments=null;render(s)});
   $('#crAssignGrade')?.addEventListener('change',()=>changeGrade(s,'crAssignGrade','crAssignSubject'));
   $('#crScheduleGrade')?.addEventListener('change',()=>changeGrade(s,'crScheduleGrade','crScheduleSubject'));
   $('#crScheduleDate')?.addEventListener('change',event=>{s.scheduleDate=event.target.value});
   $('#crAssignSubject')?.addEventListener('change',()=>{s.subject=$('#crAssignSubject').value});
   $('#crScheduleSubject')?.addEventListener('change',()=>{s.subject=$('#crScheduleSubject').value});
   $('#crAddAssignment')?.addEventListener('click',()=>{
    const grade=$('#crAssignGrade').value,subject=$('#crAssignSubject').value,owner=s.assignments.find(a=>a.teacher?.email===s.teacherEmail);
    const a=s.pendingAssignments||[...(owner?.items||[])];if(!a.some(x=>x.grade===grade&&x.subject===subject))a.push({grade,subject});
    s.pendingAssignments=a;render(s);
   });
   s.host.querySelectorAll('[data-unassign]').forEach(btn=>btn.onclick=()=>{
    const owner=s.assignments.find(a=>a.teacher?.email===s.teacherEmail),list=s.pendingAssignments||[...(owner?.items||[])];
    s.pendingAssignments=list.filter((_,i)=>i!==Number(btn.dataset.unassign));render(s);
   });
   $('#crSaveAssignments')?.addEventListener('click',async()=>{
    const owner=s.assignments.find(a=>a.teacher?.email===s.teacherEmail),items=s.pendingAssignments||owner?.items||[];
    try{await send(s,'assign',{email:s.teacherEmail,items});s.message='Disciplinas vinculadas à conta do professor.';await fetchData(s);s.pendingAssignments=null;render(s)}
    catch(e){err(s,e)}
   });
   s.host.querySelectorAll('[data-review]').forEach(btn=>btn.onclick=async()=>{
    const {review,author,doc,revision}=btn.dataset;
    const note=review==='devolvido'?prompt('Orientações para o professor corrigir o roteiro:'):'';
    if(review==='devolvido'&&note===null)return;
    if(review==='aprovado'&&!confirm('Aprovar este roteiro para a organização destinada às famílias?'))return;
    try{await send(s,'review',{authorId:author,documentId:doc,revision:Number(revision),status:review,reviewNote:note});
     s.message='Situação do roteiro atualizada.';await fetchData(s);render(s)}catch(e){err(s,e)}
   });
   $('#crAddSchedule')?.addEventListener('click',()=>{
    const date=$('#crScheduleDate').value,grade=$('#crScheduleGrade').value,subject=$('#crScheduleSubject').value,
     assessment=$('#crScheduleTest').value,stage=Number($('#crScheduleStage').value);
    if(!date||!grade||!subject||!assessment){s.message='Preencha data, série, disciplina e avaliação.';render(s);return}
    const row={date,grade,subject,assessment,stage},list=s.pendingSchedule||[...s.schedule];
    if(list.some(e=>e.date===date&&e.grade===grade&&e.subject===subject&&e.assessment===assessment&&e.stage===stage)){
     s.message='Esta disciplina já consta nesta data.';render(s);return}
    list.push(row);s.scheduleDate=date;s.pendingSchedule=list;s.message='';render(s);
   });
   s.host.querySelectorAll('[data-remove-schedule]').forEach(btn=>btn.onclick=()=>{
    const list=s.pendingSchedule||[...s.schedule];s.pendingSchedule=list.filter((_,i)=>i!==Number(btn.dataset.removeSchedule));render(s);
   });
   $('#crSaveSchedule')?.addEventListener('click',async()=>{
    try{await send(s,'schedule',{items:s.pendingSchedule||s.schedule});s.message='Cronograma salvo. Os roteiros aprovados serão associados automaticamente às datas.';await fetchData(s);s.pendingSchedule=null;render(s)}
    catch(e){err(s,e)}
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
  const rows=s.composite.slice().sort(byDate),pages=[],W=1190,H=1684,margin=72,maxX=W-margin;
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
  const line=(text,size=20,bold=false,color='#163e60',indented=0)=>{
   ctx.font=(bold?'bold ':'')+size+'px Arial';ctx.fillStyle=color;
   const all=wrap(ctx,text,W-2*margin-indented);
   for(const str of all){ensure(size*1.4+6);ctx.font=(bold?'bold ':'')+size+'px Arial';ctx.fillStyle=color;ctx.fillText(str,margin+indented,y);y+=size*1.38;}
  };
  addPage();
  const entries=rows.filter(x=>x.date);
  if(!entries.length){line('Nenhuma avaliação programada neste ano.',28);}
  let currentDate='';
  for(const row of entries){
   if(row.date!==currentDate){
    currentDate=row.date;ensure(82);ctx.fillStyle='#dbeaf4';ctx.fillRect(margin,y-26,W-2*margin,56);
    line('DATA: '+fmt(row.date),25,true,'#144f7b',12);y+=15;
   }
   ensure(108);line(row.grade.toUpperCase()+' · '+row.subject,24,true);line(row.assessment+' · '+row.stage+'ª ETAPA',17,true,'#698098');y+=10;
   if(row.roteiro?.sourceText){
     line(row.roteiro.sourceText,19,false,'#163e60');
   }else if(row.roteiro?.blocks?.length){
    for(const b of row.roteiro.blocks){
     line('LIVRO / MATERIAL: '+b.book,19,false);
     line('UNIDADE: '+b.unit,19,false);
     line('CAPÍTULO: '+b.chapter,19,false);
     line('TEMAS: '+b.theme,19,false);
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
  if(!s.composite.length){s.message='Defina e salve ao menos uma avaliação no cronograma antes de exportar.';render(s);return}
  const list=makePages(s),base='Cora_Roteiros_Avaliacoes_'+s.year;
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
  const s={role,host,year,api:callApi,grade:'',subject:'',stage:1,assessment:'AP2',message:'',loaded:false,
   assignments:[],documents:[],schedule:[],composite:[],people:[],templates:[],teacherLinks:[],editorSourceText:null};inst.set(host,s);
  host.innerHTML='<div class="cr-loading">Carregando roteiros e vínculos pedagógicos...</div>';
  try{await fetchData(s);render(s);}catch(e){host.innerHTML='<div class="cr-error">Não foi possível acessar os roteiros: '+esc(e.message)+
   '<p>Confirme seu login individual e atualize a página.</p></div>'}
 }
 window.CoraRoteiros={mount,makePages,compositionKey:idFor};
})();