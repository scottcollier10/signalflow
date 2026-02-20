# CLAUDE CODE PROMPT: Fix Playback Canvas Height - Keep Controls Visible

## Problem

**Reference:** `/Users/scottcollier/dev/_shared/quick-share/signalflow/edits/playback-fix-2.png`

**Issue:**
- Playback canvas extends beyond viewport
- Player controls cut off at bottom
- User must scroll down sidebar to see controls
- Controls should always be visible, aligned with footer

---

## Solution

**Make canvas height responsive to actual available space:**
- Calculate height based on viewport minus all UI elements
- Ensure controls always visible at bottom
- Maintain proper spacing

---

## Part 1: Fix Canvas Container Height

**File:** Component containing ReactFlow Playback (likely `frontend/components/execution/PlaybackTab.tsx`)

**Replace the canvas container with proper height calculation:**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
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
      setTimeout(() => {
        fitView({ 
          duration: 200,
          padding: 0.1,
        });
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    setTimeout(() => handleResize(), 300);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [fitView]);

  return (
    <div className="flex flex-col h-full">
      
      {/* Playback Controls - Above canvas */}
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center gap-4">
          {/* Play/Pause button */}
          <button className="neu-button-primary w-12 h-12 rounded-full flex items-center justify-center">
            {/* Play icon */}
          </button>
          
          {/* Speed control */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-neu-text-muted">Speed:</span>
            <select className="neu-input py-1 px-2 text-sm">
              <option>1x</option>
              <option>2x</option>
              <option>0.5x</option>
            </select>
          </div>
        </div>

        {/* Additional controls */}
        <div className="flex items-center gap-2">
          {/* Reset, zoom controls, etc. */}
        </div>
      </div>

      {/* Canvas - Flex-grow to fill available space */}
      <div 
        ref={containerRef}
        className="neu-raised overflow-hidden rounded-xl flex-1"
        style={{ 
          minHeight: '400px', // Minimum height
          maxHeight: '70vh',  // Don't exceed 70% of viewport
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

      {/* Timeline Scrubber - Below canvas, always visible */}
      <div className="mt-4 px-4">
        <div className="flex items-center gap-4">
          
          {/* Timeline slider */}
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max={events.length - 1}
              value={currentEvent}
              onChange={(e) => setCurrentEvent(parseInt(e.target.value))}
              className="w-full h-2 bg-neu-shadow-light rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Event counter */}
          <div className="text-sm text-neu-text-muted whitespace-nowrap">
            Event {currentEvent + 1} of {events.length}
          </div>

          {/* Timestamp */}
          <div className="text-sm text-neu-text-muted whitespace-nowrap">
            {formatTime(currentTime)}
          </div>
        </div>
      </div>

    </div>
  );
}

// Wrap with ReactFlowProvider
export function PlaybackTab(props: PlaybackTabProps) {
  return (
    <ReactFlowProvider>
      <PlaybackContent {...props} />
    </ReactFlowProvider>
  );
}
```

---

## Part 2: Ensure Parent Container Has Proper Height

**File:** Wherever Playback tab is rendered (likely `frontend/app/execution/[id]/page.tsx`)

**Make sure the tab content container doesn't have fixed height:**

```tsx
export default function ExecutionPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-8">
        
        {/* Header */}
        <div className="mb-6">
          {/* Back button, execution title, etc. */}
        </div>

        {/* Step boxes (if applicable) */}
        {executionCount < 3 && (
          <StepProgress executionCount={executionCount} className="mb-6" />
        )}

        {/* Tab Navigation */}
        <div className="neu-raised-sm p-1 mb-6 inline-flex gap-1">
          {/* Tab buttons */}
        </div>

        {/* Tab Content - NO fixed height, let content determine size */}
        <div className="min-h-[600px]">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'playback' && <PlaybackTab executionId={params.id} />}
          {activeTab === 'critical-path' && <CriticalPathTab />}
          {activeTab === 'bottlenecks' && <BottlenecksTab />}
          {activeTab === 'errors' && <ErrorsTab />}
          {activeTab === 'recommendations' && <RecommendationsTab />}
        </div>

      </div>
    </AppLayout>
  );
}
```

---

## Part 3: Alternative - Fixed Aspect Ratio Approach

**If the flex approach doesn't work, use fixed aspect ratio:**

```tsx
{/* Canvas - 16:9 aspect ratio that fits viewport */}
<div 
  ref={containerRef}
  className="neu-raised overflow-hidden rounded-xl w-full"
  style={{ 
    aspectRatio: '16 / 9',
    maxHeight: 'calc(100vh - 350px)', // Viewport minus header/footer/padding
  }}
>
  <ReactFlow
    {/* ... props ... */}
  >
    {/* ... children ... */}
  </ReactFlow>
</div>
```

---

## Part 4: CSS Helper Classes (If Needed)

**File:** `frontend/app/globals.css`

```css
/* Ensure playback container doesn't overflow */
.playback-container {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 300px); /* Adjust based on your header/footer */
}

/* Timeline scrubber styling */
input[type="range"].playback-timeline {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
}

input[type="range"].playback-timeline::-webkit-slider-track {
  width: 100%;
  height: 8px;
  background: #282c38;
  border-radius: 4px;
}

input[type="range"].playback-timeline::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #a89be0;
  border-radius: 50%;
  cursor: pointer;
}

input[type="range"].playback-timeline::-moz-range-track {
  width: 100%;
  height: 8px;
  background: #282c38;
  border-radius: 4px;
}

input[type="range"].playback-timeline::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #a89be0;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}
```

---

## Verification Checklist

### Canvas Height
- [ ] Playback canvas fits within viewport
- [ ] No vertical scrolling needed to see controls
- [ ] Controls always visible at bottom
- [ ] Canvas resizes with browser window
- [ ] Minimum height maintained (400px)
- [ ] Maximum height respected (70vh)

### Layout Structure
- [ ] Play/pause controls above canvas
- [ ] Canvas in middle (flex-grow)
- [ ] Timeline scrubber below canvas
- [ ] All elements visible without scrolling
- [ ] Footer aligned properly

### Responsive Behavior
- [ ] Small screen: Canvas shrinks, controls visible
- [ ] Large screen: Canvas grows, controls visible
- [ ] All screen sizes: No overflow
- [ ] Graph re-fits when canvas resizes

---

## Testing Steps

1. **Default Size:**
   - Open Playback tab
   - Check: All controls visible without scrolling ✓
   - Check: Footer at bottom, controls above it ✓

2. **Resize Window Smaller:**
   - Make browser window narrower
   - Check: Canvas shrinks ✓
   - Check: Controls still visible ✓
   - Check: No horizontal scrolling ✓

3. **Resize Window Larger:**
   - Make browser window wider
   - Check: Canvas expands (up to maxHeight) ✓
   - Check: Controls still visible ✓
   - Check: Layout looks balanced ✓

4. **Very Small Screen:**
   - Resize to mobile-like size
   - Check: Minimum height maintained ✓
   - Check: Controls accessible ✓
   - Check: Can still interact with playback ✓

5. **Footer Alignment:**
   - Scroll to bottom of page
   - Check: Footer at bottom ✓
   - Check: Controls above footer ✓
   - Check: No overlap ✓

---

## Expected Result

**Layout Structure:**
```
┌─────────────────────────────────────┐
│ Header / Tabs / Step Boxes         │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────────────────────────┐│
│ │ ▶ Play   Speed: 1x   Controls   ││ ← Always visible
│ └─────────────────────────────────┘│
│                                     │
│ ┌─────────────────────────────────┐│
│ │                                 ││
│ │      ReactFlow Canvas           ││ ← Responsive height
│ │      (Graph visualization)      ││
│ │                                 ││
│ └─────────────────────────────────┘│
│                                     │
│ ┌─────────────────────────────────┐│
│ │ ━━━━━━━━●━━━━━━  Event 5/14    ││ ← Always visible
│ └─────────────────────────────────┘│
│                                     │
├─────────────────────────────────────┤
│ Footer: SignalFlow v0.8            │
└─────────────────────────────────────┘
```

**All playback controls visible within viewport!** ✅

---

## Success Criteria

✅ Canvas height fits within viewport
✅ Controls always visible (no scrolling needed)
✅ Layout aligns with footer properly
✅ Responsive to window resize
✅ Minimum/maximum heights enforced
✅ Professional, polished appearance
✅ Graph re-fits on resize

---

## Notes

**Height Calculation Strategy:**
- Use `max-height: 70vh` to prevent overflow
- Use `flex-1` to fill available space
- Use `minHeight: 400px` to maintain usability
- Let flexbox handle the rest

**Why This Works:**
- Flexbox automatically distributes space
- Max height prevents viewport overflow
- Controls always at bottom (flex layout)
- Responsive without complex calculations
