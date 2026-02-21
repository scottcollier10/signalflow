# Tier 3 Comparison Feature - Morning Prep Checklist

## Overview
Light prep work before brainstorm session. Total time: ~1 hour.

---

## 1. UX Research (30 mins)

### Look at LangSmith Comparison View
**URL:** https://smith.langchain.com/ (need account, but screenshots online)

**What to observe:**
- How do they show before/after metrics?
- Side-by-side layout or overlay?
- What's the visual hierarchy? (what catches your eye first?)
- How do they show improvements vs regressions?
- Color coding system?

**Alternative references:**
- GitHub PR diff view (before/after code)
- Lighthouse performance comparisons
- Any A/B testing dashboards you've used

**Sketch on paper:**
```
Quick wireframe of comparison view:
- Where does duration go?
- Where do bottlenecks go?
- How to show node-level changes?
- Where's the "verdict" or summary?
```

---

## 2. Validate Test Data (15 mins)

### Check Executive Pulse Executions

**In terminal:**
```bash
cd /Users/scottcollier/dev/signalflow

# Start services if needed
sf

# Check what executions exist
curl localhost:8001/api/executions | jq '.executions[] | {
  id: .id,
  workflow_name: .workflow_name,
  workflow_id: .workflow_id,
  duration: .duration,
  created_at: .created_at
}' | grep -A5 "Executive Pulse"
```

**Confirm you have:**
- [ ] Original execution (~13.1s)
- [ ] Optimized execution (~1.6s)
- [ ] Same workflow_id (should match)
- [ ] Different execution IDs
- [ ] Clear created_at timestamps (which came first?)

**If data is missing:**
- Re-import executions from n8n
- Document execution IDs for testing

---

## 3. Think Through Edge Cases (15 mins)

### UX Questions to Answer

**Comparison Selection:**
- How does user pick which two executions to compare?
  - [ ] Dropdown on Dashboard? (select two from list)
  - [ ] Button on each execution card "Compare with..."?
  - [ ] Auto-compare "latest vs previous"?

**Edge Cases:**
- What if workflows have different node counts?
  - Example: Original has 10 nodes, optimized has 8 (removed 2)
  - How to show "removed nodes" vs "improved nodes"?

- What if second execution is WORSE?
  - Duration increased from 5s → 8s
  - More bottlenecks instead of fewer
  - How to frame this? "Regression detected"?

- What if comparing DIFFERENT workflows?
  - User selects "Executive Pulse" vs "Lead Scoring"
  - Should we block this? Or allow with warning?

- What if no meaningful changes?
  - Duration: 5.2s → 5.1s (negligible)
  - Same bottlenecks
  - Verdict: "No significant improvement"?

**Write down your gut answers** - we'll refine in brainstorm.

---

## 4. Check Current Data Model (Optional, 5 mins)

### Confirm Schema Supports Grouping

**File:** `backend/app/db/schema.sql` or `docs/data-model.sql`

**Look for:**
```sql
CREATE TABLE executions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT,  -- ← This groups related executions
    workflow_name TEXT,
    duration REAL,
    created_at TIMESTAMP,
    ...
);
```

**Verify:**
- [ ] workflow_id exists (groups executions)
- [ ] created_at exists (for ordering)
- [ ] Can query: "Give me all executions with workflow_id X"

---

## 5. Screenshot Current Dashboard (5 mins)

### Capture "Before" State

**Take screenshots of:**
1. Dashboard with multiple executions (current flat list)
2. Single execution overview page
3. Bottlenecks view (for comparison reference)

**Why:** 
- Document current state before changes
- Reference for "what we're improving"
- Portfolio before/after shots

**Save to:** `/Users/scottcollier/dev/_shared/quick-share/signalflow/tier3-prep/`

---

## Prep Complete Checklist

Before brainstorm session, you should have:

- [ ] UX sketch of comparison view (paper or digital)
- [ ] Notes from LangSmith/competitor research
- [ ] Confirmed test data exists (Executive Pulse executions)
- [ ] Written answers to edge case questions
- [ ] Screenshots of current Dashboard
- [ ] Coffee ☕

---

## Ready for Brainstorm

**Bring to session:**
1. Your UX sketch
2. Edge case questions/answers
3. Test data execution IDs
4. Any concerns or excitement points

**We'll discuss:**
- Finalize comparison view design
- Decide on edge case handling
- Plan backend endpoints
- Map out implementation phases
- Create Claude Code prompts

---

## Notes Section

Use this space for any ideas that come up during prep:

```
[Your notes here]




```

---

**Goal:** Walk into brainstorm with clarity on WHAT we're building.
**Timeline:** Sprint starts after brainstorm when you're ready.
**Mindset:** This is the fun part - seeing the full loop come together! 🚀
