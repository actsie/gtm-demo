# Unified Follow-ups System - Progress Report

*Updated: November 8, 2025*
*Project: GTM Console - Follow-up Automation (Mac Mini + Laptop Integration)*

---

## 🎯 Project Overview

Building a complete follow-up automation system that:
1. **Generates** all 3 follow-up drafts immediately when cold emails are sent
2. **Allows manual review** and approval before sending
3. **Sends approved drafts** on scheduled dates (Day 3, 7, 14)
4. **Tracks performance** with stats and timeline views

**Key Decision:** Generate all 3 follow-ups at once for single review session

---

## ✅ What's Been Built (Mac Mini Backend)

### **Airtable Database Schema**

#### **1. Outbox Table (Modified)**
Tracks all sent emails (originals + follow-ups)

**New Fields Added:**
- `subject` - Email subject line
- `body` - Email body content
- `follow_up_count` - Number of follow-ups sent (0-3)
- `follow_up_stage` - Current stage: initial → follow_up_1 → follow_up_2 → follow_up_3
- `last_followup_sent` - Timestamp of last follow-up
- `parent_email_id` - Link to original email (for follow-up records)

#### **2. FollowupQueue Table (NEW)**
Stores generated follow-up drafts before sending

**Fields:**
- `id` - Primary key
- `prospect_id` - Link to Outbox record (original email)
- `email`, `company` - Contact info
- `stage` - Which follow-up: follow_up_1, follow_up_2, follow_up_3
- `subject` - NEW AI-generated follow-up subject
- `body` - NEW AI-generated follow-up body
- `original_subject` - Original cold email subject (reference)
- `original_body` - Original cold email body (reference)
- `status` - Workflow: needs_review → ready → sent → skipped/replied
- `generated_at` - When draft was created
- `due_date` - When follow-up should be sent
- `sent_at` - When actually sent
- `is_edited` - Checkbox if user edited the draft

#### **3. FollowupTemplates Table (NEW)**
Stores AI prompts for generating follow-ups

**Fields:**
- `name` - Template name (e.g., "Follow-up 1 (Day 3)")
- `stage` - Which follow-up (follow_up_1, follow_up_2, follow_up_3)
- `days_after` - Days to wait before sending (3, 7, 14)
- `template_prompt` - AI instructions for generating the follow-up
- `active` - Toggle to enable/disable template

**Current Templates:**
- FU#1 (Day 3): Brief, friendly check-in
- FU#2 (Day 7): Value-add follow-up with insight/resource
- FU#3 (Day 14): Breakup email

---

### **n8n Workflows (Mac Mini)**

#### **Workflow 1: Cold Email with Auto-Draft Generation** ✅ (NEEDS UPDATE)
Currently only generates FU#1, needs to generate all 3

**Current Flow:**
1. Send cold email via Gmail
2. Log to Airtable Outbox
3. Get FU#1 Template
4. Generate FU#1 with AI
5. Create FollowupQueue record

**Needed Update:**
Loop to generate all 3 follow-ups (FU#1, FU#2, FU#3) at once

---

#### **Workflow 2: Daily Follow-up Auto-Send** ✅
Runs every weekday at 9 AM, sends approved drafts

**Trigger:** CRON schedule (Mon-Fri, 9:00 AM)

**Flow:**
1. Skip Weekend
2. Get Ready Follow-ups (status='ready' AND due_date <= NOW())
3. Loop Each Follow-up
4. Send via Gmail
5. Log to Outbox
6. Update original prospect record
7. Mark draft as sent

**Status:** Active, running daily

---

#### **Workflow 3: Reply Detection** ✅ (NEEDS UPDATE)
Checks Gmail every 4 hours for replies

**Current:** Updates Outbox with reply info
**Needed:** Cancel pending FollowupQueue drafts when reply detected

---

## ✅ What's Been Built (Laptop Frontend)

### **GTM Console UI**

#### **Follow-ups Tab** ✅ (NEEDS UPDATE)
Current: Shows sent emails from Outbox only
Needed: Add tabbed view for pending drafts

---

#### **Email Thread Modal** ✅
Timeline view working with one known bug

**Known Bug:**
- Original email label shows wrong stage
- Fix ready: 1 line change

---

### **Backend Endpoints (Laptop)**

#### **Endpoint 1: `/webhook/followups-list`** ✅
Lists sent emails from Outbox with stats

#### **Endpoint 2: `/webhook/followup-details`** ✅ (95% Complete)
Shows email thread timeline (1 bug remaining)

**Node 7.5 Breakthrough:**
Fixed Airtable linked record filtering with `0:` prefix handling

#### **Endpoint 3: `/webhook/followup-action`** ❌
Not started yet

---

## 🚀 Implementation Plan

### **Part 1: Update Mac Mini Workflow** (15 min)

**Goal:** Generate all 3 follow-ups immediately after sending cold email

**Changes to Cold Email Workflow:**

**Current:**
- Single generation for FU#1 only

**New:**
- Replace nodes 3-9 with a loop structure:

```
Node 3: Get All Active Templates
  ↓
Node 4: Split Templates (loop)
  ↓
Node 5: Calculate Due Date (sent_at + days_after, 9 AM)
  ↓
Node 6: Prepare AI Context
  ↓
Node 7: Generate Follow-up with AI
  ↓
Node 8: Parse AI Response
  ↓
Node 9: Create FollowupQueue Record
  ↓
(Loop back for next template)
```

**Key Changes:**
- Node 3: Query FollowupTemplates WHERE active=true (returns all 3)
- Node 4: Split In Batches (process each template)
- Node 5: Use template's `days_after` field dynamically
- Node 9: Creates 3 records, one per stage

**Result:** 3 drafts created immediately with status="needs_review"

---

### **Part 2: Build Draft Endpoints** (45 min)

#### **Endpoint A: `/webhook/drafts-list`**

**Purpose:** Fetch pending drafts from FollowupQueue

**Input:**
```json
{
  "status_filter": "needs_review" | "ready" | "all",
  "limit": 20,
  "offset": 0
}
```

**n8n Workflow Nodes:**

1. **Webhook Trigger** (POST /webhook/drafts-list)
2. **Parse Input** - Extract status_filter, limit, offset
3. **Build Filter Formula** - Code node
   ```javascript
   let formula = '';
   if (statusFilter === 'needs_review') {
     formula = '{status} = "needs_review"';
   } else if (statusFilter === 'ready') {
     formula = '{status} = "ready"';
   }
   // If 'all', no filter
   ```
4. **Query FollowupQueue** - Airtable List
   - Filter by formula
   - Sort by due_date ASC
   - Limit/offset for pagination
5. **Calculate Days Until Due** - Code node
   ```javascript
   items.map(item => {
     const dueDate = new Date(item.json.due_date);
     const now = new Date();
     const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

     return {
       json: {
         ...item.json,
         days_until_due: daysUntilDue,
         is_overdue: daysUntilDue < 0,
         is_due_today: daysUntilDue === 0
       }
     };
   });
   ```
6. **Query All for Stats** - Airtable List (no pagination)
7. **Calculate Stats** - Code node
   ```javascript
   const pending = items.filter(i => i.json.status === 'needs_review').length;
   const ready = items.filter(i => i.json.status === 'ready').length;
   const dueToday = items.filter(i => {
     const due = new Date(i.json.due_date);
     const today = new Date();
     return due.toDateString() === today.toDateString();
   }).length;
   const overdue = items.filter(i => {
     const due = new Date(i.json.due_date);
     return due < new Date() && i.json.status !== 'sent';
   }).length;
   ```
8. **Build Response** - Code node
   ```javascript
   return [{
     json: {
       ok: true,
       data: {
         drafts: draftsFromNode5,
         stats: {
           pending_review: pending,
           approved: ready,
           due_today: dueToday,
           overdue: overdue
         }
       }
     }
   }];
   ```

**Output:**
```json
{
  "ok": true,
  "data": {
    "drafts": [
      {
        "id": "recXYZ",
        "prospect_id": "recABC",
        "email": "john@company.com",
        "company": "Acme Corp",
        "stage": "follow_up_1",
        "subject": "Following up on partnership...",
        "body": "Hi John...",
        "original_subject": "Partnership opportunity",
        "original_body": "...",
        "status": "needs_review",
        "due_date": "2025-11-10T09:00:00Z",
        "days_until_due": 2,
        "is_overdue": false,
        "is_due_today": false,
        "is_edited": false,
        "generated_at": "2025-11-08T10:00:00Z"
      }
    ],
    "stats": {
      "pending_review": 5,
      "approved": 3,
      "due_today": 2,
      "overdue": 1
    }
  }
}
```

---

#### **Endpoint B: `/webhook/draft-action`**

**Purpose:** Update draft status or content

**Input:**
```json
{
  "draft_id": "recXYZ",
  "action": "mark_ready" | "skip" | "edit_and_save",
  "subject": "Updated...",  // only for edit_and_save
  "body": "Updated..."       // only for edit_and_save
}
```

**n8n Workflow:**

1. **Webhook Trigger** (POST /webhook/draft-action)
2. **Parse and Validate** - Code node
   ```javascript
   const body = items[0].json.body || items[0].json;
   const draftId = body.draft_id;
   const action = body.action;

   if (!draftId || !action) {
     throw new Error('draft_id and action required');
   }

   if (!['mark_ready', 'skip', 'edit_and_save'].includes(action)) {
     throw new Error('Invalid action');
   }

   return [{
     json: {
       draft_id: draftId,
       action,
       subject: body.subject || '',
       body: body.body || ''
     }
   }];
   ```
3. **Route by Action** - Switch node (3 outputs)

**Branch 1: mark_ready**
4a. **Update to Ready** - Airtable Update
   - Record ID: draft_id
   - Fields: status = "ready"
5a. **Success Response**
   ```javascript
   return [{
     json: {
       ok: true,
       data: {
         success: true,
         message: 'Draft marked as ready for sending'
       }
     }
   }];
   ```

**Branch 2: skip**
4b. **Update to Skipped** - Airtable Update
   - Record ID: draft_id
   - Fields: status = "skipped"
5b. **Success Response**
   ```javascript
   return [{
     json: {
       ok: true,
       data: {
         success: true,
         message: 'Draft skipped'
       }
     }
   }];
   ```

**Branch 3: edit_and_save**
4c. **Update Content and Mark Ready** - Airtable Update
   - Record ID: draft_id
   - Fields:
     - subject = new subject
     - body = new body
     - is_edited = true
     - status = "ready"
5c. **Success Response**
   ```javascript
   return [{
     json: {
       ok: true,
       data: {
         success: true,
         message: 'Draft updated and marked as ready'
       }
     }
   }];
   ```

6. **Merge All Branches** - Merge node
7. **Error Handler** - Code node (connected to error outputs)

---

### **Part 3: Update Laptop UI** (60 min)

#### **Step 1: Add Draft Type** (5 min)

**File:** `src/shared/types.ts`

```typescript
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

export interface DraftActionResponse {
  ok: boolean;
  data: {
    success: boolean;
    message: string;
  };
}
```

---

#### **Step 2: Create DraftReviewModal** (25 min)

**File:** `src/renderer/components/DraftReviewModal.tsx`

```typescript
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
```

---

#### **Step 3: Update FollowUpsTab** (30 min)

**File:** `src/renderer/components/FollowUpsTab.tsx`

Add tabbed interface and draft cards:

```typescript
import { useState, useEffect } from 'react';
import { Draft, FollowUp } from '../../shared/types';
import DraftReviewModal from './DraftReviewModal';
import EmailThreadModal from './EmailThreadModal';

type TabType = 'pending' | 'sent';

export default function FollowUpsTab() {
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  // Pending Drafts State
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftStats, setDraftStats] = useState({
    pending_review: 0,
    approved: 0,
    due_today: 0,
    overdue: 0
  });
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<Draft | null>(null);
  const [processing, setProcessing] = useState(false);

  // Sent Emails State (existing)
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  // ... rest of existing state

  // Load pending drafts
  const loadDrafts = async () => {
    setDraftsLoading(true);
    try {
      const response = await window.electronAPI.networkRequest('POST', '/webhook/drafts-list', {
        status_filter: 'needs_review',
        limit: 100,
        offset: 0
      });

      if (response.ok) {
        setDrafts(response.body.data.drafts || []);
        setDraftStats(response.body.data.stats || {});
      }
    } catch (e) {
      console.error('Failed to load drafts:', e);
    } finally {
      setDraftsLoading(false);
    }
  };

  // Handle draft actions
  const handleDraftAction = async (draftId: string, action: string, updates?: {subject: string, body: string}) => {
    setProcessing(true);
    try {
      const response = await window.electronAPI.networkRequest('POST', '/webhook/draft-action', {
        draft_id: draftId,
        action,
        ...updates
      });

      if (response.ok) {
        setReviewModalOpen(false);
        loadDrafts(); // Refresh list
        // Show success toast
      }
    } catch (e) {
      console.error('Draft action failed:', e);
      // Show error toast
    } finally {
      setProcessing(false);
    }
  };

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'pending') {
      loadDrafts();
    } else {
      loadFollowups(); // existing function
    }
  }, [activeTab]);

  const getStageLabel = (stage: string): string => {
    const labels: Record<string, string> = {
      follow_up_1: 'FU#1 (Day 3)',
      follow_up_2: 'FU#2 (Day 7)',
      follow_up_3: 'FU#3 (Day 14)'
    };
    return labels[stage] || stage;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Tabs */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Follow-ups
          </h2>
          <button
            onClick={() => activeTab === 'pending' ? loadDrafts() : loadFollowups()}
            disabled={draftsLoading || loading}
            className="btn-secondary"
          >
            {(draftsLoading || loading) ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'pending'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            📋 Pending Review
            {draftStats.pending_review > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 rounded-full text-xs">
                {draftStats.pending_review}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'sent'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            📧 Sent Emails
          </button>
        </div>
      </div>

      {/* Pending Review Tab */}
      {activeTab === 'pending' && (
        <>
          {/* Stats Banner */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Pending Review</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{draftStats.pending_review}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Approved & Ready</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{draftStats.approved}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Due Today</div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{draftStats.due_today}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Overdue</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{draftStats.overdue}</div>
            </div>
          </div>

          {/* Draft Cards */}
          {!draftsLoading && drafts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 text-5xl mb-4">✅</div>
              <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">
                No drafts pending review
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Drafts will appear here after sending cold emails
              </p>
            </div>
          )}

          {!draftsLoading && drafts.length > 0 && (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 ${
                    draft.is_overdue
                      ? 'border-red-500'
                      : draft.is_due_today
                      ? 'border-yellow-500'
                      : 'border-blue-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {draft.company}
                        </h3>
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-xs font-medium">
                          {getStageLabel(draft.stage)}
                        </span>
                        {draft.is_edited && (
                          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-xs">
                            ✏️ Edited
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        To: {draft.email}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        <strong>Subject:</strong> {draft.subject}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <strong className={
                          draft.is_overdue
                            ? 'text-red-600 dark:text-red-400'
                            : draft.is_due_today
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : ''
                        }>
                          {draft.is_overdue
                            ? `⚠️ Overdue by ${Math.abs(draft.days_until_due!)} days`
                            : draft.is_due_today
                            ? '⏰ Due today'
                            : `📅 Due in ${draft.days_until_due} days`
                          }
                        </strong>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setCurrentDraft(draft);
                        setReviewModalOpen(true);
                      }}
                      className="btn-primary text-sm"
                    >
                      👁️ Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Sent Emails Tab */}
      {activeTab === 'sent' && (
        <>
          {/* Existing implementation */}
          {/* ... stats banner, filters, table, etc. ... */}
        </>
      )}

      {/* Draft Review Modal */}
      {currentDraft && (
        <DraftReviewModal
          isOpen={reviewModalOpen}
          draft={currentDraft}
          onClose={() => setReviewModalOpen(false)}
          onAction={handleDraftAction}
          processing={processing}
        />
      )}

      {/* Existing Email Thread Modal */}
      {/* ... */}
    </div>
  );
}
```

---

### **Part 4: Bug Fixes** (10 min)

#### **Fix Original Email Label**

**File:** Update your n8n Endpoint 2, Node 8

**Current line:**
```javascript
stage: root.follow_up_stage || 'initial'
```

**Change to:**
```javascript
stage: root.parent_email_id ? root.follow_up_stage : 'initial'
```

**Why this works:**
- If record has `parent_email_id`, it's a follow-up → use its stage
- If no `parent_email_id`, it's ALWAYS the original → force 'initial'

---

## ✅ Testing Checklist

### **End-to-End Flow:**

1. **Send Cold Email**
   - Open GTM Console → Prospects tab
   - Generate and send email
   - Verify email sends

2. **Verify Draft Generation**
   - Wait 1-2 minutes
   - Open Airtable → FollowupQueue table
   - Confirm 3 records created:
     - follow_up_1 (due_date = Day 3)
     - follow_up_2 (due_date = Day 7)
     - follow_up_3 (due_date = Day 14)
   - All have status="needs_review"

3. **Review Drafts in UI**
   - GTM Console → Follow-ups tab → "Pending Review"
   - See 3 draft cards
   - Stats show: Pending Review = 3

4. **Review and Approve**
   - Click "Review" on FU#1
   - Modal opens showing draft
   - Edit subject/body (optional)
   - Click "Mark as Ready" or "Save & Mark Ready"
   - Draft disappears from list
   - Repeat for FU#2 and FU#3

5. **Verify Approval**
   - Airtable → FollowupQueue
   - All 3 records now have status="ready"

6. **Wait for Auto-Send**
   - Option A: Wait until next 9 AM (Mon-Fri)
   - Option B: Manually trigger workflow in n8n

7. **Verify Sending**
   - FU#1 sends on Day 3 at 9 AM
   - Check Gmail: Email sent
   - Airtable Outbox: New record created with parent_email_id
   - FollowupQueue: FU#1 status="sent", sent_at populated

8. **View in Sent Emails Tab**
   - GTM Console → Follow-ups → "Sent Emails"
   - Click "View Thread"
   - Timeline shows:
     - Blue box: Original email (labeled "Original Email")
     - Purple box: FU#1 (labeled "Follow-up 1 (Day 3)")

9. **Repeat for FU#2 and FU#3**
   - FU#2 sends on Day 7
   - FU#3 sends on Day 14

---

## 📊 Final System Architecture

### **Complete Data Flow:**

```
1. User sends cold email (Prospects tab)
   ↓
2. n8n: Cold Email workflow
   ↓
3. n8n: Loop through 3 templates, generate with AI
   ↓
4. n8n: Create 3 FollowupQueue records (status="needs_review")
   ↓
5. User: Navigate to Follow-ups tab → "Pending Review"
   ↓
6. UI: Fetch drafts via /webhook/drafts-list
   ↓
7. User: Click "Review" on each draft
   ↓
8. User: Edit (optional) and click "Mark as Ready"
   ↓
9. UI: Call /webhook/draft-action (edit_and_save or mark_ready)
   ↓
10. Airtable: Draft status → "ready"
   ↓
11. n8n: Daily workflow (9 AM) finds ready drafts where due_date <= today
   ↓
12. n8n: Send via Gmail, log to Outbox, mark as sent
   ↓
13. User: View sent follow-ups in "Sent Emails" tab → Timeline view
```

---

## ⏱️ Time Tracking

| Task | Estimated | Status |
|------|-----------|--------|
| Part 1: Update Mac Mini workflow | 15 min | Pending |
| Part 2a: Build /webhook/drafts-list | 25 min | Pending |
| Part 2b: Build /webhook/draft-action | 20 min | Pending |
| Part 3a: Add Draft types | 5 min | Pending |
| Part 3b: Create DraftReviewModal | 25 min | Pending |
| Part 3c: Update FollowUpsTab | 30 min | Pending |
| Part 4: Fix label bug | 2 min | Pending |
| Testing | 15 min | Pending |
| **TOTAL** | **~2.5 hours** | |

---

## 🎯 Success Criteria

**System complete when:**
- ✅ All 3 drafts generate immediately after sending cold email
- ✅ Drafts appear in "Pending Review" tab
- ✅ User can review, edit, approve each draft
- ✅ Approved drafts send automatically on scheduled dates
- ✅ Sent follow-ups appear in timeline view with correct labels
- ✅ Stats show accurate counts
- ✅ No errors in console or n8n logs

---

*Ready to implement - November 8, 2025*
