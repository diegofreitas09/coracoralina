(function(){
const SEG=['Educação Infantil','Fundamental I','Fundamental II','Ensino Médio'];
const KEY='cora2027_fechamento_reajustes_v2';
const GROUPS={
 'Educação Infantil':[['Infantil I'],['Infantil II'],['Infantil III'],['Infantil IV'],['Infantil V']],
 'Fundamental I':[['1º Ano'],['2º Ano','3º Ano'],['4º Ano','5º Ano']],
 'Fundamental II':[['6º Ano','7º Ano','8º Ano','9º Ano']],
 'Ensino Médio':[['1ª Série','2ª Série'],['3ª Série']]
};
const db=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){return{}}};
const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
function num(v){
 if(typeof v==='number')return Number.isFinite(v)?v:0;
 let s=String(v??'').trim().replace(/R\$/gi,'').replace(/\s/g,'');
 if(!s)return 0;
 if(s.includes(',')&&s.includes('.'))s=s.replace(/\./g,'').replace(',','.');
 else if(s.includes(','))s=s.replace(',','.');
 return Number(s)||0;
}
function moneyVal(v){const n=num(v);return n>10000?n/100:n;}
function mensal(seg){
 const b=(window.TUITION||[]).find(x=>x.segmento===seg),s=db().tuition?.[seg]||{};
 if(!b)return{};
 const rate=num(s.rate),due=num(s.annuity)||num(b.due26)*(1+rate/100),late=num(b.late26)*(1+rate/100);
 const first=moneyVal(s.first)||due/13;
 const a=moneyVal(s.planA)||((due-first)/12),bb=moneyVal(s.planB)||((due-first)/11);
 return{due,late,first,a,b:bb,al:(late-first)/12,bl:(late-first)/11};
}
function mats(seg){const d=db();return(window.MATERIALS||[]).filter(x=>x.segment===seg).map(x=>({name:x.name,v:num(d.records?.[`L|${x.segment}|${x.name}`]?.v27)||num(x.v26)}));}
function fardas(seg){const d=db();return(window.UNIFORMS||[]).map((x,i)=>({x,i})).filter(o=>o.x.segment===seg||o.x.segment==='Todos').map(o=>({name:o.x.name,v:num(d.records?.[`F|${o.i}|${o.x.segment}|${o.x.name}`]?.v27)||num(o.x.v26)}));}
function sti(seg){if(seg==='Fundamental II'||seg==='Ensino Médio')return[];const ids=seg==='Educação Infantil'?['STI|INFANTIL','STI|INFANTIL-ESC','STI|FARDA-BLUSA','STI|FARDA-SHORT']:['STI|FUNDAMENTAL','STI|FUNDAMENTAL-ESC','STI|FARDA-BLUSA','STI|FARDA-SHORT'],d=db();return ids.map(id=>d.records?.[id]).filter(Boolean).map(x=>({name:x.item,v:num(x.v27)}));}
function docs(seg){
 const nov=seg==='Educação Infantil'?['Cartão de vacina','Certidão de nascimento ou RG com CPF','02 fotos 3x4','Número do NIS / benefício, se beneficiário']:['Declaração e histórico escolar','Cartão de vacina','Certidão de nascimento ou RG com CPF','02 fotos 3x4','Número do NIS / benefício, se beneficiário'];
 return{nov,vet:['Atualização cadastral','Número do NIS / benefício, se beneficiário'],fin:['RG e CPF do responsável financeiro','Comprovante de endereço atualizado','Contrato atualizado / assinado no ato da matrícula']};
}
const lists=t=>window.CORA_LISTAS_2027?.get?.(t)||{};
const common=a=>a.length?a[0].filter(x=>a.every(y=>y.includes(x))):[];
const diff=(a,c)=>(a||[]).filter(x=>!c.includes(x));
const gl=g=>g[0]==='6º Ano'?'6º ao 9º Ano':g.join(' e ');
async function pdfLib(){if(window.jspdf?.jsPDF)return window.jspdf.jsPDF;await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://unpkg.com/jspdf@4.2.1/dist/jspdf.umd.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)});return window.jspdf.jsPDF;}
async function img(src){try{const r=await fetch(src,{cache:'no-store'});if(!r.ok)return null;const b=await r.blob();return await new Promise((ok,no)=>{const f=new FileReader();f.onload=()=>ok(f.result);f.onerror=no;f.readAsDataURL(b)})}catch(e){return null}}

async function build(seg){
 const J=await pdfLib(),doc=new J({unit:'mm',format:'a4',compress:true});
 const C={navy:[7,48,101],blue:[26,96,176],light:[235,245,253],gold:[217,157,16],text:[32,56,82],muted:[93,112,132],green:[22,132,72],white:[255,255,255]};
 const W=210,M=12,U=186,r=mensal(seg),mm=mats(seg),ff=fardas(seg),ss=sti(seg),dd=docs(seg);
 const logo=await img('logo-escola-web.png');
 function frame(){doc.setDrawColor(...C.navy);doc.setLineWidth(.6);doc.roundedRect(5,5,200,287,6,6,'S');doc.setDrawColor(...C.gold);doc.setLineWidth(.25);doc.roundedRect(7,7,196,283,5,5,'S');}
 function footer(p,total){doc.setFillColor(...C.navy);doc.rect(5,280,200,12,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(6.5);doc.text(`Colégio Cora Coralina • Matrículas 2027 • ${seg}`,12,287);doc.setFont('helvetica','normal');doc.text(`Cora Gestão • Página ${p}/${total}`,198,287,{align:'right'});}
 function secTitle(t,y){doc.setTextColor(...C.navy);doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text(t,M,y);doc.setDrawColor(...C.gold);doc.line(M,y+2,W-M,y+2);return y+7;}
 function header(){
  doc.setFillColor(...C.light);doc.roundedRect(M,11,U,33,5,5,'F');
  if(logo)doc.addImage(logo,'PNG',17,16,20,20,undefined,'FAST');
  const tx=logo?43:18;doc.setTextColor(...C.navy);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text('Matrículas 2027',tx,22);doc.setFontSize(9);doc.text('O próximo capítulo começa agora.',tx,30);doc.setFontSize(10.5);doc.text(seg.toUpperCase(),tx,38);
 }
 function tablePlans(y){
  y=secTitle('CONDIÇÕES DE MATRÍCULA 2027',y);
  const cols=[32,37,31,43,43],heads=['CONDIÇÃO','ANUIDADE','1ª PARCELA','PLANO A • 12x','PLANO B • 11x'];let x=M;
  doc.setFillColor(...C.navy);doc.rect(M,y,U,9,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(6.2);heads.forEach((h,i)=>{doc.text(h,x+cols[i]/2,y+5.7,{align:'center'});x+=cols[i]});y+=9;
  const row=(lab,ann,pa,pb,fill)=>{x=M;doc.setFillColor(...fill);doc.rect(M,y,U,10,'F');doc.setTextColor(...C.text);doc.setFontSize(6.5);[lab,money(ann),money(r.first),money(pa),money(pb)].forEach((v,i)=>{doc.text(v,x+cols[i]/2,y+6.4,{align:'center'});x+=cols[i]});y+=10};
  row('Até vencimento',r.due,r.a,r.b,[247,250,253]);row('Após vencimento',r.late,r.al,r.bl,[238,248,241]);return y+4;
 }
 function listBox(title,arr,x,y,w,h){
  doc.setFillColor(248,251,254);doc.setDrawColor(201,216,232);doc.roundedRect(x,y,w,h,3,3,'FD');doc.setTextColor(...C.navy);doc.setFont('helvetica','bold');doc.setFontSize(6.7);doc.text(title,x+4,y+6);
  doc.setFont('helvetica','normal');doc.setTextColor(...C.text);doc.setFontSize(5.6);let cy=y+11;
  arr.forEach(it=>{const txt=typeof it==='string'?it:it.name;const val=typeof it==='string'?null:it.v;const lines=doc.splitTextToSize('• '+txt,w-(val!=null?33:8));if(cy+lines.length*3.2<y+h-2){doc.text(lines,x+4,cy);if(val!=null){doc.setTextColor(...C.green);doc.setFont('helvetica','bold');doc.text(money(val),x+w-4,cy,{align:'right'});doc.setFont('helvetica','normal');doc.setTextColor(...C.text)}cy+=lines.length*3.2+1;}});
 }

 // PÁGINA 1
 frame();header();let y=52;y=tablePlans(y);
 y=secTitle('MATERIAL DIDÁTICO 2027',y);
 mm.forEach(m=>{doc.setFillColor(247,250,253);doc.roundedRect(M,y,U,6.6,1.2,1.2,'F');doc.setTextColor(...C.text);doc.setFont('helvetica','bold');doc.setFontSize(6.1);doc.text(m.name,M+5,y+4.5,{maxWidth:130});doc.setTextColor(...C.green);doc.text(money(m.v),W-M-4,y+4.5,{align:'right'});y+=7.2});
 y+=2;
 const boxTop=y,boxW=(U-5)/2,itemsH=Math.max(34,13+Math.max(ff.length,ss.length)*6.2);
 listBox('FARDAMENTO',ff,M,boxTop,boxW,itemsH);
 if(ss.length)listBox('STI / TEMPO INTEGRAL',ss,M+boxW+5,boxTop,boxW,itemsH);else listBox('INFORMAÇÃO', ['STI / Tempo Integral não se aplica a este segmento.'],M+boxW+5,boxTop,boxW,itemsH);
 y=boxTop+itemsH+6;y=secTitle('DOCUMENTAÇÃO',y);
 const docW=(U-8)/3,docH=Math.min(45,17+Math.max(dd.nov.length,dd.vet.length,dd.fin.length)*5.2);
 listBox('NOVATOS',dd.nov,M,y,docW,docH);listBox('VETERANOS',dd.vet,M+docW+4,y,docW,docH);listBox('RESP. FINANCEIRO',dd.fin,M+(docW+4)*2,y,docW,docH);
 footer(1,2);

 // PÁGINA 2
 doc.addPage();frame();
 doc.setTextColor(...C.navy);doc.setFont('helvetica','bold');doc.setFontSize(14);doc.text('LISTA DE MATERIAL 2027 — POR TURMA',M,18);doc.setFontSize(8);doc.setTextColor(...C.blue);doc.text(seg,M,25);
 const B=GROUPS[seg].map(g=>({g,l:gl(g),d:lists(g[0])}));
 const cu=common(B.map(b=>b.d.uso||[])),ci=common(B.map(b=>b.d.individual||[])),ch=common(B.map(b=>b.d.higiene||[]));
 let yy=32;const shared=[['USO COLETIVO — COMUM',cu],['INDIVIDUAL — COMUM',ci],['HIGIENE — COMUM',ch]].filter(x=>x[1].length);
 if(shared.length){const gap=4,sw=(U-gap*(shared.length-1))/shared.length,h=42;shared.forEach((s,i)=>listBox(s[0],s[1],M+i*(sw+gap),yy,sw,h));yy+=h+7;}
 yy=secTitle('TURMAS / GRUPOS',yy);
 const n=B.length>=4?2:Math.min(2,B.length),gap=5,cw=(U-gap*(n-1))/n,rows=Math.ceil(B.length/n),available=268-yy-(rows-1)*5,rh=Math.max(45,available/rows);
 B.forEach((b,i)=>{
  const col=i%n,row=Math.floor(i/n),cx=M+col*(cw+gap),cy=yy+row*(rh+5);
  doc.setFillColor(248,251,254);doc.setDrawColor(198,215,231);doc.roundedRect(cx,cy,cw,rh,3,3,'FD');doc.setFillColor(...C.navy);doc.roundedRect(cx,cy,cw,9,3,3,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(7);doc.text(b.l,cx+4,cy+6);
  let ty=cy+15;const di=b.d.didatico||{},val=window.CORA_LISTAS_2027?.officialPrice?.(b.g[0])||num(di.valor)||0;
  doc.setTextColor(...C.navy);doc.setFontSize(5.9);doc.text(di.nome||'Material didático',cx+4,ty,{maxWidth:cw-38});doc.setTextColor(...C.green);doc.text(money(val),cx+cw-4,ty,{align:'right'});ty+=7;
  const ex=[...diff(b.d.uso||[],cu),...diff(b.d.individual||[],ci),...diff(b.d.higiene||[],ch),...(b.d.extras||[]).map(e=>typeof e==='string'?e:e.item).filter(Boolean)];
  if(ex.length){doc.setTextColor(...C.navy);doc.setFontSize(5.5);doc.text('ITENS ESPECÍFICOS DA TURMA',cx+4,ty);ty+=5;doc.setFont('helvetica','normal');doc.setTextColor(...C.text);doc.setFontSize(5.1);for(const it of ex){const ls=doc.splitTextToSize('• '+it,cw-8),hh=ls.length*3+.8;if(ty+hh>cy+rh-4)break;doc.text(ls,cx+4,ty);ty+=hh;}}
 });
 footer(2,2);
 doc.save(`PANFLETO-MATRICULAS-2027-${seg.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').toUpperCase()}.pdf`);
}

function render(){
 const sec=document.getElementById('fechamento2027');if(!sec)return;
 ['flyerOfficial55','flyerOfficial56','flyerOfficial57'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none'});
 let box=document.getElementById('flyerOfficial58');if(!box){box=document.createElement('div');box.id='flyerOfficial58';box.className='adj-block';sec.appendChild(box)}
 const cur=box.dataset.seg||SEG[0];
 box.innerHTML=`<div class="adj-head"><div><h3>🎨 Montar panfleto de matrícula 2027</h3><small>Modelo organizado em 2 páginas, com maior legibilidade e todas as turmas do segmento.</small></div><span class="fly-status ok">V61</span></div><div class="fly58"><label>Segmento<select>${SEG.map(s=>`<option ${s===cur?'selected':''}>${s}</option>`).join('')}</select></label><button>📄 Gerar panfleto organizado</button></div>`;
 const sel=box.querySelector('select');sel.onchange=()=>box.dataset.seg=sel.value;
 box.querySelector('button').onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Gerando...';try{await build(sel.value)}catch(err){console.error(err);alert('Não foi possível gerar o panfleto agora: '+(err?.message||err))}finally{b.disabled=false;b.textContent='📄 Gerar panfleto organizado'}};
}
function init(){
 if(!document.getElementById('f58style')){const s=document.createElement('style');s.id='f58style';s.textContent='.fly58{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:end;margin-top:12px}.fly58 label{display:grid;gap:6px;font-size:12px;font-weight:900;color:#536b83}.fly58 select{padding:11px;border:1px solid #cbd9e7;border-radius:10px;background:#fff;font-weight:800;color:#0d315c}.fly58 button{border:0;border-radius:11px;padding:12px 16px;background:#0d4f89;color:#fff;font-weight:900;cursor:pointer}@media(max-width:800px){.fly58{grid-template-columns:1fr}}';document.head.appendChild(s)}
 setTimeout(render,200);document.addEventListener('click',e=>{if(e.target.closest?.('[data-tab="fechamento2027"]'))setTimeout(render,120)},true);new MutationObserver(()=>{if(document.getElementById('fechamento2027')&&!document.getElementById('flyerOfficial58'))render()}).observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();