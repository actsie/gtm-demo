import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LeadsRequest, LeadsResponse, RecentRun, LeadLink } from '../../shared/types';
import { useAppStore } from '../store';
import ErrorDisplay from './ErrorDisplay';

// Local storage keys
const STORAGE_KEYS = {
  QUERY: 'leads-query',
  MIN_SCORE: 'leads-minScore',
  SLACK_WEBHOOK: 'leads-slackWebhook',
  AIRTABLE_WEBHOOK: 'leads-airtableWebhook',
  LAST_RUN: 'leads-lastRun',
  LAST_RESULT: 'leads-lastResult',
};

export default function LeadsTab() {
  const { addRecentRun } = useAppStore();

  // Load from localStorage
  const [query, setQuery] = useState(() => localStorage.getItem(STORAGE_KEYS.QUERY) || '');
  const [minScore, setMinScore] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MIN_SCORE);
    return saved ? parseInt(saved) : 2;
  });
  const [slackWebhook, setSlackWebhook] = useState(() => localStorage.getItem(STORAGE_KEYS.SLACK_WEBHOOK) || '');
  const [airtableWebhook, setAirtableWebhook] = useState(() => localStorage.getItem(STORAGE_KEYS.AIRTABLE_WEBHOOK) || '');
  const [lastRunTime, setLastRunTime] = useState<string | null>(() => localStorage.getItem(STORAGE_KEYS.LAST_RUN));

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LeadsResponse | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LAST_RESULT);
    return saved ? JSON.parse(saved) : null;
  });
  const [error, setError] = useState<{ message: string; raw: string } | null>(null);
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);
  const [shareLoading, setShareLoading] = useState<'slack' | 'airtable' | null>(null);
  const [shareToast, setShareToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Persist to localStorage when values change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.QUERY, query);
  }, [query]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MIN_SCORE, minScore.toString());
  }, [minScore]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SLACK_WEBHOOK, slackWebhook);
  }, [slackWebhook]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AIRTABLE_WEBHOOK, airtableWebhook);
  }, [airtableWebhook]);

  useEffect(() => {
    if (lastRunTime) {
      localStorage.setItem(STORAGE_KEYS.LAST_RUN, lastRunTime);
    }
  }, [lastRunTime]);

  useEffect(() => {
    if (result) {
      localStorage.setItem(STORAGE_KEYS.LAST_RESULT, JSON.stringify(result));
    }
  }, [result]);

  // Listen for rehydration events from RecentRuns
  useEffect(() => {
    const handleRehydrate = (event: Event) => {
      const customEvent = event as CustomEvent<{ tab: string; args: LeadsRequest }>;
      const { tab, args } = customEvent.detail;

      if (tab === 'leads') {
        // Populate form fields from args
        setQuery(args.query);
        setMinScore(args.minScore);

        // Clear any errors
        setError(null);
      }
    };

    const handleRehydrateAndExecute = (event: Event) => {
      const customEvent = event as CustomEvent<{ tab: string; args: LeadsRequest }>;
      const { tab } = customEvent.detail;

      if (tab === 'leads') {
        // First populate the form
        handleRehydrate(event);

        // Then trigger the search after a short delay
        // to ensure state has updated
        setTimeout(() => {
          handleRun();
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

  const handleRun = async () => {
    if (!query.trim()) {
      setError({ message: 'Please enter a search query', raw: '' });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const requestBody: LeadsRequest = {
        query: query.trim(),
        minScore,
      };

      const response = await window.electronAPI.networkRequest(
        'POST',
        '/webhook/reddit-lead',
        requestBody
      );

      const timestamp = new Date().toISOString();
      setLastRunTime(timestamp);

      if (response.ok && response.body) {
        const data = response.body as LeadsResponse;
        setResult(data);

        // Save to recent runs
        const run: RecentRun = {
          id: uuidv4(),
          tab: 'leads',
          args: requestBody,
          ok: true,
          ts: timestamp,
          snippet: `found=${data.data.found}`,
          responseSummary: { found: data.data.found, linkCount: data.data.links?.length || 0 },
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

        // Still save last run time on error
        setLastRunTime(timestamp);

        // Save failed run
        const run: RecentRun = {
          id: uuidv4(),
          tab: 'leads',
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
      const timestamp = new Date().toISOString();
      setLastRunTime(timestamp);
      setError({
        message: 'An unexpected error occurred',
        raw: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (platform: 'slack' | 'airtable') => {
    const webhookUrl = platform === 'slack' ? slackWebhook : airtableWebhook;

    if (!webhookUrl.trim()) {
      setShareToast({ type: 'error', message: `${platform === 'slack' ? 'Slack' : 'Airtable'} webhook URL not configured` });
      setTimeout(() => setShareToast(null), 3000);
      return;
    }

    if (!result) {
      setShareToast({ type: 'error', message: 'No results to share' });
      setTimeout(() => setShareToast(null), 3000);
      return;
    }

    setShareLoading(platform);

    try {
      const payload = {
        query,
        minScore,
        found: result.data.found,
        links: result.data.links || [],
        timestamp: lastRunTime,
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShareToast({ type: 'success', message: `Successfully shared to ${platform === 'slack' ? 'Slack' : 'Airtable'}!` });
      } else {
        setShareToast({ type: 'error', message: `Failed to share: ${response.status} ${response.statusText}` });
      }
    } catch (err) {
      setShareToast({ type: 'error', message: `Share failed: ${(err as Error).message}` });
    } finally {
      setShareLoading(null);
      setTimeout(() => setShareToast(null), 3000);
    }
  };

  const isLeadLink = (link: string | LeadLink): link is LeadLink => {
    return typeof link === 'object' && 'title' in link && 'url' in link && 'score' in link;
  };

  const handleCopyLinks = async () => {
    if (result?.data.links) {
      const urls = result.data.links.map(link =>
        isLeadLink(link) ? link.url : link
      );
      await navigator.clipboard.writeText(urls.join('\n'));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Input Panel */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Reddit Leads Search</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="query" className="label">
              Search Query
            </label>
            <input
              id="query"
              type="text"
              className="input-field"
              placeholder="Enter search query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="minScore" className="label">
              Minimum Score (default: 2)
            </label>
            <input
              id="minScore"
              type="number"
              className="input-field"
              min="1"
              value={minScore}
              onChange={(e) => setMinScore(parseInt(e.target.value) || 2)}
              disabled={loading}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Filter results by minimum upvote score
            </p>
          </div>

          <button
            onClick={handleRun}
            disabled={loading}
            className="btn-primary w-full text-lg py-4"
            aria-busy={loading}
          >
            {loading ? '⏳ Searching...' : '🔍 Run Search'}
          </button>

          {/* Webhook Configuration */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowWebhookConfig(!showWebhookConfig)}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-2"
            >
              {showWebhookConfig ? '▼' : '▶'} Configure Slack/Airtable Webhooks
            </button>

            {showWebhookConfig && (
              <div className="mt-3 space-y-3">
                <div>
                  <label htmlFor="slackWebhook" className="label text-xs">
                    Slack Webhook URL
                  </label>
                  <input
                    id="slackWebhook"
                    type="url"
                    className="input-field text-sm"
                    placeholder="https://hooks.slack.com/services/..."
                    value={slackWebhook}
                    onChange={(e) => setSlackWebhook(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="airtableWebhook" className="label text-xs">
                    Airtable Webhook URL
                  </label>
                  <input
                    id="airtableWebhook"
                    type="url"
                    className="input-field text-sm"
                    placeholder="https://hooks.airtable.com/..."
                    value={airtableWebhook}
                    onChange={(e) => setAirtableWebhook(e.target.value)}
                  />
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  These URLs are saved locally and used by the Share buttons
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Panel */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4">Results</h3>

        {/* Toast Notification */}
        {shareToast && (
          <div
            className={'mb-4 p-3 rounded-lg text-sm ' + (shareToast.type === 'success'
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200')}
            role="alert"
          >
            {shareToast.message}
          </div>
        )}

        {!result && !error && (
          <div className="text-gray-500 dark:text-gray-400 text-center py-8">
            Run a search to see results here
          </div>
        )}

        {error && <ErrorDisplay error={error} />}

        {result && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Found: {result.data.found} result{result.data.found !== 1 ? 's' : ''}</p>
                  {lastRunTime && (
                    <p className="text-xs mt-1">Last run: {new Date(lastRunTime).toLocaleString()}</p>
                  )}
                </div>
                <div className="text-3xl font-bold">{result.data.found}</div>
              </div>
            </div>

            {/* No Leads Found State */}
            {result.data.found === 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg text-center">
                <p className="text-yellow-800 dark:text-yellow-200 font-medium">No leads found</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Try adjusting your search query or lowering the minimum score
                </p>
              </div>
            )}

            {/* Links */}
            {result.data.links && result.data.links.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Top Links ({result.data.links.length})</h4>
                  <button onClick={handleCopyLinks} className="btn-secondary text-sm">
                    📋 Copy All URLs
                  </button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {result.data.links.map((link, index) => {
                    const isEnhanced = isLeadLink(link);
                    const url = isEnhanced ? link.url : link;
                    const title = isEnhanced ? link.title : url;
                    const score = isEnhanced ? link.score : undefined;

                    return (
                      <div
                        key={index}
                        className="p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      >
                        <a
                          href={url}
                          onClick={(e) => {
                            e.preventDefault();
                            window.electronAPI.openExternal(url);
                          }}
                          className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium block mb-1"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {title}
                        </a>
                        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                          <span className="truncate">{url}</span>
                          {score !== undefined && (
                            <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full font-medium whitespace-nowrap">
                              ⬆ {score}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Share Buttons */}
            {result.data.found > 0 && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleShare('slack')}
                  disabled={!slackWebhook.trim() || shareLoading !== null}
                  className="btn-secondary flex-1"
                  title={!slackWebhook.trim() ? 'Configure Slack webhook URL first' : 'Share to Slack'}
                >
                  {shareLoading === 'slack' ? '⏳ Sharing...' : '💬 Share to Slack'}
                </button>
                <button
                  onClick={() => handleShare('airtable')}
                  disabled={!airtableWebhook.trim() || shareLoading !== null}
                  className="btn-secondary flex-1"
                  title={!airtableWebhook.trim() ? 'Configure Airtable webhook URL first' : 'Share to Airtable'}
                >
                  {shareLoading === 'airtable' ? '⏳ Sharing...' : '📊 Share to Airtable'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
