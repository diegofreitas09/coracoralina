/* Planejamento pedagógico em Word (.docx) — documento editável e autossuficiente, sem CDN. */
(() => {
 'use strict';
 const NS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&apos;'}[ch]));
 const p=(text,{size=21,color='243F58',bold=false,before=0,after=95,shade='',keep=false,center=false,border=false}={})=>{
  // Propriedades na ordem prevista pelo esquema OOXML (Word).
  const props='<w:pPr>'+
   (keep?'<w:keepNext/>':'')+
   (border?'<w:pBdr><w:bottom w:val="single" w:sz="20" w:color="D6B873" w:space="7"/></w:pBdr>':'')+
   (shade?'<w:shd w:val="clear" w:color="auto" w:fill="'+shade+'"/>':'')+
   '<w:spacing w:before="'+before+'" w:after="'+after+'" w:line="300" w:lineRule="auto"/>'+
   (center?'<w:jc w:val="center"/>':'')+
   '</w:pPr>';
  const rprops='<w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>'+
   (bold?'<w:b/>':'')+
   '<w:color w:val="'+color+'"/><w:sz w:val="'+size+'"/></w:rPr>';
  return '<w:p>'+props+'<w:r>'+rprops+'<w:t xml:space="preserve">'+esc(text)+'</w:t></w:r></w:p>';
 };
 const paraList=(items)=>items.map(x=>p('•  '+x,{size:20,before:30,after:72})).join('');
 const section=(label,items)=>{
  const normalized=(Array.isArray(items)?items:[]).map(x=>String(x||'').trim()).filter(Boolean);
  if(!normalized.length)return '';
  return p(label.toLocaleUpperCase('pt-BR'),{size:20,bold:true,color:'123F66',before:195,after:100,shade:'EAF2F9',keep:true})+
   paraList(normalized);
 };
 const meta=(label,value)=>p(label+': '+(String(value||'').trim()||'A definir'),{size:19,color:'244A68',after:80});
 function crc32(bytes){
  let crc=0xFFFFFFFF;
  for(let i=0;i<bytes.length;i++){
   crc^=bytes[i];
   for(let b=0;b<8;b++)crc=(crc>>>1) ^ ((crc&1)?0xEDB88320:0);
  }
  return (crc^0xFFFFFFFF)>>>0;
 }
 function zipStore(files){
  const encoder=new TextEncoder(),chunks=[],central=[];
  let offset=0,centralBytes=0;
  for(const [name,xml] of files){
   const n=encoder.encode(name),data=encoder.encode(xml),crc=crc32(data);
   const local=new Uint8Array(30+n.length),l=new DataView(local.buffer);
   l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x0800,true);
   l.setUint16(8,0,true);l.setUint32(14,crc,true);
   l.setUint32(18,data.length,true);l.setUint32(22,data.length,true);
   l.setUint16(26,n.length,true);local.set(n,30);
   chunks.push(local,data);
   const c=new Uint8Array(46+n.length),v=new DataView(c.buffer);
   v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);
   v.setUint16(8,0x0800,true);v.setUint32(16,crc,true);
   v.setUint32(20,data.length,true);v.setUint32(24,data.length,true);
   v.setUint16(28,n.length,true);v.setUint32(42,offset,true);c.set(n,46);
   central.push(c);centralBytes+=c.length;offset+=local.length+data.length;
  }
  const ending=new Uint8Array(22),v=new DataView(ending.buffer);
  v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);
  v.setUint32(12,centralBytes,true);v.setUint32(16,offset,true);
  return new Blob([...chunks,...central,ending],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
 }
 const docXml=(doc)=>{
  const title='Planejamento pedagógico · '+doc.month+' de '+doc.year;
  const meeting=doc.meeting||{},sections=doc.sections||[];
  let body='';
  body+=p('COLÉGIO CORA CORALINA',{size:29,bold:true,color:'12395F',after:70,center:true});
  body+=p('PLANEJAMENTO PEDAGÓGICO',{size:22,bold:true,color:'50718D',after:185,center:true,border:true});
  body+=p(title,{size:30,bold:true,color:'12395F',before:160,after:70,center:true});
  body+=p(doc.segment||'Equipe pedagógica',{size:20,color:'426580',after:210,center:true});
  body+=p('REUNIÃO COM A EQUIPE',{size:21,bold:true,color:'12395F',before:140,after:110,shade:'EAF2F9',keep:true});
  body+=meta('Data',meeting.date||'Não informada');
  body+=meta('Horário',meeting.time);
  body+=meta('Local',meeting.place);
  body+=meta('Coordenação',meeting.coordinator);
  for(const block of sections)body+=section(block.title,block.items);
  body+=p('Responsável pela reunião: ____________________________________________',{size:19,bold:true,color:'20415F',before:260,after:170});
  body+=p('Colégio Cora Coralina · Tecnologia: PDF Solução Educacional',{size:16,color:'76889A',center:true,before:130,after:0,border:true});
  const page='<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1070" w:right="1000" w:bottom="1050" w:left="1000" w:header="500" w:footer="500" w:gutter="0"/></w:sectPr>';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
   '<w:document xmlns:w="'+NS+'"><w:body>'+body+page+'</w:body></w:document>';
 };
 function fromPlanning(doc){
  if(!doc||!doc.month||!Number.isInteger(Number(doc.year)))throw Error('Planejamento inválido para Word.');
  const now=new Date().toISOString();
  const ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
   '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
   '<Default Extension="xml" ContentType="application/xml"/>'+
   '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'+
   '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'+
   '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>';
  const relationships='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
   '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'+
   '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'+
   '</Relationships>';
  const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
   '<w:styles xmlns:w="'+NS+'"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/>'+
   '<w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="21"/></w:rPr></w:style></w:styles>';
  const core='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
   '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'+
   '<dc:title>'+esc('Planejamento '+doc.month+' '+doc.year)+'</dc:title>'+
   '<dc:creator>Colégio Cora Coralina</dc:creator>'+
   '<dcterms:created xsi:type="dcterms:W3CDTF">'+now+'</dcterms:created>'+
   '</cp:coreProperties>';
  return zipStore([
   ['[Content_Types].xml',ct],
   ['_rels/.rels',relationships],
   ['docProps/core.xml',core],
   ['word/document.xml',docXml(doc)],
   ['word/styles.xml',styles]
  ]);
 }
 window.CoraPlanningWord={fromPlanning};
})();