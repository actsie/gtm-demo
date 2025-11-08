# Bug Fixes: Stats Showing 0 & Modal Showing Same Content

**Created:** November 8, 2025

---

## Bug 1: Stats Showing All Zeros

### Problem
Stats dashboard shows:
- Pending Review: 0
- Approved & Ready: 0
- Due Today: 0
- Overdue: 0

Even though there are drafts in the list with overdue dates.

### Root Cause
The n8n endpoint `/webhook/drafts-list` is failing at Node 8 (Build Final Response) because Node 7 (Calculate Stats) isn't executing properly. This means the endpoint either:
1. Returns an error
2. Returns empty stats object

### Solution

**Implement the simplified endpoint structure** (remove Node 6 and Node 7, calculate stats inline):

#### Updated Endpoint Structure:

```
Node 1: Webhook Trigger (Receive Request)
   ↓
Node 2: Parse Input
   ↓
Node 3: Build Filter Formula
   ↓
Node 4: Get Drafts from FollowupQueue
   ↓
Node 5: Calculate Days and Format
   ↓
Node 6: Build Final Response (NEW - with inline stats)
```

#### Node 6 Code (Build Final Response):

**Type:** Code
**Name:** `Build Final Response`
**Execution Mode:** Run Once for All Items

```javascript
// Get the drafts from previous node (Node 5)
const drafts = items.map(item => item.json);

// Calculate stats from the drafts
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

  // Count due today/overdue (only for active statuses)
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

### Testing
After implementing this fix:

1. **Test the endpoint with curl:**
```bash
curl -X POST http://localhost:5678/webhook/drafts-list \
  -H "x-webhook-secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "status_filter": "needs_review",
    "limit": 100,
    "offset": 0
  }'
```

2. **Expected output:**
```json
{
  "ok": true,
  "data": {
    "drafts": [
      { "id": "rec123", "company": "Acme", ... }
    ],
    "stats": {
      "pending_review": 5,
      "approved": 0,
      "due_today": 2,
      "overdue": 3
    }
  }
}
```

3. **Refresh the UI** and verify stats show correct numbers

---

## Bug 2: Modal Shows Same Content for All Drafts

### Problem
When clicking "Review" on different drafts, the modal always shows the same subject and body (from the first draft that was opened).

### Root Cause
In `DraftReviewModal.tsx` lines 19-20:

```javascript
const [subject, setSubject] = useState(draft.subject);
const [body, setBody] = useState(draft.body);
```

The `useState` hook only initializes state ONCE when the component first mounts. When you click a different draft:
1. The `draft` prop changes
2. But `subject` and `body` state don't update
3. The modal shows the old content

### Solution

**Add a `useEffect` to update state when draft changes:**

#### Updated DraftReviewModal.tsx:

**Add this import at the top:**
```javascript
import { useState, useEffect } from 'react';
```

**Add this useEffect after the existing useState declarations (around line 23):**
```javascript
const [subject, setSubject] = useState(draft.subject);
const [body, setBody] = useState(draft.body);
const [showOriginal, setShowOriginal] = useState(false);
const [edited, setEdited] = useState(false);

// ADD THIS:
useEffect(() => {
  setSubject(draft.subject);
  setBody(draft.body);
  setEdited(false);
  setShowOriginal(false);
}, [draft.id]); // Re-run when draft.id changes
```

### Why This Works

- `useEffect` runs whenever `draft.id` changes
- When you click a different draft, the component receives a new `draft` prop with a different `id`
- The effect updates `subject` and `body` to the new draft's content
- It also resets `edited` and `showOriginal` flags for the new draft

### Testing
After implementing this fix:

1. **Open GTM Console**
2. **Go to Follow-ups tab → Pending Review**
3. **Click "Review" on the first draft** → Note the subject and body
4. **Close the modal**
5. **Click "Review" on a different draft** → Verify it shows DIFFERENT content
6. **Try editing** the subject/body → Verify the edited flag appears
7. **Close and reopen** the same draft → Verify edits are gone (fresh data)

---

## Summary of Changes

### n8n Endpoint Changes (Laptop)
- Delete Node 6 (Get All for Stats)
- Delete Node 7 (Calculate Stats)
- Delete Node 8 (Build Final Response)
- Add new Node 6: Build Final Response with inline stats calculation

### Frontend Code Changes (Laptop)
**File:** `src/renderer/components/DraftReviewModal.tsx`

**Change:**
```diff
- import { useState } from 'react';
+ import { useState, useEffect } from 'react';

  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [showOriginal, setShowOriginal] = useState(false);
  const [edited, setEdited] = useState(false);

+ useEffect(() => {
+   setSubject(draft.subject);
+   setBody(draft.body);
+   setEdited(false);
+   setShowOriginal(false);
+ }, [draft.id]);
```

---

## Testing Checklist

- [ ] n8n endpoint returns correct stats (test with curl)
- [ ] UI stats dashboard shows correct numbers
- [ ] Overdue count matches actual overdue drafts
- [ ] Due today count matches drafts due today
- [ ] Modal shows correct content for each draft
- [ ] Editing one draft doesn't affect others
- [ ] Closing and reopening modal shows fresh data

---

*Fixes ready for implementation - November 8, 2025*
