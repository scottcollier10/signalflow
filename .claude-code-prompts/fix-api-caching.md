# Fix Week 3 Days 1-2 API Caching for Recommendations Engine

## Problem
The recommendation engine (Week 3 Days 4-5) expects cached data in database tables, but the critical path and bottleneck APIs only return results without saving them.

**Diagnostic output:**
```
1. Critical paths table: 1 records
   Path nodes: 0
   Path %: 0

2. Node stats table: 0 records
   ❌ ISSUE: Bottleneck data not saved to database!
```

## Files to Fix

### 1. `backend/src/analysis/critical_path.py`
After calculating the critical path, save results to `critical_paths` table:
```python
# Save to database for recommendation engine
supabase.table('critical_paths').upsert({
    'execution_id': execution_id,
    'workflow_id': workflow_id,
    'path_node_ids': [node for node, _ in path_nodes],
    'path_percentage': path_percentage,
    'total_duration_ms': total_duration,
    'contains_error': contains_error
}).execute()
```

### 2. `backend/src/analysis/bottlenecks.py`
After calculating bottleneck scores, save each node to `node_stats` table:
```python
# Save to database for recommendation engine
for bottleneck in bottlenecks:
    supabase.table('node_stats').upsert({
        'execution_id': execution_id,
        'workflow_id': workflow_id,
        'node_id': bottleneck['node_id'],
        'node_name': bottleneck['node_name'],
        'node_type': bottleneck.get('node_type'),
        'bottleneck_score': bottleneck['bottleneck_score'],
        'total_duration_ms': bottleneck['total_duration_ms'],
        'is_on_critical_path': bottleneck['is_on_critical_path'],
        # Include other relevant fields
    }, on_conflict='workflow_id,node_id').execute()
```

## Database Schema Reference
Tables are already created with correct columns:
- `critical_paths`: id, execution_id, workflow_id, path_node_ids, path_percentage, total_duration_ms, contains_error
- `node_stats`: id, execution_id, workflow_id, node_id, node_name, node_type, bottleneck_score, total_duration_ms, is_on_critical_path

## Test After Fix
```bash
WF_ID="6a71673e-623d-42c9-a7c5-09e8acda50f4"
EXEC_ID="09f2d02b-2137-4da8-8e68-cd15535bee3f"

# Clear old data
python3 backend/clear_data.py

# Rerun analyses (should now cache results)
curl "http://localhost:8000/api/workflows/$WF_ID/executions/$EXEC_ID/critical-path"
curl "http://localhost:8000/api/workflows/$WF_ID/executions/$EXEC_ID/bottlenecks"

# Verify caching worked
python3 backend/diagnose_recommendations.py
# Should show: Critical paths: 1 record with 50 nodes, Node stats: 52 records

# Test recommendations (should now return 6-8 recommendations)
curl "http://localhost:8000/api/workflows/$WF_ID/executions/$EXEC_ID/recommendations" | jq '.data.summary'
```

## Success Criteria
- Critical paths table has 1 record with ~50 path_node_ids
- Node stats table has 52 records with bottleneck scores
- Recommendations endpoint returns 6-8 recommendations
- Top recommendation is Rule #1 (Parallelize) with priority ~90+

Fix the caching, test, and confirm recommendations are generated.