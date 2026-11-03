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
    if (installed()) {
      openButton.textContent = 'Atualizar ícone do app';
      status.textContent = isIOS ? 'O aplicativo já está aberto pela Tela de Início. Para atualizar o ícone no iPhone, faça backup antes de remover e adicionar novamente.' : 'O aplicativo já está instalado neste dispositivo. O Android pode conservar o ícone anterior. Faça um backup antes de remover e instalar novamente.';
      installButton.hidden = true;
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
