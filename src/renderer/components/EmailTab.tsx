import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { EmailRequest, EmailResponse, RecentRun } from '../../shared/types';
import { useAppStore } from '../store';

// Local storage keys
const STORAGE_KEYS = {
  EMAIL: 'email-email',
  COMPANY: 'email-company',
  NOTE: 'email-note',
  DRY_RUN: 'email-dryRun',
  WEBHOOK_URL: 'email-webhookUrl',
};

export default function EmailTab() {
  const { addRecentRun } = useAppStore();

  // Load from localStorage
  const [email, setEmail] = useState(() => localStorage.getItem(STORAGE_KEYS.EMAIL) || '');
  const [company, setCompany] = useState(() => localStorage.getItem(STORAGE_KEYS.COMPANY) || '');
  const [note, setNote] = useState(() => localStorage.getItem(STORAGE_KEYS.NOTE) || '');
  const [dryRun, setDryRun] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DRY_RUN);
    return saved ? saved === 'true' : false;
  });
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem(STORAGE_KEYS.WEBHOOK_URL) || '');
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EmailResponse | null>(null);
  const [error, setError] = useState<{ message: string; raw: string } | null>(null);
  const [subjectCopied, setSubjectCopied] = useState(false);

  // Validation errors
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    company: '',
    webhookUrl: '',
  });

  // Persist to localStorage when values change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EMAIL, email);
  }, [email]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMPANY, company);
  }, [company]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTE, note);
  }, [note]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DRY_RUN, dryRun.toString());
  }, [dryRun]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WEBHOOK_URL, webhookUrl);
  }, [webhookUrl]);

  // Listen for rehydration events from RecentRuns
  useEffect(() => {
    const handleRehydrate = (event: Event) => {
      const customEvent = event as CustomEvent<{ tab: string; args: EmailRequest }>;
      const { tab, args } = customEvent.detail;

      if (tab === 'email') {
        // Populate form fields from args
        setEmail(args.email);
        setCompany(args.company);
        setNote(args.note || '');
        setDryRun(args.dryRun);

        // Clear any errors
        setError(null);
        setFieldErrors({ email: '', company: '', webhookUrl: '' });
      }
    };

    const handleRehydrateAndExecute = (event: Event) => {
      const customEvent = event as CustomEvent<{ tab: string; args: EmailRequest }>;
      const { tab } = customEvent.detail;

      if (tab === 'email') {
        // First populate the form
        handleRehydrate(event);

        // Then trigger the send after a short delay
        // to ensure state has updated
        setTimeout(() => {
          handleSend();
        }, 100);
      }
    };

    window.addEventListener('rehydrate-form', handleRehydrate);
    window.addEventListener('rehydrate-and-execute', handleRehydrateAndExecute);

    return () => {
      window.removeEventListener('rehydrate-form', handleRehydrate);
      window.removeEventListener('rehydrate-and-execute', handleRehydrateAndExecute);
    };
  }, []);

  // Email validation regex
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors = {
      email: '',
      company: '',
      webhookUrl: '',
    };

    let isValid = true;

    // Email is required and must be valid format
    if (!email.trim()) {
      errors.email = 'Email is required';
      isValid = false;
    } else if (!isValidEmail(email.trim())) {
      errors.email = 'Invalid email format';
      isValid = false;
    }

    // Company is required
    if (!company.trim()) {
      errors.company = 'Company is required';
      isValid = false;
    }

    // Webhook URL is required
    if (!webhookUrl.trim()) {
      errors.webhookUrl = 'Webhook URL is required to send emails';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  // Check if form is valid for button state
  const isFormValid = (): boolean => {
    return email.trim() !== '' &&
           isValidEmail(email.trim()) &&
           company.trim() !== '' &&
           webhookUrl.trim() !== '';
  };

  const handleSend = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSubjectCopied(false);
    setFieldErrors({ email: '', company: '', webhookUrl: '' });

    try {
      const requestBody: EmailRequest = {
        email: email.trim(),
        company: company.trim(),
        note: note.trim(),
        dryRun,
      };

      // Use the configured webhook URL via IPC (bypasses CSP restrictions)
      const response = await window.electronAPI.networkRequest(
        'POST',
        webhookUrl, // Pass full URL - network handler will detect and use it as-is
        requestBody
      );

      const timestamp = new Date().toISOString();

      if (response.ok && response.body) {
        const data = response.body as EmailResponse;
        setResult(data);

        // Save to recent runs
        const run: RecentRun = {
          id: uuidv4(),
          tab: 'email',
          args: requestBody,
          ok: true,
          ts: timestamp,
          snippet: `sent=${data.data.sent}`,
          responseSummary: {
            email: data.data.email,
            sent: data.data.sent,
            subject: data.data.subject,
          },
        };
        await window.electronAPI.addRecentRun(run);
        addRecentRun(run);
      } else {
        // Handle error response from IPC
        const errorMsg = typeof response.body === 'object' && response.body
          ? JSON.stringify(response.body, null, 2)
          : response.raw || 'Unknown error';

        setError({
          message: `Request failed with status ${response.status}`,
          raw: errorMsg,
        });

        // Save failed run
        const run: RecentRun = {
          id: uuidv4(),
          tab: 'email',
          args: requestBody,
          ok: false,
          ts: timestamp,
          snippet: 'error',
          responseSummary: { error: errorMsg },
        };
        await window.electronAPI.addRecentRun(run);
        addRecentRun(run);
      }
    } catch (err) {
      setError({
        message: 'Network error - Unable to reach webhook',
        raw: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    handleSend();
  };

  const handleCopySubject = async () => {
    if (result?.data.subject) {
      await navigator.clipboard.writeText(result.data.subject);
      setSubjectCopied(true);
      setTimeout(() => setSubjectCopied(false), 2000);
    }
  };

  const handleOpenAirtableOutbox = (outboxLink?: string) => {
    if (outboxLink) {
      window.electronAPI.openExternal(outboxLink);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Input Panel */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Cold Email Outreach</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="label">
              Recipient Email <span className="text-red-500" aria-label="required">*</span>
            </label>
            <input
              id="email"
              type="email"
              className={`input-field ${fieldErrors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="contact@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors({ ...fieldErrors, email: '' });
                }
              }}
              disabled={loading}
              aria-required="true"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
            {fieldErrors.email && (
              <p id="email-error" className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="company" className="label">
              Company Name <span className="text-red-500" aria-label="required">*</span>
            </label>
            <input
              id="company"
              type="text"
              className={`input-field ${fieldErrors.company ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="ACME Inc."
              value={company}
              onChange={(e) => {
                setCompany(e.target.value);
                if (fieldErrors.company) {
                  setFieldErrors({ ...fieldErrors, company: '' });
                }
              }}
              disabled={loading}
              aria-required="true"
              aria-invalid={!!fieldErrors.company}
              aria-describedby={fieldErrors.company ? 'company-error' : undefined}
            />
            {fieldErrors.company && (
              <p id="company-error" className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                {fieldErrors.company}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="note" className="label">
              Notes (optional)
            </label>
            <textarea
              id="note"
              className="input-field"
              rows={3}
              placeholder="Add context or specific talking points..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="dryRun"
              type="checkbox"
              className="w-5 h-5 text-primary-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              disabled={loading}
            />
            <label htmlFor="dryRun" className="text-sm font-medium cursor-pointer">
              Dry Run (preview only, don't send)
            </label>
          </div>

          {dryRun && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg text-sm">
              <p className="font-semibold text-blue-800 dark:text-blue-200">ℹ️ Dry Run Mode</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                The webhook will be called but no email will be sent. You'll see a preview of the email that would be sent.
              </p>
            </div>
          )}

          {/* Webhook Configuration */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowWebhookConfig(!showWebhookConfig)}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-2"
            >
              {showWebhookConfig ? '▼' : '▶'} Configure Webhook URL
            </button>

            {showWebhookConfig && (
              <div className="mt-3">
                <label htmlFor="webhookUrl" className="label text-xs">
                  Cold Email Webhook URL <span className="text-red-500" aria-label="required">*</span>
                </label>
                <input
                  id="webhookUrl"
                  type="url"
                  className={`input-field text-sm ${fieldErrors.webhookUrl ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="https://your-n8n-server.com/webhook/cold-email"
                  value={webhookUrl}
                  onChange={(e) => {
                    setWebhookUrl(e.target.value);
                    if (fieldErrors.webhookUrl) {
                      setFieldErrors({ ...fieldErrors, webhookUrl: '' });
                    }
                  }}
                  disabled={loading}
                  aria-required="true"
                  aria-invalid={!!fieldErrors.webhookUrl}
                  aria-describedby={fieldErrors.webhookUrl ? 'webhookUrl-error' : 'webhookUrl-help'}
                />
                {fieldErrors.webhookUrl && (
                  <p id="webhookUrl-error" className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                    {fieldErrors.webhookUrl}
                  </p>
                )}
                <p id="webhookUrl-help" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This URL is saved locally and will be used for all email requests
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={loading || !isFormValid()}
            className="btn-primary w-full text-lg py-4"
            aria-busy={loading}
          >
            {loading ? 'Processing...' : dryRun ? '🔍 Preview Email' : '📧 Send Email'}
          </button>
        </div>
      </div>

      {/* Results Panel */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Email Status</h3>

        {/* Initial Empty State */}
        {!result && !error && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 text-5xl mb-4">📧</div>
            <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
              No email sent yet
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              Fill in the form and click "Send Email" or "Preview Email" to see results
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
              <p>💡 Tip: Use Dry Run mode to preview without sending</p>
              <p>💡 Tip: Configure the webhook URL in the settings below</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-pulse text-gray-400 dark:text-gray-500 text-5xl mb-4">⏳</div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Processing request...
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Calling webhook and generating email
            </p>
          </div>
        )}

        {/* Error Banner with Retry */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4" role="alert">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <span className="text-red-600 dark:text-red-400 text-xl">⚠️</span>
                <div>
                  <h4 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                    {error.message}
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap">
                    {error.raw}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={handleRetry}
              className="btn-secondary text-sm w-full"
              disabled={loading}
            >
              🔄 Retry
            </button>
          </div>
        )}

        {/* Success Result */}
        {result && (
          <div className="space-y-4">
            {/* Status */}
            <div
              className={`p-4 rounded-lg ${
                result.data.sent
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">
                    {result.data.sent ? '✓ Email Sent Successfully' : '👁 Preview Only (Dry Run)'}
                  </p>
                  <p className="text-xs mt-1">To: {result.data.email}</p>
                </div>
                <div className="text-3xl">{result.data.sent ? '📧' : '🔍'}</div>
              </div>
            </div>

            {/* Subject Preview */}
            {result.data.subject && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">Subject Line</h4>
                  <button
                    onClick={handleCopySubject}
                    className={`btn-secondary text-sm transition-all ${
                      subjectCopied
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : ''
                    }`}
                    aria-label="Copy subject line to clipboard"
                  >
                    {subjectCopied ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                  <p className="text-sm text-gray-900 dark:text-gray-100">{result.data.subject}</p>
                </div>
              </div>
            )}

            {/* Dedupe Key */}
            {result.data.dedupe && (
              <div>
                <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Dedupe Key</h4>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                  <p className="text-xs font-mono text-gray-900 dark:text-gray-100 break-all">
                    {result.data.dedupe}
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Used to prevent duplicate emails to the same recipient
                </p>
              </div>
            )}

            {/* Airtable Outbox Link - Only show if email was sent and link exists */}
            {result.data.sent && (result as any).data.airtableOutboxLink && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleOpenAirtableOutbox((result as any).data.airtableOutboxLink)}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  📊 Open Airtable Outbox
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  View this email in your Airtable outbox
                </p>
              </div>
            )}

            {/* Dry Run Info - No Airtable link */}
            {!result.data.sent && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    ℹ️ Dry run mode - No Airtable record created
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Uncheck "Dry Run" to actually send the email
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
