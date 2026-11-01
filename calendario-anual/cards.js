/* Editor de cards — identidade visual do Colégio Cora Coralina. */
(() => {
  'use strict';
  let ACTIVE_YEAR=window.CoraYears?.activeYear||2026;
  let ID=`cora_cards_${ACTIVE_YEAR}_v1`;
  const NAVY='#082d5c',DARK='#062246',BLUE='#0778c4',GOLD='#ffcc22',WHITE='#ffffff',INK='#0c315f';
  const $=id=>document.getElementById(id),form=$('cardForm'),canvas=$('studioCardCanvas');if(!form||!canvas)return;
  const ctx=canvas.getContext('2d'),W=1080,H=1350;
  const DEFAULTS={
    comunicado:{title:'COMUNICADO IMPORTANTE',subtitle:'Feriados de novembro de 2026',body:'Prezadas famílias, confira os feriados e as datas especiais do calendário escolar deste mês:',items:'02/11 – Finados\n15/11 – Proclamação da República\n20/11 – Dia da Consciência Negra',month:'11',date:'',time:'Calendário escolar · 2026',place:'Para informações, consulte a coordenação.',footer:'Colégio Cora Coralina'},
    solidaria:{title:'DOE BRINQUEDOS E LIVROS INFANTIS',subtitle:'Campanha Solidária',body:'Compartilhe alegria e novas histórias! Sua doação pode transformar o dia de uma criança.',items:'Brinquedos novos, seminovos e usados em bom estado\nLivros infantis em bom estado de conservação',date:'16/10/2026',time:'Prazo para doações',place:'Entregar na escola',footer:'Colégio Cora Coralina'},
    reuniao:{title:'REUNIÃO ESCOLA E FAMÍLIA',subtitle:'ENTREGA DE RESULTADOS',body:'Um momento importante para conversarmos sobre o desenvolvimento dos nossos alunos e fortalecermos a parceria entre escola e família.',items:'',date:'06/11/2026',time:'18h30',place:'Quadra da escola',footer:'Contamos com a sua presença!'},
    cronograma:{title:'CRONOGRAMA GERAL DE AVALIAÇÕES',subtitle:'NOVEMBRO DE 2026',body:'Avaliações, simulados, sondagens e provas regulares do calendário escolar.',items:'19/11/2026 | Simulado 04 — início\n23/11/2026 | Avaliações globais e sondagens — 4ª etapa\n24/11/2026 | Avaliações globais e sondagens — 4ª etapa\n25/11/2026 | Avaliações globais e sondagens — 4ª etapa\n26/11/2026 | Avaliações globais e sondagens — 4ª etapa\n27/11/2026 | Avaliações globais e sondagens — 4ª etapa',month:'11',date:'',time:'',place:'',footer:'Colégio Cora Coralina · Cronograma geral 2026'},
    avaliacao:{title:'AVALIAÇÃO 2ª CHAMADA',subtitle:'3ª SÉRIE · ENSINO MÉDIO',body:'AP2 – 4ª ETAPA DE 2026',items:'03/11/2026 | História, Literatura e Sociologia\n04/11/2026 | Português e Produção Textual\n05/11/2026 | Química e Biologia\n06/11/2026 | Matemática e Geografia\n09/11/2026 | Inglês e Física',month:'11',date:'',time:'',place:'',footer:'Datas verificadas · Consulte a coordenação sobre horários'}
    ,aniversario:{title:'ANIVERSARIANTES DO MÊS',subtitle:'NOVEMBRO DE 2026',body:'Nossa equipe merece ser celebrada! Parabéns a todos os aniversariantes.',items:'',month:'11',date:'',time:'',place:'',footer:'Colégio Cora Coralina · Juntos por uma educação que transforma!'}
  };
  let drafts={},template='comunicado',logo=null,toys=null,renderCount=0;
  const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const holidaysMonth=$('holidayMonth'),holidaysInfo=$('holidayMonthInfo'),holidaysControls=$('holidayControls');
  const assessmentsMonth=$('assessmentsMonth'),assessmentsInfo=$('assessmentsInfo'),assessmentsControls=$('assessmentControls');
  const birthdayMonth=$('birthdayCardMonth'),birthdayInfo=$('birthdayCardInfo'),birthdayControls=$('birthdayControls');
  if(holidaysMonth)holidaysMonth.innerHTML=MONTHS.map((n,i)=>`<option value="${i+1}">${n} de 2026</option>`).join('');
  if(assessmentsMonth)assessmentsMonth.innerHTML=MONTHS.map((n,i)=>`<option value="${i+1}">${n} de 2026</option>`).join('');
  if(birthdayMonth)birthdayMonth.innerHTML=MONTHS.map((n,i)=>`<option value="${i+1}">${n} de 2026</option>`).join('');
  function getHolidays(month){
    const mm=String(month).padStart(2,'0');
    // Mescla o calendário institucional com os registros salvos, sem descartar
    // feriados oficiais quando o navegador contém alguns eventos particulares.
    const merged=new Map();
    let removed=[];
    try{removed=JSON.parse(localStorage.getItem('cora_official_2026_removed_v1')||'[]');}catch{}
    const removedIds=new Set(Array.isArray(removed)?removed:[]);
    for(const item of (ACTIVE_YEAR===2026?(window.CORA_OFFICIAL_2026?.events||[]):[])){
      if(item?.id&&!removedIds.has(item.id))merged.set(item.id,item);
    }
    try{
      const stored=JSON.parse(localStorage.getItem(`cora_calendario_eventos_${ACTIVE_YEAR}_v1`)||'[]');
      if(Array.isArray(stored))for(const item of stored){
        if(item?.id)merged.set(item.id,item);
      }
    }catch{}
    const seen=new Set();
    return [...merged.values()]
      .filter(item=>item&&String(item.date||'').startsWith(`${ACTIVE_YEAR}-${mm}-`)&&String(item.type||'').toLowerCase()==='feriado')
      .sort((a,b)=>a.date.localeCompare(b.date)||String(a.title).localeCompare(String(b.title)))
      .filter(item=>{
        const key=`${item.date}:${holidayLabel(item).toLowerCase()}`;
        if(seen.has(key))return false;
        seen.add(key);
        return true;
      });
  }
  // A mesma base de eventos atende os dois modelos, com filtros EXCLUSIVOS.
  // Uma avaliação de 2ª chamada nunca pode entrar no cronograma geral.
  function allEvents(){
    const merged=new Map();
    let removed=[];
    try{removed=JSON.parse(localStorage.getItem('cora_official_2026_removed_v1')||'[]')}catch{}
    const removedIds=new Set(Array.isArray(removed)?removed:[]);
    for(const e of (ACTIVE_YEAR===2026?(window.CORA_OFFICIAL_2026?.events||[]):[]))if(e?.id&&!removedIds.has(e.id))merged.set(e.id,e);
    try{
      const current=JSON.parse(localStorage.getItem(`cora_calendario_eventos_${ACTIVE_YEAR}_v1`)||'[]');
      if(Array.isArray(current))for(const e of current)if(e?.id)merged.set(e.id,e);
    }catch{}
    return [...merged.values()].filter(e=>e&&String(e.date||'').startsWith(ACTIVE_YEAR+'-'))
      .sort((a,b)=>a.date.localeCompare(b.date)||String(a.title||'').localeCompare(String(b.title||'')));
  }
  function normalizeTitle(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
  function isSecondCall(e){
    const label=normalizeTitle(`${e.type||''} ${e.title||''} ${e.notes||''}`);
    return /(?:\b2\s*(?:a|o|ª|º)?\s*chamada\b|\bsegunda\s+chamada\b|\bsegundas\s+chamadas\b)/i.test(label);
  }
  function isGeneralAssessment(e){
    if(isSecondCall(e))return false;
    const type=normalizeTitle(e.type),title=normalizeTitle(e.title);
    return ['avaliacao','simulado','sondagem'].includes(type)||/(simulad|sondag|prova|exame|avaliac|vestibular|olimpiada|oba\b|onc\b)/.test(title);
  }
  function assessmentsInMonth(month,kind){
    const mm=String(Math.min(12,Math.max(1,Number(month)||11))).padStart(2,'0');
    return allEvents().filter(e=>e.date.startsWith(`${ACTIVE_YEAR}-${mm}-`) && (kind==='avaliacao'?isSecondCall(e):isGeneralAssessment(e)));
  }
  function assessmentDraft(month,kind){
    const n=Math.max(1,Math.min(12,Number(month)||11)),data=assessmentsInMonth(n,kind);
    const lines=data.map(e=>`${e.date.slice(8,10)}/${e.date.slice(5,7)}/${ACTIVE_YEAR} | ${e.title}`);
    if(ACTIVE_YEAR===2026&&kind==='avaliacao'&&n===11&&!lines.length){
      // Cronograma da 3ª série compartilhado previamente pela coordenação,
      // não consta no calendário anual consolidado.
      return {...DEFAULTS.avaliacao,month:'11'};
    }
    if(kind==='avaliacao')return {...DEFAULTS.avaliacao,
      title:'AVALIAÇÕES DE 2ª CHAMADA',subtitle:`${MONTHS[n-1].toUpperCase()} DE 2026`,
      body:'Somente avaliações de segunda chamada previstas no calendário.',
      items:lines.join('\n'),month:String(n),date:'',time:'',place:'',
      footer:'Confira turmas, disciplinas e horários com a coordenação'};
    return {...DEFAULTS.cronograma,
      title:'CRONOGRAMA GERAL DE AVALIAÇÕES',subtitle:`${MONTHS[n-1].toUpperCase()} DE 2026`,
      body:'Avaliações, simulados, sondagens e provas regulares do calendário escolar. Não inclui 2ª chamada.',
      items:lines.join('\n'),month:String(n),date:'',time:'',place:'',footer:'Colégio Cora Coralina · Cronograma geral 2026'};
  }
  function updateAssessmentInfo(){
    if(!assessmentsInfo||!assessmentsMonth||(template!=='cronograma'&&template!=='avaliacao'))return;
    const n=Number(assessmentsMonth.value)||11,kind=template;
    const count=assessmentsInMonth(n,kind).length;
    assessmentsInfo.textContent=kind==='cronograma'
      ?`${count} registro(s) de avaliação geral em ${MONTHS[n-1]}: provas, simulados e sondagens. Segunda chamada excluída. Confira o calendário antes de divulgar.`
      :`${count} evento(s) de 2ª chamada no calendário de ${MONTHS[n-1]}. Disciplinas por turma podem ser completadas manualmente; não entram provas regulares nem simulados.`;
    const btn=$('loadMonthAssessments');if(btn)btn.textContent=kind==='cronograma'?'↻ Carregar avaliações e simulados':'↻ Carregar somente 2ª chamada';
    const caption=$('cardItemsHint');if(caption)caption.textContent=kind==='cronograma'
      ?'Avaliações gerais, simulados, sondagens e recomposição; sem segunda chamada.'
      :'Apenas provas de 2ª chamada da turma; sem simulados nem avaliações regulares.';
  }
  function fillAssessments(month){
    if(template!=='cronograma'&&template!=='avaliacao')return;
    const n=Math.max(1,Math.min(12,Number(month)||11));
    drafts[template]=assessmentDraft(n,template);setForm(drafts[template]);saveDraft();updateAssessmentInfo();render();
    status(`Modelo ${LABELS[template]} carregado para ${MONTHS[n-1]} de 2026.`);
  }
  function holidayLabel(item){
    let s=String(item.title||'Feriado').replace(/\s*[—–-]\s*feriado(?:\s+antecipado)?\s*$/i,'').trim();
    if(/dia do professor/i.test(s)&&/antecipado/i.test(item.title||''))s+=' (antecipado pela escola)';
    if(/quarta-feira de cinzas/i.test(s))s+=' (expediente a partir das 13h)';
    return s;
  }
  function holidayDraft(month){
    const idx=Math.max(0,Math.min(11,(parseInt(month,10)||1)-1)),m=MONTHS[idx],list=getHolidays(idx+1);
    return {...DEFAULTS.comunicado,month:String(idx+1),subtitle:`Feriados de ${m} de 2026`,
      body:`Prezadas famílias, confira os feriados e as datas especiais previstas no calendário escolar de ${m.toLowerCase()} de 2026:`,
      items:list.map(item=>`${item.date.slice(8,10)}/${item.date.slice(5,7)} – ${holidayLabel(item)}`).join('\n'),
      date:'',time:'Calendário escolar · 2026',place:'Para informações, consulte a coordenação.'};
  }
  function updateHolidayInfo(){
    if(!holidaysInfo||!holidaysMonth)return;
    const month=Math.max(1,Math.min(12,Number(holidaysMonth.value)||11));
    const n=getHolidays(month).length;
    holidaysInfo.textContent=n?`${n} ${n===1?'feriado ou data especial':'feriados ou datas especiais'} em ${MONTHS[month-1]} de 2026. Os registros podem ser editados antes de divulgar.`:`Nenhum feriado cadastrado em ${MONTHS[month-1]} de 2026 no calendário escolar. Você pode acrescentar uma data manualmente.`;
  }
  function fillMonth(month){
    if(template!=='comunicado')return;
    const normalized=Math.max(1,Math.min(12,Number(month)||11));
    drafts.comunicado=holidayDraft(normalized);
    setForm(drafts.comunicado);
    saveDraft();updateHolidayInfo();render();
  }
  function calendarMonth(){
    const button=document.querySelector('#monthNav [data-month].active');
    const m=button===null?NaN:Number(button.dataset.month);
    return Number.isInteger(m)&&m>=0&&m<=11?m+1:11;
  }
  function ensureComunicadoMonth(){
    if(template!=='comunicado')return;
    const selected=Number(holidaysMonth?.value)||calendarMonth();
    const formValues=getForm();
    // Migração de rascunhos antigos sem mês, ou com datas de outro mês.
    const found=[...String(formValues.items||'').matchAll(/(?:^|\n)\s*\d{2}\/(\d{2})\s*[–—-]/g)];
    const stale=found.length>0&&found.some(m=>Number(m[1])!==selected);
    if(stale){
      fillMonth(selected);
      status(`Comunicado atualizado: ${MONTHS[selected-1]} de 2026.`);
    }
  }
  const LABELS={comunicado:'Comunicado',solidaria:'Campanha solidária',reuniao:'Reunião',cronograma:'Cronograma geral',avaliacao:'2ª chamada',aniversario:'Aniversariantes do mês'};
  function exportName(extension){
    const suffix=String(Date.now());
    const month=Number(monthSelect()?.value)||11;
    const label=template==='comunicado'?`Comunicado_${MONTHS[(month||11)-1]}_2026`:(template==='cronograma'||template==='avaliacao')?`${template==='cronograma'?'Cronograma_Geral':'Segunda_Chamada'}_${MONTHS[(month||11)-1]}_2026` :template==='aniversario'?`Aniversariantes_${MONTHS[(month||11)-1]}_2026`:`${template}_2026`;
    return `Cora_Coralina_${label}_${suffix}.${extension}`;
  }
  function updateExportContext(){
    const message=template==='comunicado'?`Modelo ativo: COMUNICADO · ${MONTHS[(Number(holidaysMonth?.value)||11)-1].toUpperCase()} DE 2026`: (template==='cronograma'||template==='avaliacao')?`Modelo ativo: ${LABELS[template].toUpperCase()} · ${MONTHS[(Number(assessmentsMonth?.value)||11)-1].toUpperCase()} DE 2026`:template==='aniversario'?`Modelo ativo: ANIVERSARIANTES · ${MONTHS[(Number(birthdayMonth?.value)||11)-1].toUpperCase()} DE 2026`:`Modelo ativo: ${LABELS[template].toUpperCase()}`;
    const target=$('cardExportContext');if(target)target.textContent=message;
    const png=$('downloadCardPng');if(png)png.textContent=`↓ PNG · ${LABELS[template]}`;
    const pdf=$('downloadCardPdf');if(pdf)pdf.textContent=`↓ PDF · ${LABELS[template]}`;
  }

  function rounded(g,x,y,w,h,r,fill){g.fillStyle=fill;g.beginPath();g.roundRect(x,y,w,h,r);g.fill()}
  function strokeRound(g,x,y,w,h,r,color,width=3){g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.roundRect(x,y,w,h,r);g.stroke()}
  function gradient(g,y1,y2,a,b){const gr=g.createLinearGradient(0,y1,0,y2);gr.addColorStop(0,a);gr.addColorStop(1,b);return gr}
  function text(g,v,x,y,size=32,color=INK,weight='700',align='left'){g.fillStyle=color;g.textAlign=align;g.font=`${weight} ${size}px Arial, sans-serif`;g.fillText(String(v||''),x,y);g.textAlign='left'}
  function lines(g,raw,width,size=32,weight='700'){g.font=`${weight} ${size}px Arial, sans-serif`;const arr=[];for(const para of String(raw||'').split('\n')){if(!para.trim()){arr.push('');continue;}let row='';for(const word of para.trim().split(/\s+/)){let candidate=row?row+' '+word:word;if(g.measureText(candidate).width>width&&row){arr.push(row);row=word}else row=candidate}if(row)arr.push(row)}return arr}
  function multiline(g,str,x,y,width,{size=30,lineHeight=size*1.25,color=INK,weight='700',align='left',maxLines=10}={}){const list=lines(g,str,width,size,weight);const count=Math.min(list.length,maxLines);for(let i=0;i<count;i++){let value=list[i];if(i===maxLines-1&&list.length>maxLines){while(value.length>1&&g.measureText(value+'…').width>width)value=value.slice(0,-1);value+='…'}text(g,value,x,y+i*lineHeight,size,color,weight,align)}return y+count*lineHeight}
  function fitted(g,str,x,y,width,{size=48,min=22,color=INK,weight='800',align='center'}={}){let s=size;while(s>min){g.font=`${weight} ${s}px Arial`;if(g.measureText(str||'').width<width)break;s-=2}text(g,str,x,y,s,color,weight,align);return s}
  function wave(g,reverse=false){g.fillStyle=BLUE;g.beginPath();if(!reverse){g.moveTo(710,0);g.bezierCurveTo(890,40,915,110,1080,144);g.lineTo(1080,0)}else{g.moveTo(0,H);g.bezierCurveTo(100,H-80,195,H-15,310,H);g.lineTo(0,H)}g.closePath();g.fill();g.strokeStyle=GOLD;g.lineWidth=11;g.beginPath();if(!reverse)g.bezierCurveTo(815,0,903,109,1080,155);else g.bezierCurveTo(0,H-35,145,H-56,300,H);g.stroke()}
  function emblem(g,x,y,w=125,h=157){
    rounded(g,x-10,y-6,w+20,h+15,14,WHITE);
    if(logo){
      // Mantém proporções e as cinco estrelas do brasão oficial.
      const aspect=logo.naturalWidth/logo.naturalHeight;
      const dw=Math.min(w,h*aspect),dh=dw/aspect;
      g.drawImage(logo,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
    }else {
      strokeRound(g,x,y,w,h,15,INK,5);
      text(g,'CORA',x+w/2,y+h*.45,28,INK,'800','center');
      text(g,'CORALINA',x+w/2,y+h*.64,18,INK,'700','center');
    }
  }
  function footer(g,label,color=INK){g.fillStyle=color;g.font='700 24px Arial';g.textAlign='center';g.fillText(label||'Colégio Cora Coralina',W/2,1310,910);g.textAlign='left'}
  function calendarIcon(g,x,y,w=80,accent=INK){rounded(g,x,y,w,w,15,'#fff');strokeRound(g,x,y,w,w,15,accent,7);g.fillStyle=accent;g.fillRect(x+5,y+20,w-10,8);g.lineWidth=7;g.strokeStyle=accent;for(const a of [.25,.75]){g.beginPath();g.moveTo(x+w*a,y-9);g.lineTo(x+w*a,y+19);g.stroke()}return {x:x+w/2,y:y+w*.64}}
  function drawBase(g,background='#fff'){g.fillStyle=background;g.fillRect(0,0,W,H)}
  function parseItems(str){return String(str||'').split(/\n/).map(s=>s.trim()).filter(Boolean)}
  function splitItem(v){const arr=v.split(/\s*\|\s*/);return arr.length>1?[arr.shift(),arr.join(' | ')]:[v.split(/\s+[–—-]\s+/)[0],v.split(/\s+[–—-]\s+/).slice(1).join(' – ')||'']}
  function bottomBrand(g){g.fillStyle=GOLD;g.fillRect(W/2-115,H-115,230,6);footer(g,'COLÉGIO CORA CORALINA')}
  function headerBrand(g){emblem(g,75,42,146,184);text(g,'Juntos por uma educação que',277,107,31,INK,'500');text(g,'transforma!',275,166,58,BLUE,'italic');g.strokeStyle=GOLD;g.lineWidth=8;g.beginPath();g.moveTo(294,185);g.lineTo(650,185);g.stroke();wave(g)}
  function notice(g,d){
    drawBase(g,'#fbfdff');headerBrand(g);
    rounded(g,55,260,970,210,80,gradient(g,250,490,INK,'#036cad'));
    text(g,'COMUNICADO',W/2,352,74,WHITE,'800','center');
    rounded(g,305,374,565,73,34,GOLD);fitted(g,'IMPORTANTE',584,428,500,{size:59,min:40,color:INK});
    fitted(g,d.subtitle||'Aviso às famílias',64,548,955,{size:38,min:22,align:'left'});
    let yy=multiline(g,d.body,64,601,955,{size:30,lineHeight:40,maxLines:4,weight:'600'});
    const items=parseItems(d.items);
    const top=Math.max(720,Math.min(845,yy+23)),bottom=1139;
    if(items.length){
      const cols=items.length>4?2:1;
      const count=Math.ceil(items.length/cols),gap=10,boxW=cols===1?955:468;
      const boxH=Math.min(113,Math.max(53,(bottom-top-gap*(count-1))/count));
      items.forEach((v,i)=>{
        const row=Math.floor(i/cols),col=i%cols,x=cols===1?63:63+col*488,y=top+row*(boxH+gap);
        rounded(g,x,y,boxW,boxH,19,'#e8f3ff');
        strokeRound(g,x,y,boxW,boxH,19,'#d4e4f6',1.5);
        const iconSize=Math.min(67,Math.max(42,boxH-27));
        calendarIcon(g,x+15,y+(boxH-iconSize)/2,iconSize);
        const [day,desc]=splitItem(v),tx=x+iconSize+35,txtW=boxW-iconSize-56;
        fitted(g,day||'AVISO',tx,y+boxH/2-4,txtW,{size:cols===1?31:25,min:18,align:'left'});
        multiline(g,desc,tx,y+boxH/2+25,txtW,{size:cols===1?25:21,lineHeight:26,maxLines:boxH>75?2:1,weight:'600'});
      });
    }else{rounded(g,70,796,940,200,25,'#e8f3ff');multiline(g,'Nenhum feriado cadastrado para este mês. Verifique o calendário escolar.',W/2,863,860,{size:28,lineHeight:42,align:'center',maxLines:3});}
    rounded(g,70,1161,940,100,23,'#e8f2fd');
    fitted(g,d.time||'Calendário escolar',W/2,1201,860,{size:29,min:19});
    fitted(g,d.date?`Retorno: ${d.date}`:(d.place||'Confira a programação'),W/2,1240,865,{size:27,min:17});
    wave(g,true);footer(g,d.footer);
  }
  function teddyIllustration(g,x,y){rounded(g,x,y,780,390,40,'#f5a721');if(toys){g.save();g.beginPath();g.roundRect(x,y,780,390,35);g.clip();const aspect=toys.width/toys.height,target=780/390,sw=toys.width,sh=toys.height;let dw=780,dh=390;if(aspect>target)dw=390*aspect;else dh=780/aspect;g.drawImage(toys,x+(780-dw)/2,y+(390-dh)/2,dw,dh);g.restore()}else {text(g,'♡',x+390,y+240,220,WHITE,'700','center')}}
  function solidarity(g,d){drawBase(g,gradient(g,0,H,DARK,'#073d76'));g.fillStyle='#103965';g.beginPath();g.arc(50,130,360,0,Math.PI*2);g.fill();g.fillStyle=GOLD;g.beginPath();g.arc(1075,780,230,0,Math.PI*2);g.fill();emblem(g,37,27,91,118);text(g,d.subtitle.toUpperCase(),W/2,88,26,WHITE,'600','center');g.fillStyle=GOLD;g.fillRect(250,104,580,5);const tparts=String(d.title).split(/\s+E\s+/i);if(tparts.length>1){multiline(g,tparts[0],W/2,227,985,{size:70,lineHeight:85,color:GOLD,weight:'900',align:'center',maxLines:2});multiline(g,'E '+tparts.slice(1).join(' E '),W/2,330,985,{size:63,lineHeight:78,color:WHITE,weight:'900',align:'center',maxLines:2})}else multiline(g,d.title,W/2,216,960,{size:65,lineHeight:79,color:GOLD,weight:'900',align:'center',maxLines:3});multiline(g,d.body,W/2,415,900,{size:28,lineHeight:38,color:WHITE,weight:'700',align:'center',maxLines:3});const arr=parseItems(d.items);arr.slice(0,2).forEach((item,i)=>{const x=75+i*475;rounded(g,x,520,453,135,25,'#ffffff17');rounded(g,x+20,548,70,70,35,GOLD);text(g,i?'▤':'♡',x+55,603,50,INK,'bold','center');multiline(g,item,x+108,569,325,{size:24,lineHeight:29,color:WHITE,weight:'600',maxLines:3})});rounded(g,190,681,700,72,35,GOLD);fitted(g,`${d.time||'DOAÇÕES'} • ${d.date||'CONSULTE A ESCOLA'}`,540,733,625,{size:31,min:19});teddyIllustration(g,146,780);rounded(g,38,1210,1005,105,45,WHITE);multiline(g,d.footer,W/2,1273,930,{size:37,lineHeight:42,color:INK,weight:'700',align:'center',maxLines:1})}
  function meeting(g,d){drawBase(g,'#fcfeff');g.fillStyle=INK;g.beginPath();g.moveTo(0,0);g.lineTo(300,0);g.quadraticCurveTo(185,250,0,256);g.fill();g.strokeStyle=GOLD;g.lineWidth=10;g.beginPath();g.moveTo(327,0);g.quadraticCurveTo(205,246,0,279);g.stroke();emblem(g,414,38,233,276);multiline(g,d.title,W/2,432,960,{size:72,lineHeight:81,align:'center',maxLines:3});rounded(g,135,520,810,92,30,GOLD);fitted(g,d.subtitle.toUpperCase(),W/2,584,766,{size:48,min:28});multiline(g,d.body,W/2,692,927,{size:36,lineHeight:50,weight:'600',align:'center',maxLines:5});rounded(g,63,922,955,231,32,'#e7f1fc');const data=[['DATA',d.date||'A definir'],['HORÁRIO',d.time||'A definir'],['LOCAL',d.place||'A definir']];data.forEach(([label,val],i)=>{const x=83+i*311;if(i)g.fillStyle=GOLD,g.fillRect(x-13,962,3,150);text(g,label,x+142,991,28,INK,'800','center');multiline(g,val,x+145,1051,280,{size:36,lineHeight:39,weight:'800',align:'center',maxLines:2})});multiline(g,d.footer,W/2,1245,960,{size:43,color:INK,weight:'italic',align:'center',maxLines:2});wave(g,true)}
  // Diagramação previsível: cada texto ocupa uma caixa com limites e alinhamento.
  // O mesmo desenho é utilizado na prévia, no PNG e no PDF.
  function boxedText(g,value,x,y,w,h,{
    size=30,min=18,weight='700',color=INK,align='left',maxLines=3
  }={}){
    const raw=String(value??'').trim();
    if(!raw)return;
    const limit=Math.max(1,Math.floor(maxLines));
    const contentWidth=w-10;
    let fontSize=size,wrapped=[];
    for(let n=size;n>=min;n-=1){
      const options=lines(g,raw,contentWidth,n,weight);
      const leading=n*1.22;
      if(options.length<=limit && options.length*leading<=h-8){
        fontSize=n;wrapped=options;break;
      }
    }
    if(!wrapped.length){fontSize=min;wrapped=lines(g,raw,contentWidth,min,weight);}
    const show=wrapped.slice(0,limit);
    if(wrapped.length>limit && show.length){
      let last=show[show.length-1];
      g.font=`${weight} ${fontSize}px Arial, sans-serif`;
      while(last.length>0 && g.measureText(last+'…').width>contentWidth)last=last.slice(0,-1);
      show[show.length-1]=last+'…';
    }
    const lineHeight=fontSize*1.22;
    g.save();
    g.beginPath();g.rect(x,y,w,h);g.clip();
    g.fillStyle=color;
    g.textAlign=align;
    g.textBaseline='middle';
    g.font=`${weight} ${fontSize}px Arial, sans-serif`;
    const xx=align==='center'?x+w/2:align==='right'?x+w-5:x+5;
    const mid=y+h/2;
    show.forEach((row,i)=>g.fillText(row,xx,mid+(i-(show.length-1)/2)*lineHeight));
    g.restore();
  }
  function schedule(g,d,page=0){
    drawBase(g,'#fcfeff');
    // Fundo quadriculado sutil e bordas de respiro.
    g.strokeStyle='#edf3fb';g.lineWidth=1;
    for(let x=0;x<W;x+=46){g.beginPath();g.moveTo(x,0);g.lineTo(x,H-100);g.stroke();}
    for(let y=0;y<H-100;y+=46){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}
    g.fillStyle=GOLD;g.fillRect(0,0,W,10);
    emblem(g,455,29,170,196);
    boxedText(g,'CALENDÁRIO PEDAGÓGICO · 2026',175,234,730,36,{size:23,min:20,weight:'800',align:'center',color:'#306294',maxLines:1});
    rounded(g,72,287,936,152,29,GOLD);
    const title=String(d.title||'').trim();
    const cardTitle=/^CRONOGRAMA GERAL DE AVALIAÇÕES$/i.test(title)?'CRONOGRAMA GERAL\nDE AVALIAÇÕES':title;
    boxedText(g,cardTitle,106,299,868,131,{size:57,min:33,weight:'900',align:'center',color:INK,maxLines:3});
    rounded(g,198,457,684,71,30,INK);
    boxedText(g,d.subtitle,220,466,640,52,{size:39,min:21,weight:'800',color:WHITE,align:'center',maxLines:2});
    boxedText(g,d.body,100,541,880,76,{size:25,min:20,weight:'600',align:'center',maxLines:3});
    g.fillStyle='#d8e4f1';g.fillRect(71,627,938,2);
    boxedText(g,'DATA',76,637,240,29,{size:20,min:19,weight:'800',color:'#406a96',align:'center',maxLines:1});
    boxedText(g,'ATIVIDADE / AVALIAÇÃO',350,637,650,29,{size:20,min:19,weight:'800',color:'#406a96',align:'left',maxLines:1});
    const arr=parseItems(d.items).slice(page*8,page*8+8);
    const fills=['#e5e0ff','#fee0e6','#def6e8','#fff1bf','#d9ebff','#e6e2fa','#e3f5f7','#fce8d8'];
    const availableHeight=558,top=673,gap=8;
    const rowHeight=arr.length?Math.min(104,Math.floor((availableHeight-(arr.length-1)*gap)/arr.length)):104;
    if(!arr.length)boxedText(g,'Nenhuma avaliação ou simulado cadastrado para este período.',95,745,890,115,{size:29,min:23,align:'center'});
    arr.forEach((entry,i)=>{
      const y=top+i*(rowHeight+gap);
      rounded(g,64,y,952,rowHeight,16,WHITE);
      rounded(g,64,y,254,rowHeight,16,fills[i]);
      strokeRound(g,64,y,952,rowHeight,16,'#dce8f4',2);
      g.fillStyle='#c8d8e9';g.fillRect(318,y+8,2,Math.max(5,rowHeight-16));
      const [day,description]=splitItem(entry);
      boxedText(g,day||'DATA',77,y+5,226,rowHeight-10,{size:rowHeight>=78?31:26,min:19,weight:'800',align:'center',maxLines:2});
      boxedText(g,description||'Atividade a definir',341,y+5,660,rowHeight-10,{size:rowHeight>=78?29:24,min:17,weight:'700',align:'left',maxLines:rowHeight<75?2:3});
    });
    g.fillStyle=INK;g.fillRect(0,1251,W,99);
    boxedText(g,d.footer||'Colégio Cora Coralina · 2026',70,1273,940,50,{size:27,min:19,align:'center',color:WHITE,weight:'700',maxLines:2});
    const pages=Math.max(1,Math.ceil(parseItems(d.items).length/8));
    if(pages>1)boxedText(g,`Página ${page+1} de ${pages}`,815,42,208,32,{size:21,min:18,align:'right',color:INK,weight:'700',maxLines:1});
  }
  function assessment(g,d,page=0){
    drawBase(g,'#f4f7ff');
    rounded(g,13,13,1054,245,23,INK);
    // Brasão oficial também no card de avaliações: mantém o título à direita.
    emblem(g,55,36,143,190);
    text(g,'COLÉGIO CORA CORALINA',245,67,27,WHITE,'700');
    const titleLines=lines(g,d.title,775,53,'900');
    if(titleLines.length<2){
      fitted(g,d.title,643,136,774,{size:57,min:29,color:WHITE,weight:'900'});
    }else{
      multiline(g,d.title,643,104,773,{size:53,lineHeight:58,color:WHITE,weight:'900',align:'center',maxLines:2});
    }
    rounded(g,249,177,804,68,21,GOLD);
    fitted(g,d.subtitle.toUpperCase(),649,224,756,{size:42,min:21,color:INK});
    fitted(g,d.body,W/2,306,940,{size:29,min:18});
    const arr=parseItems(d.items).slice(page*6,page*6+6);
    const fills=['#fbe6e9','#e5f2ff','#e4f8e8','#fff1cb','#eee5ff','#e2f2f4'];
    const rowh=Math.min(162,Math.floor(810/Math.max(arr.length,1)));
    arr.forEach((v,i)=>{
      const y=350+i*(rowh+9),[date,disc]=splitItem(v);
      rounded(g,28,y,1024,rowh,18,WHITE);
      rounded(g,28,y,332,rowh,18,fills[i]);
      calendarIcon(g,54,y+Math.max(15,(rowh-74)/2),74,['#e95465','#2588c5','#37a96a','#dca000','#9657b3'][i%5]);
      fitted(g,date,245,y+rowh/2+13,217,{size:31,min:20});
      multiline(g,disc,407,y+rowh/2-13,630,{size:30,lineHeight:34,maxLines:2,weight:'700'});
    });
    rounded(g,35,1240,1010,84,19,'#e4edfd');
    fitted(g,d.footer,540,1295,952,{size:26,min:19});
  }


  function birthdayEntries(n){return window.CoraBirthdays?.byMonth(Math.max(1,Math.min(12,Number(n)||11)))||[];}
  function birthdayDraft(month){
    const n=Math.max(1,Math.min(12,Number(month)||calendarMonth()));
    return {...DEFAULTS.aniversario,month:String(n),subtitle:`${MONTHS[n-1].toUpperCase()} DE 2026`,
      items:birthdayEntries(n).map(p=>`${String(p.day).padStart(2,'0')}/${String(p.month).padStart(2,'0')} | ${p.name}${p.role?' — '+p.role:''}`).join('\n')};
  }
  function updateBirthdayInfo(){
    if(!birthdayMonth||!birthdayInfo)return;
    const n=Math.max(1,Math.min(12,Number(birthdayMonth.value)||11)),count=birthdayEntries(n).length;
    birthdayInfo.textContent=`${count} ${count===1?'aniversariante cadastrado':'aniversariantes cadastrados'} em ${MONTHS[n-1]}. Altere o cadastro da Gestão para incluir ou corrigir pessoas.`;
    if(template==='aniversario')$('cardItemsHint').textContent='Um por linha: DD/MM | Nome — Função. Lista editável.';
  }
  function fillBirthdayCard(month){
    if(template!=='aniversario')return;
    const n=Math.max(1,Math.min(12,Number(month)||calendarMonth()));
    drafts.aniversario=birthdayDraft(n);setForm(drafts.aniversario);saveDraft();updateBirthdayInfo();render();
  }
  function birthdayCard(g,d,page=0){
    drawBase(g,'#f8fbff');
    rounded(g,0,0,W,446,0,gradient(g,0,446,'#082a56','#1763a5'));
    g.fillStyle=GOLD;g.fillRect(0,0,W,11);
    emblem(g,457,25,166,195);
    boxedText(g,d.title,80,243,920,92,{size:61,min:37,weight:'900',color:WHITE,align:'center',maxLines:2});
    rounded(g,240,344,600,70,34,GOLD);
    boxedText(g,d.subtitle,260,350,560,55,{size:37,min:23,weight:'900',align:'center',maxLines:2});
    for(let i=0;i<18;i++){const x=30+i*57,y=470+(i*113)%710;g.fillStyle=i%2?'#ffce3375':'#90bde475';g.beginPath();g.arc(x,y,4,0,Math.PI*2);g.fill();}
    boxedText(g,d.body,70,467,940,86,{size:29,min:20,weight:'600',align:'center',maxLines:3});
    const rows=parseItems(d.items).slice(page*7,page*7+7);
    if(!rows.length){rounded(g,84,645,912,188,24,'#e5f1fd');boxedText(g,'Nenhum aniversariante cadastrado neste mês',135,681,810,103,{size:34,min:24,weight:'700',align:'center',maxLines:3});}
    const fills=['#eaf4ff','#fff4db','#edf7f0','#eaf4ff','#f5efff','#fff4db','#eaf4ff'];
    rows.forEach((line,i)=>{const [date,label]=splitItem(line),y=563+i*93;rounded(g,65,y,949,86,17,fills[i]);rounded(g,79,y+11,148,62,13,INK);
      boxedText(g,date,88,y+18,130,45,{size:30,min:23,color:WHITE,weight:'800',align:'center',maxLines:1});
      boxedText(g,label,245,y+8,747,70,{size:30,min:18,weight:'750',color:INK,align:'left',maxLines:2});
    });
    rounded(g,38,1236,1004,83,21,INK);
    boxedText(g,d.footer,62,1246,950,55,{size:29,min:18,color:WHITE,align:'center',weight:'700',maxLines:2});
  }

  function monthSelect(){return template==='comunicado'?holidaysMonth:(template==='cronograma'||template==='avaliacao')?assessmentsMonth:template==='aniversario'?birthdayMonth:null}
  function getForm(){const v={};Object.keys(DEFAULTS[template]).forEach(k=>{const el=k==='month'?monthSelect():form.elements.namedItem(k);v[k]=String(el?.value||'')});return v}
  function getDraft(){return drafts[template]||DEFAULTS[template]}
  function setForm(d){for(const name of Object.keys(DEFAULTS[template])){const el=name==='month'?monthSelect():form.elements.namedItem(name);if(el)el.value=d[name]??''}}
  function pageCount(){const number=parseItems(getForm().items).length;return template==='cronograma'?Math.max(1,Math.ceil(number/8)):template==='avaliacao'?Math.max(1,Math.ceil(number/6)):template==='aniversario'?Math.max(1,Math.ceil(number/7)):1}
  function render(){const d=getForm();ctx.clearRect(0,0,W,H);try{({comunicado:notice,solidaria:solidarity,reuniao:meeting,cronograma:schedule,avaliacao:assessment,aniversario:birthdayCard}[template]||notice)(ctx,d)}catch(e){console.error(e);drawBase(ctx);text(ctx,'Erro ao visualizar. Revise os campos.',40,130,27,INK)}renderCount++;updateExportContext();const hint=$('cardPagesInfo');if(hint)hint.textContent=pageCount()>1?`Prévia: página 1 de ${pageCount()}. PDF terá todas as páginas; PNG terá as páginas reunidas em uma imagem.`:''}
  function saveDraft(){try{drafts[template]=getForm();localStorage.setItem(ID,JSON.stringify(drafts));$('cardSaveStatus').textContent='Rascunho salvo'}catch{$('cardSaveStatus').textContent='Salvamento indisponível'}}
  function setTemplate(name){if(!DEFAULTS[name])return;saveDraft();template=name;
    if((name==='cronograma'||name==='avaliacao')&&!drafts[name])drafts[name]=assessmentDraft(calendarMonth(),name);
    if(name==='aniversario'&&!drafts[name])drafts.aniversario=birthdayDraft(calendarMonth());
    setForm(getDraft());if(holidaysControls)holidaysControls.hidden=name!=='comunicado';if(assessmentsControls)assessmentsControls.hidden=name!=='cronograma'&&name!=='avaliacao';if(birthdayControls)birthdayControls.hidden=name!=='aniversario';if(name==='comunicado'){updateHolidayInfo();const hint=$('cardItemsHint');if(hint)hint.textContent='No comunicado, os feriados do mês podem ser editados.';}if(name==='cronograma'||name==='avaliacao')updateAssessmentInfo();if(name==='aniversario')updateBirthdayInfo();const detailFields=$('cardExtraDetails');if(detailFields)detailFields.hidden=(name==='cronograma'||name==='avaliacao'||name==='aniversario');document.querySelectorAll('[data-template]').forEach(el=>{el.classList.toggle('is-selected',el.dataset.template===name);el.setAttribute('aria-pressed',el.dataset.template===name?'true':'false')});render()}
  function createExportPages(){const pages=[];const n=pageCount(),d=getForm(),fn=template==='cronograma'?schedule:template==='avaliacao'?assessment:template==='aniversario'?birthdayCard:null;
    if(!fn)return [canvas];
    for(let i=0;i<n;i++){const c=document.createElement('canvas');c.width=W;c.height=H;fn(c.getContext('2d'),d,i);pages.push(c)}
    return pages;
  }
  function pngCanvas(pages){if(pages.length===1)return pages[0];const out=document.createElement('canvas');out.width=W;out.height=H*pages.length;const g=out.getContext('2d');pages.forEach((page,i)=>g.drawImage(page,0,i*H));return out}
  function loadImg(str){return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=str||''})}
  function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),8000)}
  function status(message){const toast=$('toast');if(!toast)return;toast.textContent=message;toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),4500)}
  async function pdfLibrary(){if(window.PDFLib)return window.PDFLib;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';s.onload=resolve;s.onerror=()=>reject(Error('Biblioteca PDF indisponível'));document.head.append(s)});return window.PDFLib}
  form.addEventListener('submit',event=>event.preventDefault());
  if(holidaysMonth)holidaysMonth.addEventListener('change',()=>fillMonth(holidaysMonth.value));
  if(assessmentsMonth)assessmentsMonth.addEventListener('change',()=>fillAssessments(assessmentsMonth.value));
  if(birthdayMonth)birthdayMonth.addEventListener('change',()=>fillBirthdayCard(birthdayMonth.value));
  $('loadBirthdayCard')?.addEventListener('click',()=>fillBirthdayCard(birthdayMonth.value));
  window.addEventListener('cora-birthday-card-request',event=>{setTemplate('aniversario');fillBirthdayCard(event.detail?.month||calendarMonth());});
  window.addEventListener('cora-birthdays-changed',()=>{if(template==='aniversario')fillBirthdayCard(birthdayMonth?.value||calendarMonth());});
  $('loadMonthAssessments')?.addEventListener('click',()=>fillAssessments(assessmentsMonth.value));
  window.addEventListener('cora-month-changed',event=>{
    const selected=Number(event.detail?.month)+1;
    if(template==='comunicado'&&selected>=1&&selected<=12&&Number(holidaysMonth?.value)!==selected)fillMonth(selected);
    if((template==='cronograma'||template==='avaliacao')&&selected>=1&&selected<=12&&Number(assessmentsMonth?.value)!==selected)fillAssessments(selected);
    if(template==='aniversario'&&selected>=1&&selected<=12&&Number(birthdayMonth?.value)!==selected)fillBirthdayCard(selected);
  });
  $('loadMonthHolidays')?.addEventListener('click',()=>fillMonth(holidaysMonth.value));
  form.addEventListener('input',()=>{saveDraft();render()});
  document.querySelectorAll('[data-template]').forEach(el=>el.addEventListener('click',()=>setTemplate(el.dataset.template)));
  $('resetCard').addEventListener('click',()=>{if(confirm('Restaurar o texto original deste modelo?')){drafts[template]=template==='comunicado'?holidayDraft(holidaysMonth.value):(template==='cronograma'||template==='avaliacao')?assessmentDraft(assessmentsMonth.value,template):template==='aniversario'?birthdayDraft(birthdayMonth.value):{...DEFAULTS[template]};setForm(drafts[template]);saveDraft();updateHolidayInfo();if(template==='cronograma'||template==='avaliacao')updateAssessmentInfo();if(template==='aniversario')updateBirthdayInfo();render()}});
  $('downloadCardPng').addEventListener('click',async()=>{await assetsReady;ensureComunicadoMonth();saveDraft();render();const filename=exportName('png');pngCanvas(createExportPages()).toBlob(blob=>{if(blob){download(blob,filename);status(`Arquivo gerado: ${LABELS[template]}${template==='comunicado'?' de '+MONTHS[(Number(holidaysMonth?.value)||11)-1]:''}.`)}else status('Falha ao gerar imagem.')},'image/png')});
  $('downloadCardPdf').addEventListener('click',async()=>{await assetsReady;ensureComunicadoMonth();saveDraft();render();const btn=$('downloadCardPdf');btn.disabled=true;btn.textContent='Gerando PDF...';try{const file=window.CoraPDF.fromCanvases(createExportPages(),{pageWidth:540,pageHeight:675,title:`Card Cora Coralina ${template} 2026`});download(file,exportName('pdf'));status(`PDF gerado: ${LABELS[template]}.`)}catch(e){console.error(e);status('PDF indisponível neste navegador. Baixe o PNG e imprima como PDF.')}finally{btn.disabled=false;updateExportContext()}});
  $('jumpCards').addEventListener('click',()=>$('cardStudio').scrollIntoView({behavior:'smooth',block:'start'}));
  try{const obj=JSON.parse(localStorage.getItem(ID)||'{}');if(obj&&typeof obj==='object'&&!Array.isArray(obj))drafts=obj}catch{}
  if(!drafts.comunicado||!(Number(drafts.comunicado.month)>=1&&Number(drafts.comunicado.month)<=12)){drafts.comunicado=holidayDraft(calendarMonth());}
  if(drafts.cronograma&&(/2\s*[ªaºo]?\s*chamada/i.test(String(drafts.cronograma.title||''))||!drafts.cronograma.month)){
    // Guarda o rascunho de modelo antigo para que o usuário não perca seu trabalho.
    try{localStorage.setItem('cora_cronograma_antigo_2026_backup',JSON.stringify(drafts.cronograma))}catch{}
    drafts.cronograma=assessmentDraft(calendarMonth(),'cronograma');
    try{localStorage.setItem(ID,JSON.stringify(drafts))}catch{}
  }
  if(!drafts.cronograma)drafts.cronograma=assessmentDraft(calendarMonth(),'cronograma');
  if(!drafts.avaliacao||!drafts.avaliacao.month)drafts.avaliacao={...DEFAULTS.avaliacao};
  if(!drafts.aniversario||!drafts.aniversario.month)drafts.aniversario=birthdayDraft(calendarMonth());
  
  setForm(getDraft());ensureComunicadoMonth();updateHolidayInfo();render();
  const assetsReady=Promise.all([loadImg(window.CORA_SCHOOL_LOGO||window.CORA_STUDIO_ASSETS?.logo),loadImg(window.CORA_STUDIO_ASSETS?.toys)]).then(([a,b])=>{logo=a;toys=b;render()});
  window.addEventListener('cora-backup-restored',()=>{try{drafts=JSON.parse(localStorage.getItem(ID)||'{}')||{}}catch{drafts={}}if(!drafts.comunicado?.month)drafts.comunicado=holidayDraft(calendarMonth());if(!drafts.cronograma||/2\s*[ªaºo]?\s*chamada/i.test(String(drafts.cronograma.title||'')))drafts.cronograma=assessmentDraft(calendarMonth(),'cronograma');if(!drafts.avaliacao)drafts.avaliacao={...DEFAULTS.avaliacao};if(!drafts.aniversario)drafts.aniversario=birthdayDraft(calendarMonth());setForm(getDraft());ensureComunicadoMonth();updateHolidayInfo();updateAssessmentInfo();updateBirthdayInfo();render()});
})();