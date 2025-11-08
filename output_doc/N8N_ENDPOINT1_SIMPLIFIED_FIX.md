# Simplified Fix for /webhook/drafts-list Endpoint

**Problem:** Node 8 can't access Node 7 output due to workflow execution order.

**Solution:** Combine the stats calculation into Node 8 directly.

---

## Updated Workflow Structure

```
Node 1: Webhook Trigger
   ↓
Node 2: Parse Input
   ↓
Node 3: Build Filter Formula
   ↓
Node 4: Get Drafts from FollowupQueue (filtered)
   ↓
Node 5: Calculate Days and Format
   ↓
Node 6: Get ALL Records for Stats (separate Airtable query)
   ↓
Node 7: Build Final Response with Stats
```

---

## New Node 7: Build Final Response with Inline Stats

**Type:** Code
**Name:** `Build Final Response`
**Execution Mode:** Run Once for All Items

**Code:**

```javascript
// Get the drafts from previous node (Node 5)
const drafts = items.map(item => item.json);

// Also query ALL records to calculate stats
// We'll use the Airtable node output from a parallel path
// OR calculate stats from the drafts we already have

// For now, let's calculate basic stats from the drafts array
let pendingReview = 0;
let approved = 0;
let dueToday = 0;
let overdue = 0;

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

drafts.forEach(draft => {
  const status = draft.status;

  // Count by status
  if (status === 'needs_review') {
    pendingReview++;
  } else if (status === 'ready') {
    approved++;
  }

  // Count due today/overdue (only for non-sent statuses)
  if (status !== 'sent' && status !== 'skipped' && status !== 'replied') {
    const dueDate = new Date(draft.due_date);
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    if (dueDateOnly < today) {
      overdue++;
    } else if (dueDateOnly.getTime() === today.getTime()) {
      dueToday++;
    }
  }
});

return [{
  json: {
    ok: true,
    data: {
      drafts,
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

## Alternative: Use Separate Query for Accurate Stats

If you want stats to reflect ALL records (not just the paginated drafts), keep two parallel queries:

**Workflow:**

```
                    → Node 4: Get Filtered Drafts
                   /     ↓
Node 3: Build Filter   Node 5: Calculate Days
                   \     ↓
                    → Node 6: Get ALL for Stats
                         ↓
                    Node 7: Combine in Code
```

**Node 7 Code (Updated):**

```javascript
// Access both queries using $items()
const draftsNode = $items("Calculate Days and Format");
const allRecordsNode = $items("Get All for Stats");

// Process drafts
const drafts = draftsNode.map(item => item.json);

// Calculate stats from ALL records
let pendingReview = 0;
let approved = 0;
let dueToday = 0;
let overdue = 0;

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

allRecordsNode.forEach(record => {
  const item = record.json;
  const status = item.status;

  if (status === 'needs_review') {
    pendingReview++;
  } else if (status === 'ready') {
    approved++;
  }

  if (status !== 'sent' && status !== 'skipped' && status !== 'replied') {
    const dueDate = new Date(item.due_date);
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    if (dueDateOnly < today) {
      overdue++;
    } else if (dueDateOnly.getTime() === today.getTime()) {
      dueToday++;
    }
  }
});

return [{
  json: {
    ok: true,
    data: {
      drafts,
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

**IMPORTANT:** For this to work:
1. Node 6 must execute BEFORE Node 7
2. Node 7 must NOT be directly connected to Node 6
3. Node 7 should be connected ONLY to Node 5
4. Node 7 uses `$items("Get All for Stats")` to access Node 6's output

---

## Quick Fix (Easiest)

Just use the first approach - calculate stats from the drafts you already fetched. It's simpler and works for most cases:

1. Delete Node 6 and Node 7
2. Rename Node 8 to Node 6
3. Use the inline stats calculation code above
4. Test it

---

*Created: November 8, 2025*
