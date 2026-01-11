# Content Ops Brief Generation - Workflow Analysis

**Workflow Name**: [02] Content Ops: Brief Generation  
**Location**: `content-ops-copilot/02-n8n-workflows/exports/[02] Content Ops_ Brief Generation.json`  
**Complexity**: 72 nodes  
**Status**: In development (not end-to-end yet)

---

## Overview

This is Scott's primary test workflow for SignalFlow - a real production workflow that generates content briefs through multiple AI processing stages.

### Key Characteristics
- **Size**: 72 nodes (highly complex)
- **Type**: Content generation pipeline
- **AI Integration**: Multiple AI providers (Claude, OpenAI)
- **Data Layer**: Supabase for storage
- **Trigger**: Webhook-based
- **Status**: Functional but being optimized

---

## Node Type Breakdown

The workflow uses **9 distinct n8n node types**:

### 1. **Webhook Triggers**
- Entry point for the workflow
- Receives request data
- Critical for testing trigger → execution flow

### 2. **Supabase Native Nodes**
- Database queries and updates
- Data retrieval and storage
- Multiple instances throughout workflow

### 3. **HTTP Request Nodes**
- External API calls
- Data fetching from various sources
- Potential bottleneck areas

### 4. **Code Nodes**
- Custom JavaScript/Python processing
- Data transformation
- Business logic implementation

### 5. **IF Conditions**
- Branching logic
- Conditional execution paths
- Critical for normalizer (branch detection)

### 6. **Merge Nodes**
- Combine multiple execution paths
- Wait for parallel branches
- Important for critical path analysis

### 7. **Claude AI Nodes**
- Primary AI processing
- Content generation
- Likely high duration variance

### 8. **OpenAI Nodes**
- Alternative AI processing
- Specialized tasks
- Backup/fallback scenarios

### 9. **Response Nodes**
- Return data to webhook caller
- Workflow completion marker
- Important for execution boundary detection

---

## Execution Characteristics

### Timing Patterns (from screenshot)

**Successful Executions**:
- Fast: 210ms - 436ms
- Medium: 437ms - 612ms  
- Slow: 613ms - 774ms

**Error Executions**:
- Quick failures: 328ms - 476ms
- Timeout failures: 35.8s+

### Execution History (Jan 8-10, 2026)

**Total visible**: 13 executions  
**Successful**: 11 (85% success rate)  
**Errors**: 2 (15% error rate)

**Success Examples**:
- Jan 9, 12:11:52 - 418ms
- Jan 9, 12:11:10 - 210ms
- Jan 9, 12:04:31 - 436ms

**Error Examples**:
- Jan 9, 12:06:43 - Error in 328ms
- Jan 9, 12:05:33 - Error in 476ms
- Jan 8, 22:31:47 - Error in 35.8s

---

## Normalizer Test Cases

### What We Need to Handle

#### 1. **Success Path** (Primary)
- All 72 nodes execute in sequence
- Some parallel branches
- Final response returned
- Duration: ~400-600ms typical

#### 2. **Partial Execution** (Current State)
- Workflow stops mid-way (incomplete)
- Some nodes executed, others skipped
- Important: Not an error, just unfinished

#### 3. **Error Cases**
- Node failures at various points
- Error propagation through branches
- Quick failures vs timeouts
- Multiple error patterns visible

#### 4. **Branch Handling**
- IF conditions creating multiple paths
- Some branches taken, others skipped
- Conditional logic must be preserved

#### 5. **Merge Behavior**
- Multiple inputs converging
- Wait times between branches
- Critical for bottleneck detection

#### 6. **AI Node Variance**
- Claude/OpenAI nodes likely high variance
- Duration unpredictable
- Retries on failures

---

## Node Patterns to Test

### Sequential Chains
```
Webhook → Supabase → Code → HTTP → Claude → Response
```

### Parallel Branches
```
          ┌─ Branch A (Claude)
HTTP ─────┤
          └─ Branch B (OpenAI)
                 ↓
              Merge → Response
```

### Conditional Logic
```
HTTP → IF (condition)
         ├─ TRUE → Claude → Response
         └─ FALSE → OpenAI → Response
```

### Error Handling
```
HTTP Request
  ├─ Success → Claude
  └─ Error → Retry → Fallback
```

---

## Synthetic Execution Data Requirements

When generating test data, we need:

### 1. **Realistic Timing**
- Webhook: <10ms (instant)
- Supabase queries: 50-200ms
- HTTP requests: 100-500ms
- Code nodes: 10-100ms
- Claude/OpenAI: 1000-5000ms (high variance)
- Merge nodes: 0ms (wait time calculated separately)

### 2. **Success Distribution**
- 85% successful complete executions
- 10% mid-execution stops (partial)
- 5% error cases

### 3. **Error Types**
- HTTP timeouts (35s+)
- API errors (400/500 responses)
- Code execution errors
- AI provider failures

### 4. **Branch Patterns**
- ~40% take Branch A
- ~40% take Branch B  
- ~20% take both (merge scenario)

---

## Critical Path Expectations

### Likely Bottlenecks

**Expected**:
1. **Claude AI nodes** (longest duration, high variance)
2. **HTTP Request chains** (sequential network calls)
3. **Merge points** (waiting for parallel branches)

**Not Expected**:
- Webhook trigger (negligible)
- Simple Code nodes (fast)
- Supabase reads (optimized)

### Wall Time Contributors

Based on typical execution (~400-600ms):
- AI processing: ~60-70% of total time
- HTTP requests: ~20-30% of total time
- Data processing: ~5-10% of total time
- Overhead: ~2-5% of total time

---

## Normalizer Success Criteria

The normalizer successfully handles this workflow when it can:

✅ **Parse all 9 node types** correctly  
✅ **Detect IF branches** and which path was taken  
✅ **Identify merge points** and wait times  
✅ **Handle partial executions** (incomplete workflow)  
✅ **Capture error states** at any node  
✅ **Preserve execution order** (sequence_order)  
✅ **Calculate accurate durations** for each node  
✅ **Store causal dependencies** (fromNodes metadata)  
✅ **Normalize error messages** consistently  
✅ **Generate valid event stream** for database storage  

---

## Testing Strategy

### Phase 1: Synthetic Data (Current)
1. Generate realistic execution JSON matching this workflow
2. Test normalizer with controlled scenarios
3. Verify event stream correctness

### Phase 2: Real Data (Later)
1. Export actual execution JSON from n8n
2. Process with normalizer
3. Compare against manual analysis
4. Validate timing and relationships

### Phase 3: Validation
1. Query execution_events table
2. Reconstruct workflow graph from events
3. Calculate critical path manually
4. Compare with actual execution flow

---

## Known Edge Cases

### 1. **Incomplete Workflow**
- Current state: Not all paths complete
- Normalizer must handle gracefully
- Don't treat as error, mark as partial

### 2. **AI Node Retries**
- Claude/OpenAI may retry on failure
- Must capture all retry attempts
- Duration = sum of all attempts

### 3. **Webhook Response Timing**
- Response node may execute before all branches complete
- Early response doesn't mean workflow done
- Must track actual completion

### 4. **Parallel Branch Timing**
- Multiple branches running simultaneously
- Event timestamps may overlap
- Sequence order must be preserved

---

## Notes for Implementation

### What Makes This Complex
- **Size**: 72 nodes is genuinely complex
- **Variety**: 9 node types each behave differently
- **Real Data**: Not a toy example, actual production workflow
- **In Progress**: Incomplete state tests edge cases naturally

### What Makes This Perfect
- **Dogfooding**: Scott will use this immediately
- **Realistic**: Tests real-world complexity from day one
- **Iterative**: Can improve as workflow evolves
- **Validation**: Scott can verify correctness intuitively

---

**Use this workflow as the primary test case for normalizer development. If it works here, it'll work anywhere.**
