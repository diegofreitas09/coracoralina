const CORA_GESTAO_SPREADSHEET_ID = '1dHrXFN8Gddha5zIoqZou2WfjV7EYbcyHh4-EOFC_qBg';
const CORA_ORCAMENTOS_FOLDER_ID = '1VxveHlp7ZssJLGKRQ1FekK8Fx90gzlJF';

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function normalize_(v) {
  return String(v == null ? '' : v).trim();
}

function sheet_(name) {
  const ss = SpreadsheetApp.openById(CORA_GESTAO_SPREADSHEET_ID);
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Aba não encontrada: ' + name);
  return sh;
}

function doGet(e) {
  try {
    const action = normalize_(e && e.parameter && e.parameter.action);
    if (!action || action === 'ping') return json_({ok:true,servico:'Cora Gestão 2027'});

    if (action === 'listar') {
      const aba = normalize_(e.parameter.aba);
      const sh = sheet_(aba);
      const values = sh.getDataRange().getValues();
      const headers = values.shift() || [];
      const rows = values.filter(r => r.some(v => v !== '')).map(r => {
        const o = {};
        headers.forEach((h,i) => o[String(h)] = r[i]);
        return o;
      });
      return json_({ok:true,aba,rows});
    }

    return json_({ok:false,mensagem:'Ação GET desconhecida.'});
  } catch (err) {
    return json_({ok:false,mensagem:String(err && err.message || err)});
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = normalize_(body.action);

    if (action === 'salvarRegistro') {
      const aba = normalize_(body.aba);
      const id = normalize_(body.id);
      if (!aba || !id) throw new Error('aba e id são obrigatórios');
      const sh = sheet_(aba);
      const values = sh.getDataRange().getValues();
      const headers = values[0] || [];
      const idCol = headers.findIndex(h => /(^id$|id do registro|^id$)/i.test(String(h).trim()));
      if (idCol < 0) throw new Error('Coluna ID não encontrada em ' + aba);
      let row = -1;
      for (let i=1;i<values.length;i++) if (normalize_(values[i][idCol]) === id) { row = i+1; break; }
      const data = body.data || {};
      const out = headers.map(h => Object.prototype.hasOwnProperty.call(data,h) ? data[h] : '');
      if (row > 0) {
        const current = sh.getRange(row,1,1,headers.length).getValues()[0];
        headers.forEach((h,i) => { if (!Object.prototype.hasOwnProperty.call(data,h)) out[i] = current[i]; });
        sh.getRange(row,1,1,headers.length).setValues([out]);
      } else {
        out[idCol] = id;
        sh.appendRow(out);
        row = sh.getLastRow();
      }
      registrarHistorico_(aba,id,data);
      return json_({ok:true,aba,id,row});
    }

    if (action === 'salvarPdfOrcamento') {
      const id = normalize_(body.id);
      const data = body.data || {};
      if (!id) throw new Error('ID do orçamento é obrigatório');
      const pdf = criarPdfOrcamento_(id,data);
      atualizarLinkPdf_(id,pdf.url);
      return json_({ok:true,id,pdfUrl:pdf.url,fileId:pdf.fileId});
    }

    if (action === 'publicar') {
      const sh = sheet_('Publicações');
      const p = body.data || {};
      sh.appendRow([
        new Date(), p.destino || 'Cora Família', p.categoria || '', p.turma || '', p.id || '',
        p.status || 'PUBLICADO', p.versao || '1', p.usuario || '', p.observacao || '', p.controle || ''
      ]);
      return json_({ok:true,mensagem:'Publicação registrada'});
    }

    return json_({ok:false,mensagem:'Ação POST desconhecida.'});
  } catch (err) {
    return json_({ok:false,mensagem:String(err && err.message || err)});
  }
}

function criarPdfOrcamento_(id,data) {
  const folder = DriveApp.getFolderById(CORA_ORCAMENTOS_FOLDER_ID);
  const responsavel = normalize_(data['Responsável'] || data.responsavel || 'Responsável');
  const aluno = normalize_(data['Aluno'] || data.aluno || 'Aluno');
  const serie = normalize_(data['Série/Segmento'] || data.serie || '');
  const observacoes = normalize_(data['Observações'] || data.observacoes || '');
  const nomeSeguro = (aluno || responsavel || id).replace(/[\\/:*?"<>|]/g,'-');
  const doc = DocumentApp.create('TEMP-' + id);
  const body = doc.getBody();
  body.setMarginTop(36).setMarginBottom(36).setMarginLeft(40).setMarginRight(40);
  body.appendParagraph('COLÉGIO CORA CORALINA').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Cora Família — Orçamento 2027').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Nº do orçamento: ' + id);
  body.appendParagraph('Data/Hora: ' + normalize_(data['Data/Hora'] || ''));
  body.appendHorizontalRule();
  body.appendParagraph('DADOS DA FAMÍLIA').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Responsável: ' + responsavel);
  body.appendParagraph('Aluno: ' + aluno);
  body.appendParagraph('Data de nascimento: ' + normalize_(data['Data de nascimento'] || ''));
  body.appendParagraph('Idade: ' + normalize_(data['Idade'] || ''));
  body.appendParagraph('Série/Segmento: ' + serie);
  body.appendHorizontalRule();
  body.appendParagraph('CONDIÇÕES DO ORÇAMENTO').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph('Plano: ' + normalize_(data['Plano'] || ''));
  body.appendParagraph('Condição: ' + normalize_(data['Condição'] || ''));
  body.appendParagraph('1ª Parcela: R$ ' + formatarNumeroBr_(data['1ª Parcela']));
  body.appendParagraph('Mensalidade/Parcela: R$ ' + formatarNumeroBr_(data['Mensalidade/Parcela']));
  body.appendParagraph('Material didático: R$ ' + formatarNumeroBr_(data['Material didático']));
  body.appendParagraph('Fardamento: R$ ' + formatarNumeroBr_(data['Fardamento']));
  body.appendParagraph('TOTAL ESTIMADO: R$ ' + formatarNumeroBr_(data['Total orçamento'])).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendHorizontalRule();
  body.appendParagraph('ITENS SELECIONADOS').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(normalize_(data['Itens selecionados'] || 'Nenhum item informado.'));
  if (observacoes) {
    body.appendHorizontalRule();
    body.appendParagraph('OBSERVAÇÕES').setHeading(DocumentApp.ParagraphHeading.HEADING2);
    body.appendParagraph(observacoes);
  }
  body.appendParagraph('Documento gerado automaticamente pelo Cora Família. Valores oficiais de 2027.');
  doc.saveAndClose();
  const file = DriveApp.getFileById(doc.getId());
  const pdfBlob = file.getAs(MimeType.PDF).setName('Orçamento Cora Família 2027 - ' + nomeSeguro + ' - ' + id + '.pdf');
  const pdfFile = folder.createFile(pdfBlob);
  file.setTrashed(true);
  return {fileId:pdfFile.getId(),url:pdfFile.getUrl()};
}

function formatarNumeroBr_(v) {
  const n = Number(v || 0);
  return Utilities.formatString('%.2f',n).replace('.',',');
}

function atualizarLinkPdf_(id,url) {
  try {
    const sh = sheet_('Orçamentos Cora Família');
    const values = sh.getDataRange().getValues();
    const headers = values[0] || [];
    let col = headers.findIndex(h => normalize_(h).toLowerCase() === 'pdf drive');
    if (col < 0) {
      col = headers.length;
      sh.getRange(1,col+1).setValue('PDF Drive');
    }
    const idCol = headers.findIndex(h => normalize_(h).toLowerCase() === 'id');
    if (idCol < 0) return;
    for (let i=1;i<values.length;i++) {
      if (normalize_(values[i][idCol]) === id) {
        sh.getRange(i+1,col+1).setValue(url);
        break;
      }
    }
  } catch(e) {}
}

function registrarHistorico_(categoria,id,data) {
  try {
    const sh = sheet_('Histórico');
    sh.appendRow([new Date(), categoria, id, JSON.stringify(data || {})]);
  } catch (e) {}
}
