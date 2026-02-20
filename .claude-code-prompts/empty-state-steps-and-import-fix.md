# CLAUDE CODE PROMPT: Empty State Step Boxes + Import Instructions

## Overview

Implement the step-by-step progress boxes at the top of the Dashboard empty state and fix the Import page instructions to be context-specific.

**Reference Files:**
- Steps design: `/Users/scottcollier/dev/_shared/quick-share/signalflow/edits/steps.png`
- Current empty state: `/Users/scottcollier/dev/_shared/quick-share/signalflow/edits/current-empty-state.png`
- Upload instructions design: `/Users/scottcollier/dev/_shared/quick-share/signalflow/edits/upload.png`
- Paste instructions design: `/Users/scottcollier/dev/_shared/quick-share/signalflow/edits/paste.png`
- HTML mockup: `/Users/scottcollier/dev/_shared/quick-share/signalflow/sf-neu-page-1-dark.html`

---

## Part 1: Step Progress Boxes (Dashboard Empty State)

### Goal
Add 4 step boxes at the top of the Dashboard empty state that:
- Show the user's progress through the onboarding workflow
- Update as user completes each step
- Disappear once Dashboard has at least 1 execution

### Visual Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐│
│  │  ✓  1     │  │     2     │  │     3     │  │     4     ││
│  │ Import    │  │ View      │  │ Optimize  │  │ Import,   ││
│  │ Exec      │  │ Analysis  │  │ w/ Claude │  │ Test,     ││
│  │           │  │           │  │ Code      │  │ Repeat    ││
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘│
│   (completed)    (active)       (locked)       (locked)    │
│                                                             │
│  [Existing Import Container Below]                         │
└─────────────────────────────────────────────────────────────┘
```

### Step States

**1. Locked (Not Yet Started):**
- Gray number badge with muted styling
- Gray text
- Opacity reduced (`opacity-60`)
- Not clickable

**2. Active (Current Step):**
- Purple gradient number badge
- Purple accent text
- Full opacity
- Glow/highlight effect

**3. Completed (Done):**
- Green checkmark instead of number
- Green accent text
- Full opacity
- Subtle success styling

### Implementation

**File:** `frontend/app/dashboard/page.tsx`

**Add above the existing Import container when `executions.length === 0`:**

```tsx
{executions.length === 0 && (
  <div className="mb-12">
    {/* Step Progress Boxes */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl mx-auto mb-8">
      
      {/* Step 1: Import Executions */}
      <div className={`neu-raised-sm p-6 text-center transition-all duration-300 ${
        currentStep === 1 ? 'ring-2 ring-neu-accent shadow-lg' : 
        currentStep > 1 ? '' : 'opacity-60'
      }`}>
        <div className="flex flex-col items-center gap-3">
          {/* Number/Checkmark Badge */}
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-lg ${
            currentStep > 1 
              ? 'bg-gradient-to-br from-neu-green to-neu-teal text-white'
              : currentStep === 1
              ? 'bg-gradient-to-br from-neu-accent to-neu-accent-light text-white'
              : 'bg-neu-shadow-light text-neu-text-muted'
          }`}>
            {currentStep > 1 ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : '1'}
          </div>
          
          {/* Step Label */}
          <div>
            <div className={`font-semibold text-sm mb-1 ${
              currentStep === 1 ? 'text-neu-accent' : 
              currentStep > 1 ? 'text-neu-green' : 
              'text-neu-text-muted'
            }`}>
              Import Executions
            </div>
            <div className="text-xs text-neu-text-muted">
              Upload or fetch workflow data
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: View Analysis */}
      <div className={`neu-raised-sm p-6 text-center transition-all duration-300 ${
        currentStep === 2 ? 'ring-2 ring-neu-accent shadow-lg' : 
        currentStep > 2 ? '' : 'opacity-60'
      }`}>
        <div className="flex flex-col items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-lg ${
            currentStep > 2 
              ? 'bg-gradient-to-br from-neu-green to-neu-teal text-white'
              : currentStep === 2
              ? 'bg-gradient-to-br from-neu-accent to-neu-accent-light text-white'
              : 'bg-neu-shadow-light text-neu-text-muted'
          }`}>
            {currentStep > 2 ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : '2'}
          </div>
          <div>
            <div className={`font-semibold text-sm mb-1 ${
              currentStep === 2 ? 'text-neu-accent' : 
              currentStep > 2 ? 'text-neu-green' : 
              'text-neu-text-muted'
            }`}>
              View Analysis
            </div>
            <div className="text-xs text-neu-text-muted">
              Review bottlenecks & insights
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Optimize w/ Claude Code */}
      <div className={`neu-raised-sm p-6 text-center transition-all duration-300 ${
        currentStep === 3 ? 'ring-2 ring-neu-accent shadow-lg' : 
        currentStep > 3 ? '' : 'opacity-60'
      }`}>
        <div className="flex flex-col items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-lg ${
            currentStep > 3 
              ? 'bg-gradient-to-br from-neu-green to-neu-teal text-white'
              : currentStep === 3
              ? 'bg-gradient-to-br from-neu-accent to-neu-accent-light text-white'
              : 'bg-neu-shadow-light text-neu-text-muted'
          }`}>
            {currentStep > 3 ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : '3'}
          </div>
          <div>
            <div className={`font-semibold text-sm mb-1 ${
              currentStep === 3 ? 'text-neu-accent' : 
              currentStep > 3 ? 'text-neu-green' : 
              'text-neu-text-muted'
            }`}>
              Optimize w/ Claude Code
            </div>
            <div className="text-xs text-neu-text-muted">
              Generate optimized workflow
            </div>
          </div>
        </div>
      </div>

      {/* Step 4: Import, Test, Repeat */}
      <div className={`neu-raised-sm p-6 text-center transition-all duration-300 ${
        currentStep === 4 ? 'ring-2 ring-neu-accent shadow-lg' : 
        currentStep > 4 ? '' : 'opacity-60'
      }`}>
        <div className="flex flex-col items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-lg ${
            currentStep > 4 
              ? 'bg-gradient-to-br from-neu-green to-neu-teal text-white'
              : currentStep === 4
              ? 'bg-gradient-to-br from-neu-accent to-neu-accent-light text-white'
              : 'bg-neu-shadow-light text-neu-text-muted'
          }`}>
            {currentStep > 4 ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : '4'}
          </div>
          <div>
            <div className={`font-semibold text-sm mb-1 ${
              currentStep === 4 ? 'text-neu-accent' : 
              currentStep > 4 ? 'text-neu-green' : 
              'text-neu-text-muted'
            }`}>
              Import, Test, Repeat
            </div>
            <div className="text-xs text-neu-text-muted">
              See the improvement
            </div>
          </div>
        </div>
      </div>

    </div>

    {/* Existing Import Container */}
    {/* ... keep existing code ... */}
  </div>
)}
```

### Step Tracking Logic

**Add state management at component level:**

```tsx
const [currentStep, setCurrentStep] = useState(1);

// Load step from localStorage
useEffect(() => {
  const savedStep = localStorage.getItem('signalflow-onboarding-step');
  if (savedStep) {
    setCurrentStep(parseInt(savedStep));
  }
}, []);

// Update step when conditions met
const advanceStep = (newStep: number) => {
  setCurrentStep(newStep);
  localStorage.setItem('signalflow-onboarding-step', newStep.toString());
};

// Call advanceStep at appropriate times:
// - After first import: advanceStep(2)
// - After viewing analysis: advanceStep(3)
// - After clicking optimize: advanceStep(4)
// - After second import: advanceStep(5) // Hides steps
```

### Conditional Display

**Steps only show when Dashboard is empty:**

```tsx
{executions.length === 0 && (
  // Step boxes here
)}
```

**Once any execution exists, steps disappear completely.**

---

## Part 2: Fix Import Page Instructions

### Problem
Currently, all three import methods (Upload File, Paste JSON, Fetch from n8n) show the same instructions (Fetch instructions), which is confusing.

### Solution
Show context-specific instructions based on selected method.

### File to Modify
`frontend/app/import/page.tsx` (or wherever Import page lives)

---

### Instructions for Each Method

#### **Method 1: Upload File**

**Instructions (Simple & Clear):**

```tsx
<div className="neu-inset p-6 mb-6">
  <h3 className="font-display font-semibold text-neu-text mb-4 flex items-center gap-2">
    <svg className="w-5 h-5 text-neu-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
    How to Upload Your Execution File
  </h3>

  <div className="space-y-4 text-sm text-neu-text-muted">
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neu-accent/20 flex items-center justify-center text-neu-accent font-semibold text-xs">
        1
      </div>
      <div>
        <p className="font-semibold text-neu-text mb-1">Download from n8n</p>
        <p>In n8n, go to <span className="font-mono text-neu-accent">Executions</span> → Select execution → Click <span className="font-mono text-neu-accent">Download</span></p>
      </div>
    </div>

    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neu-accent/20 flex items-center justify-center text-neu-accent font-semibold text-xs">
        2
      </div>
      <div>
        <p className="font-semibold text-neu-text mb-1">Upload Here</p>
        <p>Click the upload zone above or drag & drop your <span className="font-mono text-neu-accent">.json</span> file</p>
      </div>
    </div>

    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neu-accent/20 flex items-center justify-center text-neu-accent font-semibold text-xs">
        3
      </div>
      <div>
        <p className="font-semibold text-neu-text mb-1">Analyze</p>
        <p>SignalFlow will process your workflow and identify optimization opportunities</p>
      </div>
    </div>
  </div>
</div>
```

---

#### **Method 2: Paste JSON**

**Instructions (API-based):**

```tsx
<div className="neu-inset p-6 mb-6">
  <h3 className="font-display font-semibold text-neu-text mb-4 flex items-center gap-2">
    <svg className="w-5 h-5 text-neu-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
    How to Paste Execution JSON
  </h3>

  <div className="space-y-4 text-sm text-neu-text-muted">
    
    {/* Step 1: Create API Key */}
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neu-accent/20 flex items-center justify-center text-neu-accent font-semibold text-xs">
        1
      </div>
      <div>
        <p className="font-semibold text-neu-text mb-1">Create an API Key</p>
        <ul className="space-y-1 list-disc list-inside ml-2">
          <li>In n8n, go to <span className="font-mono text-neu-accent">Settings → n8n API</span></li>
          <li>Click <span className="font-mono text-neu-accent">Create an API key</span></li>
          <li>Copy the key</li>
        </ul>
        <p className="text-xs mt-2 text-neu-orange">Note: n8n's public API may not be available on some plans/trials</p>
      </div>
    </div>

    {/* Step 2: Fetch & Copy JSON */}
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neu-accent/20 flex items-center justify-center text-neu-accent font-semibold text-xs">
        2
      </div>
      <div>
        <p className="font-semibold text-neu-text mb-2">Fetch Execution to Clipboard</p>
        
        {/* macOS */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-neu-accent mb-1">macOS</p>
          <pre className="bg-neu-shadow-dark p-3 rounded-lg overflow-x-auto text-xs font-mono">
{`curl -sS \\
  -H "X-N8N-API-KEY: YOUR_KEY_HERE" \\
  "https://<your-n8n-domain>/api/v1/executions/<execution-id>?includeData=true" \\
  | pbcopy`}
          </pre>
        </div>

        {/* Windows */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-neu-accent mb-1">Windows PowerShell</p>
          <pre className="bg-neu-shadow-dark p-3 rounded-lg overflow-x-auto text-xs font-mono">
{`(Invoke-RestMethod \`
  -Headers @{"X-N8N-API-KEY"="YOUR_KEY_HERE"} \`
  -Uri "https://<your-n8n-domain>/api/v1/executions/<execution-id>?includeData=true") \`
| ConvertTo-Json -Depth 100 \`
| Set-Clipboard`}
          </pre>
        </div>

        {/* Linux */}
        <div>
          <p className="text-xs font-semibold text-neu-accent mb-1">Linux (most desktops)</p>
          <pre className="bg-neu-shadow-dark p-3 rounded-lg overflow-x-auto text-xs font-mono">
{`curl -sS \\
  -H "X-N8N-API-KEY: YOUR_KEY_HERE" \\
  "https://<your-n8n-domain>/api/v1/executions/<execution-id>?includeData=true" \\
  | xclip -selection clipboard`}
          </pre>
        </div>
      </div>
    </div>

    {/* Step 3: Paste */}
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neu-accent/20 flex items-center justify-center text-neu-accent font-semibold text-xs">
        3
      </div>
      <div>
        <p className="font-semibold text-neu-text mb-1">Paste & Import</p>
        <p>Paste the JSON in the text area above and click <span className="font-mono text-neu-accent">Import Execution</span></p>
      </div>
    </div>

  </div>
</div>
```

---

#### **Method 3: Fetch from n8n**

**Instructions (Current - Keep as is):**

The current instructions for "Fetch from n8n" are correct. Keep them unchanged.

---

### Implementation Pattern

**Conditional Rendering Based on Selected Method:**

```tsx
const [importMethod, setImportMethod] = useState<'upload' | 'paste' | 'fetch'>('upload');

// In the render:
{importMethod === 'upload' && (
  // Upload File Instructions
)}

{importMethod === 'paste' && (
  // Paste JSON Instructions
)}

{importMethod === 'fetch' && (
  // Fetch from n8n Instructions (existing)
)}
```

---

## Part 3: Import Overlay (Optional - Low Priority)

**Note from Scott:** "If too complex then forgo on this update and consider its value based on complexity."

### What It Does
Instead of navigating to `/import` page, shows a slide-out overlay from the right side of the screen, keeping Dashboard context visible.

### Implementation Notes
- Uses modal/overlay pattern
- Slides in from right edge
- Semi-transparent backdrop
- Can be dismissed with ESC or clicking outside
- All import functionality same, just different presentation

**Decision:** Skip for now unless easy to implement. Focus on steps boxes and instructions first.

---

## Verification Checklist

### Step Boxes
- [ ] 4 boxes show at top of empty Dashboard
- [ ] Step 1 starts active (purple)
- [ ] Other steps start locked (gray)
- [ ] Checkmarks appear when steps completed
- [ ] Steps disappear when any execution exists
- [ ] Responsive on mobile (stack vertically)

### Import Instructions
- [ ] Upload File shows upload-specific instructions
- [ ] Paste JSON shows API + clipboard commands
- [ ] Fetch from n8n keeps current instructions
- [ ] Instructions match selected method
- [ ] All code blocks properly formatted
- [ ] Clear step-by-step numbering

### Styling
- [ ] Matches neumorphic design system
- [ ] Dark theme throughout
- [ ] Purple accents for active state
- [ ] Green for completed state
- [ ] Proper spacing and typography

---

## Testing Steps

### Empty State Steps
1. Delete all executions from Dashboard
2. Reload page
3. Should see 4 step boxes at top
4. Step 1 should be active (purple)
5. Import an execution
6. Step boxes should disappear

### Import Instructions
1. Go to Import page
2. Select "Upload File" → See upload instructions
3. Select "Paste JSON" → See API/clipboard instructions
4. Select "Fetch from n8n" → See current instructions
5. Verify all code blocks render correctly

---

## Success Criteria

✅ Empty Dashboard shows clear onboarding steps
✅ User knows exactly where they are in the process
✅ Steps update as user progresses
✅ Import instructions are method-specific and accurate
✅ Design matches established neumorphic theme
✅ Responsive and accessible
✅ Portfolio-quality appearance

