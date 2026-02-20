# CLAUDE CODE PROMPT: Fix Step Boxes - Dashboard + Execution Count Logic

## Summary

**Fix 2 critical issues:**
1. Add step boxes to Dashboard empty state (currently missing)
2. Use actual execution count as source of truth (fix cache/reset logic)

**Core principle:** `executions.length` drives everything. Empty dashboard = fresh start.

---

## Core Logic

**Execution count is the source of truth:**

```
executions.length === 0  → Reset all progress, show boxes (Step 1 active)
executions.length === 1  → Step 1 ✓, Step 2 active
executions.length === 2  → Step 1-2 ✓, Step 3 active (if user viewed analysis)
executions.length >= 3   → Hide boxes completely

User deletes all executions → Reset to 0 → Boxes reappear
```

**Until user auth exists, execution count = single source of truth.**

---

## Part 1: Fix StepProgress Component

**File:** `frontend/components/StepProgress.tsx`

**Replace entire component with this:**

```tsx
'use client';

import { useEffect, useState } from 'react';

interface StepProgressProps {
  className?: string;
  executionCount: number; // REQUIRED: Actual count from database
}

export function StepProgress({ className = '', executionCount }: StepProgressProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // CORE LOGIC: Derive state from execution count
  useEffect(() => {
    if (executionCount === 0) {
      // Dashboard empty = fresh start
      setCurrentStep(1);
      setCompletedSteps([]);
      // Clear any old localStorage
      localStorage.removeItem('signalflow-current-step');
      localStorage.removeItem('signalflow-completed-steps');
      return;
    }

    if (executionCount === 1) {
      // After 1st import: Step 1 done, Step 2 active
      setCurrentStep(2);
      setCompletedSteps([1]);
      localStorage.setItem('signalflow-current-step', '2');
      localStorage.setItem('signalflow-completed-steps', JSON.stringify([1]));
      return;
    }

    if (executionCount === 2) {
      // After 2nd import: Steps 1-2 done, Step 3 active
      // Only advance if user completed Step 2 (viewed analysis)
      const savedCompleted = localStorage.getItem('signalflow-completed-steps');
      const completed = savedCompleted ? JSON.parse(savedCompleted) : [1];
      
      if (completed.includes(2)) {
        setCurrentStep(3);
        setCompletedSteps([1, 2]);
      } else {
        // User hasn't viewed analysis yet, keep on Step 2
        setCurrentStep(2);
        setCompletedSteps([1]);
      }
      
      localStorage.setItem('signalflow-current-step', currentStep.toString());
      localStorage.setItem('signalflow-completed-steps', JSON.stringify(completedSteps));
      return;
    }

    // executionCount >= 3: Component will hide (see return null below)
  }, [executionCount]);

  // Listen for manual step updates (viewing analysis, clicking optimize)
  useEffect(() => {
    const handleStepUpdate = (event: CustomEvent) => {
      const { completed } = event.detail;
      
      if (completed !== undefined) {
        const newCompleted = [...new Set([...completedSteps, completed])];
        setCompletedSteps(newCompleted);
        setCurrentStep(completed + 1);
        
        localStorage.setItem('signalflow-current-step', (completed + 1).toString());
        localStorage.setItem('signalflow-completed-steps', JSON.stringify(newCompleted));
      }
    };

    window.addEventListener('updateStepProgress' as any, handleStepUpdate);
    return () => window.removeEventListener('updateStepProgress' as any, handleStepUpdate);
  }, [completedSteps]);

  // Hide if 3+ executions
  if (executionCount >= 3) {
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

// Helper function for manual step completion (viewing analysis, clicking optimize)
export function updateStepProgress(updates: { completed?: number }) {
  const event = new CustomEvent('updateStepProgress', { detail: updates });
  window.dispatchEvent(event);
}
```

---

## Part 2: Add Step Boxes to Dashboard

**File:** `frontend/app/dashboard/page.tsx`

**Add step boxes to empty state:**

```tsx
import { StepProgress } from '@/components/StepProgress';

export default function Dashboard() {
  const [executions, setExecutions] = useState<Execution[]>([]);

  // ... existing code to fetch executions ...

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-8">
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-4xl font-bold text-neu-text">Dashboard</h1>
          {/* ... header buttons ... */}
        </div>

        {executions.length === 0 ? (
          // EMPTY STATE
          <div className="space-y-8">
            
            {/* STEP BOXES - ADD HERE */}
            <StepProgress executionCount={executions.length} className="mb-8" />

            {/* Empty state message */}
            <div className="neu-flat p-12 text-center max-w-3xl mx-auto">
              <div className="text-neu-text-muted mb-6">
                {/* Empty state icon */}
              </div>
              <h2 className="text-xl font-semibold mb-2">No workflows found</h2>
              <p className="text-neu-text-muted mb-6">
                Start by importing a new n8n workflow execution to optimize
              </p>
              <Link href="/import">
                <button className="neu-button-primary">
                  + New Execution
                </button>
              </Link>
            </div>

          </div>
        ) : (
          // EXECUTION CARDS
          <div className="space-y-6">
            
            {/* Show step boxes if count < 3 */}
            {executions.length < 3 && (
              <StepProgress executionCount={executions.length} className="mb-6" />
            )}

            {/* Execution cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {executions.map((execution) => (
                /* ... execution cards ... */
              ))}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
```

---

## Part 3: Update Import and Execution Pages

**Import page is already working correctly - just ensure it passes `executionCount`:**

**File:** `frontend/app/import/page.tsx`

```tsx
import { StepProgress } from '@/components/StepProgress';

export default function ImportPage() {
  const [executionCount, setExecutionCount] = useState(0);

  useEffect(() => {
    // Fetch current execution count
    fetch('/api/executions')
      .then(res => res.json())
      .then(data => setExecutionCount(data.executions?.length || 0));
  }, []);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-8">
        
        {/* STEP BOXES - Already here, just ensure executionCount passed */}
        <StepProgress executionCount={executionCount} className="mb-8" />

        {/* Rest of import page */}
        {/* ... */}

      </div>
    </AppLayout>
  );
}
```

**File:** `frontend/app/execution/[id]/page.tsx`

```tsx
import { StepProgress } from '@/components/StepProgress';

export default function ExecutionPage({ params }: { params: { id: string } }) {
  const [executionCount, setExecutionCount] = useState(0);

  useEffect(() => {
    // Fetch execution count
    fetch('/api/executions')
      .then(res => res.json())
      .then(data => setExecutionCount(data.executions?.length || 0));
  }, []);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-8">
        
        {/* Header, back button, etc. */}
        
        {/* STEP BOXES */}
        {executionCount < 3 && (
          <StepProgress executionCount={executionCount} className="mb-6" />
        )}

        {/* Tabs and content */}
        {/* ... */}

      </div>
    </AppLayout>
  );
}
```

---

## Verification

### Test 1: Empty Dashboard
1. Delete all executions
2. Go to Dashboard
3. **✓** See step boxes: [□ 1] [□ 2] [□ 3] [□ 4]
4. **✓** Step 1 purple (active), others gray (locked)

### Test 2: After 1st Import
1. Import any execution
2. **✓** Step boxes: [✓ 1] [● 2] [□ 3] [□ 4]
3. **✓** Step 1 green checkmark, Step 2 purple

### Test 3: After 2nd Import
1. Import another execution
2. **✓** Step boxes: [✓ 1] [✓ 2] [● 3] [□ 4]
3. **✓** Steps 1-2 green, Step 3 purple

### Test 4: After 3rd Import
1. Import third execution
2. **✓** Step boxes disappear completely

### Test 5: Delete All (Critical Test)
1. Delete all 3 executions
2. Go to Dashboard
3. **✓** Step boxes reappear
4. **✓** Back to: [□ 1] [□ 2] [□ 3] [□ 4]
5. **✓** Step 1 purple (active)

---

## Success Criteria

✅ Step boxes appear on Dashboard empty state
✅ Step boxes on Import page (already working)
✅ Step boxes on Execution pages (if count < 3)
✅ Execution count drives step state
✅ Empty dashboard ALWAYS resets progress
✅ Boxes hide after 3rd import
✅ Boxes reappear if all deleted
✅ Green checkmarks & purple outlines working
✅ No manual step updates in import handler needed

---

## What Changed

**Before:**
- localStorage tracked import count (out of sync with actual data)
- Manual step updates on import
- No auto-reset on empty dashboard
- Couldn't test without clearing cache manually

**After:**
- Execution count from database = source of truth
- Step state derives automatically from count
- Empty dashboard auto-resets
- Clean testing: just delete executions

**Simpler, more reliable!** 🎯
