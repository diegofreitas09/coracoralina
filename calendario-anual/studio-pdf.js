/* Exportação PDF local de imagens Canvas (sem depender de serviço externo). */
(() => {
  'use strict';
  const encode = s => new TextEncoder().encode(s);
  function jpgBytes(canvas) {
    const encoded=canvas.toDataURL('image/jpeg',.89).split(',')[1];
    const data=atob(encoded),bytes=new Uint8Array(data.length);
    for(let i=0;i<data.length;i++)bytes[i]=data.charCodeAt(i);
    return bytes;
  }
  function fromCanvases(canvases,opts={}) {
    if(!Array.isArray(canvases)||!canvases.length)throw new Error('Documento sem páginas');
    const w=Number(opts.pageWidth)||595.28,h=Number(opts.pageHeight)||841.89;
    const images=canvases.map(jpgBytes),n=images.length,infoId=3*n+3,objects=infoId;
    const byteChunks=[],offsets=new Array(objects+1).fill(0);let total=0;
    const push=data=>{const b=typeof data==='string'?encode(data):data;byteChunks.push(b);total+=b.length};
    const obj=(id,body)=>{offsets[id]=total;push(`${id} 0 obj\n`);if(typeof body==='function')body();else push(body);push('\nendobj\n')};
    push('%PDF-1.4\n%CORACORALINA\n');
    obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
    obj(2,`<< /Type /Pages /Count ${n} /Kids [${images.map((_,i)=>`${3+i*3} 0 R`).join(' ')}] >>`);
    for(let i=0;i<n;i++){
      const pageId=3+i*3,contentsId=pageId+1,imgId=pageId+2,img=images[i],canvas=canvases[i],name=`Im${i+1}`;
      obj(pageId,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /${name} ${imgId} 0 R >> >> /Contents ${contentsId} 0 R >>`);
      const content=encode(`q\n${w} 0 0 ${h} 0 0 cm\n/${name} Do\nQ\n`);
      obj(contentsId,()=>{push(`<< /Length ${content.length} >>\nstream\n`);push(content);push('\nendstream')});
      obj(imgId,()=>{push(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`);push(img);push('\nendstream')});
    }
    const title=String(opts.title||'Calendário Escolar Cora Coralina').replace(/[\\()\r\n]/g,' ').slice(0,120).replace(/[^\x20-\x7e]/g,'');
    obj(infoId,`<< /Title (${title}) /Creator (Colégio Cora Coralina) /Producer (Calendario Escolar Cora Coralina) >>`);
    const startXref=total;push(`xref\n0 ${objects+1}\n0000000000 65535 f \n`);
    for(let i=1;i<=objects;i++)push(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);
    push(`trailer\n<< /Size ${objects+1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${startXref}\n%%EOF\n`);
    return new Blob(byteChunks,{type:'application/pdf'});
  }
  window.CoraPDF={fromCanvases};
})();