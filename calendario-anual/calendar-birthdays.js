/* Integra aniversariantes recorrentes à Gestão, Equipe e PDFs sem publicar dados privados. */
(() => {
 'use strict';
 const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
 const clean=s=>String(s||'').trim().replace(/\s+/g,' ');
 const normalize=s=>clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function valid(b){
  const m=Number(b?.month),d=Number(b?.day);
  return clean(b?.name)&&Number.isInteger(m)&&Number.isInteger(d)&&m>=1&&m<=12&&d>=1&&d<=new Date(Date.UTC(2024,m,0)).getUTCDate();
 }
 function unique(list){
  if(!Array.isArray(list))return [];
  const seen=new Map();
  for(const b of list){
   if(!valid(b))continue;
   const item={id:String(b.id||''),name:clean(b.name).slice(0,100),day:Number(b.day),month:Number(b.month),role:clean(b.role).slice(0,85)};
   const nameKey=normalize(item.name)+':'+item.month+':'+item.day;
   if(!seen.has(nameKey))seen.set(nameKey,item);
  }
  return [...seen.values()].sort((a,b)=>a.month-b.month||a.day-b.day||a.name.localeCompare(b.name,'pt-BR'));
 }
 function local(){
  const fromModule=window.CoraBirthdays?.all?.();
  if(Array.isArray(fromModule))return unique(fromModule);
  try{return unique(JSON.parse(localStorage.getItem('cora_aniversariantes_v1')||'[]'))}
  catch{return []}
 }
 function published(source){return unique(source?.birthdays||[])}
 function monthly(items,month){return unique(items).filter(p=>p.month===Number(month)+1)}
 function onDay(items,month,day){return monthly(items,month).filter(p=>p.day===Number(day))}
 const date=p=>String(p.day).padStart(2,'0')+'/'+String(p.month).padStart(2,'0');
 const label=p=>date(p)+' · '+p.name;
 const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function listHTML(items,{empty='Nenhum aniversariante neste mês.'}={}){
  const all=unique(items);
  return all.length?'<div class="cora-birthday-list">'+all.map(p=>'<div class="cora-birthday-row"><span class="cora-birthday-date">'+date(p)+'</span><strong>'+safe(p.name)+'</strong></div>').join('')+'</div>':
   '<p class="cora-birthday-empty">'+safe(empty)+'</p>';
 }
 function drawBlock(g,items,{x=65,y=1100,width=900,title='ANIVERSARIANTES DO MÊS',font=19,rowHeight=28,columns=2,background='#fff7e6',maxRows=6}={}){
  const list=unique(items),height=48+Math.min(maxRows,Math.ceil(list.length/columns))*rowHeight+12;
  g.fillStyle=background;g.fillRect(x,y,width,height);
  g.font='700 22px Arial,sans-serif';g.fillStyle='#735016';g.fillText(title,x+14,y+32);
  const cw=(width-24)/columns;
  const max=columns*maxRows;
  list.slice(0,max).forEach((p,i)=>{
   const col=Math.floor(i/maxRows),row=i%maxRows;
   let name=date(p)+' · '+p.name;
   const start=x+14+col*cw,pos=y+58+row*rowHeight;
   g.font='600 '+font+'px Arial,sans-serif';
   while(name.length>4&&g.measureText(name).width>cw-13)name=name.slice(0,-2)+'…';
   g.fillStyle='#394e67';g.fillText(name,start,pos);
  });
  if(list.length>max)g.fillText('+'+(list.length-max)+' registros na plataforma',x+14,y+height-5);
  if(!list.length){g.font='500 18px Arial,sans-serif';g.fillStyle='#6f7886';g.fillText('Sem aniversariantes cadastrados',x+14,y+61);}
  return height;
 }
 function openImage(uri){
  return new Promise((resolve,reject)=>{
   const image=new Image();
   image.onload=()=>resolve(image);
   image.onerror=()=>reject(new Error('Página oficial indisponível'));
   image.src=uri;
  });
 }
 async function officialPage(uri,page,items=[]){
  const img=await openImage(uri);
  const c=document.createElement('canvas');c.width=1180;c.height=770;
  const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);
  g.drawImage(img,0,0,1180,664);
  const month=Number(page)-2;
  if(month>=0&&month<12){
   const people=monthly(items,month);
   g.fillStyle='#14375e';g.fillRect(0,665,1180,26);
   g.font='700 16px Arial,sans-serif';g.fillStyle='#fff';
   g.fillText('ANIVERSARIANTES · '+MONTHS[month].toUpperCase(),24,684);
   g.fillStyle='#f5f9ff';g.fillRect(0,692,1180,78);
   if(!people.length){g.font='16px Arial,sans-serif';g.fillStyle='#546a80';g.fillText('Nenhum aniversariante publicado neste mês.',24,722);}
   people.forEach((p,i)=>{
    const col=i%3,row=Math.floor(i/3),x=24+col*385,y=713+row*24;
    if(row>2)return;
    const name=date(p)+'  '+p.name;
    let value=name;g.font='600 16px Arial,sans-serif';
    while(value.length>3&&g.measureText(value).width>363)value=value.slice(0,-2)+'…';
    g.fillStyle='#153958';g.fillText(value,x,y);
   });
   if(people.length>9)g.fillText('+'+(people.length-9)+' no aplicativo',25,764);
  }else{
   g.fillStyle='#f2f6fb';g.fillRect(0,665,1180,105);
   g.font='700 21px Arial,sans-serif';g.fillStyle='#1b456e';g.fillText('Calendário com aniversários da equipe integrados nas 12 páginas mensais.',28,724);
  }
  return c;
 }
 window.CoraCalendarBirthdays={unique,local,published,monthly,onDay,date,label,listHTML,drawBlock,officialPage,MONTHS};
})();