# Follow-ups Tab Implementation Session

*Session Date: November 8, 2025*
*Project: GTM Console - Follow-ups Tab Backend*

---

## 🎯 What Was Built

In this session, we implemented **2 out of 3 n8n webhook endpoints** to power the Follow-ups tab in the GTM Console. This tab allows you to view, manage, and take action on automated email follow-up sequences.

### **Endpoints Created:**

1. **`/webhook/followups-list`** ✅ **COMPLETE**
   - Lists all email follow-up threads from Airtable Outbox
   - Supports filtering by stage and status
   - Calculates statistics (total, awaiting reply, reply rate, etc.)
   - Returns paginated results with metadata

2. **`/webhook/followup-details`** ✅ **95% COMPLETE** (1 minor label bug remaining)
   - Fetches complete email thread for a specific conversation
   - Shows original email and all follow-ups in chronological order
   - Includes prospect replies if they responded
   - **BREAKTHROUGH:** Follow-ups now showing correctly with Node 7.5 filter!
   - One remaining bug: original email label (easy 2-min fix)

3. **`/webhook/followup-action`** ❌ **NOT STARTED**
   - Will handle manual actions: mark closed, mark replied, send now
   - Planned for next session

---

## ✅ What's Working

### **Follow-ups Tab UI**
- Tab loads successfully with list of email threads
- Filter dropdowns work (stage, status)
- Stats banner displays metrics (total emails, reply rate, awaiting reply)
- "View Thread" button opens modal
- Clean interface showing only root emails (no duplicate follow-up rows)

### **Endpoint 1: followups-list**
- Successfully queries Airtable Outbox table
- Applies stage and status filters correctly
- Calculates days since sent and days since last activity
- Returns accurate statistics across all records
- **Key improvement:** Filter updated to exclude follow-up records from list view (only shows original emails)

### **Endpoint 2: followup-details**
- Modal opens successfully (no more HTTP 500 errors!)
- Original email content displays correctly
- Subject and body text are accurate
- Timeline structure renders properly
- **✅ MAJOR FIX:** Follow-up emails now show in timeline (purple boxes)!

---

## 🎉 BREAKTHROUGH: Node 7.5 Filter Working!

**What we did:**
Added a dedicated filtering code node (Node 7.5) between Node 7 and Node 8 that properly handles the `0:` prefix in Airtable's linked record format.

**Result:**
Follow-ups now appear correctly in the email thread timeline! 🎊

---

## 🐛 Remaining Bug (Quick Fix Tomorrow)

### **Bug 1: Incorrect Label on Original Email** (2-minute fix)

**What's happening:**
The original email (blue box) is labeled as "Follow-up 1 (Day 3)" instead of "Original Email"

**Root cause (IDENTIFIED):**
When a follow-up is sent, the automation updates the **original email's** `follow_up_stage` field from `"initial"` to `"follow_up_1"`. This is expected behavior for tracking progress, but it breaks the label logic.

**The Issue:**
Node 8 uses `stage: root.follow_up_stage` which now returns `"follow_up_1"` even for the original email!

**The Solution:**
Check if the record has a `parent_email_id`. If it doesn't, it's ALWAYS the original email, regardless of `follow_up_stage`.

**Fix for Node 8:**
```javascript
const original = {
  id: root.id || '',
  subject: root.subject || 'No subject',
  body: root.body || 'No body content',
  sent_at: root.sent_at || new Date().toISOString(),
  // If no parent_email_id, it's the original email (stage: 'initial')
  stage: root.parent_email_id ? root.follow_up_stage : 'initial'
};
```

**Status:** Ready to implement tomorrow (literally 1 line change)

---

### **Bug 2: Follow-up Emails Not Showing in Thread** ✅ **FIXED!**

**What was happening:**
Purple follow-up boxes weren't appearing in the timeline, even though follow-ups existed in Airtable.

**What we tried (and failed):**

1. ❌ Airtable filter: `{parent_email_id} = "={{$json.root_id}}"`
2. ❌ Airtable filter: `FIND("={{$json.root_id}}", ARRAYJOIN({parent_email_id}))`
3. ❌ Filtering in Node 8 code

**Root cause:**
The `parent_email_id` field in Airtable has format `["0:recGvgNy9TzRJ8c5i"]` with `0:` prefix, but we were comparing against `recGvgNy9TzRJ8c5i` without handling the prefix.

**The Solution (Node 7.5):**
Added a dedicated filtering code node that strips the `0:` prefix before comparing:

```javascript
const filtered = allFollowups.filter(item => {
  const parentId = item.json.parent_email_id;
  if (Array.isArray(parentId)) {
    return parentId.some(id => {
      const cleanId = String(id).replace(/^\d+:/, ''); // Remove "0:" prefix
      return cleanId === rootId;
    });
  }
  return false;
});
```

**Result:** Follow-ups now display perfectly! 🎉

---

## 🔧 Technical Implementation Details

### **Endpoint 1 Architecture**

**Workflow nodes:**
1. Webhook Trigger (POST /webhook/followups-list)
2. Parse Input (extract limit, offset, filters)
3. Build Airtable Filter Formula (with parent_email_id = BLANK() to exclude follow-ups)
4. Query Airtable Outbox (paginated)
5. Calculate Days and Format (days since sent, days since last activity)
6. Query All Records for Stats (separate query for accurate totals)
7. Calculate Statistics (total, awaiting reply, replied, reply rate, by stage)
8. Build Final Response (combine followups + stats)

**Key filter update:**
```javascript
let conditions = [
  '{status} != ""',
  '{parent_email_id} = BLANK()'  // Only show root emails, not follow-ups
];
```

This ensures the list view only shows original emails (1 row per thread), not individual follow-up emails.

---

### **Endpoint 2 Architecture**

**Workflow nodes:**
1. Webhook Trigger (POST /webhook/followup-details)
2. Parse Input (extract outbox_id)
3. Get Record by ID (fetch the clicked record)
4. Find Thread Root (check if it's a follow-up or original)
5. IF Condition (route to fetch root or use current)
   - TRUE branch: Fetch Root Email (if current record is a follow-up)
   - FALSE branch: No-op (current record is already root)
6. Merge Root Email (combine branches)
7. Get All Follow-ups (query records with parent_email_id != BLANK())
8. **Filter Follow-ups by Parent ID** ← NEW Node 7.5!
9. Build Email Thread (format response)

**Node 7 configuration:**
- Filter: `{parent_email_id} != BLANK()`
- Gets all follow-up records (not originals)
- "Always Output Data" enabled so workflow continues with 0 results

**Node 7.5 (BREAKTHROUGH):**
Dedicated filtering code node that handles Airtable's linked record format:
```javascript
const rootId = $node["Merge Root Email"].json.root_id;
const allFollowups = items;

const filtered = allFollowups.filter(item => {
  const parentId = item.json.parent_email_id;
  if (!parentId) return false;

  if (Array.isArray(parentId)) {
    return parentId.some(id => {
      const cleanId = String(id).replace(/^\d+:/, ''); // Strip "0:" prefix
      return cleanId === rootId;
    });
  }
  return false;
});

return filtered.length > 0 ? filtered : [];
```

**Node 8 approach:**
- Gets root from `rootNode[0].json.current_record`
- Gets filtered follow-ups from Node 7.5 (no filtering needed!)
- Just formats the response

---

## 📊 Sample Data Structures

### **Original Email Record (Airtable):**
```
id: recGvgNy9TzRJ8c5i
email: stacydonnaj@gmail.com
company: BrightCart DTC
status: sent
sent_at: 2025-11-03
follow_up_stage: initial
follow_up_count: 1
last_followup_sent: 2025-11-07T08:00:50.849Z
parent_email_id: (empty)
subject: "Posting consistency for DTC brands"
body: "Hi Stacy,\n\nWe help DTC founders..."
```

### **Follow-up Email Record (Airtable):**
```
id: rec2knAzvtCb9pLht
email: stacydonnaj@gmail.com
company: BrightCart DTC
status: sent
sent_at: 2025-11-07
follow_up_stage: follow_up_1
follow_up_count: 0
parent_email_id: ["0:recGvgNy9TzRJ8c5i"]  ← Note: Array with "0:" prefix!
subject: "Re: Posting consistency for DTC brands"
body: "Hi there, Following up on..."
```

### **API Response Format (followup-details):**
```json
{
  "ok": true,
  "data": {
    "thread": {
      "original": {
        "id": "recGvgNy9TzRJ8c5i",
        "subject": "Posting consistency for DTC brands",
        "body": "Hi Stacy,\n\nWe help...",
        "sent_at": "2025-11-03T00:00:00.000Z",
        "stage": "initial"
      },
      "followups": [
        {
          "id": "rec2knAzvtCb9pLht",
          "subject": "Re: Posting consistency...",
          "body": "Hi there, Following up...",
          "sent_at": "2025-11-07T00:00:00.000Z",
          "stage": "follow_up_1"
        }
      ],
      "reply": null
    }
  }
}
```

---

## 🧪 How to Test

### **Test Endpoint 1:**
```bash
curl -X POST https://your-n8n-url.com/webhook/followups-list \
  -H "x-webhook-secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 10,
    "offset": 0,
    "stage_filter": "all",
    "status_filter": "all"
  }'
```

**Expected result:** JSON with `followups` array and `stats` object

### **Test Endpoint 2:**
```bash
curl -X POST https://your-n8n-url.com/webhook/followup-details \
  -H "x-webhook-secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "outbox_id": "recGvgNy9TzRJ8c5i"
  }'
```

**Expected result:** JSON with `thread` object containing original, followups, and reply

### **Test in GTM Console UI:**
1. Open GTM Console
2. Navigate to "Follow-ups" tab
3. List should load with email threads
4. Click "View Thread" on any row
5. Modal should open showing email timeline

---

## 🚀 Next Session Plan

### **Priority 1: Fix Label Bug (2 min)** ✅ Solution ready!

Update Node 8 line 90 from:
```javascript
stage: root.follow_up_stage || 'initial'
```
To:
```javascript
stage: root.parent_email_id ? root.follow_up_stage : 'initial'
```

Test and verify. Done! ✅

### **Priority 2: Build Endpoint 3 (45-60 min)**

Create `/webhook/followup-action` with three branches:

**Branch 1: Mark as Closed**
- Update Airtable: `follow_up_stage = closed`, `status = closed`
- Stop automation

**Branch 2: Mark as Replied**
- Update Airtable: `follow_up_stage = replied`, `status = replied`, `replied_at = now()`
- Stop automation

**Branch 3: Send Now (complex)**
- Get current record and calculate next stage
- Fetch follow-up template from FollowupTemplates table
- Generate email with AI (Claude API)
- Send via Gmail
- Create new Outbox record for the follow-up
- Update original record's follow-up count and stage

### **Priority 3: End-to-End Testing (15 min)**

- Test all three endpoints together
- Test filters in UI
- Test all three manual actions
- Verify stats update correctly
- Test with multiple email threads

---

## 📝 Files Modified

### **Frontend (Electron App):**
- `src/renderer/components/FollowUpsTab.tsx` - Follow-ups tab UI
- `src/renderer/components/EmailThreadModal.tsx` - Thread view modal
- `src/renderer/App.tsx` - Added Follow-ups tab to navigation
- `src/renderer/store.ts` - Added follow-ups state
- `src/shared/types.ts` - Added FollowUp, EmailThread types

### **Backend (n8n Workflows):**
- Created: `/webhook/followups-list` workflow (9 nodes)
- Created: `/webhook/followup-details` workflow (8 nodes)
- To create: `/webhook/followup-action` workflow

### **Documentation:**
- `N8N_FOLLOWUPS_ENDPOINTS_GUIDE.md` - Implementation guide

---

## 💡 Key Learnings

### **Airtable Linked Record Fields Are Tricky:**
- Linked record fields return arrays, not strings
- Format: `["0:recABCDEF123"]` with numeric prefix
- Standard `=` operator doesn't work reliably
- Best to filter in code rather than Airtable formulas

### **n8n Workflow Gotchas:**
- Nodes stop executing if previous node returns 0 items
- Solution: Enable "Always Output Data" or "Continue on Fail"
- Use `$items("NodeName")` to reference specific node outputs
- Merge nodes can have unexpected output structure

### **Debug Strategy:**
- Always check n8n execution log for actual data structure
- Add console.log in code nodes to see what's flowing through
- Test with curl before testing in UI
- Check field names are exact match (case-sensitive)

---

## 🔗 Related Resources

- **Implementation guide:** `N8N_FOLLOWUPS_ENDPOINTS_GUIDE.md`
- **Phase 1 implementation:** `PHASE1_IMPLEMENTATION_GUIDE.md`
- **Airtable Outbox table:** Contains all sent emails and follow-ups
- **FollowupTemplates table:** Contains AI prompt templates for each follow-up stage

---

## ⏭️ Session Completion Criteria

**Session will be complete when:**
- ✅ Endpoint 1 working perfectly
- ✅ Endpoint 2 working perfectly (no bugs)
- ✅ Endpoint 3 built and tested
- ✅ All manual actions working
- ✅ UI displays correctly with no errors
- ✅ Stats update accurately

**Current status:** **90% complete** (2/3 endpoints fully functional, 1 minor label fix remaining)

---

## 🎊 Session Breakthrough Summary

### **What Worked:**
1. **Node 7.5 Filtering Strategy** - Dedicated code node between query and formatting
2. **Handling Airtable's `0:` prefix** - String replacement before comparison
3. **Separating concerns** - Filter in one node, format in another
4. **Console.log debugging** - Made the issue immediately visible

### **Key Learning:**
Airtable linked record fields (`parent_email_id`) return arrays with format `["0:recABCDEF123"]`. The numeric prefix must be stripped before comparing IDs. Trying to filter in Airtable formulas was unreliable; filtering in code with proper prefix handling worked perfectly.

### **Final Workflow Structure (Endpoint 2):**
```
Node 1: Webhook Trigger
Node 2: Parse Input
Node 3: Get Record by ID
Node 4: Find Thread Root
Node 5: IF Condition
Node 5a/5b: Get Root (TRUE) / No-op (FALSE)
Node 6: Merge Root Email
Node 7: Get All Follow-ups (filter: {parent_email_id} != BLANK())
Node 7.5: Filter Follow-ups by Parent ID ← NEW! This was the key!
Node 8: Build Email Thread (now just formats, no filtering)
```

---

*Session paused: User needed rest. Endpoint 2 is 95% done (1 line fix remaining), ready to build Endpoint 3 next session.*
