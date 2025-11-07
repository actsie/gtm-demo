import { create } from 'zustand';
import { Settings, RecentRun } from '../shared/types';

interface AppState {
  // Settings
  settings: Settings | null;
  secret: string;
  keytarAvailable: boolean;

  // UI state
  activeTab: 'leads' | 'drafts' | 'email' | 'prospects' | 'followups';
  settingsModalOpen: boolean;
  recentRunsPanelOpen: boolean;
  theme: 'light' | 'dark';

  // Recent runs
  recentRuns: RecentRun[];

  // Actions
  setSettings: (settings: Settings) => void;
  setSecret: (secret: string) => void;
  setKeytarAvailable: (available: boolean) => void;
  setActiveTab: (tab: 'leads' | 'drafts' | 'email' | 'prospects' | 'followups') => void;
  setSettingsModalOpen: (open: boolean) => void;
  setRecentRunsPanelOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setRecentRuns: (runs: RecentRun[]) => void;
  addRecentRun: (run: RecentRun) => void;
  deleteRecentRun: (id: string) => void;
  clearRecentRuns: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  settings: null,
  secret: '',
  keytarAvailable: false,
  activeTab: 'leads',
  settingsModalOpen: false,
  recentRunsPanelOpen: false,
  theme: 'light',
  recentRuns: [],

  // Actions
  setSettings: (settings) => set({ settings }),
  setSecret: (secret) => set({ secret }),
  setKeytarAvailable: (available) => set({ keytarAvailable: available }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSettingsModalOpen: (open) => set({ settingsModalOpen: open }),
  setRecentRunsPanelOpen: (open) => set({ recentRunsPanelOpen: open }),
  setTheme: (theme) => set({ theme }),
  setRecentRuns: (runs) => set({ recentRuns: runs }),
  addRecentRun: (run) => set((state) => ({ recentRuns: [run, ...state.recentRuns] })),
  deleteRecentRun: (id) => set((state) => ({ recentRuns: state.recentRuns.filter((run) => run.id !== id) })),
  clearRecentRuns: () => set({ recentRuns: [] }),
}));
