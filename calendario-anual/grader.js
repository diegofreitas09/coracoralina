/* Corretor de gabaritos — Equipe Pedagógica, Colégio Cora Coralina.
 * As fotos ficam somente no navegador; a API persiste campos revisados.
 */
(()=>{
 'use strict';
 const $=(s,root=document)=>root.querySelector(s);
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const uid=()=>globalThis.crypto?.randomUUID?.()||'cg-'+Date.now()+'-'+Math.random().toString(36).slice(2,11);
 const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
 const letters=['A','B','C','D','E'];
 const num=v=>Number(v)||0;
 let api,notify,container,items=[],loaded=false,error='',loading=false,selected='',view='list',draft=null,result=null;
 let photoUrl='',photoFile=null,scanStatus='',busy=false,teacher='',identity='',revision=0,confirmedSignature='';
 const selectedTest=()=>items.find(t=>t.id===selected);
 const emptyDraft=()=>({id:uid(),title:'',subject:'',grade:'',className:'',date:today(),questionCount:10,options:5,maxScore:10,key:Array(10).fill('')});
 function resetPhoto(){if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl='';photoFile=null;scanStatus=''}
 function reset(){
  revision++;
  resetPhoto();
  items=[];loaded=false;error='';loading=false;busy=false;selected='';view='list';draft=null;result=null;
  identity='';teacher='';container=null;confirmedSignature='';
 }
 function setResult(record){
  const t=selectedTest();if(!t)return;
  result={id:record?.id||uid(),name:record?.name||'',number:record?.number||'',date:record?.date||t.date,
   answers:record?.answers?.slice()||Array(t.questionCount).fill('?')};
  resetPhoto();confirmedSignature='';
 }
 function scoreOf(t,r){return String(num(r.score).toLocaleString('pt-BR',{maximumFractionDigits:2}))+' / '+String(t.maxScore).replace('.',',')}
 function button(id,label,cl=''){return '<button type="button" class="cg-btn '+cl+'" data-cg="'+id+'">'+label+'</button>'}
 function header(title,desc){return '<div class="cg-head"><div><small>COLÉGIO CORA CORALINA · EQUIPE PEDAGÓGICA</small><h2>'+safe(title)+'</h2><p>'+safe(desc)+'</p></div></div>'}
 function draw(){
  if(!container)return;
  if(loading){container.innerHTML='<div class="cg-panel"><p>Carregando avaliações e gabaritos...</p></div>';return}
  if(error){container.innerHTML='<div class="cg-panel"><p class="cg-error">'+safe(error)+'</p>'+button('reload','Tentar novamente')+'</div>';return}
  if(view==='edit')return drawEditor();
  if(view==='capture')return drawCapture();
  if(view==='test')return drawTest();
  drawList();
 }
 function drawList(){
  container.innerHTML=header('Corretor de gabaritos','Cadastre a chave oficial, corrija as folhas e acompanhe os resultados por turma.')+
   '<div class="cg-toolbar">'+button('new-test','+ Nova avaliação','primary')+button('export-all','Baixar resumo geral (.csv)')+'</div>'+
   '<div class="cg-grid">'+(items.map(t=>'<article class="cg-card"><div class="cg-card-header"><span class="cg-tag">'+safe(t.grade)+'</span><span class="cg-tag secondary">'+t.results.length+' correções</span></div>'+
     '<h3>'+safe(t.title)+'</h3><p>'+safe(t.subject)+' · '+safe(t.className||'Turma não informada')+'</p><small>'+safe(formatDate(t.date))+' · '+t.questionCount+' questões · '+t.options+' alternativas</small>'+
     '<div class="cg-actions">'+button('open:'+t.id,'Abrir avaliação','primary')+button('sheet:'+t.id,'Folha de respostas')+'</div></article>').join('')||
     '<div class="cg-empty"><strong>Você ainda não cadastrou uma avaliação.</strong><p>Comece salvando o gabarito correto. Depois, use a câmera do celular para capturar as folhas.</p></div>')+'</div>'+
   '<p class="cg-note">Os gabaritos e resultados são vinculados à sua conta individual. Fotografias não são enviadas ao servidor.</p>';
 }
 function formatDate(v){const a=String(v||'').split('-');return a.length===3?a.reverse().join('/'):'—'}
 function answersEditor(list,n,options,field){
  return '<div class="cg-answers" role="group" aria-label="Marcação de respostas">'+Array.from({length:n},(_,i)=>'<label class="cg-answer"><span>'+String(i+1).padStart(2,'0')+'</span><select data-cg-answer="'+field+'" data-index="'+i+'" aria-label="Questão '+(i+1)+'">'+
   '<option value="?">Revisar</option>'+(field==='result'?'<option value="-">Em branco</option>':'')+
   letters.slice(0,options).map(v=>'<option value="'+v+'" '+(list[i]===v?'selected':'')+'>'+v+'</option>').join('')+
   '</select></label>').join('')+'</div>';
 }
 function drawEditor(){
  draft=draft||emptyDraft();
  const t=draft;
  container.innerHTML=header(t.createdAt?'Editar avaliação':'Novo gabarito oficial','Marque cada resposta correta na posição correspondente à questão.')+
  '<div class="cg-panel"><div class="cg-toolbar">'+button('list','← Minhas avaliações')+'</div><form id="cgTestForm" class="cg-form">'+
  '<div class="cg-form-grid"><label>Nome da avaliação<input name="title" maxlength="150" placeholder="Ex.: AP2 — 4ª etapa" value="'+safe(t.title)+'" required></label>'+
  '<label>Disciplina<input name="subject" maxlength="100" placeholder="Ex.: Matemática" value="'+safe(t.subject)+'" required></label>'+
  '<label>Série / ano<input name="grade" maxlength="80" placeholder="Ex.: 8º ano" value="'+safe(t.grade)+'" required></label>'+
  '<label>Turma<input name="className" maxlength="80" placeholder="Ex.: 8º A" value="'+safe(t.className)+'"></label>'+
  '<label>Data<input type="date" name="date" value="'+safe(t.date)+'" required></label>'+
  '<label>Quantidade de questões<input type="number" name="questionCount" min="1" max="60" value="'+t.questionCount+'" required></label>'+
  '<label>Alternativas<select name="options"><option value="4" '+(t.options===4?'selected':'')+'>A, B, C e D</option><option value="5" '+(t.options===5?'selected':'')+'>A, B, C, D e E</option></select></label>'+
  '<label>Valor da prova<input type="number" name="maxScore" min="0.01" max="100" step="0.01" value="'+t.maxScore+'" required></label></div>'+
  '<div class="cg-subhead"><h3>Gabarito oficial</h3><small>Todas as questões precisam ter uma alternativa definida.</small></div>'+
  '<div id="cgKeyGrid">'+answersEditor(t.key,t.questionCount,t.options,'key')+'</div>'+
  '<div class="cg-toolbar"><button type="submit" class="cg-btn primary" '+(busy?'disabled':'')+'>Salvar gabarito oficial</button>'+button('cancel-edit','Cancelar')+'</div></form></div>';
  const grid=$('#cgKeyGrid',container);
  grid.querySelectorAll('select').forEach(x=>x.value=t.key[Number(x.dataset.index)]||'?');
 }
 function drawTest(){
  const t=selectedTest();if(!t){view='list';return drawList()}
  const marked=t.results.length,avg=marked?t.results.reduce((s,r)=>s+num(r.score),0)/marked:0;
  container.innerHTML=header(t.title,'Gabarito salvo · '+t.subject+' · '+t.grade+' · '+(t.className||'Sem turma')+' · '+formatDate(t.date))+
   '<div class="cg-toolbar">'+button('list','← Avaliações')+button('capture','Capturar novo gabarito','primary')+
    button('sheet','Imprimir folha de respostas')+button('edit-test','Editar chave')+'</div>'+
   '<div class="cg-stats"><div><small>Questões</small><strong>'+t.questionCount+'</strong></div><div><small>Alunos corrigidos</small><strong>'+marked+'</strong></div><div><small>Média da turma</small><strong>'+avg.toLocaleString('pt-BR',{maximumFractionDigits:2})+'</strong></div></div>'+
   '<div class="cg-panel"><div class="cg-subhead"><h3>Gabarito oficial</h3><span>'+t.options+' alternativas · '+t.maxScore+' pontos</span></div>'+
   '<div class="cg-key-chips">'+t.key.map((a,i)=>'<span><small>'+(i+1)+'</small><strong>'+safe(a)+'</strong></span>').join('')+'</div></div>'+
   '<div class="cg-panel"><div class="cg-subhead"><h3>Correções da turma</h3><div class="cg-actions">'+button('csv','Baixar Excel (.csv)')+button('print','Baixar/imprimir PDF')+'</div></div>'+
   (marked?'<div class="cg-table-wrap"><table class="cg-table"><thead><tr><th>Nº</th><th>Aluno</th><th>Acertos</th><th>Erros</th><th>Brancos</th><th>Nota</th><th>Ações</th></tr></thead><tbody>'+
     t.results.map(r=>'<tr><td>'+safe(r.number||'—')+'</td><td>'+safe(r.name)+'</td><td>'+r.correct+'</td><td>'+r.wrong+'</td><td>'+r.blank+'</td><td><strong>'+scoreOf(t,r)+'</strong></td><td>'+button('review:'+r.id,'Revisar')+' '+button('remove-result:'+r.id,'Excluir','danger')+'</td></tr>').join('')+
     '</tbody></table></div>':'<p class="cg-muted">Nenhum aluno corrigido. Clique em “Capturar novo gabarito” para começar.</p>')+
   '</div><div class="cg-toolbar cg-danger-zone">'+button('delete-test','Excluir avaliação','danger')+'</div>';
 }
 function drawCapture(){
  const t=selectedTest();if(!t){view='list';return drawList()}
  if(!result)setResult();
  const r=result;
  container.innerHTML=header('Capturar e corrigir','Fotografe a folha de respostas da turma, confira o cabeçalho e valide cada alternativa antes de salvar.')+
   '<div class="cg-toolbar">'+button('test','← Avaliação')+
   '<label class="cg-btn primary cg-file-button">Capturar folha <input id="cgPhoto" type="file" accept="image/*" capture="environment" hidden></label>'+
   '<label class="cg-btn cg-file-button">Enviar imagem <input id="cgUpload" type="file" accept="image/*" hidden></label></div>'+
   '<div class="cg-panel"><div class="cg-photowrap">'+(photoUrl?'<img class="cg-photo" src="'+safe(photoUrl)+'" alt="Prévia da folha capturada">':'<div class="cg-empty cg-photo-placeholder"><strong>Fotografe a folha inteira</strong><p>Pinte a área circular com caneta azul ou preta. Use a folha padronizada com os quatro quadrados pretos nos cantos. Outros modelos exigem correção manual.</p></div>')+'</div>'+
   (photoUrl?'<div class="cg-toolbar">'+button('scan','Ler marcações automaticamente','primary')+button('ocr','Ler cabeçalho (OCR)')+'</div>':'')+
   '<p id="cgScanStatus" class="cg-note" role="status">'+safe(scanStatus||'Pinte a região circular inteira com caneta azul ou preta. Riscos, marcações duplas e bolhas incompletas ficam para revisão.')+'</p></div>'+
   '<form id="cgResultForm" class="cg-panel cg-form"><div class="cg-subhead"><h3>Identificação do aluno</h3><small>Confirme os dados capturados. O nome manuscrito pode precisar de ajuste.</small></div>'+
   '<div class="cg-form-grid"><label>Nome do aluno<input name="name" required maxlength="130" value="'+safe(r.name)+'" placeholder="Nome completo"></label>'+
   '<label>Número / chamada<input name="number" maxlength="30" value="'+safe(r.number)+'" placeholder="Ex.: 12"></label>'+
   '<label>Data da prova<input name="date" type="date" required value="'+safe(r.date)+'"></label>'+
   '<label>Série / ano<input value="'+safe(t.grade)+'" readonly></label>'+
   '<label>Disciplina<input value="'+safe(t.subject)+'" readonly></label>'+
   '<label>Avaliação<input value="'+safe(t.title)+'" readonly></label></div>'+
   '<div class="cg-subhead"><h3>Respostas do aluno</h3><span id="cgReviewedCount"></span></div>'+
   '<div class="cg-note">Escolha a letra marcada, “Em branco” quando não houver marcação ou “Revisar” quando a captura estiver duvidosa. Questões em revisão impedem o fechamento.</div>'+
   '<div id="cgResultGrid">'+answersEditor(r.answers,t.questionCount,t.options,'result')+'</div>'+
   '<div class="cg-review-bar" id="cgScorePreview"></div>'+
   '<div id="cgVerification" class="cg-verification" role="status" aria-live="polite"></div>'+
   '<div class="cg-toolbar">'+button('confirm-reading','✓ Confirmar leitura completa','primary')+'<button id="cgSaveCorrection" type="submit" class="cg-btn primary" disabled>Salvar correção</button>'+button('clear-result','Limpar respostas')+'</div></form>';
  $('#cgResultGrid',container).querySelectorAll('select').forEach(x=>x.value=r.answers[Number(x.dataset.index)]||'?');
  updatePreview();
 }

 function syncResultForm(){
  const form=container&&$('#cgResultForm',container);
  if(!form||!result)return;
  result.name=String(form.elements.name.value||'').trim();
  result.number=String(form.elements.number.value||'').trim();
  result.date=String(form.elements.date.value||'');
 }
 // Não é uma confirmação automática do OCR: depende da conferência explícita do docente.
 function verificationState(){
  const t=selectedTest(),r=result;
  if(!t||!r)return {missing:['Avaliação'],pending:0,signature:''};
  const missing=[];
  if(!String(r.name||'').trim())missing.push('nome do aluno');
  if(!String(r.number||'').trim())missing.push('número/chamada');
  const date=String(r.date||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date)))missing.push('data da prova');
  if(!String(t.grade||'').trim())missing.push('série');
  if(!String(t.subject||'').trim())missing.push('disciplina');
  const answers=Array.isArray(r.answers)?r.answers:[];
  const allowed=['A','B','C','D','E'].slice(0,t.options);
  const pending=Array.from({length:t.questionCount},(_,i)=>answers[i]).filter(a=>!allowed.includes(a)&&a!=='-').length;
  if(pending)missing.push(pending+' questão(ões) para revisar');
  const signature=JSON.stringify([t.id,r.id,String(r.name||'').trim(),String(r.number||'').trim(),date,t.grade,t.subject,t.title,answers]);
  return {missing,pending,signature,ready:missing.length===0,confirmed:missing.length===0&&confirmedSignature===signature};
 }
 function announceReadingComplete(){
  // APIs opcionais: sem vibração/áudio o aviso visual permanece funcional.
  try{navigator.vibrate?.([120,70,120])}catch{}
  let spoken=false;
  try{
   if('speechSynthesis' in window&&typeof window.SpeechSynthesisUtterance==='function'){
    const u=new window.SpeechSynthesisUtterance('Leitura completa. Todos os campos foram conferidos. Pode salvar a correção.');
    u.lang='pt-BR';u.rate=1;u.volume=0.95;
    window.speechSynthesis.cancel();window.speechSynthesis.speak(u);spoken=true;
   }
  }catch{}
  if(!spoken){
   try{
    const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)return;
    const context=new Audio(),osc=context.createOscillator(),gain=context.createGain();
    osc.type='sine';osc.frequency.value=850;gain.gain.value=0.045;
    osc.connect(gain);gain.connect(context.destination);
    osc.start();osc.stop(context.currentTime+.18);
    osc.onended=()=>{void context.close().catch(()=>{})};
   }catch{}
  }
 }
 function updatePreview(){
  const t=selectedTest();if(!t||!result||view!=='capture')return;
  const pending=result.answers.filter(a=>a==='?').length,correct=result.answers.filter((a,i)=>a!=='?'&&a===t.key[i]).length;
  const score=(correct/t.questionCount*t.maxScore).toLocaleString('pt-BR',{maximumFractionDigits:2});
  const p=$('#cgScorePreview',container),c=$('#cgReviewedCount',container);
  if(c)c.textContent=(t.questionCount-pending)+' / '+t.questionCount+' conferidas';
  if(p)p.textContent=pending?pending+' questão(ões) ainda precisam de revisão. Acertos confirmados: '+correct+'.':'Resultado conferido: '+correct+' acertos · Nota '+score+' / '+t.maxScore+'.';
  syncResultForm();
  const status=verificationState(),box=$('#cgVerification',container),confirm=$('[data-cg="confirm-reading"]',container),save=$('#cgSaveCorrection',container);
  if(confirm)confirm.disabled=!status.ready;
  if(save)save.disabled=!status.confirmed;
  if(box){
   box.className='cg-verification '+(status.confirmed?'is-confirmed':status.ready?'is-ready':'is-pending');
   box.textContent=status.confirmed
    ?'✓ Leitura de todos os campos confirmada: nome, número, data, série, disciplina e '+t.questionCount+' respostas. Celular sinalizado. Correção liberada para salvar.'
    :status.ready?'Todos os campos estão preenchidos. Confira os dados e toque em “Confirmar leitura completa” para receber o sinal no celular.'
     :'Conferência pendente — falta verificar: '+status.missing.join(', ')+'.';
  }
 }
 async function requestSave(operation,payload){
  const current=revision;
  busy=true;
  try{
   const r=await api('gradebook',{operation,...payload});
   if(current!==revision)return false;
   items=r.tests||[];loaded=true;error='';notify('Alterações salvas na sua conta.');return true;
  }catch(e){
   if(current===revision)notify(e.message||'Não foi possível salvar.');
   return false;
  }finally{if(current===revision)busy=false}
 }
 async function refresh(){
  if(loading)return;
  const current=revision;
  loading=true;error='';draw();
  try{
   const r=await api('gradebook');
   if(current!==revision)return;
   items=Array.isArray(r.tests)?r.tests:[];loaded=true;
  }catch(e){
   if(current===revision)error=e.message||'Não foi possível carregar os gabaritos.';
  }finally{
   if(current===revision){loading=false;draw()}
  }
 }
 function changeView(next){view=next;draw()}
 function escapeCSV(v){let s=String(v??'');if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
 function downloadCSV(name,rows){
  const data='\ufeff'+rows.map(row=>row.map(escapeCSV).join(';')).join('\r\n');
  const blob=new Blob([data],{type:'text/csv;charset=utf-8'}),a=document.createElement('a'),url=URL.createObjectURL(blob);
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
 }
 function reportRows(t){return [
  ['Nº','Aluno','Data','Série','Turma','Disciplina','Avaliação','Acertos','Erros','Em branco','Nota','Valor da prova',...t.key.map((_,i)=>'Q'+(i+1))],
  ...t.results.map(r=>[r.number,r.name,formatDate(r.date),t.grade,t.className,t.subject,t.title,r.correct,r.wrong,r.blank,r.score,t.maxScore,...r.answers])
 ]}
 function reportPrint(t){
  const rows=t.results.map(r=>'<tr><td>'+safe(r.number||'')+'</td><td>'+safe(r.name)+'</td><td>'+r.correct+'</td><td>'+r.wrong+'</td><td>'+r.blank+'</td><td>'+scoreOf(t,r)+'</td></tr>').join('');
  printDocument('Relatório de Correção — '+t.title,'<h1>Relatório de correção</h1>'+
   '<p><strong>'+safe(t.title)+'</strong> · '+safe(t.subject)+' · '+safe(t.grade)+' · '+safe(t.className||'')+' · '+formatDate(t.date)+'</p>'+
   '<p>Questões: '+t.questionCount+' · Valor da prova: '+t.maxScore+' · Alunos: '+t.results.length+'</p>'+
   '<table><thead><tr><th>Nº</th><th>Aluno</th><th>Acertos</th><th>Erros</th><th>Brancos</th><th>Nota</th></tr></thead><tbody>'+rows+'</tbody></table>'+
   '<p><strong>Gabarito oficial:</strong> '+t.key.map((x,i)=>(i+1)+':'+x).join(' · ')+'</p>');
 }
 function printDocument(title,body){
  const popup=window.open('','_blank');if(!popup){notify('Permita pop-ups para imprimir ou salvar como PDF.');return}
  popup.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>'+safe(title)+'</title><style>@page{size:A4;margin:14mm}body{font:12px Arial;color:#192f47}h1{font-size:22px;color:#183b62;margin-bottom:10px}table{border-collapse:collapse;width:100%;margin:20px 0}th,td{border:1px solid #cad4dd;padding:7px;text-align:left}th{background:#ebf1f8}p{line-height:1.65}</style></head><body><small>COLÉGIO CORA CORALINA · EQUIPE PEDAGÓGICA</small>'+body+'</body></html>');
  popup.document.close();popup.focus();setTimeout(()=>popup.print(),350);
 }
 function printableSheet(t){
  const n=t.questionCount;
  const square=(x,y)=>'<rect x="'+(x-18)+'" y="'+(y-18)+'" width="36" height="36" fill="#050505"/>';
  const tags=['Nome','Data','Série','Disciplina','Número'].map((label,i)=>'<text x="120" y="'+(176+i*37)+'" font-family="Arial" font-size="23" fill="#151515">'+label+':</text><line x1="'+(label==='Disciplina'?255:206)+'" y1="'+(184+i*37)+'" x2="886" y2="'+(184+i*37)+'" stroke="#555" stroke-width="1.5"/>').join('');
  const marks=Array.from({length:n},(_,i)=>{
   const col=Math.floor(i/30),row=i%30,base=col?655:185,y=394+row*29;
   return '<text x="'+base+'" y="'+(y+7)+'" font-family="Arial" font-size="21">'+String(i+1).padStart(2,'0')+'</text>'+
    letters.slice(0,t.options).map((a,j)=>'<circle cx="'+(base+65+j*43)+'" cy="'+y+'" r="12" fill="white" stroke="#121212" stroke-width="3"/>').join('');
  }).join('');
  const headings=[185,655].map(base=>letters.slice(0,t.options).map((letter,j)=>
   '<text x="'+(base+65+j*43)+'" y="367" text-anchor="middle" font-family="Arial" font-size="19" font-weight="bold">'+letter+'</text>').join('')).join('');
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1414" width="100%" style="display:block;margin:0 auto;max-height:270mm" aria-label="Folha de respostas padronizada">'+
   '<rect width="1000" height="1414" fill="white"/>'+square(65,65)+square(935,65)+square(65,1349)+square(935,1349)+
   '<text x="500" y="101" text-anchor="middle" font-family="Arial" font-size="28" font-weight="bold">COLÉGIO CORA CORALINA</text>'+
   '<text x="500" y="131" text-anchor="middle" font-family="Arial" font-size="20">FOLHA DE RESPOSTAS • '+safe(t.title).slice(0,65)+'</text>'+
   tags+'<line x1="115" x2="887" y1="334" y2="334" stroke="#999"/>'+
   headings+marks+
   '<text x="120" y="1291" font-family="Arial" font-size="17">Pinte completamente uma bolha por questão com caneta azul ou preta.</text>'+
   '<text x="120" y="1320" font-family="Arial" font-size="16">Fotografe a folha inteira, incluindo os quatro quadrados pretos. Não dobre.</text></svg>';
  printDocument('Folha de respostas — '+t.title,svg);
 }
 function onClick(event){
  const el=event.target.closest('[data-cg]');if(!el||!container.contains(el))return;
  const [action,id]=el.dataset.cg.split(':');const t=selectedTest();
  if(action==='reload'){void refresh();return}
  if(action==='new-test'){draft=emptyDraft();changeView('edit');return}
  if(action==='list'){selected='';draft=null;result=null;resetPhoto();changeView('list');return}
  if(action==='open'){selected=id;changeView('test');return}
  if(action==='sheet'){const target=id?items.find(x=>x.id===id):t;if(target)printableSheet(target);return}
  if(action==='export-all'){const all=items.flatMap(test=>test.results.map(r=>[test.title,test.subject,test.grade,test.className,r.name,r.number,r.correct,r.wrong,r.blank,r.score,test.maxScore]));downloadCSV('resumo-gabaritos-cora.csv',[['Avaliação','Disciplina','Série','Turma','Aluno','Nº','Acertos','Erros','Brancos','Nota','Valor'],...all]);return}
  if(!t&&action!=='cancel-edit')return;
  if(action==='test'){resetPhoto();result=null;changeView('test')}
  else if(action==='capture'){setResult();changeView('capture')}
  else if(action==='edit-test'){draft={...t,key:t.key.slice()};changeView('edit')}
  else if(action==='cancel-edit'){draft=null;changeView(t?'test':'list')}
  else if(action==='csv')downloadCSV('correcao-'+t.title.replace(/[^a-z0-9]+/gi,'-')+'.csv',reportRows(t));
  else if(action==='print')reportPrint(t);
  else if(action==='review'){setResult(t.results.find(r=>r.id===id));changeView('capture')}
  else if(action==='confirm-reading'){
   syncResultForm();
   const status=verificationState();
   if(!status.ready){updatePreview();notify('Há campos pendentes. Confira todos antes de confirmar.');return}
   confirmedSignature=status.signature;
   updatePreview();announceReadingComplete();
   notify('✓ Leitura completa! Todos os campos foram conferidos.');
  }
  else if(action==='clear-result'){if(confirm('Limpar todas as respostas desta captura?')){result.answers.fill('?');updatePreview()}}
  else if(action==='scan')void scanPhoto();
  else if(action==='ocr')void scanHeader();
  else if(action==='delete-test'&&confirm('Excluir a avaliação e todas as correções da sua conta?')){void requestSave('delete-test',{testId:t.id}).then(ok=>{if(ok){selected='';changeView('list')}})}
  else if(action==='remove-result'&&confirm('Excluir esta correção de aluno?')){void requestSave('delete-result',{testId:t.id,resultId:id}).then(ok=>{if(ok)draw()})}
 }
 function onChange(event){
  const x=event.target;
  if(view==='capture'&&x.matches('[name="name"],[name="number"],[name="date"]'))updatePreview();
  if(x.matches('[data-cg-answer]')){
   const i=Number(x.dataset.index);
   if(x.dataset.cgAnswer==='key'&&draft)draft.key[i]=x.value==='?'?'':x.value;
   if(x.dataset.cgAnswer==='result'&&result){result.answers[i]=x.value;updatePreview()}
  }
  if(x.matches('[name="questionCount"],[name="options"]')&&draft){
   const form=$('#cgTestForm',container);const n=Math.max(1,Math.min(60,Number(form.elements.questionCount.value)||10));
   const op=Number(form.elements.options.value);draft.questionCount=n;draft.options=op;draft.key=Array.from({length:n},(_,i)=>letters.slice(0,op).includes(draft.key[i])?draft.key[i]:'');
   $('#cgKeyGrid',container).innerHTML=answersEditor(draft.key,n,op,'key');
   $('#cgKeyGrid',container).querySelectorAll('select').forEach(x=>x.value=draft.key[Number(x.dataset.index)]||'?');
  }
  if((x.id==='cgPhoto'||x.id==='cgUpload')&&x.files?.[0]){
   syncResultForm();confirmedSignature='';
   if(photoUrl)URL.revokeObjectURL(photoUrl);photoFile=x.files[0];photoUrl=URL.createObjectURL(photoFile);
   scanStatus='Imagem recebida. Clique em “Ler marcações automaticamente” e confira as respostas.';draw();
  }
 }
 async function onSubmit(event){
  if(!event.target.matches('#cgTestForm,#cgResultForm'))return;
  event.preventDefault();if(busy)return;
  if(event.target.id==='cgTestForm'){
   const f=event.target.elements;
   draft={...draft,title:f.title.value,subject:f.subject.value,grade:f.grade.value,className:f.className.value,
    date:f.date.value,questionCount:Number(f.questionCount.value),options:Number(f.options.value),maxScore:Number(f.maxScore.value)};
   if(draft.key.length!==draft.questionCount||draft.key.some(a=>!letters.slice(0,draft.options).includes(a))){notify('Marque a alternativa correta de todas as questões.');return}
   const ok=await requestSave('save-test',{test:draft});if(ok){selected=draft.id;draft=null;changeView('test')}
  }else{
   const t=selectedTest(),f=event.target.elements;
   syncResultForm();
   const status=verificationState();
   if(!status.ready||!status.confirmed){
    updatePreview();
    notify(status.ready?'Confirme a leitura completa antes de salvar.':'Confira todos os campos pendentes antes de salvar.');
    return;
   }
   const ok=await requestSave('save-result',{testId:t.id,result});if(ok){result=null;confirmedSignature='';resetPhoto();changeView('test')}
  }
 }
 function setStatus(message){scanStatus=message;const p=$('#cgScanStatus',container);if(p)p.textContent=message}
 async function loadPhoto(){
  if(!photoFile)throw Error('Primeiro capture uma imagem.');
  const img=new Image(),url=URL.createObjectURL(photoFile);
  try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});
   const canvas=document.createElement('canvas'),factor=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));
   canvas.width=Math.round(img.naturalWidth*factor);canvas.height=Math.round(img.naturalHeight*factor);
   canvas.getContext('2d',{willReadFrequently:true}).drawImage(img,0,0,canvas.width,canvas.height);
   return canvas;
  }finally{URL.revokeObjectURL(url)}
 }
 function locateMarks(data,w,h){
  const pixels=data.data,gray=new Uint8Array(w*h),visited=new Uint8Array(w*h);
  for(let i=0;i<gray.length;i++){const p=i*4;gray[i]=Math.round((pixels[p]*0.3+pixels[p+1]*0.59+pixels[p+2]*0.11));}
  const regions=[[0,0,.29,.24,.07,.05],[.71,0,1,.24,.93,.05],[0,.76,.29,1,.07,.95],[.71,.76,1,1,.93,.95]];
  const found=[];
  for(const [left,top,right,bottom,expectedX,expectedY] of regions){
   const x0=Math.floor(w*left),x1=Math.ceil(w*right),y0=Math.floor(h*top),y1=Math.ceil(h*bottom);
   let best=null,bestScore=-Infinity;
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    let pos=y*w+x;if(visited[pos]||gray[pos]>105)continue;
    const stack=[pos];visited[pos]=1;let count=0,minX=x,maxX=x,minY=y,maxY=y;
    while(stack.length){
     const at=stack.pop(),cx=at%w,cy=Math.floor(at/w);
     count++;minX=Math.min(minX,cx);maxX=Math.max(maxX,cx);minY=Math.min(minY,cy);maxY=Math.max(maxY,cy);
     for(const nb of [at-1,at+1,at-w,at+w]){
      if(nb<0||nb>=gray.length)continue;
      const nx=nb%w,ny=Math.floor(nb/w);
      if(nx<x0||nx>=x1||ny<y0||ny>=y1||Math.abs(nx-cx)+Math.abs(ny-cy)!==1||visited[nb]||gray[nb]>105)continue;
      visited[nb]=1;stack.push(nb);
     }
    }
    const ww=maxX-minX+1,hh=maxY-minY+1,fill=count/(ww*hh);
    if(ww<w*.013||hh<h*.009||ww>w*.085||hh>h*.09||fill<.73||Math.abs(ww-hh)/Math.max(ww,hh)>.38)continue;
    const cx=(minX+maxX)/2,cy=(minY+maxY)/2;
    const distance=Math.hypot((cx/w-expectedX),cy/h-expectedY);
    const score=fill*3-distance*3+Math.min(ww/w,hh/h)*5;
    if(score>bestScore){bestScore=score;best={x:cx,y:cy}}
   }
   if(!best)throw Error('Os quatro marcadores da folha não ficaram visíveis. Aproxime a câmera sem cortar as bordas ou preencha manualmente.');
   found.push(best);
  }
  return found;
 }
 // Reconhecimento óptico por preenchimento da área circular interna (azul ou preto).
 // O círculo impresso e pequenos riscos não contam como preenchimento completo.
 function scanMarks(data,marks,w,h,t){
  const [tl,tr,bl,br]=marks,read=[];
  const position=(x,y)=>{const u=(x-65)/870,v=(y-65)/1284;
   return {x:(1-u)*(1-v)*tl.x+u*(1-v)*tr.x+(1-u)*v*bl.x+(u*v)*br.x,
    y:(1-u)*(1-v)*tl.y+u*(1-v)*tr.y+(1-u)*v*bl.y+(u*v)*br.y}};
  const light=(r,g,b)=>.2126*r+.7152*g+.0722*b;
  const pixel=(x,y)=>{
   const pos=position(x,y),px=Math.round(pos.x),py=Math.round(pos.y);
   if(px<0||px>=w||py<0||py>=h)return null;
   const off=(py*w+px)*4;
   return [data.data[off],data.data[off+1],data.data[off+2]];
  };
  const covered=(cx,cy)=>{
   // Mediana do papel externo à bolha: adapta-se a variações de iluminação.
   const surroundings=[[17,0],[-17,0],[0,16],[0,-16],[17,9],[-17,-9]]
    .map(([dx,dy])=>pixel(cx+dx,cy+dy)).filter(Boolean)
    .map(rgb=>light(...rgb)).sort((x,y)=>x-y);
   if(surroundings.length<3)return null;
   const paper=surroundings[Math.floor(surroundings.length/2)];
   let ink=0,total=0;
   // Raio 7, distante do contorno impresso de raio 12.
   for(let dy=-7;dy<=7;dy+=2)for(let dx=-7;dx<=7;dx+=2){
    if(dx*dx+dy*dy>49)continue;
    const rgb=pixel(cx+dx,cy+dy);
    if(!rgb)continue;
    const [r,g,b]=rgb,L=light(r,g,b);
    const blue=b>=r+19&&b>=g+7&&r<215&&g<220;
    const dark=L<Math.min(190,paper-36);
    const blueInk=blue&&L<Math.min(229,paper-24);
    if(dark||blueInk)ink++;
    total++;
   }
   return total>=25?ink/total:null;
  };
  for(let i=0;i<t.questionCount;i++){
   const column=Math.floor(i/30),row=i%30,base=column?655:185,y=394+row*29;
   const ratios=letters.slice(0,t.options).map((_,j)=>covered(base+65+j*43,y));
   if(ratios.some(v=>v===null)){read.push('?');continue}
   const marked=ratios.map((value,index)=>({value,index})).filter(x=>x.value>=.16);
   if(marked.length===0)read.push('-');
   else if(marked.length===1&&marked[0].value>=.56)read.push(letters[marked[0].index]);
   else read.push('?'); // cruz, preenchimento incompleto ou dupla marcação
  }
  return read;
 }
 async function scanPhoto(){
  if(busy)return;syncResultForm();confirmedSignature='';busy=true;setStatus('Analisando a posição das marcações na foto...');
  try{
   const c=await loadPhoto(),ctx=c.getContext('2d',{willReadFrequently:true}),data=ctx.getImageData(0,0,c.width,c.height);
   const marks=locateMarks(data,c.width,c.height),answers=scanMarks(data,marks,c.width,c.height,selectedTest());
   result.answers=answers;scanStatus='Leitura das bolhas concluída: '+answers.filter(a=>a!=='?'&&a!=='-').length+' marcações identificadas. Confira cada item antes de salvar.';
   draw();
  }catch(e){setStatus('Leitura automática não concluída: '+e.message+' Você pode registrar as respostas manualmente.')}
  finally{busy=false}
 }
 async function scanHeader(){
  if(busy)return;syncResultForm();confirmedSignature='';busy=true;setStatus('Lendo o cabeçalho no próprio aparelho...');
  try{
   if(!window.Tesseract){
    const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=()=>reject(Error('Leitor OCR indisponível sem conexão.'));document.head.append(script)});
   }
   const c=await loadPhoto(),crop=document.createElement('canvas');crop.width=c.width;crop.height=Math.max(100,Math.floor(c.height*.29));
   crop.getContext('2d').drawImage(c,0,0,c.width,crop.height,0,0,c.width,crop.height);
   const output=await window.Tesseract.recognize(crop,'por');
   const text=String(output?.data?.text||'');
   const name=text.match(/(?:nome|aluno\s*(?:\(a\))?)\s*[:\-]\s*([^\r\n]+)/i),number=text.match(/(?:n[úu]mero|n[ºo°]|chamada)\s*[:\-]\s*(\d{1,4})/i);
   const date=text.match(/(?:data)\s*[:\-]\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i);
   if(name)result.name=name[1].trim().slice(0,130);
   if(number)result.number=number[1];
   if(date)result.date=date[3]+'-'+date[2].padStart(2,'0')+'-'+date[1].padStart(2,'0');
   scanStatus=(name||number||date)?'Cabeçalho identificado parcialmente. Confira nome, número e data.':'Não encontrei campos legíveis no cabeçalho. Digite os dados manualmente.';
   draw();
  }catch(e){setStatus('Leitura do cabeçalho indisponível: '+e.message+'. Digite os dados para continuar.')}
  finally{busy=false}
 }
 function mount({root,callApi,toast,profile}){
  const next=String(profile?.email||profile?.id||'');
  if(!next||identity&&identity!==next)reset();
  if(next)identity=next;
  api=callApi;notify=toast;teacher=profile?.name||'Professor';container=$('#coraGrader',root);
  if(!container)return;
  container.onclick=onClick;container.onchange=onChange;container.oninput=e=>{if(view==='capture'&&e.target.matches('[name="name"],[name="number"],[name="date"]'))updatePreview()};container.onsubmit=e=>{void onSubmit(e)};
  if(!loaded){void refresh()}else draw();
 }
 window.CoraGrader={mount,reset,placeholder:()=>'<div id="coraGrader" class="cora-grader"><div class="cg-panel"><p>Carregando corretor de gabaritos...</p></div></div>'};
})();