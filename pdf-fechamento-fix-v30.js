(function(){
  const KEY='cora2027_fechamento_reajustes_v2';
  const STI=[
    {id:'STI|INFANTIL',segment:'Educação Infantil',item:'STI Educação Infantil',v26:727.00},
    {id:'STI|INFANTIL-ESC',segment:'Educação Infantil',item:'STI + Escolaridade Infantil',v26:1164.04},
    {id:'STI|FUNDAMENTAL',segment:'Fundamental',item:'STI Fundamental',v26:737.00},
    {id:'STI|FUNDAMENTAL-ESC',segment:'Fundamental',item:'STI + Escolaridade Fundamental',v26:1201.42},
    {id:'STI|FARDA-BLUSA',segment:'STI / Integral',item:'Farda STI - Blusa',v26:57.00},
    {id:'STI|FARDA-SHORT',segment:'STI / Integral',item:'Farda STI - Short',v26:67.00}
  ];
  const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
  const pct=v=>(Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
  const now=()=>new Date().toLocaleString('pt-BR',{timeZone:'America/Fortaleza'});
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){return {}}};
  const tuition=()=>{try{return (typeof TUITION!=='undefined'?TUITION:(window.TUITION||[])).map(r=>({segmento:r.segmento,due26:Number(r.due26)||0,late26:Number(r.late26)||0}))}catch(e){return []}};
  const mats=()=>{try{return typeof MATERIALS!=='undefined'?MATERIALS:(window.MATERIALS||[])}catch(e){return []}};
  const unis=()=>{try{return typeof UNIFORMS!=='undefined'?UNIFORMS:(window.UNIFORMS||[])}catch(e){return []}};

  async function loadJsPDF(){
    if(window.jspdf&&window.jspdf.jsPDF)return window.jspdf.jsPDF;
    const urls=[
      'https://cdnjs.cloudflare.com/ajax/libs/jspdf/4.2.1/jspdf.umd.min.js',
      'https://unpkg.com/jspdf@4.2.1/dist/jspdf.umd.min.js',
      'https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js'
    ];
    for(const src of urls){
      try{
        await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>{s.remove();reject(new Error('Falha CDN'))};document.head.appendChild(s)});
        if(window.jspdf&&window.jspdf.jsPDF)return window.jspdf.jsPDF;
      }catch(e){}
    }
    throw new Error('Biblioteca de PDF não pôde ser carregada.');
  }

  async function generate(){
    const buttons=[document.getElementById('downloadFinalClosingPdf'),document.getElementById('downloadClosingPdfTop')].filter(Boolean);
    buttons.forEach(b=>{b.dataset.original=b.textContent;b.disabled=true;b.textContent='Gerando PDF...'});
    try{
      const JsPDF=await loadJsPDF();
      const doc=new JsPDF({unit:'mm',format:'a4',compress:true});
      const W=210,M=14,usable=W-2*M;
      const navy=[11,45,92],blue=[23,103,176],gray=[90,108,126],light=[244,248,252],green=[24,128,72],amber=[176,112,0];
      let y=18;
      function footer(page){doc.setPage(page);doc.setFontSize(7);doc.setTextColor(130,145,160);doc.text('Colégio Cora Coralina • Fechamento 2027',M,291);doc.text('Página '+page+' de '+doc.getNumberOfPages(),W-M,291,{align:'right'})}
      function page(title,sub){if(doc.getNumberOfPages()>0&&y!==18){};doc.setFillColor(...navy);doc.roundedRect(M,y,usable,18,3,3,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text(title,M+6,y+7);doc.setFont('helvetica','normal');doc.setFontSize(8);if(sub)doc.text(sub,M+6,y+13,{maxWidth:usable-12});y+=25}
      function newPage(title,sub){doc.addPage();y=18;page(title,sub)}
      function section(title){if(y>268)newPage('CONTINUAÇÃO','Relatório final de fechamento');doc.setTextColor(...navy);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text(title,M,y);y+=5;doc.setDrawColor(205,218,232);doc.line(M,y,W-M,y);y+=5}
      function textLine(text,bold=false){const lines=doc.splitTextToSize(String(text),usable-8);const h=lines.length*4+2;if(y+h>281){doc.addPage();y=18}doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(8.2);doc.setTextColor(45,61,77);doc.text(lines,M+4,y);y+=h}
      function tableHeader(cols,widths){if(y+9>280){doc.addPage();y=18}doc.setFillColor(...blue);doc.rect(M,y,usable,8,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(7);let x=M;cols.forEach((c,i)=>{doc.text(String(c),x+2,y+5.2,{maxWidth:widths[i]-3});x+=widths[i]});y+=8}
      function tableRow(cols,widths){const h=8;if(y+h>280){doc.addPage();y=18;tableHeader(cols.map(()=>''),widths)}if(Math.floor(y/8)%2===0){doc.setFillColor(...light);doc.rect(M,y,usable,h,'F')}doc.setTextColor(38,54,70);doc.setFont('helvetica','normal');doc.setFontSize(7);let x=M;cols.forEach((c,i)=>{doc.text(String(c),x+2,y+5.1,{maxWidth:widths[i]-3});x+=widths[i]});y+=h}

      const D=read();D.tuition=D.tuition||{};D.records=D.records||{};
      const B=tuition();const matIds=mats().map(r=>'L|'+r.segment+'|'+r.name);const uniIds=unis().map((r,i)=>'F|'+i+'|'+r.segment+'|'+r.name);const stiIds=STI.map(x=>x.id);const total=B.length+matIds.length+uniIds.length+stiIds.length;const saved=B.filter(x=>D.tuition[x.segmento]?.saved).length+[...matIds,...uniIds,...stiIds].filter(id=>D.records[id]?.saved).length;

      doc.setTextColor(...navy);doc.setFont('helvetica','bold');doc.setFontSize(20);doc.text('COLÉGIO CORA CORALINA',M,y);y+=9;doc.setFontSize(18);doc.text('Fechamento Oficial 2027',M,y);y+=7;doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...gray);doc.text('Relatório consolidado de produtos e valores • Gerado em '+now(),M,y);y+=12;
      page('VISÃO GERAL DO FECHAMENTO','Mensalidades, materiais, fardamento e STI / Tempo Integral');
      [['Registros previstos',total],['Registros salvos',saved],['Pendentes',total-saved]].forEach((c,i)=>{const x=M+i*60;doc.setFillColor(...light);doc.roundedRect(x,y,55,20,2,2,'F');doc.setTextColor(...gray);doc.setFontSize(7);doc.text(c[0],x+4,y+6);doc.setTextColor(...navy);doc.setFont('helvetica','bold');doc.setFontSize(14);doc.text(String(c[1]),x+4,y+15)});y+=28;doc.setFillColor(saved===total?236:255,saved===total?247:246,saved===total?241:228);doc.roundedRect(M,y,usable,23,3,3,'F');doc.setTextColor(...(saved===total?green:amber));doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text(saved===total?'FECHAMENTO COMPLETO':'FECHAMENTO PARCIAL',M+6,y+9);doc.setTextColor(...gray);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(saved+' de '+total+' registros estão salvos.',M+6,y+16);

      newPage('1. MENSALIDADES E PLANOS','Valores oficiais por segmento');
      const w1=[35,25,17,28,23,27,27];tableHeader(['Segmento','Anuidade 26','Reaj.','Anuidade 27','1ª parcela','Plano A 12x','Plano B 11x'],w1);
      B.forEach(base=>{const r=D.tuition[base.segmento]||{},rate=Number(r.rate)||0,ann=Number(r.annuity)||base.due26*(1+rate/100),first=Number(r.first)||0,a=Number(r.planA)||Math.max(0,ann-first)/12,b=Number(r.planB)||Math.max(0,ann-first)/11;tableRow([base.segmento,money(base.due26),pct(rate),money(ann),money(first),money(a),money(b)],w1)});
      y+=7;section('ANUIDADE APÓS O VENCIMENTO');const w2=[50,42,24,66];tableHeader(['Segmento','2026 após venc.','Reaj.','2027 após venc.'],w2);B.forEach(base=>{const r=D.tuition[base.segmento]||{},rate=Number(r.rate)||0;tableRow([base.segmento,money(base.late26),pct(rate),money(base.late26*(1+rate/100))],w2)});

      newPage('2. MATERIAIS E LIVROS','Valores-base, reajustes e fechamento 2027');const w3=[42,62,24,20,24,10];tableHeader(['Segmento','Produto','2026','Reaj.','2027',''],w3);mats().forEach(r=>{const id='L|'+r.segment+'|'+r.name,s=D.records[id]||{},rate=Number(s.rate??0),v=Number(s.v27)||Number(r.v26)*(1+rate/100);tableRow([r.segment,r.name,money(r.v26),pct(rate),money(v),s.saved?'OK':'PEND.'],w3)});

      newPage('3. FARDAMENTO','Valores oficiais por segmento e item');tableHeader(['Segmento','Produto','2026','Reaj.','2027',''],w3);unis().forEach((r,i)=>{const id='F|'+i+'|'+r.segment+'|'+r.name,s=D.records[id]||{},rate=Number(s.rate??0),v=Number(s.v27)||Number(r.v26)*(1+rate/100);tableRow([r.segment,r.name,money(r.v26),pct(rate),money(v),s.saved?'OK':'PEND.'],w3)});

      newPage('4. STI / TEMPO INTEGRAL','Preço oficial 2027. Quantitativos e potencial permanecem na aba Receita.');tableHeader(['Segmento','Produto','2026','Reaj.','2027',''],w3);STI.forEach(r=>{const s=D.records[r.id]||{},rate=Number(s.rate??5),v=Number(s.v27)||r.v26*(1+rate/100);tableRow([r.segment,r.item,money(r.v26),pct(rate),money(v),s.saved?'OK':'PEND.'],w3)});

      newPage('5. SITUAÇÃO FINAL E APROVAÇÃO','Conferência antes da publicação no Cora Família');doc.setFillColor(...light);doc.roundedRect(M,y,usable,34,3,3,'F');doc.setTextColor(...(saved===total?green:amber));doc.setFont('helvetica','bold');doc.setFontSize(14);doc.text(saved===total?'FECHAMENTO COMPLETO':'FECHAMENTO PARCIAL',M+7,y+11);doc.setTextColor(...navy);doc.setFontSize(9);doc.text(saved+' registros salvos de '+total,M+7,y+20);doc.setFont('helvetica','normal');doc.setTextColor(...gray);doc.text((total-saved)+' registro(s) ainda pendente(s).',M+7,y+27);y+=50;section('APROVAÇÕES');y+=18;doc.setDrawColor(150,168,185);doc.line(M,y,M+76,y);doc.line(W-M-76,y,W-M,y);doc.setFontSize(8);doc.setTextColor(...gray);doc.text('Responsável pela elaboração',M,y+6);doc.text('Direção / Financeiro',W-M-76,y+6);

      const pages=doc.getNumberOfPages();for(let p=1;p<=pages;p++)footer(p);
      doc.save('Relatorio-Final-Fechamento-2027.pdf');
    }catch(e){console.error('PDF fechamento v30:',e);alert('Não foi possível gerar o PDF. Detalhe: '+(e&&e.message?e.message:String(e)));}
    finally{buttons.forEach(b=>{b.disabled=false;b.textContent=b.dataset.original||'📄 PDF fechamento final'})}
  }

  function bind(){
    const top=document.getElementById('downloadClosingPdfTop');if(top){top.onclick=generate;top.dataset.pdfFix='v30'}
    const bottom=document.getElementById('downloadFinalClosingPdf');if(bottom){bottom.onclick=generate;bottom.dataset.layoutV2='1';bottom.dataset.pdfFix='v30'}
  }
  function init(){bind();new MutationObserver(bind).observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();