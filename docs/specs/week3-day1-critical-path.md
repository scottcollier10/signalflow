# Week 3 Day 1: Critical Path Algorithm Specification

**Created**: January 10, 2026  
**Status**: Implementation Ready  
**Module**: `backend/src/analysis/critical_path.py`  
**API Endpoint**: `GET /api/workflows/{workflow_id}/executions/{execution_id}/critical-path`

---

## Overview

The critical path algorithm identifies the longest sequence of nodes through a workflow execution, determining which nodes actually block overall completion time. This is essential for bottleneck analysis - a slow node matters most when it's on the critical path.

### Key Insight
A node that takes 5 seconds but runs in parallel with other work is **not** a bottleneck. A node that takes 2 seconds **on the critical path** blocks everything downstream and IS a bottleneck.

### Real-World Example (From Our 72-Node Workflow)
```
Total Duration: 115.12 seconds
Total Nodes: 74 nodes in workflow
Executed Nodes: 52 nodes (22 skipped due to IF branches)
Events: 460 events

Expected Critical Path: ~10-15 nodes representing the longest sequential chain
Known Slow Node: claude_ai_generate (3.2s) - likely on critical path
```

---

## Data Structure Context

### Input Data Sources

#### 1. Workflow Structure (`workflow_nodes` + `workflow_edges`)
```sql
-- Nodes
SELECT node_id, node_name, node_type 
FROM workflow_nodes 
WHERE workflow_id = '8ce95407-8381-4756-85aa-c5c2a0251384';

-- 74 nodes total

-- Edges (defines DAG structure)
SELECT source_node_id, target_node_id 
FROM workflow_edges 
WHERE workflow_id = '8ce95407-8381-4756-85aa-c5c2a0251384';

-- 75 edges
-- NO null sources (every node except webhook has parent)
-- Multiple edges to same node = that node depends on multiple parents
```

**Key Properties**:
- Every node except the starting webhook has >= 1 incoming edge
- Parallel execution = multiple nodes with edges from same parent
- IF branches = some targets may not execute (will have no events)

#### 2. Execution Events (`execution_events`)
```sql
-- Node execution timing
SELECT 
    node_id,
    event_type,  -- STARTED, FINISHED, ERROR
    timestamp,
    duration_ms
FROM execution_events
WHERE execution_id = '15720484-8e33-464b-84b8-0936ecfa7096'
ORDER BY timestamp;

-- 460 events for 52 executed nodes
-- 22 nodes have NO events (skipped by IF branches)
```

**Key Properties**:
- Only executed nodes have events
- Each executed node has STARTED event + (FINISHED OR ERROR) event
- `duration_ms` is stored on completion events (FINISHED/ERROR)
- Skipped nodes = node_id exists in workflow_nodes but not in execution_events

---

## Algorithm Design

### Phase 1: Data Loading & Graph Construction

#### 1.1 Load Workflow Structure
```python
def load_workflow_graph(workflow_id: str) -> Dict:
    """
    Returns:
    {
        'nodes': {
            'node_id_1': {'name': 'Webhook', 'type': 'webhook'},
            'node_id_2': {'name': 'Fetch Brief', 'type': 'http_request'},
            ...
        },
        'edges': [
            ('node_id_1', 'node_id_2'),  # source → target
            ('node_id_1', 'node_id_3'),  # parallel branch
            ...
        ]
    }
    """
```

#### 1.2 Load Execution Timing
```python
def load_execution_timing(execution_id: str) -> Dict:
    """
    Returns:
    {
        'node_id_1': {
            'start_time': datetime(2026, 1, 9, 10, 0, 0),
            'finish_time': datetime(2026, 1, 9, 10, 0, 1.5),
            'duration_ms': 1500,
            'status': 'success'  # or 'error'
        },
        'node_id_2': {
            'start_time': datetime(2026, 1, 9, 10, 0, 1.5),
            'finish_time': datetime(2026, 1, 9, 10, 0, 4.7),
            'duration_ms': 3200,
            'status': 'success'
        },
        ...
    }
    """
    # Only includes 52 executed nodes
    # 22 skipped nodes will NOT be in this dict
```

**Implementation Notes**:
- Query for STARTED events to get start_time
- Query for FINISHED or ERROR events to get finish_time and duration_ms
- Use ERROR event timestamp as finish_time if node failed
- Store status='error' if completion event type is ERROR

#### 1.3 Build Execution Graph
```python
def build_execution_graph(workflow_graph: Dict, execution_timing: Dict) -> Dict:
    """
    Filter workflow graph to only include executed nodes.
    
    Returns:
    {
        'nodes': {'node_id': timing_data},  # Only 52 executed nodes
        'adjacency_list': {
            'node_id_1': ['node_id_2', 'node_id_3'],  # children
            ...
        },
        'reverse_adjacency_list': {
            'node_id_2': ['node_id_1'],  # parents
            ...
        }
    }
    """
    # Filter out edges where source or target didn't execute
    # Build forward (parent→child) and reverse (child→parent) adjacency lists
```

**Why Filter?**
- Skipped nodes (IF branches) break the execution DAG
- Example: IF condition false → entire branch skipped → no events
- We only care about the path through nodes that actually ran

---

### Phase 2: Topological Sort (Validation)

#### Purpose
- Validate the execution graph is a proper DAG (no cycles)
- Provide node ordering for longest path algorithm
- Catch data corruption or workflow design errors

#### Algorithm: Kahn's Algorithm
```python
def topological_sort(execution_graph: Dict) -> List[str]:
    """
    Returns: Ordered list of node_ids (dependencies before dependents)
    Raises: ValueError if cycle detected
    """
    # 1. Calculate in-degree (# of incoming edges) for each node
    in_degree = {node: 0 for node in execution_graph['nodes']}
    for parent, children in execution_graph['adjacency_list'].items():
        for child in children:
            in_degree[child] += 1
    
    # 2. Start with nodes that have no dependencies (in-degree = 0)
    queue = [node for node, degree in in_degree.items() if degree == 0]
    result = []
    
    # 3. Process nodes in dependency order
    while queue:
        node = queue.pop(0)
        result.append(node)
        
        # Remove this node's edges, decrease children's in-degree
        for child in execution_graph['adjacency_list'].get(node, []):
            in_degree[child] -= 1
            if in_degree[child] == 0:
                queue.append(child)
    
    # 4. If we didn't process all nodes, there's a cycle
    if len(result) != len(execution_graph['nodes']):
        raise ValueError("Cycle detected in workflow execution graph")
    
    return result
```

**Expected Output** (for 72-node workflow):
```python
[
    'webhook_node',           # Start (in-degree = 0)
    'fetch_brief',            # Parallel branch 1
    'parse_request',          # Parallel branch 2
    'merge_node',             # Depends on both branches
    'claude_ai_generate',     # Sequential after merge
    ...
]
```

**Edge Cases**:
- **Parallel start nodes**: Multiple nodes with in-degree=0 is OK (truly parallel start)
- **Merge nodes**: Node with multiple parents is OK (waits for all parents)
- **Cycle detection**: n8n shouldn't allow cycles, but validate anyway

---

### Phase 3: Longest Path Calculation

#### Concept: Forward Pass (Dynamic Programming)

For each node in topological order:
1. **Earliest Start Time** = MAX(all parent finish times)
2. **Finish Time** = Earliest Start Time + Node Duration
3. Track which parent contributed the max (for path reconstruction)

#### Algorithm
```python
def calculate_longest_path(execution_graph: Dict, topo_order: List[str]) -> Dict:
    """
    Returns:
    {
        'earliest_start': {node_id: timestamp},
        'finish_time': {node_id: timestamp},
        'predecessor': {node_id: parent_node_id},  # for path reconstruction
        'cumulative_duration': {node_id: milliseconds}
    }
    """
    timing = execution_graph['nodes']  # node_id → timing data
    parents = execution_graph['reverse_adjacency_list']
    
    earliest_start = {}
    finish_time = {}
    predecessor = {}
    cumulative_duration = {}
    
    for node in topo_order:
        # Get all parent finish times
        parent_nodes = parents.get(node, [])
        
        if not parent_nodes:
            # Start node (no parents)
            earliest_start[node] = timing[node]['start_time']
            cumulative_duration[node] = 0
            predecessor[node] = None
        else:
            # Find parent with latest finish time
            latest_parent = max(
                parent_nodes,
                key=lambda p: finish_time[p]
            )
            earliest_start[node] = finish_time[latest_parent]
            predecessor[node] = latest_parent
            cumulative_duration[node] = (
                cumulative_duration[latest_parent] + 
                timing[node]['duration_ms']
            )
        
        # Calculate this node's finish time
        finish_time[node] = (
            earliest_start[node] + 
            timedelta(milliseconds=timing[node]['duration_ms'])
        )
    
    return {
        'earliest_start': earliest_start,
        'finish_time': finish_time,
        'predecessor': predecessor,
        'cumulative_duration': cumulative_duration
    }
```

#### Example Walkthrough (Simplified)

```
Workflow Structure:
Webhook (0ms) → Fetch (1000ms) → Process (2000ms)
              → Parse (500ms)  ↗

Execution:
Node        | Start    | Duration | Finish   | Cumulative
------------|----------|----------|----------|------------
Webhook     | 0ms      | 0ms      | 0ms      | 0ms
Fetch       | 0ms      | 1000ms   | 1000ms   | 1000ms
Parse       | 0ms      | 500ms    | 500ms    | 500ms
Process     | 1000ms*  | 2000ms   | 3000ms   | 3000ms

* Process waits for Fetch (1000ms) not Parse (500ms)
  → Fetch is on critical path, Parse is NOT
```

**Key Insight**: Even though Parse is faster, it doesn't matter because Process is blocked waiting for Fetch to complete.

---

### Phase 4: Path Reconstruction

#### Algorithm: Backward Pass
```python
def reconstruct_critical_path(path_data: Dict) -> List[str]:
    """
    Backtrack from final node to start using predecessor links.
    
    Returns: [node_id_1, node_id_2, ..., node_id_N]
    """
    # Find the final node (latest finish time)
    final_node = max(
        path_data['finish_time'].keys(),
        key=lambda n: path_data['finish_time'][n]
    )
    
    # Backtrack using predecessor links
    path = []
    current = final_node
    
    while current is not None:
        path.append(current)
        current = path_data['predecessor'][current]
    
    # Reverse to get start → finish order
    return list(reversed(path))
```

#### Expected Output (72-Node Workflow)
```python
{
    "critical_path": [
        "webhook_trigger",
        "fetch_brief_node",
        "merge_data_node",
        "claude_ai_generate",  # 3.2s bottleneck
        "format_output",
        "send_response"
    ],
    "total_duration_ms": 115120,  # 115.12 seconds
    "node_count": 12,
    "path_percentage": 23.1  # 12 out of 52 executed nodes
}
```

---

## Edge Cases & Error Handling

### 1. Multiple Start Nodes (Parallel Start)
**Scenario**: Workflow has multiple trigger nodes or truly parallel start
**Handling**: All nodes with in-degree=0 start at time=0, pick the one with longest downstream path

### 2. Multiple End Nodes (Parallel End)
**Scenario**: Workflow has multiple terminal nodes (no children)
**Handling**: Pick the node with the latest finish_time as the final node

### 3. Node with ERROR Event
**Scenario**: Node fails mid-execution
**Handling**: 
- Use ERROR event timestamp as finish_time
- Include in critical path calculation (error still took time)
- Mark in output that path contains error node

```python
{
    "critical_path": [..., "failed_node_id", ...],
    "total_duration_ms": 45000,
    "contains_error": True,
    "error_nodes": ["failed_node_id"]
}
```

### 4. Disconnected Subgraphs
**Scenario**: IF branch creates completely separate execution paths
**Handling**: Should not happen if we filter to only executed nodes, but validate:
- Topological sort will fail if truly disconnected
- Return error: "Workflow has disconnected execution subgraphs"

### 5. Zero-Duration Nodes
**Scenario**: Node completes instantly (STARTED and FINISHED at same timestamp)
**Handling**: duration_ms = 0 is valid, include in path calculation

### 6. Extremely Long Paths
**Scenario**: 200+ node workflow
**Handling**: 
- Algorithm is O(V + E) so scales well
- Set warning threshold at 50+ nodes on critical path
- Suggest workflow refactoring

---

## Database Storage

### Table: `critical_paths`
```sql
CREATE TABLE critical_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID REFERENCES executions(id),
    workflow_id UUID REFERENCES workflows(id),
    
    -- Critical path data
    path_node_ids TEXT[] NOT NULL,  -- Ordered array of node IDs
    total_duration_ms INTEGER NOT NULL,
    node_count INTEGER NOT NULL,
    
    -- Metadata
    contains_error BOOLEAN DEFAULT FALSE,
    error_node_ids TEXT[],
    calculated_at TIMESTAMP DEFAULT NOW(),
    
    -- Performance metrics
    path_percentage DECIMAL(5,2),  -- What % of executed nodes are on path
    
    UNIQUE(execution_id)  -- One critical path per execution
);

CREATE INDEX idx_critical_paths_execution ON critical_paths(execution_id);
CREATE INDEX idx_critical_paths_workflow ON critical_paths(workflow_id);
```

### Caching Strategy
```python
def get_or_calculate_critical_path(execution_id: str) -> Dict:
    """
    1. Check if critical_paths table has entry for this execution_id
    2. If yes, return cached result
    3. If no, calculate, store, and return
    
    Rationale: Critical path for a completed execution never changes
    """
```

---

## API Endpoint Design

### Endpoint: `GET /api/workflows/{workflow_id}/executions/{execution_id}/critical-path`

#### Request
```bash
curl http://localhost:8000/api/workflows/8ce95407-8381-4756-85aa-c5c2a0251384/executions/15720484-8e33-464b-84b8-0936ecfa7096/critical-path
```

#### Response (Success)
```json
{
    "success": true,
    "data": {
        "critical_path": [
            {
                "node_id": "webhook_trigger",
                "node_name": "Webhook",
                "duration_ms": 0,
                "cumulative_duration_ms": 0
            },
            {
                "node_id": "fetch_brief_node",
                "node_name": "Fetch Brief",
                "duration_ms": 1200,
                "cumulative_duration_ms": 1200
            },
            {
                "node_id": "claude_ai_generate",
                "node_name": "Generate Content",
                "duration_ms": 3200,
                "cumulative_duration_ms": 4400,
                "is_bottleneck": true  // Hint: duration > 2s
            }
        ],
        "summary": {
            "total_duration_ms": 115120,
            "node_count": 12,
            "path_percentage": 23.1,
            "contains_error": false
        },
        "execution_context": {
            "executed_nodes": 52,
            "total_nodes": 74,
            "skipped_nodes": 22
        },
        "calculated_at": "2026-01-10T15:30:00Z",
        "from_cache": false
    }
}
```

#### Response (Error: Cycle Detected)
```json
{
    "success": false,
    "error": {
        "code": "INVALID_GRAPH",
        "message": "Workflow execution graph contains a cycle",
        "details": "Topological sort failed - circular dependency detected"
    }
}
```

#### Response (Error: Execution Not Found)
```json
{
    "success": false,
    "error": {
        "code": "NOT_FOUND",
        "message": "Execution not found",
        "execution_id": "invalid-uuid"
    }
}
```

---

## Implementation Checklist

### File Structure
```
backend/src/analysis/
├── __init__.py
├── critical_path.py          # Main algorithm
└── tests/
    └── test_critical_path.py  # Unit tests
```

### critical_path.py Outline
```python
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass

@dataclass
class CriticalPathResult:
    path_node_ids: List[str]
    total_duration_ms: int
    node_count: int
    contains_error: bool
    error_node_ids: List[str]

class CriticalPathAnalyzer:
    def __init__(self, supabase_client):
        self.db = supabase_client
    
    def calculate(self, execution_id: str) -> CriticalPathResult:
        """Main entry point - orchestrates all phases"""
        pass
    
    def _load_workflow_graph(self, workflow_id: str) -> Dict:
        """Phase 1.1"""
        pass
    
    def _load_execution_timing(self, execution_id: str) -> Dict:
        """Phase 1.2"""
        pass
    
    def _build_execution_graph(self, workflow_graph: Dict, 
                               execution_timing: Dict) -> Dict:
        """Phase 1.3"""
        pass
    
    def _topological_sort(self, execution_graph: Dict) -> List[str]:
        """Phase 2"""
        pass
    
    def _calculate_longest_path(self, execution_graph: Dict, 
                                topo_order: List[str]) -> Dict:
        """Phase 3"""
        pass
    
    def _reconstruct_path(self, path_data: Dict) -> List[str]:
        """Phase 4"""
        pass
    
    def _store_result(self, execution_id: str, result: CriticalPathResult):
        """Database storage"""
        pass
    
    def _get_cached_result(self, execution_id: str) -> Optional[CriticalPathResult]:
        """Database lookup"""
        pass
```

### API Integration (main.py)
```python
from src.analysis.critical_path import CriticalPathAnalyzer

@app.get("/api/workflows/{workflow_id}/executions/{execution_id}/critical-path")
async def get_critical_path(workflow_id: str, execution_id: str):
    analyzer = CriticalPathAnalyzer(supabase)
    
    try:
        result = analyzer.calculate(execution_id)
        
        # Format response
        return {
            "success": True,
            "data": {
                "critical_path": result.path_node_ids,
                "summary": {
                    "total_duration_ms": result.total_duration_ms,
                    "node_count": result.node_count,
                    "contains_error": result.contains_error
                }
            }
        }
    except ValueError as e:
        return {
            "success": False,
            "error": {
                "code": "INVALID_GRAPH",
                "message": str(e)
            }
        }
```

---

## Testing Strategy

### Unit Tests

#### Test 1: Simple Linear Path
```python
def test_linear_path():
    """
    A → B → C
    Duration: 1s, 2s, 3s
    Expected: [A, B, C], total 6s
    """
```

#### Test 2: Parallel Branches (Diamond Pattern)
```python
def test_parallel_diamond():
    """
         B (1s)
       ↗      ↘
    A            D
       ↘      ↗
         C (3s)
    
    Expected: [A, C, D], total 3s + D duration
    (C is on critical path, B is not)
    """
```

#### Test 3: Error Node in Path
```python
def test_error_in_path():
    """
    A → B (error, 2s) → C
    Expected: [A, B, C], contains_error=True
    """
```

#### Test 4: Skipped Nodes (IF Branch)
```python
def test_skipped_nodes():
    """
    Workflow: A → B → C
                  ↘ D (skipped)
    
    Execution timing only has A, B, C
    Expected: [A, B, C], ignore D entirely
    """
```

### Integration Test with Real Data
```python
def test_real_72_node_workflow():
    """
    Load actual execution: 15720484-8e33-464b-84b8-0936ecfa7096
    
    Assertions:
    - Path contains 10-15 nodes
    - Total duration ≈ 115120ms (±5%)
    - Path includes claude_ai_generate node
    - No cycles detected
    - All path nodes exist in execution_events
    """
```

---

## Performance Considerations

### Time Complexity
- Graph construction: O(V + E) where V=nodes, E=edges
- Topological sort: O(V + E)
- Longest path: O(V + E)
- Path reconstruction: O(path length)
- **Total: O(V + E)** - Linear time, very efficient

### Space Complexity
- Adjacency lists: O(V + E)
- Timing data: O(V)
- Path data: O(V)
- **Total: O(V + E)** - Linear space

### Real-World Performance (72-Node Workflow)
- Nodes: 52 executed, 74 total
- Edges: 75 edges
- Expected calculation time: < 50ms
- Database query time: < 100ms
- **Total API response: < 200ms**

### Optimization: Database Queries
```python
# Single query to load nodes + edges
query = """
    SELECT 
        n.node_id, n.node_name, n.node_type,
        e.source_node_id, e.target_node_id
    FROM workflow_nodes n
    LEFT JOIN workflow_edges e ON e.workflow_id = n.workflow_id
    WHERE n.workflow_id = %s
"""
# Reduces DB round trips from 2 to 1
```

---

## Success Criteria

### Algorithm Correctness
- [ ] Returns valid path from start to end node
- [ ] Path length reasonable (10-15 nodes for test workflow)
- [ ] Total duration matches execution duration (±1%)
- [ ] No cycles detected in any test case
- [ ] Handles parallel execution correctly

### Edge Case Handling
- [ ] Skipped nodes are ignored
- [ ] Error nodes are included with flag
- [ ] Zero-duration nodes don't break calculation
- [ ] Multiple start/end nodes handled

### Performance
- [ ] Calculation completes in < 50ms for 100-node workflow
- [ ] API response in < 200ms (including DB queries)
- [ ] Cached results return in < 50ms

### Data Integrity
- [ ] Results stored in critical_paths table
- [ ] Caching works (second call returns cached result)
- [ ] All path node_ids exist in execution_events

---

## Next Steps (Week 3 Day 2)

Once critical path is working, Day 2 will use this data for bottleneck detection:

### Bottleneck Scoring Factors
1. **Duration** - Node execution time (raw milliseconds)
2. **Position** - Is node on critical path? (YES = 2x weight)
3. **Frequency** - How often does this node execute? (loops)
4. **Variance** - Does duration vary wildly? (inconsistent performance)

### Example
```python
# Node A: 3.2s on critical path → HIGH bottleneck score
# Node B: 5.0s NOT on critical path → MEDIUM bottleneck score

# Even though B is slower, A blocks the entire workflow
```

**Critical path is the foundation** - it tells us which nodes actually matter for overall performance.

---

## References

### Academic Background
- **Longest Path in DAG**: Classic dynamic programming problem
- **Topological Sort**: Kahn's Algorithm (1962)
- **Critical Path Method (CPM)**: Project management technique from 1950s

### Industry Usage
- **Datadog APM**: Traces critical path through microservices
- **Temporal.io**: Workflow engine with critical path analysis
- **n8n**: Does NOT currently provide this analysis (our opportunity!)

### Code References
- NetworkX library: `dag_longest_path()` - similar approach
- Apache Airflow: Task dependency resolution (topological sort)

---

**END OF SPECIFICATION**

This spec is ready for implementation. Next: Create `backend/src/analysis/critical_path.py` and build the algorithm!
