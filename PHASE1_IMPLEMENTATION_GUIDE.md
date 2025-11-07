# Phase 1 Implementation Guide: Automated Follow-ups

## Overview

This guide walks you through implementing automated follow-up detection and sending in n8n. Complete each section in order.

---

## Part 1: Airtable Schema Updates

### 1.1 Update Outbox Table

Open your Airtable Outbox base and add these fields:

| Field Name | Type | Options/Config | Description |
|------------|------|----------------|-------------|
| `follow_up_count` | Number | Integer, Default: 0 | Tracks how many follow-ups sent |
| `follow_up_stage` | Single Select | Options: "initial", "follow_up_1", "follow_up_2", "follow_up_3", "replied", "closed" | Current stage in follow-up sequence |
| `replied_at` | Date | Include time | When prospect replied |
| `reply_body` | Long text | - | Full text of prospect's reply |
| `reply_snippet` | Single line text | - | First 200 chars of reply (preview) |
| `last_reply_checked` | Date | Include time | Last time we checked Gmail for replies |
| `last_followup_sent` | Date | Include time | When last follow-up was sent |
| `parent_email_id` | Link to another record | Link to: Outbox | Links follow-ups to original email |

**Important:** After creating `parent_email_id`, a reciprocal field will be auto-created in Outbox. Name it: `follow_up_emails` (shows all follow-ups for an original email).

### 1.2 Create FollowupTemplates Table

Create a new table named: `FollowupTemplates`

Add these fields:

| Field Name | Type | Options/Config | Description |
|------------|------|----------------|-------------|
| `name` | Single line text | Primary field | Template name (e.g., "Follow-up 1") |
| `stage` | Single Select | Options: "follow_up_1", "follow_up_2", "follow_up_3" | Which stage this template is for |
| `days_after` | Number | Integer | Days after previous email to wait |
| `template_prompt` | Long text | - | Prompt for AI to generate follow-up |
| `active` | Checkbox | Default: checked | Whether this template is active |

### 1.3 Populate FollowupTemplates

Add these 3 records:

**Record 1:**
- name: `Follow-up 1 (Day 3)`
- stage: `follow_up_1`
- days_after: `3`
- active: ✓
- template_prompt:
```
Write a brief, friendly follow-up checking if they saw the previous email.

Context:
- Company: {company}
- Original subject: {subject}
- Original message was about: {original_context}

Guidelines:
- Keep it 2-3 sentences max
- Reference the original offer briefly but don't repeat the entire pitch
- Friendly but not pushy
- Ask a simple question to re-engage

Return JSON format:
{
  "subject": "Re: [original subject]",
  "body": "[your follow-up email]"
}
```

**Record 2:**
- name: `Follow-up 2 (Day 7)`
- stage: `follow_up_2`
- days_after: `7`
- active: ✓
- template_prompt:
```
Write a value-add follow-up that provides something useful without being salesy.

Context:
- Company: {company}
- Original subject: {subject}
- They didn't respond to first follow-up

Guidelines:
- Share a relevant insight, article, or resource
- Softer ask - just gauge interest
- 3-4 sentences
- Don't mention they haven't replied
- Focus on value, not the sale

Return JSON format:
{
  "subject": "Re: [original subject] + [something new]",
  "body": "[your value-add email]"
}
```

**Record 3:**
- name: `Follow-up 3 (Day 14) - Breakup`
- stage: `follow_up_3`
- days_after: `14`
- active: ✓
- template_prompt:
```
Write a polite breakup email that gives them an easy out.

Context:
- Company: {company}
- They haven't responded to 2 follow-ups

Guidelines:
- 2 sentences maximum
- Acknowledge timing might not be right
- Offer to reconnect if circumstances change
- Leave door open but close the sequence
- Professional and respectful tone

Return JSON format:
{
  "subject": "Re: [original subject] - closing the loop",
  "body": "[your breakup email]"
}
```

### 1.4 Update Existing Outbox Records

For any existing records in Outbox, set defaults:
- `follow_up_count` = 0
- `follow_up_stage` = "initial"

---

## Part 2: Update Existing Cold Email Workflow

Your existing `/webhook/cold-email` workflow needs to initialize follow-up fields when sending.

### 2.1 Locate the "Airtable – Create (Outbox)" Node

In your cold email workflow (send mode), find the node that creates the Outbox record after sending via Gmail.

### 2.2 Add These Field Mappings

Add to the Airtable Create node:

```
follow_up_count: 0
follow_up_stage: initial
```

This ensures every new email sent starts at the beginning of the follow-up sequence.

### 2.3 Test

Send a test email through GTM Console Prospects tab, then check Airtable:
- ✓ `follow_up_count` should be 0
- ✓ `follow_up_stage` should be "initial"

---

## Part 3: Reply Detection Workflow

### 3.1 Create New Workflow

In n8n, create a new workflow named: `Reply Detection - Check Gmail`

### 3.2 Workflow Nodes

**Node 1: Schedule Trigger**
- Type: `Schedule Trigger`
- Name: `Every 4 Hours`
- Settings:
  - Trigger Interval: `Hours`
  - Hours Between Triggers: `4`

**Node 2: Check if Weekend**
- Type: `Code`
- Name: `Skip if Weekend`
- Code:
```javascript
const now = new Date();
const day = now.getDay(); // 0 = Sunday, 6 = Saturday

if (day === 0 || day === 6) {
  return [];  // Return empty array to stop workflow
}

// Weekday - continue
return items;
```

**Node 3: Airtable Query**
- Type: `Airtable`
- Name: `Get Prospects to Check`
- Operation: `List`
- Settings:
  - Base: [Your Outbox base]
  - Table: `Outbox`
  - Return All: No
  - Limit: `50`
  - Filter by Formula:
```
AND(
  {status} = 'sent',
  {follow_up_stage} != 'replied',
  {follow_up_stage} != 'closed',
  DATETIME_DIFF(NOW(), {sent_at}, 'days') <= 30
)
```
  - Sort: `sent_at` DESC

**Node 4: Loop Over Items**
- Type: `Split In Batches`
- Name: `Loop Each Prospect`
- Settings:
  - Batch Size: `1`
  - Options:
    - Reset: checked

**Node 5: Format Date for Gmail**
- Type: `Code`
- Name: `Format Date for Gmail`
- Code:
```javascript
const sentAt = items[0].json.sent_at;
const date = new Date(sentAt);

// Gmail wants YYYY/MM/DD format
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');

const gmailDate = `${year}/${month}/${day}`;

return [{
  json: {
    ...items[0].json,
    gmail_search_date: gmailDate
  }
}];
```

**Node 6: Search Gmail**
- Type: `Gmail`
- Name: `Search for Reply`
- Operation: `Search`
- Settings:
  - Query: `from:{{$json.email}} after:{{$json.gmail_search_date}}`
  - Max Results: `1`
  - Return All: No
- Options:
  - Continue on Fail: **checked** ✓
  - Always Output Data: **checked** ✓

**Node 7: Delay**
- Type: `Wait`
- Name: `Rate Limit Delay`
- Settings:
  - Amount: `100`
  - Unit: `Milliseconds`

**Node 8: Check if Reply Found**
- Type: `IF`
- Name: `Reply Found?`
- Conditions:
  - Value 1: `{{$items("Search for Reply").length}}`
  - Operation: `Larger than`
  - Value 2: `0`

**Node 9a: Update Airtable (Reply Found - TRUE branch)**
- Type: `Airtable`
- Name: `Mark as Replied`
- Operation: `Update`
- Settings:
  - Base: [Your Outbox base]
  - Table: `Outbox`
  - Record ID: `{{$node["Get Prospects to Check"].json.id}}`
  - Fields:
    - status: `replied`
    - replied_at: `{{$now}}`
    - follow_up_stage: `replied`
    - reply_body: `{{$node["Search for Reply"].json.snippet}}` (or full body if available)
    - reply_snippet: `{{$node["Search for Reply"].json.snippet.substring(0, 200)}}`
    - last_reply_checked: `{{$now}}`

**Node 9b: Update Airtable (No Reply - FALSE branch)**
- Type: `Airtable`
- Name: `Update Check Timestamp`
- Operation: `Update`
- Settings:
  - Base: [Your Outbox base]
  - Table: `Outbox`
  - Record ID: `{{$node["Get Prospects to Check"].json.id}}`
  - Fields:
    - last_reply_checked: `{{$now}}`

**Node 10: Merge Paths**
- Type: `Merge`
- Name: `Combine Results`
- Settings:
  - Mode: `Append`

Connect back to node 4 (Loop Over Items) to process next item.

**Node 11: Summary**
- Type: `Code`
- Name: `Count Replies Found`
- Code:
```javascript
const replied = items.filter(item => item.json.status === 'replied');
const checked = items.length;

return [{
  json: {
    total_checked: checked,
    replies_found: replied.length,
    timestamp: new Date().toISOString()
  }
}];
```

**Node 12: (Optional) Notification**
- Type: `Slack` or `Email` (optional)
- Name: `Notify if Replies`
- Condition: Only if `replies_found > 0`
- Message: `Found {{$json.replies_found}} new replies!`

### 3.3 Activate Workflow

- Click "Save" in top right
- Toggle "Active" to ON
- Workflow will run every 4 hours

### 3.4 Manual Test

- Click "Execute Workflow" button
- Check execution log to see results
- Verify Airtable updates correctly

---

## Part 4: Follow-up Automation Workflow

### 4.1 Create New Workflow

In n8n, create a new workflow named: `Follow-up Automation - Daily Send`

### 4.2 Workflow Nodes

**Node 1: Schedule Trigger**
- Type: `Schedule Trigger`
- Name: `Daily at 9 AM`
- Settings:
  - Trigger Interval: `Days`
  - Trigger at Hour: `9`
  - Trigger at Minute: `0`

**Node 2: Check if Weekend**
- Type: `Code`
- Name: `Skip if Weekend`
- Code:
```javascript
const now = new Date();
const day = now.getDay();

if (day === 0 || day === 6) {
  return [];
}

return items;
```

**Node 3: Get Templates**
- Type: `Airtable`
- Name: `Get Active Templates`
- Operation: `List`
- Settings:
  - Base: [Your FollowupTemplates base]
  - Table: `FollowupTemplates`
  - Filter by Formula: `{active} = TRUE()`
  - Sort: `stage` ASC

**Node 4: Loop Templates**
- Type: `Split In Batches`
- Name: `Process Each Stage`
- Settings:
  - Batch Size: `1`

**Node 5: Build Airtable Filter**
- Type: `Code`
- Name: `Build Filter for This Stage`
- Code:
```javascript
const template = items[0].json;
const stage = template.stage; // "follow_up_1", "follow_up_2", or "follow_up_3"
const daysAfter = template.days_after;

// Determine what stage to look for
let filterStage;
if (stage === 'follow_up_1') {
  filterStage = 'initial';
} else if (stage === 'follow_up_2') {
  filterStage = 'follow_up_1';
} else if (stage === 'follow_up_3') {
  filterStage = 'follow_up_2';
}

return [{
  json: {
    ...items[0].json,
    filter_stage: filterStage,
    days_after: daysAfter,
    target_stage: stage
  }
}];
```

**Node 6: Query Prospects Due**
- Type: `Airtable`
- Name: `Get Prospects for This Stage`
- Operation: `List`
- Settings:
  - Base: [Your Outbox base]
  - Table: `Outbox`
  - Limit: `20` (max 20 follow-ups per day per stage)
  - Filter by Formula:
```
AND(
  {status} = 'sent',
  {follow_up_stage} = '{{$json.filter_stage}}',
  OR({replied_at} = BLANK(), {replied_at} = ''),
  DATETIME_DIFF(NOW(), {sent_at}, 'days') >= {{$json.days_after}},
  OR(
    {last_followup_sent} = BLANK(),
    DATETIME_DIFF(NOW(), {last_followup_sent}, 'hours') >= 23
  )
)
```

**Node 7: Check if Any Prospects**
- Type: `IF`
- Name: `Any Prospects Due?`
- Conditions:
  - Value 1: `{{$items("Get Prospects for This Stage").length}}`
  - Operation: `Larger than`
  - Value 2: `0`

**TRUE branch continues, FALSE branch merges back**

**Node 8: Loop Prospects**
- Type: `Split In Batches`
- Name: `Process Each Prospect`
- Settings:
  - Batch Size: `1`

**Node 9: Build AI Prompt**
- Type: `Code`
- Name: `Prepare Follow-up Context`
- Code:
```javascript
const prospect = items[0].json;
const template = $node["Build Filter for This Stage"].json;

const prompt = template.template_prompt
  .replace('{company}', prospect.company || '')
  .replace('{subject}', prospect.subject || '')
  .replace('{original_context}', prospect.body ? prospect.body.substring(0, 200) : '');

return [{
  json: {
    ...items[0].json,
    ai_prompt: prompt,
    template_stage: template.target_stage
  }
}];
```

**Node 10: AI Generation**
- Type: `HTTP Request` (to Anthropic or OpenAI)
- Name: `Generate Follow-up with AI`
- Settings depend on your AI provider:

**For Anthropic Claude:**
- Method: `POST`
- URL: `https://api.anthropic.com/v1/messages`
- Authentication: `Header Auth`
  - Name: `x-api-key`
  - Value: `{{$env.ANTHROPIC_API_KEY}}`
- Headers:
  - `anthropic-version`: `2023-06-01`
  - `content-type`: `application/json`
- Body (JSON):
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 500,
  "messages": [
    {
      "role": "user",
      "content": "{{$json.ai_prompt}}"
    }
  ]
}
```

**Node 11: Parse AI Response**
- Type: `Code`
- Name: `Extract Subject and Body`
- Code:
```javascript
const aiResponse = items[0].json.content[0].text; // Adjust based on AI provider

// Try to parse as JSON
let parsed;
try {
  parsed = JSON.parse(aiResponse);
} catch (e) {
  // If not JSON, extract manually or use fallback
  parsed = {
    subject: `Re: ${$node["Prepare Follow-up Context"].json.subject}`,
    body: aiResponse
  };
}

return [{
  json: {
    ...$node["Prepare Follow-up Context"].json,
    generated_subject: parsed.subject,
    generated_body: parsed.body
  }
}];
```

**Node 12: Send via Gmail**
- Type: `Gmail`
- Name: `Send Follow-up Email`
- Operation: `Send`
- Settings:
  - To: `{{$json.email}}`
  - Subject: `{{$json.generated_subject}}`
  - Message: `{{$json.generated_body}}`

**Node 13: Create Outbox Record**
- Type: `Airtable`
- Name: `Log Follow-up to Outbox`
- Operation: `Create`
- Settings:
  - Base: [Your Outbox base]
  - Table: `Outbox`
  - Fields:
    - email: `{{$json.email}}`
    - company: `{{$json.company}}`
    - subject: `{{$json.generated_subject}}`
    - body: `{{$json.generated_body}}`
    - status: `sent`
    - sent_at: `{{$now}}`
    - follow_up_stage: `{{$json.template_stage}}`
    - follow_up_count: `0`
    - dedupe_key: `{{$json.dedupe_key}}`
    - parent_email_id: `[{{$json.id}}]` (link to original record)

**Node 14: Update Original Record**
- Type: `Airtable`
- Name: `Increment Follow-up Count`
- Operation: `Update`
- Settings:
  - Base: [Your Outbox base]
  - Table: `Outbox`
  - Record ID: `{{$json.id}}`
  - Fields:
    - follow_up_count: `={{$json.follow_up_count + 1}}`
    - last_followup_sent: `{{$now}}`

**Node 15: Delay**
- Type: `Wait`
- Name: `Rate Limit Delay`
- Settings:
  - Amount: `1`
  - Unit: `Seconds`

Loop back to Node 8 for next prospect.

**Node 16: Count Results**
- Type: `Code`
- Name: `Count Sent per Stage`
- Code:
```javascript
const stage = items[0]?.json.template_stage || 'unknown';
const count = items.length;

return [{
  json: {
    stage: stage,
    count: count
  }
}];
```

**Node 17: Merge All Stages**
- Type: `Merge`
- Name: `Combine All Stages`

Loop back to Node 4 for next template stage.

**Node 18: Final Summary**
- Type: `Code`
- Name: `Build Summary Report`
- Code:
```javascript
let summary = 'Follow-up automation completed:\n\n';

items.forEach(item => {
  summary += `- ${item.json.stage}: ${item.json.count} sent\n`;
});

return [{
  json: {
    summary: summary,
    total: items.reduce((sum, item) => sum + item.json.count, 0),
    timestamp: new Date().toISOString()
  }
}];
```

**Node 19: (Optional) Notification**
- Type: `Slack` or `Email`
- Name: `Send Summary`
- Message: `{{$json.summary}}`

### 4.3 Set Environment Variable

In n8n settings, add:
- `ANTHROPIC_API_KEY` = your API key

### 4.4 Activate Workflow

- Save workflow
- Toggle "Active" to ON
- Will run daily at 9 AM

### 4.5 Manual Test

To test without waiting for 9 AM:
1. Create a test record in Outbox with:
   - `sent_at` = 4 days ago
   - `follow_up_stage` = "initial"
   - `status` = "sent"
2. Click "Execute Workflow"
3. Check that follow-up is sent and Airtable updates

---

## Part 5: Testing Checklist

### 5.1 Airtable Setup Tests

- [ ] All new fields exist in Outbox table
- [ ] FollowupTemplates table created with 3 records
- [ ] Template prompts are well-formatted
- [ ] All templates set to `active = true`

### 5.2 Reply Detection Tests

- [ ] Workflow activates without errors
- [ ] Weekend skip works (manually test on weekend)
- [ ] Send yourself an email from GTM Console
- [ ] Reply to it from your Gmail
- [ ] Wait for next 4-hour cycle (or manually execute)
- [ ] Verify Airtable Outbox updates:
  - [ ] `status` = "replied"
  - [ ] `replied_at` has timestamp
  - [ ] `follow_up_stage` = "replied"
  - [ ] `reply_snippet` has first 200 chars

### 5.3 Follow-up Automation Tests

- [ ] Workflow activates without errors
- [ ] Create test prospect:
  - Email: your test email
  - Company: "Test Corp"
  - sent_at: 4 days ago
  - follow_up_stage: "initial"
  - status: "sent"
- [ ] Manually execute workflow
- [ ] Check Gmail: follow-up email received
- [ ] Check Airtable:
  - [ ] New Outbox record created for follow-up
  - [ ] Original record: `follow_up_count` = 1
  - [ ] Original record: `last_followup_sent` has timestamp
  - [ ] New record: `parent_email_id` links to original

### 5.4 Edge Case Tests

- [ ] Test: Prospect already replied → no follow-up sent
- [ ] Test: follow_up_stage = "closed" → no follow-up sent
- [ ] Test: Sent on Friday → Monday follow-up sent (not weekend)
- [ ] Test: 21+ prospects due → only 20 sent (limit works)
- [ ] Test: Already sent follow-up today → won't send duplicate

### 5.5 Integration Test

Full sequence:
1. [ ] Send cold email via GTM Console
2. [ ] Verify `follow_up_stage` = "initial" in Airtable
3. [ ] Wait 3 days (or manually set `sent_at` back 3 days)
4. [ ] Follow-up #1 auto-sends
5. [ ] Reply to follow-up
6. [ ] Reply detection marks as "replied"
7. [ ] No further follow-ups sent

---

## Part 6: Troubleshooting

### Gmail API Rate Limits

**Symptom:** Workflow fails with "Rate limit exceeded"

**Fix:**
- Reduce batch size from 50 to 25
- Increase delay between requests to 200ms
- Check Gmail API quota in Google Cloud Console

### AI Generation Fails

**Symptom:** "AI didn't return valid JSON"

**Fix:**
- Check API key is set correctly
- Review AI prompt template format
- Add error handling in Parse AI Response node

### No Follow-ups Sending

**Symptom:** Workflow runs but 0 sent

**Debug:**
- Check Airtable filter formula (copy/paste exactly)
- Verify `sent_at` is actually >= 3 days ago
- Check `follow_up_stage` = "initial" (not "Initial" with capital I)
- Verify templates are `active = true`

### Duplicate Follow-ups

**Symptom:** Same prospect gets multiple follow-ups same day

**Fix:**
- Check `last_followup_sent` field exists
- Verify filter includes the 23-hour check
- Make sure workflow isn't running multiple times

---

## Part 7: Monitoring

### Daily Check (First Week)

- Open n8n executions tab
- Check both workflows ran successfully
- Look at Airtable:
  - How many replies detected?
  - How many follow-ups sent?
  - Any stuck in wrong stage?

### Weekly Review

- Reply rate: What % of initial emails got replies?
- Follow-up effectiveness: Do follow-ups increase reply rate?
- AI quality: Are generated emails good or need prompt tweaking?

### Adjustments

Based on results, tweak:
- Template prompts (if AI output needs improvement)
- Days between follow-ups (if 3/7/14 isn't optimal)
- Max follow-ups per day (if you want to send more/less)

---

## Success Criteria

✅ **Phase 1 Complete When:**

1. Reply detection runs every 4 hours with 0 errors
2. At least 1 test reply correctly detected and logged
3. Follow-up automation runs daily at 9 AM
4. At least 1 test follow-up sent successfully
5. Airtable records update correctly at each stage
6. No duplicate sends
7. Weekend skip works

---

## Next Steps (Phase 2)

After Phase 1 is stable for 1 week:
- Add "Follow-ups" tab to GTM Console UI
- Build n8n endpoints for manual override
- Implement reply viewing modal

---

## Support

If you encounter issues:
1. Check n8n execution logs for error details
2. Verify Airtable formulas match exactly
3. Test with single record first before bulk
4. Review this guide's Troubleshooting section
