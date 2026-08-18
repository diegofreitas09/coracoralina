const CORA_GESTAO_SPREADSHEET_ID = '1dHrXFN8Gddha5zIoqZou2WfjV7EYbcyHh4-EOFC_qBg';

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
        const idPos = idCol;
        out[idPos] = id;
        sh.appendRow(out);
        row = sh.getLastRow();
      }
      registrarHistorico_(aba,id,data);
      return json_({ok:true,aba,id,row});
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

function registrarHistorico_(categoria,id,data) {
  try {
    const sh = sheet_('Histórico');
    sh.appendRow([new Date(), categoria, id, JSON.stringify(data || {})]);
  } catch (e) {}
}
