import { useState, useEffect } from 'react';
import { Draft } from '../../shared/types';

interface DraftThreadModalProps {
  isOpen: boolean;
  drafts: Draft[]; // All 3 drafts for one prospect
  onClose: () => void;
  onAction: (draftId: string, action: string, updates?: { subject: string; body: string }) => Promise<void>;
  processing: boolean;
}

interface DraftEditState {
  id: string;
  subject: string;
  body: string;
  originalSubject: string;
  originalBody: string;
  hasChanges: boolean;
}

export default function DraftThreadModal({
  isOpen,
  drafts,
  onClose,
  onAction,
  processing,
}: DraftThreadModalProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [editStates, setEditStates] = useState<Record<string, DraftEditState>>({});
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [showSkipConfirmation, setShowSkipConfirmation] = useState<string | null>(null);

  // Initialize edit states when drafts change
  useEffect(() => {
    const states: Record<string, DraftEditState> = {};
    drafts.forEach(draft => {
      states[draft.id] = {
        id: draft.id,
        subject: draft.subject,
        body: draft.body,
        originalSubject: draft.subject,
        originalBody: draft.body,
        hasChanges: false,
      };
    });
    setEditStates(states);
    setShowOriginal(false);
  }, [JSON.stringify(drafts.map(d => ({ id: d.id, subject: d.subject, body: d.body, status: d.status })))]); // Reset when drafts change

  if (!isOpen) return null;

  // Sort drafts by stage (FU#1, FU#2, FU#3)
  const sortedDrafts = [...drafts].sort((a, b) => {
    const order = { follow_up_1: 1, follow_up_2: 2, follow_up_3: 3 };
    return order[a.stage] - order[b.stage];
  });

  // Get original email from first draft
  const originalEmail = sortedDrafts[0];

  const getDraftStageLabel = (stage: string): string => {
    const labels: Record<string, string> = {
      follow_up_1: 'Follow-up #1 (Day 3)',
      follow_up_2: 'Follow-up #2 (Day 7)',
      follow_up_3: 'Follow-up #3 (Day 14)',
    };
    return labels[stage] || stage;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'ready') {
      return <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">Ready</span>;
    }
    if (status === 'skipped') {
      return <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-xs font-medium">Skipped</span>;
    }
    if (status === 'sent') {
      return <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium">Sent</span>;
    }
    return <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-xs font-medium">Pending Review</span>;
  };

  const handleEdit = (draftId: string, field: 'subject' | 'body', value: string) => {
    setEditStates(prev => {
      const current = prev[draftId];
      const newValue = { ...current, [field]: value };
      newValue.hasChanges =
        newValue.subject !== newValue.originalSubject ||
        newValue.body !== newValue.originalBody;
      return { ...prev, [draftId]: newValue };
    });
  };

  const handleDiscardChanges = (draftId: string) => {
    setEditStates(prev => ({
      ...prev,
      [draftId]: {
        ...prev[draftId],
        subject: prev[draftId].originalSubject,
        body: prev[draftId].originalBody,
        hasChanges: false,
      },
    }));
  };

  const handleSaveAndMarkReady = async (draftId: string) => {
    const state = editStates[draftId];
    await onAction(draftId, 'edit_and_save', {
      subject: state.subject,
      body: state.body,
    });
  };

  const handleMarkReady = async (draftId: string) => {
    await onAction(draftId, 'mark_ready');
  };

  const handleSkip = async (draftId: string) => {
    setShowSkipConfirmation(null);
    await onAction(draftId, 'skip');
  };

  const handleRegenerate = async (draftId: string) => {
    // This will need a new endpoint on Mac Mini to regenerate the follow-up
    // For now, we'll show a placeholder - you'll need to implement the backend
    await onAction(draftId, 'regenerate');
  };

  const handleCloseAttempt = () => {
    const hasUnsavedChanges = Object.values(editStates).some(state => state.hasChanges);
    if (hasUnsavedChanges) {
      setShowCloseConfirmation(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowCloseConfirmation(false);
    onClose();
  };

  // Check if any drafts have unsaved changes
  const hasAnyUnsavedChanges = Object.values(editStates).some(state => state.hasChanges);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {originalEmail.company}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {originalEmail.email}
              </p>
            </div>
            <button
              onClick={handleCloseAttempt}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
              disabled={processing}
            >
              ×
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Original Email Context */}
            <div className="border-l-4 border-gray-300 dark:border-gray-600 pl-4">
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-2"
              >
                {showOriginal ? '▼' : '▶'} Original Email Context
              </button>
              {showOriginal && (
                <div className="mt-3 space-y-2 text-sm">
                  <div>
                    <strong className="text-gray-700 dark:text-gray-300">Subject:</strong>
                    <p className="text-gray-600 dark:text-gray-400">{originalEmail.original_subject}</p>
                  </div>
                  <div>
                    <strong className="text-gray-700 dark:text-gray-300">Body:</strong>
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{originalEmail.original_body}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Follow-up Drafts */}
            {sortedDrafts.map((draft, index) => {
              const state = editStates[draft.id] || {
                subject: draft.subject,
                body: draft.body,
                originalSubject: draft.subject,
                originalBody: draft.body,
                hasChanges: false,
              };

              const isReadOnly = draft.status === 'sent' || draft.status === 'skipped';

              return (
                <div key={draft.id} className="border-l-4 border-purple-500 dark:border-purple-400 pl-4">
                  {/* Draft Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {getDraftStageLabel(draft.stage)}
                      </h3>
                      {getStatusBadge(draft.status)}
                      {draft.is_edited && !state.hasChanges && (
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-xs">
                          Edited
                        </span>
                      )}
                      {state.hasChanges && (
                        <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full text-xs">
                          Unsaved changes
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {draft.is_overdue ? (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          Overdue by {Math.abs(draft.days_until_due!)} days
                        </span>
                      ) : draft.is_due_today ? (
                        <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                          Due today
                        </span>
                      ) : (
                        <span>Due in {draft.days_until_due} days</span>
                      )}
                    </div>
                  </div>

                  {/* Draft Content - Always Editable (unless sent/skipped) */}
                  <div className="space-y-3">
                    {/* Subject */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        value={state.subject}
                        onChange={(e) => handleEdit(draft.id, 'subject', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500"
                        disabled={processing || isReadOnly}
                      />
                    </div>

                    {/* Body */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email Body
                      </label>
                      <textarea
                        value={state.body}
                        onChange={(e) => handleEdit(draft.id, 'body', e.target.value)}
                        rows={8}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500"
                        disabled={processing || isReadOnly}
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                      {/* Read-only states (sent/skipped) */}
                      {draft.status === 'skipped' && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Skipped - will not be sent
                        </div>
                      )}

                      {draft.status === 'sent' && (
                        <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                          Sent on {draft.sent_at ? new Date(draft.sent_at).toLocaleDateString() : 'unknown date'}
                        </div>
                      )}

                      {/* Editable states */}
                      {!isReadOnly && (
                        <>
                          {/* CASE 1: Draft needs review + has changes */}
                          {draft.status === 'needs_review' && state.hasChanges && (
                            <>
                              <button
                                onClick={() => handleSaveAndMarkReady(draft.id)}
                                disabled={processing}
                                className="btn-primary text-sm"
                              >
                                Save & Mark as Ready
                              </button>
                              <button
                                onClick={() => handleDiscardChanges(draft.id)}
                                disabled={processing}
                                className="btn-secondary text-sm"
                              >
                                Discard Changes
                              </button>
                              <div className="relative group">
                                <button
                                  onClick={() => setShowSkipConfirmation(draft.id)}
                                  disabled={processing}
                                  className="text-sm px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                >
                                  Skip
                                </button>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                                  Mark this follow-up as skipped - it won't be sent
                                </div>
                              </div>
                            </>
                          )}

                          {/* CASE 2: Draft needs review + NO changes */}
                          {draft.status === 'needs_review' && !state.hasChanges && (
                            <>
                              <button
                                onClick={() => handleMarkReady(draft.id)}
                                disabled={processing}
                                className="btn-primary text-sm"
                              >
                                Mark as Ready
                              </button>
                              <button
                                onClick={() => handleRegenerate(draft.id)}
                                disabled={processing}
                                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                              >
                                Regenerate
                              </button>
                              <div className="relative group">
                                <button
                                  onClick={() => setShowSkipConfirmation(draft.id)}
                                  disabled={processing}
                                  className="text-sm px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                >
                                  Skip
                                </button>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                                  Mark this follow-up as skipped - it won't be sent
                                </div>
                              </div>
                            </>
                          )}

                          {/* CASE 3: Draft is ready + has changes */}
                          {draft.status === 'ready' && state.hasChanges && (
                            <>
                              <button
                                onClick={() => handleSaveAndMarkReady(draft.id)}
                                disabled={processing}
                                className="btn-primary text-sm"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => handleDiscardChanges(draft.id)}
                                disabled={processing}
                                className="btn-secondary text-sm"
                              >
                                Discard Changes
                              </button>
                            </>
                          )}

                          {/* CASE 4: Draft is ready + NO changes */}
                          {draft.status === 'ready' && !state.hasChanges && (
                            <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                              Ready to send on {new Date(draft.due_date).toLocaleDateString()}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Divider between drafts (except last) */}
                  {index < sortedDrafts.length - 1 && (
                    <div className="mt-6 border-t border-gray-200 dark:border-gray-700"></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            {hasAnyUnsavedChanges && (
              <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                You have unsaved changes
              </div>
            )}
            <div className="ml-auto">
              <button
                onClick={handleCloseAttempt}
                disabled={processing}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Confirmation Modal */}
      {showCloseConfirmation && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Unsaved Changes
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You have unsaved changes. Are you sure you want to close? All changes will be lost.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCloseConfirmation(false)}
                className="btn-secondary"
              >
                Keep Editing
              </button>
              <button
                onClick={handleConfirmClose}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Discard & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Skip Confirmation Modal */}
      {showSkipConfirmation && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Skip this follow-up?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              This follow-up will be marked as skipped and won't be sent on{' '}
              <strong>{new Date(drafts.find(d => d.id === showSkipConfirmation)?.due_date || '').toLocaleDateString()}</strong>.
            </p>
            {editStates[showSkipConfirmation]?.hasChanges && (
              <p className="text-orange-600 dark:text-orange-400 text-sm mb-6">
                Any unsaved changes will be discarded.
              </p>
            )}
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowSkipConfirmation(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSkip(showSkipConfirmation)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Skip Follow-up
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
