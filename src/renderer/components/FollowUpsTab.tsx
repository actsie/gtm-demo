import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  FollowUpRow,
  FollowUpStage,
  FollowUpsListResponse,
  EmailThread,
  RecentRun,
  Draft,
  DraftsListResponse,
} from '../../shared/types';
import { useAppStore } from '../store';
import EmailThreadModal from './EmailThreadModal';
import DraftReviewModal from './DraftReviewModal';
import DraftThreadModal from './DraftThreadModal';

type TabType = 'pending' | 'sent';

export default function FollowUpsTab() {
  const { addRecentRun } = useAppStore();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  // Pending Drafts State
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftStats, setDraftStats] = useState<DraftsListResponse['data']['stats']>({
    pending_review: 0,
    approved: 0,
    due_today: 0,
    overdue: 0,
  });
  const [draftStatusFilter, setDraftStatusFilter] = useState<'needs_review' | 'ready' | 'all'>('needs_review');
  const [draftUrgencyFilter, setDraftUrgencyFilter] = useState<'all' | 'due_today' | 'overdue'>('all');
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<Draft | null>(null);
  const [processing, setProcessing] = useState(false);

  // Thread modal state
  const [draftThreadModalOpen, setDraftThreadModalOpen] = useState(false);
  const [selectedThreadDrafts, setSelectedThreadDrafts] = useState<Draft[]>([]);

  // Sent Emails State (existing)
  const [followups, setFollowUps] = useState<FollowUpRow[]>([]);
  const [stats, setStats] = useState<FollowUpsListResponse['data']['stats'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Filters (for sent emails tab)
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

  // Load pending drafts from n8n
  const loadDrafts = async () => {
    setDraftsLoading(true);
    setError(null);

    try {
      const result = await apiCall('/webhook/drafts-list', {
        status_filter: draftStatusFilter,
        urgency_filter: draftUrgencyFilter,
        limit: 100,
        offset: 0,
      });

      if (result.ok && result.data) {
        setDrafts(result.data.drafts || []);
        setDraftStats(result.data.stats || {
          pending_review: 0,
          approved: 0,
          due_today: 0,
          overdue: 0,
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (e) {
      const errorMsg = (e as Error).message;
      setError(errorMsg);
      showToast('error', `Failed to load drafts: ${errorMsg}`);
    } finally {
      setDraftsLoading(false);
    }
  };

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

  // Handle draft actions
  const handleDraftAction = async (draftId: string, action: string, updates?: {subject: string, body: string}) => {
    setProcessing(true);
    try {
      const result = await apiCall('/webhook/draft-action', {
        draft_id: draftId,
        action,
        ...updates,
      });

      if (result.ok && result.data?.success) {
        showToast('success', result.data.message || 'Draft updated');

        // Update local draft state immediately for thread modal
        if (draftThreadModalOpen && selectedThreadDrafts.length > 0) {
          // Update the draft status locally
          const updatedDrafts = selectedThreadDrafts.map(draft => {
            if (draft.id === draftId) {
              return {
                ...draft,
                status: action === 'mark_ready' || action === 'edit_and_save' ? 'ready' as const :
                        action === 'skip' ? 'skipped' as const : draft.status,
                subject: updates?.subject || draft.subject,
                body: updates?.body || draft.body,
                is_edited: updates ? true : draft.is_edited,
              };
            }
            return draft;
          });
          setSelectedThreadDrafts(updatedDrafts);

          // Refresh list in background (don't close modal)
          loadDrafts();
        } else {
          // For single draft review modal, close it
          setReviewModalOpen(false);
          loadDrafts();
        }
      } else {
        throw new Error(result.data?.message || 'Action failed');
      }
    } catch (e) {
      const errorMsg = (e as Error).message;
      showToast('error', `Draft action failed: ${errorMsg}`);
    } finally {
      setProcessing(false);
    }
  };

  // Group drafts by prospect (for thread view)
  const groupDraftsByProspect = () => {
    const grouped: Record<string, Draft[]> = {};
    drafts.forEach(draft => {
      const key = draft.prospect_id || `${draft.email}-${draft.company}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(draft);
    });
    return Object.values(grouped);
  };

  // Open thread modal with drafts for a specific prospect
  const openThreadModal = (prospectDrafts: Draft[]) => {
    setSelectedThreadDrafts(prospectDrafts);
    setDraftThreadModalOpen(true);
  };

  // Get status summary for a prospect
  const getProspectStatusSummary = (prospectDrafts: Draft[]) => {
    const pending = prospectDrafts.filter(d => d.status === 'needs_review').length;
    const ready = prospectDrafts.filter(d => d.status === 'ready').length;
    const sent = prospectDrafts.filter(d => d.status === 'sent').length;
    const skipped = prospectDrafts.filter(d => d.status === 'skipped').length;

    const parts: string[] = [];
    if (pending > 0) parts.push(`${pending} pending`);
    if (ready > 0) parts.push(`${ready} ready`);
    if (sent > 0) parts.push(`${sent} sent`);
    if (skipped > 0) parts.push(`${skipped} skipped`);

    return parts.join(', ') || 'No drafts';
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

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'pending') {
      loadDrafts();
    } else {
      loadFollowUps();
    }
  }, [activeTab]);

  // Reload when filters change (sent tab only)
  useEffect(() => {
    if (activeTab === 'sent') {
      loadFollowUps();
    }
  }, [stageFilter, statusFilter]);

  // Reload when draft filters change
  useEffect(() => {
    if (activeTab === 'pending') {
      loadDrafts();
    }
  }, [draftStatusFilter, draftUrgencyFilter]);

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

  // Helper to format draft stage label
  const getDraftStageLabel = (stage: string): string => {
    const labels: Record<string, string> = {
      follow_up_1: 'FU#1 (Day 3)',
      follow_up_2: 'FU#2 (Day 7)',
      follow_up_3: 'FU#3 (Day 14)',
    };
    return labels[stage] || stage;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Tabs */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Follow-ups</h2>
          <button
            onClick={() => activeTab === 'pending' ? loadDrafts() : loadFollowUps()}
            disabled={draftsLoading || loading}
            className="btn-secondary"
          >
            {(draftsLoading || loading) ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'pending'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Pending Review
            {draftStats.pending_review > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded-full text-xs">
                {draftStats.pending_review}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'sent'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Sent Emails
          </button>
        </div>
      </div>

      {/* Pending Review Tab */}
      {activeTab === 'pending' && (
        <>
          {/* Draft Stats Banner - Clickable Filters */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <button
              onClick={() => {
                setDraftStatusFilter('all');
                setDraftUrgencyFilter('all');
              }}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-left transition-all hover:shadow-md ${
                draftStatusFilter === 'all' && draftUrgencyFilter === 'all'
                  ? 'ring-2 ring-primary-500 dark:ring-primary-400'
                  : ''
              }`}
            >
              <div className="text-sm text-gray-600 dark:text-gray-400">All Drafts</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {draftStats.pending_review + draftStats.approved}
              </div>
            </button>
            <button
              onClick={() => {
                setDraftStatusFilter('needs_review');
                setDraftUrgencyFilter('all');
              }}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-left transition-all hover:shadow-md ${
                draftStatusFilter === 'needs_review' && draftUrgencyFilter === 'all'
                  ? 'ring-2 ring-primary-500 dark:ring-primary-400'
                  : ''
              }`}
            >
              <div className="text-sm text-gray-600 dark:text-gray-400">Pending Review</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{draftStats.pending_review}</div>
            </button>
            <button
              onClick={() => {
                setDraftStatusFilter('ready');
                setDraftUrgencyFilter('all');
              }}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-left transition-all hover:shadow-md ${
                draftStatusFilter === 'ready' && draftUrgencyFilter === 'all'
                  ? 'ring-2 ring-primary-500 dark:ring-primary-400'
                  : ''
              }`}
            >
              <div className="text-sm text-gray-600 dark:text-gray-400">Approved & Ready</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{draftStats.approved}</div>
            </button>
            <button
              onClick={() => {
                setDraftStatusFilter('all');
                setDraftUrgencyFilter('due_today');
              }}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-left transition-all hover:shadow-md ${
                draftUrgencyFilter === 'due_today'
                  ? 'ring-2 ring-yellow-500 dark:ring-yellow-400'
                  : ''
              }`}
            >
              <div className="text-sm text-gray-600 dark:text-gray-400">Due Today</div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{draftStats.due_today}</div>
            </button>
            <button
              onClick={() => {
                setDraftStatusFilter('all');
                setDraftUrgencyFilter('overdue');
              }}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-left transition-all hover:shadow-md ${
                draftUrgencyFilter === 'overdue'
                  ? 'ring-2 ring-red-500 dark:ring-red-400'
                  : ''
              }`}
            >
              <div className="text-sm text-gray-600 dark:text-gray-400">Overdue</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{draftStats.overdue}</div>
            </button>
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
          {error && !draftsLoading && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-800 dark:text-red-200 font-semibold">Error</p>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {!draftsLoading && drafts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 text-5xl mb-4">—</div>
              <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
                No drafts pending review
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Drafts will appear here after sending cold emails
              </p>
            </div>
          )}

          {/* Thread View - Grouped by Prospect */}
          {!draftsLoading && drafts.length > 0 && (
            <div className="space-y-3">
              {groupDraftsByProspect().map((prospectDrafts) => {
                const firstDraft = prospectDrafts[0];
                const hasOverdue = prospectDrafts.some(d => d.is_overdue);
                const hasDueToday = prospectDrafts.some(d => d.is_due_today);

                return (
                  <div
                    key={firstDraft.prospect_id || `${firstDraft.email}-${firstDraft.company}`}
                    className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 ${
                      hasOverdue
                        ? 'border-red-500'
                        : hasDueToday
                        ? 'border-yellow-500'
                        : 'border-purple-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {firstDraft.company}
                          </h3>
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-xs font-medium">
                            {prospectDrafts.length} follow-up{prospectDrafts.length !== 1 ? 's' : ''}
                          </span>
                          {hasOverdue && (
                            <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-xs font-medium">
                              Overdue
                            </span>
                          )}
                          {!hasOverdue && hasDueToday && (
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-xs font-medium">
                              Due Today
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          To: {firstDraft.email}
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Status:</strong> {getProspectStatusSummary(prospectDrafts)}
                        </div>
                      </div>
                      <button
                        onClick={() => openThreadModal(prospectDrafts)}
                        className="btn-primary text-sm"
                      >
                        View Thread
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Sent Emails Tab */}
      {activeTab === 'sent' && (
        <>
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
                        View Thread
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

        </>
      )}

      {/* Draft Review Modal */}
      {currentDraft && (
        <DraftReviewModal
          isOpen={reviewModalOpen}
          draft={currentDraft}
          onClose={() => setReviewModalOpen(false)}
          onAction={handleDraftAction}
          processing={processing}
        />
      )}

      {/* Draft Thread Modal */}
      {selectedThreadDrafts.length > 0 && (
        <DraftThreadModal
          isOpen={draftThreadModalOpen}
          drafts={selectedThreadDrafts}
          onClose={() => setDraftThreadModalOpen(false)}
          onAction={handleDraftAction}
          processing={processing}
        />
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
