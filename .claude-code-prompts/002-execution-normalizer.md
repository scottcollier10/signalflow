# Build Execution Normalizer - The Ground Truth Engine

## Context
- **Project**: SignalFlow (read `docs/CONTEXT.md` for current status)
- **Workflow**: 72-node Content Ops Brief Generation (see `docs/workflow-analysis/content-ops-brief.md`)
- **Week**: 1, Day 2
- **Priority**: CRITICAL - This is the foundation for all analysis

## Objective
Build the execution normalizer that transforms n8n's messy execution JSON into a clean, canonical event stream stored in the `execution_events` table.

## Why This Matters
**Without the normalizer**: No analysis possible, entire project blocked  
**With the normalizer**: Critical path, bottlenecks, recommendations all flow naturally

This is the "ground truth" engine - get it right and everything else becomes easier.

## Tech Stack
- **Backend**: Python 3.10+, FastAPI, Pydantic
- **Database**: Supabase (PostgreSQL), table: `execution_events`
- **Test Data**: Synthetic execution JSON (real workflow structure)
- **Node Types**: 9 types (Webhook, Supabase, HTTP, Code, IF, Merge, Claude AI, OpenAI, Response)

---

## Requirements

### Must Handle (Priority 1)
1. **Parse workflow JSON** → Extract nodes and edges
2. **Parse execution JSON** → Extract node run data
3. **Generate event stream** → Create normalized ExecutionEvent objects
4. **Sequence ordering** → Preserve execution order
5. **Causal dependencies** → Track which nodes triggered which (fromNodes)
6. **Store in database** → Insert events into execution_events table

### Must Handle (Priority 2 - Edge Cases)
7. **IF branches** → Detect which path was taken
8. **Merge nodes** → Calculate wait times
9. **Error states** → Capture failures with error messages
10. **Partial executions** → Handle incomplete workflows gracefully
11. **Retry attempts** → Track multiple attempts per node
12. **Parallel execution** → Preserve concurrent node execution

### Nice to Have (Can Defer)
- Real n8n execution JSON parsing (use synthetic first)
- Advanced retry detection
- Performance optimization (< 100ms per execution)

---

## Implementation Steps

### Step 1: Create Data Models

**File**: `backend/src/normalizer/models.py`

```python
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class EventType(str, Enum):
    STARTED = "started"
    FINISHED = "finished"
    RETRY = "retry"
    ERROR = "error"
    SKIPPED = "skipped"

class EventStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"
    TIMEOUT = "timeout"

class ExecutionEvent(BaseModel):
    execution_id: str
    node_id: str
    event_type: EventType
    timestamp: datetime
    duration_ms: Optional[int] = None
    status: Optional[EventStatus] = None
    error_message: Optional[str] = None
    retry_attempt: int = 0
    items_processed: int = 0
    sequence_order: int
    metadata: Dict[str, Any] = {}

class NormalizedExecution(BaseModel):
    execution_id: str
    workflow_id: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    status: str  # 'success', 'error', 'timeout', 'cancelled'
    duration_ms: Optional[int] = None
    events: List[ExecutionEvent] = []
```

---

### Step 2: Create Synthetic Execution Generator

**File**: `backend/src/normalizer/synthetic_data.py`

```python
"""
Generate synthetic n8n execution data matching the 72-node workflow structure.
Use this for testing until we have real n8n API access.
"""

from typing import Dict, List, Any
from datetime import datetime, timedelta
import random
import json
from pathlib import Path

# Node type duration ranges (milliseconds)
NODE_DURATIONS = {
    "Webhook": (1, 10),
    "Supabase": (50, 200),
    "HTTP Request": (100, 500),
    "Code": (10, 100),
    "IF": (5, 20),
    "Merge": (0, 5),  # Wait time calculated separately
    "Claude AI": (1000, 5000),  # High variance
    "OpenAI": (1000, 4000),
    "Response": (5, 15)
}

def generate_synthetic_execution(
    workflow_json: Dict[str, Any],
    execution_type: str = "success"  # 'success', 'error', 'partial'
) -> Dict[str, Any]:
    """
    Generate realistic execution JSON matching n8n format.
    
    Args:
        workflow_json: Parsed workflow JSON with nodes and edges
        execution_type: Type of execution to simulate
    
    Returns:
        Synthetic execution JSON in n8n format
    """
    
    nodes = workflow_json.get("nodes", [])
    edges = workflow_json.get("connections", {})
    
    execution_id = f"exec_{random.randint(1000, 9999)}"
    start_time = datetime.now()
    current_time = start_time
    
    run_data = {}
    
    # Simulate execution through the workflow
    for idx, node in enumerate(nodes):
        node_name = node.get("name", f"Node{idx}")
        node_type = node.get("type", "unknown")
        
        # Determine if this node should execute
        should_execute = True
        if execution_type == "partial" and idx > len(nodes) // 2:
            should_execute = False  # Stop halfway
        elif execution_type == "error" and idx == len(nodes) // 2:
            # Create error at midpoint
            run_data[node_name] = [{
                "startTime": current_time.timestamp() * 1000,
                "executionTime": random.randint(50, 200),
                "error": {
                    "message": "Simulated error for testing",
                    "description": "Node failed during execution"
                }
            }]
            break
        
        if should_execute:
            # Get duration range for this node type
            duration_range = NODE_DURATIONS.get(node_type, (10, 100))
            duration = random.randint(*duration_range)
            
            run_data[node_name] = [{
                "startTime": current_time.timestamp() * 1000,
                "executionTime": duration,
                "source": []  # Will be populated based on edges
            }]
            
            current_time += timedelta(milliseconds=duration)
    
    # Build execution JSON
    execution_json = {
        "id": execution_id,
        "finished": execution_type != "partial",
        "mode": "webhook",
        "startedAt": start_time.isoformat(),
        "stoppedAt": current_time.isoformat() if execution_type != "partial" else None,
        "workflowData": workflow_json,
        "data": {
            "resultData": {
                "runData": run_data
            }
        }
    }
    
    return execution_json

def load_workflow_json(filepath: str) -> Dict[str, Any]:
    """Load workflow JSON from file."""
    with open(filepath, 'r') as f:
        return json.load(f)

# Example usage
if __name__ == "__main__":
    # Test with actual workflow
    workflow_path = "path/to/workflow.json"
    workflow = load_workflow_json(workflow_path)
    
    # Generate different execution types
    success_exec = generate_synthetic_execution(workflow, "success")
    error_exec = generate_synthetic_execution(workflow, "error")
    partial_exec = generate_synthetic_execution(workflow, "partial")
    
    print(f"Generated {len(success_exec['data']['resultData']['runData'])} node executions")
```

---

### Step 3: Create Parser

**File**: `backend/src/normalizer/parser.py`

```python
"""
Parse n8n execution JSON and convert to normalized event stream.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from .models import (
    NormalizedExecution, 
    ExecutionEvent, 
    EventType, 
    EventStatus
)

class N8nExecutionParser:
    """Parse n8n execution JSON into normalized events."""
    
    def __init__(self, execution_json: Dict[str, Any]):
        self.execution_json = execution_json
        self.workflow_data = execution_json.get("workflowData", {})
        self.run_data = execution_json.get("data", {}).get("resultData", {}).get("runData", {})
        
    def parse(self) -> NormalizedExecution:
        """Parse execution and return normalized format."""
        
        execution_id = str(self.execution_json.get("id", "unknown"))
        workflow_id = str(self.workflow_data.get("id", "unknown"))
        
        # Extract timing
        started_at = self._parse_timestamp(self.execution_json.get("startedAt"))
        finished_at = self._parse_timestamp(self.execution_json.get("stoppedAt"))
        
        # Determine status
        status = self._determine_status()
        
        # Calculate duration
        duration_ms = None
        if started_at and finished_at:
            duration_ms = int((finished_at - started_at).total_seconds() * 1000)
        
        # Parse events from run data
        events = self._parse_events(execution_id)
        
        return NormalizedExecution(
            execution_id=execution_id,
            workflow_id=workflow_id,
            started_at=started_at,
            finished_at=finished_at,
            status=status,
            duration_ms=duration_ms,
            events=events
        )
    
    def _parse_events(self, execution_id: str) -> List[ExecutionEvent]:
        """Parse run data into event stream."""
        events = []
        sequence = 0
        
        for node_name, node_runs in self.run_data.items():
            # node_runs is a list (can have multiple runs for retries)
            for run_idx, run in enumerate(node_runs):
                # Started event
                start_time = self._parse_timestamp(run.get("startTime"))
                if start_time:
                    events.append(ExecutionEvent(
                        execution_id=execution_id,
                        node_id=self._normalize_node_id(node_name),
                        event_type=EventType.STARTED,
                        timestamp=start_time,
                        sequence_order=sequence,
                        retry_attempt=run_idx
                    ))
                    sequence += 1
                
                # Finished/Error event
                execution_time = run.get("executionTime", 0)
                error = run.get("error")
                
                if error:
                    # Error event
                    events.append(ExecutionEvent(
                        execution_id=execution_id,
                        node_id=self._normalize_node_id(node_name),
                        event_type=EventType.ERROR,
                        timestamp=start_time + timedelta(milliseconds=execution_time) if start_time else datetime.now(),
                        duration_ms=execution_time,
                        status=EventStatus.ERROR,
                        error_message=error.get("message", "Unknown error"),
                        sequence_order=sequence,
                        retry_attempt=run_idx
                    ))
                else:
                    # Success event
                    events.append(ExecutionEvent(
                        execution_id=execution_id,
                        node_id=self._normalize_node_id(node_name),
                        event_type=EventType.FINISHED,
                        timestamp=start_time + timedelta(milliseconds=execution_time) if start_time else datetime.now(),
                        duration_ms=execution_time,
                        status=EventStatus.SUCCESS,
                        sequence_order=sequence,
                        retry_attempt=run_idx
                    ))
                
                sequence += 1
        
        # Sort by timestamp to maintain order
        events.sort(key=lambda e: (e.timestamp, e.sequence_order))
        
        # Reassign sequence numbers after sorting
        for idx, event in enumerate(events):
            event.sequence_order = idx
        
        return events
    
    def _parse_timestamp(self, ts: Any) -> Optional[datetime]:
        """Parse timestamp from various formats."""
        if not ts:
            return None
        
        if isinstance(ts, (int, float)):
            # Unix timestamp (ms)
            return datetime.fromtimestamp(ts / 1000)
        elif isinstance(ts, str):
            # ISO format
            return datetime.fromisoformat(ts.replace('Z', '+00:00'))
        
        return None
    
    def _determine_status(self) -> str:
        """Determine execution status."""
        if not self.execution_json.get("finished"):
            return "cancelled"
        
        # Check for errors in run data
        for node_runs in self.run_data.values():
            for run in node_runs:
                if run.get("error"):
                    return "error"
        
        return "success"
    
    def _normalize_node_id(self, node_name: str) -> str:
        """Convert node name to consistent ID format."""
        return node_name.lower().replace(" ", "_")
```

---

### Step 4: Database Storage

**File**: `backend/src/normalizer/storage.py`

```python
"""
Store normalized execution events in Supabase.
"""

from typing import List
from supabase import create_client, Client
from .models import NormalizedExecution, ExecutionEvent
from ..config import settings

class ExecutionStorage:
    """Handle storage of normalized executions."""
    
    def __init__(self):
        self.supabase: Client = create_client(
            settings.supabase_url,
            settings.supabase_key
        )
    
    async def store_execution(self, normalized: NormalizedExecution) -> bool:
        """
        Store normalized execution and all events in database.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Store execution record
            exec_data = {
                "id": normalized.execution_id,
                "workflow_id": normalized.workflow_id,
                "started_at": normalized.started_at.isoformat(),
                "finished_at": normalized.finished_at.isoformat() if normalized.finished_at else None,
                "status": normalized.status,
                "duration_ms": normalized.duration_ms
            }
            
            self.supabase.table("executions").upsert(exec_data).execute()
            
            # Store events
            for event in normalized.events:
                event_data = {
                    "execution_id": event.execution_id,
                    "node_id": event.node_id,
                    "event_type": event.event_type,
                    "timestamp": event.timestamp.isoformat(),
                    "duration_ms": event.duration_ms,
                    "status": event.status,
                    "error_message": event.error_message,
                    "retry_attempt": event.retry_attempt,
                    "items_processed": event.items_processed,
                    "sequence_order": event.sequence_order,
                    "metadata": event.metadata
                }
                
                self.supabase.table("execution_events").insert(event_data).execute()
            
            return True
            
        except Exception as e:
            print(f"Error storing execution: {e}")
            return False
    
    async def get_execution_events(
        self, 
        execution_id: str
    ) -> List[ExecutionEvent]:
        """Retrieve all events for an execution."""
        
        response = self.supabase.table("execution_events")\
            .select("*")\
            .eq("execution_id", execution_id)\
            .order("sequence_order")\
            .execute()
        
        events = []
        for row in response.data:
            events.append(ExecutionEvent(**row))
        
        return events
```

---

### Step 5: API Endpoint

**File**: `backend/src/main.py` (add endpoints)

```python
from fastapi import FastAPI, UploadFile, File, HTTPException
from .normalizer.parser import N8nExecutionParser
from .normalizer.storage import ExecutionStorage
from .normalizer.synthetic_data import generate_synthetic_execution
import json

# ... existing code ...

@app.post("/api/normalize-execution")
async def normalize_execution(file: UploadFile = File(...)):
    """
    Upload n8n execution JSON and normalize it.
    Stores normalized events in database.
    """
    try:
        # Read uploaded file
        content = await file.read()
        execution_json = json.loads(content)
        
        # Parse and normalize
        parser = N8nExecutionParser(execution_json)
        normalized = parser.parse()
        
        # Store in database
        storage = ExecutionStorage()
        success = await storage.store_execution(normalized)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to store execution")
        
        return {
            "execution_id": normalized.execution_id,
            "status": normalized.status,
            "event_count": len(normalized.events),
            "duration_ms": normalized.duration_ms
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/generate-test-execution")
async def generate_test_execution(
    workflow_id: str,
    execution_type: str = "success"
):
    """
    Generate synthetic execution for testing.
    Useful when you don't have real n8n execution data.
    """
    try:
        # TODO: Load workflow from database
        # For now, return structure for manual testing
        
        return {
            "message": "Synthetic generation endpoint",
            "execution_type": execution_type,
            "note": "Implement after workflow import works"
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/executions/{execution_id}/events")
async def get_execution_events(execution_id: str):
    """Get all normalized events for an execution."""
    try:
        storage = ExecutionStorage()
        events = await storage.get_execution_events(execution_id)
        
        return {
            "execution_id": execution_id,
            "event_count": len(events),
            "events": [e.dict() for e in events]
        }
        
    except Exception as e:
        raise HTTPException(status_code=404, detail="Execution not found")
```

---

## Testing Checklist

Test in this order:

### Phase 1: Data Models
- [ ] Run: `cd backend && python -m pytest tests/test_normalizer.py::test_models`
- [ ] Verify ExecutionEvent model validates correctly
- [ ] Verify NormalizedExecution model validates

### Phase 2: Synthetic Data
- [ ] Generate success execution
- [ ] Generate error execution  
- [ ] Generate partial execution
- [ ] Verify JSON structure matches n8n format

### Phase 3: Parser
- [ ] Parse synthetic success execution
- [ ] Parse synthetic error execution
- [ ] Parse synthetic partial execution
- [ ] Verify event count and types
- [ ] Verify sequence ordering
- [ ] Verify timestamps

### Phase 4: Storage
- [ ] Store normalized execution in database
- [ ] Query execution_events table
- [ ] Verify event relationships
- [ ] Test retrieval by execution_id

### Phase 5: API
- [ ] POST /api/normalize-execution with synthetic JSON
- [ ] GET /api/executions/{id}/events
- [ ] Verify response format
- [ ] Check database via Supabase Studio

### Phase 6: Real Workflow (If Available)
- [ ] Load Scott's 72-node workflow JSON
- [ ] Generate synthetic execution for it
- [ ] Normalize and store
- [ ] Verify all 9 node types handled
- [ ] Check for missing nodes or edges

---

## Success Criteria

✅ Normalizer is complete when:
- Can parse synthetic n8n execution JSON
- Generates correct event stream
- Handles all 9 node types in Scott's workflow
- Stores events in execution_events table
- Can retrieve events by execution_id
- Events have correct sequence_order
- Timestamps are accurate
- Error messages are captured
- API endpoints work end-to-end

---

## File Structure After Implementation

```
backend/
├── src/
│   ├── normalizer/
│   │   ├── __init__.py
│   │   ├── models.py              ✅ NEW
│   │   ├── parser.py              ✅ NEW
│   │   ├── storage.py             ✅ NEW
│   │   └── synthetic_data.py      ✅ NEW
│   ├── main.py                    🔄 MODIFIED (add endpoints)
│   └── config.py                  ✅ EXISTING
└── tests/
    └── test_normalizer.py         ✅ NEW
```

---

## Commands to Run

```bash
# Start backend
cd backend
source venv/bin/activate
uvicorn src.main:app --reload --port 8000

# Test synthetic generation (in Python REPL)
python
>>> from src.normalizer.synthetic_data import generate_synthetic_execution
>>> exec_json = generate_synthetic_execution({...}, "success")
>>> print(len(exec_json['data']['resultData']['runData']))

# Test via API
curl -X POST http://localhost:8000/api/normalize-execution \
  -F "file=@synthetic_execution.json"

# Check database
open http://127.0.0.1:54323  # Supabase Studio
# Go to execution_events table, should see rows
```

---

## Edge Cases to Handle

1. **Missing timestamps** → Use current time as fallback
2. **Empty run data** → Generate skipped events
3. **Multiple retries** → Increment retry_attempt counter
4. **Partial execution** → Status = "cancelled", finished_at = None
5. **Node name variations** → Normalize to lowercase with underscores

---

## Notes for Implementation

- **Start simple**: Get basic success case working first
- **Add edge cases incrementally**: Don't try to handle everything at once
- **Validate early**: Check event count matches expected
- **Use Supabase Studio**: Visual verification is faster than SQL queries
- **Generate test data**: Don't wait for real n8n access

---

## After Implementation

Once complete:
- [ ] Update docs/CONTEXT.md with "Normalizer ✅ Complete"
- [ ] Document any quirks found in docs/DECISIONS.md
- [ ] Create checkpoint: `docs/checkpoints/week1-normalizer-complete.md`
- [ ] Move to Week 2: Graph Visualization

---

**Created by**: Claude.ai  
**Created on**: January 10, 2026  
**Priority**: CRITICAL (Foundation)  
**Estimated time**: 4-6 hours  
**Status**: Ready for Claude Code

---

**This is THE foundation. Get it right and everything else becomes possible.** 🎯
