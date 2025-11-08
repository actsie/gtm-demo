# Regenerate Feature - Lessons Learned

**Date:** November 8, 2025
**Feature:** Regenerate individual follow-up drafts with fresh AI content

---

## ✅ What Worked

### 1. Frontend Implementation
- **Regenerate button placement:** Adding it next to "Mark as Ready" was intuitive
- **Always-editable mode:** Users can see the regenerated content immediately
- **Local state updates:** Updating `selectedThreadDrafts` directly made changes instant
- **Modal stays open:** Users can regenerate multiple times without reopening

### 2. Backend Architecture
- **Reusing existing endpoint:** Adding "regenerate" case to `/webhook/draft-action` was clean
- **Get by ID operation:** Much simpler than Search with filter formulas for single records
- **Code nodes over Set nodes:** Code nodes give full control over response structure
- **Returning updated content:** Backend sends new subject/body so frontend can update immediately

### 3. AI Integration
- **JSON response format:** Having AI return `{subject: "...", body: "..."}` was perfect
- **Markdown handling:** AI wrapped response in ```json blocks, parser handled it gracefully
- **Anthropic format:** Used `content[0].text` structure (not OpenAI's `choices[0].message.content`)

---

## ❌ Common Mistakes & Fixes

### 1. Airtable Filter Formulas
**Mistake:** Using `{id} = 'recXXX'` in filter formula
```
{id} = '{{ $json.draft_id }}'  ❌ DOESN'T WORK
```

**Fix:** Use `RECORD_ID()` or "Get by ID" operation
```
RECORD_ID() = '{{ $json.draft_id }}'  ✅ Works

OR better:
Operation: Get by ID
Record ID: {{ $json.draft_id }}  ✅ Simpler!
```

**Lesson:** Can't filter by internal record ID using `{id}` field. Always use RECORD_ID() function or Get by ID operation.

---

### 2. Validation Arrays
**Mistake:** Forgot to add "regenerate" to allowed actions list
```javascript
if (!['mark_ready', 'skip', 'edit_and_save'].includes(action)) {
  throw new Error('action must be one of: ...');
}
```

**Fix:** Add new action to validation
```javascript
if (!['mark_ready', 'skip', 'edit_and_save', 'regenerate'].includes(action)) {
  // Now accepts 'regenerate'
}
```

**Lesson:** Always update validation when adding new API actions!

---

### 3. AI Response Format Detection
**Mistake:** Hardcoded OpenAI response structure
```javascript
const aiResponse = $('AI Node').item.json.choices[0].message.content;  ❌
// Fails for Anthropic/Claude
```

**Fix:** Detect AI provider format
```javascript
// Handle both Anthropic and OpenAI
if (aiNode.content && aiNode.content[0] && aiNode.content[0].text) {
  aiResponse = aiNode.content[0].text;  // Anthropic
} else if (aiNode.choices && aiNode.choices[0]) {
  aiResponse = aiNode.choices[0].message.content;  // OpenAI
}
```

**Lesson:** Different AI providers have different response structures. Build flexible parsers!

---

### 4. Set Node vs Code Node for JSON
**Mistake:** Using Set node to return complex JSON responses
```
Set node output:
Fields: "{\n  \"ok\": true,\n  \"data\": ..." ❌
// Returns JSON as STRING, not object!
```

**Fix:** Use Code node for structured responses
```javascript
return [{
  json: {
    ok: true,
    data: {
      success: true,
      updated_draft: { subject, body }
    }
  }
}];  ✅ Returns proper JSON object
```

**Lesson:** For complex/nested JSON responses, always use Code nodes, not Set nodes!

---

### 5. Expression Mode in Set Nodes
**Mistake:** Wrong expression syntax causing `=` prefix
```
Expression mode with: ={{ $('Node').item.json.field }}
Output: "=value"  ❌ Literal "=" in output
```

**Fix:** Use Code node instead (see #4)

**Lesson:** Set nodes with expressions can have unexpected escaping. Code nodes are more reliable.

---

### 6. Handling Empty Airtable Results
**Mistake:** Not enabling "Always Output Data" on Airtable nodes
```
Get Follow-up Template → No results → Workflow stops ❌
```

**Fix:** Enable "Always Output Data" on all Airtable nodes
```
Settings → Always Output Data ✅
// Returns empty array [] instead of stopping
```

**Lesson:** Always enable "Always Output Data" to prevent workflow failures on empty results!

---

### 7. Missing Fields in Airtable Tables
**Mistake:** Assuming field exists without checking
```
Filter: {is_active} = TRUE()
Error: "Unknown field names: is_active" ❌
```

**Fix:** Check Airtable table first, use only existing fields
```
Filter: {stage} = 'follow_up_1'  ✅
// Only use fields that exist in the table
```

**Lesson:** Always verify field names in Airtable before using them in formulas!

---

## 🏗️ Final Working Architecture

### n8n Workflow (`/webhook/draft-action` - Regenerate branch)

```
1. Webhook Trigger
2. Validate Input (add 'regenerate' to allowed actions)
3. Switch Node (route by action)
   └─→ Regenerate branch:
       4. Get Draft to Regenerate (Get by ID)
       5. Get Original Email (Get by ID)
       6. Get Follow-up Template (Search: {stage} = 'xxx')
       7. Prepare AI Context (Code node)
       8. Generate New Follow-up (Anthropic AI node)
       9. Parse AI Response (Code node - handle JSON)
       10. Update Draft in Airtable
       11. Return Regenerate Success (Code node - return JSON)
4. Combine All Branches (Merge node)
```

### Frontend Flow

```
User clicks "Regenerate"
  → handleRegenerate(draftId)
  → onAction(draftId, 'regenerate')
  → handleDraftAction in FollowUpsTab
  → apiCall('/webhook/draft-action', { draft_id, action: 'regenerate' })
  → Backend returns { updated_draft: { subject, body } }
  → Frontend updates selectedThreadDrafts state
  → DraftThreadModal re-renders with new content
  → User sees new subject/body instantly!
```

---

## 📋 Checklist for Adding New Actions

When adding new actions to `/webhook/draft-action`:

- [ ] Add action name to validation array
- [ ] Add case to Switch node
- [ ] Use "Get by ID" for single records (not Search with filter)
- [ ] Enable "Always Output Data" on all Airtable nodes
- [ ] Use Code nodes for complex JSON responses
- [ ] Return updated data in response for instant frontend updates
- [ ] Handle AI response formats flexibly (support multiple providers)
- [ ] Test with empty results (no templates, no drafts, etc.)
- [ ] Update frontend to handle new action response

---

## 🎯 Key Takeaways

1. **Get by ID > Search**: When fetching single records by ID, use "Get by ID" operation
2. **Code nodes > Set nodes**: For structured JSON responses, always use Code nodes
3. **Always Output Data**: Enable on all Airtable nodes to handle empty results gracefully
4. **Flexible parsing**: Support multiple AI provider formats in response parsers
5. **Return updates**: Backend should return changed data so frontend can update instantly
6. **Validation first**: Update validation before adding new features
7. **Check fields**: Verify Airtable field names exist before using in formulas

---

*Session: November 8, 2025*
