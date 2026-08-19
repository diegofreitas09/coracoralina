// V37 — adicionar dentro de doPost(e), antes de action === 'publicar'
if (action === 'salvarPdfBase64') {
  const id = normalize_(body.id);
  const filename = normalize_(body.filename) || ('Orçamento Cora Família 2027 - ' + id + '.pdf');
  const pdfBase64 = normalize_(body.pdfBase64);
  if (!id || !pdfBase64) throw new Error('ID e PDF são obrigatórios');
  const folder = DriveApp.getFolderById(CORA_ORCAMENTOS_FOLDER_ID);
  const bytes = Utilities.base64Decode(pdfBase64);
  const blob = Utilities.newBlob(bytes, MimeType.PDF, filename);
  const pdfFile = folder.createFile(blob);
  atualizarLinkPdf_(id, pdfFile.getUrl());
  return json_({ok:true,id,pdfUrl:pdfFile.getUrl(),fileId:pdfFile.getId()});
}

// Esta ação salva EXATAMENTE os mesmos bytes do PDF criado no navegador.
// Assim, o PDF baixado e o PDF do Drive usam o mesmo layout e conteúdo.