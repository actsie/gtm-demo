# GTM Operations Console - Documentation Index

**Your guide to understanding, using, and extending this project**

---

## Start Here

**New to the project?** Start with these in order:

1. **[QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)** *(5 min read)*
   - Get up to speed quickly
   - One-page tech stack overview
   - Essential commands and troubleshooting

2. **[STACK_ARCHITECTURE_GUIDE.md](./STACK_ARCHITECTURE_GUIDE.md)** *(20 min read)*
   - Detailed technical architecture
   - How all the pieces fit together
   - Component communication patterns
   - Security model and best practices

3. **[WORKFLOW_VISUAL_DIAGRAM.md](./WORKFLOW_VISUAL_DIAGRAM.md)** *(15 min read)*
   - Visual workflow diagrams
   - Step-by-step data flow examples
   - Email lifecycle from send to reply

---

## By Role

### I'm a Developer

**Getting Started:**
1. [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) - Development setup
2. [STACK_ARCHITECTURE_GUIDE.md](./STACK_ARCHITECTURE_GUIDE.md) - Code organization
3. [Project README](../README.md) - Install and run

**Building Features:**
- [PHASE1_IMPLEMENTATION_GUIDE.md](../PHASE1_IMPLEMENTATION_GUIDE.md) - Feature specs
- [N8N_FOLLOWUPS_ENDPOINTS_GUIDE.md](../N8N_FOLLOWUPS_ENDPOINTS_GUIDE.md) - Backend API
- [AIRTABLE_SCHEMA_REFERENCE.md](../AIRTABLE_SCHEMA_REFERENCE.md) - Database schema

**Understanding Flows:**
- [WORKFLOW_VISUAL_DIAGRAM.md](./WORKFLOW_VISUAL_DIAGRAM.md) - Visual workflows

### I'm Setting Up Automation (n8n)

**Start Here:**
1. [N8N_FOLLOWUPS_ENDPOINTS_GUIDE.md](../N8N_FOLLOWUPS_ENDPOINTS_GUIDE.md) - Step-by-step webhook setup
2. [AIRTABLE_SCHEMA_REFERENCE.md](../AIRTABLE_SCHEMA_REFERENCE.md) - Database structure
3. [WORKFLOW_VISUAL_DIAGRAM.md](./WORKFLOW_VISUAL_DIAGRAM.md) - See how automation fits in

### I'm Configuring Airtable

**Start Here:**
1. [AIRTABLE_SCHEMA_REFERENCE.md](../AIRTABLE_SCHEMA_REFERENCE.md) - Complete schema guide
2. [WORKFLOW_VISUAL_DIAGRAM.md](./WORKFLOW_VISUAL_DIAGRAM.md) - See data flow

### I'm a Product Manager / Non-Technical

**Understanding the System:**
1. [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) - "What Is This?" section
2. [WORKFLOW_VISUAL_DIAGRAM.md](./WORKFLOW_VISUAL_DIAGRAM.md) - Visual overview
3. [STACK_ARCHITECTURE_GUIDE.md](./STACK_ARCHITECTURE_GUIDE.md) - "The Big Picture" section

**Feature Documentation:**
- [PHASE1_IMPLEMENTATION_GUIDE.md](../PHASE1_IMPLEMENTATION_GUIDE.md) - What features exist
- [Project README](../README.md) - User guide

---

## By Task

### I want to...

#### Understand how the app works
→ [STACK_ARCHITECTURE_GUIDE.md](./STACK_ARCHITECTURE_GUIDE.md) - "Architecture Layers" section

#### See how data flows through the system
→ [WORKFLOW_VISUAL_DIAGRAM.md](./WORKFLOW_VISUAL_DIAGRAM.md) - All sections

#### Set up my development environment
→ [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) - "Development Commands" section
→ [Project README](../README.md) - "Setup" section

#### Add a new feature to the UI
→ [STACK_ARCHITECTURE_GUIDE.md](./STACK_ARCHITECTURE_GUIDE.md) - "Presentation Layer" section
→ [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) - "Add a New Tab" section

#### Create a new n8n webhook
→ [N8N_FOLLOWUPS_ENDPOINTS_GUIDE.md](../N8N_FOLLOWUPS_ENDPOINTS_GUIDE.md) - Pick similar endpoint as template
→ [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) - "Call a New n8n Webhook" section

#### Understand the database schema
→ [AIRTABLE_SCHEMA_REFERENCE.md](../AIRTABLE_SCHEMA_REFERENCE.md) - Complete reference

#### Debug an issue
→ [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) - "Debugging" section
→ [STACK_ARCHITECTURE_GUIDE.md](./STACK_ARCHITECTURE_GUIDE.md) - "How Components Communicate"

#### Understand security measures
→ [STACK_ARCHITECTURE_GUIDE.md](./STACK_ARCHITECTURE_GUIDE.md) - "Security Model" section
→ [WORKFLOW_VISUAL_DIAGRAM.md](./WORKFLOW_VISUAL_DIAGRAM.md) - "Security Boundaries" section

#### Build the app for production
→ [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) - "Build Output" section
→ [Project README](../README.md) - "Building" section

#### Understand the follow-up automation
→ [WORKFLOW_VISUAL_DIAGRAM.md](./WORKFLOW_VISUAL_DIAGRAM.md) - "Automated Follow-Up System"
→ [N8N_FOLLOWUPS_ENDPOINTS_GUIDE.md](../N8N_FOLLOWUPS_ENDPOINTS_GUIDE.md) - All sections
→ [AIRTABLE_SCHEMA_REFERENCE.md](../AIRTABLE_SCHEMA_REFERENCE.md) - "Data Flow Diagram"

---

## Complete Documentation Map

```
GTM-demo/
│
├── README.md                              # User guide, quick install
│
├── CLAUDE.md                              # Development guidelines (for AI)
│
├── output_doc/                            # 📚 Documentation Hub
│   │
│   ├── DOCUMENTATION_INDEX.md             # ← You are here
│   │
│   ├── QUICK_START_GUIDE.md               # ⚡ 5-minute overview
│   │   • Tech stack summary
│   │   • Project structure
│   │   • Common commands
│   │   • Troubleshooting
│   │
│   ├── STACK_ARCHITECTURE_GUIDE.md        # 🏗️ Complete architecture
│   │   • High-level overview
│   │   • Technology stack deep-dive
│   │   • Architecture layers
│   │   • Data flow & workflows
│   │   • Component communication
│   │   • Security model
│   │   • Development workflow
│   │
│   └── WORKFLOW_VISUAL_DIAGRAM.md         # 📊 Visual workflows
│       • System overview diagram
│       • Sending email flow
│       • Follow-up automation flow
│       • Reply detection flow
│       • State management
│       • Security boundaries
│       • Email lifecycle
│
├── AIRTABLE_SCHEMA_REFERENCE.md           # 🗄️ Database structure
│   • Outbox table schema
│   • FollowupTemplates table
│   • Field purposes
│   • Airtable formulas
│   • Data flow diagrams
│   • Common mistakes to avoid
│
├── N8N_FOLLOWUPS_ENDPOINTS_GUIDE.md       # 🔗 Backend API guide
│   • Endpoint specifications
│   • Node-by-node workflow setup
│   • Request/response formats
│   • Testing procedures
│   • Troubleshooting
│
└── PHASE1_IMPLEMENTATION_GUIDE.md         # 📋 Feature specifications
    • Product requirements
    • UI/UX specifications
    • Implementation checklist
    • Testing plan
```

---

## Documentation by Topic

### Architecture & Design

| Document | What You'll Learn |
|----------|-------------------|
| [STACK_ARCHITECTURE_GUIDE.md](./STACK_ARCHITECTURE_GUIDE.md) | Complete system architecture, tech stack, design patterns |
| [WORKFLOW_VISUAL_DIAGRAM.md](./WORKFLOW_VISUAL_DIAGRAM.md) | Visual diagrams of data flow and system interactions |
| [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) | Quick overview of stack and structure |

### Database & Data

| Document | What You'll Learn |
|----------|-------------------|
| [AIRTABLE_SCHEMA_REFERENCE.md](../AIRTABLE_SCHEMA_REFERENCE.md) | Complete database schema, fields, formulas, relationships |
| [WORKFLOW_VISUAL_DIAGRAM.md](./WORKFLOW_VISUAL_DIAGRAM.md) | How data flows through the system |

### Backend & Automation

| Document | What You'll Learn |
|----------|-------------------|
| [N8N_FOLLOWUPS_ENDPOINTS_GUIDE.md](../N8N_FOLLOWUPS_ENDPOINTS_GUIDE.md) | How to build n8n webhooks, node configurations |
| [WORKFLOW_VISUAL_DIAGRAM.md](./WORKFLOW_VISUAL_DIAGRAM.md) | Automation workflows visualized |

### Frontend & UI

| Document | What You'll Learn |
|----------|-------------------|
| [STACK_ARCHITECTURE_GUIDE.md](./STACK_ARCHITECTURE_GUIDE.md) | React architecture, component structure, state management |
| [PHASE1_IMPLEMENTATION_GUIDE.md](../PHASE1_IMPLEMENTATION_GUIDE.md) | UI specifications and requirements |
| [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) | Component communication patterns |

### Development & Setup

| Document | What You'll Learn |
|----------|-------------------|
| [README.md](../README.md) | Installation, running locally, building |
| [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) | Development commands, debugging, common tasks |
| [STACK_ARCHITECTURE_GUIDE.md](./STACK_ARCHITECTURE_GUIDE.md) | Development workflow, project structure |

### Security

| Document | What You'll Learn |
|----------|-------------------|
| [STACK_ARCHITECTURE_GUIDE.md](./STACK_ARCHITECTURE_GUIDE.md) | Security model, credential storage, process isolation |
| [WORKFLOW_VISUAL_DIAGRAM.md](./WORKFLOW_VISUAL_DIAGRAM.md) | Security boundaries visualization |

---

## Reading Paths

### Path 1: "I want to understand everything" (60 min)

1. [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) - Get the basics
2. [STACK_ARCHITECTURE_GUIDE.md](./STACK_ARCHITECTURE_GUIDE.md) - Deep architecture
3. [WORKFLOW_VISUAL_DIAGRAM.md](./WORKFLOW_VISUAL_DIAGRAM.md) - See it in action
4. [AIRTABLE_SCHEMA_REFERENCE.md](../AIRTABLE_SCHEMA_REFERENCE.md) - Understand data
5. [N8N_FOLLOWUPS_ENDPOINTS_GUIDE.md](../N8N_FOLLOWUPS_ENDPOINTS_GUIDE.md) - Backend details

### Path 2: "I need to start coding now" (15 min)

1. [README.md](../README.md) - Install dependencies
2. [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) - Key files & commands
3. [STACK_ARCHITECTURE_GUIDE.md](./STACK_ARCHITECTURE_GUIDE.md) - "Project Structure" section
4. Start coding!

### Path 3: "I'm setting up n8n workflows" (30 min)

1. [N8N_FOLLOWUPS_ENDPOINTS_GUIDE.md](../N8N_FOLLOWUPS_ENDPOINTS_GUIDE.md) - Complete guide
2. [AIRTABLE_SCHEMA_REFERENCE.md](../AIRTABLE_SCHEMA_REFERENCE.md) - Database setup
3. [WORKFLOW_VISUAL_DIAGRAM.md](./WORKFLOW_VISUAL_DIAGRAM.md) - See expected flow
4. Build workflows

### Path 4: "I need to fix a bug" (10 min)

1. [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) - "Debugging" section
2. [STACK_ARCHITECTURE_GUIDE.md](./STACK_ARCHITECTURE_GUIDE.md) - Understand component that's failing
3. [WORKFLOW_VISUAL_DIAGRAM.md](./WORKFLOW_VISUAL_DIAGRAM.md) - Trace data flow
4. Fix and test

### Path 5: "I'm explaining this to someone" (10 min)

1. [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) - "What Is This?" section
2. [WORKFLOW_VISUAL_DIAGRAM.md](./WORKFLOW_VISUAL_DIAGRAM.md) - Show diagrams
3. [STACK_ARCHITECTURE_GUIDE.md](./STACK_ARCHITECTURE_GUIDE.md) - "The Big Picture" section

---

## Document Updates

| Document | Last Updated | Version |
|----------|--------------|---------|
| README.md | Nov 2024 | 1.0.0 |
| QUICK_START_GUIDE.md | Nov 2024 | 1.0.0 |
| STACK_ARCHITECTURE_GUIDE.md | Nov 2024 | 1.0.0 |
| WORKFLOW_VISUAL_DIAGRAM.md | Nov 2024 | 1.0.0 |
| AIRTABLE_SCHEMA_REFERENCE.md | Nov 2024 | 1.0.0 |
| N8N_FOLLOWUPS_ENDPOINTS_GUIDE.md | Nov 2024 | 1.0.0 |
| PHASE1_IMPLEMENTATION_GUIDE.md | Nov 2024 | 1.0.0 |

---

## Contributing to Documentation

When adding new features:

1. Update relevant technical docs
2. Add visual diagrams if workflow changes
3. Update this index if new docs added
4. Update README if user-facing changes

---

## Questions Not Answered Here?

Check these resources:

- **Electron docs:** https://www.electronjs.org/docs
- **React docs:** https://react.dev
- **n8n docs:** https://docs.n8n.io
- **Airtable API:** https://airtable.com/developers/web/api
- **Tailwind CSS:** https://tailwindcss.com/docs
- **TypeScript:** https://www.typescriptlang.org/docs

---

**Happy building! 🚀**
