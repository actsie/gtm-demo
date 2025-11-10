import fetch, { RequestInit as NodeFetchRequestInit } from 'node-fetch';
import { NetworkResponse } from '../shared/types';
import { getSecret } from './secrets';
import { getSettings } from './storage';

const REQUEST_TIMEOUT = 20000; // 20 seconds for webhook requests (AI generation takes time)
const RETRY_DELAY = 500; // 500ms

// Request deduplication - track in-flight requests
const inFlightRequests = new Map<string, Promise<NetworkResponse>>();

// Generate a unique key for request deduplication
function getRequestKey(method: string, endpoint: string, body?: unknown): string {
  return `${method.toUpperCase()}:${endpoint}${body ? ':' + JSON.stringify(body) : ''}`;
}

// Sanitize error messages to avoid leaking secrets
function sanitizeError(message: string, secret: string | null): string {
  if (!secret) return message;
  return message.replace(new RegExp(secret, 'g'), '[SECRET]');
}

// Make a network request with retry logic
async function makeRequestWithRetry(
  url: string,
  options: NodeFetchRequestInit,
  secret: string | null,
  retryCount = 0
): Promise<NetworkResponse> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const rawText = await response.text();
    let body: unknown;

    try {
      body = JSON.parse(rawText);
    } catch {
      body = rawText;
    }

    const responseTime = Date.now() - startTime;

    return {
      ok: response.ok,
      status: response.status,
      body,
      raw: sanitizeError(rawText, secret),
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorObj = error as Error;

    // Categorize error types for better user feedback
    let errorMessage = errorObj.message;

    if (errorObj.name === 'AbortError') {
      errorMessage = `Request timeout (${REQUEST_TIMEOUT / 1000}s exceeded)`;
    } else if (errorMessage.includes('ENOTFOUND')) {
      errorMessage = 'DNS lookup failed - check the URL';
    } else if (errorMessage.includes('ECONNREFUSED')) {
      errorMessage = 'Connection refused - server not reachable';
    } else if (errorMessage.includes('certificate') || errorMessage.includes('SSL') || errorMessage.includes('TLS')) {
      errorMessage = 'TLS/SSL certificate error';
    } else if (errorMessage.includes('EHOSTUNREACH')) {
      errorMessage = 'Host unreachable - check network connection';
    } else if (errorMessage.includes('ETIMEDOUT')) {
      errorMessage = 'Connection timed out';
    }

    // Retry on network errors (not on timeout or DNS errors)
    if (retryCount < 1 && errorObj.name !== 'AbortError' && !errorMessage.includes('DNS') && !errorMessage.includes('unreachable')) {
      console.log(`Request failed, retrying in ${RETRY_DELAY}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return makeRequestWithRetry(url, options, secret, retryCount + 1);
    }

    // Return error as response
    return {
      ok: false,
      status: 0,
      body: { error: sanitizeError(errorMessage, secret) },
      raw: sanitizeError(errorMessage, secret),
      error: sanitizeError(errorMessage, secret),
      responseTime,
    };
  }
}

export async function makeNetworkRequest(
  method: string,
  endpoint: string,
  body?: unknown
): Promise<NetworkResponse> {
  // Check for in-flight request with same parameters
  const requestKey = getRequestKey(method, endpoint, body);
  const existingRequest = inFlightRequests.get(requestKey);

  if (existingRequest) {
    // Return the existing in-flight request
    console.log(`Deduplicating request: ${requestKey}`);
    return existingRequest;
  }

  // Create new request promise
  const requestPromise = (async () => {
    try {
      // Check if endpoint is a full URL (for custom webhooks like EmailTab)
      const isFullUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://');

      // Always get settings and secret
      const settings = getSettings();
      const secretResult = await getSecret();
      const secret = secretResult.secret;

    let url: string;
    let isN8nUrl = false; // Track if this is an n8n URL (needs auth)

    if (isFullUrl) {
      // Use the endpoint as-is for custom full URLs
      url = endpoint;

      // Check if this full URL is on the n8n domain
      if (settings.n8nBaseUrl) {
        const n8nBaseUrl = settings.n8nBaseUrl.replace(/\/$/, ''); // Remove trailing slash
        isN8nUrl = url.startsWith(n8nBaseUrl);
      }
    } else {
      // Relative path - construct from base URL
      if (!settings.n8nBaseUrl) {
        return {
          ok: false,
          status: 0,
          body: { error: 'N8N_BASE_URL not configured. Please set it in Settings.' },
          raw: 'N8N_BASE_URL not configured',
        };
      }

      if (!secret && endpoint !== '/healthz') {
        return {
          ok: false,
          status: 0,
          body: { error: 'WEBHOOK_SECRET not configured. Please set it in Settings.' },
          raw: 'WEBHOOK_SECRET not configured',
        };
      }

      // Construct URL from base + endpoint
      const baseUrl = settings.n8nBaseUrl.replace(/\/$/, ''); // Remove trailing slash
      url = `${baseUrl}${endpoint}`;
      isN8nUrl = true; // Relative paths are always n8n URLs
    }

    // Get the webhook header name from settings (default: 'x-webhook-secret')
    const headerName = settings.webhookHeaderName || 'x-webhook-secret';

    // Prepare request options
    const options: NodeFetchRequestInit = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        // Add secret header for n8n URLs (both relative and full URLs on n8n domain)
        ...(secret && isN8nUrl && endpoint !== '/healthz' ? { [headerName]: secret } : {}),
      },
    };

    if (body && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
      options.body = JSON.stringify(body);
    }

      // Make request with retry
      return await makeRequestWithRetry(url, options, secret);
    } catch (error) {
      return {
        ok: false,
        status: 0,
        body: { error: (error as Error).message },
        raw: (error as Error).message,
      };
    }
  })();

  // Store the request promise
  inFlightRequests.set(requestKey, requestPromise);

  // Clean up after request completes (success or failure)
  try {
    const result = await requestPromise;
    return result;
  } finally {
    // Remove from in-flight requests after a small delay
    // This prevents rapid consecutive identical requests from being deduplicated
    setTimeout(() => {
      inFlightRequests.delete(requestKey);
    }, 100);
  }
}
