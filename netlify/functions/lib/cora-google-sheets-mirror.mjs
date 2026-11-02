// Espelho secundário. Autoridade de contas e logins: Netlify Blobs / Gestão.
// Requer CORA_GOOGLE_SERVICE_ACCOUNT_JSON (segredo em env do Netlify) e compartilhamento
// da planilha existente com o e-mail da conta de serviço no Google Workspace/Sheets.
import { createSign } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const TARGET_SHEET='1tnOgWrN04AMiK88lkCCePeP3iOJ0AHnbN_91SpK5kyA';
const AUDIT_TAB='Auditoria de Logins';
const HEADER=['E-mail de acesso','Nome do colaborador','Situação','Data de ativação',
 'Primeiro acesso monitorado','Último acesso','Quantidade de acessos'];
const statusDb=()=>getStore('cora-calendar-google-mirror-status-v1');
const isConfigured=()=>Boolean(process.env.CORA_GOOGLE_SERVICE_ACCOUNT_JSON?.trim());
const safeDate=iso=>{
 if(!iso||!Number.isFinite(Date.parse(iso)))return '';
 return new Date(iso).toLocaleString('pt-BR',{timeZone:'America/Fortaleza',dateStyle:'short',timeStyle:'short'});
};
const encode=obj=>Buffer.from(JSON.stringify(obj)).toString('base64url');
const safeError=e=>String(e?.message||e||'Erro desconhecido').slice(0,280)
 .replace(/(?:Bearer|token|private_key|password|secret)\s*[:=]?\s*\S+/gi,'[redigido]');
async function oauthToken(){
 let c;try{c=JSON.parse(process.env.CORA_GOOGLE_SERVICE_ACCOUNT_JSON||'{}')}
 catch{throw Error('Credencial da conta de serviço Google inválida.')}
 if(!c.client_email||!c.private_key)throw Error('Conta de serviço Google incompleta.');
 const now=Math.floor(Date.now()/1000);
 const assertion=encode({alg:'RS256',typ:'JWT'})+'.'+encode({
  iss:c.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',
  aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3300
 });
 const signer=createSign('RSA-SHA256');signer.update(assertion);signer.end();
 const signature=signer.sign(c.private_key.replace(/\\n/g,'\n')).toString('base64url');
 const body=new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',
   assertion:assertion+'.'+signature});
 const response=await fetch('https://oauth2.googleapis.com/token',{
  method:'POST',body,signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('Não foi possível autenticar a conta de serviço Google (HTTP '+response.status+').');
 const data=await response.json();
 if(typeof data.access_token!=='string')throw Error('Google OAuth não devolveu token válido.');
 return data.access_token;
}
async function sheetsCall(token,url,options={}){
 const r=await fetch(url,{
  ...options,
  headers:{Authorization:'Bearer '+token,Accept:'application/json',...(options.body?{'Content-Type':'application/json'}:{})},
  signal:AbortSignal.timeout(10000)
 });
 if(!r.ok)throw Error('Falha ao atualizar Google Sheets (HTTP '+r.status+'). Verifique API e compartilhamento com a conta de serviço.');
 return r.json();
}
const base=id=>'https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(id);
export async function mirrorStatus(){
 const entry=await statusDb().get('status',{type:'json',consistency:'strong'})||{};
 return {configured:isConfigured(),lastSuccessAt:entry.lastSuccessAt||'',
  lastAttemptAt:entry.lastAttemptAt||'',lastError:entry.lastError||'',rows:entry.rows||0};
}
export async function syncEmployeesToSheets(members){
 // A aplicação funciona normalmente quando a planilha não está configurada.
 if(!isConfigured())return {configured:false,synced:false,reason:'Credenciais Google ainda não configuradas no servidor.'};
 const started=new Date().toISOString();
 const db=statusDb();
 try{
  if(!Array.isArray(members))throw Error('Relatório da Gestão inválido.');
  const token=await oauthToken(),spreadsheetId=process.env.CORA_GOOGLE_SHEET_ID?.trim()||TARGET_SHEET;
  const metadata=await sheetsCall(token,base(spreadsheetId)+'?fields=sheets(properties(sheetId,title,gridProperties(rowCount)))');
  const tab=metadata.sheets?.find(s=>s.properties?.title===AUDIT_TAB)?.properties;
  if(!tab)throw Error('Aba Auditoria de Logins não existe na planilha autorizada.');
  let rowCount=Math.max(1,Number(tab.gridProperties?.rowCount)||1);
  const minimum=members.length+1;
  if(minimum>rowCount){
   await sheetsCall(token,base(spreadsheetId)+':batchUpdate',{method:'POST',body:JSON.stringify({
    requests:[{appendDimension:{sheetId:tab.sheetId,dimension:'ROWS',length:minimum-rowCount}}]
   })});
   rowCount=minimum;
  }
  const values=[HEADER,...members.map(m=>[
   String(m.email||''),String(m.name||''),String(m.status||''),safeDate(m.activatedAt),
   safeDate(m.firstAccessAt),safeDate(m.lastLogin),
   Number.isSafeInteger(m.accessCount)?m.accessCount:''
  ])];
  while(values.length<rowCount)values.push(['','','','','','','']);
  const range=encodeURIComponent("'"+AUDIT_TAB+"'!A1:G"+rowCount);
  await sheetsCall(token,base(spreadsheetId)+'/values/'+range+'?valueInputOption=RAW',{
   method:'PUT',body:JSON.stringify({range:"'"+AUDIT_TAB+"'!A1:G"+rowCount,
    majorDimension:'ROWS',values})
  });
  const now=new Date().toISOString();
  await db.setJSON('status',{lastSuccessAt:now,lastAttemptAt:now,lastError:'',rows:members.length});
  return {configured:true,synced:true,lastSuccessAt:now,rows:members.length};
 }catch(e){
  const err=safeError(e);
  // Nunca suspender login ou bloquear professor porque um serviço externo falhou.
  await db.setJSON('status',{...(await db.get('status',{type:'json',consistency:'strong'})||{}),
    lastAttemptAt:started,lastError:err});
  return {configured:true,synced:false,error:err};
 }
}
