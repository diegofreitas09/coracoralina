(function(){
  const API='https://script.google.com/macros/s/AKfycbwSpAtBgMjFyQ7J5yUxIfobEt0CxCGNgWEQZxp-mj9z-9zfWIcV2ig9iQlGzcCL5UYk/exec';
  const FECH_KEY='cora2027_fechamento_reajustes_v2';
  const LIST_KEY='cora2027_listas_material_v1';
  const ALUNOS_KEY='cora2027_alunos_oficial_v1';
  const STATE_KEY='cora2027_v16_state';
  const now=()=>new Date().toLocaleString('pt-BR',{timeZone:'America/Fortaleza'});
  const txt=v=>String(v==null?'':v);
  const num=v=>Number(String(v??'').replace(/\./g,'').replace(',','.'))||0;
  const slug=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toUpperCase();
  function read(key){try{return JSON.parse(localStorage.getItem(key)||'{}')||{}}catch(e){return {}}}
  function write(key,val){localStorage.setItem(key,JSON.stringify(val))}
  function toast(msg,type='ok'){let el=document.getElementById('sheetSyncToast');if(!el){el=document.createElement('div');el.id='sheetSyncToast';document.body.appendChild(el)}el.className='sheet-sync-toast '+type;el.textContent=msg;el.style.display='block';clearTimeout(el._t);el._t=setTimeout(()=>el.style.display='none',3200)}
  async function post(payload){await fetch(API,{method:'POST',mode:'no-cors',cache:'no-store',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});return true}
  async function getRows(aba){const u=API+'?action=listar&aba='+encodeURIComponent(aba)+'&_='+Date.now();const r=await fetch(u,{method:'GET',cache:'no-store'});if(!r.ok)throw new Error('Falha ao consultar '+aba);const j=await r.json();if(!j.ok)throw new Error(j.mensagem||'Falha ao consultar '+aba);return Array.isArray(j.rows)?j.rows:[]}
  function saveRecord(aba,id,data){return post({action:'salvarRegistro',aba,id,data})}

  function tuitionRows(){
    const db=read(FECH_KEY),out=[];
    Object.entries(db.tuition||{}).forEach(([seg,r])=>{
      if(!r||!r.saved)return;
      const ann=Number(r.annuity)||0,first=Number(r.first)||0,a=Number(r.planA)||0,b=Number(r.planB)||0,late26=Number(r.late26)||0,rate=Number(r.rate)||0,late27=late26*(1+rate/100);
      out.push({id:'MEN|'+slug(seg),data:{'Categoria':'Mensalidade','Segmento/Turma':seg,'Produto':'Anuidade + Planos A/B','Descrição':'Anuidade até vencimento e referência após vencimento. 1ª parcela definida pela gestão.','Valor 2026':Number(r.base26)||0,'Valor 2027':ann,'Reajuste %':rate,'Parcelamento':`1ª parcela R$ ${first.toFixed(2)} | Plano A: 12 x R$ ${a.toFixed(2)} | Plano B: 11 x R$ ${b.toFixed(2)}`,'Obrigatório':'SIM','Status':'RASCUNHO','Aprovado em':'','Publicado no Cora Família':'NÃO','ID':'MEN|'+slug(seg),'Observação':`Após vencimento 2026: R$ ${late26.toFixed(2)} | Após vencimento 2027: R$ ${late27.toFixed(2)} | Salvo em ${r.savedAt||now()}`}});
    });
    Object.entries(db.records||{}).forEach(([id,r])=>{
      if(!r||!r.saved)return;
      const cat=r.category==='Fardamento'?'Fardamento':r.category==='STI / Tempo Integral'?'STI / Tempo Integral':'Material Didático';
      const rid=cat==='STI / Tempo Integral'?id:(cat==='Fardamento'?'FAR|':'MATD|')+slug(id);
      out.push({id:rid,data:{'Categoria':cat,'Segmento/Turma':r.segment||'','Produto':r.item||'','Descrição':r.detail||'','Valor 2026':Number(r.v26)||0,'Valor 2027':Number(r.v27)||0,'Reajuste %':Number(r.rate)||0,'Parcelamento':'','Obrigatório':cat==='Material Didático'?'SIM':'NÃO','Status':'RASCUNHO','Aprovado em':'','Publicado no Cora Família':'NÃO','ID':rid,'Observação':'Salvo em '+(r.savedAt||now())}});
    });
    return out;
  }
  function listRowsFor(turma,o){const rows=[],stamp=o.savedAt||now();const push=(cat,item,i,val='',obs='')=>{const id=`LM27|${slug(turma)}|${slug(cat)}|${String(i+1).padStart(3,'0')}`;rows.push({id,data:{'Turma/Série':turma,'Categoria':cat,'Item':item,'Quantidade':1,'Valor 2026':'','Valor 2027':val===''?'':Number(val)||0,'Obrigatório':'SIM','Observação / uso pedagógico':obs,'Status':'RASCUNHO','Salvo em':stamp,'Fonte':'Cora Gestão 2027','ID':id}})};push('Material didático',o.didatico?.nome||'Material didático',0,o.didatico?.valor||0,o.didatico?.parcelamento||'');(o.uso||[]).forEach((x,i)=>push('Plano de utilização',x,i,'','Material coletivo / plano de utilização'));(o.individual||[]).forEach((x,i)=>push('Material individual',x,i));(o.higiene||[]).forEach((x,i)=>push('Higiene pessoal',x,i));(o.extras||[]).forEach((x,i)=>push('Item específico / caderno',x.item||'',i,x.valor));return rows}
  async function syncFechamento(silent=false){const rows=tuitionRows();if(!rows.length){if(!silent)toast('Nenhum item salvo para enviar à planilha.','warn');return 0}if(!silent)toast('Enviando fechamento para a planilha...','wait');await Promise.all(rows.map(r=>saveRecord('Produtos 2027',r.id,r.data)));if(!silent)toast(`☁️ ${rows.length} registros enviados para a planilha oficial.`);return rows.length}
  async function syncLista(turma,silent=false){const db=read(LIST_KEY),o=db[turma];if(!o){if(!silent)toast('Salve a lista da turma antes de sincronizar.','warn');return 0}const rows=listRowsFor(turma,o);if(!silent)toast('Enviando lista para a planilha...','wait');await Promise.all(rows.map(r=>saveRecord('Listas de Material',r.id,r.data)));await saveRecord('Produtos 2027','LISTA|'+slug(turma),{'Categoria':'Lista de Material','Segmento/Turma':turma,'Produto':'Lista oficial de material 2027','Descrição':`${rows.length} registros vinculados à turma`,'Valor 2026':'','Valor 2027':Number(o.didatico?.valor)||0,'Reajuste %':'','Parcelamento':o.didatico?.parcelamento||'','Obrigatório':'SIM','Status':'RASCUNHO','Aprovado em':'','Publicado no Cora Família':'NÃO','ID':'LISTA|'+slug(turma),'Observação':'Último salvamento: '+(o.savedAt||now())});if(!silent)toast(`☁️ Lista de ${turma} enviada para a planilha oficial.`);return rows.length}
  async function syncTudo(){toast('Sincronizando todos os dados salvos...','wait');let n=await syncFechamento(true),m=0;const lists=read(LIST_KEY);for(const turma of Object.keys(lists)){m+=await syncLista(turma,true)}toast(`☁️ Sincronização concluída: ${n+m} registros enviados.`)}

  function findMaterialId(seg,prod){try{const arr=window.MATERIALS||MATERIALS||[];const r=arr.find(x=>x.segment===seg&&x.name===prod);return r?`L|${r.segment}|${r.name}`:null}catch(e){return null}}
  function findUniformId(seg,prod){try{const arr=window.UNIFORMS||UNIFORMS||[];const i=arr.findIndex(x=>x.segment===seg&&x.name===prod);return i>=0?`F|${i}|${arr[i].segment}|${arr[i].name}`:null}catch(e){return null}}
  function parseMoneyPart(text,label){const re=new RegExp(label+'\\s*R\\$\\s*([0-9.]+(?:,[0-9]{1,2})?)','i');const m=txt(text).match(re);return m?num(m[1]):0}
  function hydrateProducts(rows){
    const db=read(FECH_KEY);db.tuition=db.tuition||{};db.records=db.records||{};let count=0;
    rows.forEach(r=>{
      const cat=txt(r['Categoria']),seg=txt(r['Segmento/Turma']),prod=txt(r['Produto']),id=txt(r['ID']),v26=Number(r['Valor 2026'])||0,v27=Number(r['Valor 2027'])||0,rate=Number(r['Reajuste %'])||0,obs=txt(r['Observação']),parc=txt(r['Parcelamento']);
      if(cat==='Mensalidade'&&seg&&v27){const first=parseMoneyPart(parc,'1ª parcela');const a=parseMoneyPart(parc,'Plano A: 12 x');const b=parseMoneyPart(parc,'Plano B: 11 x');const late26=parseMoneyPart(obs,'Após vencimento 2026:');db.tuition[seg]={rate,annuity:v27,first,planA:a||Math.max(0,v27-first)/12,planB:b||Math.max(0,v27-first)/11,saved:true,savedAt:'Planilha oficial',base26:v26,late26};count++;return}
      if(['Material Didático','Materiais / Livros'].includes(cat)){const lid=findMaterialId(seg,prod);if(lid&&v27){db.records[lid]={rate,v27,saved:true,savedAt:'Planilha oficial',category:'Materiais / Livros',segment:seg,item:prod,detail:txt(r['Descrição']),v26};count++}return}
      if(cat==='Fardamento'){const fid=findUniformId(seg,prod);if(fid&&v27){db.records[fid]={rate,v27,saved:true,savedAt:'Planilha oficial',category:'Fardamento',segment:seg,item:prod,detail:txt(r['Descrição']),v26};count++}return}
      if(cat==='STI / Tempo Integral'&&id&&v27){db.records[id]={rate,v27,saved:true,savedAt:'Planilha oficial',category:'STI / Tempo Integral',segment:seg,item:prod,detail:txt(r['Descrição']),v26};count++}
    });
    write(FECH_KEY,db);return count
  }
  function hydrateAlunos(rows){
    const local=read(ALUNOS_KEY),st=read(STATE_KEY);st.studentGoals=st.studentGoals||{};let count=0;
    rows.forEach(r=>{const serie=txt(r['Série/Turma']||r['Serie/Turma']||r['Série']||r['Serie']),seg=txt(r['Segmento']),v=Number(r['Oficial 2027'])||0;if(!serie||!v)return;local[serie]={valor:Math.round(v),saved:true,savedAt:txt(r['Salvo em'])||'Planilha oficial',segmento:seg,base26:Number(r['Alunos 2026'])||0,projecao:Number(r['Projeção 2027'])||0};st.studentGoals[serie]=Math.round(v);count++});
    write(ALUNOS_KEY,local);write(STATE_KEY,st);try{if(window.state){window.state.studentGoals=Object.assign(window.state.studentGoals||{},st.studentGoals)}}catch(e){}return count
  }
  function applyRatesFromCloud(){try{const d=read(FECH_KEY);if(window.state){window.state.tuitionRates=window.state.tuitionRates||{};Object.entries(d.tuition||{}).forEach(([seg,r])=>{if(r.saved)window.state.tuitionRates[seg]=Number(r.rate)||0});window.state.materialRates=window.state.materialRates||{};Object.values(d.records||{}).forEach(r=>{if(r.saved&&r.category==='Materiais / Livros'&&r.segment)window.state.materialRates[r.segment]=Number(r.rate)||0});write(STATE_KEY,window.state)}}catch(e){}}
  function refreshUI(){try{if(typeof window.renderAll==='function')window.renderAll()}catch(e){}setTimeout(()=>{try{document.querySelector('#nav button.active')?.click()}catch(e){}},100)}
  async function hydrateCloud(silent=false){
    if(!navigator.onLine){if(!silent)toast('Sem internet. Mantendo os últimos dados deste aparelho.','warn');return false}
    if(!silent)toast('☁️ Carregando dados oficiais da planilha...','wait');
    try{
      const [products,alunos]=await Promise.all([getRows('Produtos 2027'),getRows('Alunos 2027')]);
      const a=hydrateProducts(products),b=hydrateAlunos(alunos);applyRatesFromCloud();refreshUI();
      localStorage.setItem('cora2027_cloud_last_sync',new Date().toISOString());
      if(!silent)toast(`✅ Dados oficiais carregados: ${a+b} registros.`);return true;
    }catch(e){console.warn('Falha na sincronização de entrada',e);if(!silent)toast('Não foi possível consultar a planilha agora. Mantendo dados locais.','warn');return false}
  }

  function addButtons(){
    const f=document.getElementById('fechamento2027');if(f&&!document.getElementById('syncSheetClosing')){const actions=f.querySelector('.adj-actions');if(actions){const b=document.createElement('button');b.id='syncSheetClosing';b.textContent='☁️ Sincronizar planilha';b.onclick=syncFechamento;actions.appendChild(b)}}
    if(f&&!document.getElementById('pullSheetClosing')){const actions=f.querySelector('.adj-actions');if(actions){const b=document.createElement('button');b.id='pullSheetClosing';b.textContent='🔄 Atualizar da nuvem';b.onclick=()=>hydrateCloud(false);actions.appendChild(b)}}
    const l=document.getElementById('listasMaterial2027');if(l&&!document.getElementById('syncSheetList')){const actions=l.querySelector('.lm-actions');if(actions){const b=document.createElement('button');b.id='syncSheetList';b.textContent='☁️ Salvar também na planilha';b.onclick=()=>syncLista(document.getElementById('lmTurma')?.value||l.dataset.turma);actions.appendChild(b)}}
  }
  function style(){if(document.getElementById('sheet-sync-style'))return;const s=document.createElement('style');s.id='sheet-sync-style';s.textContent=`.sheet-sync-toast{position:fixed;right:18px;bottom:18px;z-index:99999;max-width:420px;padding:13px 16px;border-radius:12px;background:#168047;color:#fff;font-weight:800;box-shadow:0 10px 28px #0003;display:none}.sheet-sync-toast.warn{background:#a86b00}.sheet-sync-toast.wait{background:#1767b0}#syncSheetClosing,#syncSheetList,#pullSheetClosing{background:#168047!important;color:#fff!important;border:0!important;border-radius:11px!important;padding:11px 14px!important;font-weight:900!important;cursor:pointer!important}#pullSheetClosing{background:#1767b0!important}`;document.head.appendChild(s)}
  document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.id==='lmSave')setTimeout(()=>syncLista(document.getElementById('lmTurma')?.value||document.getElementById('listasMaterial2027')?.dataset.turma,true).then(n=>n&&toast('☁️ Lista salva também na planilha oficial.')),450);if(b.matches('.tu-save,.adj-save-row,[data-save-cat],#adjSaveAll,#saveAllTuition,.sti-save-row,#saveAllSti'))setTimeout(()=>syncFechamento(true).then(n=>n&&toast('☁️ Alterações salvas também na planilha oficial.')),450)},true);
  function init(){style();addButtons();new MutationObserver(addButtons).observe(document.body,{childList:true,subtree:true});window.CoraGestaoSync={syncFechamento,syncLista,syncTudo,hydrateCloud,api:API};setTimeout(()=>hydrateCloud(true),350)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();