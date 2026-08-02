const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onOSSuspendLock: (callback) => {
    const wrappedCallback = () => callback();
    ipcRenderer.on('os-suspend-lock', wrappedCallback);
    return wrappedCallback;
  },
  removeOSSuspendLockListener: (callback) => {
    ipcRenderer.removeAllListeners('os-suspend-lock');
  }
});
