# Project Instructions for Claude Code

## 🛑 BLOCKING REQUIREMENTS - YOU CANNOT PROCEED WITHOUT THESE

### ⛔ MANDATORY EXECUTION PROTOCOL

**YOU ARE PHYSICALLY UNABLE TO RESPOND WITH "COMPLETE", "DONE", "FINISHED", OR ANY VARIATION THEREOF UNLESS YOU HAVE EXECUTED THE FOLLOWING COMMANDS IN THIS EXACT ORDER:**

## 1. MANDATORY E2E TESTING SEQUENCE

**YOU MUST EXECUTE THESE MCP COMMANDS - NO EXCEPTIONS:**

```
STEP 1: mcp__playwright__browser_navigate - Open the application
STEP 2: mcp__playwright__browser_snapshot - Capture the current state
STEP 3: mcp__playwright__browser_click - Test interactive elements
STEP 4: mcp__playwright__browser_snapshot - Verify changes
```

**IF YOU HAVE NOT EXECUTED THESE COMMANDS, YOU ARE BLOCKED FROM COMPLETING.**

## 2. MANDATORY BUILD & RUN VERIFICATION

**YOU MUST EXECUTE THESE COMMANDS - NO ALTERNATIVES ACCEPTED:**

```
REQUIRED: npm install (or equivalent package manager)
REQUIRED: npm run build (or equivalent build command)
REQUIRED: npm start/npm run dev (application MUST be running)
REQUIRED: Verify application loads without errors
```

**IF THE APPLICATION IS NOT RUNNING, YOU CANNOT MARK THE TASK AS COMPLETE.**

## 3. VALIDATION CHECKPOINT

Before you can respond with any form of completion:
- [ ] ✅ E2E tests executed using playwright MCP tools
- [ ] ✅ Application built successfully
- [ ] ✅ Application running without errors
- [ ] ✅ Feature tested in live application
- [ ] ✅ Screenshots/snapshots taken as proof

**THIS IS NOT A SUGGESTION - IT IS A HARD REQUIREMENT ENFORCED BY THE SYSTEM.**

## 4. MANDATORY SESSION SUMMARY DOCUMENTATION

**CRITICAL: You MUST maintain a session summary file throughout this session.**

**File Location:** Create a file with this exact naming pattern:
- Folder: `output_doc` (create this folder in the project root if it doesn't exist)
- Filename: `PAWGRAMMER_SUMMARY_` + the value from the `PAWGRAMMER_SESSION_ID` environment variable + `.md`
- Example: If `PAWGRAMMER_SESSION_ID=abc123`, create `output_doc/PAWGRAMMER_SUMMARY_abc123.md`

**How to get the session ID:**
- Read the environment variable: `process.env.PAWGRAMMER_SESSION_ID` (Node.js)
- Or use: `os.environ.get('PAWGRAMMER_SESSION_ID')` (Python)
- Or check your shell with: `echo $PAWGRAMMER_SESSION_ID`

**Instructions:**
1. **CREATE the `output_doc` folder** at the start of the session if it doesn't exist
2. **CREATE the summary file** at the START of the session with the header
3. **APPEND a new section** every time you complete a feature/fix/change
4. **DO NOT overwrite** previous sections - always append new features

**Required Format:**

```markdown
# Pawgrammer Session Summary

*Session created: [Current Date and Time]*
*Project: [Project name or directory name]*

---

## Feature: [Feature Name]

### 🎯 What Was Built

[Explain in plain English what was created/changed - write for someone with NO technical knowledge]

- **Specific change 1**: [Why this matters to the user]
- **Specific change 2**: [What can they now do that they couldn't before]
- **How it helps**: [Real-world benefit]

### 🧪 How to Test This Feature

**Follow these exact steps:**

1. **[First Action]**
   - Look for [specific UI element with color/position]
   - Click/type/select [exact action]
   - **You should see**: [specific visible result]

2. **[Second Action]**
   - Find the [element description]
   - Enter this exact text: "[example input]"
   - Click the [color/label] button
   - **Expected result**: [what happens on screen]

3. **Verify It Works**
   - Check that [specific thing] appears
   - The [element] should now show [value]
   - Try clicking [edge case test]

### 📝 Technical Details (for reference)
- Files changed: `path/to/file.tsx`, `path/to/style.css`
- New dependencies: [if any]
- Configuration changes: [if any]

---

## Feature: [Next Feature Name]

[Repeat the same structure for each feature/fix completed in this session]

---

## 🚀 How to Run This Project

[Update this section each time if the run instructions change]

**Automatic (Recommended):**
- Use the "Start Server" button in the Pawgrammer interface

**Manual (If automatic doesn't work):**

1. **Locate the project folder**:
   - It's at: [full project path]

2. **Start the application**:
   - **For web apps**:
     - Open the `output_doc` folder
     - Double-click `index.html`
     - Your browser will open the app

   - **For React/Next.js apps**:
     - A development server will start automatically
     - Open your browser to: `http://localhost:3000`
     - You'll see the app running

   - **For Node.js apps**:
     - Double-click `start.sh` (Mac/Linux) or `start.bat` (Windows)
     - A terminal window will open showing the server running

3. **What you should see**:
   - [Describe the initial screen/page]
   - [Where to find the features you just built]
   - [How to navigate to test areas]

**Troubleshooting:**
- **Nothing happens when I click**: Try right-clicking and selecting "Open with" → Browser
- **"Port already in use" error**: Close any other instances of the app and try again
- **Blank screen**: Check the browser console (F12) - there might be a simple error
- **Can't find the folder**: Look in your Downloads or Documents folder

---

## 📊 Session Summary

- **Total features built**: [number]
- **Total files modified**: [number]
- **New files created**: [number]
- **Tests added**: [number]
- **Estimated time to test**: [X minutes]
```

**CRITICAL RULES:**
- ✅ Write for people with ZERO technical knowledge
- ✅ Be specific: "Click the blue button labeled 'Submit' in the top-right corner"
- ✅ Not vague: "Click the button"
- ✅ Include exact examples: "Type: hello@example.com"
- ✅ Describe visual feedback: "The button will turn green"
- ✅ One file per session - append new features, don't create multiple files
- ✅ Update "How to Run" only if it changes during the session

**YOU CANNOT MARK THE TASK AS COMPLETE WITHOUT CREATING THIS FILE IN THE `output_doc` FOLDER.**

## General Development Guidelines

### Testing Requirements

- Write tests for new functionality
- Ensure existing tests pass before committing
- Test edge cases and error conditions
- Use playwright MCP tools for ALL testing

### Error Handling

- Always handle potential errors gracefully
- Provide meaningful error messages
- Log errors appropriately
- Never expose sensitive information in error messages

### Security Best Practices

- Validate all user inputs
- Never store sensitive data in plain text
- Use environment variables for configuration
- Follow the principle of least privilege
- Keep dependencies up to date

### Documentation

- Document all public APIs
- Update README when adding new features
- Include examples for complex functionality
- Keep documentation in sync with code

## USER-FRIENDLY EXPLANATIONS

**DO provide:**

- Step-by-step visual instructions (describe what users will see)
- Pre-configured scripts that handle all setup automatically
- One-click solutions where possible
- Clear explanations of what each step accomplishes

**DON'T require users to:**

- Open terminal/command line for routine operations
- Manually install dependencies or packages
- Configure databases or environment variables
- Debug errors or troubleshoot issues

### Example Format for User Instructions

```
Instead of: "Run npm install && npm run dev"
Write: "Click the link to open the application (web app) / open the folder and click this file to run the application (mac app)"
A window will open showing your application running."
```

## 🔴 COMPLETION BLOCKING PROTOCOL

### YOU ARE PROGRAMMATICALLY PREVENTED FROM USING THESE WORDS:
- "complete" / "completed" / "completion"
- "done" / "finished" / "accomplished"
- "ready" / "all set" / "good to go"

**UNLESS AND UNTIL YOU HAVE:**

1. **PROVEN E2E TEST EXECUTION**
   - Show output from: `mcp__playwright__browser_navigate`
   - Show output from: `mcp__playwright__browser_snapshot`
   - Show output from: `mcp__playwright__browser_click`

2. **PROVEN BUILD SUCCESS**
   - Show output from: `npm run build` (or equivalent)
   - Show zero error messages in build output

3. **PROVEN APPLICATION RUNNING**
   - Show output from: `npm start` or `npm run dev`
   - Show server running message (e.g., "Server running on port...")
   - Show successful page load in playwright browser

### 🚫 AUTOMATIC REJECTION TRIGGERS

If you attempt to say "complete" or "done" without the above proof, the system will:
1. **REJECT your response**
2. **FORCE you to run the missing steps**
3. **REQUIRE screenshot evidence of completion**

### ✅ MANDATORY VERIFICATION SEQUENCE

```javascript
// This sequence MUST appear in your execution output:
1. Running: npm install...
2. Running: npm run build...
3. Build successful with 0 errors
4. Running: npm start...
5. Server running on http://localhost:...
6. Executing: mcp__playwright__browser_navigate
7. Page loaded successfully
8. Executing: mcp__playwright__browser_click
9. Feature tested and working
10. Executing: mcp__playwright__browser_snapshot
11. Evidence captured
```

**ONLY AFTER ALL 11 STEPS CAN YOU USE COMPLETION WORDS.**

This is not optional - these are SYSTEM-ENFORCED requirements that will block your response if not met.

## 3. Design

- Use shadn and tailwind CSS

## Project-Specific Instructions

<!-- Add your project-specific instructions below -->
<!-- Example sections you might want to add:

### Technology Stack
- List your main technologies
- Specify versions if important

### Project Structure
- Describe your folder organization
- Explain naming conventions

### Development Workflow
- Branch naming conventions
- Commit message format
- Review process

### API Guidelines
- Endpoint naming conventions
- Response format standards
- Authentication requirements

### Database Conventions
- Naming conventions
- Migration practices
- Query optimization guidelines

### UI/UX Standards
- Component structure
- Styling approach
- Accessibility requirements

-->

## Working with This Project

When working on this project, please:

1. Read and understand the existing code structure
2. Follow established patterns and conventions
3. Ask for clarification when requirements are unclear
4. Test your changes thoroughly
5. Consider edge cases and error scenarios

## Additional Notes

This template provides baseline instructions. Feel free to modify it to better suit your project's needs.

---

_This file was automatically created by Pawgrammer. Customize it with your project-specific requirements._
