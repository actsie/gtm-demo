# Airtable Schema Quick Reference

Use this as a checklist when setting up your Airtable bases.

---

## Outbox Table - New Fields

Copy these field configurations exactly:

```
┌─────────────────────────┬──────────────────┬──────────────────────────────┐
│ Field Name              │ Type             │ Configuration                │
├─────────────────────────┼──────────────────┼──────────────────────────────┤
│ follow_up_count         │ Number           │ • Integer format             │
│                         │                  │ • Default value: 0           │
├─────────────────────────┼──────────────────┼──────────────────────────────┤
│ follow_up_stage         │ Single Select    │ Options (in order):          │
│                         │                  │ • initial                    │
│                         │                  │ • follow_up_1                │
│                         │                  │ • follow_up_2                │
│                         │                  │ • follow_up_3                │
│                         │                  │ • replied                    │
│                         │                  │ • closed                     │
├─────────────────────────┼──────────────────┼──────────────────────────────┤
│ replied_at              │ Date             │ • Include time: Yes          │
│                         │                  │ • GMT: Yes                   │
├─────────────────────────┼──────────────────┼──────────────────────────────┤
│ reply_body              │ Long text        │ • No special config          │
├─────────────────────────┼──────────────────┼──────────────────────────────┤
│ reply_snippet           │ Single line text │ • No special config          │
├─────────────────────────┼──────────────────┼──────────────────────────────┤
│ last_reply_checked      │ Date             │ • Include time: Yes          │
│                         │                  │ • GMT: Yes                   │
├─────────────────────────┼──────────────────┼──────────────────────────────┤
│ last_followup_sent      │ Date             │ • Include time: Yes          │
│                         │                  │ • GMT: Yes                   │
├─────────────────────────┼──────────────────┼──────────────────────────────┤
│ parent_email_id         │ Link to record   │ • Link to table: Outbox      │
│                         │                  │ • Allow linking multiple: No │
│                         │                  │ • Creates reciprocal field:  │
│                         │                  │   "follow_up_emails"         │
└─────────────────────────┴──────────────────┴──────────────────────────────┘
```

---

## FollowupTemplates Table - Complete Setup

### Table Structure

```
┌─────────────────────────┬──────────────────┬──────────────────────────────┐
│ Field Name              │ Type             │ Configuration                │
├─────────────────────────┼──────────────────┼──────────────────────────────┤
│ name                    │ Single line text │ • Primary field              │
├─────────────────────────┼──────────────────┼──────────────────────────────┤
│ stage                   │ Single Select    │ Options:                     │
│                         │                  │ • follow_up_1                │
│                         │                  │ • follow_up_2                │
│                         │                  │ • follow_up_3                │
├─────────────────────────┼──────────────────┼──────────────────────────────┤
│ days_after              │ Number           │ • Integer format             │
├─────────────────────────┼──────────────────┼──────────────────────────────┤
│ template_prompt         │ Long text        │ • Enable rich text: No       │
├─────────────────────────┼──────────────────┼──────────────────────────────┤
│ active                  │ Checkbox         │ • No special config          │
└─────────────────────────┴──────────────────┴──────────────────────────────┘
```

### Records to Create

**Record 1:**

```yaml
name: "Follow-up 1 (Day 3)"
stage: follow_up_1
days_after: 3
active: ✓
template_prompt: |
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

```yaml
name: "Follow-up 2 (Day 7)"
stage: follow_up_2
days_after: 7
active: ✓
template_prompt: |
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

```yaml
name: "Follow-up 3 (Day 14) - Breakup"
stage: follow_up_3
days_after: 14
active: ✓
template_prompt: |
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

---

## Airtable Formulas Reference

These formulas are used in n8n workflows. Copy exactly:

### Reply Detection Query

```
AND(
  {status} = 'sent',
  {follow_up_stage} != 'replied',
  {follow_up_stage} != 'closed',
  DATETIME_DIFF(NOW(), {sent_at}, 'days') <= 30
)
```

### Follow-up Stage 1 Query

```
AND(
  {status} = 'sent',
  {follow_up_stage} = 'initial',
  OR({replied_at} = BLANK(), {replied_at} = ''),
  DATETIME_DIFF(NOW(), {sent_at}, 'days') >= 3,
  OR(
    {last_followup_sent} = BLANK(),
    DATETIME_DIFF(NOW(), {last_followup_sent}, 'hours') >= 23
  )
)
```

### Follow-up Stage 2 Query

```
AND(
  {status} = 'sent',
  {follow_up_stage} = 'follow_up_1',
  OR({replied_at} = BLANK(), {replied_at} = ''),
  DATETIME_DIFF(NOW(), {sent_at}, 'days') >= 7,
  OR(
    {last_followup_sent} = BLANK(),
    DATETIME_DIFF(NOW(), {last_followup_sent}, 'hours') >= 23
  )
)
```

### Follow-up Stage 3 Query

```
AND(
  {status} = 'sent',
  {follow_up_stage} = 'follow_up_2',
  OR({replied_at} = BLANK(), {replied_at} = ''),
  DATETIME_DIFF(NOW(), {sent_at}, 'days') >= 14,
  OR(
    {last_followup_sent} = BLANK(),
    DATETIME_DIFF(NOW(), {last_followup_sent}, 'hours') >= 23
  )
)
```

---

## Visual Schema Diagram

```
Outbox Table
│
├─ Existing Fields:
│  • email (text)
│  • company (text)
│  • subject (text)
│  • body (long text)
│  • status (select)
│  • sent_at (date)
│  • dedupe_key (text)
│
└─ NEW Follow-up Fields:
   • follow_up_count (number) ──────┐
   • follow_up_stage (select) ──────┤ Tracking
   • last_followup_sent (date) ─────┘
   │
   • replied_at (date) ─────────────┐
   • reply_body (long text) ────────┤ Reply Info
   • reply_snippet (text) ──────────┤
   • last_reply_checked (date) ─────┘
   │
   • parent_email_id (link) ────────> Links to original email
   │
   • follow_up_emails (link) ───────> Auto-created reciprocal


FollowupTemplates Table
│
├─ name (text) ──────────────────> "Follow-up 1 (Day 3)"
├─ stage (select) ───────────────> "follow_up_1"
├─ days_after (number) ──────────> 3
├─ template_prompt (long text) ──> AI prompt
└─ active (checkbox) ────────────> ✓
```

---

## Data Flow Diagram

```
Initial Email Sent (GTM Console)
         │
         ├─> Airtable Outbox Created
         │   • follow_up_stage = "initial"
         │   • follow_up_count = 0
         │
         ↓
   Wait 3 days
         │
         ↓
   Follow-up Automation Runs (n8n)
         │
         ├─> Query: follow_up_stage = "initial" + 3 days old
         │
         ├─> AI generates follow-up
         │
         ├─> Gmail sends email
         │
         ├─> NEW Outbox record created
         │   • follow_up_stage = "follow_up_1"
         │   • parent_email_id = [original record]
         │
         └─> ORIGINAL record updated
             • follow_up_count = 1
             • last_followup_sent = NOW()
         │
         ↓
   Reply Detection Runs (n8n every 4 hrs)
         │
         ├─> Gmail search: from:[prospect] after:[sent_at]
         │
         ├─> IF reply found:
         │   └─> Update Outbox:
         │       • status = "replied"
         │       • replied_at = NOW()
         │       • follow_up_stage = "replied"
         │       • reply_body = [text]
         │
         └─> IF no reply:
             └─> Continue follow-up sequence
                 (Day 7: follow_up_2, Day 14: follow_up_3)
```

---

## Common Mistakes to Avoid

❌ **Don't:**
- Use "Initial" with capital I (use lowercase "initial")
- Forget to check "Include time" on date fields
- Skip creating the reciprocal field for parent_email_id
- Copy formulas with smart quotes (use straight quotes: ")

✅ **Do:**
- Match field names exactly (case-sensitive)
- Test with one record before bulk operations
- Verify Single Select options are spelled exactly as shown
- Keep template prompts in plain text (no rich formatting)

---

## Verification Checklist

After setup, verify:

- [ ] Outbox has 8 new fields
- [ ] FollowupTemplates table exists
- [ ] 3 template records created and active
- [ ] parent_email_id creates reciprocal "follow_up_emails" field
- [ ] All date fields include time
- [ ] Single select options match exactly
- [ ] Existing Outbox records have follow_up_stage = "initial"

---

## Field Purpose Reference

Quick lookup for "why does this field exist?":

| Field | Used By | Purpose |
|-------|---------|---------|
| `follow_up_count` | Automation | Track how many follow-ups sent (max 3) |
| `follow_up_stage` | Both | Current position in sequence |
| `replied_at` | Both | When prospect replied (stops automation) |
| `reply_body` | Phase 2 UI | Display reply in GTM Console |
| `reply_snippet` | Phase 2 UI | Preview text in table view |
| `last_reply_checked` | Detection | Avoid re-checking same prospect |
| `last_followup_sent` | Automation | Prevent duplicate sends same day |
| `parent_email_id` | Automation | Link follow-ups to original thread |

---

## Support

If fields aren't working as expected:

1. **Check exact spelling** - Field names are case-sensitive
2. **Verify field type** - Number vs Text vs Date matters
3. **Test formulas** - Paste into Airtable formula field to check syntax
4. **Review n8n logs** - Error messages show which field is missing/wrong
