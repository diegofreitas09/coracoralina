/* Editor de cards — identidade visual do Colégio Cora Coralina. */
(() => {
  'use strict';
  let YEAR=window.CoraYears?.activeYear||2026;
  let ID=`cora_cards_${YEAR}_v1`;
  const NAVY='#082d5c',DARK='#062246',BLUE='#0778c4',GOLD='#ffcc22',WHITE='#ffffff',INK='#0c315f';
  const $=id=>document.getElementById(id),form=$('cardForm'),canvas=$('studioCardCanvas');if(!form||!canvas)return;
  const ctx=canvas.getContext('2d'),W=1080,H=1350;
  const DEFAULTS={
    comunicado:{title:'COMUNICADO IMPORTANTE',subtitle:'Aviso às famílias',body:'Informamos que, em razão dos feriados de 12 e 13 de outubro, não haverá aula nesses dias.',items:'12/10 – Nossa Senhora Aparecida\n13/10 – Antecipação do Dia do Professor',date:'14/10/2026',time:'Retorno das aulas',place:'Atividades normais',footer:'Colégio Cora Coralina'},
    solidaria:{title:'DOE BRINQUEDOS E LIVROS INFANTIS',subtitle:'Campanha Solidária',body:'Compartilhe alegria e novas histórias! Sua doação pode transformar o dia de uma criança.',items:'Brinquedos novos, seminovos e usados em bom estado\nLivros infantis em bom estado de conservação',date:'16/10/2026',time:'Prazo para doações',place:'Entregar na escola',footer:'Colégio Cora Coralina'},
    reuniao:{title:'REUNIÃO ESCOLA E FAMÍLIA',subtitle:'ENTREGA DE RESULTADOS',body:'Um momento importante para conversarmos sobre o desenvolvimento dos nossos alunos e fortalecermos a parceria entre escola e família.',items:'',date:'06/11/2026',time:'18h30',place:'Quadra da escola',footer:'Contamos com a sua presença!'},
    cronograma:{title:'AVALIAÇÃO DE 2ª CHAMADA',subtitle:'AP2 · 4ª ETAPA · 6º ANO',body:'Cronograma de avaliações — confira as disciplinas de cada dia.',items:'03/11/2026 | História / Interpretação Textual\n04/11/2026 | Gramática / Produção Textual\n05/11/2026 | Geografia / Ciências\n06/11/2026 | Matemática\n09/11/2026 | Inglês / Filosofia',date:'',time:'',place:'',footer:'Colégio Cora Coralina · 2026'},
    avaliacoes:{title:'CALENDÁRIO DE AVALIAÇÕES',subtitle:'4ª ETAPA · ANO LETIVO 2026',body:'Confira as datas das avaliações previstas no calendário escolar. As disciplinas e os horários devem ser confirmados no cronograma de cada turma.',items:'26 a 30/10 | Avaliações parciais · 4ª etapa\n19/11 | Simulado 04 — início\n23 a 27/11 | Avaliações globais · 4ª etapa\n14 a 18/12 | Provas de recomposição',date:'',time:'',place:'',footer:'Calendário oficial 2026 · Confirme as datas com a coordenação'},
    avaliacao:{title:'AVALIAÇÃO 2ª CHAMADA',subtitle:'3ª SÉRIE · ENSINO MÉDIO',body:'AP2 – 4ª ETAPA DE 2026',items:'03/11/2026 | História, Literatura e Sociologia\n04/11/2026 | Português e Produção Textual\n05/11/2026 | Química e Biologia\n06/11/2026 | Matemática e Geografia\n09/11/2026 | Inglês e Física',date:'',time:'',place:'',footer:'Datas verificadas · Consulte a coordenação sobre horários'}
  };
  let drafts={},template='comunicado',logo=null,toys=null,renderCount=0;
  function rounded(g,x,y,w,h,r,fill){g.fillStyle=fill;g.beginPath();g.roundRect(x,y,w,h,r);g.fill()}
  function strokeRound(g,x,y,w,h,r,color,width=3){g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.roundRect(x,y,w,h,r);g.stroke()}
  function gradient(g,y1,y2,a,b){const gr=g.createLinearGradient(0,y1,0,y2);gr.addColorStop(0,a);gr.addColorStop(1,b);return gr}
  function text(g,v,x,y,size=32,color=INK,weight='700',align='left'){g.fillStyle=color;g.textAlign=align;g.font=`${weight} ${size}px Arial, sans-serif`;g.fillText(String(v||''),x,y);g.textAlign='left'}
  function lines(g,raw,width,size=32,weight='700'){g.font=`${weight} ${size}px Arial, sans-serif`;const arr=[];for(const para of String(raw||'').split('\n')){if(!para.trim()){arr.push('');continue;}let row='';for(const word of para.trim().split(/\s+/)){let candidate=row?row+' '+word:word;if(g.measureText(candidate).width>width&&row){arr.push(row);row=word}else row=candidate}if(row)arr.push(row)}return arr}
  function multiline(g,str,x,y,width,{size=30,lineHeight=size*1.25,color=INK,weight='700',align='left',maxLines=10}={}){const list=lines(g,str,width,size,weight);const count=Math.min(list.length,maxLines);for(let i=0;i<count;i++){let value=list[i];if(i===maxLines-1&&list.length>maxLines){while(value.length>1&&g.measureText(value+'…').width>width)value=value.slice(0,-1);value+='…'}text(g,value,x,y+i*lineHeight,size,color,weight,align)}return y+count*lineHeight}
  function fitted(g,str,x,y,width,{size=48,min=22,color=INK,weight='800',align='center'}={}){let s=size;while(s>min){g.font=`${weight} ${s}px Arial`;if(g.measureText(str||'').width<width)break;s-=2}text(g,str,x,y,s,color,weight,align);return s}
  function wave(g,reverse=false){g.fillStyle=BLUE;g.beginPath();if(!reverse){g.moveTo(710,0);g.bezierCurveTo(890,40,915,110,1080,144);g.lineTo(1080,0)}else{g.moveTo(0,H);g.bezierCurveTo(100,H-80,195,H-15,310,H);g.lineTo(0,H)}g.closePath();g.fill();g.strokeStyle=GOLD;g.lineWidth=11;g.beginPath();if(!reverse)g.bezierCurveTo(815,0,903,109,1080,155);else g.bezierCurveTo(0,H-35,145,H-56,300,H);g.stroke()}
  function emblem(g,x,y,w=125,h=157){rounded(g,x-10,y-6,w+20,h+15,14,WHITE);if(logo)g.drawImage(logo,x,y,w,h);else {strokeRound(g,x,y,w,h,15,INK,5);text(g,'CORA',x+w/2,y+h*.45,28,INK,'800','center');text(g,'CORALINA',x+w/2,y+h*.64,18,INK,'700','center')}}
  function footer(g,label,color=INK){g.fillStyle=color;g.font='700 24px Arial';g.textAlign='center';g.fillText(label||'Colégio Cora Coralina',W/2,1310,910);g.textAlign='left'}
  function calendarIcon(g,x,y,w=80,accent=INK){rounded(g,x,y,w,w,15,'#fff');strokeRound(g,x,y,w,w,15,accent,7);g.fillStyle=accent;g.fillRect(x+5,y+20,w-10,8);g.lineWidth=7;g.strokeStyle=accent;for(const a of [.25,.75]){g.beginPath();g.moveTo(x+w*a,y-9);g.lineTo(x+w*a,y+19);g.stroke()}return {x:x+w/2,y:y+w*.64}}
  function drawBase(g,background='#fff'){g.fillStyle=background;g.fillRect(0,0,W,H)}
  function parseItems(str){return String(str||'').split(/\n/).map(s=>s.trim()).filter(Boolean)}
  function splitItem(v){const arr=v.split(/\s*\|\s*/);return arr.length>1?[arr.shift(),arr.join(' | ')]:[v.split(/\s+[–—-]\s+/)[0],v.split(/\s+[–—-]\s+/).slice(1).join(' – ')||'']}
  function bottomBrand(g){g.fillStyle=GOLD;g.fillRect(W/2-115,H-115,230,6);footer(g,'COLÉGIO CORA CORALINA')}
  function headerBrand(g){emblem(g,75,42,146,184);text(g,'Juntos por uma educação que',277,107,31,INK,'500');text(g,'transforma!',275,166,58,BLUE,'italic');g.strokeStyle=GOLD;g.lineWidth=8;g.beginPath();g.moveTo(294,185);g.lineTo(650,185);g.stroke();wave(g)}
  function notice(g,d){drawBase(g,'#fbfdff');headerBrand(g);rounded(g,55,260,970,210,80,gradient(g,250,490,INK,'#036cad'));text(g,'COMUNICADO',W/2,352,74,WHITE,'800','center');rounded(g,305,374,565,73,34,GOLD);fitted(g,'IMPORTANTE',584,428,500,{size:59,min:40,color:INK});text(g,d.subtitle,64,548,38,INK,'800');let yy=multiline(g,d.body,64,612,955,{size:33,lineHeight:46,maxLines:5,weight:'600'});const items=parseItems(d.items).slice(0,2);const boxY=Math.max(810,yy+26);if(items.length){items.forEach((v,i)=>{const x=60+i*492;rounded(g,x,boxY,468,163,22,'#e8f3ff');const p=calendarIcon(g,x+23,boxY+37,94);let [dat,desc]=splitItem(v);fitted(g,dat||'AVISO',x+150,boxY+67,305,{size:30,min:19,align:'left'});multiline(g,desc,x+150,boxY+105,295,{size:22,lineHeight:29,maxLines:2,weight:'600'})})}rounded(g,70,1050,940,139,28,'#e8f2fd');text(g,d.time||'RETORNO',W/2,1097,31,INK,'600','center');fitted(g,d.date?`Dia ${d.date}`:(d.place||'Confira as informações'),W/2,1164,845,{size:41,min:24});wave(g,true);footer(g,d.footer)}
  function teddyIllustration(g,x,y){rounded(g,x,y,780,390,40,'#f5a721');if(toys){g.save();g.beginPath();g.roundRect(x,y,780,390,35);g.clip();const aspect=toys.width/toys.height,target=780/390,sw=toys.width,sh=toys.height;let dw=780,dh=390;if(aspect>target)dw=390*aspect;else dh=780/aspect;g.drawImage(toys,x+(780-dw)/2,y+(390-dh)/2,dw,dh);g.restore()}else {text(g,'♡',x+390,y+240,220,WHITE,'700','center')}}
  function solidarity(g,d){drawBase(g,gradient(g,0,H,DARK,'#073d76'));g.fillStyle='#103965';g.beginPath();g.arc(50,130,360,0,Math.PI*2);g.fill();g.fillStyle=GOLD;g.beginPath();g.arc(1075,780,230,0,Math.PI*2);g.fill();text(g,d.subtitle.toUpperCase(),W/2,88,26,WHITE,'600','center');g.fillStyle=GOLD;g.fillRect(250,104,580,5);const tparts=String(d.title).split(/\s+E\s+/i);if(tparts.length>1){multiline(g,tparts[0],W/2,227,985,{size:70,lineHeight:85,color:GOLD,weight:'900',align:'center',maxLines:2});multiline(g,'E '+tparts.slice(1).join(' E '),W/2,330,985,{size:63,lineHeight:78,color:WHITE,weight:'900',align:'center',maxLines:2})}else multiline(g,d.title,W/2,216,960,{size:65,lineHeight:79,color:GOLD,weight:'900',align:'center',maxLines:3});multiline(g,d.body,W/2,415,900,{size:28,lineHeight:38,color:WHITE,weight:'700',align:'center',maxLines:3});const arr=parseItems(d.items);arr.slice(0,2).forEach((item,i)=>{const x=75+i*475;rounded(g,x,520,453,135,25,'#ffffff17');rounded(g,x+20,548,70,70,35,GOLD);text(g,i?'▤':'♡',x+55,603,50,INK,'bold','center');multiline(g,item,x+108,569,325,{size:24,lineHeight:29,color:WHITE,weight:'600',maxLines:3})});rounded(g,190,681,700,72,35,GOLD);fitted(g,`${d.time||'DOAÇÕES'} • ${d.date||'CONSULTE A ESCOLA'}`,540,733,625,{size:31,min:19});teddyIllustration(g,146,780);rounded(g,38,1210,1005,105,45,WHITE);multiline(g,d.footer,W/2,1273,930,{size:37,lineHeight:42,color:INK,weight:'700',align:'center',maxLines:1})}
  function meeting(g,d){drawBase(g,'#fcfeff');g.fillStyle=INK;g.beginPath();g.moveTo(0,0);g.lineTo(300,0);g.quadraticCurveTo(185,250,0,256);g.fill();g.strokeStyle=GOLD;g.lineWidth=10;g.beginPath();g.moveTo(327,0);g.quadraticCurveTo(205,246,0,279);g.stroke();emblem(g,414,38,233,276);multiline(g,d.title,W/2,432,960,{size:72,lineHeight:81,align:'center',maxLines:3});rounded(g,135,520,810,92,30,GOLD);fitted(g,d.subtitle.toUpperCase(),W/2,584,766,{size:48,min:28});multiline(g,d.body,W/2,692,927,{size:36,lineHeight:50,weight:'600',align:'center',maxLines:5});rounded(g,63,922,955,231,32,'#e7f1fc');const data=[['DATA',d.date||'A definir'],['HORÁRIO',d.time||'A definir'],['LOCAL',d.place||'A definir']];data.forEach(([label,val],i)=>{const x=83+i*311;if(i)g.fillStyle=GOLD,g.fillRect(x-13,962,3,150);text(g,label,x+142,991,28,INK,'800','center');multiline(g,val,x+145,1051,280,{size:36,lineHeight:39,weight:'800',align:'center',maxLines:2})});multiline(g,d.footer,W/2,1245,960,{size:43,color:INK,weight:'italic',align:'center',maxLines:2});wave(g,true)}
  function schedule(g,d){drawBase(g,'#fcfeff');g.strokeStyle='#d7e7f8';g.lineWidth=1;for(let x=0;x<W;x+=40){g.beginPath();g.moveTo(x,0);g.lineTo(x,H);g.stroke()}for(let y=0;y<H;y+=40){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke()}emblem(g,442,22,195,244);rounded(g,72,282,935,119,29,GOLD);multiline(g,d.title,W/2,361,894,{size:58,lineHeight:58,color:INK,weight:'900',align:'center',maxLines:2});rounded(g,200,419,680,77,31,INK);fitted(g,d.subtitle,W/2,471,643,{size:41,min:24,color:WHITE});multiline(g,d.body,W/2,564,920,{size:24,lineHeight:28,color:INK,align:'center',maxLines:2,weight:'600'});const arr=parseItems(d.items).slice(0,6);const fills=['#e5e0ff','#fee0e6','#def6e8','#fff1bf','#d9ebff','#e6e2fa'];const rowHeight=Math.min(118,Math.floor(630/Math.max(arr.length,1)));arr.forEach((v,i)=>{const y=645+i*(rowHeight+7);rounded(g,45,y,990,rowHeight,17,WHITE);rounded(g,45,y,220,rowHeight,17,fills[i]);strokeRound(g,45,y,990,rowHeight,17,'#dfebf6',2);const [day,label]=splitItem(v);fitted(g,day,154,y+rowHeight/2+11,202,{size:29,min:18,align:'center'});multiline(g,label,292,y+rowHeight/2-9,720,{size:27,lineHeight:29,color:INK,weight:'700',maxLines:2})});g.fillStyle=INK;g.fillRect(0,1269,W,81);footer(g,d.footer||'Cora Coralina '+YEAR,WHITE)}
  function assessment(g,d){drawBase(g,'#f4f7ff');rounded(g,13,13,1054,245,23,INK);text(g,'COLÉGIO CORA CORALINA',40,66,27,WHITE,'700');multiline(g,d.title,545,114,990,{size:58,lineHeight:65,color:WHITE,weight:'900',align:'center',maxLines:2});rounded(g,350,172,720,74,21,GOLD);fitted(g,d.subtitle.toUpperCase(),710,220,670,{size:42,min:21,color:INK});fitted(g,d.body,W/2,306,940,{size:29,min:18});const arr=parseItems(d.items).slice(0,6);const fills=['#fbe6e9','#e5f2ff','#e4f8e8','#fff1cb','#eee5ff','#e2f2f4'];const rowh=Math.min(162,Math.floor(810/Math.max(arr.length,1)));arr.forEach((v,i)=>{const y=350+i*(rowh+9);const [date,disc]=splitItem(v);rounded(g,28,y,1024,rowh,18,WHITE);rounded(g,28,y,332,rowh,18,fills[i]);calendarIcon(g,54,y+Math.max(15,(rowh-74)/2),74,['#e95465','#2588c5','#37a96a','#dca000','#9657b3'][i%5]);fitted(g,date,245,y+rowh/2+13,217,{size:31,min:20});multiline(g,disc,407,y+rowh/2-13,630,{size:30,lineHeight:34,maxLines:2,weight:'700'})});rounded(g,35,1240,1010,84,19,'#e4edfd');fitted(g,d.footer,540,1295,952,{size:26,min:19})}
  function regularAssessments(g,d){
    drawBase(g,'#f7faff');
    g.fillStyle=INK;g.fillRect(0,0,W,245);
    g.fillStyle=GOLD;g.fillRect(0,245,W,10);
    emblem(g,58,34,134,169);
    text(g,'COLÉGIO CORA CORALINA',218,93,29,WHITE,'800');
    text(g,'CALENDÁRIO ESCOLAR  •  '+YEAR,219,142,23,'#c9dcf2','700');
    rounded(g,219,160,350,47,14,'#ffffff1e');
    text(g,'AVALIAÇÕES E SIMULADOS',236,191,21,GOLD,'800');
    multiline(g,d.title,W/2,349,972,{size:68,lineHeight:76,color:INK,weight:'900',align:'center',maxLines:2});
    rounded(g,152,428,776,67,22,GOLD);
    fitted(g,d.subtitle.toUpperCase(),W/2,472,726,{size:31,min:21});
    const bodyEnd=multiline(g,d.body,W/2,541,954,{size:26,lineHeight:36,weight:'500',align:'center',maxLines:4});
    const arr=parseItems(d.items).slice(0,6);
    const firstY=Math.max(685,bodyEnd+25);
    const available=1234-firstY;
    const rowGap=13;
    const rowH=Math.min(112,Math.floor((available-(Math.max(arr.length,1)-1)*rowGap)/Math.max(arr.length,1)));
    arr.forEach((v,i)=>{
      const y=firstY+i*(rowH+rowGap),pair=splitItem(v),date=pair[0],disc=pair[1]||'Confira a programação';
      rounded(g,52,y,976,rowH,16,WHITE);strokeRound(g,52,y,976,rowH,16,'#d8e6f4',2);
      rounded(g,52,y,275,rowH,16,i%2===0?'#e4f1fd':'#ebeffa');
      fitted(g,date,191,y+rowH/2+11,247,{size:31,min:19,align:'center'});
      multiline(g,disc,354,y+rowH/2-12,643,{size:29,lineHeight:32,maxLines:2,weight:'700'});
    });
    g.fillStyle=INK;g.fillRect(0,1251,W,99);
    g.fillStyle=GOLD;g.fillRect(0,1251,W,6);
    fitted(g,d.footer||'COLÉGIO CORA CORALINA',W/2,1313,980,{size:24,min:17,color:WHITE});
  }
  function getForm(){const v={};Object.keys(DEFAULTS[template]).forEach(k=>v[k]=String(form.elements.namedItem(k)?.value||''));return v}
  function getDraft(){return drafts[template]||JSON.parse(JSON.stringify(DEFAULTS[template]).replace(/2026/g,String(YEAR)))}
  function setForm(d){for(const name of Object.keys(DEFAULTS[template])){const el=form.elements.namedItem(name);if(el)el.value=d[name]??''}}
  function render(){const d=getForm();ctx.clearRect(0,0,W,H);try{({comunicado:notice,solidaria:solidarity,reuniao:meeting,cronograma:schedule,avaliacoes:regularAssessments,avaliacao:assessment}[template]||notice)(ctx,d)}catch(e){console.error(e);drawBase(ctx);text(ctx,'Erro ao visualizar. Revise os campos.',40,130,27,INK)}ctx.save();ctx.fillStyle='rgba(255,255,255,.92)';ctx.fillRect(W-275,H-23,270,20);text(ctx,'PDF SOLUÇÃO EDUCACIONAL',W-14,H-8,14,INK,'700','right');ctx.restore();renderCount++}
  function saveDraft(){try{drafts[template]=getForm();localStorage.setItem(ID,JSON.stringify(drafts));$('cardSaveStatus').textContent='Rascunho salvo'}catch{$('cardSaveStatus').textContent='Salvamento indisponível'}}
  function setTemplate(name){if(!DEFAULTS[name])return;saveDraft();template=name;setForm(getDraft());document.querySelectorAll('[data-template]').forEach(el=>{el.classList.toggle('is-selected',el.dataset.template===name);el.setAttribute('aria-pressed',el.dataset.template===name?'true':'false')});render()}
  function loadImg(str){return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=str||''})}
  function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),8000)}
  function status(message){const toast=$('toast');if(!toast)return;toast.textContent=message;toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),4500)}
  async function pdfLibrary(){if(window.PDFLib)return window.PDFLib;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';s.onload=resolve;s.onerror=()=>reject(Error('Biblioteca PDF indisponível'));document.head.append(s)});return window.PDFLib}
  form.addEventListener('submit',event=>event.preventDefault());
  form.addEventListener('input',()=>{saveDraft();render()});
  document.querySelectorAll('[data-template]').forEach(el=>el.addEventListener('click',()=>setTemplate(el.dataset.template)));
  $('resetCard').addEventListener('click',()=>{if(confirm('Restaurar o texto original deste modelo?')){drafts[template]={...DEFAULTS[template]};setForm(drafts[template]);saveDraft();render()}});
  $('downloadCardPng').addEventListener('click',()=>{saveDraft();render();canvas.toBlob(blob=>{if(blob){download(blob,`Cora_Coralina_Card_${template}_${YEAR}.png`);status('Card em PNG baixado com sucesso.')}else status('Falha ao gerar imagem.')},'image/png')});
  $('downloadCardPdf').addEventListener('click',async()=>{saveDraft();render();const btn=$('downloadCardPdf');btn.disabled=true;btn.textContent='Gerando PDF...';try{const file=window.CoraPDF.fromCanvases([canvas],{pageWidth:540,pageHeight:675,title:`Card Cora Coralina ${template} ${YEAR}`});download(file,`Cora_Coralina_Card_${template}_${YEAR}.pdf`);status('Card em PDF baixado com sucesso.')}catch(e){console.error(e);status('PDF indisponível neste navegador. Baixe o PNG e imprima como PDF.')}finally{btn.disabled=false;btn.textContent='↓ Baixar PDF'}});
  $('jumpCards').addEventListener('click',()=>$('cardStudio').scrollIntoView({behavior:'smooth',block:'start'}));
  try{const obj=JSON.parse(localStorage.getItem(ID)||'{}');if(obj&&typeof obj==='object'&&!Array.isArray(obj))drafts=obj}catch{}
  setForm(getDraft());render();
  Promise.all([loadImg(window.CORA_STUDIO_ASSETS?.logo),loadImg(window.CORA_STUDIO_ASSETS?.toys)]).then(([a,b])=>{logo=a;toys=b;render()});
  window.addEventListener('cora-backup-restored',()=>{try{drafts=JSON.parse(localStorage.getItem(ID)||'{}')||{}}catch{drafts={}}setForm(getDraft());render()});
  window.addEventListener('cora-year-changed',e=>{
    saveDraft();YEAR=Number(e.detail.year);ID=`cora_cards_${YEAR}_v1`;
    try{drafts=JSON.parse(localStorage.getItem(ID)||'{}')||{}}catch{drafts={}}
    setForm(getDraft());render();
  });
})();