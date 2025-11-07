# n8n Webhook Endpoints Implementation Guide
## Follow-ups Tab Backend

This guide provides step-by-step instructions for building 3 n8n webhook endpoints to power the Follow-ups tab in your GTM Console.

---

## Table of Contents

1. [Overview](#overview)
2. [Endpoint 1: `/webhook/followups-list`](#endpoint-1-webhookfollowups-list)
3. [Endpoint 2: `/webhook/followup-details`](#endpoint-2-webhookfollowup-details)
4. [Endpoint 3: `/webhook/followup-action`](#endpoint-3-webhookfollowup-action)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## Overview

### What You're Building

Three webhook endpoints that integrate with your Airtable Outbox table:

| Endpoint | Purpose | Complexity |
|----------|---------|------------|
| `/webhook/followups-list` | Query and filter follow-ups with statistics | Medium |
| `/webhook/followup-details` | Fetch complete email thread | Medium |
| `/webhook/followup-action` | Handle manual actions (close, send now) | High |

### Prerequisites

- n8n instance with access to:
  - Airtable (Outbox table with Phase 1 follow-up fields)
  - Gmail API (for send_now action)
  - Claude API (for AI email generation)
- Webhook secret configured in GTM Console settings

---

## Endpoint 1: `/webhook/followups-list`

### Purpose
Query Airtable Outbox, apply filters, calculate statistics, and return paginated follow-up rows.

### Expected Input

```json
{
  "limit": 50,
  "offset": 0,
  "stage_filter": "all",
  "status_filter": "all"
}
```

**Filter Options:**
- `stage_filter`: `"all"` | `"initial"` | `"follow_up_1"` | `"follow_up_2"` | `"follow_up_3"` | `"replied"` | `"closed"`
- `status_filter`: `"all"` | `"sent"` | `"replied"` | `"closed"`

### n8n Workflow - Node by Node

#### Node 1: Webhook Trigger
- **Type:** Webhook
- **Name:** `Receive Request`
- **Settings:**
  - Path: `followups-list`
  - Method: POST
  - Authentication: Header Auth
    - Header Name: `x-webhook-secret`
    - Credential: [Your webhook secret]
  - Response Mode: When Last Node Finishes

#### Node 2: Extract Parameters
- **Type:** Code
- **Name:** `Parse Input`
- **Code:**
```javascript
const body = items[0].json.body || items[0].json;

const limit = body.limit || 50;
const offset = body.offset || 0;
const stageFilter = body.stage_filter || 'all';
const statusFilter = body.status_filter || 'all';

return [{
  json: {
    limit,
    offset,
    stage_filter: stageFilter,
    status_filter: statusFilter
  }
}];
```

#### Node 3: Build Airtable Filter Formula
- **Type:** Code
- **Name:** `Build Filter Formula`
- **Code:**
```javascript
const stageFilter = items[0].json.stage_filter;
const statusFilter = items[0].json.status_filter;

// Base filter: only show emails that have been sent
let conditions = ['{status} != ""'];

// Stage filter
if (stageFilter !== 'all') {
  conditions.push(`{follow_up_stage} = '${stageFilter}'`);
}

// Status filter
if (statusFilter !== 'all') {
  conditions.push(`{status} = '${statusFilter}'`);
}

// Build final formula
const formula = conditions.length > 0
  ? `AND(${conditions.join(', ')})`
  : '';

return [{
  json: {
    ...items[0].json,
    filter_formula: formula
  }
}];
```

**Note:** Airtable formulas use curly braces `{field_name}` for field references.

#### Node 4: Query Airtable - Outbox
- **Type:** Airtable
- **Name:** `Get Follow-ups from Outbox`
- **Operation:** List
- **Settings:**
  - Base: [Your Outbox base ID]
  - Table: `Outbox`
  - Return All: No
  - Limit: `={{$json.limit}}`
  - Filter by Formula: `={{$json.filter_formula}}`
  - Sort:
    - Field: `sent_at`
    - Direction: DESC

#### Node 5: Calculate Days and Format
- **Type:** Code
- **Name:** `Calculate Days and Format`
- **Code:**
```javascript
const records = items.map(item => {
  const sentAt = item.json.sent_at;
  const lastFollowupSent = item.json.last_followup_sent;
  const repliedAt = item.json.replied_at;

  // Calculate days since sent
  const sentDate = new Date(sentAt);
  const now = new Date();
  const daysSinceSent = Math.floor((now - sentDate) / (1000 * 60 * 60 * 24));

  // Calculate days since last activity
  let lastActivityDate = sentDate;
  if (lastFollowupSent) {
    lastActivityDate = new Date(lastFollowupSent);
  }
  if (repliedAt) {
    const replyDate = new Date(repliedAt);
    if (replyDate > lastActivityDate) {
      lastActivityDate = replyDate;
    }
  }
  const daysSinceLastActivity = Math.floor((now - lastActivityDate) / (1000 * 60 * 60 * 24));

  return {
    json: {
      id: item.json.id,
      email: item.json.email || '',
      company: item.json.company || '',
      subject: item.json.subject || '',
      status: item.json.status || 'sent',
      follow_up_stage: item.json.follow_up_stage || 'initial',
      follow_up_count: item.json.follow_up_count || 0,
      sent_at: sentAt,
      last_followup_sent: lastFollowupSent || null,
      replied_at: repliedAt || null,
      reply_snippet: item.json.reply_snippet || null,
      days_since_sent: daysSinceSent,
      days_since_last_activity: daysSinceLastActivity,
      airtable_url: `https://airtable.com/app123/tbl456/${item.json.id}` // Update with your actual Airtable URL
    }
  };
});

return records;
```

#### Node 6: Query All Records for Stats
- **Type:** Airtable
- **Name:** `Get All for Stats`
- **Operation:** List
- **Settings:**
  - Base: [Your Outbox base ID]
  - Table: `Outbox`
  - Return All: Yes
  - Filter by Formula: `AND({status} = 'sent', {follow_up_stage} != "")`

**Purpose:** This queries ALL records to calculate accurate stats, regardless of pagination.

#### Node 7: Calculate Statistics
- **Type:** Code
- **Name:** `Calculate Stats`
- **Code:**
```javascript
const allRecords = items;

// Initialize counters
let total = 0;
let awaitingReply = 0;
let replied = 0;
const byStage = {
  initial: 0,
  follow_up_1: 0,
  follow_up_2: 0,
  follow_up_3: 0,
  replied: 0,
  closed: 0
};

// Count by status and stage
allRecords.forEach(record => {
  total++;

  const stage = record.json.follow_up_stage;
  const status = record.json.status;

  if (byStage[stage] !== undefined) {
    byStage[stage]++;
  }

  if (status === 'replied') {
    replied++;
  } else if (status === 'sent' && stage !== 'closed') {
    awaitingReply++;
  }
});

// Calculate reply rate
const replyRate = total > 0 ? (replied / total) * 100 : 0;

return [{
  json: {
    stats: {
      total,
      awaiting_reply: awaitingReply,
      replied,
      reply_rate: Math.round(replyRate * 10) / 10, // Round to 1 decimal
      by_stage: byStage
    }
  }
}];
```

#### Node 8: Format Final Response
- **Type:** Code
- **Name:** `Build Final Response`
- **Code:**
```javascript
// Get data from previous nodes using $items()
const followupsNode = $items("Calculate Days and Format");
const statsNode = $items("Calculate Stats");

const followups = followupsNode ? followupsNode.map(item => item.json) : [];
const stats = statsNode && statsNode[0] ? statsNode[0].json.stats : {
  total: 0,
  awaiting_reply: 0,
  replied: 0,
  reply_rate: 0,
  by_stage: {
    initial: 0,
    follow_up_1: 0,
    follow_up_2: 0,
    follow_up_3: 0,
    replied: 0,
    closed: 0
  }
};

return [{
  json: {
    ok: true,
    data: {
      followups,
      total: followups.length,
      stats
    }
  }
}];
```

**Connection:** This node should be connected to receive output from both Node 5 (followups) and Node 7 (stats).

#### Node 9: Error Handler (Optional)
- **Type:** Code
- **Name:** `Error Response`
- **Trigger:** Connect this to error outputs of previous nodes
- **Code:**
```javascript
return [{
  json: {
    ok: false,
    error: {
      message: $json.error?.message || 'An error occurred while fetching follow-ups'
    },
    data: {
      followups: [],
      total: 0,
      stats: {
        total: 0,
        awaiting_reply: 0,
        replied: 0,
        reply_rate: 0,
        by_stage: {}
      }
    }
  }
}];
```

### Expected Output Format

```json
{
  "ok": true,
  "data": {
    "followups": [
      {
        "id": "recABCDEF123",
        "email": "john@company.com",
        "company": "Company Name",
        "subject": "Re: Partnership opportunity",
        "status": "sent",
        "follow_up_stage": "follow_up_1",
        "follow_up_count": 1,
        "sent_at": "2025-11-01T10:00:00.000Z",
        "last_followup_sent": "2025-11-04T10:00:00.000Z",
        "replied_at": null,
        "reply_snippet": null,
        "days_since_sent": 6,
        "days_since_last_activity": 3,
        "airtable_url": "https://airtable.com/app123/tbl456/recABCDEF123"
      }
    ],
    "total": 25,
    "stats": {
      "total": 150,
      "awaiting_reply": 98,
      "replied": 45,
      "reply_rate": 30.0,
      "by_stage": {
        "initial": 60,
        "follow_up_1": 25,
        "follow_up_2": 10,
        "follow_up_3": 3,
        "replied": 45,
        "closed": 7
      }
    }
  }
}
```

---

## Endpoint 2: `/webhook/followup-details`

### Purpose
Fetch the complete email thread for a given Outbox record, including original email, all follow-ups (linked via `parent_email_id`), and reply information.

### Expected Input

```json
{
  "outbox_id": "recABCDEF123"
}
```

### Understanding Parent/Child Relationships

In Airtable:
- Original emails have **no** `parent_email_id`
- Follow-up emails have `parent_email_id` linking to the original
- The field `follow_up_emails` (auto-created reciprocal field) shows all children

### n8n Workflow - Node by Node

#### Node 1: Webhook Trigger
- **Type:** Webhook
- **Name:** `Receive Request`
- **Settings:**
  - Path: `followup-details`
  - Method: POST
  - Authentication: Header Auth
  - Response Mode: When Last Node Finishes

#### Node 2: Extract Outbox ID
- **Type:** Code
- **Name:** `Parse Input`
- **Code:**
```javascript
const body = items[0].json.body || items[0].json;
const outboxId = body.outbox_id;

if (!outboxId) {
  throw new Error('outbox_id is required');
}

return [{
  json: {
    outbox_id: outboxId
  }
}];
```

#### Node 3: Get Record by ID
- **Type:** Airtable
- **Name:** `Get Record by ID`
- **Operation:** Get
- **Settings:**
  - Base: [Your Outbox base ID]
  - Table: `Outbox`
  - Record ID: `={{$json.outbox_id}}`

#### Node 4: Determine Thread Root
- **Type:** Code
- **Name:** `Find Thread Root`
- **Code:**
```javascript
const record = items[0].json;

// Check if this record has a parent_email_id (meaning it's a follow-up)
const parentEmailId = record.parent_email_id;

if (parentEmailId && parentEmailId.length > 0) {
  // This is a follow-up, return parent ID
  // Airtable returns linked records as arrays
  return [{
    json: {
      root_id: parentEmailId[0],
      is_followup: true,
      current_record: record
    }
  }];
} else {
  // This is the original email
  return [{
    json: {
      root_id: record.id,
      is_followup: false,
      current_record: record
    }
  }];
}
```

#### Node 5: Conditional - Is Follow-up?
- **Type:** IF
- **Name:** `Is Follow-up?`
- **Conditions:**
  - Value 1: `={{$json.is_followup}}`
  - Operation: Equal
  - Value 2: `true`

#### Node 5a: Fetch Root Email (TRUE branch)
- **Type:** Airtable
- **Name:** `Get Root Email`
- **Operation:** Get
- **Settings:**
  - Base: [Your Outbox base ID]
  - Table: `Outbox`
  - Record ID: `={{$json.root_id}}`

#### Node 5b: Pass Through (FALSE branch)
- **Type:** No Operation, do nothing
- **Name:** `Already Have Root`

**Note:** When the FALSE branch executes, the current record IS the root email.

#### Node 6: Merge Branches
- **Type:** Merge
- **Name:** `Merge Root Email`
- **Settings:**
  - Mode: Merge By Index
  - Connect both branches (5a and 5b) to this node

#### Node 7: Query All Follow-ups
- **Type:** Airtable
- **Name:** `Get All Follow-ups`
- **Operation:** List
- **Settings:**
  - Base: [Your Outbox base ID]
  - Table: `Outbox`
  - Return All: Yes
  - Filter by Formula: `{parent_email_id} = "={{$json.id}}"`
    - This finds all records where parent_email_id links to the root email
  - Sort:
    - Field: `sent_at`
    - Direction: ASC

**Important:** The formula must use the `id` from the merged root email.

#### Node 8: Build Email Thread
- **Type:** Code
- **Name:** `Construct Email Thread`
- **Code:**
```javascript
const rootNode = $items("Merge Root Email");
const followupsNode = $items("Get All Follow-ups") || [];

const root = rootNode[0].json;

// Build original email object
const original = {
  id: root.id,
  subject: root.subject || '',
  body: root.body || '',
  sent_at: root.sent_at,
  stage: root.follow_up_stage || 'initial'
};

// Build follow-ups array
const followups = followupsNode.map(item => ({
  id: item.json.id,
  subject: item.json.subject || '',
  body: item.json.body || '',
  sent_at: item.json.sent_at,
  stage: item.json.follow_up_stage || 'follow_up_1'
}));

// Build reply object (if exists)
let reply = null;
if (root.replied_at && root.reply_body) {
  reply = {
    replied_at: root.replied_at,
    reply_body: root.reply_body,
    reply_snippet: root.reply_snippet || ''
  };
}

return [{
  json: {
    ok: true,
    data: {
      thread: {
        original,
        followups,
        reply
      }
    }
  }
}];
```

#### Node 9: Error Handler
- **Type:** Code
- **Name:** `Error Response`
- **Code:**
```javascript
return [{
  json: {
    ok: false,
    error: {
      message: $json.error?.message || 'Failed to fetch thread details'
    }
  }
}];
```

### Expected Output Format

```json
{
  "ok": true,
  "data": {
    "thread": {
      "original": {
        "id": "recABCDEF123",
        "subject": "Partnership opportunity with Acme Corp",
        "body": "Hi John,\n\nI noticed your company...",
        "sent_at": "2025-11-01T10:00:00.000Z",
        "stage": "initial"
      },
      "followups": [
        {
          "id": "recXYZ456",
          "subject": "Re: Partnership opportunity with Acme Corp",
          "body": "Hi again,\n\nJust checking if you had a chance...",
          "sent_at": "2025-11-04T10:00:00.000Z",
          "stage": "follow_up_1"
        },
        {
          "id": "recPQR789",
          "subject": "Re: Partnership opportunity with Acme Corp",
          "body": "Hi John,\n\nI wanted to follow up one more time...",
          "sent_at": "2025-11-08T10:00:00.000Z",
          "stage": "follow_up_2"
        }
      ],
      "reply": null
    }
  }
}
```

**With Reply:**
```json
{
  "reply": {
    "replied_at": "2025-11-09T14:30:00.000Z",
    "reply_body": "Hi! Thanks for reaching out. I'm interested in learning more...",
    "reply_snippet": "Hi! Thanks for reaching out. I'm interested in..."
  }
}
```

---

## Endpoint 3: `/webhook/followup-action`

### Purpose
Handle manual override actions from the Follow-ups tab UI:
- `mark_closed` - Stop follow-up sequence
- `mark_replied` - Mark as replied (stops follow-ups)
- `send_now` - Send next follow-up immediately

### Expected Input

```json
{
  "outbox_id": "recABCDEF123",
  "action": "mark_closed",
  "note": "Optional note"
}
```

**Valid Actions:**
- `mark_closed` - Sets stage to "closed", stops automation
- `mark_replied` - Sets stage to "replied", stops automation
- `send_now` - Generates and sends next follow-up immediately

### n8n Workflow - Node by Node

#### Node 1: Webhook Trigger
- **Type:** Webhook
- **Name:** `Receive Action Request`
- **Settings:**
  - Path: `followup-action`
  - Method: POST
  - Authentication: Header Auth
  - Response Mode: When Last Node Finishes

#### Node 2: Parse and Validate
- **Type:** Code
- **Name:** `Validate Input`
- **Code:**
```javascript
const body = items[0].json.body || items[0].json;

const outboxId = body.outbox_id;
const action = body.action;
const note = body.note || '';

if (!outboxId) {
  throw new Error('outbox_id is required');
}

if (!action || !['mark_closed', 'mark_replied', 'send_now'].includes(action)) {
  throw new Error('action must be one of: mark_closed, mark_replied, send_now');
}

return [{
  json: {
    outbox_id: outboxId,
    action,
    note
  }
}];
```

#### Node 3: Route by Action
- **Type:** Switch
- **Name:** `Route Action`
- **Mode:** Rules
- **Rules:**
  - Output 0: `{{$json.action}} === "mark_closed"`
  - Output 1: `{{$json.action}} === "mark_replied"`
  - Output 2: `{{$json.action}} === "send_now"`

---

### Branch 1: Mark as Closed (Output 0)

#### Node 4a: Update to Closed
- **Type:** Airtable
- **Name:** `Mark as Closed`
- **Operation:** Update
- **Settings:**
  - Base: [Your Outbox base ID]
  - Table: `Outbox`
  - Record ID: `={{$json.outbox_id}}`
  - Fields to Update:
    - `follow_up_stage` = `closed`
    - `status` = `closed`

#### Node 5a: Success Response
- **Type:** Code
- **Name:** `Closed Success`
- **Code:**
```javascript
return [{
  json: {
    ok: true,
    data: {
      success: true,
      message: 'Marked as closed. No further follow-ups will be sent.'
    }
  }
}];
```

---

### Branch 2: Mark as Replied (Output 1)

#### Node 4b: Update to Replied
- **Type:** Airtable
- **Name:** `Mark as Replied`
- **Operation:** Update
- **Settings:**
  - Base: [Your Outbox base ID]
  - Table: `Outbox`
  - Record ID: `={{$json.outbox_id}}`
  - Fields to Update:
    - `follow_up_stage` = `replied`
    - `status` = `replied`
    - `replied_at` = `={{$now.toISO()}}`
    - `reply_snippet` = `Manual override - marked as replied`

#### Node 5b: Success Response
- **Type:** Code
- **Name:** `Replied Success`
- **Code:**
```javascript
return [{
  json: {
    ok: true,
    data: {
      success: true,
      message: 'Marked as replied. Follow-up sequence stopped.'
    }
  }
}];
```

---

### Branch 3: Send Now (Output 2)

This is the most complex branch - it generates and sends a follow-up immediately.

#### Node 4c: Get Current Record
- **Type:** Airtable
- **Name:** `Get Current Stage`
- **Operation:** Get
- **Settings:**
  - Base: [Your Outbox base ID]
  - Table: `Outbox`
  - Record ID: `={{$json.outbox_id}}`

#### Node 5c: Determine Next Stage
- **Type:** Code
- **Name:** `Calculate Next Stage`
- **Code:**
```javascript
const record = items[0].json;
const currentStage = record.follow_up_stage;

let nextStage;
let templateStage;

// Determine what stage comes next
if (currentStage === 'initial') {
  nextStage = 'follow_up_1';
  templateStage = 'follow_up_1';
} else if (currentStage === 'follow_up_1') {
  nextStage = 'follow_up_2';
  templateStage = 'follow_up_2';
} else if (currentStage === 'follow_up_2') {
  nextStage = 'follow_up_3';
  templateStage = 'follow_up_3';
} else {
  throw new Error('Cannot send follow-up: already at final stage or closed');
}

return [{
  json: {
    record,
    next_stage: nextStage,
    template_stage: templateStage
  }
}];
```

#### Node 6c: Get Follow-up Template
- **Type:** Airtable
- **Name:** `Get Follow-up Template`
- **Operation:** List
- **Settings:**
  - Base: [Your FollowupTemplates base ID]
  - Table: `FollowupTemplates`
  - Filter by Formula: `{stage} = "={{$json.template_stage}}"`
  - Limit: 1

**Important:** This queries the FollowupTemplates table you created in Phase 1.

#### Node 7c: Build AI Prompt
- **Type:** Code
- **Name:** `Prepare AI Context`
- **Code:**
```javascript
const record = $node["Get Current Stage"].json;
const template = items[0].json;

// Replace placeholders in template
const prompt = template.template_prompt
  .replace('{company}', record.company || '')
  .replace('{subject}', record.subject || '')
  .replace('{original_context}', record.body ? record.body.substring(0, 200) : '');

return [{
  json: {
    record,
    template,
    ai_prompt: prompt,
    next_stage: $node["Calculate Next Stage"].json.next_stage
  }
}];
```

#### Node 8c: AI Generation
- **Type:** HTTP Request
- **Name:** `Generate Follow-up with AI`
- **Method:** POST
- **URL:** `https://api.anthropic.com/v1/messages`
- **Authentication:** Header Auth
  - Name: `x-api-key`
  - Value: `{{$credentials.anthropicApi.apiKey}}` or your API key
- **Headers:**
  - `anthropic-version`: `2023-06-01`
  - `content-type`: `application/json`
- **Body (JSON):**
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 500,
  "messages": [
    {
      "role": "user",
      "content": "={{$json.ai_prompt}}"
    }
  ]
}
```

**Note:** Configure Anthropic API credentials in n8n first.

#### Node 9c: Parse AI Response
- **Type:** Code
- **Name:** `Extract Email Content`
- **Code:**
```javascript
const aiResponse = items[0].json.content[0].text;
const record = $node["Prepare AI Context"].json.record;
const nextStage = $node["Prepare AI Context"].json.next_stage;

// Try to parse as JSON, fallback to plain text
let parsed;
try {
  parsed = JSON.parse(aiResponse);
} catch (e) {
  // AI returned plain text, not JSON
  parsed = {
    subject: `Re: ${record.subject}`,
    body: aiResponse
  };
}

return [{
  json: {
    record,
    next_stage: nextStage,
    generated_subject: parsed.subject,
    generated_body: parsed.body
  }
}];
```

#### Node 10c: Send via Gmail
- **Type:** Gmail
- **Name:** `Send Follow-up Email`
- **Operation:** Send
- **Settings:**
  - To: `={{$json.record.email}}`
  - Subject: `={{$json.generated_subject}}`
  - Message Type: Text
  - Message: `={{$json.generated_body}}`

**Note:** Configure Gmail OAuth credentials in n8n first.

#### Node 11c: Create Outbox Record for Follow-up
- **Type:** Airtable
- **Name:** `Log Follow-up to Outbox`
- **Operation:** Create
- **Settings:**
  - Base: [Your Outbox base ID]
  - Table: `Outbox`
  - Fields:
    - `email` = `={{$json.record.email}}`
    - `company` = `={{$json.record.company}}`
    - `subject` = `={{$json.generated_subject}}`
    - `body` = `={{$json.generated_body}}`
    - `status` = `sent`
    - `sent_at` = `={{$now.toISO()}}`
    - `follow_up_stage` = `={{$json.next_stage}}`
    - `follow_up_count` = `0`
    - `parent_email_id` = `["={{$json.record.id}}"]`

**Important:** `parent_email_id` must be an array with the record ID.

#### Node 12c: Update Original Record
- **Type:** Airtable
- **Name:** `Update Original Email`
- **Operation:** Update
- **Settings:**
  - Base: [Your Outbox base ID]
  - Table: `Outbox`
  - Record ID: `={{$json.record.id}}`
  - Fields to Update:
    - `follow_up_count` = `={{$json.record.follow_up_count + 1}}`
    - `last_followup_sent` = `={{$now.toISO()}}`
    - `follow_up_stage` = `={{$json.next_stage}}`

#### Node 13c: Success Response
- **Type:** Code
- **Name:** `Send Now Success`
- **Code:**
```javascript
return [{
  json: {
    ok: true,
    data: {
      success: true,
      message: 'Follow-up sent immediately'
    }
  }
}];
```

---

### Merge All Branches

#### Node 14: Merge Results
- **Type:** Merge
- **Name:** `Combine All Branches`
- **Settings:**
  - Mode: Append
  - Inputs: Connect from Node 5a, 5b, and 13c

#### Node 15: Error Handler
- **Type:** Code
- **Name:** `Error Response`
- **Code:**
```javascript
return [{
  json: {
    ok: false,
    data: {
      success: false,
      message: $json.error?.message || 'Action failed'
    }
  }
}];
```

### Expected Output Format

```json
{
  "ok": true,
  "data": {
    "success": true,
    "message": "Marked as closed. No further follow-ups will be sent."
  }
}
```

---

## Testing

### Prerequisites
- n8n workflows activated
- Webhook secret configured in GTM Console settings
- Test data in Airtable Outbox table

### Test Command Templates

#### 1. Test followups-list

```bash
curl -X POST https://your-n8n-instance.com/webhook/followups-list \
  -H "x-webhook-secret: YOUR_SECRET_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 10,
    "offset": 0,
    "stage_filter": "all",
    "status_filter": "all"
  }'
```

**Expected:** JSON response with followups array and stats object.

#### 2. Test followup-details

First, get a valid `outbox_id` from the followups-list response, then:

```bash
curl -X POST https://your-n8n-instance.com/webhook/followup-details \
  -H "x-webhook-secret: YOUR_SECRET_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "outbox_id": "recABCDEF123"
  }'
```

**Expected:** JSON response with thread object containing original, followups, and reply.

#### 3. Test followup-action (mark_closed)

```bash
curl -X POST https://your-n8n-instance.com/webhook/followup-action \
  -H "x-webhook-secret: YOUR_SECRET_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "outbox_id": "recABCDEF123",
    "action": "mark_closed"
  }'
```

**Expected:** Success message confirming the action.

#### 4. Test followup-action (send_now) - CAUTION

**WARNING:** This will actually send an email!

```bash
curl -X POST https://your-n8n-instance.com/webhook/followup-action \
  -H "x-webhook-secret: YOUR_SECRET_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "outbox_id": "recTESTEMAIL",
    "action": "send_now"
  }'
```

**Recommendation:** Test with a test email address first!

### Testing in GTM Console

Once endpoints are working via curl:

1. Run the Electron app: `npm run electron:dev`
2. Configure settings (n8n URL, webhook secret)
3. Click the "Follow-ups" tab
4. Should see data load automatically
5. Click "View Thread" on any row
6. Test manual actions in the modal

---

## Troubleshooting

### Common Issues

#### Issue: "Cannot read property 'json' of undefined"
**Cause:** Node expecting data that doesn't exist
**Fix:**
- Check previous node executed successfully
- Add null checks: `items[0]?.json || {}`
- Verify node connections

#### Issue: Airtable formula syntax error
**Cause:** Invalid formula syntax
**Fix:**
- Use curly braces for fields: `{field_name}`
- Use straight quotes: `"` not `"` or `"`
- Test formula in Airtable UI first

#### Issue: "parent_email_id is not an array"
**Cause:** Linked record fields return arrays
**Fix:** Access first element: `record.parent_email_id[0]`

#### Issue: Empty followups array
**Cause:** Filter formula not matching records
**Fix:**
- Check Airtable field names match exactly (case-sensitive)
- Test filter formula directly in Airtable
- Verify records have required fields populated

#### Issue: Stats showing 0 for everything
**Cause:** Stats query not finding records
**Fix:**
- Check filter formula in "Get All for Stats" node
- Verify Airtable connection is working
- Check field names in Calculate Stats code

#### Issue: AI generation failing
**Cause:** Invalid API key or wrong model name
**Fix:**
- Verify Anthropic API key is correct
- Check model name: `claude-3-5-sonnet-20241022`
- Review API error message in n8n execution log

#### Issue: Gmail not sending
**Cause:** OAuth credentials expired or not configured
**Fix:**
- Re-authenticate Gmail in n8n credentials
- Check Gmail API is enabled in Google Cloud
- Verify OAuth scopes include gmail.send

### Debugging Tips

1. **Use n8n Execution Log:**
   - View execution history
   - Check each node's input/output
   - Look for error messages

2. **Test Nodes Individually:**
   - Click "Execute Node" to test in isolation
   - Verify data flow between nodes
   - Use dummy data for testing

3. **Add Console Log Nodes:**
   - Insert Code nodes to log values
   - Use `console.log()` to debug
   - View logs in n8n UI

4. **Check Airtable Data:**
   - Verify fields exist and are spelled correctly
   - Check field types match expectations
   - Ensure records have required data

5. **Verify Webhook Authentication:**
   - Test with/without auth header
   - Check secret matches GTM Console settings
   - Try updating the secret and reloading

### Getting Help

If you encounter issues:
1. Check n8n execution logs for error details
2. Verify Airtable schema matches Phase 1 requirements
3. Test with curl commands before testing in UI
4. Review this guide's code snippets for typos
5. Check that all required credentials are configured in n8n

---

## Next Steps

After implementing these endpoints:

1. Test each endpoint individually with curl
2. Verify data appears correctly in GTM Console Follow-ups tab
3. Test manual actions (mark closed, send now)
4. Monitor n8n execution logs for errors
5. Document any custom modifications you made

**Phase 2 will be complete when:**
- All 3 endpoints return expected data
- Follow-ups tab loads without errors
- Email thread modal displays correctly
- Manual actions work as expected
- Stats banner shows accurate numbers

---

Good luck building your follow-up automation! 🚀
