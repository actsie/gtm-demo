# Add Regenerate Action to /webhook/draft-action

**Created:** November 8, 2025
**Purpose:** Allow users to regenerate a single follow-up draft with fresh AI content

---

## Overview

When user clicks "Regenerate" on a draft in the thread view, the frontend sends:

```json
{
  "draft_id": "recXXXXXXXXXXXX",
  "action": "regenerate"
}
```

Your `/webhook/draft-action` endpoint needs to handle this new action.

---

## Implementation Steps

### Step 1: Update Switch Node

In your existing `/webhook/draft-action` workflow, find the **Switch node** that routes based on `action`.

**Add a new branch:**
- **Route:** When `{{ $json.action }}` equals `regenerate`

---

### Step 2: Get Draft Record

After the regenerate branch, add an **Airtable node**:

**Node name:** Get Draft to Regenerate
**Operation:** Search records
**Table:** FollowupQueue
**Filter:**
```
{id} = '{{ $('Webhook').item.json.body.draft_id }}'
```

This retrieves the draft that needs to be regenerated.

---

### Step 3: Get Original Email

Add another **Airtable node**:

**Node name:** Get Original Email
**Operation:** Search records
**Table:** Outbox
**Filter:**
```
{id} = '{{ $('Get Draft to Regenerate').item.json.prospect_id }}'
```

Or if you're using a different field to link them:
```
{id} = '{{ $('Get Draft to Regenerate').item.json.original_email_id }}'
```

This gets the original cold email for context.

---

### Step 4: Get Template

Add another **Airtable node**:

**Node name:** Get Follow-up Template
**Operation:** Search records
**Table:** FollowupTemplates
**Filter:**
```
AND(
  {stage} = '{{ $('Get Draft to Regenerate').item.json.stage }}',
  {is_active} = TRUE()
)
```

This gets the template for this follow-up stage (FU#1, FU#2, or FU#3).

---

### Step 5: Prepare AI Prompt

Add a **Code node** (or Set node):

**Node name:** Prepare AI Context
**JavaScript code:**

```javascript
const draft = $('Get Draft to Regenerate').item.json;
const original = $('Get Original Email').item.json;
const template = $('Get Follow-up Template').item.json;

// Get template prompt
const templatePrompt = template.template_prompt || '';

// Replace placeholders
const aiPrompt = templatePrompt
  .replace('{company}', draft.company || '')
  .replace('{email}', draft.email || '')
  .replace('{subject}', original.subject || '')
  .replace('{original_context}', (original.body || '').substring(0, 200));

return [{
  json: {
    ai_prompt: aiPrompt,
    company: draft.company,
    email: draft.email
  }
}];
```

---

### Step 6: Call AI

Add an **OpenAI node** (or Anthropic, whatever you're using):

**Node name:** Generate New Follow-up
**Operation:** Message a model
**Model:** gpt-4 (or your preferred model)
**Prompt:** `{{ $('Prepare AI Context').item.json.ai_prompt }}`

**System Message (optional):**
```
You are a sales email expert. Generate a professional follow-up email based on the template and context provided. Return ONLY the email content, no explanations.

Format your response as:
Subject: [subject line]

[email body]
```

---

### Step 7: Parse AI Response

Add a **Code node**:

**Node name:** Parse AI Response
**JavaScript code:**

```javascript
const aiResponse = $('Generate New Follow-up').item.json.choices[0].message.content;

// Split by "Subject:" to extract subject and body
const lines = aiResponse.split('\n');
let subject = '';
let body = '';
let foundSubject = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();

  if (line.startsWith('Subject:')) {
    subject = line.replace('Subject:', '').trim();
    foundSubject = true;
  } else if (foundSubject && line.length > 0) {
    // Everything after subject is body
    body = lines.slice(i).join('\n').trim();
    break;
  }
}

return [{
  json: {
    subject: subject || 'Follow-up',
    body: body || aiResponse
  }
}];
```

---

### Step 8: Update Draft in Airtable

Add an **Airtable node**:

**Node name:** Update Draft with New Content
**Operation:** Update
**Table:** FollowupQueue
**Record ID:** `{{ $('Get Draft to Regenerate').item.json.id }}`

**Fields to Update:**
- `subject` = `{{ $('Parse AI Response').item.json.subject }}`
- `body` = `{{ $('Parse AI Response').item.json.body }}`
- `is_edited` = `false` (uncheck - it's a fresh AI generation)
- Keep `status` as `needs_review`

---

### Step 9: Return Success Response

Add a **Set node**:

**Node name:** Return Regenerate Success
**Mode:** Manual mapping

**Fields:**
```json
{
  "ok": true,
  "data": {
    "success": true,
    "message": "Draft regenerated successfully"
  }
}
```

---

### Step 10: Update Merge Node

Make sure your existing **Merge node** (that combines all action branches) includes the new regenerate branch.

**Settings:**
- Mode: Append
- Connect all action branches (mark_ready, skip, edit_and_save, **regenerate**)

---

## Testing

1. **Open GTM Console** → Follow-ups tab
2. **Open a thread** with pending drafts
3. **Click "Regenerate"** on Follow-up #2
4. **Expected result:**
   - Success toast appears
   - Draft content changes (new subject/body)
   - Badge stays "Pending Review"
   - Other drafts (FU#1, FU#3) unchanged

---

## Troubleshooting

**Error: "Could not find draft"**
- Check the draft_id is being passed correctly
- Verify the filter formula in "Get Draft to Regenerate"

**Error: "No template found"**
- Make sure you have active templates for all stages
- Check the stage field matches exactly (follow_up_1, follow_up_2, follow_up_3)

**Empty AI response:**
- Check the template_prompt has placeholders filled in
- Verify AI node is configured correctly
- Check API key is valid

**Draft not updating:**
- Verify the Airtable Update node is using Record ID (not a field)
- Check field names match exactly

---

## Alternative: Call Mac Mini Workflow

If you want to reuse your Mac Mini's follow-up generation logic:

Instead of Steps 5-7, add an **HTTP Request node**:

**Node name:** Call Mac Mini to Regenerate
**Method:** POST
**URL:** `http://[mac-mini-ip]:5678/webhook/regenerate-followup`
**Body:**
```json
{
  "company": "{{ $('Get Draft to Regenerate').item.json.company }}",
  "email": "{{ $('Get Draft to Regenerate').item.json.email }}",
  "stage": "{{ $('Get Draft to Regenerate').item.json.stage }}",
  "original_subject": "{{ $('Get Original Email').item.json.subject }}",
  "original_body": "{{ $('Get Original Email').item.json.body }}"
}
```

Then you'd need to create that endpoint on Mac Mini too.

---

*Created: November 8, 2025*
