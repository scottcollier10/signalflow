# CLAUDE CODE PROMPT: Apply Neumorphic Design to All Pages

## Context
Dashboard redesign is complete and looks great! Now we need to apply the same neumorphic design system to ALL remaining pages for visual consistency.

**Completed:** Dashboard ✅  
**To Do:** Overview, Critical Path, Bottlenecks, Recommendations, Errors, Playback, Import

**Goal:** Portfolio-quality neumorphic aesthetic across the entire app

---

## Design System Reference

### Core Classes
```css
/* Backgrounds & Containers */
bg-neu-bg              /* Main background */
neu-raised             /* Raised card with shadow */
neu-raised-sm          /* Small raised element */
neu-flat               /* Flat gradient card */
neu-inset              /* Inset/pressed effect */

/* Buttons */
btn-primary            /* Purple gradient */
btn-secondary          /* Neutral with hover */
btn-tertiary           /* Transparent with hover */
btn-icon               /* Icon-only button */

/* Badges */
badge-success          /* Green */
badge-warning          /* Orange */
badge-error            /* Coral/red */
badge-info             /* Teal */
badge-neutral          /* Gray */

/* Typography */
font-display           /* Outfit - headings */
font-body              /* DM Sans - body */
text-neu-text          /* Primary text */
text-neu-text-muted    /* Secondary text */
text-neu-accent        /* Purple accent */

/* Inputs */
input-neu              /* Text input */
select-neu             /* Dropdown */
textarea-neu           /* Textarea */
```

---

## Page-by-Page Transformation

### 1. Overview Page (PRIORITY - Current "Disaster")

**File:** `frontend/app/execution/[id]/page.tsx` (or similar)

**Current Issues:**
- ❌ White background
- ❌ Light-colored metric cards
- ❌ Old yellow banner style
- ❌ Light cards for bottlenecks/recommendations
- ❌ No neumorphic depth

**Transformations:**

#### Page Background
```tsx
// Change from white to dark
<div className="min-h-screen bg-neu-bg p-8">
```

#### Header Section
```tsx
<div className="mb-6">
  <button className="btn-tertiary mb-4">
    ← Back
  </button>
  
  <div className="flex items-center justify-between">
    <div>
      <h1 className="font-display text-3xl font-bold text-neu-text mb-2">
        Executive Pulse - Ingest Mock Data (Test)
      </h1>
      <div className="flex items-center gap-4 text-sm text-neu-text-muted">
        <span className="badge-success">success</span>
        <span>Duration: 13.06s</span>
        <span>ID: b9b9bb6c...</span>
      </div>
    </div>
    
    <div className="flex items-center gap-3">
      <span className="text-neu-accent font-semibold">11 critical nodes</span>
      <span className="text-neu-orange font-semibold">10 bottlenecks</span>
      <span className="text-neu-accent font-semibold">6 recommendations</span>
    </div>
  </div>
</div>
```

#### Tab Navigation
```tsx
<div className="neu-raised-sm p-1 mb-6 inline-flex gap-1">
  <button className="px-4 py-2 rounded-lg bg-neu-accent text-neu-bg font-medium">
    Overview
  </button>
  <button className="px-4 py-2 rounded-lg text-neu-text-muted hover:text-neu-text transition-colors">
    Playback
  </button>
  <button className="px-4 py-2 rounded-lg text-neu-text-muted hover:text-neu-text transition-colors">
    Critical Path
  </button>
  {/* ... more tabs */}
</div>
```

#### Optimization Banner
```tsx
{/* Replace yellow banner with neumorphic alert */}
<div className="neu-flat p-4 mb-6 border-l-4 border-neu-orange">
  <div className="flex items-start gap-3">
    <svg className="w-6 h-6 text-neu-orange flex-shrink-0" /* warning icon */>
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

#### Executive Summary Cards
```tsx
<div className="grid grid-cols-4 gap-6 mb-8">
  {/* Critical Path % */}
  <div className="card-metric">
    <p className="text-4xl font-display font-bold text-neu-accent mb-2">
      100%
    </p>
    <p className="text-sm text-neu-text-muted mb-1">
      of total execution
    </p>
    <p className="text-xs text-neu-accent">
      11 nodes on critical path
    </p>
  </div>
  
  {/* High-Impact Bottlenecks */}
  <div className="card-metric">
    <p className="text-4xl font-display font-bold text-neu-orange mb-2">
      2
    </p>
    <p className="text-sm text-neu-text-muted mb-1">
      high-impact bottlenecks
    </p>
    <p className="text-xs text-neu-orange">
      11 total nodes analyzed
    </p>
  </div>
  
  {/* Errors */}
  <div className="card-metric">
    <p className="text-4xl font-display font-bold text-neu-green mb-2">
      0
    </p>
    <p className="text-sm text-neu-text-muted mb-1">
      clean execution
    </p>
    <p className="text-xs text-neu-green">
      No errors detected
    </p>
  </div>
  
  {/* Recommendations */}
  <div className="card-metric">
    <p className="text-4xl font-display font-bold text-neu-accent mb-2">
      6
    </p>
    <p className="text-sm text-neu-text-muted mb-1">
      recommendations
    </p>
    <p className="text-xs text-neu-accent">
      6 performance, 0 reliability
    </p>
  </div>
</div>
```

#### Top Bottlenecks Card
```tsx
<div className="card-neu mb-6">
  <h2 className="font-display text-xl font-semibold text-neu-text mb-4">
    Top Bottlenecks
  </h2>
  
  <div className="space-y-3">
    {/* Bottleneck Item */}
    <div className="neu-flat p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-body font-semibold text-neu-text">
          delete_existing_data
        </h3>
        <span className="badge-error">68/100</span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-neu-coral font-semibold">11.0s</span>
        <span className="badge-error text-xs">Critical Path</span>
      </div>
    </div>
    
    {/* Repeat for more bottlenecks */}
  </div>
</div>
```

#### Top Recommendation Card
```tsx
<div className="card-neu mb-6">
  <h2 className="font-display text-xl font-semibold text-neu-text mb-4">
    Top Recommendation
  </h2>
  
  <div className="neu-flat p-5">
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-body font-semibold text-neu-text">
        Review Workflow Architecture
      </h3>
      <span className="badge-warning">MEDIUM</span>
    </div>
    
    <p className="text-sm text-neu-text-muted mb-4">
      Found 4 medium bottlenecks. Consider reviewing overall workflow design.
    </p>
    
    <div className="flex items-center justify-between text-sm">
      <div>
        <span className="text-neu-text-muted">Priority: 64.3/100</span>
        <span className="text-neu-green font-semibold ml-4">Save 2.6s</span>
      </div>
      <button className="btn-tertiary text-neu-accent">
        Click to view evidence and code example →
      </button>
    </div>
  </div>
</div>
```

---

### 2. Critical Path Page

**Transformations:**

#### Page Container
```tsx
<div className="min-h-screen bg-neu-bg p-8">
```

#### Summary Metrics
```tsx
<div className="grid grid-cols-3 gap-6 mb-8">
  <div className="card-metric">
    <p className="text-sm text-neu-text-muted mb-2">Total Duration</p>
    <p className="text-4xl font-display font-bold text-neu-coral">13.1s</p>
  </div>
  
  <div className="card-metric">
    <p className="text-sm text-neu-text-muted mb-2">Nodes on Critical Path</p>
    <p className="text-4xl font-display font-bold text-neu-accent">11</p>
  </div>
  
  <div className="card-metric">
    <p className="text-sm text-neu-text-muted mb-2">Path Coverage</p>
    <div className="flex items-baseline gap-2">
      <p className="text-4xl font-display font-bold text-neu-accent">100%</p>
    </div>
  </div>
</div>
```

#### Critical Path Nodes List
```tsx
<div className="card-neu">
  <h2 className="font-display text-2xl font-semibold text-neu-text mb-6">
    Critical Path Nodes
  </h2>
  
  <div className="space-y-3">
    {nodes.map((node, index) => (
      <div key={node.id} className="neu-flat p-4">
        <div className="flex items-center gap-4">
          {/* Step Number */}
          <div className="w-8 h-8 rounded-full bg-neu-accent/20 flex items-center justify-center">
            <span className="text-sm font-semibold text-neu-accent">
              {index + 1}
            </span>
          </div>
          
          {/* Node Info */}
          <div className="flex-1">
            <h3 className="font-body font-semibold text-neu-text mb-1">
              {node.name}
            </h3>
            <p className="text-sm text-neu-text-muted">
              {node.type}
            </p>
          </div>
          
          {/* Duration Bar */}
          <div className="w-64">
            <div className="h-2 bg-neu-bg rounded-full overflow-hidden">
              <div 
                className="h-full bg-neu-coral rounded-full"
                style={{ width: `${node.percentOfPath}%` }}
              />
            </div>
          </div>
          
          {/* Metrics */}
          <div className="text-right">
            <p className="font-semibold text-neu-coral">
              {node.duration}
            </p>
            <p className="text-xs text-neu-text-muted">
              {node.percentOfPath}% of path
            </p>
          </div>
        </div>
      </div>
    ))}
  </div>
</div>
```

---

### 3. Bottlenecks Page

**Transformations:**

#### Severity Filter
```tsx
<div className="neu-raised-sm p-4 mb-6 flex items-center gap-4">
  <div className="flex gap-2">
    <button className="px-4 py-2 rounded-lg bg-neu-accent text-neu-bg font-medium text-sm">
      All 7
    </button>
    <button className="px-4 py-2 rounded-lg text-neu-coral hover:bg-neu-coral/10 font-medium text-sm">
      Severe 0
    </button>
    <button className="px-4 py-2 rounded-lg text-neu-orange hover:bg-neu-orange/10 font-medium text-sm">
      High 2
    </button>
    <button className="px-4 py-2 rounded-lg text-neu-orange hover:bg-neu-orange/10 font-medium text-sm">
      Medium 5
    </button>
    <button className="px-4 py-2 rounded-lg text-neu-green hover:bg-neu-green/10 font-medium text-sm">
      Low 0
    </button>
  </div>
  
  <button className="btn-tertiary ml-auto text-sm">
    How scores work
  </button>
</div>
```

#### Bottleneck Cards Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {bottlenecks.map(bottleneck => (
    <div key={bottleneck.id} className="card-neu">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-body font-semibold text-neu-text mb-1">
            {bottleneck.name}
          </h3>
          <p className="text-sm text-neu-text-muted">
            {bottleneck.type}
          </p>
        </div>
        <span className="badge-error">{bottleneck.score}/100</span>
      </div>
      
      {/* Duration */}
      <div className="mb-4">
        <p className="text-sm text-neu-text-muted mb-2">Duration</p>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-display font-bold text-neu-coral">
            {bottleneck.duration}
          </p>
          <div className="flex-1 h-2 bg-neu-bg rounded-full overflow-hidden">
            <div 
              className="h-full bg-neu-orange"
              style={{ width: `${bottleneck.durationPercent}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Badges */}
      <div className="flex items-center gap-2">
        {bottleneck.isOnCriticalPath && (
          <span className="badge-error text-xs">On Critical Path</span>
        )}
      </div>
    </div>
  ))}
</div>
```

---

### 4. Recommendations Page

**Transformations:**

#### Category Filter
```tsx
<div className="card-neu mb-6 p-4">
  <div className="grid grid-cols-4 gap-4">
    <select className="select-neu">
      <option>All Categories</option>
      <option>Performance</option>
      <option>Reliability</option>
    </select>
    
    <select className="select-neu">
      <option>All Impact Levels</option>
      <option>High</option>
      <option>Medium</option>
      <option>Low</option>
    </select>
    
    <select className="select-neu">
      <option>All Effort Levels</option>
      <option>Low</option>
      <option>Medium</option>
      <option>High</option>
    </select>
    
    <select className="select-neu">
      <option>Sort by Priority Score</option>
      <option>Sort by Impact</option>
      <option>Sort by Effort</option>
    </select>
  </div>
</div>
```

#### Summary Cards
```tsx
<div className="grid grid-cols-4 gap-6 mb-8">
  <div className="card-metric">
    <p className="text-4xl font-display font-bold text-neu-accent">4</p>
    <p className="text-sm text-neu-text-muted">Total Recommendations</p>
  </div>
  
  <div className="card-metric">
    <p className="text-4xl font-display font-bold text-neu-accent">4</p>
    <p className="text-sm text-neu-text-muted">Performance</p>
  </div>
  
  <div className="card-metric">
    <p className="text-4xl font-display font-bold text-neu-text">0</p>
    <p className="text-sm text-neu-text-muted">Reliability</p>
  </div>
  
  <div className="card-metric">
    <p className="text-4xl font-display font-bold text-neu-coral">0</p>
    <p className="text-sm text-neu-text-muted">Critical Impact</p>
  </div>
</div>
```

#### Recommendation Cards
```tsx
<div className="space-y-4">
  {recommendations.map(rec => (
    <div key={rec.id} className="card-neu">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-neu-accent/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-neu-accent" /* icon */>
          </div>
          <div>
            <h3 className="font-display font-semibold text-neu-text">
              {rec.title}
            </h3>
            <p className="text-sm text-neu-text-muted">
              {rec.category}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="badge-warning">{rec.impact}</span>
          <span className="badge-info">{rec.effort}</span>
        </div>
      </div>
      
      {/* Description */}
      <p className="text-sm text-neu-text-muted mb-4">
        {rec.description}
      </p>
      
      {/* Metrics */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-neu-text-muted">Priority: </span>
            <span className="font-semibold text-neu-accent">
              {rec.priority}/100
            </span>
          </div>
          <div>
            <span className="text-neu-text-muted">Save </span>
            <span className="font-semibold text-neu-green">
              {rec.savings}
            </span>
          </div>
        </div>
        
        <button className="btn-tertiary text-neu-accent">
          Click to view evidence and code example →
        </button>
      </div>
    </div>
  ))}
</div>
```

---

### 5. Errors Page

**Transformations:**

#### Empty State (if no errors)
```tsx
<div className="card-neu text-center py-12">
  <div className="w-20 h-20 rounded-full bg-neu-green/10 flex items-center justify-center mx-auto mb-4">
    <svg className="w-10 h-10 text-neu-green" /* checkmark icon */>
  </div>
  
  <h3 className="font-display text-2xl font-semibold text-neu-text mb-2">
    Clean Execution
  </h3>
  
  <p className="text-neu-text-muted">
    No errors detected in this workflow execution
  </p>
</div>
```

#### Error Cards (if errors exist)
```tsx
<div className="space-y-4">
  {errors.map(error => (
    <div key={error.id} className="card-neu border-l-4 border-neu-coral">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-neu-coral/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-neu-coral" /* error icon */>
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-body font-semibold text-neu-text">
              {error.node}
            </h3>
            <span className="badge-error">{error.severity}</span>
          </div>
          
          <p className="text-sm text-neu-text-muted mb-3">
            {error.message}
          </p>
          
          {error.stackTrace && (
            <details className="neu-inset p-3 rounded-lg">
              <summary className="text-sm text-neu-accent cursor-pointer font-medium">
                View Stack Trace
              </summary>
              <pre className="mt-2 text-xs text-neu-text-muted overflow-x-auto">
                {error.stackTrace}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  ))}
</div>
```

---

### 6. Playback Page

**Transformations:**

#### Playback Controls
```tsx
<div className="neu-raised-sm p-4 flex items-center gap-4 mb-6">
  {/* Play/Pause */}
  <button className="btn-primary w-24">
    <svg className="w-5 h-5" /* play icon */>
    Play
  </button>
  
  {/* Reset */}
  <button className="btn-secondary">
    <svg className="w-5 h-5" /* reset icon */>
    Reset
  </button>
  
  {/* Speed Control */}
  <div className="flex items-center gap-2">
    <label className="text-sm text-neu-text-muted">Speed:</label>
    <select className="select-neu">
      <option>0.5x</option>
      <option selected>1x</option>
      <option>2x</option>
      <option>4x</option>
    </select>
  </div>
  
  {/* Progress */}
  <div className="flex-1 mx-4">
    <div className="h-2 bg-neu-bg rounded-full overflow-hidden">
      <div 
        className="h-full bg-neu-accent rounded-full transition-all"
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
  
  {/* Timeline */}
  <span className="text-sm text-neu-text-muted">
    Event {currentEvent} of {totalEvents}
  </span>
</div>
```

#### Workflow Canvas Container
```tsx
<div className="card-neu p-6 min-h-[600px]">
  {/* React Flow canvas stays the same visually */}
  {/* Just the container gets neumorphic styling */}
</div>
```

#### Bottleneck Severity Legend
```tsx
<div className="neu-raised-sm p-4 mt-6">
  <h3 className="font-body font-semibold text-neu-text mb-3">
    Bottleneck Severity
  </h3>
  
  <div className="flex items-center gap-6">
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded bg-neu-coral" />
      <span className="text-sm text-neu-text-muted">Severe (90-100)</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded bg-neu-orange" />
      <span className="text-sm text-neu-text-muted">High (70-89)</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded" style={{ background: '#f0956a' }} />
      <span className="text-sm text-neu-text-muted">Medium (50-69)</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded bg-neu-green" />
      <span className="text-sm text-neu-text-muted">Low (0-49)</span>
    </div>
  </div>
</div>
```

---

### 7. Import Page

**Transformations:**

#### Welcome Cards
```tsx
<div className="grid grid-cols-4 gap-6 mb-8">
  {steps.map((step, index) => (
    <div key={index} className="card-neu">
      <div className="w-12 h-12 rounded-full bg-neu-accent/10 flex items-center justify-center mb-4">
        <span className="text-2xl font-display font-bold text-neu-accent">
          {index + 1}
        </span>
      </div>
      
      <h3 className="font-display font-semibold text-neu-text mb-2">
        {step.title}
      </h3>
      
      <p className="text-sm text-neu-text-muted">
        {step.description}
      </p>
    </div>
  ))}
</div>
```

#### Import Options
```tsx
<div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
  {/* Upload File */}
  <button className="card-neu hover:scale-105 transition-transform text-center p-8">
    <div className="w-16 h-16 rounded-full bg-neu-accent/10 flex items-center justify-center mx-auto mb-4">
      <svg className="w-8 h-8 text-neu-accent" /* upload icon */>
    </div>
    <h3 className="font-display font-semibold text-neu-text mb-2">
      Upload File
    </h3>
    <p className="text-sm text-neu-text-muted">
      Upload a file, paste a JSON, or simply fetch your workflow executions from n8n.
    </p>
  </button>
  
  {/* Paste JSON */}
  <button className="card-neu hover:scale-105 transition-transform text-center p-8">
    <div className="w-16 h-16 rounded-full bg-neu-teal/10 flex items-center justify-center mx-auto mb-4">
      <svg className="w-8 h-8 text-neu-teal" /* code icon */>
    </div>
    <h3 className="font-display font-semibold text-neu-text mb-2">
      Paste JSON
    </h3>
    <p className="text-sm text-neu-text-muted">
      Paste the full n8n execution JSON export
    </p>
  </button>
  
  {/* Fetch from n8n */}
  <button className="card-neu hover:scale-105 transition-transform text-center p-8">
    <div className="w-16 h-16 rounded-full bg-neu-orange/10 flex items-center justify-center mx-auto mb-4">
      <svg className="w-8 h-8 text-neu-orange" /* cloud icon */>
    </div>
    <h3 className="font-display font-semibold text-neu-text mb-2">
      Fetch from n8n
    </h3>
    <p className="text-sm text-neu-text-muted">
      Upload a file, paste a JSON, or simply fetch your workflow executions from n8n.
    </p>
  </button>
</div>
```

#### Import Form (when option selected)
```tsx
<div className="card-neu max-w-2xl mx-auto p-8">
  <h2 className="font-display text-2xl font-semibold text-neu-text mb-6">
    Import Execution
  </h2>
  
  {/* Form fields */}
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-neu-text mb-2">
        n8n Instance URL
      </label>
      <input 
        type="text"
        placeholder="https://your-n8n-domain"
        className="input-neu w-full"
      />
    </div>
    
    <div>
      <label className="block text-sm font-medium text-neu-text mb-2">
        Execution ID
      </label>
      <input 
        type="text"
        placeholder="1234"
        className="input-neu w-full"
      />
    </div>
    
    <div>
      <label className="block text-sm font-medium text-neu-text mb-2">
        API Key
      </label>
      <input 
        type="password"
        placeholder="eyjhb..."
        className="input-neu w-full"
      />
    </div>
  </div>
  
  <div className="flex gap-3 mt-6">
    <button className="btn-primary flex-1">
      Import Execution
    </button>
    <button className="btn-secondary">
      Cancel
    </button>
  </div>
</div>
```

---

## Global Transformations

Apply these across ALL pages:

### 1. Remove All White Backgrounds
Find and replace:
```tsx
// Before
className="bg-white"
className="bg-gray-50"
className="bg-gray-100"

// After
className="bg-neu-bg"
```

### 2. Update All Text Colors
```tsx
// Before
className="text-gray-900"
className="text-gray-800"

// After
className="text-neu-text"

// Before
className="text-gray-600"
className="text-gray-500"

// After
className="text-neu-text-muted"
```

### 3. Convert All Buttons
```tsx
// Before: Primary actions
className="bg-blue-600 text-white ..."

// After
className="btn-primary"

// Before: Secondary actions
className="border border-gray-300 ..."

// After
className="btn-secondary"
```

### 4. Convert All Cards
```tsx
// Before
className="bg-white shadow rounded-lg p-6"

// After
className="card-neu"
```

### 5. Convert All Inputs
```tsx
// Before
className="border border-gray-300 rounded px-3 py-2 ..."

// After
className="input-neu"
```

### 6. Update All Headings
```tsx
// Before
className="text-2xl font-bold"

// After
className="font-display text-2xl font-bold text-neu-text"
```

---

## Implementation Steps

### Step 1: Global Search & Replace
1. Open project-wide search
2. Replace common patterns:
   - `bg-white` → `bg-neu-bg`
   - `text-gray-900` → `text-neu-text`
   - `text-gray-600` → `text-neu-text-muted`

### Step 2: Page-by-Page Updates
Start with highest priority:
1. ✅ Dashboard (already done)
2. 🔴 Overview page (user's "disaster")
3. 🔴 Critical Path
4. 🔴 Bottlenecks
5. 🔴 Recommendations
6. 🔴 Errors
7. 🔴 Playback
8. 🔴 Import

### Step 3: Component Updates
Update shared components:
- Header navigation
- Tab navigation
- Modals/dialogs
- Tooltips
- Loading states

### Step 4: Verification
Test each page:
- [ ] Loads without errors
- [ ] Dark background applied
- [ ] Neumorphic shadows visible
- [ ] Text is readable
- [ ] Buttons work
- [ ] Hover effects smooth

---

## Success Criteria

All pages redesigned when:
- ✅ Consistent dark neumorphic aesthetic
- ✅ All cards have depth/shadows
- ✅ Typography uses Outfit + DM Sans
- ✅ Color palette matches design system
- ✅ Smooth hover transitions
- ✅ No white backgrounds anywhere
- ✅ Portfolio-quality presentation

---

## Notes

- Prioritize Overview page first (user's biggest concern)
- Maintain all existing functionality
- Focus on visual transformation only
- Don't refactor component structure
- Keep data fetching logic unchanged

