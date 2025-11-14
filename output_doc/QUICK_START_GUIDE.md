# GTM Console - Quick Start Guide

**Get up to speed in 5 minutes**

---

## What Is This?

A **desktop app** that helps you:
- Send AI-generated cold emails
- Automatically follow up (Day 3, 7, 14)
- Detect replies
- Track prospects
- Generate social media drafts

---

## Tech Stack (One-Liner)

**Electron** (desktop wrapper) + **React/TypeScript** (UI) + **n8n** (automation) + **Airtable** (database) + **Claude AI** (content generation) + **Gmail** (email sending)

---

## Architecture (3 Layers)

```
┌──────────────────────┐
│  Desktop App         │  ← React UI (what you see)
│  (Electron + React)  │
└──────────┬───────────┘
           │ HTTPS
           ↓
┌──────────────────────┐
│  Automation Engine   │  ← Business logic & AI
│  (n8n workflows)     │
└──────────┬───────────┘
           │ REST API
           ↓
┌──────────────────────┐
│  Database            │  ← Data storage
│  (Airtable)          │
└──────────────────────┘
```

---

## How It Works (Simple)

1. You fill out a form in the app
2. App calls an n8n webhook
3. n8n generates email with Claude AI
4. n8n sends via Gmail
5. n8n saves to Airtable
6. n8n auto-follows up after 3/7/14 days
7. n8n checks Gmail for replies every 4 hours

---

## Project Structure

```
src/
├── main/           # Electron backend (Node.js)
│   ├── main.ts     # App lifecycle, IPC handlers
│   └── network.ts  # HTTP requests to n8n
│
├── renderer/       # React frontend (browser)
│   ├── App.tsx     # Main component, tabs
│   ├── store.ts    # Global state (Zustand)
│   └── components/ # UI components
│
└── shared/         # TypeScript types
    └── types.ts    # Shared interfaces
```

---

## Key Files to Know

| File | Purpose | When to Edit |
|------|---------|--------------|
| `src/renderer/App.tsx` | Main app shell, tab navigation | Adding new tabs or changing layout |
| `src/renderer/components/*.tsx` | Individual tab components | Changing UI or adding features |
| `src/renderer/store.ts` | Global state management | Adding new data or actions |
| `src/main/main.ts` | Electron setup, IPC handlers | Adding new backend functionality |
| `src/main/network.ts` | n8n webhook calls | Changing how we call n8n |
| `src/shared/types.ts` | TypeScript interfaces | Adding new data structures |
| `package.json` | Dependencies & scripts | Adding libraries or changing scripts |
| `vite.config.ts` | Build configuration | Changing build settings |

---

## Development Commands

```bash
# Install dependencies
npm install

# Start development (with hot reload)
npm run electron:dev

# Type check (without building)
npm run type-check

# Build for production
npm run electron:build

# Build to directory (faster, for testing)
npm run build:dir
```

---

## How Components Communicate

### Renderer → Main (IPC)

```typescript
// In React component (src/renderer/components/EmailTab.tsx)
const result = await window.api.callWebhook('send-email', {
  email: 'john@example.com',
  company: 'Acme Corp'
})
```

### Main → n8n (HTTPS)

```typescript
// In main process (src/main/main.ts)
ipcMain.handle('call-webhook', async (event, endpoint, data) => {
  const secret = await keytar.getPassword('gtm-console', 'webhook-secret')
  const baseUrl = store.get('n8nBaseUrl')

  return fetch(`${baseUrl}/webhook/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': secret
    },
    body: JSON.stringify(data)
  })
})
```

### State Management

```typescript
// src/renderer/store.ts
export const useStore = create<AppState>((set) => ({
  prospects: [],
  followUps: [],

  setProspects: (prospects) => set({ prospects }),
  addProspect: (prospect) => set((state) => ({
    prospects: [...state.prospects, prospect]
  }))
}))

// In component
const { prospects, addProspect } = useStore()
```

---

## Data Flow Example

**Sending an email:**

```
User fills form
    ↓
React component calls window.api.callWebhook()
    ↓
Main process receives IPC call
    ↓
Main process makes HTTPS POST to n8n
    ↓
n8n workflow executes:
  ① Validate secret
  ② Call Claude API (generate email)
  ③ Send via Gmail API
  ④ Create Airtable record
  ⑤ Return success response
    ↓
Main process returns result to renderer
    ↓
UI shows success toast + updates list
```

---

## Database Schema (Airtable)

### Outbox Table (Sent Emails)

```
{
  email: string,              // Recipient
  company: string,            // Company name
  subject: string,            // Email subject
  body: string,               // Email content
  status: 'sent' | 'replied' | 'closed',
  sent_at: datetime,
  follow_up_stage: 'initial' | 'follow_up_1' | 'follow_up_2' | 'follow_up_3' | 'replied' | 'closed',
  follow_up_count: number,    // 0-3
  last_followup_sent: datetime,
  replied_at: datetime,
  reply_body: string,
  parent_email_id: link       // Link to original email
}
```

### FollowupTemplates Table

```
{
  name: string,               // "Follow-up 1 (Day 3)"
  stage: 'follow_up_1' | 'follow_up_2' | 'follow_up_3',
  days_after: number,         // 3, 7, or 14
  template_prompt: string,    // AI instructions
  active: boolean
}
```

---

## Security Model

| Component | Access Level | Can Do | Cannot Do |
|-----------|--------------|--------|-----------|
| **Renderer Process** | Sandboxed | Render UI, call IPC | Network, file system, Node.js |
| **Main Process** | Full access | Everything | Render UI directly |
| **IPC Bridge** | Controlled | Specific exposed methods | Arbitrary code execution |

**Secrets stored in:**
- macOS: Keychain Access
- Windows: Credential Manager
- Linux: libsecret

---

## Common Tasks

### Add a New Tab

1. Create component: `src/renderer/components/NewTab.tsx`
2. Add to `App.tsx` tabs array
3. Add state to `store.ts` if needed
4. Add IPC handler to `main.ts` if backend needed
5. Create n8n webhook if needed

### Add a New Field to Form

1. Add to TypeScript interface in `src/shared/types.ts`
2. Add input field in component
3. Add to form state
4. Update webhook call payload
5. Update n8n workflow to handle new field
6. Update Airtable schema if storing data

### Call a New n8n Webhook

1. Add endpoint to `n8nEndpoints` config
2. Call via `window.api.callWebhook('endpoint-name', data)`
3. Handle response in component
4. Create corresponding n8n workflow

---

## Debugging

### Check Renderer Console

```
View → Developer Tools
```

Shows:
- React errors
- IPC call failures
- State changes

### Check Main Process Logs

```
Terminal where you ran `npm run electron:dev`
```

Shows:
- Network errors
- IPC handler errors
- n8n response errors

### Check n8n Logs

In n8n web interface:
- Workflow executions
- Error details
- API responses

### Check Airtable

Verify:
- Records created
- Field values correct
- Formulas working

---

## Environment Variables

None needed for local development! Everything configured in Settings modal.

**Settings stored in:**
- `electron-store` (local JSON file)
- OS keychain (webhook secret)

---

## Dependencies Explained

### Production

| Package | Purpose |
|---------|---------|
| `electron-store` | Persist settings locally |
| `keytar` | Store secrets in OS keychain |
| `zustand` | State management |
| `@radix-ui/*` | Headless UI components |
| `tailwind-merge` | Merge Tailwind classes |
| `lucide-react` | Icons |

### Development

| Package | Purpose |
|---------|---------|
| `electron` | Desktop app framework |
| `vite` | Build tool & dev server |
| `react` | UI library |
| `typescript` | Type safety |
| `tailwindcss` | CSS framework |
| `electron-builder` | Package app for distribution |

---

## Build Output

```
npm run electron:build
```

Creates:

```
release/
├── mac/
│   ├── GTM Ops Console.app
│   └── GTM Ops Console.dmg
├── win/
│   └── GTM Ops Console Setup.exe
└── linux/
    ├── GTM Ops Console.AppImage
    └── gtm-ops-console_1.0.0_amd64.deb
```

---

## Troubleshooting

### "Keytar not available"

**Symptom:** Warning in Settings modal
**Cause:** Native module build failed
**Fix:** Secrets stored in memory (lost on app close)
**Solution:** Run `npm rebuild keytar --runtime=electron --target=28.0.0`

### "Connection failed"

**Symptom:** Red error toast
**Cause:** n8n URL wrong or secret mismatch
**Fix:** Check Settings, use "Test Connection"

### "Hot reload not working"

**Symptom:** Changes don't appear
**Fix:**
- Renderer changes: Hard refresh (Cmd+R)
- Main changes: Restart `npm run electron:dev`

### "Build fails"

**Symptom:** TypeScript errors
**Fix:** Run `npm run type-check` to see errors
**Common causes:**
- Missing type imports
- Wrong interface usage
- Unused variables

---

## Next Steps

1. **Read the full architecture guide:** `STACK_ARCHITECTURE_GUIDE.md`
2. **See visual workflows:** `WORKFLOW_VISUAL_DIAGRAM.md`
3. **Understand Airtable schema:** `AIRTABLE_SCHEMA_REFERENCE.md`
4. **Build n8n workflows:** `N8N_FOLLOWUPS_ENDPOINTS_GUIDE.md`

---

## Quick Reference Cards

### IPC Methods Available

```typescript
window.api.callWebhook(endpoint: string, data: object)
window.api.getSettings()
window.api.saveSettings(settings: object)
window.api.getSecret(key: string)
window.api.saveSecret(key: string, value: string)
```

### n8n Endpoints

- `/webhook/send-email` - Send cold email
- `/webhook/followups-list` - Get follow-ups list
- `/webhook/followup-details` - Get email thread
- `/webhook/followup-action` - Manual actions
- `/webhook/drafts-generate` - Generate social drafts
- `/webhook/prospects-sync` - Sync prospects

### Zustand Store Actions

```typescript
// Prospects
setProspects(prospects: Prospect[])
addProspect(prospect: Prospect)
updateProspect(id: string, updates: Partial<Prospect>)
removeProspect(id: string)

// Follow-ups
setFollowUps(followUps: FollowUp[])
updateFollowUp(id: string, updates: Partial<FollowUp>)

// UI State
setLoading(isLoading: boolean)
setError(error: string | null)
```

---

**Last Updated:** November 2024
**Version:** 1.0.0
