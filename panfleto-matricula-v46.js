(function(){
  const KEY='cora2027_fechamento_reajustes_v2';
  const SEGMENTS=['Educação Infantil','Fundamental I','Fundamental II','Ensino Médio'];
  const DOCS_NOVOS=['Certidão de nascimento','RG e CPF do responsável','Comprovante de residência','Declaração / transferência','Histórico escolar'];
  const DOCS_VETERANOS=['Atualização cadastral','Contrato / renovação','Comprovante de residência (se houver alteração)','Regularização financeira'];
  const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){return {}}};
  const tuition=()=>{try{return typeof TUITION!=='undefined'?TUITION:(window.TUITION||[])}catch(e){return []}};
  function baseTu(seg){return tuition().find(x=>x.segmento===seg)}
  function normalizeCash(v,ref){let n=Math.abs(Number(v)||0);const sign=Number(v)<0?-1:1;const lim=Math.max(Number(ref)||0,1000)*2;while(n>lim&&n>=1000)n/=100;return sign*n}
  function rec(seg){
    const db=read(),b=baseTu(seg);if(!b)return null;const s=db.tuition?.[seg];
    const ann=Number(s?.annuity)||Number(b.due26)||0;
    const first=normalizeCash(s?.first,ann)||ann/13;
    let a=normalizeCash(s?.planA,ann),bb=normalizeCash(s?.planB,ann);
    if(!a||a>ann)a=Math.max(0,ann-first)/12;
    if(!bb||bb>ann)bb=Math.max(0,ann-first)/11;
    return {seg,annuity:ann,first,planA:a,planB:bb,official:!!s?.saved};
  }
  async function pdfLib(){if(window.jspdf?.jsPDF)return window.jspdf.jsPDF;await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://unpkg.com/jspdf@4.2.1/dist/jspdf.umd.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)});return window.jspdf.jsPDF}
  async function img(src){try{const r=await fetch(src,{cache:'no-store'}),b=await r.blob();return await new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(f.result);f.onerror=rej;f.readAsDataURL(b)})}catch(e){return null}}
  function segIcon(seg){return seg==='Educação Infantil'?'INF':seg==='Fundamental I'?'FI':seg==='Fundamental II'?'FII':'EM'}
  async function buildFlyer(){
    const JsPDF=await pdfLib();const doc=new JsPDF({unit:'mm',format:'a4',compress:true});
    const navy=[7,48,101],blue=[26,96,176],light=[225,241,255],gold=[217,157,16],text=[17,49,91],muted=[86,108,134];
    const logo=await img('logo-escola-web.png');const facade=await img('https://raw.githubusercontent.com/diegofreitas09/cora-familia/main/fachada-cora-familia.jpg');
    doc.setFillColor(255);doc.rect(0,0,210,297,'F');
    doc.setDrawColor(...navy);doc.setLineWidth(1.1);doc.roundedRect(4,4,202,289,8,8,'S');doc.setDrawColor(...gold);doc.setLineWidth(.45);doc.roundedRect(6.3,6.3,197.4,284.4,6,6,'S');
    if(facade){doc.addImage(facade,'JPEG',10,10,190,49,undefined,'FAST')}
    doc.setFillColor(...light);doc.roundedRect(10,55,190,31,0,0,'F');doc.setDrawColor(...navy);doc.setLineWidth(.8);doc.roundedRect(10,10,190,76,8,8,'S');
    if(logo)doc.addImage(logo,'PNG',17,60,19,19,undefined,'FAST');
    doc.setTextColor(...navy);doc.setFont('helvetica','bold');doc.setFontSize(20);doc.text('Matrículas 2027',43,67);doc.setFontSize(12.5);doc.text('O próximo capítulo começa agora.',43,75);doc.setFont('helvetica','normal');doc.setFontSize(7.8);doc.text('Informações oficiais para matrícula e rematrícula 2027.',43,81);
    doc.setDrawColor(...gold);doc.setLineWidth(.6);doc.line(25,94,61,94);doc.line(149,94,185,94);doc.setTextColor(...navy);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text('INVESTIMENTO 2027 POR SEGMENTO',105,97,{align:'center'});
    const cards=[{seg:'Educação Infantil',x:10,y:104},{seg:'Fundamental I',x:107,y:104},{seg:'Fundamental II',x:10,y:171},{seg:'Ensino Médio',x:107,y:171}];
    function card(c){const r=rec(c.seg),x=c.x,y=c.y,w=93,h=61;doc.setFillColor(255);doc.setDrawColor(...blue);doc.setLineWidth(.45);doc.roundedRect(x,y,w,h,5,5,'FD');doc.setFillColor(...navy);doc.roundedRect(x,y,w,11,5,5,'F');doc.rect(x,y+5,w,6,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(c.seg.toUpperCase(),x+w/2,y+7.5,{align:'center'});doc.setFillColor(255);doc.setDrawColor(...gold);doc.circle(x+9,y+4.8,6.5,'FD');doc.setTextColor(...navy);doc.setFontSize(6.5);doc.text(segIcon(c.seg),x+9,y+6.6,{align:'center'});
      const rows=[['Anuidade 2027',money(r?.annuity)],['1ª parcela / entrada',money(r?.first)],['Plano A','1ª parcela + 12x de '+money(r?.planA)],['Plano B','1ª parcela + 11x de '+money(r?.planB)]];
      let yy=y+18;rows.forEach((it,i)=>{if(i){doc.setDrawColor(...gold);doc.setLineDashPattern([1,1.4],0);doc.line(x+6,yy-3.2,x+w-6,yy-3.2);doc.setLineDashPattern([],0)}doc.setTextColor(...text);doc.setFont('helvetica',i<2?'normal':'bold');doc.setFontSize(i<2?7.5:7.2);doc.text(it[0],x+12,yy);doc.setFont('helvetica','bold');doc.setFontSize(i<2?8.4:7.4);doc.text(it[1],x+w-6,yy,{align:'right'});yy+=10.4});
    }
    cards.forEach(card);
    const y=239;doc.setFillColor(249,252,255);doc.setDrawColor(184,207,231);doc.roundedRect(10,y,103,39,4,4,'FD');doc.setFillColor(249,252,255);doc.roundedRect(117,y,83,39,4,4,'FD');doc.setTextColor(...navy);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('DOCUMENTAÇÃO',22,y+7);doc.setDrawColor(...gold);doc.line(22,y+9,64,y+9);doc.setFontSize(7.3);doc.text('ALUNOS NOVATOS',16,y+15);doc.text('ALUNOS VETERANOS',64,y+15);doc.setFont('helvetica','normal');doc.setTextColor(...muted);doc.setFontSize(6.2);DOCS_NOVOS.forEach((t,i)=>doc.text('• '+t,16,y+20+i*4.2));DOCS_VETERANOS.forEach((t,i)=>doc.text('• '+t,64,y+20+i*4.2));doc.setTextColor(...navy);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('LISTA DE MATERIAL',127,y+7);doc.setDrawColor(...gold);doc.line(127,y+9,168,y+9);doc.setFont('helvetica','normal');doc.setTextColor(...muted);doc.setFontSize(7);const mt=doc.splitTextToSize('A lista oficial de material é organizada por turma e série. Consulte a secretaria ou os canais oficiais da escola.',65);doc.text(mt,127,y+17);
    doc.setFillColor(...navy);doc.rect(4,282,202,11,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(7.4);doc.text('Colégio Cora Coralina • Matrículas 2027',16,288);doc.setFont('helvetica','normal');doc.setFontSize(6.3);doc.text('Informações sujeitas à atualização pela gestão escolar.',16,291);doc.setTextColor(255,197,50);doc.setFont('helvetica','bold');doc.setFontSize(7);doc.text('SECRETARIA / ATENDIMENTO',194,288,{align:'right'});doc.setTextColor(255);doc.setFont('helvetica','normal');doc.setFontSize(6.2);doc.text('Cora Gestão • PDF - Soluções Financeiras',194,291,{align:'right'});
    doc.save('PANFLETO-MATRICULAS-2027-CORA.pdf');
  }
  function render(){const sec=document.getElementById('fechamento2027');if(!sec)return;let box=document.getElementById('flyerGenerator46');if(!box){box=document.createElement('div');box.id='flyerGenerator46';box.className='adj-block flyer46';sec.appendChild(box)}box.innerHTML=`<div class="adj-head"><div><h3>🎨 Panfleto Comercial de Matrículas 2027</h3><small>Modelo final com os quatro segmentos e somente os valores oficiais de 2027.</small></div><span class="fly-status ok">NOVO MODELO</span></div><div class="fly-controls"><button id="flyGeneral">📄 Gerar panfleto oficial</button></div><div class="fly-note"><b>O panfleto agora:</b> elimina informações de anos anteriores e reajustes, corrige valores monetários fora de escala, organiza Educação Infantil, Fundamental I, Fundamental II e Ensino Médio no mesmo material e melhora tipografia, enquadramento, documentação e rodapé.</div>`;box.querySelector('#flyGeneral').onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Gerando...';try{await buildFlyer()}finally{b.disabled=false;b.textContent='📄 Gerar panfleto oficial'}}}
  function style(){if(document.getElementById('fly46style'))return;const s=document.createElement('style');s.id='fly46style';s.textContent=`.flyer46{border-top:4px solid #d59d10!important}.fly-controls{display:flex;gap:10px;margin-top:12px}.fly-controls button{border:0;border-radius:11px;padding:12px 16px;background:#0d4f89;color:#fff;font-weight:900;cursor:pointer}.fly-note{margin-top:12px;background:#eef7ff;border-left:4px solid #2a80c7;padding:11px;border-radius:9px;color:#536a80;font-size:12px}.fly-status{padding:6px 9px;border-radius:999px;font-size:11px;font-weight:900}.fly-status.ok{background:#e6f7ed;color:#11713d}`;document.head.appendChild(s)}
  function init(){style();render();document.addEventListener('click',e=>{if(e.target.closest?.('[data-tab="fechamento2027"]'))setTimeout(render,100)},true)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();