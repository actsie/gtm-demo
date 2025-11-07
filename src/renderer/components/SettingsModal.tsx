import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, secret, keytarAvailable, setSettings, setSecret, setKeytarAvailable } = useAppStore();

  const [baseUrl, setBaseUrl] = useState('');
  const [webhookHeaderName, setWebhookHeaderName] = useState('x-webhook-secret');
  const [secretInput, setSecretInput] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [secretError, setSecretError] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [storageStatus, setStorageStatus] = useState<'keychain' | 'session' | null>(null);

  const announcementRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setBaseUrl(settings.n8nBaseUrl);
      setWebhookHeaderName(settings.webhookHeaderName || 'x-webhook-secret');
    }
    if (secret) {
      setSecretInput(secret);
    }
    setStorageStatus(keytarAvailable ? 'keychain' : 'session');
  }, [settings, secret, keytarAvailable]);

  // Focus first input when modal opens
  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) {
      setUrlError('URL is required');
      return false;
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setUrlError('URL must use http or https protocol');
        return false;
      }
      setUrlError('');
      return true;
    } catch {
      setUrlError('Invalid URL format');
      return false;
    }
  };

  const validateSecret = (sec: string): boolean => {
    if (!sec.trim()) {
      setSecretError('Secret is required');
      return false;
    }
    setSecretError('');
    return true;
  };

  const handleUrlChange = (value: string) => {
    setBaseUrl(value);
    if (value.trim()) {
      validateUrl(value);
    } else {
      setUrlError('');
    }
  };

  const handleSecretChange = (value: string) => {
    setSecretInput(value);
    if (value.trim()) {
      validateSecret(value);
    } else {
      setSecretError('');
    }
  };

  const handleSave = async () => {
    const isUrlValid = validateUrl(baseUrl);
    const isSecretValid = validateSecret(secretInput);

    if (!isUrlValid || !isSecretValid) {
      return;
    }

    // Check if electronAPI is available
    if (!window.electronAPI) {
      console.error('electronAPI is not available');
      setTestResult({ success: false, message: 'Application error: electronAPI not initialized' });
      if (announcementRef.current) {
        announcementRef.current.textContent = 'Application error: electronAPI not initialized';
      }
      return;
    }

    setSaving(true);

    try {
      const newSettings = {
        n8nBaseUrl: baseUrl.trim(),
        webhookHeaderName: webhookHeaderName.trim() || 'x-webhook-secret',
        lastTestTs: settings?.lastTestTs || null,
        ui: settings?.ui || { theme: 'auto' },
      };

      await window.electronAPI.setSettings(newSettings);
      setSettings(newSettings);

      if (secretInput.trim()) {
        const result = await window.electronAPI.storeSecret(secretInput.trim());
        setSecret(secretInput.trim());
        setKeytarAvailable(result.keytarAvailable);
        setStorageStatus(result.keytarAvailable ? 'keychain' : 'session');

        // Announce to screen readers
        const message = result.keytarAvailable
          ? 'Settings saved. Secret stored securely in keychain.'
          : 'Settings saved. Secret stored for this session only.';

        if (announcementRef.current) {
          announcementRef.current.textContent = message;
        }
      }

      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      setTestResult({ success: false, message: 'Failed to save settings' });

      if (announcementRef.current) {
        announcementRef.current.textContent = 'Failed to save settings';
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!validateUrl(baseUrl)) {
      return;
    }

    // Check if electronAPI is available
    if (!window.electronAPI) {
      console.error('electronAPI is not available');
      setTestResult({ success: false, message: 'Application error: electronAPI not initialized' });
      if (announcementRef.current) {
        announcementRef.current.textContent = 'Application error: electronAPI not initialized';
      }
      return;
    }

    setTesting(true);
    setTestResult(null);

    if (announcementRef.current) {
      announcementRef.current.textContent = 'Testing connection...';
    }

    try {
      // Save URL temporarily to test with it
      const tempSettings = {
        n8nBaseUrl: baseUrl.trim(),
        webhookHeaderName: webhookHeaderName.trim() || 'x-webhook-secret',
        lastTestTs: settings?.lastTestTs || null,
        ui: settings?.ui || { theme: 'auto' },
      };
      await window.electronAPI.setSettings(tempSettings);

      const startTime = Date.now();
      const response = await window.electronAPI.networkRequest('GET', '/healthz');
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const message = `Connection successful! (${responseTime}ms)`;
        setTestResult({ success: true, message });

        const newSettings = {
          ...tempSettings,
          lastTestTs: new Date().toISOString(),
        };
        await window.electronAPI.setSettings(newSettings);
        setSettings(newSettings);

        if (announcementRef.current) {
          announcementRef.current.textContent = message;
        }
      } else {
        let errorMessage = 'Connection failed';

        if (response.status === 0) {
          errorMessage = 'Unable to reach server - check URL and network connection';
        } else if (response.status >= 500) {
          errorMessage = `Server error (HTTP ${response.status})`;
        } else if (response.status >= 400) {
          errorMessage = `Client error (HTTP ${response.status})`;
        } else {
          errorMessage = `Unexpected response (HTTP ${response.status})`;
        }

        setTestResult({ success: false, message: errorMessage });

        if (announcementRef.current) {
          announcementRef.current.textContent = errorMessage;
        }
      }
    } catch (error) {
      const errorMessage = `Error: ${(error as Error).message}`;
      setTestResult({ success: false, message: errorMessage });

      if (announcementRef.current) {
        announcementRef.current.textContent = errorMessage;
      }
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        className="card w-full max-w-lg mx-4"
        role="dialog"
        aria-labelledby="settings-title"
        aria-modal="true"
      >
        {/* Screen reader announcements */}
        <div
          ref={announcementRef}
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        />

        <div className="flex items-center justify-between mb-6">
          <h2 id="settings-title" className="text-2xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* N8N Base URL */}
          <div>
            <label htmlFor="baseUrl" className="label">
              N8N Base URL
            </label>
            <input
              ref={firstInputRef}
              id="baseUrl"
              type="url"
              className={'input-field ' + (urlError ? 'border-red-500' : '')}
              placeholder="https://your-n8n-instance.com"
              value={baseUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              onBlur={() => baseUrl.trim() && validateUrl(baseUrl)}
              aria-invalid={!!urlError}
              aria-describedby={urlError ? 'url-error' : 'url-help'}
            />
            {urlError ? (
              <p id="url-error" className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                {urlError}
              </p>
            ) : (
              <p id="url-help" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                The base URL of your n8n instance (without trailing slash)
              </p>
            )}
          </div>

          {/* Webhook Header Name */}
          <div>
            <label htmlFor="webhookHeaderName" className="label">
              Webhook Header Name
            </label>
            <input
              id="webhookHeaderName"
              type="text"
              className="input-field"
              placeholder="x-webhook-secret"
              value={webhookHeaderName}
              onChange={(e) => setWebhookHeaderName(e.target.value)}
              aria-describedby="header-help"
            />
            <p id="header-help" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              The header name used for webhook authentication (default: x-webhook-secret)
            </p>
          </div>

          {/* Webhook Secret */}
          <div>
            <label htmlFor="secret" className="label">
              Webhook Secret
            </label>
            <div className="relative">
              <input
                id="secret"
                type={showSecret ? 'text' : 'password'}
                className={'input-field pr-10 ' + (secretError ? 'border-red-500' : '')}
                placeholder="Enter your webhook secret"
                value={secretInput}
                onChange={(e) => handleSecretChange(e.target.value)}
                onBlur={() => secretInput.trim() && validateSecret(secretInput)}
                aria-invalid={!!secretError}
                aria-describedby={secretError ? 'secret-error' : 'secret-help'}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded p-1"
                aria-label={showSecret ? 'Hide secret' : 'Show secret'}
              >
                {showSecret ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {secretError ? (
              <p id="secret-error" className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                {secretError}
              </p>
            ) : (
              <div id="secret-help" className="mt-1">
                <div className="flex items-center gap-2">
                  {storageStatus === 'keychain' ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                      🔒 Stored securely
                    </span>
                  ) : storageStatus === 'session' ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                      ⚠️ Stored for session only
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {storageStatus === 'keychain'
                    ? 'Secret will be stored securely in OS keychain'
                    : 'Secret will be stored in memory only (lost after restart)'}
                </p>
              </div>
            )}
          </div>

          {/* Test Connection Button */}
          <div>
            <button
              onClick={handleTestConnection}
              disabled={testing || !baseUrl.trim()}
              className="btn-secondary w-full"
              aria-busy={testing}
            >
              {testing ? '⏳ Testing...' : '🔌 Test Connection'}
            </button>

            {testResult && (
              <div
                className={'mt-3 p-3 rounded-lg text-sm ' + (testResult.success
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200')}
                role="alert"
              >
                {testResult.message}
              </div>
            )}

            {settings?.lastTestTs && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Last successful test: {new Date(settings.lastTestTs).toLocaleString()}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex-1"
              aria-busy={saving}
            >
              {saving ? '💾 Saving...' : '💾 Save Settings'}
            </button>
            <button
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
