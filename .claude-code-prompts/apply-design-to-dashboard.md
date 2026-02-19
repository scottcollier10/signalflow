# CLAUDE CODE PROMPT: Apply Neumorphic Design to Dashboard

## Context
The neumorphic design system is now installed and working (verified at `/design-test`). Now we're applying it to the **Dashboard page** to create a portfolio-quality presentation.

**Current Dashboard:** Functional but using generic Tailwind defaults  
**Goal:** Transform into dark neumorphic aesthetic with depth and polish  
**Design System:** All tokens available in `tailwind.config.js` and `globals.css`

---

## Design System Reference

### Available Component Classes
```css
/* Buttons */
.btn-primary       /* Purple gradient, lifts on hover */
.btn-secondary     /* Neutral with accent hover */
.btn-tertiary      /* Transparent with hover */
.btn-icon          /* Icon-only button */

/* Badges */
.badge-success     /* Green background */
.badge-warning     /* Orange background */
.badge-error       /* Red/coral background */
.badge-info        /* Teal background */
.badge-neutral     /* Gray background */

/* Cards */
.card-neu          /* Raised card with hover lift */
.card-neu-flat     /* Flat gradient card */
.card-metric       /* Metric display card */

/* Shadows */
.neu-raised        /* Lifted element */
.neu-raised-sm     /* Small lift */
.neu-inset         /* Pressed effect */
.neu-flat          /* Subtle depth */

/* Inputs */
.input-neu         /* Text input with inset shadow */
.select-neu        /* Dropdown with inset shadow */
```

### Color Tokens
```
bg-neu-bg              /* #1e2028 - Main background */
text-neu-text          /* #d8d8e0 - Primary text */
text-neu-text-muted    /* #9a9eb0 - Secondary text */
text-neu-accent        /* #a89be0 - Purple accent */
text-neu-teal          /* #4dc9b0 - Success color */
text-neu-orange        /* #f0956a - Warning color */
text-neu-coral         /* #f08b7a - Error color */
text-neu-green         /* #5ed4a0 - Success badge */
```

### Typography
```
font-display           /* Outfit - For headings */
font-body              /* DM Sans - For body text */
```

---

## Dashboard Page Structure

**File:** `frontend/app/dashboard/page.tsx`

### Current Sections to Redesign
1. **Page Header** - "Execution Dashboard" + Import button
2. **Filter Controls** - Status dropdown, Group by dropdown, Refresh
3. **Workflow Groups** - Execution cards grouped by workflow
4. **Execution Cards** - Individual execution summaries
5. **Empty State** - "No workflows found" message

---

## Section-by-Section Transformation

### 1. Page Background & Container

**Current:** Likely white/light background  
**New:** Dark neumorphic background

```tsx
// Change main container
<div className="min-h-screen bg-neu-bg p-8">
  <div className="max-w-7xl mx-auto space-y-8">
    {/* Dashboard content */}
  </div>
</div>
```

---

### 2. Page Header

**Current:** Basic header with title  
**New:** Neumorphic header with gradient title

```tsx
<div className="flex items-center justify-between mb-8">
  <div>
    <h1 className="font-display text-4xl font-bold text-neu-text mb-2">
      Execution Dashboard
    </h1>
    <p className="text-neu-text-muted font-body">
      5 executions across 2 workflows
    </p>
  </div>
  
  <button className="btn-primary">
    Import Execution
  </button>
</div>
```

**Key Changes:**
- Use `font-display` for heading
- Use `text-neu-text` for primary text
- Use `text-neu-text-muted` for subtitle
- Replace button with `btn-primary` class

---

### 3. Filter Controls

**Current:** Basic dropdowns and refresh button  
**New:** Neumorphic controls with proper spacing

```tsx
<div className="neu-raised p-4 flex items-center gap-4 mb-6">
  <div className="flex items-center gap-2">
    <label className="text-sm font-medium text-neu-text-muted">
      Status:
    </label>
    <select className="select-neu">
      <option>All</option>
      <option>Success</option>
      <option>Error</option>
      <option>Cancelled</option>
    </select>
  </div>
  
  <div className="flex items-center gap-2">
    <label className="text-sm font-medium text-neu-text-muted">
      Group by:
    </label>
    <select className="select-neu">
      <option>Workflow</option>
      <option>Status</option>
      <option>Date</option>
    </select>
  </div>
  
  <button className="btn-icon ml-auto">
    <svg className="w-5 h-5" /* refresh icon */>
  </button>
</div>
```

**Key Changes:**
- Wrap in `neu-raised` container
- Use `select-neu` for dropdowns
- Use `btn-icon` for refresh button
- Use `text-neu-text-muted` for labels

---

### 4. Workflow Group Header

**Current:** Text heading for each workflow  
**New:** Neumorphic section header with metadata

```tsx
<div className="space-y-4">
  {/* Group Header */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-neu-accent" />
      <h2 className="font-display text-2xl font-semibold text-neu-text">
        Executive Pulse - Ingest Mock Data (Test)
      </h2>
    </div>
    <span className="text-sm text-neu-text-muted">
      2 executions • <span className="text-neu-green">2 passed</span>
    </span>
  </div>
  
  {/* Execution cards */}
</div>
```

**Key Changes:**
- Add accent color dot indicator
- Use `font-display` for workflow name
- Show execution summary with color coding
- Use `text-neu-green` for success count

---

### 5. Execution Cards (CRITICAL SECTION)

**Current:** Basic card layout  
**New:** Portfolio-quality neumorphic cards

```tsx
<div className="card-neu">
  {/* Card Header */}
  <div className="flex items-center justify-between mb-4">
    {/* Status Badge */}
    <span className="badge-success">Success</span>
    
    {/* Metadata */}
    <div className="flex items-center gap-4 text-sm text-neu-text-muted">
      <span>Feb 5, 10:18 PM</span>
      <span className="badge-neutral">0 errors</span>
    </div>
  </div>
  
  {/* Metrics Grid */}
  <div className="grid grid-cols-3 gap-4 mb-6">
    {/* Duration */}
    <div className="text-center">
      <p className="text-3xl font-display font-bold text-neu-accent mb-1">
        1.6s
      </p>
      <p className="text-sm text-neu-text-muted">Duration</p>
    </div>
    
    {/* Nodes */}
    <div className="text-center">
      <p className="text-3xl font-display font-bold text-neu-text mb-1">
        13
      </p>
      <p className="text-sm text-neu-text-muted">Nodes</p>
    </div>
    
    {/* n8n ID */}
    <div className="text-center">
      <p className="text-3xl font-display font-bold text-neu-text mb-1">
        4745
      </p>
      <p className="text-sm text-neu-text-muted">n8n ID</p>
    </div>
  </div>
  
  {/* Action Buttons */}
  <div className="flex gap-3">
    <button className="btn-primary flex-1">
      View Analysis
    </button>
    <button className="btn-icon">
      <svg className="w-5 h-5" /* trash icon */>
    </button>
  </div>
</div>
```

**Key Changes:**
- Use `card-neu` for main container (adds hover lift)
- Use badge classes for status (`badge-success`, etc.)
- Use `text-neu-accent` for primary metric (duration)
- Use `text-neu-text` for secondary metrics
- Use `text-neu-text-muted` for labels
- Use `btn-primary` for main action
- Use `btn-icon` for delete button
- Use `font-display` for large numbers

---

### 6. Status Badge Mapping

**Map execution status to badge classes:**

```tsx
function getStatusBadge(status: string) {
  const badges = {
    'success': 'badge-success',
    'error': 'badge-error',
    'cancelled': 'badge-neutral',
    'running': 'badge-info',
  };
  
  return badges[status] || 'badge-neutral';
}

// Usage
<span className={getStatusBadge(execution.status)}>
  {execution.status}
</span>
```

---

### 7. Optimization Recommended Badge

**For executions with recommendations:**

```tsx
{execution.has_recommendations && (
  <span className="badge-warning flex items-center gap-1">
    <svg className="w-3 h-3" /* sparkle icon */>
    Optimization Recommended
  </span>
)}
```

---

### 8. Empty State

**Current:** Basic "no workflows" message  
**New:** Neumorphic empty state with visual appeal

```tsx
<div className="neu-flat p-12 text-center">
  <div className="w-20 h-20 rounded-full bg-neu-accent/10 flex items-center justify-center mx-auto mb-6">
    <svg className="w-10 h-10 text-neu-accent" /* workflow icon */>
  </svg>
  
  <h3 className="font-display text-2xl font-semibold text-neu-text mb-2">
    No workflows found
  </h3>
  
  <p className="text-neu-text-muted mb-6 max-w-md mx-auto">
    Start by importing a new n8n workflow execution to optimize
  </p>
  
  <button className="btn-primary">
    + New Execution
  </button>
</div>
```

**Key Changes:**
- Use `neu-flat` for container
- Add icon circle with accent color
- Use `font-display` for heading
- Use `text-neu-text-muted` for description
- Use `btn-primary` for CTA

---

## Special Handling

### Optimized Execution Badge

For executions that have been optimized (like #4745):

```tsx
{execution.is_optimized && (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neu-teal/10 border border-neu-teal/30">
    <svg className="w-4 h-4 text-neu-teal" /* checkmark */>
    <span className="text-sm font-semibold text-neu-teal">
      Optimized
    </span>
  </div>
)}
```

---

### Error Count Badge

Show error count prominently when > 0:

```tsx
{execution.error_count > 0 && (
  <span className="badge-error">
    {execution.error_count} {execution.error_count === 1 ? 'error' : 'errors'}
  </span>
)}
```

---

### Duration Delta (Before/After)

If comparing executions:

```tsx
{execution.duration_delta && (
  <div className="flex items-center gap-1 text-sm">
    <span className="text-neu-green font-semibold">
      ↓ {Math.abs(execution.duration_delta)}%
    </span>
    <span className="text-neu-text-muted">faster</span>
  </div>
)}
```

---

## Animation Enhancements

### Staggered Card Entrance

Add animation delays to cards:

```tsx
{executions.map((execution, index) => (
  <div 
    key={execution.id}
    className={`card-neu animate-fade-in-up animate-stagger-${Math.min(index + 1, 5)}`}
  >
    {/* Card content */}
  </div>
))}
```

**Note:** Max stagger is 5, so use `Math.min(index + 1, 5)`

---

## Responsive Design

Ensure cards stack on mobile:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Execution cards */}
</div>
```

For metrics inside cards:

```tsx
<div className="grid grid-cols-3 gap-4">
  {/* Metrics remain 3-column even on mobile */}
</div>
```

---

## Color Coding Guidelines

### Durations
- **< 1s:** `text-neu-green` (excellent)
- **1-5s:** `text-neu-teal` (good)
- **5-10s:** `text-neu-orange` (moderate)
- **> 10s:** `text-neu-coral` (needs optimization)

### Status Colors
- **Success:** `badge-success` (green)
- **Error:** `badge-error` (coral)
- **Cancelled:** `badge-neutral` (gray)
- **Running:** `badge-info` (teal)

### Metrics
- **Primary metric** (duration): `text-neu-accent` (purple)
- **Secondary metrics** (nodes, ID): `text-neu-text` (white)
- **Labels:** `text-neu-text-muted` (gray)

---

## Implementation Steps

### Step 1: Update Page Container
- Change background to `bg-neu-bg`
- Update text colors to neu palette
- Set max-width container

### Step 2: Transform Header Section
- Apply `font-display` to heading
- Use `btn-primary` for Import button
- Add subtitle with execution count

### Step 3: Redesign Filter Controls
- Wrap in `neu-raised` container
- Convert dropdowns to `select-neu`
- Use `btn-icon` for refresh

### Step 4: Update Workflow Group Headers
- Add accent dot indicator
- Use `font-display` for names
- Show execution summary

### Step 5: Transform Execution Cards
- Apply `card-neu` wrapper
- Update badge classes
- Use color-coded metrics
- Apply `btn-primary` to actions

### Step 6: Polish Empty State
- Use `neu-flat` container
- Add icon circle
- Use proper typography hierarchy

### Step 7: Add Animations
- Apply `animate-fade-in-up` to cards
- Use stagger delays for sequential reveal

---

## Verification Checklist

After implementation:

### Visual Check
- [ ] Dark background (#1e2028)
- [ ] Outfit font on headings
- [ ] DM Sans font on body text
- [ ] Cards have 3D depth shadows
- [ ] Cards lift on hover
- [ ] Primary button has purple gradient
- [ ] Badges show colored backgrounds
- [ ] Dropdowns have inset effect

### Functional Check
- [ ] Import button works
- [ ] View Analysis buttons work
- [ ] Delete buttons work
- [ ] Dropdowns filter correctly
- [ ] Refresh button works

### Design Quality
- [ ] Proper color coding (duration colors)
- [ ] Status badges match execution state
- [ ] Metrics are clearly readable
- [ ] Spacing feels comfortable
- [ ] Hover effects are smooth

### Responsive Check
- [ ] Cards stack on mobile
- [ ] Buttons remain accessible
- [ ] Text doesn't overflow

---

## Expected Result

**Before:** Generic dashboard with basic styling  
**After:** Portfolio-quality dark neumorphic interface with:
- Professional depth through shadows
- Color-coded metrics for quick scanning
- Smooth hover interactions
- Clear visual hierarchy
- Distinctive brand aesthetic

---

## Testing URLs

After implementation:
1. Visit: `http://localhost:3001/dashboard`
2. Verify all executions display correctly
3. Test hover effects on cards
4. Test all buttons and interactions
5. Compare to `/design-test` to ensure consistency

---

## Notes

- Maintain all existing functionality
- Don't change any data fetching logic
- Only update styling and component classes
- Keep component structure similar for easy review
- Focus on visual polish, not refactoring

---

## Success Metrics

Dashboard redesign is complete when:
- ✅ All sections use neumorphic design system
- ✅ Cards have proper depth and hover effects
- ✅ Colors match design tokens
- ✅ Typography uses Outfit + DM Sans
- ✅ All interactions work smoothly
- ✅ Responsive layout functions correctly
- ✅ User says "this looks portfolio-ready!"

