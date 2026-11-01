/* Cadastro recorrente de aniversariantes da Gestão — Colégio Cora Coralina. */
(() => {
  'use strict';
  const KEY='cora_aniversariantes_v1';
  const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const $=id=>document.getElementById(id);
  const form=$('birthdayForm'),listEl=$('birthdayList'),monthFilter=$('birthdayListMonth');
  if(!form||!listEl||!monthFilter)return;
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toLowerCase();
  const valid=(day,month)=>Number.isInteger(day)&&Number.isInteger(month)&&month>=1&&month<=12&&day>=1&&day<=new Date(Date.UTC(2024,month,0)).getUTCDate();
  function read(){try{const data=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(data)?data.filter(b=>b&&valid(Number(b.day),Number(b.month))&&typeof b.name==='string'&&b.name.trim()).map(b=>({...b,day:Number(b.day),month:Number(b.month)})):[]}catch{return []}}
  let people=read(),editing=null;
  const sorted=arr=>[...arr].sort((a,b)=>a.month-b.month||a.day-b.day||a.name.localeCompare(b.name,'pt-BR'));
  function publish(){window.dispatchEvent(new CustomEvent('cora-birthdays-changed',{detail:{count:people.length}}));}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(people));publish();return true}catch{return false}}
  const INITIAL_SYNC_KEY='cora_birthdays_management_initial_sync_v1';
  const DECEMBER_SYNC_KEY='cora_birthdays_management_december_2026_v1';
  // Migração por lote: atualiza dezembro mesmo em navegadores que já importaram novembro.
  // Cada lote entra uma vez; alterações/exclusões posteriores da Gestão são preservadas.
  function importBaseline(incoming){
    if(!Array.isArray(incoming)||!incoming.length)return 0;
    let initialDone=false,decemberDone=false;
    try{initialDone=Boolean(localStorage.getItem(INITIAL_SYNC_KEY));decemberDone=Boolean(localStorage.getItem(DECEMBER_SYNC_KEY));}catch{return 0;}
    if(initialDone&&decemberDone)return 0;
    const existing=read(),merged=[...existing];let added=0;
    for(const candidate of incoming){
      const name=String(candidate?.name||'').trim().replace(/\\s+/g,' ');
      const day=Number(candidate?.day),month=Number(candidate?.month);
      if(!name||!valid(day,month))continue;
      if(month===12?decemberDone:initialDone)continue;
      if(merged.some(p=>normalize(p.name)===normalize(name)&&p.day===day&&p.month===month))continue;
      const id=String(candidate.id||'birthday-import-'+month+'-'+day+'-'+added);
      merged.push({id,name:name.slice(0,100),role:String(candidate.role||'').slice(0,85),day,month});added++;
    }
    try{
      localStorage.setItem(KEY,JSON.stringify(merged));
      if(incoming.some(p=>Number(p?.month)!==12))localStorage.setItem(INITIAL_SYNC_KEY,'1');
      if(incoming.some(p=>Number(p?.month)===12))localStorage.setItem(DECEMBER_SYNC_KEY,'1');
      people=merged;render();publish();
      if(added)feedback('✓ '+added+' aniversariante(s) importado(s) do planejamento da escola.');
      return added;
    }catch{return 0;}
  }
  window.CoraBirthdays={key:KEY,all:()=>sorted(read()),byMonth:n=>sorted(read().filter(p=>p.month===Number(n))),importBaseline};
  monthFilter.innerHTML='<option value="all">Todos os meses</option>'+MONTHS.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('');
  monthFilter.value=String(new Date().getMonth()+1);
  function feedback(message,ok=true){const e=$('birthdayFeedback');e.textContent=message;e.classList.toggle('birthday-success',ok);e.classList.toggle('birthday-error',!ok)}
  function reset(){editing=null;form.reset();$('birthdaySave').textContent='＋ Cadastrar aniversariante';$('birthdayCancel').hidden=true;}
  function render(){const selected=monthFilter.value,visible=sorted(selected==='all'?people:people.filter(p=>p.month===Number(selected)));
    $('birthdayCount').textContent=`${visible.length} ${visible.length===1?'aniversariante':'aniversariantes'}`;
    listEl.innerHTML=visible.length?visible.map(p=>`<li class="birthday-entry"><span class="birthday-day">${String(p.day).padStart(2,'0')}/${String(p.month).padStart(2,'0')}</span><span class="birthday-person"><strong>${escape(p.name)}</strong>${p.role?`<small>${escape(p.role)}</small>`:''}</span><div class="birthday-actions"><button type="button" data-edit-birthday="${escape(p.id)}" class="birthday-edit" aria-label="Editar ${escape(p.name)}">Editar</button><button type="button" data-remove-birthday="${escape(p.id)}" class="birthday-remove" aria-label="Excluir ${escape(p.name)}">Excluir</button></div></li>`).join(''):'<li class="birthday-empty">Nenhum aniversariante cadastrado para este mês. Cadastre acima para gerar o card.</li>';
  }
  form.addEventListener('submit',e=>{e.preventDefault();const name=$('birthdayName').value.trim().replace(/\s+/g,' '),role=$('birthdayRole').value.trim(),day=Number($('birthdayDay').value),month=Number($('birthdayMonth').value);
    if(!name||!valid(day,month)){feedback('Confira nome e data de aniversário.',false);return;}
    const duplicate=people.some(p=>p.id!==editing&&normalize(p.name)===normalize(name)&&p.day===day&&p.month===month);
    if(duplicate){feedback('✓ Esse aniversariante já está cadastrado nesta data. Nenhuma cópia foi criada.');return;}
    const prev=people;const entry={id:editing||`birthday-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,name:name.slice(0,100),role:role.slice(0,85),day,month};
    people=editing?people.map(p=>p.id===editing?entry:p):[...people,entry];
    if(!save()){people=prev;feedback('Não foi possível salvar neste dispositivo. Confira o armazenamento.',false);return;}
    monthFilter.value=String(month);reset();render();feedback('✓ Aniversariante cadastrado! O card do mês já pode ser atualizado.');
  });
  listEl.addEventListener('click',e=>{const edit=e.target.closest('[data-edit-birthday]'),remove=e.target.closest('[data-remove-birthday]');
    if(edit){const p=people.find(x=>x.id===edit.dataset.editBirthday);if(!p)return;editing=p.id;$('birthdayName').value=p.name;$('birthdayRole').value=p.role||'';$('birthdayDay').value=String(p.day).padStart(2,'0');$('birthdayMonth').value=String(p.month);$('birthdaySave').textContent='✓ Salvar alterações';$('birthdayCancel').hidden=false;feedback(`Editando ${p.name}.`);form.scrollIntoView({behavior:'smooth',block:'center'});return;}
    if(remove){const p=people.find(x=>x.id===remove.dataset.removeBirthday);if(!p||!confirm(`Excluir ${p.name} da lista de aniversariantes?`))return;const previous=people;people=people.filter(x=>x.id!==p.id);if(!save()){people=previous;feedback('Não foi possível excluir neste dispositivo.',false);return;}if(editing===p.id)reset();render();feedback('✓ Registro excluído.');}
  });
  $('birthdayCancel').addEventListener('click',()=>{reset();feedback('Edição cancelada.');});
  monthFilter.addEventListener('change',render);
  $('jumpBirthdays')?.addEventListener('click',()=>{$('birthdayStudio').scrollIntoView({behavior:'smooth',block:'start'});});
  $('birthdayJumpCard').addEventListener('click',()=>{const n=monthFilter.value==='all'?new Date().getMonth()+1:Number(monthFilter.value);window.dispatchEvent(new CustomEvent('cora-birthday-card-request',{detail:{month:n}}));$('cardStudio').scrollIntoView({behavior:'smooth',block:'start'});});
  window.addEventListener('cora-backup-restored',()=>{people=read();render();feedback('Cadastros restaurados do backup.');publish()});
  window.addEventListener('storage',e=>{if(e.key===KEY){people=read();render();publish();}});
  render();
})();