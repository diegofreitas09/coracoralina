/* Revisão individual, por mês, dos eventos importados para anos letivos futuros.
 * Nunca aprova ou publica datas automaticamente. Exclusivo da tela Gestão.
 */
(()=>{
 'use strict';
 const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
 let activeReview=null;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const key=y=>'cora_calendario_eventos_'+y+'_v1';
 const pending=e=>e?.needsReview===true||e?.status==='Em revisão';
 const validDate=(s,y)=>{
  const v=String(s||'');
  if(!new RegExp('^'+y+'-\\d{2}-\\d{2}$').test(v))return false;
  const [year,month,day]=v.split('-').map(Number);
  const d=new Date(Date.UTC(year,month-1,day));
  return d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day;
 };
 function read(y){
  try{
   const items=JSON.parse(localStorage.getItem(key(y))||'[]');
   return Array.isArray(items)?items.filter(e=>e&&String(e.date||'').startsWith(y+'-')):[];
  }catch{return []}
 }
 const byMonth=(items,m)=>(items||[]).filter(e=>Number(String(e.date||'').slice(5,7))===m+1&&pending(e))
   .sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.title||'').localeCompare(String(b.title||''),'pt-BR'));
 function reviewChanges(items,changes,year){
  const byId=new Map(changes.map(c=>[String(c.id),c]));
  let count=0;
  const updated=items.map(e=>{
   const change=byId.get(String(e.id||''));
   if(!change)return e;
   if(!pending(e))throw Error('Um evento foi modificado em outra tela. Reabra a conferência.');
   if(!validDate(change.date,year))throw Error('Data inválida. Confira dia, mês e ano letivo.');
   if(change.originalDate!==e.date||change.originalTitle!==e.title)throw Error('Os dados foram alterados. Atualize a lista antes de salvar.');
   if(!String(e.title||'').trim())throw Error('Um evento está sem título e deve ser editado antes de aprovar.');
   count++;
   return {...e,date:change.date,status:'Publicado',needsReview:false,
    reviewedAt:new Date().toISOString(),reviewedBy:'Gestão'};
  });
  return {updated,count};
 }
 function mount({host,getYear,onChange,notify}={}){
  if(!host)return;
  let year=Number(getYear?.()||2026),month=0;
  let panel=host.querySelector('#cpYearReviewPanel');
  if(panel)return;
  host.insertAdjacentHTML('beforeend',
   '<details class="cp-year-review" id="cpYearReviewPanel">'+
    '<summary>Conferir atividades importadas e liberar para publicação <span id="cpYearReviewCount"></span></summary>'+
    '<p>A importação usa datas sugeridas. Confira cada atividade, marque a caixa ao lado e salve somente as datas verificadas. Esta ação <strong>não publica</strong> o calendário para os professores.</p>'+
    '<div class="cp-year-review-controls"><label for="cpYearReviewMonth">Mês para conferir</label>'+
    '<select id="cpYearReviewMonth">'+MONTHS.map((m,i)=>'<option value="'+i+'">'+m+'</option>').join('')+'</select>'+
    '<button type="button" id="cpYearReviewReload">Atualizar lista</button></div>'+
    '<form id="cpYearReviewForm"><div id="cpYearReviewRows"></div>'+
    '<div class="cp-year-review-actions"><button type="submit" class="cp-btn" id="cpYearReviewSave">Salvar somente as datas marcadas e conferidas</button>'+
    '<span id="cpYearReviewStatus" role="status" aria-live="polite"></span></div></form>'+
   '</details>');
  panel=host.querySelector('#cpYearReviewPanel');
  const $=q=>panel.querySelector(q);
  const rows=$('#cpYearReviewRows'),status=$('#cpYearReviewStatus');
  function paint(){
   year=Number(getYear?.()||year);
   const list=read(year),todo=list.filter(pending),subset=byMonth(list,month);
   $('#cpYearReviewCount').textContent=' · '+todo.length+' pendente(s) em '+year;
   $('#cpYearReviewForm').hidden=year<=2026;
   if(year<=2026){status.textContent='Selecione 2027 ou um ano posterior na Gestão.';rows.innerHTML='';return}
   if(!subset.length){
    rows.innerHTML='<p class="cp-year-review-empty">Nenhum evento em revisão em '+esc(MONTHS[month])+' de '+year+'.'+
     (todo.length?' Há outros meses com '+todo.length+' pendência(s).':' Para usar a estrutura do ano anterior, selecione “Importar estrutura do ano anterior”.')+'</p>';
    $('#cpYearReviewSave').disabled=true;
   }else{
    $('#cpYearReviewSave').disabled=false;
    rows.innerHTML=subset.map(e=>
     '<div class="cp-year-review-row" data-review-id="'+esc(e.id)+'" data-original-date="'+esc(e.date)+'" data-original-title="'+esc(e.title)+'">'+
      '<div class="cp-year-review-event"><strong>'+esc(e.title)+'</strong><small>'+esc(e.type||'Atividade')+
      ' · '+esc(e.source||'Importado para revisão')+'</small></div>'+
      '<label>Data para '+year+'<input type="date" class="cp-year-review-date" min="'+year+'-01-01" max="'+year+'-12-31" value="'+esc(e.date)+'" required></label>'+
      '<label class="cp-year-review-confirm"><input type="checkbox" class="cp-year-review-mark"> Conferi esta data e o evento</label>'+
     '</div>').join('');
   }
   status.textContent=todo.length?todo.length+' evento(s) aguardando conferência em '+year+'.':'Todos os eventos importados deste aparelho foram conferidos. Use “Publicar '+year+' para equipe” na Gestão.';
  }
  $('#cpYearReviewMonth').addEventListener('change',e=>{month=Number(e.target.value)||0;paint()});
  $('#cpYearReviewReload').addEventListener('click',paint);
  $('#cpYearReviewForm').addEventListener('submit',e=>{
   e.preventDefault();
   if(year!==Number(getYear?.()||0)){status.textContent='O ano mudou. Atualize a conferência.';paint();return}
   const selected=[...rows.querySelectorAll('.cp-year-review-row')]
    .filter(row=>row.querySelector('.cp-year-review-mark')?.checked);
   if(!selected.length){status.textContent='Marque somente os eventos cuja data você conferiu.';return}
   const changes=selected.map(row=>({
    id:row.dataset.reviewId,date:row.querySelector('.cp-year-review-date')?.value,
    originalDate:row.dataset.originalDate,originalTitle:row.dataset.originalTitle
   }));
   try{
    // Releitura no momento de salvar para não substituir alterações posteriores.
    const stored=localStorage.getItem(key(year))||'[]',records=JSON.parse(stored);
    if(!Array.isArray(records))throw Error('Não foi possível conferir a lista de eventos.');
    const {updated,count}=reviewChanges(records,changes,year);
    if(count!==selected.length)throw Error('Alguns eventos não foram encontrados. Atualize a lista.');
    localStorage.setItem(key(year),JSON.stringify(updated));
    status.textContent='✓ '+count+' evento(s) revisados e aprovados na Gestão. Falta publicar para a Equipe.';
    notify?.('✓ '+count+' atividade(s) conferidas. Publique '+year+' para aparecerem no aplicativo do professor.');
    window.dispatchEvent(new CustomEvent('cora-data-changed',{detail:{year,month}}));
    onChange?.(year);
    paint();
   }catch(err){status.textContent='Não foi possível salvar: '+(err.message||'Erro desconhecido')}
  });
  const onEvent=e=>{if(Number(e.detail?.year)===year&&panel.open)paint()};
  window.addEventListener('cora-year-changed',()=>{year=Number(getYear?.()||2026);paint()});
  window.addEventListener('cora-data-changed',onEvent);
  const controller={refresh:paint,open(m){
   if(Number.isInteger(m)&&m>=0&&m<12){month=m;$('#cpYearReviewMonth').value=String(m)}
   host.open=true;panel.open=true;paint();panel.scrollIntoView({behavior:'smooth',block:'start'});
  }};
  activeReview={controller,getYear:()=>Number(getYear?.()||year),panel};
  return controller;
 }
 function requestOpen(targetYear,month){
  if(!activeReview||!document.contains(activeReview.panel)||
     activeReview.getYear()!==Number(targetYear))return false;
  activeReview.controller.open(Number.isInteger(month)?month:0);
  return true;
 }
 window.CoraYearReview={mount,reviewChanges,validDate,byMonth,requestOpen};
})();