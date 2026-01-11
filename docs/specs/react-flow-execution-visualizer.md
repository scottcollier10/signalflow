# React Flow Execution Visualizer Spec

## Overview
Build the execution playback component that visualizes workflow execution using React Flow. This component consumes the normalized execution data from the API and provides animated playback of the 52 executed nodes.

## Component Architecture

### File Structure
```
frontend/src/components/execution-visualizer/
├── ExecutionVisualizer.tsx          # Main container
├── WorkflowCanvas.tsx               # React Flow canvas
├── PlaybackControls.tsx             # Play/pause/speed controls
├── NodeRenderer.tsx                 # Custom node with state
├── EventTimeline.tsx                # Timeline scrubber
├── types.ts                         # TypeScript interfaces
└── hooks/
    ├── useExecutionPlayback.ts      # Playback state management
    └── useWorkflowLayout.ts         # Auto-layout logic
```

## Data Flow
```
API Response (460 events)
    ↓
ExecutionVisualizer (loads data)
    ↓
useExecutionPlayback (manages playback state)
    ↓
WorkflowCanvas (renders + animates nodes)
    ↓
NodeRenderer (displays state per node)
```

## Phase 1: Core Visualization (Today)

### 1. Data Fetching & Transform

**API Integration:**
```typescript
// types.ts
interface ExecutionData {
  workflow: {
    id: string;
    name: string;
    nodes: Node[];
    connections: Connections;
  };
  events: ExecutionEvent[];
}

interface ExecutionEvent {
  node_id: string;
  node_name: string;
  event_type: 'started' | 'finished' | 'error' | 'retry' | 'skipped';
  timestamp: string;
  duration_ms?: number;
  sequence_order: number;
}
```

**Transform to React Flow:**
```typescript
// Convert n8n nodes → React Flow nodes
function transformToReactFlowNodes(n8nNodes: any[]): Node[] {
  return n8nNodes.map(node => ({
    id: node.id,
    type: 'executionNode',  // Custom node type
    position: node.position,
    data: {
      label: node.name,
      nodeType: node.type,
      state: 'idle',  // Initial state
      duration: null,
    },
  }));
}

// Convert n8n connections → React Flow edges
function transformToReactFlowEdges(connections: any): Edge[] {
  const edges: Edge[] = [];
  Object.entries(connections).forEach(([sourceId, targets]) => {
    // Parse n8n connection format to edges
  });
  return edges;
}
```

### 2. Custom Node Component

**NodeRenderer.tsx:**
```typescript
import { Handle, Position } from 'reactflow';

interface NodeData {
  label: string;
  nodeType: string;
  state: 'idle' | 'executing' | 'completed' | 'error';
  duration: number | null;
}

function ExecutionNode({ data }: { data: NodeData }) {
  const getNodeStyle = () => {
    switch (data.state) {
      case 'executing':
        return 'border-blue-500 bg-blue-50 shadow-lg animate-pulse';
      case 'completed':
        return 'border-green-500 bg-green-50';
      case 'error':
        return 'border-red-500 bg-red-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  return (
    <div className={`px-4 py-2 rounded border-2 ${getNodeStyle()}`}>
      <Handle type="target" position={Position.Top} />
      
      <div className="font-medium">{data.label}</div>
      
      {data.duration && (
        <div className="text-xs text-gray-600 mt-1">
          {data.duration}ms
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

### 3. Playback Logic

**useExecutionPlayback.ts:**
```typescript
interface PlaybackState {
  isPlaying: boolean;
  currentEventIndex: number;
  speed: number;  // 1x, 2x, 5x, 10x
  progress: number;  // 0-100%
}

function useExecutionPlayback(events: ExecutionEvent[]) {
  const [state, setState] = useState<PlaybackState>({
    isPlaying: false,
    currentEventIndex: 0,
    speed: 1,
    progress: 0,
  });

  const [nodeStates, setNodeStates] = useState<Map<string, NodeState>>(
    new Map()
  );

  // Core playback loop
  useEffect(() => {
    if (!state.isPlaying) return;

    const currentEvent = events[state.currentEventIndex];
    if (!currentEvent) {
      setState(s => ({ ...s, isPlaying: false }));
      return;
    }

    // Calculate delay until next event
    const nextEvent = events[state.currentEventIndex + 1];
    const delay = nextEvent 
      ? calculateDelay(currentEvent, nextEvent) / state.speed
      : 0;

    const timer = setTimeout(() => {
      // Update node state based on event type
      updateNodeState(currentEvent);
      
      // Advance to next event
      setState(s => ({
        ...s,
        currentEventIndex: s.currentEventIndex + 1,
        progress: ((s.currentEventIndex + 1) / events.length) * 100,
      }));
    }, delay);

    return () => clearTimeout(timer);
  }, [state.isPlaying, state.currentEventIndex, state.speed]);

  function calculateDelay(current: ExecutionEvent, next: ExecutionEvent) {
    const currentTime = new Date(current.timestamp).getTime();
    const nextTime = new Date(next.timestamp).getTime();
    return nextTime - currentTime;
  }

  function updateNodeState(event: ExecutionEvent) {
    setNodeStates(prev => {
      const updated = new Map(prev);
      
      switch (event.event_type) {
        case 'started':
          updated.set(event.node_id, {
            state: 'executing',
            duration: null,
          });
          break;
        case 'finished':
          updated.set(event.node_id, {
            state: 'completed',
            duration: event.duration_ms,
          });
          break;
        case 'error':
          updated.set(event.node_id, {
            state: 'error',
            duration: event.duration_ms,
          });
          break;
      }
      
      return updated;
    });
  }

  return {
    playbackState: state,
    nodeStates,
    controls: {
      play: () => setState(s => ({ ...s, isPlaying: true })),
      pause: () => setState(s => ({ ...s, isPlaying: false })),
      reset: () => {
        setState({
          isPlaying: false,
          currentEventIndex: 0,
          speed: 1,
          progress: 0,
        });
        setNodeStates(new Map());
      },
      setSpeed: (speed: number) => setState(s => ({ ...s, speed })),
      seekTo: (eventIndex: number) => {
        setState(s => ({ ...s, currentEventIndex: eventIndex }));
        // Replay events up to this point instantly
        replayToIndex(eventIndex);
      },
    },
  };
}
```

### 4. Main Container

**ExecutionVisualizer.tsx:**
```typescript
function ExecutionVisualizer({ workflowId, executionId }: Props) {
  const [data, setData] = useState<ExecutionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/workflows/${workflowId}/executions/${executionId}`)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, [workflowId, executionId]);

  if (loading) return <LoadingSpinner />;
  if (!data) return <ErrorState />;

  const nodes = transformToReactFlowNodes(data.workflow.nodes);
  const edges = transformToReactFlowEdges(data.workflow.connections);

  const { playbackState, nodeStates, controls } = useExecutionPlayback(
    data.events
  );

  // Update node states for rendering
  const updatedNodes = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      ...(nodeStates.get(node.id) || {}),
    },
  }));

  return (
    <div className="h-screen flex flex-col">
      <header className="p-4 border-b">
        <h1 className="text-xl font-bold">{data.workflow.name}</h1>
        <p className="text-sm text-gray-600">
          {data.events.length} events • {nodes.length} nodes
        </p>
      </header>

      <div className="flex-1">
        <WorkflowCanvas
          nodes={updatedNodes}
          edges={edges}
          nodeTypes={{ executionNode: ExecutionNode }}
        />
      </div>

      <PlaybackControls
        state={playbackState}
        controls={controls}
        totalEvents={data.events.length}
      />
    </div>
  );
}
```

### 5. Playback Controls

**PlaybackControls.tsx:**
```typescript
function PlaybackControls({ state, controls, totalEvents }: Props) {
  return (
    <div className="border-t p-4 bg-gray-50">
      <div className="flex items-center gap-4">
        {/* Play/Pause */}
        <button
          onClick={state.isPlaying ? controls.pause : controls.play}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {state.isPlaying ? 'Pause' : 'Play'}
        </button>

        {/* Reset */}
        <button
          onClick={controls.reset}
          className="px-4 py-2 bg-gray-200 rounded"
        >
          Reset
        </button>

        {/* Speed Control */}
        <select
          value={state.speed}
          onChange={e => controls.setSpeed(Number(e.target.value))}
          className="px-3 py-2 border rounded"
        >
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={5}>5x</option>
          <option value={10}>10x</option>
        </select>

        {/* Progress Bar */}
        <div className="flex-1">
          <div className="h-2 bg-gray-200 rounded overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Event {state.currentEventIndex} of {totalEvents}
          </p>
        </div>
      </div>
    </div>
  );
}
```

## Implementation Steps

### Step 1: Setup React Flow
```bash
cd frontend
npm install reactflow
```

### Step 2: Create Component Files
Create the file structure listed above with initial scaffolding.

### Step 3: Implement Data Transform
Build the n8n → React Flow transform functions first (testable independently).

### Step 4: Build Custom Node
Create ExecutionNode component with state-based styling.

### Step 5: Implement Playback Hook
Build useExecutionPlayback with play/pause/speed controls.

### Step 6: Wire Everything Together
Assemble ExecutionVisualizer container and test with real execution data.

## Testing Strategy

1. **Static Rendering:** Load workflow, verify 74 nodes render
2. **Connection Rendering:** Verify edges connect correctly
3. **Event Playback:** Play through 460 events, verify state changes
4. **Timing Accuracy:** Check delays match real execution timeline
5. **Controls:** Test play/pause/reset/speed/seek functionality

## Success Criteria

- ✅ Workflow renders with 74 nodes in correct positions
- ✅ Playback animates through all 460 events
- ✅ Node states update correctly (idle → executing → completed)
- ✅ Duration displayed on completed nodes
- ✅ Controls work (play/pause/speed)
- ✅ Progress bar shows current position
- ✅ Can reset and replay

## Phase 2 Features (Future)

- Timeline scrubber for seeking
- Event log sidebar
- Critical path highlighting
- Bottleneck indicators
- Error state details
- Zoom to fit / focus node

## Notes

- Use React Flow's built-in auto-layout if n8n positions are missing
- Cache node states for instant seek
- Consider virtualizing large workflows (>100 nodes)
- Add loading states for API calls
- Handle error states gracefully