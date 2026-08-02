/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const { app, BrowserWindow, dialog, powerMonitor, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { autoUpdater } = require('electron-updater');

let mainWindow;
let isQuitting = false;

// Configure autoUpdater
autoUpdater.autoDownload = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "SiGeP Académico - SIGEP-Group",
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false, // Don't show until page is loaded or server is responding
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Remover os menus padrão do Electron
  mainWindow.setMenu(null);
  Menu.setApplicationMenu(null);

  // Registo de Eventos do Sistema Operativo para Gestão de Bloqueio Seguro (Power Monitor)
  powerMonitor.on('suspend', () => {
    console.log('Sistema operativo suspenso. Enviando ordem de bloqueio ao Frontend...');
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('os-suspend-lock');
    }
  });

  powerMonitor.on('lock-screen', () => {
    console.log('Ecrã bloqueado por inatividade ou comando de OS. Enviando ordem de bloqueio ao Frontend...');
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('os-suspend-lock');
    }
  });

  // Start internal Express backend
  try {
    const serverPath = path.join(__dirname, 'dist', 'server.cjs');
    if (fs.existsSync(serverPath)) {
      console.log('A iniciar o servidor central Express...');
      require(serverPath);
    } else {
      console.log('Aviso: Ficheiro backend server.cjs não localizado no directório de produção.');
    }
  } catch (err) {
    console.error('Erro ao arrancar o servidor interno SIGEP:', err);
  }

  // Load interface with auto-retry to eliminate white screens
  const isDev = !app.isPackaged;
  const targetUrl = 'http://localhost:3000';
  let retryCount = 0;
  const maxRetries = 25;

  function loadAppWithRetry() {
    if (isQuitting || !mainWindow) return;

    http.get(`${targetUrl}/api/health`, (res) => {
      if (res.statusCode === 200 || res.statusCode === 304) {
        console.log('Servidor Express respondendo com sucesso na porta 3000!');
        if (mainWindow) {
          mainWindow.loadURL(targetUrl);
          mainWindow.show();
          if (isDev) mainWindow.webContents.openDevTools();
        }
      } else {
        retryLoading();
      }
    }).on('error', () => {
      retryLoading();
    });
  }

  function retryLoading() {
    retryCount++;
    if (retryCount <= maxRetries) {
      console.log(`[SIGEP Startup] Aguardando servidor Express (Tentativa ${retryCount}/${maxRetries})...`);
      setTimeout(loadAppWithRetry, 400);
    } else {
      console.warn('[SIGEP Startup] Timeout ao conectar via HTTP. Recorrendo a ficheiro estático dist/index.html...');
      const indexPath = path.join(__dirname, 'dist', 'index.html');
      if (fs.existsSync(indexPath)) {
        mainWindow.loadFile(indexPath);
      } else {
        mainWindow.loadURL(targetUrl);
      }
      mainWindow.show();
    }
  }

  // Fallback se ocorrer falha ao carregar a página
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.warn(`[Electron] Falha de carregamento (${errorCode}: ${errorDescription}). Re-tentando...`);
    if (retryCount <= maxRetries) {
      setTimeout(loadAppWithRetry, 500);
    }
  });

  // Iniciar ciclo de verificação e carregamento
  loadAppWithRetry();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Verify and notify updates if repository is configured
  if (!isDev) {
    try {
      autoUpdater.checkForUpdatesAndNotify();
    } catch (updateError) {
      console.error('Falha ao verificar atualizações automáticas:', updateError);
    }
  }
}

app.on('ready', createWindow);

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  isQuitting = true;
  if (process.platform !== 'darwin') {
    app.quit();
    process.exit(0);
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Update Cycle Handlers
autoUpdater.on('checking-for-update', () => {
  console.log('A verificar existência de novas atualizações...');
});

autoUpdater.on('update-available', (info) => {
  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: 'Atualização Disponível',
      message: `Uma nova atualização (${info.version}) para o SIGEP foi localizada. Pretende descarregar e instalar automaticamente agora?`,
      buttons: ['Sim, Descarregar', 'Agora Não']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  }
});

autoUpdater.on('update-not-available', () => {
  console.log('SIGEP já se encontra na última versão estável.');
});

autoUpdater.on('error', (err) => {
  console.error('Ocorreu um erro no ciclo do atualizador automático:', err);
});

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Atualização Pronta',
      message: 'A nova versão foi descarregada com sucesso. O SIGEP será reiniciado para concluir o processo.',
      buttons: ['Reiniciar Agora', 'Mais Tarde']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  }
});
