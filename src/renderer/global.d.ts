// Type definitions for the electron API exposed via preload

export interface ElectronAPI {
  // Settings
  getSettings: () => Promise<Settings>;
  setSettings: (settings: Settings) => Promise<{ success: boolean }>;

  // Secrets
  storeSecret: (secret: string) => Promise<{ success: boolean; keytarAvailable: boolean }>;
  getSecret: () => Promise<{ secret: string | null; keytarAvailable: boolean }>;
  clearSecret: () => Promise<void>;

  // Network
  networkRequest: (method: string, endpoint: string, body?: unknown) => Promise<NetworkResponse>;

  // External links
  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;

  // Recent runs
  getRecentRuns: () => Promise<RecentRun[]>;
  addRecentRun: (run: RecentRun) => Promise<{ success: boolean }>;
  deleteRecentRun: (id: string) => Promise<{ success: boolean }>;
  clearRecentRuns: () => Promise<{ success: boolean }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

import { Settings, NetworkResponse, RecentRun } from '../shared/types';
