# GTM Ops Console

A desktop application for calling n8n webhooks and displaying results. Built with Electron, React, TypeScript, and Tailwind CSS.

## Features

- **Settings Management**: Configure N8N base URL and webhook secret with secure storage
- **Three Operation Tabs**:
  - **Leads**: Search Reddit for leads with configurable minimum score
  - **Reply Drafts**: Generate reply drafts for social media posts
  - **Prospect Email**: Send or preview cold outreach emails
- **Recent Runs**: Track and review recent webhook calls
- **Secure Storage**: Webhook secrets stored in OS keychain (with fallback)
- **Dark/Light Theme**: Automatic theme switching based on system preferences
- **Error Handling**: Friendly error messages with raw error details toggle

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run electron:dev
```

The app will start with hot-reload enabled. Changes to React components will reload automatically.

### Building

```bash
# Build for production
npm run electron:build
```

This will create installers in the `release` directory for your platform.

## Architecture

- **Main Process** (`src/main`): Electron main process handling IPC, storage, and network requests
- **Renderer Process** (`src/renderer`): React application with Tailwind CSS
- **Shared** (`src/shared`): TypeScript types shared between main and renderer

### Security Features

- Context isolation enabled
- Node integration disabled in renderer
- Secrets stored in OS keychain via keytar
- All network requests handled by main process
- Content Security Policy enforced

## Configuration

Settings are stored locally using `electron-store`. The webhook secret is stored securely in your OS keychain.

### First Time Setup

1. Click "Settings" in the top-right
2. Enter your N8N base URL (e.g., `https://your-n8n-instance.com`)
3. Enter your webhook secret
4. Click "Test Connection" to verify
5. Click "Save Settings"

## Usage

### Leads Tab

Search Reddit for leads matching your criteria:

1. Enter a search query
2. Set minimum score (default: 2)
3. Click "Run Search"
4. View results with links to top posts

### Reply Drafts Tab

Generate reply drafts for social media posts:

1. Select platform (Twitter, LinkedIn, Reddit)
2. Enter post URL and text
3. Optionally specify an angle/tone
4. Click "Draft Replies"
5. Copy generated drafts with one click

### Prospect Email Tab

Send or preview cold outreach emails:

1. Enter recipient email and company name
2. Add optional notes
3. Check "Dry Run" to preview without sending
4. Click "Send Email" or "Preview Email"
5. View subject line and send status

## Important Notes

- This console only calls your n8n webhooks
- It does not post directly to social platforms
- Actual send behavior is controlled by your n8n workflows
- All operations are logged in Recent Runs

## Troubleshooting

### Keytar Issues

If keytar is unavailable on your system, the app will fall back to session-only storage for secrets. You'll see a warning in the Settings modal.

### Connection Issues

- Verify your N8N base URL is correct (no trailing slash)
- Ensure your webhook secret matches your n8n configuration
- Use the "Test Connection" button in Settings to diagnose issues

## License

MIT
