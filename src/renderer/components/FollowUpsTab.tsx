import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  FollowUpRow,
  FollowUpStage,
  FollowUpsListResponse,
  EmailThread,
  RecentRun,
} from '../../shared/types';
import { useAppStore } from '../store';
import EmailThreadModal from './EmailThreadModal';

export default function FollowUpsTab() {
  const { addRecentRun } = useAppStore();

  // State
  const [followups, setFollowUps] = useState<FollowUpRow[]>([]);
  const [stats, setStats] = useState<FollowUpsListResponse['data']['stats'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Filters
  const [stageFilter, setStageFilter] = useState<FollowUpStage | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'replied' | 'closed'>('all');

  // Thread modal state
  const [threadModalOpen, setThreadModalOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);

  // API helper
  async function apiCall(path: string, body: any): Promise<any> {
    const response = await window.electronAPI.networkRequest('POST', path, body);

    if (!response.ok || response.status >= 300) {
      const errorMsg =
        typeof response.body === 'object' && response.body?.error?.message
          ? response.body.error.message
          : typeof response.body === 'object' && response.body?.error
          ? JSON.stringify(response.body.error)
          : `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    return response.body;
  }

  // Load follow-ups from n8n
  const loadFollowUps = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall('/webhook/followups-list', {
        limit: 50,
        offset: 0,
        stage_filter: stageFilter,
        status_filter: statusFilter,
      });

      if (result.ok && result.data) {
        setFollowUps(result.data.followups || []);
        setStats(result.data.stats || null);

        // Save to recent runs
        const run: RecentRun = {
          id: uuidv4(),
          tab: 'followups',
          args: { stage_filter: stageFilter, status_filter: statusFilter },
          ok: true,
          ts: new Date().toISOString(),
          snippet: `Loaded ${result.data.followups?.length || 0} follow-ups`,
          responseSummary: { count: result.data.followups?.length || 0, stats: result.data.stats },
        };
        await window.electronAPI.addRecentRun(run);
        addRecentRun(run);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (e) {
      const errorMsg = (e as Error).message;
      setError(errorMsg);
      showToast('error', `Failed to load follow-ups: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // View email thread
  const viewThread = async (outboxId: string) => {
    setLoadingThread(true);
    try {
      const result = await apiCall('/webhook/followup-details', {
        outbox_id: outboxId,
      });

      if (result.ok && result.data?.thread) {
        setSelectedThread(result.data.thread);
        setThreadModalOpen(true);
      } else {
        throw new Error('Invalid thread response');
      }
    } catch (e) {
      const errorMsg = (e as Error).message;
      showToast('error', `Failed to load thread: ${errorMsg}`);
    } finally {
      setLoadingThread(false);
    }
  };

  // Perform manual action
  const performAction = async (outboxId: string, action: 'mark_closed' | 'mark_replied' | 'send_now') => {
    try {
      const result = await apiCall('/webhook/followup-action', {
        outbox_id: outboxId,
        action,
      });

      if (result.ok && result.data?.success) {
        showToast('success', result.data.message || 'Action completed');
        setThreadModalOpen(false);
        loadFollowUps(); // Refresh list
      } else {
        throw new Error(result.data?.message || 'Action failed');
      }
    } catch (e) {
      const errorMsg = (e as Error).message;
      showToast('error', `Action failed: ${errorMsg}`);
    }
  };

  // Toast helper
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // Load follow-ups on mount and when filters change
  useEffect(() => {
    loadFollowUps();
  }, [stageFilter, statusFilter]);

  // Helper to format stage label
  const formatStage = (stage: FollowUpStage): string => {
    const labels: Record<FollowUpStage, string> = {
      initial: 'Initial',
      follow_up_1: 'Follow-up 1',
      follow_up_2: 'Follow-up 2',
      follow_up_3: 'Follow-up 3',
      replied: 'Replied',
      closed: 'Closed',
    };
    return labels[stage];
  };

  // Helper to get stage badge colors
  const getStageBadgeClass = (stage: FollowUpStage): string => {
    const classes: Record<FollowUpStage, string> = {
      initial: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      follow_up_1: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      follow_up_2: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
      follow_up_3: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
      replied: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      closed: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
    };
    return classes[stage];
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Follow-ups</h2>
        <button onClick={loadFollowUps} disabled={loading} className="btn-secondary">
          {loading ? '⏳ Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Stats Banner */}
      {stats && !loading && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Emails</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400">Awaiting Reply</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.awaiting_reply}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400">Replied</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.replied}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400">Reply Rate</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.reply_rate.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Stage:</label>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as FollowUpStage | 'all')}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All</option>
            <option value="initial">Initial</option>
            <option value="follow_up_1">Follow-up 1</option>
            <option value="follow_up_2">Follow-up 2</option>
            <option value="follow_up_3">Follow-up 3</option>
            <option value="replied">Replied</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'sent' | 'replied' | 'closed')}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All</option>
            <option value="sent">Sent</option>
            <option value="replied">Replied</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            toast.type === 'success'
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
              : toast.type === 'error'
              ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
          }`}
          role="alert"
        >
          {toast.message}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-red-800 dark:text-red-200 font-semibold">Error</p>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && followups.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 text-5xl mb-4">📨</div>
          <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">No follow-ups found</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {stageFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Send some cold emails to get started with follow-ups'}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && followups.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Days Since Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Reply Snippet
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {followups.map((followup) => (
                  <tr key={followup.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {followup.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {followup.company}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStageBadgeClass(followup.follow_up_stage)}`}>
                        {formatStage(followup.follow_up_stage)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          followup.status === 'replied'
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : followup.status === 'closed'
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                            : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                        }`}
                      >
                        {followup.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {followup.days_since_sent} days
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {followup.reply_snippet || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => viewThread(followup.id)}
                        disabled={loadingThread}
                        className="btn-primary text-xs py-2 px-4"
                      >
                        👁️ View Thread
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Email Thread Modal */}
      {selectedThread && (
        <EmailThreadModal
          isOpen={threadModalOpen}
          thread={selectedThread}
          onClose={() => setThreadModalOpen(false)}
          onAction={performAction}
        />
      )}
    </div>
  );
}
