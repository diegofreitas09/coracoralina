/* Planejamento pedagógico para reuniões - Colégio Cora Coralina, 2026. */
(() => {
  'use strict';
  const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  let YEAR=window.CoraYears?.activeYear||2026;
  let STORAGE=`cora_planejamento_${YEAR}_v1`;
  let EVENT_STORAGE=`cora_calendario_eventos_${YEAR}_v1`;
  const $=id=>document.getElementById(id);
  const form=$('planningForm');if(!form)return;
  const sample={
    segment:'Fundamental II e Ensino Médio',meetingDate:'2026-10-31',meetingTime:'7h30',meetingPlace:'Colégio Cora Coralina',coordinator:'Equipe de Gestão e Coordenação',
    projects:'Projeto Valores – Paz\nProjeto Arte Colorindo a Educação – Artes Natalinas\nProjeto Dó Ré Mi – Músicas Natalinas\nFeira do Empreendedor – 4º ano ao Ensino Médio\nFestival Natalino – Vila do Papai Noel',
    schedule:'02/11 – Dia de Finados (feriado)\n03/11 – Início dos ensaios ABC\n05/11 – Dia da Ciência e da Cultura\n06/11 – Reunião Escola e Família e entrega de resultados da 3ª etapa, às 18h30, na quadra\n10/11 – Dia Nacional da Declaração dos Direitos Humanos\n12/11 – Aula da Virada, Infantil V e 5º ano\n12/11 – Dia do Diretor da Escola e do Psicopedagogo\n12/11 – Projeto Valores: Paz\n12 a 19/11 – Revisão das provas da 4ª etapa e fechamento dos livros\n13/11 – Entrega de relatórios à coordenação\n14/11 – Feira do Empreendedor\n15/11 – Proclamação da República (feriado)\n19/11 – Dia da Bandeira e conclusão do Livro 04\n19 e 20/11 – Simulado SAE (conferir conflito com o feriado de 20/11)\n20/11 – Dia da Consciência Negra (feriado)\n23 a 27/11 – Avaliações diagnósticas da 4ª etapa\n27/11 – Confraternização de Ação de Graças na Educação Infantil\n28/11 – Confraternização de Ação de Graças do Fundamental ao Médio',
    guidance:'Verificar os conteúdos trabalhados e assegurar o fechamento de todas as áreas, sem pendências ao final do ano.\nNão deixar páginas em branco nos livros, blocos e cadernos; realizar correções e incentivar as turmas.\nConferir fechamento do Livro 04, avaliações, relatórios e revisão para a 4ª etapa.\nRevisar conflitos de datas e informações da programação antes da divulgação.',
    agenda:'Alinhamento do calendário de novembro\nFechamento de conteúdos, livros e registros pedagógicos\nRevisão e avaliações da 4ª etapa\nFeira do Empreendedor e projetos natalinos\nEntrega de resultados, relatórios e comunicação com as famílias',
    actions:'Conferir datas e horários ainda sujeitos à validação.\nDefinir responsáveis por cada projeto, ensaio e comunicado.\nAlinhar prazos de avaliações, relatórios e registros.',
    birthdays:'Nadja – 01/11; Prof. Emanuel e Ana Paula – 10/11; Aparecida e Mikael – 16/11; Mendonça – 21/11; Ruth – 25/11; John – 26/11.\nDezembro: Diego – 09/12; Breno – 11/12; Renan – 24/12.',
    closing:'Agradecemos a dedicação da equipe. Nosso compromisso coletivo transforma a aprendizagem e fortalece a parceria entre escola e família.',includeCalendar:true,includeBirthdays:true
  };
  const emptyPlan={segment:sample.segment,meetingDate:'',meetingTime:'',meetingPlace:'',coordinator:'Equipe de Gestão e Coordenação',projects:'',schedule:'',guidance:'',agenda:'Alinhamento pedagógico\nAvaliações e registros\nOrganização dos próximos eventos',actions:'',birthdays:'',closing:'Contamos com o compromisso e a colaboração de toda a equipe.',includeCalendar:true,includeBirthdays:true};
  let plans={};let current=Number.isInteger(window.CoraYears?.month)?window.CoraYears.month:10;let saveDelay;
  const fields=['segment','meetingDate','meetingTime','meetingPlace','coordinator','projects','schedule','guidance','agenda','actions','birthdays','closing','includeCalendar','includeBirthdays'];
  const SEGMENTS=['Educação Infantil','Fundamental I','Fundamental II','Ensino Médio','Equipe administrativa'];
  const checkboxes=()=>[...document.querySelectorAll('#planSegments [data-segment]')];
  function segmentValues(){return checkboxes().filter(e=>e.checked).map(e=>e.dataset.segment)}
  function setSegments(value){
    const text=String(value||'').trim();
    let selected=text==='Todas as etapas'?SEGMENTS.slice(0,4):text.split(/\s*(?:•|,|\se\s)\s*/).filter(Boolean);
    if(text==='Equipe pedagógica e administrativa')selected=['Equipe administrativa'];
    checkboxes().forEach(e=>{e.checked=selected.includes(e.dataset.segment)});
    if(!checkboxes().some(e=>e.checked))checkboxes().filter(e=>['Fundamental II','Ensino Médio'].includes(e.dataset.segment)).forEach(e=>e.checked=true);
    const input=$('planSegment');if(input)input.value=segmentValues().join(' • ');
  }
  function birthdaysByMonth(month){
    const currentMonth=Number(month)+1;
    const fromModule=window.CoraBirthdays?.byMonth?.(currentMonth);
    if(Array.isArray(fromModule))return fromModule;
    try{
      const saved=JSON.parse(localStorage.getItem('cora_aniversariantes_v1')||'[]');
      return (Array.isArray(saved)?saved:[]).filter(p=>Number(p.month)===currentMonth)
      .sort((a,b)=>Number(a.day)-Number(b.day)||String(a.name).localeCompare(String(b.name),'pt-BR'));
    }catch{return []}
  }
  function prettyBirthday(p){return String(p.day).padStart(2,'0')+'/'+String(p.month).padStart(2,'0')+' - '+String(p.name||'').trim()}
  function lines(str){return String(str||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean)}
  function eventsFor(month){try{let events=JSON.parse(localStorage.getItem(EVENT_STORAGE)||'[]');return Array.isArray(events)?events.filter(e=>String(e.date||'').startsWith(`${YEAR}-${String(month+1).padStart(2,'0')}-`)).sort((a,b)=>a.date.localeCompare(b.date)):[]}catch{return []}}
  function assessmentMonthRecords(month){
    const schedule=window.CoraAssessments?.get?.(YEAR);
    if(!schedule||!Array.isArray(schedule.items))return {approved:false,records:[]};
    const first=YEAR+'-'+String(month+1).padStart(2,'0')+'-01';
    const last=YEAR+'-'+String(month+1).padStart(2,'0')+'-'+String(new Date(YEAR,month+1,0).getDate()).padStart(2,'0');
    const records=[];
    for(const row of schedule.items){
      // Uma etapa validada já deve aparecer no planejamento, mesmo que as demais estejam em revisão.
      if(!(window.CoraAssessments?.isStageApproved?.(schedule,row.stage)??schedule.approved))continue;
      if(row.due&&row.due>=first&&row.due<=last){
        records.push({date:row.due,kind:'delivery',stage:row.stage,
          title:'Entrega de avaliações à coordenação — '+row.stage+'ª etapa',
          detail:row.deliveryTypes||'AP2 / AD / AR'});
      }
      for(const item of row.items||[]){
        if(item.start&&item.end&&item.start<=last&&item.end>=first){
          records.push({date:item.start<first?first:item.start,kind:'window',stage:row.stage,
            title:item.title+' — '+row.stage+'ª etapa',
            detail:item.start.slice(8,10)+'/'+item.start.slice(5,7)+' a '+item.end.slice(8,10)+'/'+item.end.slice(5,7)});
        }
      }
    }
    // Entregas de conteúdo são cadastradas como eventos normais da Gestão.
    for(const event of eventsFor(month)){
      if(event.type==='Entrega de conteúdo'&&event.status!=='Em revisão'){
        records.push({date:event.date,kind:'content',stage:0,
          title:event.title||'Entrega de conteúdo à coordenação',
          detail:event.notes||'Entrega de conteúdo pedagógico'});
      }
    }
    records.sort((a,b)=>a.date.localeCompare(b.date)||a.kind.localeCompare(b.kind));
    return {approved:schedule.approved,records};
  }
  function assessmentLines(month){
    const {approved,records}=assessmentMonthRecords(month);
    const emails=window.CoraAssessments;
    return records.map(x=>{
      const when=x.date.slice(8,10)+'/'+x.date.slice(5,7);
      return when+' — '+x.title+' ('+x.detail+')'+
        (x.kind==='delivery'?' · Fundamental: '+(emails?.FUND||'coordenacaofundamentalcora@gmail.com')+
        ' · Médio: '+(emails?.MED||'coordenacaomediocora@gmail.com'):'');
    });
  }
  function renderAssessmentMonth(){
    let panel=$('planAssessmentDeadlines');
    if(!panel){
      panel=document.createElement('section');
      panel.id='planAssessmentDeadlines';
      panel.className='planning-deadline-box';
      const anchor=$('planSyncedEvents')?.closest('.plan-synced-events');
      if(anchor)anchor.insertAdjacentElement('afterend',panel);
      else form.appendChild(panel);
    }
    const obj=assessmentMonthRecords(current);
    const safeText=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmt=d=>d.slice(8,10)+'/'+d.slice(5,7);
    panel.innerHTML='<div class="eyebrow">PRAZOS OFICIAIS · '+YEAR+'</div><h3>Entregas e avaliações do mês</h3>'+
       '<p>Sincronizado com a seção “Entregas e avaliações integradas” da Gestão. A Equipe Pedagógica recebe os dados somente após publicação.</p>'+
       (obj.records.length?obj.records.map(v=>'<div class="deadline-item"><time>'+fmt(v.date)+'</time><span><strong>'+safeText(v.title)+'</strong> · '+safeText(v.detail)+'</span></div>').join(''):
        '<div class="deadline-empty">'+(obj.approved?'Nenhum prazo pedagógico previsto para este mês.':'Nenhuma etapa validada com prazos neste mês. Se necessário, confira as datas na Gestão.')+'</div>')+
       '<div class="deadline-source">Envio das avaliações: <a href="mailto:coordenacaofundamentalcora@gmail.com">Coordenação Fundamental</a> · <a href="mailto:coordenacaomediocora@gmail.com">Coordenação Médio</a>. Lembrete cinco dias antes da entrega.</div>';
  }
  function readStorage(){
    try{const obj=JSON.parse(localStorage.getItem(STORAGE)||'{}');plans=obj&&typeof obj==='object'&&!Array.isArray(obj)?obj:{}}catch{plans={}}
    if(YEAR>2026){
      let updated=false;
      for(const [month,plan] of Object.entries(plans)){
        if(!plan||typeof plan!=='object'||plan.carrySanitized)continue;
        const copied=Boolean(plan.copiedFromYear)||String(plan.closing||'').includes('Planejamento reaproveitado de');
        if(!copied)continue;
        // O calendário do novo ano, e não o texto do planejamento antigo, comanda as datas.
        plan.schedule='';
        plan.birthdays='';
        plan.projects=(window.CoraYears?.getProjects?.(YEAR)?.[Number(month)]||[]).join('\n');
        if(plan.meetingDate&&!String(plan.meetingDate).startsWith(YEAR+'-'))plan.meetingDate='';
        plan.closing=String(plan.closing||'').replace(/\s*Planejamento reaproveitado de \d{4}\. Conferir datas, pautas e responsáveis\./g,'');
        plan.carrySanitized=true;updated=true;
      }
      if(updated)try{localStorage.setItem(STORAGE,JSON.stringify(plans))}catch{}
    }
  }
  function defaults(month){return {...(YEAR===2026&&month===10?sample:emptyPlan)}}
  function initMonth(month){
    if(!plans[month])plans[month]=defaults(month);
    const plan=plans[month];
    const projects=window.CoraYears?.getProjects?.(YEAR)?.[month]||[];
    if(YEAR>2026&&projects.length&&!String(plan.projects||'').trim())plan.projects=projects.join('\n');
    return plan;
  }
  function store(){try{localStorage.setItem(STORAGE,JSON.stringify(plans));$('planningSaveStatus').textContent='Alterações salvas automaticamente';}catch{$('planningSaveStatus').textContent='Não foi possível salvar no dispositivo';}}
  function readForm(){const obj={};for(const field of fields){const el=form.elements.namedItem(field);obj[field]=field==='segment'?segmentValues().join(' • '):(field==='includeCalendar'||field==='includeBirthdays')?Boolean(el?.checked):el?.value||'';}return obj}
  function fillForm(month){const obj=initMonth(month);for(const field of fields){const el=form.elements.namedItem(field);if(field==='segment')setSegments(obj.segment);else if(el)(field==='includeCalendar'||field==='includeBirthdays')?el.checked=obj[field]!==false:el.value=obj[field]||''}current=month;$('planMonth').value=String(month);renderSummary()}
  function renderSummary(){
    let panel=$('planStageSummary');
    if(!panel){panel=document.createElement('div');panel.id='planStageSummary';panel.className='plan-stage-summary';form.querySelector('.studio-two')?.insertAdjacentElement('afterend',panel);}
    if(panel){
      const ranges=window.CoraStages?.get?.(YEAR)||[];
      const first=YEAR+'-'+String(current+1).padStart(2,'0')+'-01',last=YEAR+'-'+String(current+1).padStart(2,'0')+'-'+String(new Date(YEAR,current+1,0).getDate()).padStart(2,'0');
      const stages=ranges.filter(p=>p.start&&p.end&&p.start<=last&&p.end>=first);
      panel.textContent=stages.length?'Etapas do mês: '+stages.map(st=>st.number+'ª etapa · '+st.start.slice(8,10)+'/'+st.start.slice(5,7)+' até '+st.end.slice(8,10)+'/'+st.end.slice(5,7)).join(' · '):'Etapas deste mês: confirme os limites letivos no painel da Gestão.';
    }
    renderAssessmentMonth();
    const obj=readForm(),e=obj.includeCalendar?eventsFor(current):[];const eventsPreview=$('planSyncedEvents');if(eventsPreview)eventsPreview.innerHTML=e.length?e.map(v=>'<div><strong>'+String(v.date).slice(8,10)+'/'+String(v.date).slice(5,7)+'</strong> · '+safe(v.title)+(v.status==='Em revisão'?' <em>(revisar)</em>':'')+'</div>').join(''):'<span>Nenhum evento deste mês. Importe ou cadastre pelo calendário.</span>';const birthdayPeople=birthdaysByMonth(current);$('planBirthdayPreview').textContent=birthdayPeople.length?birthdayPeople.map(prettyBirthday).join(' · '):'Nenhum aniversariante cadastrado neste mês.';$('planPreviewBirthdays').textContent=obj.includeBirthdays?(birthdayPeople.length?'Aniversariantes: '+birthdayPeople.map(prettyBirthday).join(' · '):'Aniversariantes: nenhum cadastrado'):'Aniversariantes: ocultos neste PDF';$('planPreviewMonth').textContent=MONTHS[current];$('planPreviewSegment').textContent=obj.segment;$('planProjectCount').textContent=lines(obj.projects).length;$('planScheduleCount').textContent=lines(obj.schedule).length;$('planCalendarCount').textContent=e.length;$('planPreviewAgenda').replaceChildren(...lines(obj.agenda).slice(0,7).map(value=>{const d=document.createElement('div');d.textContent=value;return d}));}
  function saveCurrent(){
    plans[current]=readForm();
    const currentProjects=lines(plans[current].projects);
    const list=window.CoraYears?.getProjects?.(YEAR);
    if(list&&Array.isArray(list[current])&&JSON.stringify(list[current])!==JSON.stringify(currentProjects)){
      list[current]=currentProjects;
      window.CoraYears?.saveProjects?.(YEAR,list);
      window.dispatchEvent(new CustomEvent('cora-projects-changed',{detail:{year:YEAR,month:current}}));
    }
    store();renderSummary();
  }
  function alertUser(msg){const toast=$('toast');if(toast){toast.textContent=msg;toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),4500)}else alert(msg)}
  function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),8000)}
  function startImage(url){return new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>resolve(null);im.src=url||''})}
  async function pdfLibrary(){if(window.PDFLib)return window.PDFLib;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';s.onload=resolve;s.onerror=()=>reject(Error('Biblioteca PDF indisponível'));document.head.append(s)});return window.PDFLib}
  async function buildDocument(month,plan){
    const W=1240,H=1754,LEFT=90,RIGHT=1150,BOTTOM=1615,BLUE='#092e60',GOLD='#ffc928',INK='#153b67',MUTED='#536d86';
    const pages=[];let page,g,y,pageNum=0;
    const logo=await startImage(window.CORA_STUDIO_ASSETS?.logo);
    function rrect(x,z,w,h,r,fill){g.fillStyle=fill;g.beginPath();g.roundRect(x,z,w,h,r);g.fill()}
    function t(value,x,z,size,color=INK,weight='normal'){g.fillStyle=color;g.font=`${weight} ${size}px Arial, sans-serif`;g.fillText(String(value),x,z)}
    function newPage(){page=document.createElement('canvas');page.width=W;page.height=H;g=page.getContext('2d');pageNum++;pages.push(page);g.fillStyle='#fff';g.fillRect(0,0,W,H);rrect(0,0,W,17,0,BLUE);rrect(0,17,W,7,0,GOLD);if(logo)g.drawImage(logo,LEFT,52,110,140);else t('CORA',LEFT,100,39,BLUE,'bold');t('COLÉGIO CORA CORALINA',225,92,30,BLUE,'bold');t('PLANEJAMENTO PEDAGÓGICO · '+YEAR,225,134,22,MUTED,'bold');const segmentText=String(plan.segment||'Equipe pedagógica');g.font='bold 19px Arial,sans-serif';const segments=segmentText.split(' • ');let sx=225,sy=174;for(const label of segments){const size=Math.min(490,g.measureText(label).width+26);if(sx+size>RIGHT){sx=225;sy+=27;}if(sy>197)break;rrect(sx,sy-20,size,25,7,'#e8f1fa');t(label,sx+11,sy-2,17,BLUE,'bold');sx+=size+9;}g.fillStyle='#d9e6f0';g.fillRect(LEFT,206,RIGHT-LEFT,2);y=243}
    function wrap(value,width,size,weight='normal') {g.font=`${weight} ${size}px Arial, sans-serif`;const paras=String(value).split('\n');let out=[];for(const par of paras){if(!par.trim()){out.push('');continue;}let line='';for(let word of par.split(/\s+/)){if(!word)continue;while(g.measureText(word).width>width&&word.length>1){let index=1;while(index<word.length&&g.measureText(word.slice(0,index+1)).width<=width)index++;if(line){out.push(line);line=''}out.push(word.slice(0,index));word=word.slice(index)}const candidate=line?line+' '+word:word;if(g.measureText(candidate).width>width&&line){out.push(line);line=word}else line=candidate}if(line)out.push(line)}return out}
    function room(px){if(y+px>BOTTOM)newPage()}
    function paragraph(textvalue,{size=24,color=INK,indent=0,bold=false,gap=12}={}){const l=wrap(textvalue,RIGHT-LEFT-indent,size,bold?'bold':'normal');for(const line of l){room(size+21);t(line,LEFT+indent,y+size,size,color,bold?'bold':'normal');y+=size+11}y+=gap}
    // Títulos e itens nunca são separados em páginas distintas quando o bloco cabe numa página.
    function section(title,values){
      const arr=Array.isArray(values)?values:lines(values);if(!arr.length)return;
      const estimate=68+arr.reduce((total,item)=>total+Math.max(1,wrap(item,RIGHT-LEFT-27,23).length)*34+9,0)+16;
      if(estimate<=BOTTOM-243&&y+estimate>BOTTOM)newPage();
      else if(y+115>BOTTOM)newPage();
      rrect(LEFT,y,RIGHT-LEFT,48,8,'#eaf2fa');rrect(LEFT,y,11,48,5,GOLD);
      t(title.toUpperCase(),LEFT+30,y+34,22,BLUE,'bold');y+=68;
      for(const value of arr){
        const height=Math.max(1,wrap(value,RIGHT-LEFT-27,23).length)*34+9;
        room(height+12);
        rrect(LEFT+6,y+14,8,8,4,GOLD);
        paragraph(value,{indent:27,size:23,gap:9});
      }
      y+=16;
    }
    // Programação em bloco indivisível: quando não couber, transfere a programação
    // INTEIRA para a página seguinte e, se necessário, compõe-a em colunas.
    function scheduleSection(title,values){
      const arr=(Array.isArray(values)?values:lines(values)).filter(x=>String(x||'').trim());
      if(!arr.length)return;
      const usableWidth=RIGHT-LEFT;
      const config=(columns,font)=>{
        const colGap=26,colWidth=(usableWidth-colGap*(columns-1))/columns;
        const lineHeight=font+8,gap=10;
        const measurements=arr.map(value=>Math.max(1,wrap(value,colWidth-36,font).length)*lineHeight+gap);
        const stacks=Array.from({length:columns},()=>[]);
        // Ordem de leitura por coluna, sempre preservando a ordem cronológica original.
        let start=0;let remaining=measurements.reduce((a,b)=>a+b,0);
        for(let c=0;c<columns;c++){
          const left=columns-c,limit=remaining/left;
          let height=0;
          while(start<arr.length&&(c===columns-1||height<limit)){
            const i=start++;stacks[c].push({value:arr[i],height:measurements[i]});
            height+=measurements[i];remaining-=measurements[i];
          }
        }
        const height=Math.max(...stacks.map(v=>v.reduce((a,b)=>a+b.height,0)));
        return {columns,font,colGap,colWidth,lineHeight,stacks,height,total:height+68+18};
      };
      const first=config(1,23);
      let layout=first;
      // Priorizamos uma única coluna sempre que couber em uma página.
      if(y+first.total>BOTTOM){
        if(first.total<=BOTTOM-243)newPage();
        else{
          // Duas ou três colunas mantêm a lista inteira na mesma página,
          // sem quebrar uma atividade ao atravessar a margem.
          for(const columns of [2,3]){
            for(const font of [22,21,20,19,18,17,16]){
              const test=config(columns,font);
              if(test.total<=BOTTOM-243){layout=test;break}
            }
            if(layout!==first)break;
          }
          newPage();
          if(layout===first){
            // Excesso excepcional: preserva a legibilidade e não oculta textos.
            // A lista longa é tratada pelo paginador normal, sem corte de informações.
            section(title,arr);return;
          }
        }
      }
      rrect(LEFT,y,usableWidth,48,8,'#eaf2fa');
      rrect(LEFT,y,11,48,5,GOLD);
      t(title.toUpperCase(),LEFT+30,y+34,22,BLUE,'bold');y+=67;
      const startY=y;
      for(let col=0;col<layout.columns;col++){
        const x=LEFT+col*(layout.colWidth+layout.colGap);
        let localY=startY;
        for(const item of layout.stacks[col]){
          rrect(x+5,localY+9,7,7,3,GOLD);
          const ls=wrap(item.value,layout.colWidth-36,layout.font);
          for(const line of ls){t(line,x+25,localY+layout.font,layout.font,INK);localY+=layout.lineHeight}
          localY+=10;
        }
      }
      y=startY+layout.height+18;
    }
    function birthdayPanel(people){
      if(!plan.includeBirthdays)return;
      const visible=people.slice(0,16);
      const rows=Math.ceil(visible.length/2),height=Math.max(258,64+rows*37);
      room(height+25);
      rrect(LEFT,y,700,height,11,'#f7fbff');
      g.strokeStyle='#a6bbd1';g.lineWidth=2;g.strokeRect(LEFT,y,700,height);
      t('ANIVERSARIANTES DO MÊS',LEFT+20,y+35,21,BLUE,'bold');
      if(!visible.length)t('Nenhum aniversariante cadastrado neste mês.',LEFT+20,y+92,21,MUTED);
      else visible.forEach((person,i)=>{
        const column=i%2,row=Math.floor(i/2),x=LEFT+19+column*338,z=y+78+row*37;
        const caption=prettyBirthday(person);
        g.font='bold 18px Arial, sans-serif';
        let short=caption;
        while(short.length>4&&g.measureText(short).width>315)short=short.slice(0,-2)+'…';
        t(short,x,z,18,INK,'bold');
      });
      const right=LEFT+719,top=y;
      rrect(right,top,RIGHT-right,height,13,'#eaf2fb');
      rrect(right,top,RIGHT-right,53,10,BLUE);
      t(MONTHS[month].toUpperCase(),right+22,top+36,24,'#fff','bold');
      const firstDay=new Date(YEAR,month,1).getDay(),totalDays=new Date(YEAR,month+1,0).getDate();
      const cols=7,blockW=(RIGHT-right-24)/cols,dayY=top+80;
      ['D','S','T','Q','Q','S','S'].forEach((name,i)=>t(name,right+14+i*blockW,dayY,16,MUTED,'bold'));
      const birthdays=new Set(visible.map(person=>Number(person.day)));
      for(let d=1;d<=totalDays;d++){
        const index=firstDay+d-1,col=index%7,row=Math.floor(index/7);
        const x=right+10+col*blockW,z=dayY+27+row*27;
        if(birthdays.has(d))rrect(x-4,z-18,blockW-2,24,5,'#ffe699');
        t(String(d),x,z,16,INK,birthdays.has(d)?'bold':'normal');
      }
      y+=height+25;
      if(people.length>16)section('Outros aniversariantes do mês',people.slice(16).map(prettyBirthday));
    }
    newPage();
    t(`PLANEJAMENTO DE ${MONTHS[month].toUpperCase()}`,LEFT,y+49,43,BLUE,'bold');y+=71;
    rrect(LEFT,y,RIGHT-LEFT,52,5,'#dcecf2');
    t(`PROGRAMAÇÃO DO MÊS DE ${MONTHS[month].toUpperCase()} – ${YEAR}`,LEFT+22,y+35,22,BLUE,'bold');
    y+=69;
    paragraph(plan.segment,{size:26,color:MUTED,gap:15});
    const fmt=s=>/^\d{4}-\d\d-\d\d$/.test(s||'')?s.split('-').reverse().join('/'):'Não informada';
    room(122);rrect(LEFT,y,RIGHT-LEFT,112,15,'#edf4fb');t('REUNIÃO COM A EQUIPE',LEFT+22,y+37,21,BLUE,'bold');t(`Data: ${fmt(plan.meetingDate)}    •    Horário: ${plan.meetingTime||'A definir'}`,LEFT+22,y+73,23,INK);t(`Local: ${plan.meetingPlace||'A definir'}    •    Coordenação: ${plan.coordinator||'Equipe gestora'}`,LEFT+22,y+98,17,MUTED);y+=148;
    const projects=lines(plan.projects).length?plan.projects:(window.CoraYears?.getProjects?.(YEAR)?.[month]||[]);
    section('Projetos e campanhas do mês',projects);
    const stages=window.CoraStages?.get?.(YEAR)||[];
    const firstDate=YEAR+'-'+String(month+1).padStart(2,'0')+'-01';
    const lastDate=YEAR+'-'+String(month+1).padStart(2,'0')+'-'+String(new Date(YEAR,month+1,0).getDate()).padStart(2,'0');
    const stagesThisMonth=stages.filter(st=>st.start&&st.end&&st.start<=lastDate&&st.end>=firstDate);
    const stageDescription=stagesThisMonth.map(st=>st.number+'ª etapa: início '+st.start.split('-').reverse().join('/')+' · fim '+st.end.split('-').reverse().join('/'));
    section('Etapas letivas · início e encerramento',stageDescription.length?stageDescription:['Datas das etapas pendentes de definição para '+YEAR]);
    section('Prazos de entrega e avaliações · coordenação pedagógica',assessmentLines(month));
    birthdayPanel(birthdaysByMonth(month));
    const manualNotes=String(plan.birthdays||'').trim();
    if(manualNotes&&manualNotes!==String(sample.birthdays).trim())section('Comunicados e datas complementares',manualNotes);
    const scheduleEntries=lines(plan.schedule);
    const extraEvents=plan.includeCalendar?eventsFor(month).map(event=>`${event.date.slice(8,10)}/${event.date.slice(5,7)} – ${event.title}${event.notes?' — '+event.notes:''}`):[];
    const normalized=v=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w]/g,'').toLowerCase();
    const scheduleKeys=new Set(scheduleEntries.map(normalized));
    const uniqueExtra=extraEvents.filter(item=>!scheduleKeys.has(normalized(item)));
    const dayKey=value=>{const match=/^\s*(\d{1,2})(?:\s*a\s*\d{1,2})?\s*\/\s*(\d{1,2})/.exec(String(value));return match?Number(match[2])*100+Number(match[1]):9999;};
    const orderedDates=[...scheduleEntries,...uniqueExtra].map((value,index)=>({value,index}))
      .sort((a,b)=>dayKey(a.value)-dayKey(b.value)||a.index-b.index).map(x=>x.value);
    scheduleSection('Programação mensal e datas importantes',orderedDates);
    section('Orientações pedagógicas',plan.guidance);
    section('Pauta da reunião',plan.agenda);
    section('Encaminhamentos e responsabilidades',plan.actions);
    section('Mensagem de encerramento',plan.closing);
    room(150);y+=16;g.fillStyle='#dce6ef';g.fillRect(LEFT,y,RIGHT-LEFT,2);y+=42;t('Responsável pela reunião:',LEFT,y,21,INK,'bold');g.strokeStyle='#b8c7d7';g.lineWidth=2;g.beginPath();g.moveTo(LEFT+340,y+6);g.lineTo(RIGHT,y+6);g.stroke();
    for(let i=0;i<pages.length;i++){const p=pages[i],ctx=p.getContext('2d');ctx.fillStyle='#e7edf3';ctx.fillRect(LEFT,1661,RIGHT-LEFT,2);ctx.font='bold 17px Arial';ctx.fillStyle=MUTED;ctx.fillText(`CORA CORALINA · PLANEJAMENTO DE ${MONTHS[month].toUpperCase()} ${YEAR}`,LEFT,1697);ctx.fillText(`${i+1} / ${pages.length}`,1080,1697);ctx.textAlign='right';ctx.font='bold 15px Arial';ctx.fillStyle='#607e9e';ctx.fillText('Tecnologia: PDF Solução Educacional',RIGHT,1730);ctx.textAlign='left'}
    return window.CoraPDF.fromCanvases(pages,{pageWidth:595.28,pageHeight:841.89,title:`Planejamento ${MONTHS[month]} ${YEAR}`});
  }
  function fallbackPrint(plan,month){
    const box=document.createElement('section');box.id='planningPrint';
    const asList=(title,items,className='')=>{const values=Array.isArray(items)?items:lines(items);return values.length?`<section class="${className}"><h3>${safe(title)}</h3><ul>${values.map(v=>`<li>${safe(v)}</li>`).join('')}</ul></section>`:''};
    const birthdayLines=plan.includeBirthdays?birthdaysByMonth(month).map(prettyBirthday):[];
    const projects=lines(plan.projects).length?lines(plan.projects):(window.CoraYears?.getProjects?.(YEAR)?.[month]||[]);
    const comm=plan.birthdays===sample.birthdays?'':plan.birthdays;
    const extras=plan.includeCalendar?eventsFor(month).map(e=>e.date.slice(8,10)+'/'+e.date.slice(5,7)+' – '+e.title):[];
    box.innerHTML=`<h1>COLÉGIO CORA CORALINA</h1><h2>Planejamento de ${MONTHS[month]} de ${YEAR}</h2><p>${safe(plan.segment)}</p>`+
      asList('Projetos e campanhas do mês',projects)+
      (plan.includeBirthdays?asList('Aniversariantes do mês',birthdayLines.length?birthdayLines:['Nenhum aniversariante cadastrado']):'')+
      asList('Comunicados e datas complementares',comm)+
      asList('Prazos de entrega e avaliações · coordenação pedagógica',assessmentLines(month))+
      asList('Programação mensal e datas importantes',[...lines(plan.schedule),...extras],'printing-dates')+
      asList('Orientações pedagógicas',plan.guidance)+asList('Pauta da reunião',plan.agenda)+
      asList('Encaminhamentos e responsabilidades',plan.actions);
    document.body.append(box);
    let style=document.getElementById('planningPrintStyle');
    if(!style){style=document.createElement('style');style.id='planningPrintStyle';style.textContent='@media screen{#planningPrint{display:none}}@media print{body>*:not(#planningPrint){display:none!important}#planningPrint{display:block!important;padding:15mm;color:#14385e;font:11pt Arial}#planningPrint h3{break-after:avoid}#planningPrint li{margin:5px 0}#planningPrint .printing-dates{break-inside:avoid;page-break-inside:avoid}}';document.head.append(style)}
    window.addEventListener('afterprint',()=>box.remove(),{once:true});window.print();
  }
  const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  $('planMonth').innerHTML=MONTHS.map((x,i)=>`<option value="${i}">${x} de ${YEAR}</option>`).join('');
  $('planMeetingDate').min=YEAR+'-01-01';$('planMeetingDate').max=YEAR+'-12-31';readStorage();fillForm(current);
  $('planMonth').addEventListener('change',()=>{saveCurrent();fillForm(Number($('planMonth').value));});
  form.addEventListener('input',()=>{clearTimeout(saveDelay);const el=$('planSegment');if(el)el.value=segmentValues().join(' • ');saveDelay=setTimeout(saveCurrent,200)});
  form.addEventListener('change',()=>{clearTimeout(saveDelay);saveCurrent()});
  $('loadNovemberPlan').addEventListener('click',()=>{if(current!==10){$('planMonth').value='10';saveCurrent();fillForm(10)}if(confirm('Repor o modelo de novembro? Isto substituirá apenas os campos deste mês.')){plans[10]={...sample};fillForm(10);store()}});
  $('downloadPlanning').addEventListener('click',async()=>{if(!segmentValues().length){alertUser('Selecione pelo menos uma etapa atendida.');return;}saveCurrent();const btn=$('downloadPlanning');btn.disabled=true;btn.textContent='Gerando planejamento...';try{const blob=await buildDocument(current,readForm());download(blob,`Planejamento_Reuniao_Cora_${MONTHS[current]}_${YEAR}.pdf`);alertUser('Planejamento gerado e baixado em PDF.')}catch(error){console.error(error);alertUser('PDF direto indisponível. Selecione “Salvar como PDF” na janela de impressão.');fallbackPrint(readForm(),current)}finally{btn.disabled=false;btn.textContent='↓ Baixar planejamento em PDF'}});
  $('jumpPlanning').addEventListener('click',()=>$('planningStudio').scrollIntoView({behavior:'smooth',block:'start'}));
  window.addEventListener('cora-backup-restored',()=>{readStorage();fillForm(current)});
  window.addEventListener('cora-birthdays-changed',()=>{renderSummary()});
  window.addEventListener('cora-month-changed',e=>{
    if(Number(e.detail?.year||YEAR)!==YEAR||!Number.isInteger(e.detail?.month))return;
    const next=Number(e.detail.month);if(next<0||next>11)return;
    if(next!==current){clearTimeout(saveDelay);saveCurrent();fillForm(next);}
    else renderSummary();
  });
  window.addEventListener('cora-data-changed',e=>{if(Number(e.detail?.year)===YEAR){readStorage();fillForm(current)}});
  window.addEventListener('cora-events-updated',e=>{if(Number(e.detail?.year)===YEAR)renderSummary();});
  window.addEventListener('cora-assessments-changed',e=>{if(Number(e.detail?.year)===YEAR)renderSummary();});
  window.addEventListener('cora-stages-updated',e=>{if(Number(e.detail?.year)===YEAR)renderSummary()});
  window.addEventListener('cora-projects-changed',e=>{
    if(Number(e.detail?.year)!==YEAR)return;
    const months=window.CoraYears?.getProjects?.(YEAR)||[];
    const updated=months[current]||[];const input=form.elements.namedItem('projects');
    if(input&&input.value!==updated.join('\n')){input.value=updated.join('\n');plans[current].projects=input.value;store();}
    renderSummary();
  });
  window.addEventListener('cora-year-changed',e=>{
    saveCurrent();YEAR=Number(e.detail.year);STORAGE=`cora_planejamento_${YEAR}_v1`;
    EVENT_STORAGE=`cora_calendario_eventos_${YEAR}_v1`;current=Number(e.detail.month)||0;readStorage();$('planMeetingDate').min=YEAR+'-01-01';$('planMeetingDate').max=YEAR+'-12-31';
    $('planMonth').innerHTML=MONTHS.map((x,i)=>`<option value="${i}">${x} de ${YEAR}</option>`).join('');
    fillForm(current);
  });
  window.addEventListener('cora-planning-copied',e=>{if(Number(e.detail?.year)!==YEAR)return;clearTimeout(saveDelay);readStorage();fillForm(Number(e.detail.month)||0);});
})();