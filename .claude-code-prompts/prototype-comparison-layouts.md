# Prototype 3 Comparison View Layouts

## Context
Create 3 different visual layouts for the before/after comparison feature using **real Executive Pulse workflow data**. These are interactive prototypes to help decide which layout works best.

## Real Data to Use

### Execution Comparison: Executive Pulse
```javascript
const comparisonData = {
  workflow_name: "Executive Pulse V2",
  
  before: {
    execution_id: "4671",  // Original version
    timestamp: "Jan 29, 1:30 PM",
    duration: 13100,  // 13.1 seconds
    status: "success",
    node_count: 72,
    bottlenecks: {
      severe: 2,   // 90-100 score
      high: 3,     // 70-89 score  
      medium: 5,   // 50-69 score
      total: 10
    },
    recommendations: 6,
    critical_path: {
      duration: 13100,
      nodes: 7,
      coverage: 100  // % of total time
    }
  },
  
  after: {
    execution_id: "4733",  // Optimized version
    timestamp: "Jan 29, 1:50 PM", 
    duration: 1600,  // 1.6 seconds
    status: "success",
    node_count: 72,
    bottlenecks: {
      severe: 0,
      high: 0,
      medium: 0, 
      total: 0
    },
    recommendations: 0,
    critical_path: {
      duration: 1600,
      nodes: 7,
      coverage: 100
    }
  },
  
  delta: {
    duration_saved: 11500,  // milliseconds
    pct_improvement: 87.8,
    bottlenecks_resolved: 10,
    verdict: "Excellent optimization"
  },
  
  // Top node improvements
  top_improvements: [
    {
      node_name: "delete_existing_data",
      before_duration: 11000,
      after_duration: 8,
      saved: 10992,
      pct_improvement: 99.93,
      bottleneck_before: 95,  // score
      bottleneck_after: 0,
      impact: "Removed from critical path"
    },
    {
      node_name: "get_previous_week_values",
      before_duration: 1500,
      after_duration: 100,
      saved: 1400,
      pct_improvement: 93.3,
      bottleneck_before: 64,
      bottleneck_after: 0,
      impact: "Significant speedup"
    },
    {
      node_name: "claude_api_call",
      before_duration: 500,
      after_duration: 350,
      saved: 150,
      pct_improvement: 30,
      bottleneck_before: 55,
      bottleneck_after: 0,
      impact: "Moderate improvement"
    }
  ]
};
```

## Create 3 Layout Variants

### Variant A: Side-by-Side Cards (LangSmith Style)
**File:** `frontend/app/comparison/variant-a/page.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Executive Pulse - Comparison                    │
│ v4671 → v4733                                   │
├──────────────────┬──────────────────────────────┤
│ BEFORE           │ AFTER                        │
│                  │                              │
│ ┌──────────────┐ │ ┌──────────────┐            │
│ │   13.1s      │ │ │    1.6s      │            │
│ │   Duration   │ │ │   Duration   │            │
│ └──────────────┘ │ └──────────────┘            │
│                  │                              │
│ 10 Bottlenecks   │ 0 Bottlenecks ✅            │
│ 6 Recommendations│ 0 Recommendations ✅         │
│                  │                              │
└──────────────────┴──────────────────────────────┘

[Big green delta card: ⬇️ 87.8% improvement]

[Top 3 Node Improvements - Cards]
┌─────────────────────────────────────┐
│ delete_existing_data                │
│ 11.0s → 8ms  (-99.93%)             │
│ Impact: Removed from critical path  │
└─────────────────────────────────────┘
```

**Key features:**
- Two-column layout
- Big numbers for duration (make these huge and impactful)
- Green delta card showing overall improvement
- Node improvement cards below
- Use neumorphic `neu-flat` cards
- Color coding: red/orange for before, green for after

---

### Variant B: Unified Timeline (Overlay Style)
**File:** `frontend/app/comparison/variant-b/page.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Executive Pulse - Optimization Results          │
├─────────────────────────────────────────────────┤
│                                                 │
│ ⬇️ 87.8% Faster   11.5s saved   ✅ 10 resolved │
│                                                 │
│ [Timeline Visualization]                        │
│ Before: ████████████████████████████ 13.1s     │
│ After:  ███ 1.6s                               │
│                                                 │
│ Critical Path Comparison                        │
│ ┌─────────────────────────────────────┐        │
│ │ BEFORE (red overlay):  [graph]      │        │
│ │ AFTER  (green overlay): [graph]     │        │
│ └─────────────────────────────────────┘        │
│                                                 │
└─────────────────────────────────────────────────┘

[Node Breakdown Table]
Node                  Before    After     Δ
────────────────────────────────────────────
delete_existing_data  11.0s     8ms      -99.93%
get_previous_week_    1.5s      100ms    -93%
...
```

**Key features:**
- Single-column flow
- Big improvement metrics at top
- Timeline bars showing before/after visually
- Critical path overlay (before in red, after in green)
- Table of node changes below
- More data-dense, less visual separation

---

### Variant C: Table-First (Data-Heavy)
**File:** `frontend/app/comparison/variant-c/page.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Executive Pulse - Performance Comparison         │
├──────────────┬──────────────┬───────────────────┤
│ Metric       │ Before       │ After    │ Change │
├──────────────┼──────────────┼──────────┼────────┤
│ Duration     │ 13.1s        │ 1.6s     │ ⬇️ -88%│
│ Bottlenecks  │ 10 (2 severe)│ 0        │ ✅ All │
│ Errors       │ 0            │ 0        │ ✓      │
│ Critical Path│ 13.1s (100%) │ 1.6s     │ ⬇️ -88%│
└──────────────┴──────────────┴──────────┴────────┘

[Verdict Card]
✅ Excellent Optimization
87.8% improvement with zero regressions.

[Node-Level Changes - Expandable Rows]
▼ Top Improvements (3)
  ┌────────────────────────────────────────────┐
  │ delete_existing_data                       │
  │ Before: 11.0s (Severe) | After: 8ms       │
  │ Saved: 10.99s (-99.93%)                   │
  └────────────────────────────────────────────┘
  
▼ Minor Improvements (5)
▼ Unchanged (64)
```

**Key features:**
- Comparison table at top (like GitHub PR files changed)
- Verdict card with emoji
- Expandable sections for node changes (collapsed by default)
- Most data-dense option
- Good for technical users who want numbers

---

## Design System Requirements

### Use Existing Components
- Import from `@/components/ui/*` if available
- Use neumorphic design tokens:
  - `neu-flat` for cards
  - `neu-raised` for buttons
  - `neu-accent` for highlights
  - `neu-success` for improvements
  - `neu-warning` for regressions

### Color Coding
```javascript
// Before metrics (original)
- Use red/orange tones (#ef4444, #f97316)
- Indicate "needs improvement"

// After metrics (optimized)  
- Use green tones (#10b981, #22c55e)
- Indicate "success/improvement"

// Delta/Change
- Green for improvements (⬇️ duration, ✅ resolved)
- Red for regressions (⬆️ duration, ⚠️ new issues)
- Gray for neutral/unchanged
```

### Typography Scale
```javascript
// Big impact numbers
duration: "text-6xl font-bold"  // 13.1s / 1.6s

// Delta percentages
delta: "text-4xl font-semibold text-green-400"  // -88%

// Section headers
headers: "text-xl font-semibold"

// Node names
nodes: "text-base font-mono"  // delete_existing_data

// Metrics
metrics: "text-sm text-neu-text-secondary"
```

## Implementation Notes

### Create Routes
Each variant should be a separate page:
```
/comparison/variant-a  (side-by-side)
/comparison/variant-b  (timeline)
/comparison/variant-c  (table)
```

### Add Navigation
Create a simple nav at top to switch between variants:
```tsx
<div className="flex gap-2 mb-8">
  <Link href="/comparison/variant-a">Variant A</Link>
  <Link href="/comparison/variant-b">Variant B</Link>
  <Link href="/comparison/variant-c">Variant C</Link>
</div>
```

### Mock Data in Component
Each variant should have the comparison data hardcoded (from above) so it renders immediately without backend calls.

### Make It Interactive
Add hover states, click interactions where appropriate:
- Node cards expand to show details
- Timeline bars are draggable/zoomable (optional)
- Verdict card is clickable (optional)

## Testing Checklist

After creating all 3 variants:

- [ ] All 3 routes work (`/comparison/variant-a`, etc.)
- [ ] Navigation between variants works
- [ ] Data displays correctly (13.1s → 1.6s, 87.8%, etc.)
- [ ] Colors match design system (green for good, red for before)
- [ ] Typography scales properly (big numbers are BIG)
- [ ] Dark mode looks good (neumorphic shadows visible)
- [ ] Responsive on desktop (mobile optional for prototypes)

## Success Criteria

When done, Scott should be able to:
1. View all 3 variants in browser
2. Compare layouts side-by-side
3. Pick which one feels most impactful
4. Give feedback: "Variant A but with X from Variant C"

## Notes

- These are PROTOTYPES, not production code
- Goal is to decide on layout, not perfect implementation
- Use real data so it feels authentic
- Don't worry about edge cases (regressions, no changes, etc.) yet
- Focus on the happy path: successful optimization

## Expected Output

3 working pages with real data, different layouts, ready to evaluate.
