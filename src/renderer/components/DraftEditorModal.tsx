import { useState } from 'react';

interface DraftEditorModalProps {
  isOpen: boolean;
  email: string;
  company: string;
  subject: string;
  body: string;
  onSubjectChange: (subject: string) => void;
  onBodyChange: (body: string) => void;
  onSend: () => void;
  onRegenerate: () => void;
  onClose: () => void;
  sending?: boolean;
  regenerating?: boolean;
}

export default function DraftEditorModal({
  isOpen,
  email,
  company,
  subject,
  body,
  onSubjectChange,
  onBodyChange,
  onSend,
  onRegenerate,
  onClose,
  sending = false,
  regenerating = false,
}: DraftEditorModalProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  const isValid = subject.trim().length > 0 && body.trim().length > 0;

  const handleSendClick = () => {
    if (isValid) {
      setShowConfirm(true);
    }
  };

  const handleConfirmSend = () => {
    setShowConfirm(false);
    onSend();
  };

  const handleCopySubject = () => {
    navigator.clipboard.writeText(subject);
  };

  const handleCopyBody = () => {
    navigator.clipboard.writeText(body);
  };

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Edit Draft
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Locked Fields */}
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg space-y-2">
              <div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  TO (locked)
                </span>
                <p className="text-sm text-gray-900 dark:text-gray-100">{email}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  COMPANY (locked)
                </span>
                <p className="text-sm text-gray-900 dark:text-gray-100">{company}</p>
              </div>
            </div>

            {/* Subject Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="subject" className="label">
                  Subject Line
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {subject.length} characters
                  </span>
                  <button
                    onClick={handleCopySubject}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
              <input
                id="subject"
                type="text"
                className="input-field"
                value={subject}
                onChange={(e) => onSubjectChange(e.target.value)}
                placeholder="Enter subject line..."
              />
            </div>

            {/* Body Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="body" className="label">
                  Email Body
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {body.length} characters
                  </span>
                  <button
                    onClick={handleCopyBody}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    📋 Copy
                  </button>
                </div>
              </div>
              <textarea
                id="body"
                className="input-field font-mono text-sm"
                rows={12}
                value={body}
                onChange={(e) => onBodyChange(e.target.value)}
                placeholder="Enter email body..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Plain text format (no HTML)
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
            <button
              onClick={onRegenerate}
              disabled={regenerating || sending}
              className="btn-secondary"
            >
              {regenerating ? '⏳ Regenerating...' : '🔄 Regenerate'}
            </button>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={sending}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSendClick}
                disabled={!isValid || sending || regenerating}
                className="btn-primary"
              >
                {sending ? '📧 Sending...' : '📧 Send Email'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Confirm Send
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to send this email to <strong>{email}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSend}
                className="btn-primary"
              >
                Yes, Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
