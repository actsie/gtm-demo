import { useState } from 'react';
import { EmailThread } from '../../shared/types';

interface EmailThreadModalProps {
  isOpen: boolean;
  thread: EmailThread;
  onClose: () => void;
  onAction: (outboxId: string, action: 'mark_closed' | 'mark_replied' | 'send_now') => void;
}

export default function EmailThreadModal({ isOpen, thread, onClose, onAction }: EmailThreadModalProps) {
  const [showConfirm, setShowConfirm] = useState<'close' | 'send_now' | null>(null);

  if (!isOpen) return null;

  const handleActionClick = (action: 'mark_closed' | 'send_now') => {
    setShowConfirm(action === 'mark_closed' ? 'close' : 'send_now');
  };

  const handleConfirmAction = () => {
    if (showConfirm === 'close') {
      onAction(thread.original.id, 'mark_closed');
    } else if (showConfirm === 'send_now') {
      onAction(thread.original.id, 'send_now');
    }
    setShowConfirm(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStageLabel = (stage: string): string => {
    const labels: Record<string, string> = {
      initial: 'Original Email',
      follow_up_1: 'Follow-up 1 (Day 3)',
      follow_up_2: 'Follow-up 2 (Day 7)',
      follow_up_3: 'Follow-up 3 (Day 14)',
      replied: 'Replied',
      closed: 'Closed',
    };
    return labels[stage] || stage;
  };

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Email Thread</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Body - Scrollable Timeline */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Original Email */}
            <div className="relative pl-8 pb-6">
              {/* Timeline dot */}
              <div className="absolute left-0 top-2 w-4 h-4 rounded-full bg-blue-500"></div>
              {/* Timeline line */}
              {(thread.followups.length > 0 || thread.reply) && (
                <div className="absolute left-[7px] top-6 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
              )}

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                    {getStageLabel(thread.original.stage)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(thread.original.sent_at)}
                  </span>
                </div>
                <div className="mb-2">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Subject: {thread.original.subject}
                  </div>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                  {thread.original.body}
                </div>
              </div>
            </div>

            {/* Follow-up Emails */}
            {thread.followups.map((followup, index) => (
              <div key={followup.id} className="relative pl-8 pb-6">
                {/* Timeline dot */}
                <div className="absolute left-0 top-2 w-4 h-4 rounded-full bg-purple-500"></div>
                {/* Timeline line */}
                {(index < thread.followups.length - 1 || thread.reply) && (
                  <div className="absolute left-[7px] top-6 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
                )}

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                      {getStageLabel(followup.stage)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(followup.sent_at)}
                    </span>
                  </div>
                  <div className="mb-2">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Subject: {followup.subject}
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                    {followup.body}
                  </div>
                </div>
              </div>
            ))}

            {/* Reply from Prospect */}
            {thread.reply && (
              <div className="relative pl-8">
                {/* Timeline dot */}
                <div className="absolute left-0 top-2 w-4 h-4 rounded-full bg-green-500"></div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                      ✉️ Prospect Replied
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(thread.reply.replied_at)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                    {thread.reply.reply_body}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer - Action Buttons */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>

            <div className="flex gap-3">
              {!thread.reply && (
                <>
                  <button onClick={() => handleActionClick('send_now')} className="btn-primary text-sm">
                    📧 Send Follow-up Now
                  </button>
                  <button onClick={() => handleActionClick('close')} className="btn-secondary text-sm">
                    🚫 Mark as Closed
                  </button>
                </>
              )}
              {thread.reply && (
                <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                  ✅ Prospect has replied - follow-ups stopped
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {showConfirm === 'close' ? 'Mark as Closed?' : 'Send Follow-up Now?'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {showConfirm === 'close'
                ? 'This will stop all automated follow-ups for this email thread. You can always manually send another email later.'
                : 'This will send the next scheduled follow-up immediately, bypassing the normal waiting period.'}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowConfirm(null)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleConfirmAction} className="btn-primary">
                {showConfirm === 'close' ? 'Yes, Close' : 'Yes, Send Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
