(function(){
  'use strict';
  if(window.__CORA_SYNC_PUBLICACAO_V64__) return;
  window.__CORA_SYNC_PUBLICACAO_V64__=true;

  const nativeFetch=window.fetch.bind(window);
  const stamp=()=>new Date().toLocaleString('pt-BR',{timeZone:'America/Fortaleza'});
  const txt=v=>String(v==null?'':v).trim();
  const toNumber=v=>{
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    let s=txt(v).replace(/R\$/gi,'').replace(/\s/g,'');
    if(!s) return 0;
    if(s.includes(',')&&s.includes('.')) s=s.replace(/\./g,'').replace(',','.');
    else if(s.includes(',')) s=s.replace(/\./g,'').replace(',','.');
    return Number(s)||0;
  };
  function firstFromParcelamento(v){
    const s=txt(v);
    const m=s.match(/(?:1ª|1a|primeira)\s*parcela\s*R?\$?\s*([0-9.,]+)/i)||s.match(/entrada\s*R?\$?\s*([0-9.,]+)/i);
    return m?toNumber(m[1]):0;
  }
  function prepare(payload){
    if(!payload||payload.action!=='salvarRegistro'||payload.aba!=='Produtos 2027'||!payload.data) return payload;
    const d={...payload.data};
    d['Status']='APROVADO';
    d['Aprovado em']=d['Aprovado em']||stamp();
    d['Publicado no Cora Família']='SIM';
    d['Publicado em']=d['Publicado em']||stamp();
    const categoria=txt(d['Categoria']).toLowerCase();
    if(categoria.includes('mensal')){
      const direct=toNumber(d['1ª Parcela']||d['Primeira Parcela']||d['Entrada']);
      const first=direct||firstFromParcelamento(d['Parcelamento']);
      if(first>0){
        d['1ª Parcela']=first;
        d['Primeira Parcela']=first;
      }
    }
    return {...payload,data:d};
  }

  window.fetch=function(input,init){
    try{
      const method=String(init&&init.method||'GET').toUpperCase();
      if(method==='POST'&&init&&typeof init.body==='string'){
        const p=JSON.parse(init.body);
        const fixed=prepare(p);
        if(fixed!==p||fixed?.data!==p?.data){
          init={...init,body:JSON.stringify(fixed)};
        }
      }
    }catch(e){console.warn('Cora Gestão: não foi possível preparar publicação.',e)}
    return nativeFetch(input,init);
  };

  async function republish(){
    try{
      if(window.CoraGestaoSync&&typeof window.CoraGestaoSync.syncFechamento==='function'){
        await window.CoraGestaoSync.syncFechamento(true);
        console.info('Cora Gestão: fechamento 2027 republicado com status autorizado.');
      }
    }catch(e){console.warn('Cora Gestão: falha ao republicar fechamento.',e)}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(republish,900));
  else setTimeout(republish,900);

  window.CoraGestaoPublicacaoV64={prepare,republish,version:'64'};
})();