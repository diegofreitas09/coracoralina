/* Planejamento pedagógico para reuniões - Colégio Cora Coralina, 2026. */
(() => {
  'use strict';
  const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  let YEAR=window.CoraYears?.activeYear||2026;
  let STORAGE=`cora_planejamento_${YEAR}_v1`;
  let EVENT_STORAGE=`cora_calendario_eventos_${YEAR}_v1`;
  const $=id=>document.getElementById(id);
  const form=$('planningForm');if(!form)return;
  const sample={
    segment:'Fundamental II e Ensino Médio',meetingDate:'2026-10-31',meetingTime:'7h30',meetingPlace:'Colégio Cora Coralina',coordinator:'Equipe de Gestão e Coordenação',
    projects:'Projeto Valores – Paz\nProjeto Arte Colorindo a Educação – Artes Natalinas\nProjeto Dó Ré Mi – Músicas Natalinas\nFeira do Empreendedor – 4º ano ao Ensino Médio\nFestival Natalino – Vila do Papai Noel',
    schedule:'02/11 – Dia de Finados (feriado)\n03/11 – Início dos ensaios ABC\n05/11 – Dia da Ciência e da Cultura\n06/11 – Reunião Escola e Família e entrega de resultados da 3ª etapa, às 18h30, na quadra\n10/11 – Dia Nacional da Declaração dos Direitos Humanos\n12/11 – Aula da Virada, Infantil V e 5º ano\n12/11 – Dia do Diretor da Escola e do Psicopedagogo\n12/11 – Projeto Valores: Paz\n12 a 19/11 – Revisão das provas da 4ª etapa e fechamento dos livros\n13/11 – Entrega de relatórios à coordenação\n14/11 – Feira do Empreendedor\n15/11 – Proclamação da República (feriado)\n19/11 – Dia da Bandeira e conclusão do Livro 04\n19 e 20/11 – Simulado SAE (conferir conflito com o feriado de 20/11)\n20/11 – Dia da Consciência Negra (feriado)\n23 a 27/11 – Avaliações diagnósticas da 4ª etapa\n27/11 – Confraternização de Ação de Graças na Educação Infantil\n28/11 – Confraternização de Ação de Graças do Fundamental ao Médio',
    guidance:'Verificar os conteúdos trabalhados e assegurar o fechamento de todas as áreas, sem pendências ao final do ano.\nNão deixar páginas em branco nos livros, blocos e cadernos; realizar correções e incentivar as turmas.\nConferir fechamento do Livro 04, avaliações, relatórios e revisão para a 4ª etapa.\nRevisar conflitos de datas e informações da programação antes da divulgação.',
    agenda:'Alinhamento do calendário de novembro\nFechamento de conteúdos, livros e registros pedagógicos\nRevisão e avaliações da 4ª etapa\nFeira do Empreendedor e projetos natalinos\nEntrega de resultados, relatórios e comunicação com as famílias',
    actions:'Conferir datas e horários ainda sujeitos à validação.\nDefinir responsáveis por cada projeto, ensaio e comunicado.\nAlinhar prazos de avaliações, relatórios e registros.',
    birthdays:'Nadja – 01/11; Prof. Emanuel e Ana Paula – 10/11; Aparecida e Mikael – 16/11; Mendonça – 21/11; Ruth – 25/11; John – 26/11.\nDezembro: Diego – 09/12; Breno – 11/12; Renan – 24/12.',
    closing:'Agradecemos a dedicação da equipe. Nosso compromisso coletivo transforma a aprendizagem e fortalece a parceria entre escola e família.',includeCalendar:true
  };
  const emptyPlan={segment:sample.segment,meetingDate:'',meetingTime:'',meetingPlace:'',coordinator:'Equipe de Gestão e Coordenação',projects:'',schedule:'',guidance:'',agenda:'Alinhamento pedagógico\nAvaliações e registros\nOrganização dos próximos eventos',actions:'',birthdays:'',closing:'Contamos com o compromisso e a colaboração de toda a equipe.',includeCalendar:true};
  let plans={};let current=10;let saveDelay;
  const fields=['segment','meetingDate','meetingTime','meetingPlace','coordinator','projects','schedule','guidance','agenda','actions','birthdays','closing','includeCalendar'];
  function lines(str){return String(str||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean)}
  function eventsFor(month){try{let events=JSON.parse(localStorage.getItem(EVENT_STORAGE)||'[]');return Array.isArray(events)?events.filter(e=>String(e.date||'').startsWith(`${YEAR}-${String(month+1).padStart(2,'0')}-`)).sort((a,b)=>a.date.localeCompare(b.date)):[]}catch{return []}}
  function readStorage(){try{const obj=JSON.parse(localStorage.getItem(STORAGE)||'{}');plans=obj && typeof obj==='object'&&!Array.isArray(obj)?obj:{}}catch{plans={}}}
  function defaults(month){return {...(YEAR===2026&&month===10?sample:emptyPlan)}}
  function initMonth(month){if(!plans[month])plans[month]=defaults(month);return plans[month]}
  function store(){try{localStorage.setItem(STORAGE,JSON.stringify(plans));$('planningSaveStatus').textContent='Alterações salvas automaticamente';}catch{$('planningSaveStatus').textContent='Não foi possível salvar no dispositivo';}}
  function readForm(){const obj={};for(const field of fields){const el=form.elements.namedItem(field);obj[field]=field==='includeCalendar'?Boolean(el.checked):el.value;}return obj}
  function fillForm(month){const obj=initMonth(month);for(const field of fields){const el=form.elements.namedItem(field);if(el)field==='includeCalendar'?el.checked=obj[field]!==false:el.value=obj[field]||''}current=month;$('planMonth').value=String(month);renderSummary()}
  function renderSummary(){const obj=readForm(),e=obj.includeCalendar?eventsFor(current):[];$('planPreviewMonth').textContent=MONTHS[current];$('planPreviewSegment').textContent=obj.segment;$('planProjectCount').textContent=lines(obj.projects).length;$('planScheduleCount').textContent=lines(obj.schedule).length;$('planCalendarCount').textContent=e.length;$('planPreviewAgenda').replaceChildren(...lines(obj.agenda).slice(0,7).map(value=>{const d=document.createElement('div');d.textContent=value;return d}));}
  function saveCurrent(){plans[current]=readForm();store();renderSummary()}
  function alertUser(msg){const toast=$('toast');if(toast){toast.textContent=msg;toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),4500)}else alert(msg)}
  function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),8000)}
  function startImage(url){return new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=url||''})}
  async function pdfLibrary(){if(window.PDFLib)return window.PDFLib;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';s.onload=resolve;s.onerror=()=>reject(Error('Biblioteca PDF indisponível'));document.head.append(s)});return window.PDFLib}
  async function buildDocument(month,plan){
    const W=1240,H=1754,LEFT=90,RIGHT=1150,BOTTOM=1615,BLUE='#092e60',GOLD='#ffc928',INK='#153b67',MUTED='#536d86';
    const pages=[];let page,g,y,pageNum=0;
    const logo=await startImage(window.CORA_STUDIO_ASSETS?.logo);
    function rrect(x,z,w,h,r,fill){g.fillStyle=fill;g.beginPath();g.roundRect(x,z,w,h,r);g.fill()}
    function t(value,x,z,size,color=INK,weight='normal'){g.fillStyle=color;g.font=`${weight} ${size}px Arial, sans-serif`;g.fillText(String(value),x,z)}
    function newPage(){page=document.createElement('canvas');page.width=W;page.height=H;g=page.getContext('2d');pageNum++;pages.push(page);g.fillStyle='#fff';g.fillRect(0,0,W,H);rrect(0,0,W,17,0,BLUE);rrect(0,17,W,7,0,GOLD);if(logo)g.drawImage(logo,LEFT,52,110,140);else t('CORA',LEFT,100,39,BLUE,'bold');t('COLÉGIO CORA CORALINA',225,92,30,BLUE,'bold');t('PLANEJAMENTO PEDAGÓGICO · '+YEAR,225,134,22,MUTED,'bold');g.fillStyle='#d9e6f0';g.fillRect(LEFT,206,RIGHT-LEFT,2);y=243}
    function wrap(value,width,size,weight='normal') {g.font=`${weight} ${size}px Arial, sans-serif`;const paras=String(value).split('\n');let out=[];for(const par of paras){if(!par.trim()){out.push('');continue;}let line='';for(let word of par.split(/\s+/)){if(!word)continue;while(g.measureText(word).width>width&&word.length>1){let index=1;while(index<word.length&&g.measureText(word.slice(0,index+1)).width<=width)index++;if(line){out.push(line);line=''}out.push(word.slice(0,index));word=word.slice(index)}const candidate=line?line+' '+word:word;if(g.measureText(candidate).width>width&&line){out.push(line);line=word}else line=candidate}if(line)out.push(line)}return out}
    function room(px){if(y+px>BOTTOM)newPage()}
    function paragraph(textvalue,{size=24,color=INK,indent=0,bold=false,gap=12}={}){const l=wrap(textvalue,RIGHT-LEFT-indent,size,bold?'bold':'normal');for(const line of l){room(size+21);t(line,LEFT+indent,y+size,size,color,bold?'bold':'normal');y+=size+11}y+=gap}
    function section(title,values){const arr=Array.isArray(values)?values:lines(values);if(!arr.length)return;room(110);rrect(LEFT,y,RIGHT-LEFT,48,8,'#eaf2fa');rrect(LEFT,y,11,48,5,GOLD);t(title.toUpperCase(),LEFT+30,y+34,22,BLUE,'bold');y+=68;for(const value of arr){room(42);rrect(LEFT+6,y+14,8,8,4,GOLD);paragraph(value,{indent:27,size:23,gap:9})}y+=16}
    newPage();
    t(`Planejamento de ${MONTHS[month]} de ${YEAR}`,LEFT,y+52,45,BLUE,'bold');y+=74;
    paragraph(plan.segment,{size:27,color:MUTED,gap:16});
    const fmt=s=>/^\d{4}-\d\d-\d\d$/.test(s||'')?s.split('-').reverse().join('/'):'Não informada';
    room(122);rrect(LEFT,y,RIGHT-LEFT,112,15,'#edf4fb');t('REUNIÃO COM A EQUIPE',LEFT+22,y+37,21,BLUE,'bold');t(`Data: ${fmt(plan.meetingDate)}    •    Horário: ${plan.meetingTime||'A definir'}`,LEFT+22,y+73,23,INK);t(`Local: ${plan.meetingPlace||'A definir'}    •    Coordenação: ${plan.coordinator||'Equipe gestora'}`,LEFT+22,y+98,17,MUTED);y+=148;
    section('Projetos e ações institucionais',plan.projects);
    section('Programação mensal e datas importantes',plan.schedule);
    if(plan.includeCalendar){const ev=eventsFor(month).map(event=>`${event.date.slice(8,10)}/${event.date.slice(5,7)} – ${event.title}${event.notes?' — '+event.notes:''}`);section('Eventos cadastrados no calendário',ev)}
    section('Orientações pedagógicas',plan.guidance);
    section('Pauta da reunião',plan.agenda);
    section('Encaminhamentos e responsabilidades',plan.actions);
    section('Aniversariantes e comunicados',plan.birthdays);
    section('Mensagem de encerramento',plan.closing);
    room(150);y+=16;g.fillStyle='#dce6ef';g.fillRect(LEFT,y,RIGHT-LEFT,2);y+=42;t('Responsável pela reunião:',LEFT,y,21,INK,'bold');g.strokeStyle='#b8c7d7';g.lineWidth=2;g.beginPath();g.moveTo(LEFT+340,y+6);g.lineTo(RIGHT,y+6);g.stroke();
    for(let i=0;i<pages.length;i++){const p=pages[i],ctx=p.getContext('2d');ctx.fillStyle='#e7edf3';ctx.fillRect(LEFT,1661,RIGHT-LEFT,2);ctx.font='bold 17px Arial';ctx.fillStyle=MUTED;ctx.fillText(`CORA CORALINA · PLANEJAMENTO DE ${MONTHS[month].toUpperCase()} ${YEAR}`,LEFT,1697);ctx.fillText(`${i+1} / ${pages.length}`,1080,1697)}
    return window.CoraPDF.fromCanvases(pages,{pageWidth:595.28,pageHeight:841.89,title:`Planejamento ${MONTHS[month]} ${YEAR}`});
  }
  function fallbackPrint(plan,month){const box=document.createElement('section');box.id='planningPrint';box.innerHTML=`<h1>COLÉGIO CORA CORALINA</h1><h2>Planejamento de ${MONTHS[month]} de ${YEAR}</h2><p>${safe(plan.segment)}</p>`+[['Projetos',plan.projects],['Datas',plan.schedule],['Orientações pedagógicas',plan.guidance],['Pauta',plan.agenda],['Encaminhamentos',plan.actions],['Aniversariantes',plan.birthdays]].map(([label,txt])=>`<h3>${label}</h3><ul>${lines(txt).map(v=>`<li>${safe(v)}</li>`).join('')}</ul>`).join('');document.body.append(box);let style=document.getElementById('planningPrintStyle');if(!style){style=document.createElement('style');style.id='planningPrintStyle';style.textContent='@media screen{#planningPrint{display:none}}@media print{body>*:not(#planningPrint){display:none!important}#planningPrint{display:block!important;padding:18mm;color:#14385e;font:12pt Arial}#planningPrint h3{break-after:avoid}#planningPrint li{margin:8px 0}}';document.head.append(style)}window.addEventListener('afterprint',()=>box.remove(),{once:true});window.print()}
  const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  $('planMonth').innerHTML=MONTHS.map((x,i)=>`<option value="${i}">${x} de ${YEAR}</option>`).join('');
  readStorage();fillForm(current);
  $('planMonth').addEventListener('change',()=>{saveCurrent();fillForm(Number($('planMonth').value));});
  form.addEventListener('input',()=>{clearTimeout(saveDelay);saveDelay=setTimeout(saveCurrent,200)});
  form.addEventListener('change',()=>{clearTimeout(saveDelay);saveCurrent()});
  $('loadNovemberPlan').addEventListener('click',()=>{if(current!==10){$('planMonth').value='10';saveCurrent();fillForm(10)}if(confirm('Repor o modelo de novembro? Isto substituirá apenas os campos deste mês.')){plans[10]={...sample};fillForm(10);store()}});
  $('downloadPlanning').addEventListener('click',async()=>{saveCurrent();const btn=$('downloadPlanning');btn.disabled=true;btn.textContent='Gerando planejamento...';try{const blob=await buildDocument(current,readForm());download(blob,`Planejamento_Reuniao_Cora_${MONTHS[current]}_${YEAR}.pdf`);alertUser('Planejamento gerado e baixado em PDF.')}catch(error){console.error(error);alertUser('PDF direto indisponível. Selecione “Salvar como PDF” na janela de impressão.');fallbackPrint(readForm(),current)}finally{btn.disabled=false;btn.textContent='↓ Baixar planejamento em PDF'}});
  $('jumpPlanning').addEventListener('click',()=>$('planningStudio').scrollIntoView({behavior:'smooth',block:'start'}));
  window.addEventListener('cora-backup-restored',()=>{readStorage();fillForm(current)});
  window.addEventListener('cora-year-changed',e=>{
    saveCurrent();YEAR=Number(e.detail.year);STORAGE=`cora_planejamento_${YEAR}_v1`;
    EVENT_STORAGE=`cora_calendario_eventos_${YEAR}_v1`;readStorage();
    $('planMonth').innerHTML=MONTHS.map((x,i)=>`<option value="${i}">${x} de ${YEAR}</option>`).join('');
    fillForm(current);
  });
})();