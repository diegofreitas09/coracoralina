const CORA_GESTAO_SPREADSHEET_ID = '1dHrXFN8Gddha5zIoqZou2WfjV7EYbcyHh4-EOFC_qBg';
const CORA_ORCAMENTOS_FOLDER_ID = '1VxveHlp7ZssJLGKRQ1FekK8Fx90gzlJF';

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function normalize_(v) {
  return String(v == null ? '' : v).trim();
}

const CORA_CONTROLLED_FIELDS_ = ['Status','Aprovado em','Publicado no Cora Família','Publicado em'];
const CORA_OFFICIAL_CATEGORIES_ = ['mensalidade','material didático','fardamento','sti / tempo integral'];
const CORA_PUBLIC_READ_SHEETS_ = ['Produtos 2027','Alunos 2027'];
const CORA_WRITABLE_SHEETS_ = ['Produtos 2027','Alunos 2027','Listas de Material','Orçamentos Cora Família'];
const CORA_MAX_PDF_BASE64_CHARS_ = 10000000;
const CORA_ALLOWED_FIELDS_BY_SHEET_ = {
  'Produtos 2027': ['Categoria','Segmento/Turma','Produto','Descrição','Valor 2026','Valor 2027','Reajuste %','Parcelamento','Obrigatório','Observação'],
  'Alunos 2027': ['Segmento','Série/Turma','Alunos 2025','Alunos 2026','Projeção 2027','Oficial 2027','Variação 26→27 %','Observação'],
  'Listas de Material': ['Turma/Série','Categoria','Item','Quantidade','Valor 2026','Valor 2027','Obrigatório','Observação / uso pedagógico','Fonte'],
  'Orçamentos Cora Família': ['Data/Hora','Responsável','Aluno','Data de nascimento','Idade','Série/Segmento','Plano','Condição','1ª Parcela','Mensalidade/Parcela','Material didático','Fardamento','Total orçamento','Itens selecionados','Origem','Observações','Contato do responsável']
};

function requireAllowedSheet_(name, allowed, operation) {
  if (allowed.indexOf(name) < 0) {
    throw new Error('Aba não autorizada para ' + operation);
  }
  return name;
}

function sanitizeSheetValue_(value) {
  if (typeof value !== 'string') return value;
  return /^\s*[=+\-@]/.test(value) ? "'" + value : value;
}

function sanitizeAllowedFields_(sheetName, data) {
  const source = stripControlledFields_(data || {});
  const allowed = CORA_ALLOWED_FIELDS_BY_SHEET_[sheetName] || [];
  const clean = {};
  allowed.forEach(function (key) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      clean[key] = sanitizeSheetValue_(source[key]);
    }
  });
  return clean;
}

function validBudgetId_(id) {
  return /^ORC-\d{10,}-[A-Z0-9]{5}$/.test(normalize_(id));
}

function budgetStatus_(id) {
  const normalizedId = normalize_(id);
  if (!validBudgetId_(normalizedId)) return {found:false,row:-1,total:0};
  const sh = sheet_('Orçamentos Cora Família');
  const lastRow = sh.getLastRow();
  const lastColumn = sh.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) return {found:false,row:-1,total:0};
  const headers = sh.getRange(1,1,1,lastColumn).getValues()[0] || [];
  const idCol = headers.findIndex(function (h) { return normalize_(h).toLowerCase() === 'id'; });
  if (idCol < 0) throw new Error('Coluna ID não encontrada em Orçamentos Cora Família');
  const ids = sh.getRange(2,idCol+1,lastRow-1,1).getValues();
  for (let i=0;i<ids.length;i++) {
    if (normalize_(ids[i][0]) === normalizedId) {
      return {found:true,row:i+2,total:lastRow-1};
    }
  }
  return {found:false,row:-1,total:lastRow-1};
}

function safePdfFilename_(filename, id) {
  let name = normalize_(filename) || ('Orçamento Cora Família 2027 - ' + id + '.pdf');
  name = name.replace(/[\\/:*?"<>|]/g,'-').replace(/\.pdf$/i,'').slice(0,180);
  return name + '.pdf';
}

function officialCategory_(value) {
  const category = normalize_(value).toLowerCase();
  return CORA_OFFICIAL_CATEGORIES_.indexOf(category) >= 0;
}

function stripControlledFields_(data) {
  const clean = Object.assign({}, data || {});
  CORA_CONTROLLED_FIELDS_.forEach(function (key) { delete clean[key]; });
  return clean;
}

function rowsAsObjects_(values) {
  const headers = values[0] || [];
  return values.slice(1).filter(function (row) {
    return row.some(function (value) { return value !== ''; });
  }).map(function (row) {
    const out = {};
    headers.forEach(function (header, index) { out[String(header)] = row[index]; });
    return out;
  });
}

function catalogAudit_() {
  const rows = rowsAsObjects_(sheet_('Produtos 2027').getDataRange().getValues());
  const approved = rows.filter(function (row) {
    return normalize_(row.Status).toUpperCase() === 'APROVADO' &&
      normalize_(row['Publicado no Cora Família']).toUpperCase() === 'SIM';
  });
  const drafts = rows.filter(function (row) {
    return normalize_(row.Status).toUpperCase() === 'RASCUNHO' &&
      normalize_(row['Publicado no Cora Família']).toUpperCase() === 'NÃO';
  });
  const report = rows.filter(function (row) { return officialCategory_(row.Categoria); });
  return {total:rows.length,aprovadosPublicados:approved.length,rascunhos:drafts.length,relatorioCompleto:report.length};
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
      const aba = requireAllowedSheet_(normalize_(e.parameter.aba), CORA_PUBLIC_READ_SHEETS_, 'leitura');
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

    if (action === 'confirmarRegistro') {
      const id = normalize_(e && e.parameter && e.parameter.id);
      if (!validBudgetId_(id)) return json_({ok:false,found:false,mensagem:'ID de orçamento inválido.'});
      const status = budgetStatus_(id);
      return json_({ok:true,found:status.found,total:status.total});
    }

    if (action === 'auditarCatalogo') {
      return json_({ok:true,versao:'71',auditoria:catalogAudit_(),requisicaoSobreposta:false});
    }

    return json_({ok:false,mensagem:'Ação GET desconhecida.'});
  } catch (err) {
    console.error(err);
    return json_({ok:false,codigo:'ERRO_INTERNO',mensagem:'Não foi possível processar a solicitação.'});
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = normalize_(body.action);

    if (action === 'salvarRegistro') {
      const aba = requireAllowedSheet_(normalize_(body.aba), CORA_WRITABLE_SHEETS_, 'gravação');
      const id = normalize_(body.id);
      if (!aba || !id) throw new Error('aba e id são obrigatórios');
      if (aba === 'Orçamentos Cora Família' && !validBudgetId_(id)) throw new Error('ID de orçamento inválido');
      const lock = LockService.getScriptLock();
      if (!lock.tryLock(30000)) return json_({ok:false,codigo:'REGISTRO_OCUPADO',mensagem:'Outra gravação está em andamento'});
      try {
        const sh = sheet_(aba);
        const values = sh.getDataRange().getValues();
        const headers = values[0] || [];
        const idCol = headers.findIndex(h => /(^id$|id do registro|^id$)/i.test(String(h).trim()));
        if (idCol < 0) throw new Error('Coluna ID não encontrada em ' + aba);
        let row = -1;
        for (let i=1;i<values.length;i++) if (normalize_(values[i][idCol]) === id) { row = i+1; break; }
        const data = sanitizeAllowedFields_(aba, body.data || {});
        data.ID = id;
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
      } finally {
        lock.releaseLock();
      }
    }

    if (action === 'salvarLote') {
      const aba = requireAllowedSheet_(normalize_(body.aba || 'Produtos 2027'), ['Produtos 2027'], 'gravação em lote');
      const registros = Array.isArray(body.registros) ? body.registros : [];
      const escopo = normalize_(body.escopo);
      if (!registros.length) throw new Error('registros é obrigatório');
      if (registros.length > 200) throw new Error('Lote excede 200 registros');
      if (escopo === 'CATALOGO_OFICIAL_36') {
        if (registros.length !== 36) throw new Error('Catálogo oficial deve conter exatamente 36 registros');
        if (registros.some(function (r) { return !officialCategory_(r && r.data && r.data.Categoria); })) {
          throw new Error('Categoria não autorizada no catálogo oficial');
        }
      }
      const lock = LockService.getScriptLock();
      if (!lock.tryLock(60000)) return json_({ok:false,codigo:'LOTE_OCUPADO',mensagem:'Outra gravação está em andamento'});
      try {
        const sh = sheet_(aba);
        const values = sh.getDataRange().getValues();
        const headers = values[0] || [];
        const idCol = headers.findIndex(function (h) { return normalize_(h).toLowerCase() === 'id'; });
        if (idCol < 0) throw new Error('Coluna ID não encontrada em ' + aba);
        const index = {};
        for (let i=1;i<values.length;i++) index[normalize_(values[i][idCol])] = i;
        const stamp = new Date();
        registros.forEach(function (registro) {
          const id = normalize_(registro && registro.id);
          if (!id) throw new Error('Todos os registros precisam de ID fixo');
          const incoming = sanitizeAllowedFields_(aba, registro.data || {});
          incoming.ID = id;
          let rowIndex = index[id];
          if (rowIndex == null) {
            rowIndex = values.length;
            index[id] = rowIndex;
            values.push(headers.map(function () { return ''; }));
          }
          headers.forEach(function (header, col) {
            if (Object.prototype.hasOwnProperty.call(incoming, header)) values[rowIndex][col] = incoming[header];
          });
          if (escopo === 'CATALOGO_OFICIAL_36') {
            const statusCol = headers.indexOf('Status');
            const approvedAtCol = headers.indexOf('Aprovado em');
            const publishedCol = headers.indexOf('Publicado no Cora Família');
            const publishedAtCol = headers.indexOf('Publicado em');
            if (statusCol >= 0) values[rowIndex][statusCol] = 'APROVADO';
            if (approvedAtCol >= 0) values[rowIndex][approvedAtCol] = stamp;
            if (publishedCol >= 0) values[rowIndex][publishedCol] = 'SIM';
            if (publishedAtCol >= 0) values[rowIndex][publishedAtCol] = stamp;
          }
        });
        if (values.length > 1) sh.getRange(1,1,values.length,headers.length).setValues(values);
        const audit = catalogAudit_();
        registrarHistorico_(aba,'LOTE-V71',{quantidade:registros.length,escopo:escopo,auditoria:audit});
        return json_({ok:true,versao:'71',gravados:registros.length,auditoria:audit,requisicaoSobreposta:false});
      } finally {
        lock.releaseLock();
      }
    }

    if (action === 'salvarPdfOrcamento') {
      const id = normalize_(body.id);
      if (!validBudgetId_(id)) throw new Error('ID do orçamento é inválido');
      if (!budgetStatus_(id).found) throw new Error('Orçamento não localizado');
      const data = sanitizeAllowedFields_('Orçamentos Cora Família', body.data || {});
      data.ID = id;
      const pdf = criarPdfOrcamento_(id,data);
      atualizarLinkPdf_(id,pdf.url);
      return json_({ok:true,id,pdfUrl:pdf.url,fileId:pdf.fileId});
    }

    if (action === 'salvarPdfBase64') {
      const id = normalize_(body.id);
      const pdfBase64 = normalize_(body.pdfBase64);
      if (!validBudgetId_(id)) throw new Error('ID do orçamento é inválido');
      if (!budgetStatus_(id).found) throw new Error('Orçamento não localizado');
      if (!pdfBase64) throw new Error('PDF é obrigatório');
      if (pdfBase64.length > CORA_MAX_PDF_BASE64_CHARS_) throw new Error('PDF excede o limite permitido');
      const bytes = Utilities.base64Decode(pdfBase64);
      if (bytes.length < 5 || bytes[0] !== 37 || bytes[1] !== 80 || bytes[2] !== 68 || bytes[3] !== 70 || bytes[4] !== 45) {
        throw new Error('Arquivo enviado não é um PDF válido');
      }
      const folder = DriveApp.getFolderById(CORA_ORCAMENTOS_FOLDER_ID);
      const filename = safePdfFilename_(body.filename, id);
      const blob = Utilities.newBlob(bytes, MimeType.PDF, filename);
      const pdfFile = folder.createFile(blob);
      atualizarLinkPdf_(id, pdfFile.getUrl());
      return json_({ok:true,id,pdfUrl:pdfFile.getUrl(),fileId:pdfFile.getId()});
    }

    if (action === 'publicar') {
      const sh = sheet_('Publicações');
      const p = body.data || {};
      sh.appendRow([
        new Date(), sanitizeSheetValue_(p.destino || 'Cora Família'), sanitizeSheetValue_(p.categoria || ''),
        sanitizeSheetValue_(p.turma || ''), sanitizeSheetValue_(p.id || ''), sanitizeSheetValue_(p.status || 'PUBLICADO'),
        sanitizeSheetValue_(p.versao || '1'), sanitizeSheetValue_(p.usuario || ''), sanitizeSheetValue_(p.observacao || ''),
        sanitizeSheetValue_(p.controle || '')
      ]);
      return json_({ok:true,mensagem:'Publicação registrada'});
    }

    return json_({ok:false,mensagem:'Ação POST desconhecida.'});
  } catch (err) {
    console.error(err);
    return json_({ok:false,codigo:'ERRO_INTERNO',mensagem:'Não foi possível processar a solicitação.'});
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
    sh.appendRow([new Date(), sanitizeSheetValue_(categoria), sanitizeSheetValue_(id), JSON.stringify(data || {})]);
  } catch (e) {}
}
