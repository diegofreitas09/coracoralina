(function(){
  const KEY='cora2027_listas_material_v1';
  async function carregarBase(){
    try{
      const r=await fetch('./listas-material-2027.js?base=54',{cache:'no-store'});
      const txt=await r.text();
      const ini=txt.indexOf('const base=');
      const fim=txt.indexOf('\n\n  let db=',ini);
      if(ini<0||fim<0) return null;
      const literal=txt.slice(ini+'const base='.length,fim).trim().replace(/;$/,'');
      return Function('"use strict";return ('+literal+');')();
    }catch(e){console.error('Falha ao carregar base das listas',e);return null}
  }
  async function init(){
    const base=await carregarBase();
    if(!base||!Object.keys(base).length)return;
    let atual={};try{atual=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){}
    let mudou=false;
    for(const [turma,dados] of Object.entries(base)){
      if(!atual[turma]){atual[turma]=dados;mudou=true}
    }
    if(mudou||!localStorage.getItem(KEY)) localStorage.setItem(KEY,JSON.stringify(atual));
    window.CORA_LISTAS_MATERIAL_BASE=base;
    window.dispatchEvent(new CustomEvent('cora:listas-base-prontas',{detail:{total:Object.keys(base).length}}));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();