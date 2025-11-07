import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DraftsRequest, DraftsResponse, RecentRun } from '../../shared/types';
import { useAppStore } from '../store';

// Local storage keys
const STORAGE_KEYS = {
  PLATFORM: 'drafts-platform',
  ANGLE: 'drafts-angle',
};

export default function DraftsTab() {
  const { addRecentRun } = useAppStore();

  // Load from localStorage
  const [platform, setPlatform] = useState<'Twitter' | 'LinkedIn' | 'Reddit'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PLATFORM);
    return (saved as 'Twitter' | 'LinkedIn' | 'Reddit') || 'Twitter';
  });
  const [postUrl, setPostUrl] = useState('');
  const [postText, setPostText] = useState('');
  const [angle, setAngle] = useState(() => localStorage.getItem(STORAGE_KEYS.ANGLE) || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DraftsResponse | null>(null);
  const [error, setError] = useState<{ message: string; raw: string } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Validation errors
  const [fieldErrors, setFieldErrors] = useState({
    platform: '',
    postUrl: '',
    postText: '',
    angle: '',
  });

  // Persist to localStorage when values change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PLATFORM, platform);
  }, [platform]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ANGLE, angle);
  }, [angle]);

  // Listen for rehydration events from RecentRuns
  useEffect(() => {
    const handleRehydrate = (event: Event) => {
      const customEvent = event as CustomEvent<{ tab: string; args: DraftsRequest }>;
      const { tab, args } = customEvent.detail;

      if (tab === 'drafts') {
        // Populate form fields from args
        setPlatform(args.platform);
        setPostUrl(args.post_url || '');
        setPostText(args.post_text || '');
        setAngle(args.angle);

        // Clear any errors
        setError(null);
        setFieldErrors({ platform: '', postUrl: '', postText: '', angle: '' });
      }
    };

    const handleRehydrateAndExecute = (event: Event) => {
      const customEvent = event as CustomEvent<{ tab: string; args: DraftsRequest }>;
      const { tab } = customEvent.detail;

      if (tab === 'drafts') {
        // First populate the form
        handleRehydrate(event);

        // Then trigger the draft generation after a short delay
        // to ensure state has updated
        setTimeout(() => {
          handleDraft();
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

  // Validate form
  const validateForm = () => {
    const errors = {
      platform: '',
      postUrl: '',
      postText: '',
      angle: '',
    };

    let isValid = true;

    // Platform is always selected, no validation needed

    // At least one of postUrl or postText is required
    if (!postUrl.trim() && !postText.trim()) {
      errors.postUrl = 'Either Post URL or Post Text is required';
      errors.postText = 'Either Post URL or Post Text is required';
      isValid = false;
    }

    // Angle is required
    if (!angle.trim()) {
      errors.angle = 'Angle is required';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  // Check if form is valid for submit button state
  const isFormValid = () => {
    return (postUrl.trim() || postText.trim()) && angle.trim();
  };

  const handleDraft = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setCopiedIndex(null);
    setFieldErrors({ platform: '', postUrl: '', postText: '', angle: '' });

    try {
      const requestBody: DraftsRequest = {
        platform,
        post_url: postUrl.trim(),
        post_text: postText.trim(),
        angle: angle.trim(),
      };

      const response = await window.electronAPI.networkRequest(
        'POST',
        '/webhook/reply-drafts',
        requestBody
      );

      const timestamp = new Date().toISOString();

      if (response.ok && response.body) {
        const data = response.body as DraftsResponse;
        setResult(data);

        // Save to recent runs
        const run: RecentRun = {
          id: uuidv4(),
          tab: 'drafts',
          args: requestBody,
          ok: true,
          ts: timestamp,
          snippet: `${data.data.drafts.length} drafts`,
          responseSummary: { draftCount: data.data.drafts.length },
        };
        await window.electronAPI.addRecentRun(run);
        addRecentRun(run);
      } else {
        const errorMsg =
          typeof response.body === 'object' && response.body
            ? JSON.stringify(response.body)
            : response.raw;
        setError({
          message: `Request failed with status ${response.status}`,
          raw: errorMsg,
        });

        // Save failed run
        const run: RecentRun = {
          id: uuidv4(),
          tab: 'drafts',
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
        message: 'An unexpected error occurred',
        raw: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    handleDraft();
  };

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Input Panel */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Generate Reply Drafts</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="platform" className="label">
              Platform <span className="text-red-500" aria-label="required">*</span>
            </label>
            <select
              id="platform"
              className="input-field"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as 'Twitter' | 'LinkedIn' | 'Reddit')}
              disabled={loading}
              aria-required="true"
            >
              <option value="Twitter">🐦 Twitter</option>
              <option value="LinkedIn">💼 LinkedIn</option>
              <option value="Reddit">🤖 Reddit</option>
            </select>
          </div>

          <div>
            <label htmlFor="postUrl" className="label">
              Post URL
            </label>
            <input
              id="postUrl"
              type="url"
              className={`input-field ${fieldErrors.postUrl ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="https://..."
              value={postUrl}
              onChange={(e) => {
                setPostUrl(e.target.value);
                if (fieldErrors.postUrl) {
                  setFieldErrors({ ...fieldErrors, postUrl: '', postText: '' });
                }
              }}
              disabled={loading}
              aria-invalid={!!fieldErrors.postUrl}
              aria-describedby={fieldErrors.postUrl ? 'postUrl-error' : undefined}
            />
            {fieldErrors.postUrl && (
              <p id="postUrl-error" className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                {fieldErrors.postUrl}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="postText" className="label">
              Post Text
            </label>
            <textarea
              id="postText"
              className={`input-field ${fieldErrors.postText ? 'border-red-500 focus:ring-red-500' : ''}`}
              rows={4}
              placeholder="Paste the original post content here..."
              value={postText}
              onChange={(e) => {
                setPostText(e.target.value);
                if (fieldErrors.postText) {
                  setFieldErrors({ ...fieldErrors, postUrl: '', postText: '' });
                }
              }}
              disabled={loading}
              aria-invalid={!!fieldErrors.postText}
              aria-describedby={fieldErrors.postText ? 'postText-error' : undefined}
            />
            {fieldErrors.postText && (
              <p id="postText-error" className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                {fieldErrors.postText}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              At least one of Post URL or Post Text is required
            </p>
          </div>

          <div>
            <label htmlFor="angle" className="label">
              Angle <span className="text-red-500" aria-label="required">*</span>
            </label>
            <input
              id="angle"
              type="text"
              className={`input-field ${fieldErrors.angle ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="e.g., educational, humorous, professional..."
              value={angle}
              onChange={(e) => {
                setAngle(e.target.value);
                if (fieldErrors.angle) {
                  setFieldErrors({ ...fieldErrors, angle: '' });
                }
              }}
              disabled={loading}
              aria-required="true"
              aria-invalid={!!fieldErrors.angle}
              aria-describedby={fieldErrors.angle ? 'angle-error angle-help' : 'angle-help'}
            />
            {fieldErrors.angle && (
              <p id="angle-error" className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                {fieldErrors.angle}
              </p>
            )}
            <p id="angle-help" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Specify the tone or approach for the reply
            </p>
          </div>

          <button
            onClick={handleDraft}
            disabled={loading || !isFormValid()}
            className="btn-primary w-full text-lg py-4"
            aria-busy={loading}
          >
            {loading ? 'Generating...' : 'Draft Replies'}
          </button>
        </div>
      </div>

      {/* Results Panel */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Draft Replies</h3>

        {/* Initial Empty State */}
        {!result && !error && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 text-5xl mb-4">✍️</div>
            <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
              No drafts yet
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              Fill in the form and click "Draft Replies" to generate up to 3 reply drafts
            </p>
            <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
              <p>💡 Tip: Be specific with your angle for better results</p>
              <p>💡 Tip: Include either the post URL or the full post text</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-pulse text-gray-400 dark:text-gray-500 text-5xl mb-4">⏳</div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Generating reply drafts...
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              This may take a few moments
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
                  <p className="text-sm text-red-700 dark:text-red-300">
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

        {/* Empty Drafts State */}
        {result && result.data.drafts && result.data.drafts.length === 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
            <div className="text-yellow-600 dark:text-yellow-400 text-4xl mb-3">📭</div>
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              No drafts generated
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
              The webhook returned 0 drafts. Here are some suggestions:
            </p>
            <ul className="text-xs text-yellow-700 dark:text-yellow-300 text-left space-y-2 max-w-md mx-auto">
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-400">•</span>
                <span>Try a different angle or be more specific with your approach</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-400">•</span>
                <span>Ensure the post text contains enough context</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-400">•</span>
                <span>Check that the webhook is configured correctly in Settings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-400">•</span>
                <span>Try again with a different post or platform</span>
              </li>
            </ul>
          </div>
        )}

        {/* Draft Cards */}
        {result && result.data.drafts && result.data.drafts.length > 0 && (
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {result.data.drafts.slice(0, 3).map((draft, index) => (
              <div
                key={index}
                className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg space-y-3 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <span className="font-semibold text-primary-600 dark:text-primary-400">
                    Draft {index + 1}
                  </span>
                  <button
                    onClick={() => handleCopy(draft, index)}
                    className={`btn-secondary text-sm transition-all ${
                      copiedIndex === index
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : ''
                    }`}
                    aria-label={`Copy draft ${index + 1} to clipboard`}
                  >
                    {copiedIndex === index ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>

                <p className="text-sm whitespace-pre-wrap text-gray-900 dark:text-gray-100">
                  {draft}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
