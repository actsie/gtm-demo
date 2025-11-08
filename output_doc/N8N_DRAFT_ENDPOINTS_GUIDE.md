# n8n Draft Endpoints Implementation Guide

*For: Laptop n8n Instance*
*Created: November 8, 2025*

---

## Overview

This guide provides step-by-step instructions for building 2 n8n webhook endpoints that connect the GTM Console UI to the FollowupQueue table in Airtable.

**What These Endpoints Do:**
- `/webhook/drafts-list` - Fetches pending follow-up drafts from FollowupQueue
- `/webhook/draft-action` - Updates draft status (mark_ready, skip, edit_and_save)

**Prerequisites:**
- n8n instance running (same one with existing followups endpoints)
- Access to Airtable FollowupQueue table
- Webhook secret configured in GTM Console settings

---

## Endpoint 1: `/webhook/drafts-list`

### Purpose
Query FollowupQueue table for pending drafts, calculate stats, and return formatted results.

### Input
```json
{
  "status_filter": "needs_review" | "ready" | "all",
  "limit": 100,
  "offset": 0
}
```

### n8n Workflow - Node by Node

#### Node 1: Webhook Trigger
- **Type:** Webhook
- **Name:** `Receive Request`
- **Settings:**
  - Path: `drafts-list`
  - Method: POST
  - Authentication: Header Auth
    - Header Name: `x-webhook-secret`
    - Credential: [Your webhook secret]
  - Response Mode: When Last Node Finishes

---

#### Node 2: Parse Input
- **Type:** Code
- **Name:** `Parse Input`
- **Code:**
```javascript
const body = items[0].json.body || items[0].json;

const statusFilter = body.status_filter || 'needs_review';
const limit = body.limit || 100;
const offset = body.offset || 0;

return [{
  json: {
    status_filter: statusFilter,
    limit,
    offset
  }
}];
```

---

#### Node 3: Build Airtable Filter
- **Type:** Code
- **Name:** `Build Filter Formula`
- **Code:**
```javascript
const statusFilter = items[0].json.status_filter;

let formula = '';

if (statusFilter === 'needs_review') {
  formula = '{status} = "needs_review"';
} else if (statusFilter === 'ready') {
  formula = '{status} = "ready"';
}
// If 'all', leave formula empty to get everything

return [{
  json: {
    ...items[0].json,
    filter_formula: formula
  }
}];
```

---

#### Node 4: Query FollowupQueue
- **Type:** Airtable
- **Name:** `Get Drafts from FollowupQueue`
- **Operation:** List
- **Settings:**
  - Base: [Your FollowupQueue base ID]
  - Table: `FollowupQueue`
  - Return All: No
  - Limit: `={{$json.limit}}`
  - Filter by Formula: `={{$json.filter_formula}}`
  - Sort:
    - Field: `due_date`
    - Direction: ASC

---

#### Node 5: Calculate Days Until Due
- **Type:** Code
- **Name:** `Calculate Days and Format`
- **Code:**
```javascript
const records = items.map(item => {
  const dueDate = new Date(item.json.due_date);
  const now = new Date();

  // Calculate days until due (can be negative if overdue)
  const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

  const isOverdue = daysUntilDue < 0;
  const isDueToday = daysUntilDue === 0;

  return {
    json: {
      id: item.json.id,
      prospect_id: item.json.prospect_id,
      email: item.json.email || '',
      company: item.json.company || '',
      stage: item.json.stage || 'follow_up_1',
      subject: item.json.subject || '',
      body: item.json.body || '',
      original_subject: item.json.original_subject || '',
      original_body: item.json.original_body || '',
      status: item.json.status || 'needs_review',
      generated_at: item.json.generated_at || '',
      due_date: item.json.due_date || '',
      sent_at: item.json.sent_at || null,
      is_edited: item.json.is_edited || false,
      days_until_due: daysUntilDue,
      is_overdue: isOverdue,
      is_due_today: isDueToday
    }
  };
});

return records;
```

---

#### Node 6: Query All for Stats
- **Type:** Airtable
- **Name:** `Get All for Stats`
- **Operation:** List
- **Settings:**
  - Base: [Your FollowupQueue base ID]
  - Table: `FollowupQueue`
  - Return All: Yes
  - Filter by Formula: (leave empty to get all records)

**Note:** This queries ALL records to calculate accurate stats, regardless of pagination.

---

#### Node 7: Calculate Statistics
- **Type:** Code
- **Name:** `Calculate Stats`
- **Code:**
```javascript
const allRecords = items;

// Initialize counters
let pendingReview = 0;
let approved = 0;
let dueToday = 0;
let overdue = 0;

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

allRecords.forEach(record => {
  const status = record.json.status;
  const dueDate = new Date(record.json.due_date);
  const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

  // Count by status
  if (status === 'needs_review') {
    pendingReview++;
  } else if (status === 'ready') {
    approved++;
  }

  // Count due today/overdue (only for non-sent statuses)
  if (status !== 'sent' && status !== 'skipped' && status !== 'replied') {
    if (dueDateOnly < today) {
      overdue++;
    } else if (dueDateOnly.getTime() === today.getTime()) {
      dueToday++;
    }
  }
});

return [{
  json: {
    stats: {
      pending_review: pendingReview,
      approved: approved,
      due_today: dueToday,
      overdue: overdue
    }
  }
}];
```

---

#### Node 8: Build Final Response
- **Type:** Code
- **Name:** `Build Final Response`
- **Code:**
```javascript
// Get data from previous nodes
const draftsNode = $items("Calculate Days and Format");
const statsNode = $items("Calculate Stats");

const drafts = draftsNode ? draftsNode.map(item => item.json) : [];
const stats = statsNode && statsNode[0] ? statsNode[0].json.stats : {
  pending_review: 0,
  approved: 0,
  due_today: 0,
  overdue: 0
};

return [{
  json: {
    ok: true,
    data: {
      drafts,
      stats
    }
  }
}];
```

**Connection:** This node should receive output from both Node 5 (drafts) and Node 7 (stats).

---

#### Node 9: Error Handler (Optional)
- **Type:** Code
- **Name:** `Error Response`
- **Trigger:** Connect to error outputs of previous nodes
- **Code:**
```javascript
return [{
  json: {
    ok: false,
    error: {
      message: $json.error?.message || 'An error occurred while fetching drafts'
    },
    data: {
      drafts: [],
      stats: {
        pending_review: 0,
        approved: 0,
        due_today: 0,
        overdue: 0
      }
    }
  }
}];
```

---

### Expected Output
```json
{
  "ok": true,
  "data": {
    "drafts": [
      {
        "id": "recXYZ123",
        "prospect_id": "recABC456",
        "email": "john@company.com",
        "company": "Acme Corp",
        "stage": "follow_up_1",
        "subject": "Following up on our conversation",
        "body": "Hi John,\n\nJust wanted to follow up...",
        "original_subject": "Partnership opportunity",
        "original_body": "Hi John,\n\nI noticed...",
        "status": "needs_review",
        "generated_at": "2025-11-08T10:00:00.000Z",
        "due_date": "2025-11-11T09:00:00.000Z",
        "sent_at": null,
        "is_edited": false,
        "days_until_due": 3,
        "is_overdue": false,
        "is_due_today": false
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

## Endpoint 2: `/webhook/draft-action`

### Purpose
Update draft status or content based on user actions (mark_ready, skip, edit_and_save).

### Input
```json
{
  "draft_id": "recXYZ123",
  "action": "mark_ready" | "skip" | "edit_and_save",
  "subject": "Updated subject",  // only for edit_and_save
  "body": "Updated body"         // only for edit_and_save
}
```

### n8n Workflow - Node by Node

#### Node 1: Webhook Trigger
- **Type:** Webhook
- **Name:** `Receive Action Request`
- **Settings:**
  - Path: `draft-action`
  - Method: POST
  - Authentication: Header Auth
    - Header Name: `x-webhook-secret`
    - Credential: [Your webhook secret]
  - Response Mode: When Last Node Finishes

---

#### Node 2: Parse and Validate
- **Type:** Code
- **Name:** `Validate Input`
- **Code:**
```javascript
const body = items[0].json.body || items[0].json;

const draftId = body.draft_id;
const action = body.action;
const subject = body.subject || '';
const bodyText = body.body || '';

if (!draftId) {
  throw new Error('draft_id is required');
}

if (!action || !['mark_ready', 'skip', 'edit_and_save'].includes(action)) {
  throw new Error('action must be one of: mark_ready, skip, edit_and_save');
}

return [{
  json: {
    draft_id: draftId,
    action,
    subject,
    body: bodyText
  }
}];
```

---

#### Node 3: Route by Action
- **Type:** Switch
- **Name:** `Route Action`
- **Mode:** Rules
- **Rules:**
  - Output 0: `{{$json.action}} === "mark_ready"`
  - Output 1: `{{$json.action}} === "skip"`
  - Output 2: `={{$json.action}} === "edit_and_save"`

---

### Branch 1: Mark as Ready (Output 0)

#### Node 4a: Update to Ready
- **Type:** Airtable
- **Name:** `Mark as Ready`
- **Operation:** Update
- **Settings:**
  - Base: [Your FollowupQueue base ID]
  - Table: `FollowupQueue`
  - Record ID: `={{$json.draft_id}}`
  - Fields to Update:
    - `status` = `ready`

#### Node 5a: Success Response
- **Type:** Code
- **Name:** `Ready Success`
- **Code:**
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

---

### Branch 2: Skip (Output 1)

#### Node 4b: Update to Skipped
- **Type:** Airtable
- **Name:** `Mark as Skipped`
- **Operation:** Update
- **Settings:**
  - Base: [Your FollowupQueue base ID]
  - Table: `FollowupQueue`
  - Record ID: `={{$json.draft_id}}`
  - Fields to Update:
    - `status` = `skipped`

#### Node 5b: Success Response
- **Type:** Code
- **Name:** `Skip Success`
- **Code:**
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

---

### Branch 3: Edit and Save (Output 2)

#### Node 4c: Update Content and Mark Ready
- **Type:** Airtable
- **Name:** `Update and Mark Ready`
- **Operation:** Update
- **Settings:**
  - Base: [Your FollowupQueue base ID]
  - Table: `FollowupQueue`
  - Record ID: `={{$json.draft_id}}`
  - Fields to Update:
    - `subject` = `={{$json.subject}}`
    - `body` = `={{$json.body}}`
    - `is_edited` = `true`
    - `status` = `ready`

#### Node 5c: Success Response
- **Type:** Code
- **Name:** `Edit Success`
- **Code:**
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

---

### Merge All Branches

#### Node 6: Merge Results
- **Type:** Merge
- **Name:** `Combine All Branches`
- **Settings:**
  - Mode: Append
  - Connect from: Node 5a, 5b, 5c

---

#### Node 7: Error Handler
- **Type:** Code
- **Name:** `Error Response`
- **Trigger:** Connect to error outputs
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

---

### Expected Output
```json
{
  "ok": true,
  "data": {
    "success": true,
    "message": "Draft marked as ready for sending"
  }
}
```

---

## Testing

### Test Endpoint 1: drafts-list

```bash
curl -X POST https://your-n8n-url.com/webhook/drafts-list \
  -H "x-webhook-secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "status_filter": "needs_review",
    "limit": 100,
    "offset": 0
  }'
```

**Expected:** JSON with drafts array and stats object.

---

### Test Endpoint 2: draft-action (mark_ready)

First, get a draft_id from the drafts-list response, then:

```bash
curl -X POST https://your-n8n-url.com/webhook/draft-action \
  -H "x-webhook-secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "draft_id": "recXYZ123",
    "action": "mark_ready"
  }'
```

**Expected:** Success message confirming draft marked as ready.

---

### Test Endpoint 2: draft-action (edit_and_save)

```bash
curl -X POST https://your-n8n-url.com/webhook/draft-action \
  -H "x-webhook-secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "draft_id": "recXYZ123",
    "action": "edit_and_save",
    "subject": "Updated subject line",
    "body": "Updated email body content"
  }'
```

**Expected:** Success message confirming draft updated and marked ready.

---

## Troubleshooting

### Common Issues

#### Issue: "Cannot read property 'json' of undefined"
**Fix:** Check that previous node executed successfully and returned data.

#### Issue: Empty drafts array
**Cause:** No drafts with status="needs_review" in FollowupQueue
**Fix:** Check Airtable to verify drafts exist with correct status.

#### Issue: Stats showing 0
**Cause:** Node 6 query not finding records
**Fix:**
- Verify Airtable connection
- Check field names are exact match (case-sensitive)
- Ensure FollowupQueue has data

#### Issue: Action fails with "draft_id is required"
**Cause:** Missing draft_id in request body
**Fix:** Ensure UI is sending draft_id correctly

---

## Next Steps

After implementing both endpoints:
1. Test each with curl commands
2. Verify in GTM Console UI (Follow-ups tab → Pending Review)
3. Test workflow: Review → Edit → Mark Ready → Verify in Airtable
4. Update Mac Mini workflow to generate all 3 drafts at once

---

*Endpoints ready for implementation - November 8, 2025*
