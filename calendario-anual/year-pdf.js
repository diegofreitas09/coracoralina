(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const W=1240,H=1754,NAVY='#0c2c52',BLUE='#2464a7',GOLD='#e2b13b',INK='#223d5b',MUTED='#7589a1',BG='#f4f7fb';
  const MONTHS=window.CoraYears.MONTHS;
  const WEEK=['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
  let logoPromise;
  function canvas(w=W,h=H){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,w,h);return[c,g];}
  function box(g,x,y,w,h,color,r=10){g.fillStyle=color;g.beginPath();g.roundRect(x,y,w,h,r);g.fill();}
  function tx(g,v,x,y,size=24,color=INK,weight='600',align='left',maxWidth){
    g.fillStyle=color;g.font=weight+' '+size+'px Arial,sans-serif';g.textAlign=align;
    g.fillText(String(v??''),x,y,maxWidth);g.textAlign='left';
  }
  function clipText(g,v,maxW,size=21,weight='600'){
    g.font=weight+' '+size+'px Arial,sans-serif';
    let str=String(v??'');
    while(str.length>1&&g.measureText(str).width>maxW)str=str.slice(0,-2)+'…';
    return str;
  }
  async function loadLogo(){
    if(!logoPromise)logoPromise=new Promise(resolve=>{
      const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);
      img.src=window.CORA_SCHOOL_LOGO||window.CORA_STUDIO_ASSETS?.logo||'';
    });
    return logoPromise;
  }
  function drawLogo(g,img,x,y,w,h){
    if(img && img.naturalWidth){box(g,x,y,w,h,'#fff',9);g.drawImage(img,x+4,y+4,w-8,h-8);}
    else{box(g,x,y,w,h,BLUE,9);tx(g,'CORA',x+w/2,y+h/2,23,'#fff','800','center');}
  }
  function download(blob,name){
    const u=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(u),10000);
  }
  async function versionCode(year){
    const payload=JSON.stringify({year,events:window.CoraYears.getEvents(year),projects:window.CoraYears.getProjects(year)});
    if(crypto?.subtle){
      const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(payload));
      return Array.from(new Uint8Array(h)).slice(0,8).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
    }
    let a=2166136261;for(let i=0;i<payload.length;i++)a=Math.imul(a^payload.charCodeAt(i),16777619);
    return ('00000000'+(a>>>0).toString(16)).slice(-8).toUpperCase();
  }
  function header(g,logo,year,title,sub){
    g.fillStyle=NAVY;g.fillRect(0,0,W,162);g.fillStyle=GOLD;g.fillRect(0,162,W,8);
    drawLogo(g,logo,50,20,101,125);
    tx(g,'COLÉGIO CORA CORALINA',184,65,29,'#fff','800');
    tx(g,title,184,119,42,'#fff','800', 'left', 995);
    tx(g,sub,55,214,21,MUTED,'600');
  }
  function footer(g,year,code,pageName){
    g.fillStyle='#e6ecf4';g.fillRect(48,1680,W-96,2);
    tx(g,'CALENDÁRIO ESCOLAR '+year+'   ·   COLÉGIO CORA CORALINA',51,1711,19,NAVY,'800');
    tx(g,'Versão: '+code+'  ·  '+pageName,51,1740,16,MUTED,'600');
    tx(g,'calendario-anual-cora-2026.netlify.app',W-52,1740,16,MUTED,'500','right');
  }
  function monthSheet(month,year,logo,code){
    const [c,g]=canvas();
    const events=window.CoraYears.getEvents(year).filter(e=>Number(e.date.slice(5,7))===month+1);
    const projects=window.CoraYears.getProjects(year)[month]||[];
    header(g,logo,year,MONTHS[month].toUpperCase()+'  '+year,`${events.length} atividades  •  ${projects.length} projetos no mês`);
    const top=249,cellW=163,cellH=73,x0=49;
    WEEK.forEach((d,i)=>{box(g,x0+i*cellW,top,cellW-5,38,'#e6effa',6);tx(g,d,x0+i*cellW+cellW/2,top+27,19,BLUE,'800','center')});
    const start=new Date(year,month,1).getDay(),last=new Date(year,month+1,0).getDate();
    for(let i=0;i<42;i++){
      const x=x0+(i%7)*cellW,y=top+45+Math.floor(i/7)*cellH;
      const day=i-start+1,valid=day>0&&day<=last;
      box(g,x,y,cellW-5,cellH-4,valid?'#fff':'#f3f6fa',5);
      g.strokeStyle='#d8e4f0';g.lineWidth=1.5;g.strokeRect(x,y,cellW-5,cellH-4);
      if(!valid)continue;
      tx(g,day,x+10,y+23,20,INK,'800');
      const matches=events.filter(e=>Number(e.date.slice(8))===day);
      matches.slice(0,3).forEach((e,j)=>{box(g,x+8+j*17,y+38,10,10,e.type==='Avaliação'?GOLD:e.type==='Reunião'?'#2c9c83':BLUE,5)});
      if(matches.length)tx(g,String(matches.length)+' evento(s)',x+8,y+62,14,BLUE,'700');
    }
    const listTop=top+45+6*cellH+34;
    box(g,48,listTop,W-96,48,NAVY,8);tx(g,'ATIVIDADES DO MÊS',67,listTop+33,23,'#fff','800');
    const maxRows=17,cols=2,columnW=(W-116)/2;
    events.slice(0,34).forEach((event,i)=>{
      const col=Math.floor(i/maxRows),row=i%maxRows;
      const x=54+col*(columnW+8),y=listTop+70+row*31;
      tx(g,event.date.slice(8,10)+'/'+event.date.slice(5,7),x,y,18,BLUE,'800');
      tx(g,clipText(g,event.title,columnW-85,18,'600'),x+66,y,18,INK,'600');
      if(event.status==='Em revisão')box(g,x+columnW-13,y-15,7,7,GOLD,4);
    });
    if(events.length>34)tx(g,`+${events.length-34} registros adicionais na plataforma`,62,listTop+70+17*31,17,BLUE,'700');
    const projTop=1518;
    box(g,48,projTop,W-96,44,'#f4e7be',8);tx(g,'PROJETOS E AÇÕES INSTITUCIONAIS',64,projTop+30,23,NAVY,'800');
    projects.slice(0,4).forEach((name,i)=>tx(g,'• '+clipText(g,name,W-127,20),67,projTop+74+i*26,20,INK,'600'));
    if(projects.length>4)tx(g,`+ ${projects.length-4} projetos no diretório`,70,1666,16,BLUE,'700');
    footer(g,year,code,MONTHS[month]);
    return c;
  }
  function annualSheet(year,logo,code){
    const[c,g]=canvas();header(g,logo,year,'PANORAMA ANUAL  '+year,'Resumo executivo: 12 meses em uma única página');
    const evs=window.CoraYears.getEvents(year),projs=window.CoraYears.getProjects(year);
    const cardW=357,cardH=335,gapX=23,gapY=24,x0=48,y0=260;
    for(let month=0;month<12;month++){
      const col=month%3,row=Math.floor(month/3),x=x0+col*(cardW+gapX),y=y0+row*(cardH+gapY);
      const events=evs.filter(e=>Number(e.date.slice(5,7))===month+1),projects=projs[month]||[];
      box(g,x,y,cardW,cardH,BG,12);box(g,x,y,cardW,51,NAVY,10);
      tx(g,MONTHS[month],x+14,y+34,25,'#fff','800');
      tx(g,events.length+' atividades',x+cardW-13,y+33,15,'#e5edf8','700','right');
      tx(g,'EVENTOS',x+15,y+81,15,BLUE,'800');
      events.slice(0,6).forEach((e,i)=>{
        tx(g,e.date.slice(8),x+14,y+112+i*25,17,BLUE,'800');
        tx(g,clipText(g,e.title,cardW-76,17),x+48,y+112+i*25,17,INK,'600');
      });
      if(events.length>6)tx(g,'+ '+(events.length-6)+' atividades',x+15,y+271,15,MUTED,'700');
      tx(g,'PROJETOS',x+15,y+291,15,BLUE,'800');
      if(projects[0])tx(g,clipText(g,projects[0],cardW-28,15),x+15,y+316,15,INK,'600');
      else tx(g,'Sem projetos informados',x+15,y+316,15,MUTED,'500');
    }
    footer(g,year,code,'PANORAMA ANUAL');
    return c;
  }
  async function cardSheet(){
    const api=window.CoraYears,year=api.activeYear,type=api.summaryForType(),events=api.filteredSummaryEvents(),
      month=api.month,scope=$('summaryScope').value,projects=api.getProjects(year);
    const [c,g]=canvas(1080,1350),img=await loadLogo();
    const title=type==='Todas as atividades'?'AGENDA ESCOLAR':type==='Projetos'?'PROJETOS DO MÊS':type==='Avaliação'?'CALENDÁRIO DE AVALIAÇÕES':type==='Reunião'?'REUNIÕES ESCOLARES':type.toUpperCase();
    g.fillStyle=NAVY;g.fillRect(0,0,1080,253);g.fillStyle=GOLD;g.fillRect(0,253,1080,9);
    drawLogo(g,img,40,29,118,171);
    tx(g,'COLÉGIO CORA CORALINA',184,82,33,'#fff','800');
    tx(g,clipText(g,title,855,47,'800'),184,145,47,'#fff','800');
    tx(g,`${scope==='month'?MONTHS[month]+' de ':''}${year} · ${api.audience==='Todos'?'Diretório principal':api.audience}`,186,202,23,'#dbe9fb','600');
    const items=type==='Projetos'?(scope==='month'?projects[month].map(n=>({title:n,date:''})):projects.flatMap((a,i)=>a.map(n=>({title:n,date:MONTHS[i]})))):events;
    tx(g,`${items.length} ${type==='Projetos'?'projetos':'atividades'}`,66,330,26,BLUE,'800');
    const maxRows=15,display=items.slice(0,maxRows);
    display.forEach((e,i)=>{
      const y=375+i*54;
      box(g,55,y,970,47,i%2?'#fff':'#e9f2fc',11);
      if(e.date&&/^\d{4}-/.test(e.date)){
        tx(g,e.date.slice(8)+'/'+e.date.slice(5,7),69,y+30,23,BLUE,'800');
      }else if(e.date){tx(g,clipText(g,e.date,100,19),69,y+30,19,BLUE,'800');}
      else tx(g,'•',72,y+31,22,BLUE,'800');
      tx(g,clipText(g,e.title,810,23,'600'),190,y+30,23,INK,'600');
    });
    if(items.length>maxRows)tx(g,`+${items.length-maxRows} registros adicionais no calendário`,72,1220,21,BLUE,'700');
    box(g,0,1250,1080,100,NAVY,0);
    tx(g,'CORA CORALINA · CALENDÁRIO ESCOLAR '+year,540,1292,22,'#fff','800','center');
    tx(g,'Resumo gerado a partir da matriz do ano letivo',540,1322,17,'#cbdcef','500','center');
    return c;
  }
  async function withBusy(id,action){
    const btn=$(id);if(!btn)return;const old=btn.textContent;btn.disabled=true;btn.textContent='Gerando documento...';
    try{await action();window.CoraYears.toast('Documento gerado com sucesso.');}
    catch(e){console.error(e);window.CoraYears.toast('Não foi possível criar o documento: '+e.message);}
    finally{btn.disabled=false;btn.textContent=old;}
  }
  function printCanvasPDF(canvases,year,name){
    if(!window.CoraPDF?.fromCanvases)throw Error('Gerador PDF indisponível');
    const blob=window.CoraPDF.fromCanvases(canvases,{pageWidth:595.28,pageHeight:841.89,title:`Calendário Cora Coralina ${year} — ${name}`});
    download(blob,`Cora_Coralina_${name}_${year}.pdf`);
  }
  async function monthly(){
    const api=window.CoraYears,year=api.activeYear,logo=await loadLogo(),code=await versionCode(year),pages=[];
    for(let month=0;month<12;month++)pages.push(monthSheet(month,year,logo,code));
    printCanvasPDF(pages,year,'Calendario_Completo_12_Meses');
  }
  async function onePage(){
    const year=window.CoraYears.activeYear,logo=await loadLogo(),code=await versionCode(year);
    printCanvasPDF([annualSheet(year,logo,code)],year,'Panorama_Anual_Uma_Pagina');
  }
  async function category(format){
    const page=await cardSheet(),year=window.CoraYears.activeYear,type=window.CoraYears.summaryForType().replace(/\s+/g,'_');
    if(format==='pdf')printCanvasPDF([page],year,'Resumo_'+type);
    else page.toBlob(blob=>{if(blob)download(blob,`Cora_Coralina_Resumo_${type}_${year}.png`);else window.CoraYears.toast('Falha ao exportar a imagem.');},'image/png');
  }
  window.CoraYears.exportMonthlyPDF=()=>withBusy('exportBtn',monthly);
  window.CoraYears.exportOnePagePDF=()=>withBusy('annualOnePageBtn',onePage);
  function init(){
    $('yearFullPdfBtn').addEventListener('click',()=>withBusy('yearFullPdfBtn',monthly));
    $('annualOnePageBtn').addEventListener('click',()=>withBusy('annualOnePageBtn',onePage));
    $('summaryCardBtn').addEventListener('click',()=>withBusy('summaryCardBtn',()=>category('png')));
    $('summaryPdfBtn').addEventListener('click',()=>withBusy('summaryPdfBtn',()=>category('pdf')));
    $('exportBtn').textContent='↓ Baixar calendário completo';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
