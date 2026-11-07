/* Instalação e atualização do aplicativo Calendário Cora Coralina */
(() => {
  'use strict';
  const openButton = document.getElementById('installCalendarApp');
  const dialog = document.getElementById('calendarInstallDialog');
  const closeButton = document.getElementById('calendarInstallClose');
  const installButton = document.getElementById('calendarInstallNow');
  const backupButton = document.getElementById('calendarInstallBackup');
  const status = document.getElementById('calendarInstallStatus');
  if (!openButton || !dialog || !installButton || !status) return;
  const backupWarning = dialog.querySelector('.calendar-install-warning');
  const installSubtitle = dialog.querySelector('.calendar-install-heading p');
  let deferredPrompt = null;
  const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function updateSteps() {
    const list = document.getElementById('calendarInstallSteps');
    if (!list) return;
    if (isIOS) {
      list.innerHTML = '<li>Abra o link do calendário no <strong>Safari</strong>. Se estiver no WhatsApp, escolha abrir no navegador Safari.</li>' +
        '<li>Toque em <strong>Compartilhar</strong> e selecione <strong>Adicionar à Tela de Início</strong>.</li>' +
        '<li>Quando aparecer, mantenha ativado <strong>Abrir como App da Web</strong> e confirme em <strong>Adicionar</strong>.</li>' +
        '<li>Abra o ícone <strong>Agenda Cora</strong> na Tela de Início. Em iOS 16.4 ou superior, toque em <strong>Ativar notificações</strong> dentro do aplicativo.</li>';
    } else {
      list.innerHTML = '<li>Abra o calendário no <strong>Google Chrome</strong> do Android.</li>' +
        '<li>Toque em <strong>Instalar agora</strong>, quando disponível, ou use o menu <strong>⋮ → Instalar app / Adicionar à tela inicial</strong>.</li>' +
        '<li>Se precisar substituir um ícone antigo, faça antes o backup de seus dados.</li>';
    }
  }
  const installed = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  function refresh() {
    updateSteps();
    const teamMode = Boolean(document.querySelector('#coraPortal .cp-team'));
    if (backupButton) backupButton.hidden = teamMode;
    if (backupWarning) backupWarning.hidden = teamMode;
    if (installSubtitle) installSubtitle.textContent = teamMode ? 'Equipe Pedagógica • acesso individual' : 'Calendário Anual • Ícone 3D azul e dourado';
    if (installed()) {
      openButton.textContent = 'Atualizar aplicativo';
      status.textContent = 'O aplicativo já está instalado. Toque em Atualizar conteúdo agora para carregar as telas e os calendários mais recentes sem desinstalar. A troca do ícone antigo pode exigir reinstalação em alguns aparelhos.';
      installButton.hidden = false;
      installButton.textContent = 'Atualizar conteúdo agora';
    } else if (deferredPrompt && !isIOS) {
      openButton.textContent = 'Instalar aplicativo';
      status.textContent = 'Seu navegador permite instalar o Calendário Cora Coralina diretamente. Toque em Instalar agora.';
      installButton.hidden = false;
    } else {
      openButton.textContent = isIOS ? 'Instalar no iPhone' : 'Instalar / atualizar app';
      status.textContent = isIOS ? 'No iPhone, a instalação é feita pelo Safari: Compartilhar → Adicionar à Tela de Início. Depois abra o app pelo ícone instalado.' : 'Abra esta página no Chrome do Android e escolha ⋮ → Instalar app ou Adicionar à tela inicial. Se a opção não aparecer, o aplicativo pode já estar instalado.';
      installButton.hidden = true;
    }
  }
  function showGuide() {
    refresh();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else window.alert(status.textContent);
  }
  async function reloadLatest(){
    if(document.querySelector('#cgResultForm, #cgTestForm')&&
       !window.confirm('A atualização reabrirá o aplicativo e poderá descartar alterações ainda não salvas no corretor. Deseja continuar?'))return;
    status.textContent='Buscando a versão mais recente do Calendário Cora Coralina...';
    installButton.disabled=true;
    try{
      const reg=await navigator.serviceWorker?.getRegistration?.();
      await reg?.update?.();
    }catch(e){console.warn('Atualização do serviço offline indisponível:',e)}
    const url=new URL(window.location.href);
    url.searchParams.set('versao',String(Date.now()));
    window.location.replace(url.toString());
  }
  window.CoraInstallApp = { open: showGuide,update:reloadLatest };
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    refresh();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    refresh();
    status.textContent = 'Aplicativo instalado. Você já pode encontrá-lo na tela inicial do celular.';
  });
  openButton.addEventListener('click', showGuide);
  closeButton?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  backupButton?.addEventListener('click', () => {
    dialog.close();
    const backup = document.getElementById('backupBtn');
    if (backup) backup.click();
    else window.alert('Use a opção Backup no topo do calendário antes de desinstalar.');
  });
  installButton.addEventListener('click', async () => {
    if(installed()){await reloadLatest();return;}
    if (!deferredPrompt) { refresh(); return; }
    const prompt = deferredPrompt;
    deferredPrompt = null;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome !== 'accepted') status.textContent = 'Instalação não concluída. Você pode tentar novamente pelo menu do Chrome.';
      else status.textContent = 'Pedido de instalação aceito. Confira a tela inicial do aparelho.';
    } catch (error) {
      console.warn('A instalação não pôde ser iniciada:', error);
      status.textContent = 'Não foi possível abrir a instalação automática. Use o menu ⋮ do Chrome.';
    }
    refresh();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  refresh();
})();
