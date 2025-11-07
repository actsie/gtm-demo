import Store from 'electron-store';
import { Settings, RecentRun } from '../shared/types';

const store = new Store();

// Default settings
const DEFAULT_SETTINGS: Settings = {
  n8nBaseUrl: '',
  webhookHeaderName: 'x-webhook-secret', // Default header name for backward compatibility
  lastTestTs: null,
  ui: {
    theme: 'auto',
  },
};

export function getSettings(): Settings {
  return store.get('settings', DEFAULT_SETTINGS) as Settings;
}

export function setSettings(settings: Settings): void {
  store.set('settings', settings);
}

export function getRecentRuns(): RecentRun[] {
  try {
    const runs = store.get('recentRuns', []) as RecentRun[];
    // Validate that it's an array
    if (!Array.isArray(runs)) {
      console.error('Recent runs storage is corrupt (not an array), resetting to empty');
      store.set('recentRuns', []);
      return [];
    }
    return runs;
  } catch (error) {
    console.error('Failed to read recent runs from storage:', error);
    // Return empty array and try to reset storage
    try {
      store.set('recentRuns', []);
    } catch (resetError) {
      console.error('Failed to reset recent runs storage:', resetError);
    }
    return [];
  }
}

export function addRecentRun(run: RecentRun): void {
  try {
    const runs = getRecentRuns();
    runs.unshift(run); // Add to beginning

    // Keep only last 20 runs (LRU behavior)
    const trimmed = runs.slice(0, 20);
    store.set('recentRuns', trimmed);
  } catch (error) {
    console.error('Failed to add recent run to storage:', error);
    throw error;
  }
}

export function deleteRecentRun(id: string): void {
  try {
    const runs = getRecentRuns();
    const filtered = runs.filter((run) => run.id !== id);
    store.set('recentRuns', filtered);
  } catch (error) {
    console.error('Failed to delete recent run from storage:', error);
    throw error;
  }
}

export function clearRecentRuns(): void {
  try {
    store.set('recentRuns', []);
  } catch (error) {
    console.error('Failed to clear recent runs from storage:', error);
    throw error;
  }
}
