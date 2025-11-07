import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { IPC_CHANNELS } from '../shared/types';
import { getSettings, setSettings, getRecentRuns, addRecentRun, deleteRecentRun, clearRecentRuns } from './storage';
import { storeSecret, getSecret, clearSecret } from './secrets';
import { makeNetworkRequest } from './network';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    title: 'GTM Ops Console',
  });

  // In development, load from Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers

// Settings
ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
  return getSettings();
});

ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_event, settings) => {
  setSettings(settings);
  return { success: true };
});

// Secrets
ipcMain.handle(IPC_CHANNELS.SECRET_STORE, async (_event, secret: string) => {
  return await storeSecret(secret);
});

ipcMain.handle(IPC_CHANNELS.SECRET_GET, async () => {
  return await getSecret();
});

ipcMain.handle(IPC_CHANNELS.SECRET_CLEAR, async () => {
  await clearSecret();
  return { success: true };
});

// Network
ipcMain.handle(
  IPC_CHANNELS.NETWORK_REQUEST,
  async (_event, { method, endpoint, body }: { method: string; endpoint: string; body?: unknown }) => {
    return await makeNetworkRequest(method, endpoint, body);
  }
);

// External links
ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL, async (_event, url: string) => {
  // Validate URL before opening
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      await shell.openExternal(url);
      return { success: true };
    } else {
      return { success: false, error: 'Invalid URL protocol' };
    }
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Recent runs
ipcMain.handle(IPC_CHANNELS.RECENT_RUNS_LIST, async () => {
  return getRecentRuns();
});

ipcMain.handle(IPC_CHANNELS.RECENT_RUNS_ADD, async (_event, run) => {
  addRecentRun(run);
  return { success: true };
});

ipcMain.handle(IPC_CHANNELS.RECENT_RUNS_DELETE, async (_event, id: string) => {
  deleteRecentRun(id);
  return { success: true };
});

ipcMain.handle(IPC_CHANNELS.RECENT_RUNS_CLEAR, async () => {
  clearRecentRuns();
  return { success: true };
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
