import { create } from 'zustand';
import { Settings, RecentRun } from '../shared/types';

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheState {
  [key: string]: CacheEntry<any>;
}

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

  // Cache
  cache: CacheState;

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

  // Cache actions
  getCacheData: <T>(key: string) => T | null;
  setCacheData: <T>(key: string, data: T) => void;
  invalidateCache: (key: string) => void;
  clearCache: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  settings: null,
  secret: '',
  keytarAvailable: false,
  activeTab: 'leads',
  settingsModalOpen: false,
  recentRunsPanelOpen: false,
  theme: 'light',
  recentRuns: [],
  cache: {},

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

  // Cache actions
  getCacheData: <T>(key: string): T | null => {
    const state = get();
    const entry = state.cache[key];

    if (!entry) {
      return null;
    }

    // Check if cache has expired
    const now = Date.now();
    if (now - entry.timestamp > CACHE_TTL_MS) {
      // Cache expired, remove it
      set((state) => {
        const newCache = { ...state.cache };
        delete newCache[key];
        return { cache: newCache };
      });
      return null;
    }

    return entry.data as T;
  },

  setCacheData: <T>(key: string, data: T) => {
    set((state) => ({
      cache: {
        ...state.cache,
        [key]: {
          data,
          timestamp: Date.now(),
        },
      },
    }));
  },

  invalidateCache: (key: string) => {
    set((state) => {
      const newCache = { ...state.cache };
      delete newCache[key];
      return { cache: newCache };
    });
  },

  clearCache: () => {
    set({ cache: {} });
  },
}));
