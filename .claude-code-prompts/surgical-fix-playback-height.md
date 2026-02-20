# CLAUDE CODE PROMPT: Surgical Fix - Playback Canvas Responsive Height

## Problem

**Current state:** Canvas is fixed height, not responsive, nodes not showing

**Goal:** Canvas should scale dynamically with browser window, always visible controls

---

## Minimal Fix - Replace ONLY the Canvas Container

**File:** Find the Playback component (likely `frontend/components/execution/PlaybackTab.tsx`)

**Find this section (the ReactFlow container div):**

```tsx
<div /* ... ReactFlow container ... */>
  <ReactFlow /* ... */>
    {/* ... */}
  </ReactFlow>
</div>
```

**Replace ONLY the container div with this simple version:**

```tsx
<div 
  className="neu-raised overflow-hidden rounded-xl"
  style={{ 
    width: '100%',
    height: 'calc(100vh - 450px)', // Viewport height minus all UI elements
    minHeight: '500px',            // Minimum usable height
  }}
>
  <ReactFlow
    nodes={nodes}
    edges={edges}
    fitView
    fitViewOptions={{
      padding: 0.1,
      includeHiddenNodes: false,
    }}
    style={{
      backgroundColor: '#1e2028',
      width: '100%',
      height: '100%',
    }}
    onNodesChange={onNodesChange}
    onEdgesChange={onEdgesChange}
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
```

**That's it!** Don't change anything else.

---

## Key Points

**What this does:**
- `calc(100vh - 450px)` → Dynamic height based on viewport
- Subtracts space for header, tabs, controls, footer
- `minHeight: 500px` → Ensures canvas is never too small
- `width: 100%` → Full width, responsive
- ReactFlow gets `width: 100%, height: 100%` → Fills container

**What changed from before:**
- Used `calc()` for dynamic height instead of fixed pixels
- Removed any flex constraints that break ReactFlow
- Simple, minimal approach

---

## Adjust the 450px Value If Needed

**If controls still cut off:**
- Increase: `calc(100vh - 500px)` (more space for UI)

**If too much space at bottom:**
- Decrease: `calc(100vh - 400px)` (less space for UI)

**The number should equal:**
- Header height (~100px)
- Tab navigation (~60px)
- Step boxes (~120px, if visible)
- Padding/margins (~80px)
- Footer (~50px)
- Controls/timeline (~40px)
= ~450px total

---

## If Nodes Still Not Showing

**Add resize trigger to re-fit view:**

```tsx
import { useEffect } from 'react';
import { useReactFlow } from 'reactflow';

function PlaybackContent() {
  const { fitView } = useReactFlow();

  useEffect(() => {
    // Force re-fit after component mounts
    setTimeout(() => fitView({ duration: 200 }), 300);
  }, [fitView]);

  // ... rest of component
}
```

---

## Verification

- [ ] Nodes appear in canvas ✓
- [ ] Canvas scales with browser window ✓
- [ ] Controls visible at bottom ✓
- [ ] No vertical overflow ✓
- [ ] Graph re-fits when window resizes ✓

---

## Success Criteria

✅ Canvas responds to window resize (scales dynamically)
✅ Nodes visible in graph
✅ Controls always visible
✅ No scrolling needed
✅ Simple, minimal change

