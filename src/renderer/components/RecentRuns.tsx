import { useState } from 'react';
import { useAppStore } from '../store';
import { RecentRun } from '../../shared/types';

interface RecentRunsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RecentRuns({ isOpen, onClose }: RecentRunsProps) {
  const { recentRuns, setActiveTab, deleteRecentRun, clearRecentRuns } = useAppStore();
  const [storageError, setStorageError] = useState<string | null>(null);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  const handleRehydrate = async (run: RecentRun) => {
    // Switch to the correct tab
    setActiveTab(run.tab);

    // Store the args in localStorage so the tab component can pick them up
    const storageKey = `rehydrate-${run.tab}`;
    localStorage.setItem(storageKey, JSON.stringify(run.args));

    // Trigger a custom event to notify the tab component
    window.dispatchEvent(new CustomEvent('rehydrate-form', {
      detail: { tab: run.tab, args: run.args }
    }));

    // Close the panel
    onClose();
  };

  const handleRunAgain = async (run: RecentRun) => {
    // Switch to the correct tab first
    setActiveTab(run.tab);

    // Store the args and trigger execution
    const storageKey = `rehydrate-${run.tab}`;
    localStorage.setItem(storageKey, JSON.stringify(run.args));

    // Dispatch event with execute flag
    window.dispatchEvent(new CustomEvent('rehydrate-and-execute', {
      detail: { tab: run.tab, args: run.args }
    }));

    // Close the panel
    onClose();
  };

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      await window.electronAPI.deleteRecentRun(id);
      deleteRecentRun(id);
    } catch (error) {
      console.error('Failed to delete recent run:', error);
      setStorageError('Failed to delete run. Please try again.');
      setTimeout(() => setStorageError(null), 5000);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all recent runs?')) {
      return;
    }

    try {
      await window.electronAPI.clearRecentRuns();
      clearRecentRuns();
    } catch (error) {
      console.error('Failed to clear recent runs:', error);
      setStorageError('Failed to clear runs. Please try again.');
      setTimeout(() => setStorageError(null), 5000);
    }
  };

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'leads':
        return '🔍 Leads';
      case 'drafts':
        return '✍️ Drafts';
      case 'email':
        return '📧 Email';
      case 'prospects':
        return '📋 Prospects';
      default:
        return tab;
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl z-40 overflow-y-auto">
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Runs</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
            aria-label="Close recent runs"
          >
            ×
          </button>
        </div>

        {recentRuns.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-red-600 dark:text-red-400 hover:underline"
          >
            Clear All ({recentRuns.length}/20)
          </button>
        )}
      </div>

      {storageError && (
        <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg" role="alert">
          <p className="text-sm text-red-800 dark:text-red-200">{storageError}</p>
        </div>
      )}

      <div className="p-4 space-y-3">
        {recentRuns.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 text-5xl mb-4">📋</div>
            <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
              No recent runs yet
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Your recent webhook calls will appear here
            </p>
          </div>
        ) : (
          recentRuns.slice(0, 20).map((run) => (
            <div
              key={run.id}
              className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden transition-all"
            >
              <div
                onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                className="p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {getTabLabel(run.tab)}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        run.ok
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      }`}
                    >
                      {run.ok ? '✓ Success' : '✗ Failed'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {getRelativeTime(run.ts)}
                  </span>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {run.snippet}
                </p>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedRun(expandedRun === run.id ? null : run.id);
                  }}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline mt-1"
                >
                  {expandedRun === run.id ? '▼ Show less' : '▶ Show details'}
                </button>
              </div>

              {expandedRun === run.id && (
                <div className="px-3 pb-3 space-y-3 border-t border-gray-200 dark:border-gray-600 pt-3">
                  {/* Args preview */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Request Arguments
                    </h4>
                    <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs font-mono text-gray-800 dark:text-gray-200 max-h-32 overflow-y-auto">
                      {Object.entries(run.args).map(([key, value]) => (
                        <div key={key} className="mb-1">
                          <span className="text-primary-600 dark:text-primary-400">{key}:</span>{' '}
                          <span className="text-gray-900 dark:text-gray-100">
                            {typeof value === 'string' && value.length > 50
                              ? value.substring(0, 50) + '...'
                              : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Full timestamp */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Timestamp
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {new Date(run.ts).toLocaleString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleRehydrate(run)}
                      className="btn-secondary text-xs flex-1 py-2"
                      title="Fill form with these values without running"
                    >
                      🔄 Rehydrate
                    </button>
                    <button
                      onClick={() => handleRunAgain(run)}
                      className="btn-primary text-xs flex-1 py-2"
                      title="Fill form and execute immediately"
                    >
                      ▶️ Run Again
                    </button>
                    <button
                      onClick={(e) => handleDelete(run.id, e)}
                      className="btn-secondary text-xs px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Delete this run"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {recentRuns.length > 20 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center italic">
            Showing 20 most recent runs
          </p>
        )}
      </div>
    </div>
  );
}
