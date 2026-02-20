# CLAUDE CODE PROMPT: Fix Step Boxes Logic + Remove from Import + Playback Scaling

## Summary

**3 fixes needed:**
1. Fix step progression logic (auto-complete 1-2, step 4 after 2nd import)
2. Remove step boxes from Import page (only Dashboard + Execution pages)
3. Fix Playback canvas scaling with browser window

---

## Part 1: Fix Step Progression Logic

**File:** `frontend/components/StepProgress.tsx`

**Update the execution count logic:**

```tsx
'use client';

import { useEffect, useState } from 'react';

interface StepProgressProps {
  className?: string;
  executionCount: number;
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
      // After 1st import: Steps 1-2 complete (redirected to analysis), Step 3 active
      setCurrentStep(3);
      setCompletedSteps([1, 2]);
      localStorage.setItem('signalflow-current-step', '3');
      localStorage.setItem('signalflow-completed-steps', JSON.stringify([1, 2]));
      return;
    }

    if (executionCount === 2) {
      // After 2nd import: Steps 1-3 complete, Step 4 active
      setCurrentStep(4);
      setCompletedSteps([1, 2, 3]);
      localStorage.setItem('signalflow-current-step', '4');
      localStorage.setItem('signalflow-completed-steps', JSON.stringify([1, 2, 3]));
      return;
    }

    // executionCount >= 3: Component will hide (see return null below)
  }, [executionCount]);

  // Listen for manual step updates (if needed for future features)
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

// Helper function for manual step completion (if needed)
export function updateStepProgress(updates: { completed?: number }) {
  const event = new CustomEvent('updateStepProgress', { detail: updates });
  window.dispatchEvent(event);
}
```

**Key changes:**
- `executionCount === 1` → Complete steps 1-2, activate step 3
- `executionCount === 2` → Complete steps 1-3, activate step 4
- `executionCount >= 3` → Hide completely

---

## Part 2: Remove Step Boxes from Import Page

**File:** `frontend/app/import/page.tsx`

**Remove the `<StepProgress />` component:**

```tsx
export default function ImportPage() {
  // ... existing code ...

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-8">
        
        {/* REMOVE THIS LINE: */}
        {/* <StepProgress executionCount={executionCount} className="mb-8" /> */}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-4xl font-bold text-neu-text">
            Import Execution
          </h1>
        </div>

        {/* Rest of import page unchanged */}
        {/* ... */}

      </div>
    </AppLayout>
  );
}
```

**Also remove any execution count fetching code that was only for step boxes:**

```tsx
// REMOVE these if they exist and aren't used elsewhere:
const [executionCount, setExecutionCount] = useState(0);

useEffect(() => {
  fetch('/api/executions')
    .then(res => res.json())
    .then(data => setExecutionCount(data.executions?.length || 0));
}, []);
```

---

## Part 3: Fix Playback Canvas Scaling

**File:** Component containing ReactFlow (likely `frontend/components/execution/PlaybackTab.tsx` or similar)

**Problem:** Canvas doesn't scale with browser window resize

**Solution:** Add resize listener and auto-fit

```tsx
'use client';

import { useEffect, useRef } from 'react';
import ReactFlow, { 
  useReactFlow,
  ReactFlowProvider,
  // ... other imports
} from 'reactflow';

function PlaybackContent({ executionId, executionData }: PlaybackTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Re-fit view when window resizes
      setTimeout(() => {
        fitView({ 
          duration: 200,
          padding: 0.1,
        });
      }, 100);
    };

    // Listen for resize events
    window.addEventListener('resize', handleResize);
    
    // Initial fit
    setTimeout(() => handleResize(), 300);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, [fitView]);

  return (
    <div className="space-y-6">
      {/* Playback controls */}
      <div className="flex items-center justify-between">
        {/* ... controls ... */}
      </div>

      {/* Canvas - with responsive height */}
      <div 
        ref={containerRef}
        className="neu-raised overflow-hidden rounded-xl"
        style={{ 
          height: 'calc(100vh - 400px)', // Responsive height
          minHeight: '500px',
          maxHeight: '800px',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{
            padding: 0.1,
            includeHiddenNodes: false,
            minZoom: 0.5,
            maxZoom: 1.5,
          }}
          style={{
            backgroundColor: '#1e2028',
            width: '100%',
            height: '100%',
          }}
          // ... other props
        >
          <Background 
            color="#282c38" 
            gap={16} 
            size={1}
            style={{ backgroundColor: '#1e2028' }}
          />
          <Controls 
            className="react-flow-controls-dark"
            showInteractive={false}
          />
          <MiniMap 
            className="react-flow-minimap-dark"
            nodeColor="#a89be0"
            maskColor="rgba(30, 32, 40, 0.8)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

// Wrap with ReactFlowProvider (required for useReactFlow hook)
export function PlaybackTab(props: PlaybackTabProps) {
  return (
    <ReactFlowProvider>
      <PlaybackContent {...props} />
    </ReactFlowProvider>
  );
}
```

**CSS for dark controls (if not already present):**

**File:** `frontend/app/globals.css` or wherever ReactFlow styles are

```css
/* ReactFlow Dark Theme Controls */
.react-flow-controls-dark button {
  background: #1e2028;
  border-color: #282c38;
  color: #d8d8e0;
  box-shadow: 3px 3px 6px #14161c, -3px -3px 6px #282c38;
}

.react-flow-controls-dark button:hover {
  background: #252730;
}

.react-flow-controls-dark button path {
  fill: currentColor;
}

.react-flow-minimap-dark {
  background: #1e2028;
  border: 1px solid #282c38;
}
```

---

## Verification Checklist

### Step Boxes Logic
- [ ] 0 imports (empty dashboard): [□ 1] [□ 2] [□ 3] [□ 4], Step 1 active
- [ ] 1 import: [✓ 1] [✓ 2] [● 3] [□ 4], Step 3 active
- [ ] 2 imports: [✓ 1] [✓ 2] [✓ 3] [● 4], Step 4 active
- [ ] 3 imports: Boxes disappear completely
- [ ] Delete all: Boxes reappear, reset to Step 1

### Step Boxes Location
- [ ] Dashboard (empty): Boxes appear ✓
- [ ] Dashboard (with executions < 3): Boxes appear ✓
- [ ] Import page: NO boxes ✓
- [ ] Execution pages (count < 3): Boxes appear ✓

### Playback Scaling
- [ ] Resize browser window smaller → Canvas shrinks, graph re-fits
- [ ] Resize browser window larger → Canvas expands, graph re-fits
- [ ] Graph remains centered and visible at all sizes
- [ ] Controls remain accessible
- [ ] No horizontal/vertical overflow issues

---

## Testing Steps

### Step Progression
1. **Empty Dashboard:**
   - Delete all executions
   - Check boxes: [□ 1] [□ 2] [□ 3] [□ 4]
   - Step 1 purple (active)

2. **After 1st Import:**
   - Import any workflow
   - Check boxes: [✓ 1] [✓ 2] [● 3] [□ 4]
   - Steps 1-2 green checkmarks
   - Step 3 purple (active)

3. **After 2nd Import:**
   - Import another workflow
   - Check boxes: [✓ 1] [✓ 2] [✓ 3] [● 4]
   - Steps 1-3 green checkmarks
   - Step 4 purple (active)

4. **After 3rd Import:**
   - Import third workflow
   - Boxes disappear from all pages

5. **Delete Test:**
   - Delete 1 execution → Boxes reappear, Step 4 active
   - Delete 2nd → Step 3 active
   - Delete 3rd (all gone) → Reset to Step 1 active

### Location Test
1. Dashboard (empty) → Boxes present ✓
2. Dashboard (with executions) → Boxes present if < 3 ✓
3. **Import page → NO boxes** ✓
4. Execution Overview → Boxes present if < 3 ✓
5. Execution tabs → Boxes present if < 3 ✓

### Playback Scaling
1. Open any execution → Playback tab
2. Make browser window narrower → Canvas shrinks, graph stays visible
3. Make browser window wider → Canvas expands, graph stays centered
4. Try different zoom levels → Graph adjusts properly
5. Controls remain clickable at all sizes

---

## Expected Results

### Step Progression
```
0 imports: [□ 1] [□ 2] [□ 3] [□ 4]  (Step 1 active)
           ↓ import
1 import:  [✓ 1] [✓ 2] [● 3] [□ 4]  (Step 3 active - ready to optimize)
           ↓ import
2 imports: [✓ 1] [✓ 2] [✓ 3] [● 4]  (Step 4 active - keep testing)
           ↓ import
3 imports: BOXES HIDDEN              (User experienced, hide boxes)
```

### Locations
- Dashboard: ✓ (if < 3 imports)
- Import page: ✗ (removed)
- Execution pages: ✓ (if < 3 imports)

### Playback
- Responsive canvas ✓
- Auto-fit on resize ✓
- Dark theme controls ✓
- Professional look ✓

---

## Success Criteria

✅ Steps 1-2 auto-complete after first import
✅ Step 4 active after second import
✅ Boxes hide after third import
✅ Boxes removed from Import page
✅ Playback canvas scales with window
✅ Graph re-fits automatically on resize
✅ All visual states correct (green ✓, purple active, gray locked)
✅ Empty dashboard resets progress

---

## Notes

**Step Labels Philosophy:**
- Steps show the IDEAL journey
- Users might deviate (import different workflows vs. optimized versions)
- That's OK - steps are aspirational, not prescriptive
- After 3 imports, user knows the platform → hide boxes

**Future Consideration:**
- If step labels cause confusion, can revisit
- Could simplify to 3 steps
- Could make labels more generic
- For now, move forward with current approach
