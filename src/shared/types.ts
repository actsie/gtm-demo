// Shared types between main and renderer processes

export interface Settings {
  n8nBaseUrl: string;
  webhookHeaderName?: string; // Header name for webhook authentication (default: 'x-webhook-secret')
  lastTestTs: string | null;
  ui: {
    theme: 'auto' | 'light' | 'dark';
  };
}

export interface RecentRun {
  id: string;
  tab: 'leads' | 'drafts' | 'email' | 'prospects';
  args: Record<string, unknown>;
  ok: boolean;
  ts: string;
  snippet: string;
  responseSummary: Record<string, unknown>;
}

export interface NetworkResponse {
  ok: boolean;
  status: number;
  body: unknown;
  raw: string;
  responseTime?: number;
  error?: string;
}

// API request/response types

export interface LeadsRequest extends Record<string, unknown> {
  query: string;
  minScore: number;
}

export interface LeadLink {
  title: string;
  url: string;
  score: number;
}

export interface LeadsResponse {
  ok: boolean;
  data: {
    found: number;
    links?: (string | LeadLink)[];
  };
}

export interface DraftsRequest extends Record<string, unknown> {
  platform: 'Twitter' | 'LinkedIn' | 'Reddit';
  post_url: string;
  post_text: string;
  angle: string;
}

export interface DraftsResponse {
  ok: boolean;
  data: {
    drafts: string[];
  };
}

export interface EmailRequest extends Record<string, unknown> {
  email: string;
  company: string;
  note: string;
  dryRun: boolean;
}

export interface EmailResponse {
  ok: boolean;
  data: {
    email: string;
    sent: boolean;
    subject?: string;
    dedupe?: string;
  };
}

// Prospects types
export interface ProspectRow {
  id: string;
  email: string;
  company: string;
  note?: string;
  last_contacted?: string;
  status?: 'new' | 'contacted' | 'replied';
}

export interface ProspectsListRequest extends Record<string, unknown> {
  limit?: number;
  offset?: number;
  search?: string;
}

export interface ProspectsListResponse {
  ok: boolean;
  data: {
    prospects: ProspectRow[];
    total: number;
  };
}

export interface EmailDraftRequest extends Record<string, unknown> {
  mode: 'draft';
  email: string;
  company: string;
  note?: string;
}

export interface EmailDraftResponse {
  ok: boolean;
  data: {
    subject: string;
    body: string;
    dedupe_key: string;
  };
}

export interface EmailSendRequest extends Record<string, unknown> {
  mode: 'send';
  email: string;
  company: string;
  subject: string;
  body: string;
  note?: string;
}

export interface EmailSendResponse {
  ok: boolean;
  data: {
    sent: boolean;
    subject: string;
    dedupe_key: string;
    reason?: 'already_sent_recently';
  };
  links?: {
    airtable_url?: string;
  };
}

// IPC Channel names
export const IPC_CHANNELS = {
  SETTINGS_GET: 'settings.get',
  SETTINGS_SET: 'settings.set',
  SECRET_STORE: 'secret.store',
  SECRET_GET: 'secret.get',
  SECRET_CLEAR: 'secret.clear',
  NETWORK_REQUEST: 'network.request',
  OPEN_EXTERNAL: 'openExternal',
  RECENT_RUNS_LIST: 'recentRuns.list',
  RECENT_RUNS_ADD: 'recentRuns.add',
  RECENT_RUNS_DELETE: 'recentRuns.delete',
  RECENT_RUNS_CLEAR: 'recentRuns.clear',
} as const;
