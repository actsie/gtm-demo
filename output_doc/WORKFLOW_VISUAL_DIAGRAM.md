# GTM Console - Visual Workflow Diagrams

**Quick visual reference for understanding data flow**

---

## Complete System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  USER                                       │
│                           (Desktop Application)                             │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                    Interacts with Electron App
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GTM OPERATIONS CONSOLE                             │
│                              (Electron App)                                 │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                       RENDERER PROCESS                                │ │
│  │                    (React + TypeScript + Tailwind)                    │ │
│  │                                                                       │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │ │
│  │  │Prospects │  │Follow-Ups│  │  Drafts  │  │  Email   │  │Settings│ │ │
│  │  │   Tab    │  │   Tab    │  │   Tab    │  │   Tab    │  │ Modal  │ │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘ │ │
│  │       │             │             │             │             │      │ │
│  │       └─────────────┴─────────────┴─────────────┴─────────────┘      │ │
│  │                                   │                                   │ │
│  │                         window.api.callWebhook()                      │ │
│  │                                   │                                   │ │
│  └───────────────────────────────────┼───────────────────────────────────┘ │
│                                      │                                     │
│                          IPC (Inter-Process Communication)                │
│                                      │                                     │
│  ┌───────────────────────────────────┼───────────────────────────────────┐ │
│  │                       MAIN PROCESS (Node.js)                          │ │
│  │                                   │                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ IPC Handlers:                                                   │ │ │
│  │  │  • call-webhook                                                 │ │ │
│  │  │  • get-settings                                                 │ │ │
│  │  │  • save-settings                                                │ │ │
│  │  │  • get-secret (keytar)                                          │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                   │                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ Network Layer (network.ts):                                     │ │ │
│  │  │  • HTTPS requests to n8n                                        │ │ │
│  │  │  • Authentication headers                                       │ │ │
│  │  │  • Error handling                                               │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  │                                   │                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ Secure Storage:                                                 │ │ │
│  │  │  • electron-store (settings)                                    │ │ │
│  │  │  • keytar (secrets in OS keychain)                              │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                       HTTPS POST with secret
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                          N8N AUTOMATION SERVER                              │
│                           (Workflow Engine)                                 │
│                                                                             │
│  Webhook Endpoints:                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ /webhook/send-email                                                  │  │
│  │ /webhook/followups-list                                              │  │
│  │ /webhook/followup-details                                            │  │
│  │ /webhook/followup-action                                             │  │
│  │ /webhook/drafts-generate                                             │  │
│  │ /webhook/prospects-sync                                              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Workflows Execute:                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐ │
│  │  Validate  │→ │   Query    │→ │  Call AI   │→ │  Send/Store/Update   │ │
│  │   Secret   │  │  Airtable  │  │  (Claude)  │  │   (Gmail/Airtable)   │ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────────────────┘ │
└────────────────┬───────────────────────────────────────┬────────────────────┘
                 │                                       │
                 ↓                                       ↓
┌──────────────────────────────┐        ┌────────────────────────────────────┐
│       CLAUDE API             │        │         GMAIL API                  │
│   (AI Content Generation)    │        │    (Send/Receive Emails)           │
│                              │        │                                    │
│  • Generate cold emails      │        │  • Send emails                     │
│  • Write follow-ups          │        │  • Search for replies              │
│  • Draft social replies      │        │  • Get message threads             │
└──────────────────────────────┘        └────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AIRTABLE                                       │
│                         (Database Layer)                                    │
│                                                                             │
│  ┌────────────────────┐  ┌─────────────────────┐  ┌────────────────────┐  │
│  │   Outbox Table     │  │ FollowupTemplates   │  │  Prospects Table   │  │
│  │                    │  │      Table          │  │                    │  │
│  │  • Sent emails     │  │                     │  │  • Contact info    │  │
│  │  • Follow-up stage │  │  • AI prompts       │  │  • Company data    │  │
│  │  • Reply status    │  │  • Timing rules     │  │  • Notes/tags      │  │
│  │  • Email threads   │  │  • Active/inactive  │  │  • Status          │  │
│  └────────────────────┘  └─────────────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Feature Workflows

### 1. Sending a Cold Email (Step-by-Step)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ STEP 1: User Fills Form                                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┌─────────────────────────────────────────────────────────────────┐
│  Email Tab (EmailTab.tsx)                                        │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Email: john@acmecorp.com                                │    │
│  │ Company: Acme Corp                                      │    │
│  │ Notes: Saw their post about scaling challenges         │    │
│  │ □ Dry Run (preview only)                               │    │
│  │                                                         │    │
│  │              [ Send Email ]                             │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ User clicks "Send Email"
                           ↓
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ STEP 2: React Component Calls IPC                                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┌─────────────────────────────────────────────────────────────────┐
│  JavaScript:                                                      │
│                                                                   │
│  const result = await window.api.callWebhook('send-email', {     │
│    email: 'john@acmecorp.com',                                   │
│    company: 'Acme Corp',                                         │
│    notes: 'Saw their post about...',                             │
│    dryRun: false                                                 │
│  })                                                              │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ IPC message sent to main process
                           ↓
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ STEP 3: Main Process Handles Request                             ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┌─────────────────────────────────────────────────────────────────┐
│  main.ts (Electron Main Process)                                 │
│                                                                   │
│  1. Receive IPC call                                             │
│  2. Get settings:                                                │
│     • n8n base URL from electron-store                           │
│     • webhook secret from keytar (OS keychain)                   │
│  3. Make HTTPS request                                           │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ POST https://your-n8n.com/webhook/send-email
                           │ Headers: { "x-webhook-secret": "..." }
                           ↓
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ STEP 4: n8n Workflow Processes Request                           ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┌─────────────────────────────────────────────────────────────────┐
│  n8n Nodes (executed in sequence):                               │
│                                                                   │
│  ① Webhook Trigger                                               │
│     Receives request, validates secret                           │
│                                                                   │
│  ② Extract Data                                                  │
│     Parse JSON body, validate fields                             │
│                                                                   │
│  ③ Check Duplicates (Airtable Query)                             │
│     Query: WHERE email = 'john@...' AND status = 'sent'          │
│     Skip if already contacted recently                           │
│                                                                   │
│  ④ Generate Email (Claude API)                                   │
│     Prompt: "Write professional cold email to {company}          │
│              about {notes}. Keep it brief and value-focused."    │
│                                                                   │
│  ⑤ Review AI Output                                              │
│     Parse JSON response from Claude                              │
│     Extract subject + body                                       │
│                                                                   │
│  ⑥ Send Email (Gmail API)                                        │
│     To: john@acmecorp.com                                        │
│     Subject: [AI-generated]                                      │
│     Body: [AI-generated]                                         │
│                                                                   │
│  ⑦ Create Airtable Record (Outbox)                               │
│     {                                                            │
│       email: 'john@acmecorp.com',                                │
│       company: 'Acme Corp',                                      │
│       subject: 'Quick question about...',                        │
│       body: '<full email>',                                      │
│       status: 'sent',                                            │
│       sent_at: '2024-11-13T10:30:00Z',                           │
│       follow_up_stage: 'initial',                                │
│       follow_up_count: 0,                                        │
│       message_id: '<gmail-msg-id>'                               │
│     }                                                            │
│                                                                   │
│  ⑧ Return Success Response                                       │
│     {                                                            │
│       success: true,                                             │
│       subject: 'Quick question about...',                        │
│       messageId: '<gmail-msg-id>',                               │
│       airtableId: 'rec123456'                                    │
│     }                                                            │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ Response sent back to main process
                           ↓
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ STEP 5: Main Process Returns Result to Renderer                  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┌─────────────────────────────────────────────────────────────────┐
│  main.ts                                                          │
│                                                                   │
│  1. Parse JSON response from n8n                                 │
│  2. Return to renderer via IPC                                   │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ IPC response
                           ↓
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ STEP 6: UI Updates                                               ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┌─────────────────────────────────────────────────────────────────┐
│  EmailTab.tsx                                                     │
│                                                                   │
│  ✅ Success Toast: "Email sent to john@acmecorp.com"             │
│                                                                   │
│  Display:                                                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Subject: Quick question about scaling                     │  │
│  │ Message ID: <gmail-msg-id>                                │  │
│  │ Saved to Airtable: rec123456                              │  │
│  │                                                           │  │
│  │ Next follow-up scheduled: Nov 16, 2024 (3 days)          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Recent Runs list updated with new entry                         │
│  Form cleared, ready for next email                              │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2. Automated Follow-Up System (Background Process)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ SCHEDULED WORKFLOW (runs every hour)                              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                           │
                           │ Cron: 0 * * * * (every hour)
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  n8n Node ① : Schedule Trigger                                   │
│                                                                   │
│  Fires at: :00 minutes past every hour                           │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  n8n Node ② : Query Airtable for Follow-Up Candidates            │
│                                                                   │
│  Query (Follow-up Stage 1 - Day 3):                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ AND(                                                      │  │
│  │   {status} = 'sent',                                      │  │
│  │   {follow_up_stage} = 'initial',                          │  │
│  │   {replied_at} is empty,                                  │  │
│  │   DATETIME_DIFF(NOW(), {sent_at}, 'days') >= 3,           │  │
│  │   OR(                                                     │  │
│  │     {last_followup_sent} is empty,                        │  │
│  │     DATETIME_DIFF(NOW(), {last_followup_sent}, 'hours')   │  │
│  │       >= 23                                               │  │
│  │   )                                                       │  │
│  │ )                                                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Results: 5 records ready for follow-up                          │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ For each record...
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  n8n Node ③ : Get Follow-Up Template                             │
│                                                                   │
│  Query FollowupTemplates table:                                  │
│  WHERE stage = 'follow_up_1' AND active = true                   │
│                                                                   │
│  Returns:                                                         │
│  {                                                               │
│    name: "Follow-up 1 (Day 3)",                                  │
│    stage: "follow_up_1",                                         │
│    days_after: 3,                                                │
│    template_prompt: "Write a brief, friendly follow-up..."       │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  n8n Node ④ : Build AI Prompt                                    │
│                                                                   │
│  Combine:                                                         │
│  • Template prompt                                               │
│  • Original email context                                        │
│  • Company name                                                  │
│  • Original subject line                                         │
│                                                                   │
│  Final prompt:                                                    │
│  "Write a brief, friendly follow-up checking if they saw         │
│   the previous email.                                            │
│                                                                   │
│   Context:                                                        │
│   - Company: Acme Corp                                           │
│   - Original subject: Quick question about scaling               │
│   - Original message was about: helping with growth challenges   │
│                                                                   │
│   Guidelines:                                                     │
│   - Keep it 2-3 sentences max                                    │
│   - Reference the original offer briefly                         │
│   - Friendly but not pushy                                       │
│   - Ask a simple question to re-engage"                          │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  n8n Node ⑤ : Call Claude API                                    │
│                                                                   │
│  Request:                                                         │
│    Model: claude-3-5-sonnet-20241022                             │
│    Messages: [{ role: "user", content: [prompt] }]               │
│                                                                   │
│  Response:                                                        │
│  {                                                               │
│    "subject": "Re: Quick question about scaling",                │
│    "body": "Hi John,\n\nJust wanted to follow up on my          │
│             previous email about helping Acme Corp scale.        │
│             Did you get a chance to review it?\n\n               │
│             Happy to chat if you're interested.\n\nBest,\n       │
│             [Your name]"                                         │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  n8n Node ⑥ : Send Email via Gmail                               │
│                                                                   │
│  Gmail API:                                                       │
│    To: john@acmecorp.com                                         │
│    Subject: Re: Quick question about scaling                     │
│    Body: [AI-generated text]                                     │
│    In-Reply-To: <original-message-id>                            │
│    References: <original-message-id>                             │
│                                                                   │
│  Gmail threads these together automatically                      │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  n8n Node ⑦ : Create NEW Outbox Record (Follow-Up)               │
│                                                                   │
│  Airtable.create('Outbox', {                                     │
│    email: 'john@acmecorp.com',                                   │
│    company: 'Acme Corp',                                         │
│    subject: 'Re: Quick question about scaling',                  │
│    body: [AI-generated],                                         │
│    status: 'sent',                                               │
│    sent_at: NOW(),                                               │
│    follow_up_stage: 'follow_up_1',  ← Advanced stage             │
│    parent_email_id: 'rec123456',    ← Link to original           │
│    message_id: '<new-gmail-id>'                                  │
│  })                                                              │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  n8n Node ⑧ : Update ORIGINAL Outbox Record                      │
│                                                                   │
│  Airtable.update('rec123456', {                                  │
│    follow_up_count: 1,                ← Increment counter        │
│    last_followup_sent: NOW()          ← Prevent duplicate sends  │
│  })                                                              │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ↓
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ RESULT: Follow-up sent, ready for next stage (Day 7, Day 14)     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

### 3. Reply Detection System

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ SCHEDULED WORKFLOW (runs every 4 hours)                           ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                           │
                           │ Cron: 0 */4 * * * (every 4 hours)
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  n8n Node ① : Query Emails to Check                              │
│                                                                   │
│  Query Airtable Outbox:                                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ AND(                                                      │  │
│  │   {status} = 'sent',                                      │  │
│  │   {follow_up_stage} != 'replied',                         │  │
│  │   {follow_up_stage} != 'closed',                          │  │
│  │   DATETIME_DIFF(NOW(), {sent_at}, 'days') <= 30           │  │
│  │ )                                                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Returns 50 records to check                                     │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ For each record...
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│  n8n Node ② : Search Gmail for Replies                           │
│                                                                   │
│  Gmail API Search Query:                                         │
│    from:john@acmecorp.com                                        │
│    after:2024/11/10                                              │
│    in:anywhere                                                   │
│                                                                   │
│  Looking for: Any email from prospect sent after our email       │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ↓
                ┌──────────┴──────────┐
                │                     │
         Reply Found             No Reply Found
                │                     │
                ↓                     ↓
┌─────────────────────────┐  ┌──────────────────────────┐
│  Node ③a: Get Reply     │  │  Node ③b: Update Check   │
│  Details                │  │  Timestamp               │
│                         │  │                          │
│  Gmail API:             │  │  Airtable.update({       │
│  • Get message body     │  │    last_reply_checked:   │
│  • Get timestamp        │  │      NOW()               │
│  • Get snippet          │  │  })                      │
│  • Check thread ID      │  │                          │
└────────┬────────────────┘  │  Continue to next record │
         │                   └──────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────────┐
│  n8n Node ④ : Update Outbox Record (Reply Detected)              │
│                                                                   │
│  Airtable.update('rec123456', {                                  │
│    follow_up_stage: 'replied',      ← Stop follow-up sequence    │
│    replied_at: '2024-11-13T14:20Z', ← When they replied          │
│    reply_body: '<full reply text>', ← Store full message         │
│    reply_snippet: 'Thanks for...',  ← First 100 chars            │
│    last_reply_checked: NOW()                                     │
│  })                                                              │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ↓
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ RESULT: Reply recorded, follow-ups stopped, user can view reply  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## State Management Flow (Zustand)

```
┌─────────────────────────────────────────────────────────────────┐
│                      GLOBAL STATE STORE                          │
│                       (src/renderer/store.ts)                    │
│                                                                   │
│  State:                                                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ {                                                         │  │
│  │   prospects: Prospect[],                                  │  │
│  │   followUps: FollowUp[],                                  │  │
│  │   drafts: Draft[],                                        │  │
│  │   isLoading: boolean,                                     │  │
│  │   error: string | null                                    │  │
│  │ }                                                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Actions:                                                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ • setProspects(prospects: Prospect[])                     │  │
│  │ • addProspect(prospect: Prospect)                         │  │
│  │ • updateProspect(id: string, updates: Partial<Prospect>)  │  │
│  │ • removeProspect(id: string)                              │  │
│  │                                                           │  │
│  │ • setFollowUps(followUps: FollowUp[])                     │  │
│  │ • updateFollowUp(id: string, updates: Partial<FollowUp>)  │  │
│  │                                                           │  │
│  │ • setLoading(isLoading: boolean)                          │  │
│  │ • setError(error: string | null)                          │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────┬──────────────────────────────────────────┬───────────┘
           │                                          │
           │ Subscribed Components                    │
           ↓                                          ↓
┌──────────────────────┐                  ┌──────────────────────┐
│  ProspectsTab.tsx    │                  │  FollowUpsTab.tsx    │
│                      │                  │                      │
│  const { prospects,  │                  │  const { followUps,  │
│          addProspect │                  │          updateFU }  │
│        } = useStore()│                  │        = useStore()  │
│                      │                  │                      │
│  • Reads: prospects  │                  │  • Reads: followUps  │
│  • Writes: via       │                  │  • Writes: via       │
│    addProspect()     │                  │    updateFU()        │
└──────────────────────┘                  └──────────────────────┘

When state changes, ALL subscribed components re-render automatically
```

---

## Security Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                      RENDERER PROCESS                            │
│                   (Untrusted / Sandboxed)                        │
│                                                                   │
│  ❌ CANNOT:                                                       │
│  • Access file system                                            │
│  • Make network requests                                         │
│  • Access Node.js APIs                                           │
│  • Read environment variables                                    │
│  • Execute shell commands                                        │
│                                                                   │
│  ✅ CAN:                                                          │
│  • Render UI                                                     │
│  • Handle user input                                             │
│  • Call exposed IPC methods via window.api.*                     │
│  • Manage local state                                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                   IPC Channel (Controlled Bridge)
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                       MAIN PROCESS                               │
│                    (Trusted / Full Access)                       │
│                                                                   │
│  ✅ CAN:                                                          │
│  • Access file system                                            │
│  • Make HTTPS requests                                           │
│  • Use Node.js APIs                                              │
│  • Read/write OS keychain                                        │
│  • Execute system commands                                       │
│                                                                   │
│  🔒 VALIDATES:                                                    │
│  • All IPC calls (authentication)                                │
│  • All user inputs (sanitization)                                │
│  • All webhook responses (parsing)                               │
│                                                                   │
│  🔐 STORES SECRETS IN:                                            │
│  • macOS: Keychain Access                                        │
│  • Windows: Credential Manager                                   │
│  • Linux: libsecret/gnome-keyring                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Full Email Thread Lifecycle

```
Day 0                Day 3               Day 7               Day 14
  │                    │                   │                   │
  │ Initial Email      │ Follow-up 1       │ Follow-up 2       │ Follow-up 3
  ↓                    ↓                   ↓                   ↓
┌────────┐          ┌────────┐          ┌────────┐          ┌────────┐
│ SENT   │          │ SENT   │          │ SENT   │          │ SENT   │
└────┬───┘          └────┬───┘          └────┬───┘          └────┬───┘
     │                   │                   │                   │
     │ Airtable:         │ Airtable:         │ Airtable:         │ Airtable:
     │ {                 │ {                 │ {                 │ {
     │   stage:          │   stage:          │   stage:          │   stage:
     │   'initial',      │   'follow_up_1',  │   'follow_up_2',  │   'follow_up_3',
     │   count: 0        │   count: 1        │   count: 2        │   count: 3
     │ }                 │ }                 │ }                 │ }
     │                   │                   │                   │
     │                   │                   │                   │
     │ ┌─────────────────────────────────────────────────────────┐
     │ │ Reply Detection (every 4 hours)                         │
     │ └─────────────────────────────────────────────────────────┘
     │                   │                   │                   │
     │                   ↓                   │                   │
     │            IF REPLY FOUND:             │                   │
     │                   │                   │                   │
     │                   ↓                   │                   │
     │          ┌─────────────────┐          │                   │
     │          │ REPLIED         │          │                   │
     │          │ {               │          │                   │
     │          │   stage:        │          │                   │
     │          │   'replied',    │          │                   │
     │          │   replied_at:   │          │                   │
     │          │   '2024-11-...' │          │                   │
     │          │ }               │          │                   │
     │          └─────────────────┘          │                   │
     │                   │                   │                   │
     │          STOP FOLLOW-UPS              │                   │
     │                                       │                   │
     │                   ↓                   ↓                   ↓
     │            No more emails      No more emails      No more emails
     │                sent                 sent                sent
     │                                                           │
     │                                                           │
     └───────────────────────────────────────────────────────────┘
                                                       IF NO REPLY BY DAY 14:
                                                                 │
                                                                 ↓
                                                       ┌─────────────────┐
                                                       │ CLOSED          │
                                                       │ {               │
                                                       │   stage:        │
                                                       │   'closed'      │
                                                       │ }               │
                                                       └─────────────────┘
                                                                 │
                                                          Sequence ends
```

---

## Summary: How Data Flows

1. **User Action** → React component
2. **Component** → IPC call to main process
3. **Main Process** → HTTPS request to n8n
4. **n8n** → Orchestrates:
   - Airtable queries
   - Claude AI generation
   - Gmail sending
5. **Response** → Back through n8n → main → renderer
6. **UI Updates** → Zustand state change → React re-renders

**The key insight:** The desktop app is just a UI shell. All the real work happens in n8n workflows, which coordinate external services.
