/* Painel de indicadores agregados da Equipe Pedagógica. */
(() => {
 'use strict';
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=n=>Number(n||0).toLocaleString('pt-BR');
 const icon=name=>'<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+({
  teacher:'<path d="m2 9 10-5 10 5-10 5-10-5Z"/><path d="M6 11v6c3.4 3 8.6 3 12 0v-6M22 9v7"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 1-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
  chart:'<path d="M4 20h16M6 16v-5m6 5V5m6 11V9"/>'
 }[name]||'')+'</svg>';
 const card=(name,value,detail,shape)=>'<article class="cp-team-metric"><span class="cp-team-metric-icon">'+icon(shape)+'</span><strong>'+safe(value)+'</strong><span>'+safe(name)+'</span><small>'+safe(detail)+'</small></article>';
 const colors={Ativo:'active',Pendente:'pending',Suspenso:'suspended',Desativado:'disabled',Professores:'teacher',Coordenação:'coord',Funcionários:'staff',Outros:'other'};
 const chart=(heading,data,total)=>'<div class="cp-team-chart"><h3>'+safe(heading)+'</h3>'+data.map(d=>{
  const count=Math.max(0,Number(d.count)||0),pct=total?Math.min(100,Math.round(100*count/total)):0;
  return '<div class="cp-team-chart-label"><span>'+safe(d.label==='Pendente'?'Aguardando ativação':d.label)+'</span><b>'+number(count)+'</b></div>'+
   '<div class="cp-team-chart-track" role="img" aria-label="'+safe(d.label)+': '+number(count)+' de '+number(total)+'"><span class="cp-team-chart-fill is-'+(colors[d.label]||'other')+'" style="width:'+pct+'%"></span></div>';
 }).join('')+'</div>';
 function render(data){
  if(!data||!Number.isSafeInteger(data.total)||data.total<0)return '<section class="cp-team-metrics"><p class="cp-muted">Não foi possível consultar os indicadores.</p></section>';
  const total=data.total, tracked=Math.max(0,Number(data.trackedAccounts)||0);
  return '<section class="cp-team-metrics" aria-label="Dashboard da Equipe Pedagógica">'+
   '<div class="cp-team-metrics-title"><div><small>COLÉGIO CORA CORALINA · EQUIPE PEDAGÓGICA</small><h2>Equipe em números</h2><p>Indicadores gerais de cadastros e acessos.</p></div>'+
   '<button id="cpUpdateTeamStats" type="button" class="cp-team-metrics-update" title="Atualizar dados da equipe">'+icon('chart')+'<span>Atualizar</span></button></div>'+
   '<div class="cp-team-metrics-grid">'+
    card('Professores cadastrados',number(data.teachers),'Função Professor','teacher')+
    card('Colaboradores cadastrados',number(total),'Todos os perfis','users')+
    card('Contas ativas',number(data.active),'Acessos individuais ativos','check')+
    card('Aguardando ativação',number(data.pending),'Convites pendentes','clock')+
    card('Acessos monitorados',data.monitoredLogins===null?'—':number(data.monitoredLogins),tracked<total?'Histórico parcial: '+tracked+' de '+total+' contas':'Total de logins registrados','chart')+
   '</div>'+
   '<div class="cp-team-charts">'+chart('Situação das contas',Array.isArray(data.statuses)?data.statuses:[],total)+chart('Equipe por função',Array.isArray(data.profiles)?data.profiles:[],total)+'</div>'+
   '<p class="cp-team-metrics-foot">Dados agregados de todos os anos letivos. Acessos representam logins monitorados, não visitantes únicos. Nomes, e-mails e históricos individuais permanecem restritos à Gestão.</p>'+
   '</section>';
 }
 window.CoraTeamStats={render};
})();