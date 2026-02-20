# CLAUDE CODE PROMPT: Tactical UX Fixes

## Context
Apply 5 specific design adjustments based on user feedback. These are surgical changes to improve visual hierarchy and reduce noise.

---

## Fix 1: Dashboard - Outline Button Style

**File:** `frontend/app/dashboard/page.tsx`

**Current:** "View Analysis" button uses `btn-primary` (filled purple gradient)

**Change to:** Purple outline button with dark gray background

**New Button Class:**
```tsx
// Find all "View Analysis" buttons and replace with:
<button className="px-6 py-3 rounded-neu font-semibold border-2 border-neu-accent bg-neu-shadow-light text-neu-accent transition-all duration-300 hover:-translate-y-0.5 hover:bg-neu-accent/10">
  View Analysis
</button>
```

**Visual Result:**
- Border: Purple (#a89be0)
- Background: Dark gray (#282c38)
- Text: Purple (#a89be0)
- Hover: Slight lift + purple glow background

**Why:** Reduces visual weight, maintains hierarchy without overwhelming with purple fills

---

## Fix 2: Overview - Remove Optimization Banner

**File:** `frontend/app/execution/[id]/page.tsx` (or wherever Overview page is)

**Current:** Has yellow/orange banner saying "Optimization Recommended"

**Action:** DELETE the entire banner section

**Find and Remove:**
```tsx
{/* Remove this entire block */}
<div className="neu-flat p-4 mb-6 border-l-4 border-neu-orange">
  <div className="flex items-start gap-3">
    <svg className="w-6 h-6 text-neu-orange flex-shrink-0">
    <div className="flex-1">
      <h3 className="font-display font-semibold text-neu-text mb-1">
        Optimization Recommended
      </h3>
      <p className="text-sm text-neu-text-muted">
        2 high-impact bottlenecks found. Optimization recommended.
      </p>
    </div>
    <button className="btn-tertiary text-sm">
      View →
    </button>
  </div>
</div>
```

**Why:** Redundant with badges at top-right, adds visual noise, ill-conceived placement

**Keep:** The badges at top-right (11 critical nodes, 10 bottlenecks, 6 recommendations) - these are fine

---

## Fix 3: Playback - Move Into Tab Frame

**Files:** 
- `frontend/app/execution/[id]/page.tsx` (main layout)
- `frontend/app/execution/[id]/playback/page.tsx` (or similar)

**Current Issue:** 
- Playback loads in separate frame
- Removes navigation
- White background
- Jarring UX

**Solution:** Ensure Playback renders within the same tab container as other tabs

**Expected Structure:**
```tsx
<div className="min-h-screen bg-neu-bg p-8">
  {/* Header with Back button, title, metadata */}
  
  {/* Tab Navigation */}
  <div className="neu-raised-sm p-1 mb-6 inline-flex gap-1">
    <TabButton active={tab === 'overview'}>Overview</TabButton>
    <TabButton active={tab === 'playback'}>Playback</TabButton>
    <TabButton active={tab === 'critical-path'}>Critical Path</TabButton>
    {/* ... more tabs */}
  </div>
  
  {/* Tab Content Area */}
  <div>
    {tab === 'overview' && <OverviewTab />}
    {tab === 'playback' && <PlaybackTab />}  {/* Should stay in frame */}
    {tab === 'critical-path' && <CriticalPathTab />}
    {/* ... */}
  </div>
</div>
```

**Playback Tab Should Have:**
- Dark background (`bg-neu-bg`)
- Same padding/spacing as other tabs
- Navigation stays visible
- Controls at top in `neu-raised-sm` container

**Why:** Consistent navigation, no jarring transitions, matches dark theme

---

## Fix 4: Bottlenecks - Remove Borders & Buttons

**File:** `frontend/app/execution/[id]/bottlenecks/page.tsx` (or similar)

**Remove 1: Left Color Borders on Cards**

**Find:**
```tsx
// Current card might have:
<div className="card-neu border-l-4 border-neu-orange">

// Change to:
<div className="card-neu">
```

**Remove all instances of:**
- `border-l-4`
- `border-neu-orange`
- `border-neu-coral`
- Any left border styling on bottleneck cards

---

**Remove 2: "View Fix" Buttons**

**Find and DELETE:**
```tsx
{/* Remove these buttons from bottleneck cards */}
<button className="btn-tertiary text-neu-accent">
  View Fix →
</button>

// Or similar buttons labeled "View Fix"
```

**Keep:** 
- Card structure
- Severity score badge
- Duration metrics
- "On Critical Path" badge

**Why:** Reduces visual clutter, "View Fix" doesn't belong in this diagnostic view

---

## Fix 5: Recommendations - Orange Optimize Button

**File:** `frontend/app/execution/[id]/recommendations/page.tsx` (or similar)

**Current:** Button labeled "Export"

**Change to:** "Optimize" button with orange styling and icon

**Find:**
```tsx
// Current Export button
<button className="btn-primary">
  Export
</button>
```

**Replace with:**
```tsx
<button className="px-6 py-3 rounded-neu font-semibold bg-neu-orange text-neu-bg shadow-neu-raised-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-neu-raised flex items-center gap-2">
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
  Optimize
</button>
```

**Alternative Icon (Claude sparkle):**
```tsx
<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 2L9 9l-7 3 7 3 3 7 3-7 7-3-7-3-3-7z" />
</svg>
```

**Alternative Icon (Circular arrows):**
```tsx
<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  <path d="M1 4v6h6M23 20v-6h-6" />
  <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
</svg>
```

**Visual Result:**
- Background: Bright orange (#f0956a)
- Text: Dark gray (#1e2028)
- Icon: Circular arrows or Claude sparkle
- Hover: Lifts with shadow

**Why:** Orange signals action/optimization, stands out from purple primary actions

---

## Verification Checklist

After implementing:

### Dashboard
- [ ] "View Analysis" buttons have purple outline
- [ ] Buttons have dark gray background
- [ ] Hover effect works (lift + glow)

### Overview
- [ ] "Optimization Recommended" banner removed
- [ ] Top-right badges still visible (critical nodes, bottlenecks, recommendations)
- [ ] No visual gap where banner was

### Playback
- [ ] Tab stays in same frame as other tabs
- [ ] Navigation bar remains visible
- [ ] Dark background throughout
- [ ] Controls use neumorphic styling

### Bottlenecks
- [ ] No left colored borders on cards
- [ ] No "View Fix" buttons
- [ ] Cards still show severity scores
- [ ] "On Critical Path" badges remain

### Recommendations
- [ ] Button labeled "Optimize" (not "Export")
- [ ] Button is bright orange
- [ ] Text is dark gray
- [ ] Icon visible (circular arrows or sparkle)
- [ ] Hover effect works

---

## Testing

Visit these pages after changes:
1. `http://localhost:3001/dashboard` - Check button style
2. `http://localhost:3001/execution/[id]` - Check banner removal
3. `http://localhost:3001/execution/[id]/playback` - Check frame/navigation
4. `http://localhost:3001/execution/[id]/bottlenecks` - Check no borders/buttons
5. `http://localhost:3001/execution/[id]/recommendations` - Check orange button

---

## Notes

These are surgical fixes - don't refactor, just adjust styling:
- Button classes
- Remove sections
- Fix navigation structure
- Change colors

Keep all functionality intact, just polish the visuals.

