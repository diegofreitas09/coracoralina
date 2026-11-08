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
 const eventsOfMonth=(events,month,year)=>Array.isArray(events)?events.filter(e=>
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
 function eventLines(g,item){
  const lines=[],width=WIDTH-338;
  const add=(value,size,color,weight,spacing)=>{
   for(const content of wrapText(g,value,width,font(size,weight)))
    lines.push({text:content,size,color,weight,height:spacing});
  };
  add(item.title||'Atividade sem título',28,INK,'700',37);
  const meta=[
   item.type?'Categoria: '+str(item.type):'',
   item.time?'Horário: '+str(item.time):'',
   item.place?'Local: '+str(item.place):'',
   item.audience?'Público: '+str(item.audience):''
  ].filter(Boolean).join('  ·  ');
  if(meta)add(meta,20,BLUE,'600',28);
  if(str(item.notes))add('Observações: '+str(item.notes),20,MUTED,'400',29);
  if(str(item.meet))add('Acesso on-line: '+str(item.meet),19,MUTED,'400',27);
  return lines;
 }
 function detailPages({year,month,events,logo}={}){
  const y=Number(year),m=Number(month);
  if(!Number.isInteger(y)||y<2027||y>2099||!Number.isInteger(m)||m<0||m>11)
    throw Error('Ano e mês inválidos para exportação.');
  const items=eventsOfMonth(events,m,y);
  if(!items.length)return [];
  const pages=[];let active=null,top=303;
  function newPage(){
   const {canvas,g}=createCanvas();
   header(g,{year:y,month:m,logo,title:'ATIVIDADES COMPLETAS DO MÊS',
     subtitle:items.length+' atividade(s) publicadas · títulos e informações sem abreviação'});
   active={canvas,g};pages.push(active);top=310;
  }
  newPage();
  const bottom=1253,cardLeft=70,cardWidth=WIDTH-140,innerX=224;
  items.forEach((item,index)=>{
   const lines=eventLines(active.g,item);
   let position=0,part=0;
   while(position<lines.length){
    if(top>bottom-120)newPage();
    const available=bottom-top-56;
    let taken=[],used=0;
    while(position<lines.length&&used+lines[position].height<=available){
     const row=lines[position++];taken.push(row);used+=row.height;
    }
    if(!taken.length){newPage();continue}
    const height=Math.max(93,used+43);
    const g=active.g;
    g.fillStyle=part%2?'#f6f9fd':'#f1f6fb';g.fillRect(cardLeft,top,cardWidth,height);
    g.strokeStyle='#dce6f1';g.lineWidth=1;g.strokeRect(cardLeft,top,cardWidth,height);
    const day=String(item.date).slice(8,10),mm=String(m+1).padStart(2,'0');
    g.fillStyle='#dfeefd';g.fillRect(cardLeft+13,top+15,124,54);
    print(g,day+'/'+mm,cardLeft+24,top+51,25,NAVY,'800');
    print(g,String(index+1).padStart(2,'0')+'/'+String(items.length).padStart(2,'0'),
      cardLeft+24,top+84,15,MUTED,'600');
    if(part>0)print(g,'CONTINUAÇÃO',innerX,top+18,14,'#a25b26','800');
    let lineTop=top+24;
    for(const line of taken){
     lineTop+=line.height;
     print(g,line.text,innerX,lineTop-11,line.size,line.color,line.weight);
    }
    top+=height+15;
    part++;
    if(position<lines.length)newPage();
   }
  });
  pages.forEach(({g},i)=>footer(g,MONTHS[m]+' '+y,i+1,pages.length));
  return pages.map(x=>x.canvas);
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