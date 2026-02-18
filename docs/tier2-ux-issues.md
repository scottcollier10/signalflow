# Tier 2 UX Issues - Evidence Flow & Information Architecture

## CONTEXT
After shipping Tier 1 (Week 5 Day 1), several systemic UX gaps emerged around evidence linking, navigation flow, and information hierarchy. These require holistic design thinking rather than one-off fixes.

**Philosophy:** "Analysis to Action" flow should be seamless with contextual evidence at point of decision.

---

## ISSUE 1: Evidence Access Pattern
**Current:** Evidence scattered across tabs with indirect linking
**Problem:** User has to navigate away from the problem to see the solution

### Bottleneck → Recommendation Flow
**Current:**
1. User on Bottlenecks tab sees `claude_api_call` with 66/100 score
2. Clicks "View Fix" button
3. Navigates to Recommendations tab with filter
4. Sees filtered recommendations for that node
5. Clicks recommendation to see evidence drawer

**Problems:**
- 3 clicks to see evidence
- Context switching between tabs
- Loses visual reference to bottleneck data
- Recommendation filter feels indirect

**Better Approaches:**
1. **Option A: Evidence Drawer on Bottleneck Page**
   - Click "View Fix" → drawer opens on right side of same page
   - Shows recommendations for that specific node
   - User can compare bottleneck data with recommendations simultaneously
   - Reuses existing `EvidenceDrawer` component

2. **Option B: Critical Path Navigation (Single Node)**
   - For single-node bottlenecks, go to Critical Path tab
   - Highlight the node in the execution flow
   - Shows recommendation inline below the node
   - User sees problem in execution context

3. **Option C: Smart Navigation (Multi-Node)**
   - Single bottleneck → Critical Path tab
   - Multiple bottlenecks → Recommendations tab with filter
   - Contextual based on problem complexity

### Overview → Detail Flow
**Current:**
1. Overview shows verdict banner "Optimization Recommended"
2. Click banner → goes to Recommendations tab
3. User loses overview context

**Better:**
- Banner click could open quick summary modal
- Modal shows top 3 bottlenecks + top 3 recommendations
- Modal has "View Full Analysis" → then navigates to tab

---

## ISSUE 2: Information Hierarchy - Bottleneck Cards
**Current Display:**
```
claude_api_call          ← Primary label (node_name)
unknown                  ← Secondary label (node_type)
```

**Problem:** 
- "unknown" is showing because backend normalizer doesn't extract node.type
- Node type is important for quick scanning (httpRequest, code, set, etc.)
- Not clear what "unknown" represents to user

**Options:**
1. **Fix normalizer** to extract actual node types from n8n execution JSON
2. **Hide node_type** if it's "unknown" (show only node_name)
3. **Swap hierarchy** if node_type is more useful than node_name
4. **Add node icon** based on type (API icon, Code icon, etc.)

**User's Question:**
> "Is that supposed to be the name of the node? that's the one thing missing that links them together."

**Investigation Needed:**
- What does n8n execution JSON contain for `node.type`?
- Is node_type always available in execution data?
- What are common node types (e.g., `n8n-nodes-base.httpRequest`)?

---

## ISSUE 3: Tab Navigation Logic Consistency
**Current:** Mixed patterns for where actions send you
- Verdict banner → Recommendations tab (makes sense)
- "View Fix" button → Recommendations tab (indirect for single node)
- Bottleneck card click → ??? (no current action)
- Top Recommendation click → Opens evidence drawer (good!)

**Better:** Establish navigation patterns
1. **Preview actions** → Open drawers/modals (stay on page)
2. **Detail actions** → Navigate to tabs (context switch)
3. **Quick actions** → Inline expand (no navigation)

---

## ISSUE 4: Evidence Drawer Reusability
**Current:** EvidenceDrawer only used from Recommendations tab
**Opportunity:** Reuse drawer from:
- Bottleneck cards (show recommendations for that node)
- Critical Path nodes (show recommendations for that node)
- Overview top recommendation (already works)

**Implementation:**
- Drawer accepts `nodeFilter` prop
- When opened from Bottleneck, filters recommendations automatically
- Same component, different entry points

---

## TIER 2 APPROACH - SYSTEMATIC FIX

### Phase 1: Information Architecture Map
**Tools:** Whiteboard + sticky notes
**Deliverable:** Flow diagram showing:
1. User entry points (Dashboard, Overview, Tabs)
2. Primary actions (View Fix, View Evidence, Click Card)
3. Evidence access patterns (Drawer, Navigation, Inline)
4. Information hierarchy (What's primary vs secondary)

### Phase 2: Navigation Pattern Decisions
**Questions to Answer:**
1. When should actions open drawers vs navigate?
2. Should Bottleneck cards be clickable? (To what?)
3. Should Critical Path nodes be clickable? (To what?)
4. How does node filter persist across tabs?

### Phase 3: Evidence Component Strategy
**Decisions:**
1. Reuse EvidenceDrawer from multiple entry points?
2. Create BottleneckDetailDrawer separate from RecommendationDrawer?
3. Inline expansion vs drawer vs modal?

### Phase 4: Implementation
1. Fix node_type extraction in normalizer
2. Implement chosen navigation patterns
3. Add evidence drawer to Bottleneck cards
4. Update Critical Path to show recommendations
5. Test entire analysis-to-action flow

---

## QUICK WINS (Can Ship Before Tier 2)

### 1. Fix "unknown" Node Type
**File:** `backend/src/analysis/normalizer.py`
**Change:** Extract `node.type` from n8n execution JSON
**Impact:** Shows actual node type like "httpRequest", "code", etc.
**Effort:** 30 minutes (if we know where type lives in JSON)

### 2. Hide "unknown" When Missing
**File:** `frontend/components/analysis/BottleneckView.tsx`
**Change:** Only show node_type if it's not "unknown"
**Impact:** Cleaner UI immediately
**Effort:** 5 minutes

---

## PARKING LOT (Good Ideas, Not Tier 2 Priority)

1. **Bottleneck card click** → Navigate to Critical Path with node highlighted
2. **Critical Path node click** → Open recommendations drawer for that node
3. **Verdict banner modal** → Quick summary before full navigation
4. **Node icons** → Visual indicators for node types
5. **Severity color coding** → Consistent across all views
6. **"Jump to" navigation** → Quick links from Overview to specific bottlenecks

---

## NOTES

- User feedback: "Some/most of these are probably/likely a full systematic approach instead of one-offs but we are too far down the line for this right now."
- User plan: "Maybe for tier 2 and 3 I sit back with sticky notes on a whiteboard."
- Current state: Tier 1 shipped, basic evidence flow works, but navigation feels indirect
- Priority: Ship working product now, refine UX systematically in Tier 2

---

## NEXT STEPS

1. **Immediate:** Ship Tier 1 as-is (banner + View Fix button working)
2. **Quick Fix:** Hide "unknown" node_type if easy
3. **Tier 2 Planning:** Whiteboard session for evidence flow IA
4. **Tier 2 Sprint:** Implement systematic navigation patterns

**Question for user:** Do you want to investigate the node_type issue now (15-30 min) or save for Tier 2?
