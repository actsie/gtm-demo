# Add Urgency Filter Support (Due Today / Overdue)

**Created:** November 8, 2025

The UI now sends both `status_filter` AND `urgency_filter` to the `/webhook/drafts-list` endpoint.

---

## New Request Format

```json
{
  "status_filter": "all" | "needs_review" | "ready",
  "urgency_filter": "all" | "due_today" | "overdue",
  "limit": 100,
  "offset": 0
}
```

---

## Updated Node 2: Parse Input

**Add urgency_filter to the parsed inputs:**

```javascript
const body = items[0].json.body || items[0].json;

const statusFilter = body.status_filter || 'needs_review';
const urgencyFilter = body.urgency_filter || 'all';  // ← ADD THIS
const limit = body.limit || 100;
const offset = body.offset || 0;

return [{
  json: {
    status_filter: statusFilter,
    urgency_filter: urgencyFilter,  // ← ADD THIS
    limit,
    offset
  }
}];
```

---

## Updated Node 3: Build Filter Formula

**Combine status and urgency filters:**

```javascript
const statusFilter = items[0].json.status_filter;
const urgencyFilter = items[0].json.urgency_filter;

let formulas = [];

// Build status filter
if (statusFilter === 'needs_review') {
  formulas.push('{status} = "needs_review"');
} else if (statusFilter === 'ready') {
  formulas.push('{status} = "ready"');
} else if (statusFilter === 'all') {
  formulas.push('OR({status} = "needs_review", {status} = "ready")');
}

// Build urgency filter (date-based)
if (urgencyFilter === 'due_today') {
  // Due today: due_date is today
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];  // YYYY-MM-DD
  formulas.push(`IS_SAME(SET_TIMEZONE({due_date}, 'UTC'), '${todayStr}', 'day')`);
} else if (urgencyFilter === 'overdue') {
  // Overdue: due_date < today
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  formulas.push(`IS_BEFORE({due_date}, '${todayStr}')`);
}
// If 'all', don't add urgency filter

// Combine filters with AND
let formula = '';
if (formulas.length > 0) {
  formula = formulas.length === 1 ? formulas[0] : `AND(${formulas.join(', ')})`;
}

return [{
  json: {
    ...items[0].json,
    filter_formula: formula
  }
}];
```

---

## How It Works

### Example 1: Pending Review + All Urgencies
```json
{
  "status_filter": "needs_review",
  "urgency_filter": "all"
}
```

**Formula:** `{status} = "needs_review"`

**Result:** All pending review drafts

---

### Example 2: All Statuses + Overdue Only
```json
{
  "status_filter": "all",
  "urgency_filter": "overdue"
}
```

**Formula:** `AND(OR({status} = "needs_review", {status} = "ready"), IS_BEFORE({due_date}, '2025-11-08'))`

**Result:** All overdue drafts (both pending and approved)

---

### Example 3: Ready + Due Today
```json
{
  "status_filter": "ready",
  "urgency_filter": "due_today"
}
```

**Formula:** `AND({status} = "ready", IS_SAME(SET_TIMEZONE({due_date}, 'UTC'), '2025-11-08', 'day'))`

**Result:** Approved drafts that are due today

---

## Testing

### Test 1: Click "Due Today" in UI

**Expected Request:**
```json
{
  "status_filter": "all",
  "urgency_filter": "due_today"
}
```

**Expected Result:** Shows all drafts (pending OR ready) that are due today

---

### Test 2: Click "Overdue" in UI

**Expected Request:**
```json
{
  "status_filter": "all",
  "urgency_filter": "overdue"
}
```

**Expected Result:** Shows all overdue drafts

---

### Test 3: Click "Pending Review" in UI

**Expected Request:**
```json
{
  "status_filter": "needs_review",
  "urgency_filter": "all"
}
```

**Expected Result:** Shows all pending review drafts (default behavior)

---

## Summary of Changes

**Node 2:** Add `urgency_filter` to parsed inputs
**Node 3:** Build combined filter formula (status AND urgency)
**Node 4:** Uses the combined formula (no changes needed)
**Node 5:** No changes needed

---

*Created: November 8, 2025*
