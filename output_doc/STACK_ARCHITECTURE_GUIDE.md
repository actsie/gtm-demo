# GTM Operations Console - Stack Architecture & Workflow Guide

**A comprehensive guide to understanding how everything works together**

---

## Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Layers](#architecture-layers)
4. [Data Flow & Workflow](#data-flow--workflow)
5. [How Components Communicate](#how-components-communicate)
6. [Security Model](#security-model)
7. [Development Workflow](#development-workflow)

---

## High-Level Overview

### What Is This Application?

The GTM Ops Console is a **desktop application** that serves as a control center for go-to-market (GTM) operations. Think of it as a dashboard that:

1. **Manages prospects** - Track people/companies you're reaching out to
2. **Generates AI content** - Create email drafts, social media replies
3. **Automates follow-ups** - Send timed follow-up emails automatically
4. **Tracks conversations** - Monitor replies and engagement

### The Big Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                     GTM Operations Console                      │
│                    (Desktop App - Electron)                     │
│                                                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  │
│  │ Prospects │  │ Follow-Ups│  │  Drafts   │  │   Email   │  │
│  │    Tab    │  │    Tab    │  │    Tab    │  │    Tab    │  │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP Webhooks
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                      n8n Workflows                              │
│                  (Automation Engine)                            │
│                                                                 │
│  • Generate AI content (Claude)                                │
│  • Send emails (Gmail)                                         │
│  • Check for replies                                           │
│  • Schedule follow-ups                                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ REST API
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                       Airtable                                  │
│                   (Database Layer)                              │
│                                                                 │
│  • Outbox table (sent emails)                                  │
│  • Prospects (contacts)                                        │
│  • FollowupTemplates (AI prompts)                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend Layer (What Users See)

```
┌─────────────────────────────────────────────────────────────┐
│                      React + TypeScript                     │
│                                                             │
│  Component Library:                                         │
│  • Radix UI (headless components)                          │
│  • shadcn/ui pattern (customizable UI)                     │
│                                                             │
│  Styling:                                                   │
│  • Tailwind CSS (utility-first CSS)                        │
│  • CSS variables for theming                               │
│                                                             │
│  State Management:                                          │
│  • Zustand (lightweight state store)                       │
│  • Local component state (React hooks)                     │
│                                                             │
│  Build Tool:                                                │
│  • Vite (fast development server)                          │
│  • TypeScript compiler                                     │
└─────────────────────────────────────────────────────────────┘
```

**Why These Choices?**
- **React**: Industry standard, component-based architecture
- **TypeScript**: Type safety prevents bugs, better IDE support
- **Tailwind CSS**: Rapid UI development, consistent design
- **Zustand**: Simple state management without Redux complexity
- **Vite**: 10-100x faster than Webpack during development

### Backend Layer (Desktop App Runtime)

```
┌─────────────────────────────────────────────────────────────┐
│                      Electron                               │
│                                                             │
│  Main Process (Node.js):                                    │
│  • IPC (Inter-Process Communication)                       │
│  • Network requests (fetch API)                            │
│  • Secure storage (keytar)                                 │
│  • File system access                                      │
│  • System integration                                      │
│                                                             │
│  Renderer Process (Browser):                                │
│  • React application                                       │
│  • Sandboxed environment                                   │
│  • No direct Node.js access                                │
└─────────────────────────────────────────────────────────────┘
```

**Why Electron?**
- Cross-platform (Mac, Windows, Linux) from one codebase
- Secure credential storage via OS keychain
- Native desktop features (notifications, file dialogs)
- Offline-capable

### External Services

```
┌────────────────┐
│  Airtable API  │ ← Database for all data
└────────────────┘
        ↕
┌────────────────┐
│  n8n Webhooks  │ ← Automation & AI workflows
└────────────────┘
        ↕
┌────────────────┐
│  Gmail API     │ ← Send/receive emails
└────────────────┘
        ↕
┌────────────────┐
│  Claude API    │ ← AI content generation
└────────────────┘
```

---

## Architecture Layers

### 1. Presentation Layer (UI)

**Location:** `src/renderer/`

```
src/renderer/
├── App.tsx                    # Main app shell, tab navigation
├── main.tsx                   # React app entry point
├── store.ts                   # Global state (Zustand)
├── components/
│   ├── ProspectsTab.tsx      # Prospects list & filtering
│   ├── FollowUpsTab.tsx      # Follow-up management
│   ├── DraftsTab.tsx         # Social media drafts
│   ├── EmailTab.tsx          # Send cold emails
│   ├── SettingsModal.tsx     # App configuration
│   ├── EmailThreadModal.tsx  # View email conversations
│   ├── DraftReviewModal.tsx  # Review/edit AI drafts
│   └── ErrorDisplay.tsx      # User-friendly errors
└── lib/
    └── utils.ts               # Utility functions
```

**Responsibilities:**
- Render UI components
- Handle user interactions
- Display data from state
- Call IPC methods to trigger backend actions

### 2. Application Layer (Electron Main Process)

**Location:** `src/main/`

```
src/main/
├── main.ts          # Electron app lifecycle, window management
├── network.ts       # HTTP requests to n8n webhooks
└── ipc.ts           # (if exists) IPC handlers
```

**Responsibilities:**
- Create/manage application window
- Handle IPC calls from renderer
- Make secure HTTP requests
- Store/retrieve secrets from OS keychain
- Manage app settings

### 3. Shared Layer

**Location:** `src/shared/`

```
src/shared/
└── types.ts         # TypeScript interfaces shared between
                      # main and renderer processes
```

**Key Types:**
```typescript
interface Prospect {
  id: string;
  company: string;
  email: string;
  status: 'pending' | 'contacted' | 'replied';
  // ... more fields
}

interface FollowUp {
  id: string;
  parentEmailId: string;
  stage: 'initial' | 'follow_up_1' | 'follow_up_2' | 'follow_up_3';
  sentAt: string;
  repliedAt?: string;
  // ... more fields
}
```

### 4. Automation Layer (n8n)

**Not in this codebase - separate n8n instance**

n8n workflows handle:
- AI prompt execution (Claude API)
- Email sending (Gmail API)
- Reply detection
- Scheduled follow-up triggers
- Data transformations

### 5. Data Layer (Airtable)

**Three main tables:**

```
┌─────────────────────────────────────────────────────────┐
│                      Outbox Table                       │
├─────────────────────────────────────────────────────────┤
│ Fields:                                                 │
│  • email, company, subject, body                       │
│  • status (sent, replied, closed)                      │
│  • sent_at, replied_at                                 │
│  • follow_up_stage, follow_up_count                    │
│  • parent_email_id (self-referencing link)             │
│  • reply_body, reply_snippet                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   FollowupTemplates                     │
├─────────────────────────────────────────────────────────┤
│ Fields:                                                 │
│  • name (e.g., "Follow-up 1 (Day 3)")                  │
│  • stage (follow_up_1, follow_up_2, follow_up_3)       │
│  • days_after (3, 7, 14)                               │
│  • template_prompt (AI instructions)                   │
│  • active (boolean)                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    Prospects Table                      │
├─────────────────────────────────────────────────────────┤
│ Fields:                                                 │
│  • company, email, status                              │
│  • notes, tags                                         │
│  • created_at, updated_at                              │
└─────────────────────────────────────────────────────────┘
```

---

## Data Flow & Workflow

### Example 1: Sending a Cold Email

```
┌──────────────┐
│ User clicks  │
│ "Send Email" │
│ button       │
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────────────────────────┐
│ 1. RENDERER PROCESS (React)                          │
│                                                      │
│  EmailTab.tsx:                                       │
│    const handleSend = () => {                        │
│      window.api.callWebhook('send-email', {          │
│        email: 'john@example.com',                    │
│        company: 'Acme Corp',                         │
│        notes: 'Interested in our product'            │
│      })                                              │
│    }                                                 │
└──────┬───────────────────────────────────────────────┘
       │
       │ IPC Call via preload script
       ↓
┌──────────────────────────────────────────────────────┐
│ 2. MAIN PROCESS (Electron/Node.js)                   │
│                                                      │
│  main.ts:                                            │
│    ipcMain.handle('call-webhook', async (e, data) => │
│      const secret = await keytar.getPassword(...)    │
│      return fetch('https://n8n.../webhook/...', {    │
│        headers: { 'x-webhook-secret': secret },      │
│        body: JSON.stringify(data)                    │
│      })                                              │
│    })                                                │
└──────┬───────────────────────────────────────────────┘
       │
       │ HTTPS Request
       ↓
┌──────────────────────────────────────────────────────┐
│ 3. N8N WORKFLOW                                      │
│                                                      │
│  Nodes:                                              │
│  ① Webhook Trigger                                   │
│  ② Validate secret                                   │
│  ③ Fetch prospect data from Airtable                 │
│  ④ Call Claude API to generate email                 │
│  ⑤ Send via Gmail API                                │
│  ⑥ Create Outbox record in Airtable                  │
│  ⑦ Return success response                           │
└──────┬───────────────────────────────────────────────┘
       │
       │ Stores data
       ↓
┌──────────────────────────────────────────────────────┐
│ 4. AIRTABLE                                          │
│                                                      │
│  New record in Outbox table:                         │
│    {                                                 │
│      email: 'john@example.com',                      │
│      company: 'Acme Corp',                           │
│      subject: 'Quick question about...',             │
│      body: '<email content>',                        │
│      status: 'sent',                                 │
│      sent_at: '2024-11-13T10:30:00Z',                │
│      follow_up_stage: 'initial',                     │
│      follow_up_count: 0                              │
│    }                                                 │
└──────┬───────────────────────────────────────────────┘
       │
       │ Response
       ↓
┌──────────────────────────────────────────────────────┐
│ 5. BACK TO RENDERER                                  │
│                                                      │
│  Success toast notification appears                  │
│  Email appears in "Recent Runs" list                 │
│  Follow-ups tab will show it in 3 days              │
└──────────────────────────────────────────────────────┘
```

### Example 2: Automated Follow-Up (Scheduled)

```
┌──────────────────────────────────────────────────────┐
│ N8N SCHEDULE TRIGGER (runs every hour)              │
└──────┬───────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────┐
│ 1. QUERY AIRTABLE                                    │
│                                                      │
│  Find records where:                                 │
│  • status = 'sent'                                   │
│  • follow_up_stage = 'initial'                       │
│  • replied_at is empty                               │
│  • sent_at was 3 days ago                            │
└──────┬───────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────┐
│ 2. FETCH TEMPLATE                                    │
│                                                      │
│  Get FollowupTemplates record where:                 │
│  • stage = 'follow_up_1'                             │
│  • active = true                                     │
│                                                      │
│  Returns template_prompt:                            │
│  "Write a brief follow-up checking if they saw..."   │
└──────┬───────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────┐
│ 3. GENERATE EMAIL WITH AI                            │
│                                                      │
│  Call Claude API with:                               │
│  • Template prompt                                   │
│  • Original email context                            │
│  • Company name                                      │
│                                                      │
│  Returns:                                            │
│  {                                                   │
│    "subject": "Re: Quick question...",               │
│    "body": "Hi John, just following up..."           │
│  }                                                   │
└──────┬───────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────┐
│ 4. SEND EMAIL                                        │
│                                                      │
│  Gmail API sends email                               │
│  • To: john@example.com                              │
│  • Subject: Re: Quick question...                    │
│  • Body: AI-generated follow-up                      │
│  • In-Reply-To: <original-message-id>                │
└──────┬───────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────┐
│ 5. UPDATE AIRTABLE                                   │
│                                                      │
│  Create NEW Outbox record (the follow-up):           │
│    {                                                 │
│      parent_email_id: [link to original],            │
│      follow_up_stage: 'follow_up_1',                 │
│      status: 'sent'                                  │
│    }                                                 │
│                                                      │
│  Update ORIGINAL record:                             │
│    {                                                 │
│      follow_up_count: 1,                             │
│      last_followup_sent: NOW()                       │
│    }                                                 │
└──────────────────────────────────────────────────────┘
```

### Example 3: Reply Detection

```
┌──────────────────────────────────────────────────────┐
│ N8N SCHEDULE TRIGGER (runs every 4 hours)           │
└──────┬───────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────┐
│ 1. QUERY AIRTABLE                                    │
│                                                      │
│  Find records where:                                 │
│  • status = 'sent'                                   │
│  • follow_up_stage != 'replied'                      │
│  • sent_at < 30 days ago                             │
└──────┬───────────────────────────────────────────────┘
       │
       ↓ (for each record)
┌──────────────────────────────────────────────────────┐
│ 2. SEARCH GMAIL                                      │
│                                                      │
│  Query: from:john@example.com after:2024-11-10       │
│                                                      │
│  If reply found:                                     │
│  • Extract reply body                                │
│  • Extract timestamp                                 │
└──────┬───────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────┐
│ 3. UPDATE AIRTABLE                                   │
│                                                      │
│  Update Outbox record:                               │
│    {                                                 │
│      follow_up_stage: 'replied',                     │
│      replied_at: '2024-11-13T14:20:00Z',             │
│      reply_body: '<full reply text>',                │
│      reply_snippet: 'Thanks for reaching out...',    │
│      last_reply_checked: NOW()                       │
│    }                                                 │
└──────┬───────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────┐
│ 4. USER SEES UPDATE                                  │
│                                                      │
│  Next time user opens Follow-ups tab:                │
│  • Status badge turns green ("Replied")              │
│  • No more follow-ups scheduled                      │
│  • Can click to view reply thread                    │
└──────────────────────────────────────────────────────┘
```

---

## How Components Communicate

### IPC (Inter-Process Communication)

Electron apps have strict security boundaries. The renderer (React) cannot directly access Node.js APIs.

**Communication flow:**

```
RENDERER PROCESS                MAIN PROCESS
(React/Browser)                 (Node.js)
    │                               │
    │  window.api.callWebhook()     │
    ├──────────────────────────────>│
    │      IPC message              │
    │                               │
    │                               │  Execute:
    │                               │  • Network request
    │                               │  • File system access
    │                               │  • Keychain lookup
    │                               │
    │      Response data            │
    │<──────────────────────────────┤
    │                               │
```

**Implementation (simplified):**

```typescript
// src/main/main.ts (Main Process)
ipcMain.handle('call-webhook', async (event, endpoint, data) => {
  const secret = await keytar.getPassword('gtm-console', 'webhook-secret')
  const baseUrl = store.get('n8nBaseUrl')

  const response = await fetch(`${baseUrl}/webhook/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': secret
    },
    body: JSON.stringify(data)
  })

  return response.json()
})

// src/renderer/components/EmailTab.tsx (Renderer)
const sendEmail = async () => {
  try {
    const result = await window.api.callWebhook('send-email', {
      email: formData.email,
      company: formData.company
    })

    showSuccessToast(result.message)
  } catch (error) {
    showErrorToast(error.message)
  }
}
```

### State Management (Zustand)

```typescript
// src/renderer/store.ts
import create from 'zustand'

interface AppState {
  prospects: Prospect[]
  followUps: FollowUp[]
  isLoading: boolean

  // Actions
  setProspects: (prospects: Prospect[]) => void
  addProspect: (prospect: Prospect) => void
  updateFollowUp: (id: string, updates: Partial<FollowUp>) => void
}

export const useStore = create<AppState>((set) => ({
  prospects: [],
  followUps: [],
  isLoading: false,

  setProspects: (prospects) => set({ prospects }),

  addProspect: (prospect) =>
    set((state) => ({
      prospects: [...state.prospects, prospect]
    })),

  updateFollowUp: (id, updates) =>
    set((state) => ({
      followUps: state.followUps.map(fu =>
        fu.id === id ? { ...fu, ...updates } : fu
      )
    }))
}))

// Usage in component
function ProspectsTab() {
  const { prospects, addProspect } = useStore()

  return (
    <div>
      {prospects.map(p => <ProspectCard key={p.id} prospect={p} />)}
      <button onClick={() => addProspect(newProspect)}>
        Add Prospect
      </button>
    </div>
  )
}
```

---

## Security Model

### 1. Process Isolation

```
┌─────────────────────────────────────────────────────┐
│              RENDERER PROCESS                       │
│            (Sandboxed Browser)                      │
│                                                     │
│  • No Node.js access                                │
│  • No file system access                            │
│  • No direct network access                         │
│  • Content Security Policy enforced                 │
│                                                     │
│  Can only communicate via:                          │
│  • IPC (Inter-Process Communication)                │
│  • Exposed API methods (window.api.*)               │
└─────────────────────────────────────────────────────┘
           ↕ IPC Channel (controlled)
┌─────────────────────────────────────────────────────┐
│               MAIN PROCESS                          │
│             (Full Node.js)                          │
│                                                     │
│  • Full system access                               │
│  • Validates all IPC calls                          │
│  • Handles secrets                                  │
│  • Makes network requests                           │
└─────────────────────────────────────────────────────┘
```

### 2. Credential Storage

```
User enters webhook secret
         ↓
Main process receives it via IPC
         ↓
┌─────────────────────────────────────┐
│ Try keytar (OS keychain):           │
│  • macOS: Keychain Access           │
│  • Windows: Credential Manager      │
│  • Linux: Secret Service API        │
└─────────────────────────────────────┘
         ↓
If keytar unavailable:
         ↓
┌─────────────────────────────────────┐
│ Fallback: In-memory storage         │
│ (lost when app closes)              │
│ User sees warning                   │
└─────────────────────────────────────┘
```

### 3. Network Security

All HTTP requests:
- Made from main process (not renderer)
- Include authentication header (`x-webhook-secret`)
- Use HTTPS only
- Validate responses before passing to renderer

---

## Development Workflow

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start development mode
npm run electron:dev
```

**What happens:**
1. Vite starts dev server on `http://localhost:5173`
2. Watches for file changes (hot reload)
3. TypeScript compiler runs in watch mode
4. Electron window opens with React app

**File watching:**
- Edit `src/renderer/**/*.tsx` → Browser hot-reloads
- Edit `src/main/**/*.ts` → Electron restarts
- Edit `src/renderer/index.css` → Styles update instantly

### Build for Production

```bash
npm run electron:build
```

**Build process:**
1. TypeScript compilation (`tsc`)
2. Vite bundles React app → `dist/`
3. TypeScript compiles main process → `dist-electron/`
4. Electron Builder packages app → `release/`
   - macOS: `.dmg` and `.zip`
   - Windows: `.exe` installer
   - Linux: `.AppImage` and `.deb`

### Project Structure

```
GTM-demo/
│
├── src/
│   ├── main/              # Electron main process (Node.js)
│   │   ├── main.ts        # App lifecycle, window creation
│   │   └── network.ts     # HTTP client for webhooks
│   │
│   ├── renderer/          # React application (browser)
│   │   ├── App.tsx        # Main component, routing
│   │   ├── main.tsx       # React entry point
│   │   ├── store.ts       # Zustand state management
│   │   ├── components/    # React components
│   │   └── lib/           # Utilities
│   │
│   └── shared/            # Shared TypeScript types
│       └── types.ts
│
├── dist/                  # Compiled React app (build output)
├── dist-electron/         # Compiled Electron main (build output)
├── release/               # Packaged installers (build output)
│
├── package.json           # Dependencies & scripts
├── tsconfig.json          # TypeScript config (renderer)
├── tsconfig.electron.json # TypeScript config (main)
├── vite.config.ts         # Vite bundler config
├── tailwind.config.js     # Tailwind CSS config
│
└── Documentation/
    ├── AIRTABLE_SCHEMA_REFERENCE.md
    ├── N8N_FOLLOWUPS_ENDPOINTS_GUIDE.md
    └── PHASE1_IMPLEMENTATION_GUIDE.md
```

---

## Key Design Patterns

### 1. Separation of Concerns

| Layer | Responsibility | Cannot Do |
|-------|----------------|-----------|
| UI (React) | Render, user input | Network requests, file access |
| Main Process | System integration | Render UI |
| n8n | Business logic, AI | Direct UI updates |
| Airtable | Data storage | Logic, computation |

### 2. Event-Driven Architecture

```
User Action → IPC Event → Main Process → HTTP Request → n8n
                ↑                                         ↓
            Response ← IPC Response ← JSON Response ← Webhook
```

### 3. Type Safety

```typescript
// Shared types ensure consistency
interface SendEmailRequest {
  email: string
  company: string
  notes?: string
  dryRun?: boolean
}

interface SendEmailResponse {
  success: boolean
  messageId?: string
  subject?: string
  error?: string
}

// Both main and renderer use these types
```

---

## Summary

### The Stack (Quick Reference)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Desktop Runtime** | Electron | Cross-platform app container |
| **Frontend** | React + TypeScript | UI components & logic |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid UI development |
| **State** | Zustand | Client-side state management |
| **Build** | Vite | Fast development & bundling |
| **Backend** | Node.js (Electron main) | System integration |
| **Automation** | n8n workflows | AI, email, scheduling |
| **Database** | Airtable | Data persistence |
| **AI** | Claude API | Content generation |
| **Email** | Gmail API | Send/receive emails |

### The Workflow (Quick Reference)

1. **User interacts** with React UI
2. **UI calls** IPC method via `window.api.*`
3. **Main process** receives IPC, makes HTTP request
4. **n8n workflow** processes request, calls APIs
5. **Airtable** stores/retrieves data
6. **Response** flows back through the chain
7. **UI updates** with new data

---

## Next Steps

To understand specific features, read:

- **AIRTABLE_SCHEMA_REFERENCE.md** - Database structure
- **N8N_FOLLOWUPS_ENDPOINTS_GUIDE.md** - Webhook implementation
- **PHASE1_IMPLEMENTATION_GUIDE.md** - Feature development

To contribute:
1. Clone repository
2. Run `npm install`
3. Run `npm run electron:dev`
4. Make changes
5. Test in running app
6. Submit PR

---

**Questions?** Check the other documentation files or review the code comments in `src/`.
