# Week 5 Plan - Guided Fix + Polish

**Status:** 📋 Planned
**Target Dates:** January 23-29, 2026
**Theme:** Visual debugging + Production readiness

---

## 🎯 Week 5 Goals

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| P0 | Guided Fix (visual node clicking) | 4-6 hrs | High |
| P0 | Workflow JSON download | 1-2 hrs | High |
| P1 | Settings page content | 2-3 hrs | Medium |
| P1 | Help page content | 2-3 hrs | Medium |
| P2 | Performance optimization | 2-4 hrs | Medium |
| P2 | User onboarding flow | 2-3 hrs | Medium |

---

## 🚀 P0: Guided Fix (Headline Feature)

### Vision
Transform the Playback view into an interactive debugging tool where users can click nodes to see problems and generate targeted fix prompts.

### User Flow
```
1. User opens Playback tab
2. Bottleneck nodes highlighted in red/orange/yellow
3. User clicks a node
4. Side panel opens with:
   - Node details (name, type, duration)
   - Bottleneck score breakdown
   - Related recommendations
   - "Generate Fix Prompt" button
5. Click button → copies node-specific Claude Code prompt
```

### Technical Implementation

**Modify:** `frontend/components/execution-visualizer/`
```tsx
// Add to node rendering
const getNodeStyle = (node, bottlenecks) => {
  const bottleneck = bottlenecks.find(b => b.node_id === node.id);
  if (!bottleneck) return defaultStyle;
  
  return {
    ...defaultStyle,
    border: `3px solid ${getSeverityColor(bottleneck.severity)}`,
    boxShadow: `0 0 10px ${getSeverityColor(bottleneck.severity)}40`
  };
};

// Add click handler
const onNodeClick = (node) => {
  const bottleneck = bottlenecks.find(b => b.node_id === node.id);
  const recommendations = getRecommendationsForNode(node.id);
  setSelectedNode({ node, bottleneck, recommendations });
  setShowNodePanel(true);
};
```

**Create:** `frontend/components/execution-visualizer/NodeDetailPanel.tsx`
```tsx
// Side panel component
- Node metadata (name, type, duration)
- Bottleneck score with breakdown
- List of related recommendations
- "Copy Fix Prompt" button
- "View in Bottlenecks Tab" link
```

**Create:** `frontend/lib/nodePromptGenerator.ts`
```tsx
// Generate node-specific prompt
export function generateNodeFixPrompt(node, bottleneck, recommendations) {
  return `
I need help optimizing a specific node in my n8n workflow.

## NODE DETAILS
- **Name:** ${node.name}
- **Type:** ${node.type}
- **Duration:** ${node.duration}ms
- **Bottleneck Score:** ${bottleneck.score}/100 (${bottleneck.severity})

## SCORE BREAKDOWN
- Duration Factor: ${bottleneck.duration_score}/40
- Criticality Factor: ${bottleneck.criticality_score}/30
- Frequency Factor: ${bottleneck.frequency_score}/20
- Variance Factor: ${bottleneck.variance_score}/10

## RECOMMENDATIONS FOR THIS NODE
${recommendations.map(r => `- ${r.title}: ${r.description}`).join('\n')}

## WHAT I NEED
1. Analyze why this node is slow
2. Suggest specific optimizations
3. Provide code/configuration changes
4. Estimate expected improvement

Node configuration attached below if available.
  `;
}
```

### Acceptance Criteria
- [ ] Bottleneck nodes visually highlighted by severity
- [ ] Clicking node opens detail panel
- [ ] Panel shows score breakdown
- [ ] Panel shows related recommendations
- [ ] "Copy Fix Prompt" generates node-specific prompt
- [ ] Works on all test executions

---

## 🚀 P0: Workflow JSON Download

### Vision
Complete the Claude Code export experience by allowing users to download the original workflow JSON alongside the optimization prompt.

### Implementation

**Modify:** `frontend/components/analysis/RecommendationsView.tsx`
```tsx
// Update export dropdown
<DropdownItem onClick={handleDownloadWorkflowJSON}>
  💾 Download Workflow JSON
</DropdownItem>

const handleDownloadWorkflowJSON = async () => {
  // Fetch workflow JSON from API
  const res = await fetch(`/api/workflows/${workflowId}/json`);
  const workflow = await res.json();
  
  // Sanitize credentials
  const sanitized = sanitizeWorkflowJSON(workflow);
  
  // Download
  const blob = new Blob([JSON.stringify(sanitized, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `workflow-${workflowId}.json`);
  
  toast.success('Workflow JSON downloaded', {
    description: 'Attach this to your Claude Code session'
  });
};
```

**Create:** `frontend/lib/workflowSanitizer.ts`
```tsx
// Remove sensitive data before download
export function sanitizeWorkflowJSON(workflow) {
  return {
    ...workflow,
    // Remove credential IDs
    nodes: workflow.nodes.map(node => ({
      ...node,
      credentials: undefined, // Remove credentials
    })),
    // Add note about sanitization
    _signalflow: {
      sanitized: true,
      exportedAt: new Date().toISOString(),
      note: 'Credentials removed for security'
    }
  };
}
```

**Backend:** `GET /api/workflows/{id}/json`
```python
@router.get("/workflows/{workflow_id}/json")
async def get_workflow_json(workflow_id: str):
    # Fetch from executions table (raw_json field)
    # Or fetch from n8n API if stored
    pass
```

### Acceptance Criteria
- [ ] "Download Workflow JSON" button in export dropdown
- [ ] JSON is sanitized (no credentials)
- [ ] File downloads with proper naming
- [ ] Toast confirms download
- [ ] Works with Claude Code prompt flow

---

## 📝 P1: Settings Page Content

### Sections to Build

**1. n8n Connection**
```
┌─────────────────────────────────────────────────────┐
│ n8n Connection                                      │
├─────────────────────────────────────────────────────┤
│ Instance URL: [https://your-instance.n8n.cloud    ] │
│ API Key:      [••••••••••••••••••] [Show] [Test]   │
│                                                     │
│ Status: ✅ Connected                                │
│ Last tested: 2 minutes ago                          │
│                                                     │
│ [Save Connection]                                   │
└─────────────────────────────────────────────────────┘
```

**2. User Preferences**
```
┌─────────────────────────────────────────────────────┐
│ Preferences                                         │
├─────────────────────────────────────────────────────┤
│ Default view after import:  [Analysis ▼]           │
│ Dashboard grouping:         [By Workflow ▼]        │
│ Bottleneck default tab:     [All ▼]                │
│ Show scoring explanations:  [✓]                    │
└─────────────────────────────────────────────────────┘
```

**3. Data Management**
```
┌─────────────────────────────────────────────────────┐
│ Data Management                                     │
├─────────────────────────────────────────────────────┤
│ Stored executions: 17                               │
│ Storage used: 2.4 MB                                │
│                                                     │
│ [Delete All Executions] [Export All Data]          │
└─────────────────────────────────────────────────────┘
```

### Storage
- Use localStorage for preferences (MVP)
- Future: User accounts + database storage

---

## 📝 P1: Help Page Content

### Sections to Build

**1. Quick Start Guide**
- Step-by-step import instructions
- First analysis walkthrough
- Understanding your results

**2. Understanding Analysis**
- Bottleneck scoring explained
- Critical path concept
- Error clustering logic
- Recommendation categories

**3. Using Claude Code Export**
- When to use it
- How to use the prompt
- Attaching workflow JSON
- Best practices

**4. FAQ**
- Common questions
- Troubleshooting

**5. Keyboard Shortcuts**
- Navigation shortcuts
- Quick actions

### Format
- Accordion sections (expandable)
- Search functionality (future)
- Copy code snippets

---

## ⚡ P2: Performance Optimization

### Areas to Investigate

**Frontend**
- [ ] Dashboard load time with 50+ executions
- [ ] Bottlenecks tab with 100+ bottlenecks
- [ ] React Flow performance with 100+ nodes
- [ ] Bundle size analysis

**Backend**
- [ ] Analysis endpoint response time
- [ ] Database query optimization
- [ ] Caching frequently accessed data

**Metrics to Track**
- Time to first meaningful paint
- Time to interactive
- API response times (p50, p95)

---

## 🎓 P2: User Onboarding

### First-Time User Flow
```
1. User lands on Dashboard (empty)
   → Show welcome message + "Import your first execution" CTA

2. User clicks Import
   → Highlight the 3 import methods
   → Show "How to get your n8n API key" tooltip

3. First import completes
   → Auto-navigate to Analysis
   → Show brief tour overlay:
     "This is your Overview..."
     "Click Bottlenecks to see issues..."
     "Export to Claude Code for fixes..."

4. Tour complete
   → Show "Got it!" button
   → Don't show again (localStorage flag)
```

### Implementation
- Use react-joyride or similar
- Persist "seen" state in localStorage
- Skip button available

---

## 📅 Day-by-Day Schedule

### Day 1-2: Guided Fix
- Modify React Flow node styling
- Build NodeDetailPanel component
- Create node-specific prompt generator
- Test with all execution sizes

### Day 3: Workflow JSON Download
- Build sanitization logic
- Add API endpoint
- Integrate with export dropdown
- Test credential removal

### Day 4: Settings Page
- Build UI components
- Implement localStorage persistence
- Add n8n connection test

### Day 5: Help Page
- Write content for all sections
- Build accordion UI
- Add copy functionality

### Day 6-7: Polish + Buffer
- Performance optimization
- Bug fixes from testing
- User onboarding (if time)
- Documentation updates

---

## 🧪 Testing Checklist

### Guided Fix
- [ ] 72-node workflow: nodes highlight correctly
- [ ] Click node: panel opens with correct data
- [ ] Copy prompt: contains node-specific info
- [ ] Panel closes: click outside or X button

### Workflow JSON
- [ ] Download works
- [ ] Credentials removed
- [ ] Valid JSON (can re-import to n8n)

### Settings
- [ ] Preferences save to localStorage
- [ ] Preferences persist across sessions
- [ ] n8n connection test works

### Help
- [ ] All sections render
- [ ] Accordions expand/collapse
- [ ] Code snippets copyable

---

## 📊 Success Metrics

| Metric | Target |
|--------|--------|
| Guided Fix usage | 50% of users try it |
| Workflow JSON downloads | 30% of exports include JSON |
| Settings completion | Users save n8n connection |
| Help page visits | Decreasing over time (users learn) |

---

## 🚨 Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| React Flow performance with highlights | Test with largest workflow first |
| Workflow JSON too large | Add size warning, chunk if needed |
| localStorage limits | Monitor size, add cleanup |
| Scope creep | Stick to P0/P1, defer P2 if needed |

---

## 📝 Definition of Done

Week 5 is complete when:
- [ ] Guided Fix works on all test executions
- [ ] Workflow JSON download functional
- [ ] Settings page has working preferences
- [ ] Help page has comprehensive content
- [ ] All features tested and documented
- [ ] WEEK5-COMPLETE.md written

---

**Ready to build!** 🚀
```

---

## ✅ All 4 Documents Complete!

Here's the summary:

| Document | Purpose |
|----------|---------|
| WEEK4-COMPLETE.md | Technical summary of Week 4 |
| USER-README.md | End-user guide for SignalFlow |
| .project-context.md | Updated context for future sessions |
| WEEK5-PLAN.md | Roadmap for next development phase |

---

## 🚀 Ready to Save?

Here's the Claude Code prompt to save all 4 files:
```
Save 4 documentation files for SignalFlow Week 4 completion.

LOCATION: ~/dev/signalflow

CREATE THE FOLLOWING FILES:

1. docs/WEEK4-COMPLETE.md
[PASTE DOCUMENT 1 CONTENT]

2. docs/USER-README.md
[PASTE DOCUMENT 2 CONTENT]

3. .project-context.md (overwrite existing)
[PASTE DOCUMENT 3 CONTENT]

4. docs/WEEK5-PLAN.md
[PASTE DOCUMENT 4 CONTENT]

After creating files:
1. Verify all 4 files exist
2. Show first 10 lines of each to confirm
3. Report success