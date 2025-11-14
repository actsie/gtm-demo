# Technical Assets & Screenshot Guide

## Screenshots to Capture

### 1. **Prospects Tab - Main View** (Priority: HIGH)

**What to capture:**
- Full window with table showing prospects
- At least 3-5 prospects visible
- Status badges visible (New, Sent, Replied)
- "Generate Draft" buttons visible
- Refresh button and last updated timestamp
- Clean, populated state (not empty)

**Ideal state:**
- Mix of statuses (some New, some Sent)
- Realistic company names and emails
- Notes visible in note column
- Good data density

**Caption:**
> "The Prospects Tab: Unified dashboard for managing cold outreach. One-click draft generation, status tracking, and contextual notes—all in one view."

**Filename:** `prospects-tab-main-view.png`

---

### 2. **Prospects Tab - Draft Modal** (Priority: HIGH)

**What to capture:**
- Draft generation modal open
- AI-generated subject line visible
- Email body preview visible
- "Regenerate Draft" and "Send Email" buttons
- Prospect info (email, company) in modal header
- Copy icons for subject line

**Ideal state:**
- Well-formatted email body
- Professional subject line
- Clear modal design
- Visible actions

**Caption:**
> "AI draft generation in action: Personalized email created in seconds with subject and body. Review, edit, regenerate, or send—all from one modal."

**Filename:** `prospects-draft-modal.png`

---

### 3. **Follow-ups Tab - Pending Review** (Priority: HIGH)

**What to capture:**
- Full window with Pending Review sub-tab active
- Stats dashboard visible (All Drafts, Pending Review, Due Today, Overdue)
- Table showing multiple follow-up drafts
- Status badges visible
- Urgency indicators (red for overdue, yellow for due today)
- Action buttons (Approve, Skip, View Thread)

**Ideal state:**
- Stats showing realistic numbers (e.g., "12 All Drafts", "5 Pending Review", "2 Due Today")
- Mix of FU#1, FU#2, FU#3 in table
- Some overdue items to show urgency
- Good data density

**Caption:**
> "Pending Review: Batch approve follow-up drafts with interactive stats filtering. See what's due today, overdue, or needs attention at a glance."

**Filename:** `followups-pending-review.png`

---

### 4. **Follow-ups Tab - Thread View Modal** (Priority: HIGH)

**What to capture:**
- Thread view modal open
- All 3 follow-up drafts visible (FU#1, FU#2, FU#3)
- Prospect info in header
- Each draft showing subject + body preview
- Action buttons for each draft (Approve, Skip)
- Sent date preview visible

**Ideal state:**
- Clear visual separation between FU#1, FU#2, FU#3
- Different email content for each follow-up
- Professional formatting
- Clear actions

**Caption:**
> "Thread View: See all three follow-up drafts (Day 3, 7, 14) before they send. Approve, skip, or regenerate each one individually."

**Filename:** `followups-thread-view.png`

---

### 5. **Follow-ups Tab - Sent Emails** (Priority: MEDIUM)

**What to capture:**
- Sent Emails sub-tab active
- Stats showing reply rate and total sent
- Filter pills visible (All, Initial, FU#1, FU#2, FU#3, Replied, Closed)
- Table with sent emails
- Stage badges visible
- Status badges visible

**Ideal state:**
- Mix of stages (Initial, FU#1, FU#2, FU#3)
- Some "Replied" status items
- Good data density
- Filters clearly visible

**Caption:**
> "Sent Emails: Track every conversation with stage and status tracking. Filter by follow-up stage or reply status. Full visibility into your pipeline."

**Filename:** `followups-sent-emails.png`

---

### 6. **Follow-ups Tab - Email Thread Modal** (Priority: MEDIUM)

**What to capture:**
- Email thread modal open
- Full conversation history visible (Initial email + follow-ups)
- Sent timestamps visible
- Clear visual hierarchy (Initial → FU#1 → FU#2 → FU#3)
- Manual action buttons (Mark as Replied, Send Now)

**Ideal state:**
- At least 2-3 emails in thread
- Timestamps showing progression
- Professional email content
- Clear conversation flow

**Caption:**
> "Email Thread View: See the entire conversation history for any prospect. Track which stage they're at and take manual actions when needed."

**Filename:** `followups-email-thread.png`

---

### 7. **Settings Modal** (Priority: LOW)

**What to capture:**
- Settings modal open
- n8n Base URL field visible
- Webhook Secret field visible (censored/asterisks)
- Theme selector (Light/Dark/System)
- Save button

**Ideal state:**
- Professional form layout
- Clear labels
- Security icon for webhook secret
- Clean modal design

**Caption:**
> "Simple configuration: Set your n8n URL, webhook secret, and theme preference. Credentials stored securely in OS keychain."

**Filename:** `settings-modal.png`

---

### 8. **Recent Runs Side Panel** (Priority: LOW)

**What to capture:**
- Recent Runs panel open
- List of recent API calls visible
- Timestamps visible
- Success/error status visible
- Different endpoints visible (prospects-list, send-email, etc.)

**Ideal state:**
- Mix of successful and (optionally) failed calls
- Realistic timestamps
- Clear endpoint names
- Good debugging view

**Caption:**
> "Built-in debugging: Recent Runs panel shows all API calls with timestamps and status. Essential for troubleshooting workflows."

**Filename:** `recent-runs-panel.png`

---

### 9. **Other Tabs (Optional)**

**Leads Tab:**
- Reddit search results visible
- Clickable links with upvote scores
- Share to Slack/Airtable buttons

**Reply Drafts Tab:**
- Social reply generation interface
- Multiple draft variations visible

**Prospect Email Tab:**
- Simple cold email sending form
- Dry-run mode visible

**Filename:** `other-tabs-overview.png`

---

## Architecture Diagram Description

### **Diagram 1: 3-Tier Architecture Overview**

**Visual elements:**
```
┌─────────────────────────────────────┐
│   TIER 1: ELECTRON DESKTOP APP      │
│   (React + TypeScript + Tailwind)   │
│                                     │
│   • Prospects Tab                   │
│   • Follow-ups Tab                  │
│   • Settings                        │
└──────────────┬──────────────────────┘
               │ IPC + Webhooks
               ▼
┌─────────────────────────────────────┐
│   TIER 2: n8n WORKFLOW AUTOMATION   │
│                                     │
│   • Draft Generator Workflow        │
│   • Email Sender Workflow           │
│   • Follow-up Queue Workflow        │
│   • Scheduled Sender Workflow       │
└──────────────┬──────────────────────┘
               │ REST API
               ▼
┌─────────────────────────────────────┐
│   TIER 3: AIRTABLE DATABASE         │
│                                     │
│   • Prospects Table                 │
│   • Outbox Table                    │
│   • FollowupQueue Table             │
└─────────────────────────────────────┘
```

**Tool suggestion:** Use Excalidraw, Figma, or Lucidchart to create a clean visual version

**Color coding:**
- Tier 1 (Electron): Blue
- Tier 2 (n8n): Purple
- Tier 3 (Airtable): Green
- Arrows: Gray with labels

---

### **Diagram 2: Email Sending Flow**

**Visual elements:**
```
USER ACTION: Click "Send Email"
     │
     ▼
[Electron Console]
   Updates UI optimistically (prospect disappears)
     │
     ▼
[n8n Webhook: /webhook/cold-email?mode=send]
     │
     ├─→ [Check Airtable for duplicates]
     │        │
     │        ▼
     ├─→ [Send email via Gmail]
     │        │
     │        ▼
     ├─→ [Create record in Outbox table]
     │        │
     │        ▼
     ├─→ [Generate 3 follow-up drafts via AI]
     │        │
     │        ▼
     └─→ [Create 3 records in FollowupQueue table]
              │
              ▼
     [Return success + Airtable URL]
              │
              ▼
     [Console shows success toast]
```

**Tool suggestion:** Use Mermaid.js, Whimsical, or Lucidchart

---

### **Diagram 3: Caching & Optimization Layer**

**Visual elements:**
```
REQUEST: Fetch Prospects List
     │
     ▼
[Check Cache]
     │
     ├─→ Cache HIT (< 5 min old)
     │        │
     │        └─→ Return cached data (instant)
     │
     └─→ Cache MISS (> 5 min old or not exists)
              │
              ▼
     [Check In-Flight Requests]
              │
              ├─→ Request EXISTS
              │        │
              │        └─→ Return existing promise
              │
              └─→ Request DOESN'T EXIST
                       │
                       ▼
              [Make API call to n8n]
                       │
                       ▼
              [Store in cache with timestamp]
                       │
                       ▼
              [Return data]
```

**Tool suggestion:** Use Mermaid.js or draw.io

---

### **Diagram 4: Follow-up Automation Timeline**

**Visual elements:**
```
DAY 0: Initial email sent
       │
       └─→ 3 follow-up drafts auto-generated
           │
           ├─→ FU#1 (Due: Day 3)
           │   Status: Pending Review
           │
           ├─→ FU#2 (Due: Day 7)
           │   Status: Pending Review
           │
           └─→ FU#3 (Due: Day 14)
               Status: Pending Review

USER: Reviews and approves FU#1

DAY 3: FU#1 auto-sends
       Status: Sent

DAY 7: FU#2 auto-sends
       Status: Sent

DAY 14: FU#3 auto-sends
        Status: Sent
```

**Tool suggestion:** Use timeline visualization or Gantt chart style

---

## Before/After Comparison Graphics

### **Graphic 1: Tool Sprawl → Unified Console**

**Before (Left Side):**
```
❌ BEFORE: 7 Tools

📧 Gmail (sending)
📊 Google Sheets (tracking)
🗂️ Airtable (CRM)
📝 Notion (templates)
📅 Calendar (reminders)
💼 Salesforce (prospect data)
🔗 Zapier (basic automation)

30-45 min per prospect
20-30% missed follow-ups
```

**After (Right Side):**
```
✅ AFTER: 1 Console

🖥️ GTM Ops Console
   • Prospects management
   • Draft generation
   • Follow-up automation
   • Full visibility

5 min per prospect
0% missed follow-ups
```

---

### **Graphic 2: Manual vs Automated Workflow**

**Before (Manual Flow):**
```
1. Open Gmail
2. Switch to Notion → Copy template
3. Switch to Airtable → Check prospect info
4. Switch back to Gmail → Paste + personalize
5. Send email
6. Switch to Sheets → Log send date
7. Switch to Calendar → Set FU reminder
8. Repeat for each prospect

⏱️ 30-45 minutes
```

**After (Automated Flow):**
```
1. Open console
2. Click "Generate Draft"
3. Review + Send
4. Done (follow-ups auto-queue)

⏱️ 5 minutes
```

---

### **Graphic 3: API Optimization Impact**

**Visual bar chart:**
```
Before Optimization:
█████████████████████████ 1,264 calls/month

After Optimization:
████████████ 600 calls/month

60% reduction
```

**Techniques shown:**
- 5-min caching: -400 calls
- Request deduplication: -150 calls
- Debounced filters: -114 calls

---

## Data Visualization Suggestions

### **Chart 1: Time Savings Breakdown**

**Stacked bar chart:**
```
Per Prospect Time:

Before: ████████████████████████████████ 30-45 min
        [Context switching: 25-40 min] [Writing: 5 min]

After:  ██████ 5 min
        [All in console: 5 min]

83% reduction
```

---

### **Chart 2: Follow-up Completion Rate**

**Progress bars:**
```
Manual Tracking:
██████████████░░░░░░░░░░░░ 70-80% follow-ups sent
20-30% missed

Automated System:
████████████████████████████ 100% follow-ups sent
0% missed
```

---

### **Chart 3: API Call Distribution**

**Pie chart showing where calls were saved:**
```
Before Optimization (1,264 calls):
• Prospects list fetches: 45% (568)
• Follow-up list fetches: 35% (442)
• Filter changes: 15% (190)
• Other: 5% (64)

After Optimization (600 calls):
• Prospects list fetches: 35% (210) [cached]
• Follow-up list fetches: 30% (180) [cached]
• Filter changes: 5% (30) [debounced]
• Mutations: 25% (150) [invalidates cache]
• Other: 5% (30)
```

---

## Code Snippets (For Technical Blog)

### **Snippet 1: 5-Minute Caching Implementation**

```typescript
// src/renderer/store.ts

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache: Map<string, CacheEntry> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedOrFetch(
  cacheKey: string,
  fetchFn: () => Promise<any>
): Promise<any> {
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    // Cache hit - return cached data
    return Promise.resolve(cached.data);
  }

  // Cache miss - fetch fresh data
  return fetchFn().then(data => {
    cache.set(cacheKey, { data, timestamp: now });
    return data;
  });
}

export function invalidateCache(pattern: string) {
  // Invalidate cache on mutations
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}
```

---

### **Snippet 2: Request Deduplication**

```typescript
// src/renderer/api.ts

const inFlightRequests = new Map<string, Promise<any>>();

export async function deduplicatedFetch(
  requestKey: string,
  fetchFn: () => Promise<any>
): Promise<any> {
  // Check if request is already in-flight
  if (inFlightRequests.has(requestKey)) {
    return inFlightRequests.get(requestKey)!;
  }

  // Start new request
  const promise = fetchFn().finally(() => {
    // Clean up when done
    inFlightRequests.delete(requestKey);
  });

  inFlightRequests.set(requestKey, promise);
  return promise;
}
```

---

### **Snippet 3: Debounced Filters**

```typescript
// src/renderer/components/FollowupsTab.tsx

const [filterStatus, setFilterStatus] = useState('all');
const timeoutRef = useRef<NodeJS.Timeout>();

const handleFilterChange = (newStatus: string) => {
  // Update UI immediately
  setFilterStatus(newStatus);

  // Clear existing timer
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
  }

  // Wait 500ms before firing API call
  timeoutRef.current = setTimeout(() => {
    fetchFollowups(newStatus);
  }, 500);
};
```

---

### **Snippet 4: Optimistic UI Update**

```typescript
// src/renderer/components/ProspectsTab.tsx

const handleSendEmail = async (prospect: Prospect) => {
  // 1. Update UI immediately (optimistic)
  setProspects(prev => prev.filter(p => p.email !== prospect.email));
  showToast('Email sent!', 'success');

  try {
    // 2. Fire API call in background
    await sendEmail(prospect);

    // 3. Invalidate cache to ensure fresh data on next fetch
    invalidateCache('prospects');
  } catch (error) {
    // 4. Roll back on error
    setProspects(prev => [...prev, prospect]);
    showToast('Failed to send email', 'error');
  }
};
```

---

## n8n Workflow Screenshots

### **Workflow 1: Cold Email Draft Generator**

**What to capture:**
- Full n8n canvas with all nodes visible
- Webhook trigger node
- HTTP Request node (to Claude API)
- Function node (parsing response)
- Respond to Webhook node

**Nodes to highlight:**
1. Webhook Trigger (`/webhook/cold-email?mode=draft`)
2. Extract Prospect Data
3. Build Prompt Template
4. Call Claude API
5. Parse JSON Response
6. Return Subject + Body

**Filename:** `n8n-draft-generator-workflow.png`

---

### **Workflow 2: Email Sender + Follow-up Queue**

**What to capture:**
- Full n8n canvas
- Multiple branches (duplicate check → send → Airtable → generate follow-ups)
- Airtable nodes visible
- Gmail node visible
- AI generation nodes visible

**Nodes to highlight:**
1. Webhook Trigger
2. Airtable: Check Duplicates
3. Gmail: Send Email
4. Airtable: Create Outbox Record
5. AI: Generate FU#1 Draft
6. AI: Generate FU#2 Draft
7. AI: Generate FU#3 Draft
8. Airtable: Create FollowupQueue Records (batch)
9. Return Success

**Filename:** `n8n-email-sender-workflow.png`

---

### **Workflow 3: Scheduled Follow-up Sender**

**What to capture:**
- Cron trigger node
- Airtable query node
- Loop through drafts
- Gmail send node
- Airtable update node

**Nodes to highlight:**
1. Cron Trigger (every hour)
2. Airtable: Get Approved Drafts (where `sendDate <= now`)
3. Loop: For Each Draft
4. Gmail: Send Email
5. Airtable: Update Draft Status to "Sent"
6. Airtable: Update Outbox Record

**Filename:** `n8n-scheduled-sender-workflow.png`

---

## Airtable Schema Screenshots

### **Screenshot 1: Prospects Table**

**What to capture:**
- Table view with all fields visible
- Sample data (5-10 rows)
- Field types visible

**Fields to show:**
- `email` (Email)
- `company` (Single line text)
- `note` (Long text)
- `status` (Single select: New, Sent, Replied, Closed)
- `lastContacted` (Date)

**Filename:** `airtable-prospects-table.png`

---

### **Screenshot 2: Outbox Table**

**What to capture:**
- Table view with all fields visible
- Sample data showing email thread progression

**Fields to show:**
- `prospectEmail` (Link to Prospects)
- `subject` (Single line text)
- `body` (Long text, collapsed)
- `sentAt` (Date)
- `stage` (Single select: Initial, FU#1, FU#2, FU#3)
- `status` (Single select: Sent, Replied, Closed)

**Filename:** `airtable-outbox-table.png`

---

### **Screenshot 3: FollowupQueue Table**

**What to capture:**
- Table view with all fields visible
- Sample data showing pending/approved/sent statuses

**Fields to show:**
- `prospectEmail` (Link to Prospects)
- `followupNumber` (Number: 1, 2, 3)
- `draftSubject` (Single line text)
- `draftBody` (Long text, collapsed)
- `dueDate` (Date)
- `status` (Single select: Pending Review, Approved, Sent, Skipped)
- `generatedAt` (Date)

**Filename:** `airtable-followupqueue-table.png`

---

## Pawgrammer Collaboration Examples

### **Screenshot: Pawgrammer Terminal Session**

**What to capture:**
- Terminal with Pawgrammer prompt visible
- Example of asking Pawgrammer to build a feature
- Pawgrammer's response with code generation

**Example prompt to show:**
```
User: "Build a prospects tab with a table showing email, company, status.
Add a 'Generate Draft' button that calls n8n, shows a modal to review
the draft, and removes the prospect from view after sending."

Pawgrammer: "I'll create the Prospects tab for you. Let me break this down:

1. ProspectsTab component with data table
2. Draft generation modal
3. n8n webhook integration
4. Optimistic UI update after send

Creating files:
✓ src/renderer/components/ProspectsTab.tsx
✓ src/renderer/components/DraftModal.tsx
✓ src/renderer/api/prospects.ts
✓ src/shared/types/prospect.ts

[Code output...]"
```

**Filename:** `pawgrammer-example-session.png`

---

## Video/GIF Capture Ideas

### **GIF 1: Draft Generation Flow (10 seconds)**
1. Show Prospects tab
2. Click "Generate Draft" on a prospect
3. Modal appears with AI-generated email
4. Click "Send Email"
5. Prospect disappears (optimistic update)
6. Success toast appears

---

### **GIF 2: Follow-up Batch Review (15 seconds)**
1. Show Follow-ups tab → Pending Review
2. Click "Due Today" stat (filter activates)
3. Click "View Thread" on a prospect
4. Thread modal shows all 3 follow-ups
5. Click "Approve" on FU#1
6. Click "Skip" on FU#3
7. Modal closes, table updates

---

### **GIF 3: Email Thread View (10 seconds)**
1. Show Follow-ups tab → Sent Emails
2. Click "View Thread" on a prospect
3. Thread modal shows conversation history
4. Scroll through Initial → FU#1 → FU#2
5. Close modal

---

## Print Assets

### **One-Pager: System Overview**

**Sections:**
1. **Header:** "GTM Operations Console: From 30 Minutes to 5 Minutes"
2. **The Stack:** Visual with Electron + n8n + Airtable logos
3. **Key Features:** Prospects Tab + Follow-ups Tab descriptions
4. **Results:** Big numbers (83% time savings, 60% cost reduction)
5. **Architecture:** Simplified 3-tier diagram
6. **CTA:** Link to full blog post

**Format:** Single-page PDF, print-friendly, black & white compatible

---

## Asset Checklist

Before publishing the blog post, ensure you have:

- [ ] 5+ high-quality console screenshots
- [ ] 3-tier architecture diagram
- [ ] Email sending flow diagram
- [ ] Before/After comparison graphic
- [ ] Time savings chart/visualization
- [ ] API optimization chart
- [ ] 2-3 n8n workflow screenshots
- [ ] 2-3 Airtable schema screenshots
- [ ] 1-2 code snippets (formatted with syntax highlighting)
- [ ] (Optional) Pawgrammer session screenshot
- [ ] (Optional) 1-2 GIFs showing key workflows

---

## Technical Specifications for Screenshots

**Resolution:**
- Minimum: 1920x1080 (Full HD)
- Recommended: 2560x1440 (2K) for retina displays

**Format:**
- PNG (for UI screenshots - lossless)
- JPEG (for photos/graphics - compressed)
- GIF (for short animations, < 5MB)

**Compression:**
- Use TinyPNG or Squoosh.app to compress
- Target: < 500KB per image
- Maintain visual clarity

**Annotations:**
- Use red arrows/boxes to highlight key elements
- Keep annotations minimal
- Use system font for consistency
- Tools: Skitch, CloudApp, or built-in macOS screenshots

---

*Use this guide to create all visual assets for your blog post. Prioritize HIGH priority screenshots first, then add others as needed.*