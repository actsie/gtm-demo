// Pure CommonJS preload script for Electron
// This file is NOT compiled/bundled - it's used directly as-is

const { contextBridge, ipcRenderer } = require('electron');

// IPC Channel names
const IPC_CHANNELS = {
  SETTINGS_GET: 'settings.get',
  SETTINGS_SET: 'settings.set',
  SECRET_STORE: 'secret.store',
  SECRET_GET: 'secret.get',
  SECRET_CLEAR: 'secret.clear',
  NETWORK_REQUEST: 'network.request',
  OPEN_EXTERNAL: 'openExternal',
  RECENT_RUNS_LIST: 'recentRuns.list',
  RECENT_RUNS_ADD: 'recentRuns.add',
  RECENT_RUNS_DELETE: 'recentRuns.delete',
  RECENT_RUNS_CLEAR: 'recentRuns.clear',
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
  setSettings: (settings) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, settings),

  // Secrets
  storeSecret: (secret) => ipcRenderer.invoke(IPC_CHANNELS.SECRET_STORE, secret),
  getSecret: () => ipcRenderer.invoke(IPC_CHANNELS.SECRET_GET),
  clearSecret: () => ipcRenderer.invoke(IPC_CHANNELS.SECRET_CLEAR),

  // Network
  networkRequest: (method, endpoint, body) =>
    ipcRenderer.invoke(IPC_CHANNELS.NETWORK_REQUEST, { method, endpoint, body }),

  // External links
  openExternal: (url) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL, url),

  // Recent runs
  getRecentRuns: () => ipcRenderer.invoke(IPC_CHANNELS.RECENT_RUNS_LIST),
  addRecentRun: (run) => ipcRenderer.invoke(IPC_CHANNELS.RECENT_RUNS_ADD, run),
  deleteRecentRun: (id) => ipcRenderer.invoke(IPC_CHANNELS.RECENT_RUNS_DELETE, id),
  clearRecentRuns: () => ipcRenderer.invoke(IPC_CHANNELS.RECENT_RUNS_CLEAR),
});
