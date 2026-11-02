// Reconciliação automática: a Gestão é a fonte de verdade, Google Sheets é cópia.
import {listEmployees} from './lib/cora-team-auth.mjs';
import {syncEmployeesToSheets} from './lib/cora-google-sheets-mirror.mjs';
export default async function handler(){
 if(!process.env.CORA_GOOGLE_SERVICE_ACCOUNT_JSON?.trim())return;
 const {members}=await listEmployees();
 const result=await syncEmployeesToSheets(members);
 if(!result.synced)console.warn('Espelhamento Google não concluído: '+(result.error||result.reason||'não configurado'));
}
export const config={schedule:'0 */6 * * *'};
