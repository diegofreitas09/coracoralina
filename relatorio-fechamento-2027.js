(function(){
  const STORAGE_KEY='cora2027_fechamento_reajustes_v2';
  const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
  const pct=v=>(Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
  const now=()=>new Date().toLocaleString('pt-BR',{timeZone:'America/Fortaleza'});
  const JSPDF='https://unpkg.com/jspdf@4.2.1/dist/jspdf.umd.min.js';

  function db(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};}catch(e){return {};}
  }
  function loadPdf(){
    return new Promise((resolve,reject)=>{
      if(window.jspdf?.jsPDF)return resolve(window.jspdf.jsPDF);
      const s=document.createElement('script');s.src=JSPDF;s.async=true;
      s.onload=()=>resolve(window.jspdf.jsPDF);s.onerror=()=>reject(new Error('Falha ao carregar PDF'));
      document.head.appendChild(s);
    });
  }
  async function img(src){
    try{const r=await fetch(src,{cache:'no-store'});const b=await r.blob();return await new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(f.result);f.onerror=rej;f.readAsDataURL(b)});}catch(e){return null}
  }
  function tuitionBases(){
    try{return (window.TUITION||TUITION||[]).map(r=>({segmento:r.segmento,due26:Number(r.due26)||0,late26:Number(r.late26)||0}));}catch(e){return []}
  }
  function materials(){try{return (window.MATERIALS||MATERIALS||[]);}catch(e){return []}}
  function uniforms(){try{return (window.UNIFORMS||UNIFORMS||[]);}catch(e){return []}}

  function addButton(){
    const sec=document.getElementById('fechamento2027'); if(!sec||document.getElementById('downloadFinalClosingPdf'))return;
    const wrap=document.createElement('div');wrap.className='final-report-box';
    wrap.innerHTML=`<div><small>RELATÓRIO OFICIAL</small><h3>Fechamento final de valores 2027</h3><p>Consolida mensalidades, planos, materiais, livros, fardamento e status de fechamento.</p></div><button id="downloadFinalClosingPdf">📄 Baixar relatório final de fechamento</button>`;
    sec.appendChild(wrap);
    document.getElementById('downloadFinalClosingPdf').onclick=download;
  }

  function style(){if(document.getElementById('final-report-style'))return;const s=document.createElement('style');s.id='final-report-style';s.textContent=`
    .final-report-box{margin:24px 0 8px;padding:22px 24px;border-radius:20px;background:linear-gradient(135deg,#0b2d5c,#1767b0);color:#fff;display:flex;align-items:center;justify-content:space-between;gap:18px;box-shadow:0 12px 30px rgba(15,49,92,.18)}
    .final-report-box small{font-weight:900;letter-spacing:.08em;color:#bfe4ff}.final-report-box h3{font-size:24px;margin:4px 0}.final-report-box p{margin:0;color:#e5f2ff}
    .final-report-box button{border:0;border-radius:14px;padding:15px 20px;background:#fff;color:#0d315c;font-weight:900;font-size:15px;cursor:pointer;white-space:nowrap}
    .final-report-box button:disabled{opacity:.6;cursor:wait}@media(max-width:760px){.final-report-box{flex-direction:column;align-items:stretch}.final-report-box button{width:100%}}
  `;document.head.appendChild(s)}

  async function download(){
    const b=document.getElementById('downloadFinalClosingPdf'); const old=b.innerHTML;
    try{
      b.disabled=true;b.textContent='Gerando relatório...';
      const JsPDF=await loadPdf(); const doc=new JsPDF({unit:'mm',format:'a4',compress:true});
      const azul=[11,45,92], azul2=[23,103,176], verde=[22,128,71], cinza=[88,112,139], claro=[240,246,252], laranja=[166,107,0];
      const W=210,M=14;let y=14;
      const escolaLogo=await img('logo-escola-web.png'), pdfLogo=await img('logo-pdf-web.png');
      if(escolaLogo)doc.addImage(escolaLogo,'PNG',M,y,22,22,undefined,'FAST');
      doc.setTextColor(...azul);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text('COLÉGIO CORA CORALINA',41,y+7);
      doc.setFontSize(20);doc.text('Fechamento Oficial 2027',41,y+16);
      doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(...cinza);doc.text('Plano Estratégico de Matrículas • Valores consolidados pela gestão',41,y+22);
      if(pdfLogo)doc.addImage(pdfLogo,'PNG',170,y,22,22,undefined,'FAST');
      y=43;doc.setFillColor(...azul);doc.roundedRect(M,y,W-2*M,18,3,3,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text('RELATÓRIO FINAL DE FECHAMENTO DE VALORES — 2027',M+6,y+7);doc.setFontSize(8);doc.setFont('helvetica','normal');doc.text('Gerado em '+now(),M+6,y+13);

      const D=db();D.tuition=D.tuition||{};D.records=D.records||{};
      const bases=tuitionBases(); const tuitionSaved=bases.filter(x=>D.tuition[x.segmento]?.saved).length;
      const allItems=[...materials().map((r)=>`L|${r.segment}|${r.name}`),...uniforms().map((r,i)=>`F|${i}|${r.segment}|${r.name}`)];
      const itemSaved=allItems.filter(id=>D.records[id]?.saved).length; const total=bases.length+allItems.length, saved=tuitionSaved+itemSaved;
      y=68;doc.setTextColor(...azul);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('RESUMO DO FECHAMENTO',M,y);y+=5;
      const cards=[['Segmentos',String(bases.length)],['Itens totais',String(total)],['Salvos',String(saved)],['Pendentes',String(total-saved)]];
      cards.forEach((c,i)=>{const x=M+i*45;doc.setFillColor(...claro);doc.roundedRect(x,y,41,19,2,2,'F');doc.setTextColor(...cinza);doc.setFontSize(7.5);doc.text(c[0],x+4,y+6);doc.setTextColor(...azul);doc.setFontSize(13);doc.setFont('helvetica','bold');doc.text(c[1],x+4,y+14)});y+=27;

      function header(title){if(y>265){doc.addPage();y=16}doc.setTextColor(...azul);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text(title,M,y);y+=5;doc.setDrawColor(200,216,232);doc.line(M,y,W-M,y);y+=5}
      function row(cols,widths,headerRow=false){const h=8;if(y+h>282){doc.addPage();y=16}let x=M;if(headerRow){doc.setFillColor(...azul2);doc.rect(M,y,W-2*M,h,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold')}else{doc.setTextColor(42,58,74);doc.setFont('helvetica','normal');if(Math.round(y/8)%2===0){doc.setFillColor(248,251,255);doc.rect(M,y,W-2*M,h,'F')}}doc.setFontSize(7.2);cols.forEach((t,i)=>{doc.text(String(t),x+2,y+5.2,{maxWidth:widths[i]-4});x+=widths[i]});y+=h}

      header('1. MENSALIDADES E PLANOS POR SEGMENTO');
      row(['Segmento','Anuidade 2026','Reajuste','Anuidade 2027','1ª parcela','Plano A 12x','Plano B 11x','Status'],[34,25,17,27,23,24,24,18],true);
      bases.forEach(base=>{const r=D.tuition[base.segmento]||{};const rate=Number(r.rate)||0;const annDue=Number(r.annuity)||base.due26*(1+rate/100);const first=Number(r.first)||0;const a=Number(r.planA)||Math.max(0,annDue-first)/12;const bb=Number(r.planB)||Math.max(0,annDue-first)/11;row([base.segmento,money(base.due26),pct(rate),money(annDue),money(first),money(a),money(bb),r.saved?'SALVO':'PENDENTE'],[34,25,17,27,23,24,24,18])});
      y+=5;
      header('2. ANUIDADES APÓS O VENCIMENTO');
      row(['Segmento','Anuidade 2026 após venc.','Reajuste','Anuidade 2027 após venc.'],[48,47,28,59],true);
      bases.forEach(base=>{const r=D.tuition[base.segmento]||{};const rate=Number(r.rate)||0;row([base.segmento,money(base.late26),pct(rate),money(base.late26*(1+rate/100))],[48,47,28,59])});

      const matRows=materials(); if(matRows.length){y+=5;header('3. MATERIAIS / LIVROS');row(['Segmento','Item','2026','Reajuste','2027','Status'],[38,62,25,20,25,22],true);matRows.forEach(r=>{const id=`L|${r.segment}|${r.name}`,s=D.records[id]||{},rate=Number(s.rate ?? 0),v27=Number(s.v27)||Number(r.v26)*(1+rate/100);row([r.segment,r.name,money(r.v26),pct(rate),money(v27),s.saved?'SALVO':'PENDENTE'],[38,62,25,20,25,22])})}
      const uniRows=uniforms(); if(uniRows.length){y+=5;header('4. FARDAMENTO');row(['Segmento','Item','2026','Reajuste','2027','Status'],[38,62,25,20,25,22],true);uniRows.forEach((r,i)=>{const id=`F|${i}|${r.segment}|${r.name}`,s=D.records[id]||{},rate=Number(s.rate ?? 0),v27=Number(s.v27)||Number(r.v26)*(1+rate/100);row([r.segment,r.name,money(r.v26),pct(rate),money(v27),s.saved?'SALVO':'PENDENTE'],[38,62,25,20,25,22])})}

      y+=7;if(y>245){doc.addPage();y=18}doc.setFillColor(236,247,241);doc.roundedRect(M,y,W-2*M,30,3,3,'F');doc.setTextColor(...verde);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('SITUAÇÃO DO FECHAMENTO',M+5,y+7);doc.setFontSize(9);doc.setTextColor(...azul);doc.text(saved===total?'FECHAMENTO COMPLETO':'FECHAMENTO PARCIAL',M+5,y+15);doc.setFont('helvetica','normal');doc.setTextColor(...cinza);doc.setFontSize(8);doc.text(`${saved} de ${total} registros estão salvos. ${total-saved} permanecem pendentes.`,M+5,y+22);
      y+=40;doc.setDrawColor(150,170,190);doc.line(M,y,M+75,y);doc.line(W-M-75,y,W-M,y);doc.setFontSize(7.5);doc.setTextColor(...cinza);doc.text('Responsável pela aprovação',M,y+5);doc.text('Direção / Financeiro',W-M-75,y+5);

      const pages=doc.getNumberOfPages();for(let p=1;p<=pages;p++){doc.setPage(p);doc.setFontSize(7);doc.setTextColor(130,145,160);doc.text('Colégio Cora Coralina • Matrícula 2027',M,291);doc.text(`Página ${p} de ${pages}`,W-M,291,{align:'right'})}
      doc.save('Relatorio-Final-Fechamento-2027.pdf');
    }catch(e){console.error(e);alert('Não foi possível gerar o relatório final agora. Tente novamente.');}
    finally{b.disabled=false;b.innerHTML=old}
  }

  function init(){style();addButton();new MutationObserver(addButton).observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
