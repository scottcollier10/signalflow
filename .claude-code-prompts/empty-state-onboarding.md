# CLAUDE CODE PROMPT: Empty State Onboarding Flow

## Context
The Dashboard currently has a basic empty state (simple card + button). User wants the beautiful step-by-step onboarding flow from the mockups - with numbered cards that guide users through their first optimization.

**Reference:** `/Users/scottcollier/dev/_shared/quick-share/signalflow/` mockup HTMLs show the desired flow.

---

## Current Empty State (Basic)

**File:** `frontend/app/dashboard/page.tsx` (lines ~237-254)

**Current Code:**
```tsx
executions.length === 0 ? (
  <div className="neu-flat p-12 text-center">
    <div className="w-20 h-20 rounded-full bg-neu-accent/10 flex items-center justify-center mx-auto mb-6">
      <svg className="w-10 h-10 text-neu-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    </div>
    <h3 className="font-display text-2xl font-semibold text-neu-text mb-2">No executions yet</h3>
    <p className="text-neu-text-muted mb-6 max-w-md mx-auto">
      Import your first n8n execution to get started with analysis.
    </p>
    <Link
      href="/import"
      className="btn-primary inline-flex items-center gap-2"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
      Import Execution
    </Link>
  </div>
)
```

**Problem:** Too basic, doesn't guide users, no visual story

---

## Desired Empty State (Onboarding Flow)

**Visual Structure:**

```
┌─────────────────────────────────────────┐
│  LET'S GET STARTED                      │
│  Welcome to SignalFlow                  │
├─────────────────────────────────────────┤
│                                         │
│  ┌───┐  ┌───┐  ┌───┐  ┌───┐           │
│  │ 1 │  │ 2 │  │ 3 │  │ 4 │           │
│  └───┘  └───┘  └───┘  └───┘           │
│   ↓      ↓      ↓      ↓               │
│  Import View   Optimize Test           │
│  Exec   Analy  w/ AI    Again          │
│                                         │
└─────────────────────────────────────────┘
```

---

## Replacement Code

**Replace the entire empty state block with:**

```tsx
executions.length === 0 ? (
  <div className="max-w-6xl mx-auto">
    {/* Welcome Header */}
    <div className="text-center mb-12 animate-fade-in">
      <p className="text-neu-accent font-semibold text-sm tracking-wider uppercase mb-3">
        LET'S GET STARTED
      </p>
      <h2 className="font-display text-5xl font-bold text-neu-text mb-4">
        Welcome to SignalFlow
      </h2>
      <p className="text-neu-text-muted text-lg max-w-2xl mx-auto">
        Optimize your first workflow in minutes using AI-powered analysis
      </p>
    </div>

    {/* Step Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Step 1: Import Executions */}
      <div className="neu-raised p-8 hover:shadow-xl transition-all duration-400 animate-fade-in-up stagger-1 group">
        <div className="flex items-start gap-4 mb-6">
          {/* Step Number */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neu-accent to-neu-accent-light flex items-center justify-center font-display font-bold text-white text-xl shadow-lg">
              1
            </div>
          </div>
          {/* Icon */}
          <div className="flex-shrink-0 mt-1">
            <svg className="w-8 h-8 text-neu-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
        </div>
        
        <h3 className="font-display text-xl font-semibold text-neu-text mb-3">
          Import Executions
        </h3>
        <p className="text-neu-text-muted text-sm mb-6 leading-relaxed">
          Upload a file, paste a JSON, or simply fetch your workflow executions from n8n.
        </p>
        
        <Link
          href="/import"
          className="inline-flex items-center gap-2 text-neu-accent font-semibold text-sm hover:gap-3 transition-all"
        >
          Get Started
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Step 2: View Analysis */}
      <div className="neu-raised p-8 opacity-60 pointer-events-none animate-fade-in-up stagger-2">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neu-text-muted/30 to-neu-text-muted/20 flex items-center justify-center font-display font-bold text-neu-text-muted text-xl">
              2
            </div>
          </div>
          <div className="flex-shrink-0 mt-1">
            <svg className="w-8 h-8 text-neu-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        
        <h3 className="font-display text-xl font-semibold text-neu-text mb-3">
          View Analysis
        </h3>
        <p className="text-neu-text-muted text-sm leading-relaxed">
          Upload a file, paste a JSON, or simply fetch your workflow executions from n8n.
        </p>
      </div>

      {/* Step 3: Optimize w/ Claude Code */}
      <div className="neu-raised p-8 opacity-60 pointer-events-none animate-fade-in-up stagger-3">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neu-text-muted/30 to-neu-text-muted/20 flex items-center justify-center font-display font-bold text-neu-text-muted text-xl">
              3
            </div>
          </div>
          <div className="flex-shrink-0 mt-1">
            <svg className="w-8 h-8 text-neu-text-muted" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L9 9l-7 3 7 3 3 7 3-7 7-3-7-3-3-7z" />
            </svg>
          </div>
        </div>
        
        <h3 className="font-display text-xl font-semibold text-neu-text mb-3">
          Optimize w/ Claude Code
        </h3>
        <p className="text-neu-text-muted text-sm leading-relaxed">
          Optimize your workflow using Claude Code.
        </p>
      </div>

      {/* Step 4: Import, Test, Repeat */}
      <div className="neu-raised p-8 opacity-60 pointer-events-none animate-fade-in-up stagger-4">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neu-text-muted/30 to-neu-text-muted/20 flex items-center justify-center font-display font-bold text-neu-text-muted text-xl">
              4
            </div>
          </div>
          <div className="flex-shrink-0 mt-1">
            <svg className="w-8 h-8 text-neu-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        </div>
        
        <h3 className="font-display text-xl font-semibold text-neu-text mb-3">
          Import, Test, Repeat
        </h3>
        <p className="text-neu-text-muted text-sm leading-relaxed">
          Import and replace your old workflow. Watch the magic.
        </p>
      </div>
    </div>

    {/* Execution Dashboard Section (Empty State) */}
    <div className="mt-16">
      <div className="flex items-center gap-4 mb-6">
        <h3 className="font-display text-2xl font-semibold text-neu-text">
          Execution Dashboard
        </h3>
        <span className="text-neu-text-muted text-sm">
          4 executions across 2 workflows
        </span>
      </div>

      {/* Empty Visualization */}
      <div className="neu-inset p-12 text-center">
        <svg className="w-16 h-16 text-neu-text-muted/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-neu-text-muted text-sm">
          Start by importing a new n8n workflow<br />execution to optimize
        </p>
        <button className="mt-6 px-6 py-3 rounded-full bg-gradient-to-r from-neu-accent to-neu-accent-light text-white font-semibold text-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
          + New Execution
        </button>
      </div>
    </div>
  </div>
)
```

---

## Required Animations (Already in globals.css)

These animations should already exist in `frontend/app/globals.css`:

```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out forwards;
}

.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

.stagger-1 { animation-delay: 0.1s; }
.stagger-2 { animation-delay: 0.2s; }
.stagger-3 { animation-delay: 0.3s; }
.stagger-4 { animation-delay: 0.4s; }
```

**If missing,** add them to `frontend/app/globals.css`.

---

## Visual Design Notes

### Step Cards (Active vs Inactive)

**Active (Step 1 Only):**
- Full opacity (`opacity-100`)
- Purple gradient number badge
- Purple accent icon
- "Get Started" link with purple text
- Hover lift effect (`hover:shadow-xl`)
- Interactive (`pointer-events-auto`)

**Inactive (Steps 2-4):**
- Reduced opacity (`opacity-60`)
- Gray number badge (`bg-gradient-to-br from-neu-text-muted/30`)
- Gray icons (`text-neu-text-muted`)
- No interactive elements (`pointer-events-none`)
- Shows "coming next" visual state

### Typography Hierarchy

- **Welcome:**
  - "LET'S GET STARTED" - Small, uppercase, purple accent, tracking-wider
  - "Welcome to SignalFlow" - 5xl, bold, display font
  - Subtitle - lg, muted, max-w-2xl centered

- **Step Cards:**
  - Step number - xl, bold, white (or muted for inactive)
  - Card title - xl, semibold, display font
  - Card description - sm, muted, leading-relaxed

### Layout

- Max-width: `max-w-6xl` for entire empty state
- Header: Centered with `text-center mb-12`
- Cards: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` responsive
- Card gap: `gap-6`
- Card padding: `p-8`

---

## Testing Empty State

### To Test:

1. **Delete all executions** from database:
   ```bash
   # From backend directory
   psql $DATABASE_URL -c "DELETE FROM executions;"
   ```

2. **Or use API:**
   ```bash
   # Get all execution IDs
   curl http://localhost:8001/api/executions
   
   # Delete each one
   curl -X DELETE http://localhost:8001/api/executions/{id}
   ```

3. **Navigate to Dashboard:**
   ```
   http://localhost:3001/dashboard
   ```

4. **Should see:**
   - Welcome header with purple "LET'S GET STARTED"
   - 4 step cards in a row
   - Step 1 active and clickable
   - Steps 2-4 grayed out
   - Empty dashboard visualization below

---

## Verification Checklist

After implementing:

- [ ] Dashboard shows empty state when `executions.length === 0`
- [ ] Welcome header displays correctly
- [ ] 4 step cards visible in responsive grid
- [ ] Step 1 is active (full opacity, purple, clickable)
- [ ] Steps 2-4 are inactive (grayed out, not clickable)
- [ ] "Get Started" link on Step 1 navigates to `/import`
- [ ] Cards animate in with stagger effect
- [ ] Empty dashboard section appears below
- [ ] Responsive on mobile (stacks vertically)
- [ ] Hover effects work on Step 1 card

---

## Future Enhancements

Once user imports first execution:
- Step 1 becomes inactive (grayed out, checkmark)
- Step 2 becomes active (full color, clickable)
- After viewing analysis, Step 3 activates
- Progressive disclosure of workflow

This can be tracked via localStorage or Supabase user preferences.

---

## Notes

- This empty state is ONLY for Dashboard (`/dashboard`)
- Import page has its own onboarding content
- Once ANY execution exists, show normal dashboard with execution cards
- Empty state should feel welcoming, not intimidating
- Focus on the journey: Import → Analyze → Optimize → Test
