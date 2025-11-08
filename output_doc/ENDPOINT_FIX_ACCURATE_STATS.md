# Fix: Accurate Stats Across All Statuses

**Problem:** Stats only show counts for the filtered status, not all statuses
**Solution:** Query ALL drafts separately for stats calculation

---

## Updated Workflow Structure

```
Node 1: Webhook Trigger
   ↓
Node 2: Parse Input
   ↓
Node 3: Build Filter Formula
   ↓
   ├─→ Node 4: Get Filtered Drafts (for display list)
   │      ↓
   └─→ Node 4b: Get ALL Drafts (for stats calculation)
          ↓
       Node 5: Process and Build Response (receives both inputs)
```

---

## Step-by-Step Implementation

### Step 1: Add Node 4b - Get ALL Drafts

**After Node 3, add a new Airtable node:**

- **Type:** Airtable
- **Name:** `Get ALL Drafts for Stats`
- **Operation:** List
- **Connection:** Connect from Node 3 (parallel to Node 4)
- **Settings:**
  - Base: [Your FollowupQueue base ID]
  - Table: `FollowupQueue`
  - Return All: Yes
  - Filter by Formula: **(leave EMPTY - we want ALL records)**
  - Sort: `due_date` ASC

**Important:** This node queries ALL drafts regardless of status, so we can calculate accurate stats.

---

### Step 2: Update Node 5 (formerly Node 6) - Process Both Inputs

**Node 5 needs to:**
1. Process the filtered drafts from Node 4 (for display)
2. Calculate stats from ALL drafts from Node 4b

**Replace Node 5 code with:**

```javascript
// Get filtered drafts from Node 4 (for display list)
const filteredItems = $items("Get Drafts from FollowupQueue");

// Get ALL drafts from Node 4b (for stats)
const allItems = $items("Get ALL Drafts for Stats");

// Handle empty filtered results
let processedDrafts = [];

if (filteredItems && filteredItems.length > 0) {
  // Check if first item is empty (from "Always Output Data")
  if (filteredItems[0].json && Object.keys(filteredItems[0].json).length > 0) {
    const now = new Date();

    processedDrafts = filteredItems.map(item => {
      const record = item.json;
      const dueDate = new Date(record.due_date);
      const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

      return {
        id: record.id,
        prospect_id: record.prospect_id,
        email: record.email || '',
        company: record.company || '',
        stage: record.stage || 'follow_up_1',
        subject: record.subject || '',
        body: record.body || '',
        original_subject: record.original_subject || '',
        original_body: record.original_body || '',
        status: record.status || 'needs_review',
        generated_at: record.generated_at || '',
        due_date: record.due_date || '',
        sent_at: record.sent_at || null,
        is_edited: record.is_edited || false,
        days_until_due: daysUntilDue,
        is_overdue: daysUntilDue < 0,
        is_due_today: daysUntilDue === 0
      };
    });
  }
}

// Calculate stats from ALL drafts
let pendingReview = 0;
let approved = 0;
let dueToday = 0;
let overdue = 0;

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

if (allItems && allItems.length > 0) {
  allItems.forEach(item => {
    const record = item.json;
    const status = record.status;

    // Count by status
    if (status === 'needs_review') {
      pendingReview++;
    } else if (status === 'ready') {
      approved++;
    }

    // Count due today/overdue (only for active statuses)
    if (status !== 'sent' && status !== 'skipped' && status !== 'replied') {
      if (record.due_date) {
        const dueDate = new Date(record.due_date);
        const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

        if (dueDateOnly < today) {
          overdue++;
        } else if (dueDateOnly.getTime() === today.getTime()) {
          dueToday++;
        }
      }
    }
  });
}

return [{
  json: {
    ok: true,
    data: {
      drafts: processedDrafts,
      stats: {
        pending_review: pendingReview,
        approved: approved,
        due_today: dueToday,
        overdue: overdue
      }
    }
  }
}];
```

---

## Key Points

1. **Node 4** queries filtered drafts (based on `status_filter` from request)
2. **Node 4b** queries ALL drafts (no filter)
3. **Node 5** uses Node 4 data for `drafts` array, Node 4b data for `stats`

---

## Testing

After implementing these changes:

### Test 1: With 0 pending review, 1 approved
```bash
curl -X POST http://localhost:5678/webhook/drafts-list \
  -H "x-webhook-secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"status_filter": "needs_review", "limit": 100, "offset": 0}'
```

**Expected:**
```json
{
  "ok": true,
  "data": {
    "drafts": [],
    "stats": {
      "pending_review": 0,
      "approved": 1,  // ✅ Shows the 1 ready draft
      "due_today": 0,
      "overdue": 0
    }
  }
}
```

### Test 2: Query for ready drafts
```bash
curl -X POST http://localhost:5678/webhook/drafts-list \
  -H "x-webhook-secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"status_filter": "ready", "limit": 100, "offset": 0}'
```

**Expected:**
```json
{
  "ok": true,
  "data": {
    "drafts": [
      { "id": "rec123", "status": "ready", ... }
    ],
    "stats": {
      "pending_review": 0,
      "approved": 1,
      "due_today": 0,
      "overdue": 0
    }
  }
}
```

---

*Created: November 8, 2025*
