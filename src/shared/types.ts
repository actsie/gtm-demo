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
  tab: 'leads' | 'drafts' | 'email' | 'prospects' | 'followups';
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

// Follow-ups types
export type FollowUpStage =
  | 'initial'
  | 'follow_up_1'
  | 'follow_up_2'
  | 'follow_up_3'
  | 'replied'
  | 'closed';

export interface FollowUpRow {
  id: string;
  email: string;
  company: string;
  subject: string;
  status: 'sent' | 'replied' | 'closed';
  follow_up_stage: FollowUpStage;
  follow_up_count: number;
  sent_at: string;
  last_followup_sent?: string;
  replied_at?: string;
  reply_snippet?: string;
  days_since_sent: number;
  days_since_last_activity: number;
  airtable_url?: string;
}

export interface EmailInThread {
  id: string;
  subject: string;
  body: string;
  sent_at: string;
  stage: FollowUpStage;
}

export interface EmailThread {
  original: EmailInThread;
  followups: EmailInThread[];
  reply?: {
    replied_at: string;
    reply_body: string;
    reply_snippet: string;
  };
}

export interface FollowUpsListRequest extends Record<string, unknown> {
  limit?: number;
  offset?: number;
  stage_filter?: FollowUpStage | 'all';
  status_filter?: 'all' | 'sent' | 'replied' | 'closed';
}

export interface FollowUpsListResponse {
  ok: boolean;
  data: {
    followups: FollowUpRow[];
    total: number;
    stats: {
      total: number;
      awaiting_reply: number;
      replied: number;
      reply_rate: number;
      by_stage: Record<FollowUpStage, number>;
    };
  };
}

export interface FollowUpDetailsRequest extends Record<string, unknown> {
  outbox_id: string;
}

export interface FollowUpDetailsResponse {
  ok: boolean;
  data: {
    thread: EmailThread;
  };
}

export interface FollowUpActionRequest extends Record<string, unknown> {
  outbox_id: string;
  action: 'mark_closed' | 'mark_replied' | 'send_now';
  note?: string;
}

export interface FollowUpActionResponse {
  ok: boolean;
  data: {
    success: boolean;
    message: string;
  };
}

// Follow-up Drafts types (FollowupQueue table)
export interface Draft {
  id: string;
  prospect_id: string;
  email: string;
  company: string;
  stage: 'follow_up_1' | 'follow_up_2' | 'follow_up_3';
  subject: string;
  body: string;
  original_subject: string;
  original_body: string;
  status: 'needs_review' | 'ready' | 'sent' | 'skipped' | 'replied';
  generated_at: string;
  due_date: string;
  sent_at?: string;
  is_edited: boolean;
  days_until_due?: number;
  is_overdue?: boolean;
  is_due_today?: boolean;
}

export interface DraftsListRequest extends Record<string, unknown> {
  status_filter?: 'needs_review' | 'ready' | 'all';
  limit?: number;
  offset?: number;
}

export interface DraftsListResponse {
  ok: boolean;
  data: {
    drafts: Draft[];
    stats: {
      pending_review: number;
      approved: number;
      due_today: number;
      overdue: number;
    };
  };
}

export interface DraftActionRequest extends Record<string, unknown> {
  draft_id: string;
  action: 'mark_ready' | 'skip' | 'edit_and_save';
  subject?: string;
  body?: string;
}

export interface DraftActionResponse {
  ok: boolean;
  data: {
    success: boolean;
    message: string;
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
