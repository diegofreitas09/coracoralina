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
  const installed = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  function refresh() {
    if (installed()) {
      openButton.textContent = 'Atualizar ícone do app';
      status.textContent = 'O aplicativo já está instalado neste dispositivo. O Android pode conservar o ícone anterior. Faça um backup antes de remover e instalar novamente.';
      installButton.hidden = true;
    } else if (deferredPrompt) {
      openButton.textContent = 'Instalar aplicativo';
      status.textContent = 'Seu navegador permite instalar o Calendário Cora Coralina diretamente. Toque em Instalar agora.';
      installButton.hidden = false;
    } else {
      openButton.textContent = 'Instalar / atualizar app';
      status.textContent = 'Abra esta página no Chrome do Android e escolha ⋮ → Instalar app ou Adicionar à tela inicial. Se a opção não aparecer, o aplicativo pode já estar instalado.';
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
