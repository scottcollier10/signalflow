# CLAUDE CODE PROMPT: Step Boxes with Progress Tracking (CORRECT VERSION)

## What This Actually Does

**Step boxes appear on Import page AND execution pages, tracking user's onboarding progress.**

### User Flow

1. **Import Page (First Visit):**
   - Boxes at top: [□ 1] [□ 2] [□ 3] [□ 4]
   - Step 1 active (purple highlight)
   - All steps unchecked

2. **After 1st Import → Redirects to Overview:**
   - Boxes at top: [✓ 1] [● 2] [□ 3] [□ 4]
   - Step 1 checked (green)
   - Step 2 active (purple)

3. **While Viewing Analysis (Any Tab):**
   - Boxes persist at top
   - Step 2 becomes checked after spending time viewing
   - Step 3 becomes active

4. **After 2nd Import (Optimized Workflow):**
   - Boxes at top: [✓ 1] [✓ 2] [✓ 3] [● 4]
   - Step 3 checked
   - Step 4 active

5. **After 3rd Import:**
   - Boxes disappear completely
   - User is now "graduated" from onboarding

---

## Part 1: Shared Step Boxes Component

**Create:** `frontend/components/StepProgress.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';

interface StepProgressProps {
  className?: string;
}

export function StepProgress({ className = '' }: StepProgressProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [importCount, setImportCount] = useState(0);

  // Load progress from localStorage
  useEffect(() => {
    const savedStep = localStorage.getItem('signalflow-current-step');
    const savedCompleted = localStorage.getItem('signalflow-completed-steps');
    const savedCount = localStorage.getItem('signalflow-import-count');

    if (savedStep) setCurrentStep(parseInt(savedStep));
    if (savedCompleted) setCompletedSteps(JSON.parse(savedCompleted));
    if (savedCount) setImportCount(parseInt(savedCount));
  }, []);

  // Listen for step updates from other components
  useEffect(() => {
    const handleStepUpdate = (event: CustomEvent) => {
      const { step, completed, importCount: newCount } = event.detail;
      
      if (step !== undefined) {
        setCurrentStep(step);
        localStorage.setItem('signalflow-current-step', step.toString());
      }
      
      if (completed !== undefined) {
        const newCompleted = [...new Set([...completedSteps, completed])];
        setCompletedSteps(newCompleted);
        localStorage.setItem('signalflow-completed-steps', JSON.stringify(newCompleted));
      }

      if (newCount !== undefined) {
        setImportCount(newCount);
        localStorage.setItem('signalflow-import-count', newCount.toString());
      }
    };

    window.addEventListener('updateStepProgress' as any, handleStepUpdate);
    return () => window.removeEventListener('updateStepProgress' as any, handleStepUpdate);
  }, [completedSteps]);

  // Hide after 3 imports
  if (importCount >= 3) {
    return null;
  }

  const steps = [
    { number: 1, label: 'Import Executions', sublabel: 'Upload or fetch workflow data' },
    { number: 2, label: 'View Analysis', sublabel: 'Review bottlenecks & insights' },
    { number: 3, label: 'Optimize w/ Claude Code', sublabel: 'Generate optimized workflow' },
    { number: 4, label: 'Import, Test, Repeat', sublabel: 'See the improvement' },
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl mx-auto ${className}`}>
      {steps.map((step) => {
        const isCompleted = completedSteps.includes(step.number);
        const isActive = currentStep === step.number && !isCompleted;
        const isLocked = step.number > currentStep && !isCompleted;

        return (
          <div
            key={step.number}
            className={`neu-raised-sm p-6 text-center transition-all duration-300 ${
              isActive ? 'ring-2 ring-neu-accent shadow-lg' : ''
            } ${isLocked ? 'opacity-60' : ''}`}
          >
            <div className="flex flex-col items-center gap-3">
              {/* Number/Checkmark Badge */}
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-lg ${
                  isCompleted
                    ? 'bg-gradient-to-br from-neu-green to-neu-teal text-white'
                    : isActive
                    ? 'bg-gradient-to-br from-neu-accent to-neu-accent-light text-white'
                    : 'bg-neu-shadow-light text-neu-text-muted'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>

              {/* Step Label */}
              <div>
                <div
                  className={`font-semibold text-sm mb-1 ${
                    isActive
                      ? 'text-neu-accent'
                      : isCompleted
                      ? 'text-neu-green'
                      : 'text-neu-text-muted'
                  }`}
                >
                  {step.label}
                </div>
                <div className="text-xs text-neu-text-muted">{step.sublabel}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Helper function to update steps from anywhere
export function updateStepProgress(updates: {
  step?: number;
  completed?: number;
  importCount?: number;
}) {
  const event = new CustomEvent('updateStepProgress', { detail: updates });
  window.dispatchEvent(event);
}
```

---

## Part 2: Add to Import Page (Top)

**File:** `frontend/app/import/page.tsx`

**Add at the top of the page content:**

```tsx
import { StepProgress } from '@/components/StepProgress';

export default function ImportPage() {
  // ... existing code ...

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-8">
        
        {/* Step Progress Boxes - AT TOP */}
        <StepProgress className="mb-8" />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-4xl font-bold text-neu-text">
            Import Execution
          </h1>
        </div>

        {/* Rest of import page */}
        {/* ... existing code ... */}
      </div>
    </AppLayout>
  );
}
```

---

## Part 3: Add to Execution Pages (All Tabs)

**File:** `frontend/app/execution/[id]/page.tsx` (or wherever main execution layout is)

**Add below header, above tab navigation:**

```tsx
import { StepProgress } from '@/components/StepProgress';

export default function ExecutionPage({ params }: { params: { id: string } }) {
  // ... existing code ...

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-8">
        
        {/* Back Button & Header */}
        <div className="mb-6">
          {/* ... existing header ... */}
        </div>

        {/* Step Progress Boxes */}
        <StepProgress className="mb-6" />

        {/* Tab Navigation */}
        <div className="neu-raised-sm p-1 mb-6 inline-flex gap-1">
          {/* ... tabs ... */}
        </div>

        {/* Tab Content */}
        <div>
          {/* ... tab content ... */}
        </div>

      </div>
    </AppLayout>
  );
}
```

---

## Part 4: Track Progress Events

### Event 1: After Import (Step 1 → Step 2)

**File:** `frontend/app/import/page.tsx`

**After successful import:**

```tsx
import { updateStepProgress } from '@/components/StepProgress';

const handleImport = async () => {
  try {
    // ... existing import logic ...

    if (response.ok) {
      // Update import count
      const currentCount = parseInt(localStorage.getItem('signalflow-import-count') || '0');
      const newCount = currentCount + 1;
      
      // Mark Step 1 complete, move to Step 2
      updateStepProgress({
        completed: 1,
        step: 2,
        importCount: newCount,
      });

      // Redirect to execution overview
      router.push(`/execution/${executionId}`);
    }
  } catch (error) {
    // ... error handling ...
  }
};
```

---

### Event 2: After Viewing Analysis (Step 2 → Step 3)

**File:** `frontend/app/execution/[id]/page.tsx` (or Overview tab component)

**Track time spent viewing:**

```tsx
import { updateStepProgress } from '@/components/StepProgress';
import { useEffect, useState } from 'react';

export function OverviewTab() {
  const [viewStartTime, setViewStartTime] = useState<number | null>(null);

  useEffect(() => {
    // Start tracking when component mounts
    setViewStartTime(Date.now());

    // Check if Step 2 should be completed
    const timer = setTimeout(() => {
      const currentStep = parseInt(localStorage.getItem('signalflow-current-step') || '1');
      
      // If user is on Step 2 and has been viewing for 10 seconds
      if (currentStep === 2) {
        updateStepProgress({
          completed: 2,
          step: 3,
        });
      }
    }, 10000); // 10 seconds

    return () => clearTimeout(timer);
  }, []);

  // ... rest of component ...
}
```

**Alternative (simpler):** Mark Step 2 complete when user clicks any tab

```tsx
// In tab click handlers
const handleTabClick = (tab: string) => {
  setActiveTab(tab);
  
  // Mark Step 2 complete after viewing any analysis tab
  const currentStep = parseInt(localStorage.getItem('signalflow-current-step') || '1');
  if (currentStep === 2) {
    updateStepProgress({
      completed: 2,
      step: 3,
    });
  }
};
```

---

### Event 3: After Optimize Button Click (Step 3 → Step 4)

**File:** Wherever "Optimize" button is (Recommendations page?)

```tsx
import { updateStepProgress } from '@/components/StepProgress';

const handleOptimizeClick = () => {
  // Mark Step 3 complete
  const currentStep = parseInt(localStorage.getItem('signalflow-current-step') || '1');
  if (currentStep === 3) {
    updateStepProgress({
      completed: 3,
      step: 4,
    });
  }

  // Open Claude Code or show optimization modal
  // ... existing logic ...
};
```

---

## Part 5: Hide After 3rd Import

**Already handled in StepProgress component:**

```tsx
// In StepProgress component
if (importCount >= 3) {
  return null;
}
```

**This happens automatically when import count reaches 3.**

---

## Testing the Flow

### Test 1: First Import
1. Go to Import page
2. See boxes: [□ 1] [□ 2] [□ 3] [□ 4]
3. Step 1 should be purple (active)
4. Import any execution
5. Should redirect to Overview
6. See boxes: [✓ 1] [● 2] [□ 3] [□ 4]
7. Step 1 green checkmark, Step 2 purple

### Test 2: View Analysis
1. Already on Overview from Test 1
2. Click between tabs (Critical Path, Bottlenecks, etc.)
3. After 10 seconds OR after clicking tab
4. See boxes: [✓ 1] [✓ 2] [● 3] [□ 4]
5. Step 2 green checkmark, Step 3 purple

### Test 3: Optimize
1. Go to Recommendations tab
2. Click "Optimize" button
3. See boxes: [✓ 1] [✓ 2] [✓ 3] [● 4]
4. Step 3 green checkmark, Step 4 purple

### Test 4: Second Import
1. Import another execution (the optimized one)
2. Import count = 2
3. Boxes still showing
4. Step 4 still active

### Test 5: Third Import
1. Import a third execution (any)
2. Import count = 3
3. **Boxes disappear completely**
4. Onboarding complete!

---

## Debugging

### Check localStorage in browser console:
```javascript
localStorage.getItem('signalflow-current-step')     // Current step number
localStorage.getItem('signalflow-completed-steps')  // Array of completed steps
localStorage.getItem('signalflow-import-count')     // Number of imports
```

### Reset progress:
```javascript
localStorage.removeItem('signalflow-current-step');
localStorage.removeItem('signalflow-completed-steps');
localStorage.removeItem('signalflow-import-count');
```

---

## Verification Checklist

### Import Page
- [ ] Step boxes at top of page
- [ ] All unchecked initially
- [ ] Step 1 purple (active)
- [ ] After import → redirects to Overview

### Execution Pages
- [ ] Step boxes appear on Overview, all tabs
- [ ] Persist across tab navigation
- [ ] Show current progress
- [ ] Don't reset when switching tabs

### Progress Tracking
- [ ] Step 1 completes after 1st import
- [ ] Step 2 completes after viewing analysis
- [ ] Step 3 completes after clicking optimize
- [ ] Step 4 becomes active after 2nd import
- [ ] Boxes hide after 3rd import

### Visual States
- [ ] Locked: Gray, muted
- [ ] Active: Purple gradient, ring highlight
- [ ] Completed: Green checkmark

---

## Success Criteria

✅ Boxes on Import page (top position)
✅ Boxes on Execution analysis pages
✅ Progress tracked across sessions (localStorage)
✅ Steps advance as user completes actions
✅ Boxes disappear after 3rd import
✅ Clear visual feedback (checkmarks, colors)
✅ Professional, portfolio-quality

