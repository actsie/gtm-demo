# Building a GTM Operations Console with Pawgrammer, n8n & Airtable: A Builder's Journey

**TL;DR**: I built a desktop GTM operations console that automates cold outreach and follow-up sequences using Electron + n8n + Airtable. The result? 83% time savings per prospect, 60% reduction in API costs, and zero missed follow-ups. Here's how I did it, what I learned, and how you can build something similar.

---

## The "Aha" Moment

I was watching my GTM team drown in tabs. Gmail. Sheets. Airtable. Notion. Calendar. CRM. Every single cold email meant switching between 5-7 different applications. Copy email template from Notion. Paste into Gmail. Personalize. Check prospect status in Airtable. Set follow-up reminder in Calendar. Update tracking spreadsheet.

**30-45 minutes per prospect.** Not to write the email—that took 5 minutes. The other 25-40 minutes? Pure context switching and manual data entry.

And the follow-ups? We were missing 20-30% of them. Not because we didn't care, but because manual tracking doesn't scale. You forget. You get busy. You lose the thread.

That's when I thought: *What if I could build a single application that centralized everything?*

Not a Zapier integration. Not another SaaS tool that solves 80% of the problem. A custom-built console that worked exactly how we worked.

So I built it. Using Pawgrammer (AI coding assistant), n8n (workflow automation), and Airtable (database). In a few weeks, we went from spreadsheet chaos to a streamlined command center.

This is that story.

---

## Choosing the Stack: Why Electron + n8n + Airtable?

I had three core requirements:

1. **Desktop app** (not web) - I needed secure credential storage and the ability to call arbitrary webhooks without CORS restrictions
2. **Workflow flexibility** - Business logic needed to be visual, modifiable, and not buried in code
3. **Instant database setup** - No PostgreSQL migrations or schema management

Here's what I landed on:

### **Tier 1: Electron (Desktop App)**
- Built with React + TypeScript + Tailwind CSS
- Handles all UI/UX and user interactions
- Uses `electron-store` for local settings and `keytar` for secure credential storage
- Communicates with n8n via IPC (Inter-Process Communication)

**Why Electron?**
- Secure keychain integration (macOS Keychain, Windows Credential Manager)
- No browser restrictions (CORS, CSP)
- Better for internal tools that need file system access
- Users can install once and always have it in their dock

### **Tier 2: n8n (Workflow Automation Backend)**
- Receives webhook calls from the console
- Orchestrates business logic: searches Reddit, generates AI drafts, sends emails, creates follow-ups
- Interacts with Airtable to read/write data
- Calls external APIs (Claude/GPT for content, Gmail for sending)

**Why n8n?**
- Visual workflow builder (non-technical teammates can modify logic)
- Hundreds of pre-built integrations
- Self-hostable (no vendor lock-in)
- Easy to add new features without touching frontend code

### **Tier 3: Airtable (Database)**
- Stores all data: prospects, sent emails, follow-up drafts
- Provides UI for manual edits when needed
- Returns clickable links back to records

**Why Airtable?**
- Zero schema setup (just create tables and fields in UI)
- Built-in views for manual review
- API generates automatically
- Non-technical users can access/edit data directly

**The architecture is intentionally decoupled:** The console is a "dumb UI" that delegates all business logic to n8n and all data storage to Airtable. This means I can change email providers, add features, or modify workflows without touching the console code.

---

## The Build: Using Pawgrammer to Accelerate Development

Here's where Pawgrammer came in.

Pawgrammer is an AI coding assistant (Claude-powered) that runs inside your terminal. You describe what you want, and it writes the code, explains decisions, and can even debug when things break.

### **What Pawgrammer Built for Me:**

**1. The Electron Scaffold**
- Set up the Electron app structure with main/renderer process separation
- Configured TypeScript, React, Tailwind, and build tooling (Webpack)
- Implemented IPC bridge for secure communication between frontend and backend
- Added context isolation and security best practices

**Command:** "Set up an Electron app with React, TypeScript, and Tailwind. Use IPC for all external API calls. Store secrets in OS keychain."

**Result:** 20+ files scaffolded in 5 minutes. Would have taken me hours.

**2. The Prospects Tab**
- Built the data table with status tracking
- Created the draft generation modal with subject/body editing
- Implemented optimistic UI updates (prospects disappear immediately after send)
- Added 5-minute intelligent caching layer

**Command:** "Build a prospects management tab with a table showing email, company, status. Add a 'Generate Draft' button that calls n8n, shows a modal to review the draft, and removes the prospect from view after sending."

**Result:** Pawgrammer created the table component, modal, webhook integration, and caching logic. I just tweaked the styling.

**3. The Follow-ups Tab**
- Built the two sub-tab structure (Pending Review + Sent Emails)
- Created the interactive stats dashboard with filtering
- Implemented thread view to see all 3 follow-ups at once
- Added approve/skip/regenerate actions with optimistic updates

**Command:** "Create a follow-ups tab with two sub-tabs. First sub-tab shows pending follow-up drafts with urgency filters. Second sub-tab shows sent emails with full thread view. Add approve and skip actions."

**Result:** Pawgrammer built the entire feature with proper state management, API integration, and error handling.

**4. The Optimization Layer**
- Implemented request deduplication (prevents duplicate in-flight calls)
- Added debounced filters (500ms delay before API calls)
- Created cache invalidation logic (clear cache on mutations)
- Built the "Recent Runs" side panel for debugging

**Command:** "Optimize API calls by adding 5-minute caching, request deduplication, and debounced filters. Create a debug panel showing recent API calls."

**Result:** API usage dropped from 1,264 calls/month to ~600 calls/month (60% reduction).

### **What I Learned About Working with AI:**

**✅ Be specific about requirements:**
- Bad: "Make it look nice"
- Good: "Use Tailwind card components with shadow-lg, add loading spinners, and use blue-500 for primary actions"

**✅ Break complex features into steps:**
- Instead of "Build the entire follow-ups system," I said:
  - "Create the tab structure with two sub-tabs"
  - "Add the stats dashboard with filtering"
  - "Implement thread view modal"
  - "Add approve/skip actions"

**✅ Let AI handle boilerplate, you handle business logic:**
- Pawgrammer scaffolded components and wired up APIs
- I defined the n8n workflows and Airtable schema

**✅ Review everything:**
- AI writes good code, but you still need to understand it
- I caught several edge cases Pawgrammer missed (like handling empty states)

---

## Building the n8n Workflows: The Brain of the Operation

While Pawgrammer built the UI, I built the n8n workflows that power everything.

### **Core Workflows Created:**

**1. Cold Email Draft Generator**
- **Trigger:** Webhook from console (`/webhook/cold-email?mode=draft`)
- **Steps:**
  1. Receive prospect data (email, company, note)
  2. Call Claude API with prompt template
  3. Parse response (subject + body)
  4. Return JSON to console
- **Output:** `{ subject: "...", body: "..." }`

**2. Cold Email Sender + Follow-up Queue**
- **Trigger:** Webhook from console (`/webhook/cold-email?mode=send`)
- **Steps:**
  1. Check Airtable for duplicates (prevent double-sends)
  2. Send email via Gmail
  3. Create record in `Outbox` table
  4. Generate 3 follow-up drafts using AI
  5. Create 3 records in `FollowupQueue` table with due dates (Day 3, 7, 14)
  6. Return Airtable link
- **Output:** `{ success: true, outboxUrl: "..." }`

**3. Follow-up Draft Reviewer**
- **Trigger:** Webhook from console (`/webhook/followup-review`)
- **Steps:**
  1. Fetch all follow-up drafts from Airtable
  2. Filter by status (pending review, approved, sent)
  3. Calculate urgency (overdue, due today)
  4. Return sorted list
- **Output:** Array of drafts with metadata

**4. Follow-up Approval Handler**
- **Trigger:** Webhook from console (`/webhook/followup-approve`)
- **Steps:**
  1. Update draft status to "approved"
  2. Set send date based on due date
  3. Return success
- **Output:** `{ success: true }`

**5. Follow-up Sender (Scheduled)**
- **Trigger:** Cron (runs every hour)
- **Steps:**
  1. Query Airtable for approved drafts where `sendDate <= now`
  2. For each draft:
     - Send email via Gmail
     - Update `Outbox` record
     - Mark draft as sent
     - Create next follow-up if needed (FU#1 → FU#2 → FU#3)
- **Output:** Background automation

### **The Airtable Schema:**

**Prospects Table:**
- `email` (email field)
- `company` (single line text)
- `note` (long text)
- `status` (single select: New, Sent, Replied, Closed)
- `lastContacted` (date)

**Outbox Table:**
- `prospectEmail` (linked to Prospects)
- `subject` (single line text)
- `body` (long text)
- `sentAt` (date/time)
- `stage` (single select: Initial, FU#1, FU#2, FU#3)
- `status` (single select: Sent, Replied, Closed)

**FollowupQueue Table:**
- `prospectEmail` (linked to Prospects)
- `followupNumber` (number: 1, 2, 3)
- `draftSubject` (single line text)
- `draftBody` (long text)
- `dueDate` (date)
- `status` (single select: Pending Review, Approved, Sent, Skipped)
- `generatedAt` (date/time)

---

## The Features: What the Console Does

### **Feature 1: Prospects Tab (The Outreach Command Center)**

**The Problem:** Managing cold outreach across spreadsheets and email clients.

**The Solution:** A unified dashboard where you can:
- See all prospects in one table with status tracking
- Click "Generate Draft" to get a personalized AI email in seconds
- Review/edit the draft in a modal
- Send with one click
- Watch the prospect disappear (optimistic UI)
- Know that 3 follow-up drafts were auto-created

**The Workflow:**
1. Open Prospects tab → see all new leads
2. Click "Generate Draft" → AI creates personalized email
3. Review, edit if needed, click "Send"
4. Prospect disappears from view
5. Three follow-up drafts queue for review

**Time per prospect:** 30-45 minutes → **5 minutes** (83% reduction)

### **Feature 2: Follow-ups Tab (Never Miss a Touch Point)**

**The Problem:** Missing 20-30% of follow-ups due to manual tracking.

**The Solution:** Automated follow-up sequencing with batch review workflow.

**Two Sub-tabs:**

**A. Pending Review:**
- View all auto-generated follow-up drafts awaiting approval
- Interactive stats dashboard (All Drafts, Pending Review, Approved & Ready, Due Today, Overdue)
- Stats act as clickable filters
- Thread view: See all 3 follow-ups for a prospect at once
- Actions: Approve, Skip, Regenerate

**B. Sent Emails:**
- View all sent emails with follow-up status
- Filter by stage (Initial, FU#1, FU#2, FU#3, Replied, Closed)
- Email thread modal showing full conversation history
- Manual actions: Mark as Replied, Mark as Closed, Send Now

**The Workflow:**
1. Check "Pending Review" tab → see 5 drafts due today
2. Click prospect → see all 3 follow-ups in thread view
3. Approve FU#1, regenerate FU#2, skip FU#3
4. Approved drafts send on schedule automatically

**Time per follow-up:** 15-20 minutes → **2 minutes** (90% reduction)

---

## The Optimization Story: 60% API Cost Reduction

Initially, the console was making 1,264 API calls per month. Every tab switch, every filter change, every refresh triggered a new Airtable query.

That's expensive (Airtable charges per 1,000 API calls) and slow.

So I built an optimization layer:

### **1. 5-Minute Intelligent Caching**
```typescript
// Cache structure: { [cacheKey]: { data, timestamp } }
// Keys include filter params: 'prospects-list', 'followups-list-all-sent'
// TTL: 300,000ms (5 minutes)
// Invalidation: On mutations (sends, approvals, edits)
```

**Result:** Switching between tabs doesn't trigger redundant API calls. Data stays fresh but calls are minimized.

### **2. Request Deduplication**
```typescript
// Track in-flight requests by cache key
// If same request is already running, return existing promise
// Prevents double-clicks from making duplicate calls
```

**Result:** If you click refresh twice quickly, only one API call fires.

### **3. Debounced Filters**
```typescript
// 500ms delay before filter changes trigger API calls
// Clear existing timer on each filter change
// Only fire API call after user stops clicking
```

**Result:** Rapid filter switching doesn't hammer the API. You can click through 10 filters and only 1 API call fires.

### **4. Optimistic UI Updates**
```typescript
// Update local state immediately
// Fire API call in background
// If failure, roll back + show error
```

**Result:** Actions feel instant. No waiting for full list refreshes.

**Total Impact:** API usage dropped from 1,264 calls/month to ~600 calls/month—a **60% reduction** while maintaining real-time data freshness.

---

## Lessons Learned: What Worked, What Didn't

### **What Worked:**

**✅ Decoupled architecture**
- Separating UI (Electron) from logic (n8n) from data (Airtable) made everything flexible
- I changed email providers twice without touching the console
- Added new features by just creating new n8n workflows

**✅ Optimistic UI from the start**
- Makes the app feel instant
- Hugely improves UX
- Small code addition, big perceived impact

**✅ Using Pawgrammer for boilerplate**
- Scaffolding, components, TypeScript types, error handling
- Saved dozens of hours
- Let me focus on business logic and workflows

**✅ Airtable as the database**
- Zero schema migrations
- Non-technical users can edit data directly
- Built-in UI for manual overrides

**✅ Building for real users (my team)**
- Instant feedback loop
- Caught edge cases immediately
- Knew exactly what features mattered

### **What Didn't Work:**

**❌ Initial approach: Too many features**
- I tried to build Leads + Reply Drafts + Prospects + Follow-ups all at once
- Got overwhelmed
- **Fix:** Built Prospects tab first, validated it worked, then added Follow-ups

**❌ No caching initially**
- App felt slow
- API costs were high
- **Fix:** Added caching layer after seeing the usage stats

**❌ Complex n8n workflows**
- My first "Send Email" workflow had 30+ nodes
- Hard to debug
- **Fix:** Split into smaller, focused workflows

**❌ Not handling edge cases**
- What if prospect has no email? What if AI generates malformed JSON?
- App crashed
- **Fix:** Added validation and error handling to every API call

### **What I'd Do Differently:**

**1. Start with an MVP**
- Build just one feature end-to-end
- Validate it works
- Add more features incrementally

**2. Design the data schema first**
- I kept adding Airtable fields as I went
- Ended up with some redundant columns
- **Better:** Plan schema upfront based on workflows

**3. Add analytics from day one**
- I didn't know API costs were high until week 3
- **Better:** Track API calls, performance metrics, error rates from the start

**4. Write tests for critical paths**
- I manually tested everything
- Caught bugs in production
- **Better:** Write tests for send email, approve follow-up, etc.

---

## The Results: Time, Money, and Sanity Recovered

### **Quantifiable Gains:**

**Time savings:**
- Per prospect: 30-45 minutes → 5 minutes (83% reduction)
- Per follow-up: 15-20 minutes → 2 minutes (90% reduction)
- Daily time saved: 2-3 hours for teams managing 20+ prospects

**Cost savings:**
- API costs: 60% reduction through intelligent caching
- Tool consolidation: Eliminated 3-4 separate tools (email tracking, spreadsheet, calendar)

**Process improvements:**
- Zero missed follow-ups (was 20-30% miss rate)
- Batch efficiency: Review 10 follow-ups in time it took to write 1
- Full visibility: Entire team sees pipeline status in real-time

### **Qualitative Transformation:**

**Before:**
- "Where did I put that prospect's info?"
- "Did I send FU#2 or is that due tomorrow?"
- "I need to check three tools to know the status"
- "I forgot to follow up and now it's been 3 weeks"

**After:**
- "Everything I need is in one view"
- "The system tells me exactly what's due today"
- "I can see the entire conversation instantly"
- "Follow-ups happen automatically—I just review and approve"

---

## How You Can Build This (or Customize It)

If you want to build something similar for your workflows, here's the blueprint:

### **Step 1: Define Your Workflow**
- What's the manual process you're trying to automate?
- What are the key steps? (e.g., find lead → draft email → send → follow up)
- What data do you need to track? (e.g., prospect email, status, sent date)

### **Step 2: Set Up Airtable**
- Create tables for your data (e.g., Prospects, Outbox, FollowupQueue)
- Add fields based on your workflow
- Create views for different states (e.g., "Needs Follow-up", "Replied")

### **Step 3: Build n8n Workflows**
- Install n8n (self-hosted or cloud)
- Create workflows for each action:
  - Draft generator (webhook → AI API → return)
  - Sender (webhook → email API → Airtable)
  - Scheduled job (cron → query Airtable → send emails)
- Test each workflow independently

### **Step 4: Build the Console UI**
- Use Pawgrammer to scaffold the Electron app
- Create tabs for each workflow stage
- Add forms/tables/modals for user interactions
- Wire up webhooks to call n8n

### **Step 5: Add Optimizations**
- Implement caching (5-min TTL works well)
- Add optimistic UI updates
- Debounce filters and searches
- Track API usage to identify bottlenecks

### **Step 6: Iterate with Real Users**
- Deploy to your team
- Gather feedback
- Add features based on actual usage
- Optimize the slowest parts

### **Tech Stack Alternatives:**

If you don't want to use Electron + n8n + Airtable:

- **Instead of Electron:** Build a web app with Next.js + Vercel
- **Instead of n8n:** Use Make.com, Zapier, or custom Node.js API
- **Instead of Airtable:** Use Supabase, Google Sheets, or Notion databases

The principles remain the same: **decouple UI from logic from data**.

---

## The Takeaway: Automation as a Competitive Advantage

Most teams lose not because of bad product-market fit, but because of broken operations. They miss follow-ups. They take too long to respond. They lose context between touchpoints.

This GTM console transformed operations from a manual bottleneck into an automated competitive advantage. When your team can manage 3x more prospects in the same time, never miss a follow-up, and maintain perfect context, you win more deals.

**The formula:**
- **Centralize** → eliminate tool sprawl
- **Automate** → remove manual busywork
- **Optimize** → reduce costs while maintaining speed
- **Systematize** → ensure nothing falls through the cracks

With Pawgrammer, n8n, and Airtable, you can build this in weeks, not months. You don't need to be a full-time developer. You just need to understand your workflow and be willing to iterate.

Build the tools that work exactly how you work. That's the advantage.

---

## Resources

**Tech Stack:**
- [Pawgrammer](https://pawgrammer.com) - AI coding assistant
- [n8n](https://n8n.io) - Workflow automation platform
- [Airtable](https://airtable.com) - No-code database
- [Electron](https://electronjs.org) - Desktop app framework

**Want to Build Your Own?**
- Check out the [n8n template library](https://n8n.io/workflows) for workflow inspiration
- Read the [Electron security guide](https://electronjs.org/docs/tutorial/security)
- Join the [n8n community forum](https://community.n8n.io)

**Questions?** Drop a comment or reach out. Happy to share more details about the workflows, architecture, or Pawgrammer process.

---

*Built with Pawgrammer, powered by n8n and Airtable, running on Electron.*