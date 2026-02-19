# CLAUDE CODE PROMPT: Setup Neumorphic Design System

## Context
We're implementing a dark neumorphic design system for SignalFlow to achieve portfolio-quality presentation. This is **Phase 1: Foundation Setup** - we're only setting up the design tokens and component utilities, NOT applying them to pages yet.

## Reference Files
- **Design System Guide:** `/Users/scottcollier/dev/signalflow/docs/design-system.md`
- **New Tailwind Config:** `/Users/scottcollier/dev/signalflow/docs/tailwind.config.js.NEW`
- **New Globals CSS:** `/Users/scottcollier/dev/signalflow/docs/globals.css.NEW`

## Task Overview
1. Backup current config files
2. Replace Tailwind config with neumorphic tokens
3. Replace globals.css with component utilities
4. Create sample component to test design system
5. Verify everything works

---

## Step 1: Backup Current Files

**Before making changes, create backups:**

```bash
# Backup current files
cp frontend/tailwind.config.js frontend/tailwind.config.js.BACKUP
cp frontend/app/globals.css frontend/app/globals.css.BACKUP
```

---

## Step 2: Replace Tailwind Config

**File:** `frontend/tailwind.config.js`

**Action:** Replace entire file content with the config from `/Users/scottcollier/dev/signalflow/docs/tailwind.config.js.NEW`

**Key Changes:**
- Adds neumorphic color palette (neu-bg, neu-accent, neu-text, etc.)
- Adds custom shadows (neu-raised, neu-inset, neu-flat)
- Adds Outfit & DM Sans fonts
- Adds animation keyframes

**Verification:**
- File should have `colors.neu-bg: '#1e2028'`
- File should have `boxShadow.neu-raised`
- File should have `fontFamily.display: ['Outfit', 'sans-serif']`

---

## Step 3: Replace Globals CSS

**File:** `frontend/app/globals.css`

**Action:** Replace entire file content with the CSS from `/Users/scottcollier/dev/signalflow/docs/globals.css.NEW`

**Key Changes:**
- Imports Google Fonts (Outfit & DM Sans)
- Adds Tailwind directives
- Defines component classes:
  - `.btn-primary`, `.btn-secondary`, `.btn-icon`
  - `.badge-success`, `.badge-warning`, `.badge-error`
  - `.input-neu`, `.select-neu`
  - `.card-neu`, `.card-neu-flat`
  - `.neu-raised`, `.neu-inset`, `.neu-flat`
- Sets body to use neu-bg background

**Verification:**
- File should import Google Fonts at top
- File should have `@layer components` section
- File should define `.btn-primary` with gradient background

---

## Step 4: Create Test Component

**Create:** `frontend/components/DesignSystemTest.tsx`

**Purpose:** Test that all design tokens and utilities work correctly

```typescript
export default function DesignSystemTest() {
  return (
    <div className="min-h-screen bg-neu-bg p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Typography Test */}
        <section className="neu-raised p-6">
          <h1 className="font-display text-4xl font-bold text-neu-text mb-4">
            Neumorphic Design System
          </h1>
          <p className="font-body text-neu-text-muted">
            Testing design tokens and component utilities
          </p>
        </section>

        {/* Button Test */}
        <section className="neu-raised p-6 space-y-4">
          <h2 className="font-display text-2xl font-semibold text-neu-text mb-4">
            Buttons
          </h2>
          <div className="flex gap-4">
            <button className="btn-primary">Primary Button</button>
            <button className="btn-secondary">Secondary Button</button>
            <button className="btn-tertiary">Tertiary Button</button>
            <button className="btn-icon">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
        </section>

        {/* Badge Test */}
        <section className="neu-raised p-6 space-y-4">
          <h2 className="font-display text-2xl font-semibold text-neu-text mb-4">
            Badges
          </h2>
          <div className="flex gap-3">
            <span className="badge-success">Success</span>
            <span className="badge-warning">Warning</span>
            <span className="badge-error">Error</span>
            <span className="badge-info">Info</span>
            <span className="badge-neutral">Neutral</span>
          </div>
        </section>

        {/* Card Test */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-semibold text-neu-text mb-4">
            Cards
          </h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="card-neu">
              <h3 className="font-display font-semibold text-lg text-neu-text mb-2">
                Raised Card
              </h3>
              <p className="text-sm text-neu-text-muted">
                Hovers to lift
              </p>
            </div>
            <div className="card-neu-flat">
              <h3 className="font-display font-semibold text-lg text-neu-text mb-2">
                Flat Card
              </h3>
              <p className="text-sm text-neu-text-muted">
                Subtle gradient
              </p>
            </div>
            <div className="card-metric">
              <p className="text-3xl font-display font-bold text-neu-accent mb-1">
                100%
              </p>
              <p className="text-sm text-neu-text-muted">
                Metric Card
              </p>
            </div>
          </div>
        </section>

        {/* Input Test */}
        <section className="neu-raised p-6 space-y-4">
          <h2 className="font-display text-2xl font-semibold text-neu-text mb-4">
            Inputs
          </h2>
          <div className="space-y-3">
            <input 
              type="text" 
              placeholder="Text input..." 
              className="input-neu w-full"
            />
            <select className="select-neu w-full">
              <option>Select option</option>
              <option>Option 1</option>
              <option>Option 2</option>
            </select>
            <textarea 
              placeholder="Textarea..." 
              className="textarea-neu w-full h-24"
            />
          </div>
        </section>

        {/* Shadow Variants Test */}
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-semibold text-neu-text mb-4">
            Shadow Variants
          </h2>
          <div className="grid grid-cols-4 gap-6">
            <div className="neu-raised p-6 text-center">
              <p className="text-sm text-neu-text-muted">Raised</p>
            </div>
            <div className="neu-raised-sm p-6 text-center">
              <p className="text-sm text-neu-text-muted">Raised Small</p>
            </div>
            <div className="neu-inset p-6 text-center">
              <p className="text-sm text-neu-text-muted">Inset</p>
            </div>
            <div className="neu-flat p-6 text-center">
              <p className="text-sm text-neu-text-muted">Flat</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
```

---

## Step 5: Add Test Route

**Create:** `frontend/app/design-test/page.tsx`

```typescript
import DesignSystemTest from '@/components/DesignSystemTest';

export default function DesignTestPage() {
  return <DesignSystemTest />;
}
```

---

## Step 6: Verification Steps

### A. Check Development Server
```bash
# In frontend directory
npm run dev
```

**Watch for:**
- No build errors
- No TypeScript errors
- No CSS compilation errors

### B. Test Design System Page
```
http://localhost:3001/design-test
```

**Verify:**
- [ ] Background is dark (`#1e2028`)
- [ ] Fonts load (Outfit for headings, DM Sans for body)
- [ ] Primary button has purple gradient
- [ ] Badges show colored backgrounds
- [ ] Cards have neumorphic shadows (3D depth effect)
- [ ] Inputs have inset shadow (pressed effect)
- [ ] Hover effects work on buttons and cards

### C. Color Verification
- Primary background should be `#1e2028` (dark gray-blue)
- Text should be `#d8d8e0` (light gray)
- Accent should be `#a89be0` (purple)

### D. Shadow Verification
- Raised elements should appear to lift off surface
- Inset elements should appear pressed into surface
- Shadows should be visible and create depth

---

## Step 7: Test Existing Pages Don't Break

**Visit these pages to ensure they still render:**
- `http://localhost:3001/dashboard`
- `http://localhost:3001/import`

**Expected:**
- Pages should load without errors
- Styling might look different (that's OK - we'll fix in Phase 2)
- No white screens or crashes

---

## Common Issues & Fixes

### Issue: Fonts Don't Load
**Fix:** Check Network tab - Google Fonts should be fetching from googleapis.com
**Solution:** Font import is in globals.css, verify it's loading

### Issue: Shadows Don't Appear
**Fix:** Check if `boxShadow` values are in tailwind.config.js
**Solution:** Verify `shadow-neu-raised` class exists

### Issue: Components Look Wrong
**Fix:** Check if component classes are defined in globals.css
**Solution:** Verify `@layer components` section has `.btn-primary`, etc.

### Issue: Build Errors
**Fix:** Check for syntax errors in tailwind.config.js
**Solution:** Compare with backup, fix any typos

---

## Success Criteria

- [ ] Tailwind config updated with neumorphic tokens
- [ ] Globals CSS updated with component utilities
- [ ] Test page renders at `/design-test`
- [ ] All design elements display correctly:
  - [ ] Dark background (#1e2028)
  - [ ] Custom fonts (Outfit, DM Sans)
  - [ ] Neumorphic shadows (3D depth)
  - [ ] Button gradients and hovers
  - [ ] Badge colors
  - [ ] Input inset shadows
- [ ] Existing pages still load (Dashboard, Import)
- [ ] No console errors

---

## Rollback Procedure (If Needed)

If something breaks:

```bash
# Restore backups
cp frontend/tailwind.config.js.BACKUP frontend/tailwind.config.js
cp frontend/app/globals.css.BACKUP frontend/app/globals.css

# Restart dev server
npm run dev
```

---

## Next Steps After Success

Once design system is verified:
1. Git commit: "feat: Add neumorphic design system foundation"
2. Report back to user with screenshot of `/design-test` page
3. Proceed to Phase 2: Apply design to Dashboard page

---

## Notes
- This is FOUNDATION ONLY - we're not changing any existing pages yet
- Test page is temporary for verification
- Existing pages might look different - that's expected
- Focus on making sure design tokens work correctly

