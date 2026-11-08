/* Calendário Cora | Verificação preventiva, sem automatizar aprovação jurídica.
 * Dados locais da Gestão não são publicados na Equipe automaticamente.
 */
(()=>{
 "use strict";
 const SCOPE="cora_conformidade_legal_";
 const LEVELS=[
  {id:"infantil",name:"Educação Infantil",days:200,hours:800},
  {id:"fundamental",name:"Ensino Fundamental",days:200,hours:800},
  {id:"medio",name:"Ensino Médio",days:200,hours:1000}
 ];
 const ESC=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const key=y=>SCOPE+y+"_v1";
 const read=(k,fallback)=>{try{const x=JSON.parse(localStorage.getItem(k)||"null");return x&&typeof x==="object"?x:fallback}catch{return fallback}};
 const today=()=>new Date().toISOString().slice(0,10);
 const defaultConfig=year=>({year,levels:{},reviewedSaturdays:{},cctReference:"",cctValidUntil:"",updatedAt:""});
 function getConfig(y){
  const raw=read(key(y),defaultConfig(y));
  return raw.year===y?{...defaultConfig(y),...raw,levels:raw.levels||{},reviewedSaturdays:raw.reviewedSaturdays||{}}:defaultConfig(y);
 }
 const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||""))&&!Number.isNaN(new Date(s+"T12:00:00Z").valueOf());
 function readEvents(year){
  const list=read("cora_calendario_eventos_"+year+"_v1",[]);
  return Array.isArray(list)?list.filter(e=>e&&validDate(e.date)&&e.date.startsWith(year+"-")):[];
 }
 function stages(year){
  const raw=window.CoraStages?.get?.(year);
  return Array.isArray(raw)?raw.filter(s=>validDate(s.start)&&validDate(s.end)&&s.start<=s.end&&s.needsReview!==true):[];
 }
 function probableDates(year,holidays){
  const result=new Set();
  for(const st of stages(year)){
   const start=new Date(st.start+"T12:00:00Z"),end=new Date(st.end+"T12:00:00Z");
   for(let d=new Date(start);d<=end;d.setUTCDate(d.getUTCDate()+1)){
    const dow=d.getUTCDay();
    if(dow>0&&dow<6)result.add(d.toISOString().slice(0,10));
   }
  }
  for(const r of holidays.list){
   const d=holidays.decisions[r.id];
   if(d?.status==="sem")result.delete(r.date);
   if(d?.status==="antecipado"&&validDate(d.movedTo))result.delete(d.movedTo);
  }
  return result.size;
 }
 function holidayInfo(year){
  const conf=window.CoraHolidays?.config?.(year);
  if(!conf||!window.CoraHolidays?.officialList)return {list:[],decisions:{},pending:0,city:""};
  const list=window.CoraHolidays.officialList(year,conf.uf||"CE",conf.city||"");
  const decisions=conf.decisions||{};
  const pending=list.filter(e=>e.verified===true&&!["sem","com","antecipado","manter"].includes(decisions[e.id]?.status)).length;
  return {list,decisions,pending,city:conf.city||""};
 }
 const isSaturday=e=>new Date(e.date+"T12:00:00Z").getUTCDay()===6;
 function compute(year,config){
  const hol=holidayInfo(year),events=readEvents(year);
  const saturdays=events.filter(isSaturday).filter(e=>e.status!=="Em revisão"&&e.needsReview!==true).sort((a,b)=>a.date.localeCompare(b.date));
  const unreviewed=saturdays.filter(e=>!config.reviewedSaturdays[String(e.id||e.date+"|"+e.title)]);
  const count=stages(year).length?probableDates(year,hol):null;
  const cctCurrent=Boolean(config.cctReference.trim()&&validDate(config.cctValidUntil)&&config.cctValidUntil>=year+"-12-31");
  const segmentIssues=LEVELS.filter(l=>{const x=config.levels[l.id]||{};return Number.isFinite(Number(x.days))&&String(x.days??"").trim()!==""&&Number(x.days)<l.days||Number.isFinite(Number(x.hours))&&String(x.hours??"").trim()!==""&&Number(x.hours)<l.hours});
  return {hol,events,saturdays,unreviewed,count,cctCurrent,segmentIssues};
 }
 function mount({host,getYear}={}){
  if(!host||host.querySelector("#cpLegalCompliance"))return;
  const anchor=host.querySelector(".cp-manager-bar");
  if(!anchor)return;
  anchor.insertAdjacentHTML("afterend",
   '<section id="cpLegalCompliance" class="cp-legal-wrap" aria-label="Conformidade legal e pedagógica">'+
   '<details id="cpLegalDetails" class="cp-legal-details">'+
   '<summary><span class="cp-legal-symbol" aria-hidden="true">⚖</span><span><strong>Conformidade legal e pedagógica</strong><small id="cpLegalHeadline">Verificando calendário, jornadas e feriados...</small></span><span class="cp-legal-open">Analisar ▾</span></summary>'+
   '<div class="cp-legal-content"><p class="cp-legal-lead">Conferência preventiva. Os números abaixo não aprovam o calendário automaticamente e não substituem a análise da assessoria jurídica, do RH ou do sistema de ensino.</p>'+
   '<div id="cpLegalAlerts" class="cp-legal-alerts" role="status" aria-live="polite"></div>'+
   '<div id="cpLegalMetrics" class="cp-legal-metrics"></div>'+
   '<h3>Dias e horas de efetivo trabalho escolar</h3>'+
   '<p class="cp-legal-hint">Informe os totais apurados e documentados por segmento. Eventos, feriados e dias úteis estimados não comprovam, sozinhos, os requisitos legais.</p>'+
   '<form id="cpLegalForm"><div id="cpLegalLevels" class="cp-legal-levels"></div>'+
   '<div class="cp-legal-cct"><h3>Convenção coletiva aplicável</h3>'+
   '<p>Referência conhecida dos professores da educação básica no Ceará: CE000749/2026, vigente de 01/03/2026 a 28/02/2027. Para períodos posteriores, informe o instrumento efetivamente aplicável após conferência do RH/jurídico.</p>'+
   '<div class="cp-legal-fields"><label>Registro da nova CCT (se houver)<input name="cctReference" maxlength="100" placeholder="Ex.: CE000000/2027"></label>'+
   '<label>Vigência até<input name="cctValidUntil" type="date"></label></div></div>'+
   '<div class="cp-legal-actions"><button type="submit" class="cp-btn">Salvar conferência local</button><span id="cpLegalSaveStatus" role="status"></span></div></form>'+
   '<h3>Sábados com eventos cadastrados</h3><p class="cp-legal-hint">A existência de atividade no sábado não comprova nem autoriza a jornada do professor. Verifique quem foi convocado, os dois dias de descanso e as condições do instrumento coletivo. Marcar como conferido registra apenas que a gestão analisou o alerta.</p>'+
   '<div id="cpLegalSaturdays"></div>'+
   '<div class="cp-legal-sources"><strong>Fontes oficiais para conferência:</strong> '+
   '<a target="_blank" rel="noopener noreferrer" href="https://www2.camara.leg.br/legin/fed/emecon/2026/emendaconstitucional-141-16-outubro-2026-800062-publicacaooriginal-181622-pl.html">EC 141/2026</a> · '+
   '<a target="_blank" rel="noopener noreferrer" href="https://www.planalto.gov.br/ccivil_03/leis/l9394.htm">LDB</a> · '+
   '<a target="_blank" rel="noopener noreferrer" href="https://mediador.trabalho.gov.br/">MTE Mediador</a></div>'+
   '</div></details></section>');
  const el=host.querySelector("#cpLegalCompliance");
  const $=q=>el.querySelector(q);
  const year=()=>Number(getYear?.()||window.CoraYears?.activeYear||2026);
  let editing=false;
  function render(){
   if(!el.isConnected||editing)return;
   const y=year(),c=getConfig(y),v=compute(y,c);
   const headline=[];
   if(!v.cctCurrent&&y>=2027)headline.push("CCT pendente para "+y);
   if(v.unreviewed.length)headline.push(v.unreviewed.length+" sábado(s) a conferir");
   if(v.hol.pending)headline.push(v.hol.pending+" feriado(s) sem decisão");
   if(!v.hol.city)headline.push("município não definido");
   $("#cpLegalHeadline").textContent="Ano "+y+" · "+(headline.join(" · ")||"sem pendências automáticas identificadas");
   const alerts=[];
   if(y>=2027&&!v.cctCurrent)alerts.push(["warn","Convenção coletiva de "+y+" não validada","O instrumento CE000749/2026 termina em 28/02/2027. Confira a CCT nova e suas cláusulas, especialmente sobre férias, recesso e trabalho aos sábados."]);
   if(y>=2027)alerts.push(["note","Escala 5×2 e transição","A EC 141/2026 estabelece dois repousos remunerados por semana. O limite geral é de 42 horas após 15/12/2026, reduzindo-se para 40 horas em dezembro de 2027; exceções dependem das regras aplicáveis."]);
   if(v.unreviewed.length)alerts.push(["warn","Análise de sábados pendente",v.unreviewed.length+" evento(s) de sábado exigem conferência da jornada e da convocação."]);
   if(!v.hol.city)alerts.push(["warn","Falta selecionar o município","Selecione o município no Gestor de Feriados. Sem ele, a conferência dos feriados locais está incompleta."]);
   if(v.hol.pending)alerts.push(["warn","Decisões sobre feriados",v.hol.pending+" data(s) oficiais ainda não têm decisão administrativa registrada. A decisão precisa respeitar a legislação aplicável."]);
   if(v.segmentIssues.length)alerts.push(["warn","Meta anual insuficiente nos dados informados","Verifique os valores cadastrados para: "+v.segmentIssues.map(x=>x.name).join(", ")+"."]);
   if(y===2027)alerts.push(["note","Calendário 2027 · Copa Feminina","O torneio acontecerá de 24/06 a 25/07/2027. Acompanhe as orientações do sistema de ensino; não há suspensão automática de aulas para todo o período."]);
   $("#cpLegalAlerts").innerHTML=alerts.map(a=>'<article class="cp-legal-alert '+a[0]+'"><strong>'+ESC(a[1])+'</strong><p>'+ESC(a[2])+'</p></article>').join("");
   $("#cpLegalMetrics").innerHTML=[
    ["Dias úteis candidatos",v.count===null?"Não apurados":String(v.count),"Somente datas de seg. a sex. entre etapas confirmadas; não são dias letivos validados"],
    ["Sábados a conferir",String(v.unreviewed.length),"Eventos aprovados da Gestão em sábados"],
    ["Feriados sem decisão",String(v.hol.pending),"Datas oficiais na base; município: "+(v.hol.city||"não definido")]
   ].map(x=>'<div class="cp-legal-metric"><small>'+ESC(x[0])+'</small><strong>'+ESC(x[1])+'</strong><span>'+ESC(x[2])+'</span></div>').join("");
   $("#cpLegalLevels").innerHTML=LEVELS.map(l=>{
    const x=c.levels[l.id]||{};
    const check=(name,min)=>{const n=Number(x[name]);return x[name]!==undefined&&String(x[name])!==""&&(n<min?'<em>Déficit informado: '+ESC(String(min-n))+'</em>':'<span>Meta informada atingida; requer validação documental.</span>')};
    return '<fieldset><legend>'+ESC(l.name)+'</legend><label>Dias letivos apurados (mín. '+l.days+')<input type="number" min="0" max="366" name="'+l.id+'Days" value="'+ESC(x.days??"")+'" placeholder="Ainda não apurado"></label>'+
     '<label>Horas anuais apuradas (mín. '+l.hours+')<input type="number" min="0" max="3000" step="0.5" name="'+l.id+'Hours" value="'+ESC(x.hours??"")+'" placeholder="Ainda não apurado"></label><small>'+check("days",l.days)+" "+check("hours",l.hours)+'</small></fieldset>';
   }).join("");
   const f=$("#cpLegalForm");f.elements.cctReference.value=c.cctReference||"";f.elements.cctValidUntil.value=c.cctValidUntil||"";
   $("#cpLegalSaturdays").innerHTML=v.saturdays.length?v.saturdays.slice(0,40).map(e=>{
    const id=String(e.id||e.date+"|"+e.title),done=Boolean(c.reviewedSaturdays[id]);
    return '<div class="cp-legal-saturday"><div><strong>'+ESC(e.date.split("-").reverse().join("/"))+' · '+ESC(e.title||"Evento sem nome")+'</strong><small>'+(done?"Análise registrada pela Gestão":"Aguardando análise do RH / Gestão")+'</small></div><button type="button" class="cp-btn soft" data-legal-saturday="'+ESC(id)+'">'+(done?"Reabrir análise":"Registrar análise")+'</button></div>';
   }).join("")+(v.saturdays.length>40?'<p>Exibindo os primeiros 40 eventos. Há mais datas no calendário.</p>':""):'<p class="cp-legal-empty">Nenhum evento aprovado em sábado neste ano.</p>';
   $("#cpLegalSaveStatus").textContent=c.updatedAt?"Última conferência salva: "+new Date(c.updatedAt).toLocaleDateString("pt-BR"):"";
  }
  $("#cpLegalForm").addEventListener("submit",e=>{
   e.preventDefault();
   const y=year(),cfg=getConfig(y),f=e.currentTarget;
   for(const l of LEVELS){
    const days=f.elements[l.id+"Days"].value,hours=f.elements[l.id+"Hours"].value;
    if(days!==""&&(!Number.isInteger(Number(days))||Number(days)<0||Number(days)>366))return alert("Confira os dias de "+l.name);
    if(hours!==""&&(!Number.isFinite(Number(hours))||Number(hours)<0||Number(hours)>3000))return alert("Confira as horas de "+l.name);
    cfg.levels[l.id]={days:days===""?"":Number(days),hours:hours===""?"":Number(hours)};
   }
   cfg.cctReference=f.elements.cctReference.value.trim();
   cfg.cctValidUntil=f.elements.cctValidUntil.value;
   cfg.updatedAt=new Date().toISOString();
   try{localStorage.setItem(key(y),JSON.stringify(cfg));render()}catch{$("#cpLegalSaveStatus").textContent="Falha ao salvar no dispositivo."}
  });
  $("#cpLegalSaturdays").addEventListener("click",e=>{
   const button=e.target.closest("[data-legal-saturday]");if(!button)return;
   const y=year(),id=button.dataset.legalSaturday,c=getConfig(y),already=Boolean(c.reviewedSaturdays[id]);
   if(!already&&!confirm("Você verificou a jornada, os dois repousos e os requisitos aplicáveis para este evento? O registro não declara conformidade jurídica."))return;
   if(already)delete c.reviewedSaturdays[id];else c.reviewedSaturdays[id]={at:new Date().toISOString(),by:"Gestão"};
   c.updatedAt=new Date().toISOString();
   try{localStorage.setItem(key(y),JSON.stringify(c));render()}catch{alert("Não foi possível salvar a análise.")}
  });
  const rerender=()=>queueMicrotask(render);
  window.addEventListener("cora-year-changed",rerender);
  window.addEventListener("cora-events-updated",rerender);
  window.addEventListener("cora-data-changed",rerender);
  window.addEventListener("storage",rerender);
  host.addEventListener("change",e=>{if(!e.target.closest("#cpLegalCompliance"))setTimeout(render,50)});
  render();
  return {refresh:render};
 }
 window.CoraCompliance={mount,compute,readEvents,holidayInfo};
})();