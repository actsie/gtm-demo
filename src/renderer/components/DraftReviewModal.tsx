import { useState } from 'react';
import { Draft } from '../../shared/types';

interface DraftReviewModalProps {
  isOpen: boolean;
  draft: Draft;
  onClose: () => void;
  onAction: (draftId: string, action: string, updates?: {subject: string, body: string}) => void;
  processing: boolean;
}

export default function DraftReviewModal({
  isOpen,
  draft,
  onClose,
  onAction,
  processing
}: DraftReviewModalProps) {
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [showOriginal, setShowOriginal] = useState(false);
  const [edited, setEdited] = useState(false);

  if (!isOpen) return null;

  const handleSubjectChange = (value: string) => {
    setSubject(value);
    setEdited(true);
  };

  const handleBodyChange = (value: string) => {
    setBody(value);
    setEdited(true);
  };

  const handleMarkReady = () => {
    if (edited) {
      onAction(draft.id, 'edit_and_save', { subject, body });
    } else {
      onAction(draft.id, 'mark_ready');
    }
  };

  const handleSkip = () => {
    onAction(draft.id, 'skip');
  };

  const getStageLabel = (stage: string): string => {
    const labels: Record<string, string> = {
      follow_up_1: 'Follow-up #1 (Day 3)',
      follow_up_2: 'Follow-up #2 (Day 7)',
      follow_up_3: 'Follow-up #3 (Day 14)'
    };
    return labels[stage] || stage;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Review Follow-up Draft
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full font-medium">
                {getStageLabel(draft.stage)}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                To: {draft.email} ({draft.company})
              </span>
              <span className={`ml-auto font-medium ${
                draft.is_overdue
                  ? 'text-red-600 dark:text-red-400'
                  : draft.is_due_today
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {draft.is_overdue
                  ? `Overdue by ${Math.abs(draft.days_until_due!)} days`
                  : draft.is_due_today
                  ? 'Due today'
                  : `Due in ${draft.days_until_due} days`
                }
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Original Email Context */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
              >
                <span>📧 Original Email Context</span>
                <span>{showOriginal ? '▼' : '▶'}</span>
              </button>
              {showOriginal && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="mb-2">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Subject:</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">{draft.original_subject}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Body:</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-3 rounded font-mono max-h-40 overflow-y-auto">
                      {draft.original_body}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Editable Subject */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Subject:
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Editable Body */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Body:
              </label>
              <textarea
                value={body}
                onChange={(e) => handleBodyChange(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
              />
            </div>

            {edited && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200">
                ✏️ You've edited this draft. It will be saved when you mark it as ready.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button
              onClick={handleSkip}
              disabled={processing}
              className="btn-secondary"
            >
              🚫 Skip This Follow-up
            </button>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={processing}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkReady}
                disabled={processing}
                className="btn-primary"
              >
                {processing ? '⏳ Processing...' : edited ? '✅ Save & Mark Ready' : '✅ Mark as Ready'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
