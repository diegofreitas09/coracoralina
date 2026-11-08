/* Páginas complementares legíveis para os PDFs da Equipe Pedagógica (2027+).
 * A grade mensal mostra um resumo; aqui TODOS os eventos são descritos sem reticências.
 */
(() => {
 'use strict';
 const WIDTH=1684,HEIGHT=1350,MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
 const NAVY='#0d315b',BLUE='#185483',INK='#143b60',MUTED='#526c84',YELLOW='#ffca2a';
 const font=(size,weight='400')=>weight+' '+size+'px Arial, sans-serif';
 const str=value=>String(value??'').replace(/\r/g,'').trim();
 const monthId=e=>Number(String(e?.date||'').slice(5,7))-1;
 const eventsOfMonth=(events,month,year)=>Array.isArray(events)?(window.CoraCalendarIntegrity?.filterEvents?.(events)||events).filter(e=>
    String(e?.date||'').startsWith(year+'-'+String(month+1).padStart(2,'0')+'-')&&str(e.title))
   .sort((a,b)=>String(a.date).localeCompare(String(b.date))||
     String(a.time||'').localeCompare(String(b.time||''))||
     String(a.title).localeCompare(String(b.title),'pt-BR')):[];
 function wrapText(g,value,maxWidth,fontValue){
  const raw=str(value);if(!raw)return [];
  g.font=fontValue;
  const result=[];
  for(const paragraph of raw.split('\n')){
   if(!paragraph.trim()){result.push('');continue}
   let line='';
   for(const word of paragraph.trim().split(/\s+/)){
    const candidate=line?line+' '+word:word;
    if(g.measureText(candidate).width<=maxWidth){line=candidate;continue}
    if(line){result.push(line);line=''}
    // Divide palavras longas, preservando todos os caracteres do original.
    for(const char of Array.from(word)){
     if(line&&g.measureText(line+char).width>maxWidth){result.push(line);line=''}
     line+=char;
    }
   }
   if(line)result.push(line);
  }
  return result;
 }
 function createCanvas(){
  const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
  const g=canvas.getContext('2d');
  if(!g)throw Error('Não foi possível desenhar o calendário.');
  g.fillStyle='#ffffff';g.fillRect(0,0,WIDTH,HEIGHT);
  return {canvas,g};
 }
 function print(g,value,x,y,size,color=INK,weight='400'){
  g.font=font(size,weight);g.fillStyle=color;g.fillText(String(value),x,y);
 }
 function header(g,{year,month,logo,title,subtitle}){
  g.fillStyle=NAVY;g.fillRect(0,0,WIDTH,154);
  g.fillStyle=YELLOW;g.fillRect(0,154,WIDTH,8);
  print(g,MONTHS[month].toUpperCase()+' '+year,70,84,59,'#ffffff','800');
  print(g,'COLÉGIO CORA CORALINA · CALENDÁRIO PEDAGÓGICO',70,132,21,'#dceaf7','700');
  if(logo){try{g.drawImage(logo,1532,13,95,127)}catch{}}
  print(g,title,70,217,36,NAVY,'800');
  print(g,subtitle,70,258,18,MUTED);
  g.fillStyle='#e9f1f8';g.fillRect(70,280,WIDTH-140,3);
 }
 function footer(g,subtitle,page,total){
  g.fillStyle='#e7eef6';g.fillRect(70,1274,WIDTH-140,2);
  print(g,'PDF SOLUÇÃO EDUCACIONAL · COLÉGIO CORA CORALINA',70,1310,18,MUTED,'600');
  print(g,subtitle,805,1310,17,BLUE,'600');
  print(g,'PÁGINA '+page+' DE '+total,1460,1310,16,MUTED,'700');
 }
 function eventLines(g,item,maxWidth,scale=1){
  const lines=[];
  const add=(value,size,color,weight,spacing)=>{
   for(const content of wrapText(g,value,maxWidth,font(size*scale,weight)))
    lines.push({text:content,size:size*scale,color,weight,height:spacing*scale});
  };
  add(item.title||'Atividade sem título',23,INK,'700',30);
  const meta=[
   item.type?'Categoria: '+str(item.type):'',
   item.time?'Horário: '+str(item.time):'',
   item.place?'Local: '+str(item.place):'',
   item.audience?'Público: '+str(item.audience):'',
   item.mode?'Modalidade: '+str(item.mode):'',
   item.duration?'Duração: '+Number(item.duration)+' minutos':'',
   item.stageNumber?'Etapa: '+Number(item.stageNumber)+'ª':''
  ].filter(Boolean).join('  ·  ');
  if(meta)add(meta,16.5,BLUE,'600',22);
  if(str(item.deliveryTypes))add('Avaliações previstas: '+str(item.deliveryTypes),16,MUTED,'400',22);
  if(str(item.notes))add('Observações: '+str(item.notes),16,MUTED,'400',22);
  if(str(item.meet))add('Acesso on-line: '+str(item.meet),15.5,MUTED,'400',21);
  return lines;
 }
 function makeCards(g,items,width,scale){
  const textWidth=width-116*scale;
  return items.map((item,index)=>{
   const lines=eventLines(g,item,textWidth,scale);
   const height=Math.max(77*scale,lines.reduce((n,line)=>n+line.height,0)+26*scale);
   return {item,index,lines,height,continued:false};
  });
 }
 // Mantém a ordem cronológica: primeiro a coluna da esquerda, depois a da direita.
 // A partição minimiza a altura da coluna mais longa (evita páginas extras).
 function balancedColumns(cards,count,gap){
  const n=cards.length,k=Math.min(count,n);
  const prefix=[0];cards.forEach(c=>prefix.push(prefix[prefix.length-1]+c.height));
  const extent=(a,b)=>prefix[b]-prefix[a]+Math.max(0,b-a-1)*gap;
  const dp=Array.from({length:k+1},()=>Array(n+1).fill(Infinity));
  const prev=Array.from({length:k+1},()=>Array(n+1).fill(-1));
  dp[0][0]=0;
  for(let col=1;col<=k;col++){
   for(let i=col;i<=n;i++){
    for(let j=col-1;j<i;j++){
     const height=Math.max(dp[col-1][j],extent(j,i));
     if(height<dp[col][i]){dp[col][i]=height;prev[col][i]=j;}
    }
   }
  }
  const groups=Array(k);let at=n;
  for(let col=k;col>=1;col--){
   const from=prev[col][at];groups[col-1]=cards.slice(from,at);at=from;
  }
  return {groups,height:dp[k][n]};
 }
 function detailPages({year,month,events,logo}={}){
  const y=Number(year),m=Number(month);
  if(!Number.isInteger(y)||y<2027||y>2099||!Number.isInteger(m)||m<0||m>11)
   throw Error('Ano e mês inválidos para exportação.');
  const items=eventsOfMonth(events,m,y);
  if(!items.length)return [];
  const TOP=306,BOTTOM=1250,AVAILABLE=BOTTOM-TOP,GAP=11;
  const pages=[];
  const measurement=createCanvas().g;
  const options=[
   {columns:2,scale:1},{columns:3,scale:1},
   {columns:2,scale:.94},{columns:3,scale:.94},
   {columns:2,scale:.89},{columns:3,scale:.89}
  ];
  let chosen=null;
  for(const option of options){
   const colGap=option.columns===2?24:19;
   const colWidth=(WIDTH-140-colGap*(option.columns-1))/option.columns;
   const cards=makeCards(measurement,items,colWidth,option.scale);
   const layout=balancedColumns(cards,option.columns,GAP);
   if(layout.height<=AVAILABLE){
    chosen={...option,colGap,colWidth,groups:layout.groups};break;
   }
  }
  function newPage(){
   const page=createCanvas();
   header(page.g,{year:y,month:m,logo,title:'ATIVIDADES COMPLETAS DO MÊS',
    subtitle:items.length+' atividade(s) publicadas · datas, títulos e informações completas'});
   pages.push(page);
   return page;
  }
  function drawCard(g,card,x,top,width,scale){
   const {item,lines,index,continued}=card;
   g.fillStyle=index%2?'#f7fafc':'#edf4fb';
   g.fillRect(x,top,width,card.height);
   g.strokeStyle='#dce7f1';g.lineWidth=1;g.strokeRect(x,top,width,card.height);
   const badgeW=81*scale;
   g.fillStyle='#dfeefd';g.fillRect(x+9*scale,top+10*scale,badgeW,49*scale);
   const mm=String(m+1).padStart(2,'0');
   print(g,String(item.date).slice(8,10)+'/'+mm,x+16*scale,top+38*scale,20*scale,NAVY,'800');
   print(g,String(index+1).padStart(2,'0')+'/'+String(items.length).padStart(2,'0'),
    x+17*scale,top+73*scale,12*scale,MUTED,'600');
   const textX=x+103*scale;
   let textTop=top+9*scale;
   if(continued){
    print(g,'CONTINUAÇÃO',textX,textTop+14*scale,12*scale,'#a25b26','800');
    textTop+=18*scale;
   }
   for(const line of lines){
    textTop+=line.height;
    print(g,line.text,textX,textTop-7*scale,line.size,line.color,line.weight);
   }
  }
  if(chosen){
   const page=newPage();
   chosen.groups.forEach((group,col)=>{
    let top=TOP;
    const left=70+col*(chosen.colWidth+chosen.colGap);
    group.forEach(card=>{drawCard(page.g,card,left,top,chosen.colWidth,chosen.scale);top+=card.height+GAP;});
   });
  }else{
   // Meses excepcionalmente extensos continuam em outras páginas sem cortar atividades.
   const scale=.94,columns=2,colGap=24,colWidth=(WIDTH-140-colGap)/columns;
   const measured=makeCards(measurement,items,colWidth,scale);
   const fragments=[];
   for(const card of measured){
    if(card.height<=AVAILABLE){fragments.push(card);continue;}
    let part=[],used=0,first=true;
    const finish=()=>{
     if(!part.length)return;
     fragments.push({...card,lines:part,height:used+26*scale+(first?0:18*scale),continued:!first});
     part=[];used=0;first=false;
    };
    for(const line of card.lines){
     const reserve=26*scale+(first?0:18*scale);
     if(part.length&&used+line.height+reserve>AVAILABLE)finish();
     part.push(line);used+=line.height;
    }
    finish();
   }
   let page=newPage(),col=0,top=TOP;
   for(const card of fragments){
    if(top+card.height>BOTTOM){
     col++;top=TOP;
     if(col===columns){page=newPage();col=0;}
    }
    drawCard(page.g,card,70+col*(colWidth+colGap),top,colWidth,scale);
    top+=card.height+GAP;
   }
  }
  pages.forEach(({g},i)=>footer(g,MONTHS[m]+' '+y,i+1,pages.length));
  return pages.map(page=>page.canvas);
 }
 function annualCover({year,events=[],stages=[],projects=[],birthdays=[],logo}={}){
  const y=Number(year);if(!Number.isInteger(y)||y<2027||y>2099)throw Error('Ano letivo inválido');
  const {canvas,g}=createCanvas();
  g.fillStyle=NAVY;g.fillRect(0,0,WIDTH,525);
  g.fillStyle=YELLOW;g.fillRect(0,525,WIDTH,13);
  print(g,'COLÉGIO CORA CORALINA',87,146,37,'#e4eff9','700');
  print(g,'CALENDÁRIO PEDAGÓGICO',87,287,69,'#ffffff','800');
  print(g,'ANO LETIVO '+y,87,393,57,'#ffd34a','800');
  if(logo){try{g.drawImage(logo,1445,90,155,207)}catch{}}
  const items=(Array.isArray(events)?events:[]).filter(e=>String(e?.date||'').startsWith(y+'-'));
  const monthly=MONTHS.map((name,m)=>({name,count:eventsOfMonth(items,m,y).length}));
  const pCount=(Array.isArray(projects)?projects:[]).reduce((n,v)=>n+(Array.isArray(v)?v.length:0),0);
  const summaries=[
   [items.length,'ATIVIDADES'],
   [(Array.isArray(stages)?stages:[]).filter(s=>s.start&&s.end).length+'/4','ETAPAS COM DATAS'],
   [pCount,'PROJETOS'],
   [(Array.isArray(birthdays)?birthdays:[]).length,'ANIVERSARIANTES']
  ];
  summaries.forEach(([value,label],i)=>{
   const x=88+i*395;
   g.fillStyle='#f1f6fb';g.fillRect(x,590,373,129);
   print(g,String(value),x+22,656,48,NAVY,'800');
   print(g,label,x+22,695,18,MUTED,'700');
  });
  print(g,'PANORAMA DOS DOZE MESES',89,794,32,NAVY,'800');
  monthly.forEach((v,i)=>{
   const col=i%4,row=Math.floor(i/4),x=89+col*394,z=842+row*102;
   g.fillStyle=i%2?'#f8fafc':'#edf4fb';g.fillRect(x,z,373,89);
   print(g,v.name,x+15,z+34,22,INK,'700');
   print(g,v.count+' atividade(s)',x+15,z+67,19,MUTED,'600');
  });
  print(g,'Cada mês reúne o calendário visual e, em seguida, todas as atividades',
    90,1200,22,NAVY,'600');
  print(g,'com títulos completos, datas e informações pedagógicas publicadas.',
    90,1234,22,NAVY,'600');
  footer(g,'DOCUMENTO COMPLETO · '+y,1,1);
  return canvas;
 }
 window.CoraPDFActivities={detailPages,annualCover,wrapText,eventsOfMonth,monthId};
})();