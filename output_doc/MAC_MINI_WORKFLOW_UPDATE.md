# Mac Mini Workflow Update Guide
*Generate All 3 Follow-ups at Once*

## What to Update

Modify the "Cold Email" workflow on Mac Mini n8n to generate all 3 follow-up drafts (FU#1, FU#2, FU#3) immediately after sending the original email, instead of just FU#1.

---

## Current Flow (Generates Only FU#1)

```
Send Email → Log to Outbox → Get FU#1 Template → Generate FU#1 → Create 1 Draft
```

---

## New Flow (Generates All 3)

```
Send Email → Log to Outbox → Get ALL Templates → Loop Each → Generate → Create 3 Drafts
```

---

## Step-by-Step Changes

### 1. Replace "Get FU#1 Template" Node

**Current Node:**
- Name: `Get FU#1 Template`
- Queries for single template where `stage = "follow_up_1"`

**New Node:**
- Name: `Get All Active Templates`
- **Operation:** List
- **Filter:** `{active} = TRUE()`
- **Sort:** `stage` ASC
- **Result:** Returns 3 templates (FU#1, FU#2, FU#3)

---

### 2. Add Split Loop Node

**After "Get All Active Templates", add:**
- **Type:** Split In Batches
- **Name:** `Loop Each Template`
- **Settings:**
  - Batch Size: 1
  - Options: Keep only Set

---

### 3. Update "Calculate Due Date" Node

**Change from:**
```javascript
const sentAt = new Date($node["Log to Outbox"].json.sent_at);
const daysAfter = 3; // Hardcoded for FU#1
const dueDate = new Date(sentAt);
dueDate.setDate(dueDate.getDate() + daysAfter);
dueDate.setHours(9, 0, 0, 0);
```

**To:**
```javascript
const sentAt = new Date($node["Log to Outbox"].json.sent_at);
const template = items[0].json; // Current template in loop
const daysAfter = template.days_after; // Dynamic from template (3, 7, or 14)

const dueDate = new Date(sentAt);
dueDate.setDate(dueDate.getDate() + daysAfter);
dueDate.setHours(9, 0, 0, 0);

return [{
  json: {
    due_date: dueDate.toISOString(),
    days_after: daysAfter,
    template
  }
}];
```

---

### 4. Update "Prepare AI Context" Node

**Add template info:**
```javascript
const outboxRecord = $node["Log to Outbox"].json;
const template = $node["Calculate Due Date"].json.template;

const prompt = template.template_prompt
  .replace('{company}', outboxRecord.company || '')
  .replace('{subject}', outboxRecord.subject || '')
  .replace('{original_context}', outboxRecord.body ? outboxRecord.body.substring(0, 200) : '');

return [{
  json: {
    ai_prompt: prompt,
    template_stage: template.stage,
    outbox_record: outboxRecord
  }
}];
```

---

### 5. Keep AI Generation Node (No Changes)

**Node:** `Generate FU#1 with AI`
- Works as-is
- Processes whatever template is in the current loop iteration

---

### 6. Update "Create FollowupQueue Record" Node

**Change from:**
```javascript
Fields:
  - stage = "follow_up_1" // Hardcoded
```

**To:**
```javascript
Fields:
  - stage = ={{$node["Calculate Due Date"].json.template.stage}} // Dynamic
```

**Full field mapping:**
- `prospect_id` = Link to Outbox record
- `email` = From Outbox
- `company` = From Outbox
- `stage` = `={{$node["Calculate Due Date"].json.template.stage}}` ← UPDATED
- `subject` = From AI response
- `body` = From AI response
- `original_subject` = From Outbox
- `original_body` = From Outbox
- `status` = `"needs_review"`
- `generated_at` = `={{$now.toISO()}}`
- `due_date` = `={{$node["Calculate Due Date"].json.due_date}}` ← UPDATED
- `is_edited` = `false`

---

### 7. Loop Back

**After "Create FollowupQueue Record":**
- Connect back to "Loop Each Template" node
- This repeats for next template until all 3 are processed

---

## Visual Flow Diagram

```
[Send Email via Gmail]
        ↓
[Log to Airtable Outbox]
        ↓
[Get All Active Templates] ← Queries for active=true (returns 3)
        ↓
[Loop Each Template] ← Processes one at a time
        ↓
[Calculate Due Date] ← Uses template.days_after (3, 7, or 14)
        ↓
[Prepare AI Context] ← Uses template.template_prompt
        ↓
[Generate Follow-up with AI] ← Claude API call
        ↓
[Parse AI Response]
        ↓
[Create FollowupQueue Record] ← Creates draft with status="needs_review"
        ↓
[Loop back if more templates] ← Repeats until all 3 done
```

---

## Result

**After sending 1 cold email:**
- ✅ 3 draft records created in FollowupQueue
- ✅ All with status="needs_review"
- ✅ Due dates: Day 3, Day 7, Day 14
- ✅ Each with AI-generated subject and body
- ✅ Ready for review in GTM Console UI

---

## Testing

1. **Activate workflow**
2. **Send a test cold email** via GTM Console
3. **Wait 1-2 minutes** for AI generation
4. **Check Airtable FollowupQueue:**
   - Should have 3 new records
   - Same prospect_id (linked to original email)
   - Different stages: follow_up_1, follow_up_2, follow_up_3
   - Different due_dates: Day 3, 7, 14
   - All status="needs_review"
5. **Check GTM Console:**
   - Navigate to Follow-ups tab → Pending Review
   - Should see 3 draft cards for the same prospect
   - Can review and approve each one

---

## Estimated Time

**15 minutes** to update the workflow

---

*Mac Mini workflow update ready - November 8, 2025*
