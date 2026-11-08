/* SINEPE-CE 2027: referência editável, não uma aprovação automática de calendário.
 * PDF enviado à Gestão: "CALENDÁRIO ESCOLAR Atualizado Copa Feminina" (2026).
 * Não sobrescrever etapas já conferidas, nem publicar para a Equipe sem aprovação.
 */
(()=>{
 "use strict";
 const YEAR=2027;
 const SOURCE="Sugestão SINEPE-CE 2027 · Copa do Mundo Feminina";
 const STAGES=[
  {number:1,start:"2027-01-18",end:"2027-04-02",days:51,saturdays:3},
  {number:2,start:"2027-04-05",end:"2027-06-23",days:59,saturdays:3},
  {number:3,start:"2027-07-26",end:"2027-10-01",days:50,saturdays:2},
  {number:4,start:"2027-10-04",end:"2027-11-30",days:40,saturdays:2}
 ];
 const MILESTONES=[
  {date:"2027-06-24",title:"Início proposto das férias escolares — Copa Feminina 2027"},
  {date:"2027-07-25",title:"Término proposto das férias escolares — Copa Feminina 2027"},
  {date:"2027-07-26",title:"Retorno proposto às aulas — 3ª etapa de 2027"}
 ];
 const SAT_KEY="cora_sinepe2027_sabados_v1";
 const E_KEY="cora_calendario_eventos_2027_v1";
 const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const read=(key,fallback)=>{try{const x=JSON.parse(localStorage.getItem(key)||"null");return x===null?fallback:x}catch{return fallback}};
 const isoToBR=x=>String(x).slice(8,10)+"/"+String(x).slice(5,7)+"/"+String(x).slice(0,4);
 const saturdaysIn=st=>{
  const dates=[];
  for(let d=new Date(st.start+"T12:00:00Z");d<=new Date(st.end+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+1)){
   if(d.getUTCDay()===6)dates.push(d.toISOString().slice(0,10));
  }
  return dates;
 };
 const targets=()=>STAGES.map(x=>({...x,possibleSaturdays:saturdaysIn(x)}));
 function getSelections(){
  const raw=read(SAT_KEY,[]);
  const permitted=new Set(STAGES.flatMap(s=>saturdaysIn(s)));
  return new Set(Array.isArray(raw)?raw.filter(x=>permitted.has(x)):[]);
 }
 function compare(){
  const existing=window.CoraStages?.get?.(YEAR)||[];
  return STAGES.map((s,i)=>{
   const e=existing[i]||{};
   const exact=e.start===s.start&&e.end===s.end;
   const protectedStage=Boolean(e.start&&e.end&&!e.needsReview);
   const action=exact?"igual":protectedStage?"validada":"sugestao";
   return {...s,current:e,action};
  });
 }
 function addDrafts(items){
  const original=read(E_KEY,[]);
  if(!Array.isArray(original))throw new Error("Os registros locais de 2027 estão inválidos. Restaure o backup antes de importar.");
  const current=original.filter(x=>x&&String(x.date||"").startsWith("2027-"));
  const created=[];
  for(const a of items){
   if(current.some(e=>String(e.id)===a.id||e.date===a.date&&String(e.title||"").trim().toLowerCase()===a.title.toLowerCase()))continue;
   created.push({...a,type:"Pedagógico",status:"Em revisão",needsReview:true,
    source:SOURCE,notes:"Modelo SINEPE-CE 2027: sugestão sujeita à aprovação da Gestão e conferência da CCT, escala 5×2 e legislação local. Não publicar automaticamente.",
    createdAt:new Date().toISOString()});
  }
  if(created.length){
   localStorage.setItem(E_KEY,JSON.stringify([...original,...created]));
   window.dispatchEvent(new CustomEvent("cora-events-updated",{detail:{year:YEAR,source:"sinepe-2027"}}));
   window.dispatchEvent(new CustomEvent("cora-data-changed",{detail:{year:YEAR}}));
  }
  return created.length;
 }
 function mount({host,getYear}={}){
  if(!host||host.querySelector("#cpSinepe27"))return;
  const anchor=host.querySelector("#cpLegalCompliance")||host.querySelector(".cp-manager-bar");
  if(!anchor)return;
  anchor.insertAdjacentHTML("afterend",
   '<section id="cpSinepe27" class="cp-sinepe27" aria-label="Modelo escolar 2027 SINEPE CE" hidden>'+
   '<details><summary><span class="cp-sinepe-symbol">2027</span><span><strong>Modelo SINEPE-CE · Copa Feminina</strong><small>200 dias · 10 sábados planejados · 4 etapas para revisão</small></span><span>Consultar ▾</span></summary>'+
   '<div class="cp-sinepe-body"><p class="cp-sinepe-intro">Referência do PDF enviado à Gestão. Sugestão aprovada na assembleia do sindicato em 25/05/2026 e ajustada à Lei 15.421/2026. Não substitui decisões da escola ou atos do sistema de ensino.</p>'+
   '<div class="cp-sinepe-kpis"><div><strong>110</strong><small>1º semestre</small></div><div><strong>90</strong><small>2º semestre</small></div><div><strong>10</strong><small>Sábados no modelo</small></div><div><strong>24/06–25/07</strong><small>Copa / período proposto de férias</small></div></div>'+
   '<h3>Comparação das etapas propostas com a Gestão</h3><div class="cp-sinepe-table-wrap"><table><thead><tr><th>Etapa</th><th>Período</th><th>Dias</th><th>Sábados</th><th>Na Gestão</th></tr></thead><tbody id="cpSinepeRows"></tbody></table></div>'+
   '<div class="cp-sinepe-actions"><button type="button" class="cp-btn" id="cpSinepeStages">Aplicar etapas como sugestões</button><button type="button" class="cp-btn soft" id="cpSinepeRecess">Inserir marcos da Copa em revisão</button></div>'+
   '<p id="cpSinepeStatus" role="status" aria-live="polite"></p>'+
   '<h3>Planejador de sábados letivos</h3><p class="cp-sinepe-hint">O PDF estabelece <b>3 + 3 + 2 + 2 sábados</b> por etapa, mas não fixa todas as datas. Selecione os sábados da escola. Eles serão guardados como planejamento local, e qualquer evento gerado continuará <b>em revisão</b>, sem convocação automática de professores.</p>'+
   '<div id="cpSinepeSatGroups" class="cp-sinepe-saturdays"></div>'+
   '<p id="cpSinepeSatCount" class="cp-sinepe-hint" role="status"></p>'+
   '<div class="cp-sinepe-actions"><button type="button" class="cp-btn soft" id="cpSinepeSaveSats">Salvar sábados selecionados</button><button type="button" class="cp-btn" id="cpSinepeDraftSats">Criar eventos de sábado para revisão</button></div>'+
   '<p class="cp-sinepe-note"><b>Atenção jurídica:</b> 19/03 (São José) é feriado <b>municipal em Fortaleza</b>, não estadual, conforme Lei municipal 8.796/2003. Carnaval, Cinzas e as datas exclusivas de descanso docente precisam de tratamento próprio. Use o Gestor de Feriados para decidir cada município.</p>'+
   '<p class="cp-sinepe-note"><b>Vinculação à Equipe:</b> validar datas e publicação é obrigatório. Salvar este modelo não modifica jornadas docentes, não autoriza sábados nem publica novos eventos.</p>'+
   '<div class="cp-sinepe-links">Base legal: <a href="https://www2.camara.leg.br/legin/fed/lei/2026/lei-15421-1-junho-2026-799207-normaatualizada-pl.html" target="_blank" rel="noopener">Lei 15.421/2026</a> · <a href="https://agenciagov.ebc.com.br/noticias/202609/mec-homologa-parecer-sobre-ano-letivo-na-copa-feminina" target="_blank" rel="noopener">Parecer CNE/CEB 7/2026</a></div>'+
   '</div></details></section>');
  const element=host.querySelector("#cpSinepe27"),$=s=>element.querySelector(s);
  const year=()=>Number(getYear?.()||window.CoraYears?.activeYear||2026);
  function update(){
   if(!element.isConnected)return;
   element.hidden=year()!==YEAR;
   if(element.hidden)return;
   $("#cpSinepeRows").innerHTML=compare().map(e=>{
    const text=e.action==="igual"?"Período coincide":e.action==="validada"?"Data validada diferente — preservar":"Vazio / importado em revisão";
    return '<tr><th>'+e.number+'ª</th><td>'+isoToBR(e.start)+' a '+isoToBR(e.end)+'</td><td>'+e.days+'</td><td>'+e.saturdays+'</td><td>'+esc(text)+'</td></tr>';
   }).join("");
   const selected=getSelections();
   const groups=targets();
   $("#cpSinepeSatGroups").innerHTML=groups.map(st=>{
    const count=st.possibleSaturdays.filter(x=>selected.has(x)).length;
    return '<fieldset class="cp-sinepe-stage"><legend>'+st.number+'ª etapa <small>'+count+'/'+st.saturdays+' selecionados</small></legend>'+
     '<div class="cp-sinepe-day-grid">'+st.possibleSaturdays.map(date=>'<label><input type="checkbox" data-cp-saturday="'+date+'" data-stage="'+st.number+'" '+(selected.has(date)?"checked":"")+'><span>'+isoToBR(date).slice(0,5)+'</span></label>').join("")+'</div></fieldset>';
   }).join("");
   refreshCount();
  }
  function selectedFromForm(){
   return new Set([...element.querySelectorAll("[data-cp-saturday]:checked")].map(i=>i.dataset.cpSaturday));
  }
  function refreshCount(){
   const chosen=selectedFromForm();
   const parts=STAGES.map(st=>saturdaysIn(st).filter(d=>chosen.has(d)).length);
   const n=parts.reduce((a,b)=>a+b,0);
   const correct=parts.every((x,i)=>x===STAGES[i].saturdays);
   $("#cpSinepeSatCount").textContent=n+"/10 selecionados · distribuição "+parts.join(" + ")+(correct?" · corresponde ao modelo SINEPE. Ainda exige avaliação trabalhista.":" · distribuição diferente ou incompleta; revisar.");
   $("#cpSinepeDraftSats").disabled=n===0;
  }
  element.addEventListener("change",e=>{
   if(!e.target.matches("[data-cp-saturday]"))return;
   const chosen=selectedFromForm();
   const st=STAGES[Number(e.target.dataset.stage)-1];
   const count=saturdaysIn(st).filter(d=>chosen.has(d)).length;
   if(count>st.saturdays){e.target.checked=false;alert("A "+st.number+"ª etapa prevê "+st.saturdays+" sábados na proposta. Ajuste a seleção.");}
   refreshCount();
  });
  $("#cpSinepeSaveSats").addEventListener("click",()=>{
   try{localStorage.setItem(SAT_KEY,JSON.stringify([...selectedFromForm()].sort()));$("#cpSinepeStatus").textContent="Seleção de sábados salva apenas neste aparelho. Ainda não existem convocações."}catch{$("#cpSinepeStatus").textContent="Falha ao salvar. Faça o backup."}
   update();
  });
  $("#cpSinepeStages").addEventListener("click",()=>{
   if(year()!==YEAR)return;
   const original=window.CoraStages?.get?.(YEAR);
   if(!Array.isArray(original)||original.length!==4){$("#cpSinepeStatus").textContent="Não foi possível ler o cadastro das etapas.";return}
   const changes=compare().filter(x=>x.action==="sugestao");
   if(!changes.length){$("#cpSinepeStatus").textContent="Todas as etapas já estão preenchidas ou validadas. Nenhuma data alterada.";return}
   if(!confirm("Aplicar as "+changes.length+" etapas ainda vazias ou em revisão como sugestão SINEPE 2027? Etapas já validadas serão preservadas. A publicação continua manual."))return;
   const updated=original.map((e,i)=>{
    const source=STAGES[i],choice=changes.some(x=>x.number===source.number);
    return choice?{number:source.number,start:source.start,end:source.end,needsReview:true,originYear:2027}:e;
   });
   const r=window.CoraStages.save(YEAR,updated);
   $("#cpSinepeStatus").textContent=r.ok?changes.length+" etapa(s) preenchida(s) em revisão. Confira e valide individualmente na Gestão.":r.message;
   update();
  });
  $("#cpSinepeRecess").addEventListener("click",()=>{
   if(!confirm("Inserir três marcos da Copa como eventos EM REVISÃO de 2027, sem publicação para os professores?"))return;
   try{
    const count=addDrafts(MILESTONES.map((e,i)=>({...e,id:"cora-sinepe-2027-copa-"+i})));
    $("#cpSinepeStatus").textContent=count+" marco(s) adicionado(s). Confira as datas antes de publicar; eventos existentes não foram sobrescritos.";
   }catch(error){$("#cpSinepeStatus").textContent=error.message}
  });
  $("#cpSinepeDraftSats").addEventListener("click",()=>{
   const chosen=[...selectedFromForm()].sort();
   if(!chosen.length)return;
   const distribution=STAGES.map(st=>saturdaysIn(st).filter(d=>chosen.includes(d)).length);
   if(!distribution.every((n,i)=>n===STAGES[i].saturdays)){
    alert("Para usar o modelo de 200 dias do SINEPE, selecione exatamente 3, 3, 2 e 2 sábados. Os sábados atuais ainda não totalizam o previsto.");return;
   }
   if(!confirm("Criar "+chosen.length+" eventos de sábado como RASCUNHOS, sujeitos à conferência da carga horária, CCT e jornada de cada professor?"))return;
   try{
    localStorage.setItem(SAT_KEY,JSON.stringify(chosen));
    const count=addDrafts(chosen.map(date=>({id:"cora-sinepe-2027-sabado-"+date,date,title:"Sábado letivo — programação a definir"})));
    $("#cpSinepeStatus").textContent=count+" sábado(s) inserido(s) em revisão; "+(chosen.length-count)+" já existente(s). Valide no calendário antes de publicar.";
   }catch(error){$("#cpSinepeStatus").textContent="Falha: "+error.message}
  });
  window.addEventListener("cora-year-changed",update);
  window.addEventListener("cora-stages-updated",update);
  window.addEventListener("storage",update);
  update();
  return {refresh:update};
 }
 window.CoraSinepe2027={mount,STAGES,targets,compare};
})();