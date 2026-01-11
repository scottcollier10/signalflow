# Week 3 Day 2: Bottleneck Detection & Scoring Specification

**Created**: January 11, 2026  
**Status**: Implementation Ready  
**Module**: `backend/src/analysis/bottlenecks.py`  
**API Endpoint**: `GET /api/workflows/{workflow_id}/executions/{execution_id}/bottlenecks`

---

## Overview

The bottleneck detection system scores each node by its impact on overall workflow performance, combining multiple factors to provide a trustworthy, evidence-backed ranking. This transforms the critical path data (from Day 1) into actionable insights users can immediately act upon.

### Key Insight
**Not all slow nodes are bottlenecks!** A node that takes 10 seconds but runs in parallel is less problematic than a node that takes 2 seconds but blocks everything else on the critical path.

### Real-World Example (From Our 72-Node Workflow)
```
Execution Duration: 13.47 seconds
Critical Path: 50 nodes (96.15% of executed nodes)

Top Bottlenecks:
1. "Claude: Generate Variant" - 5.559s (41% of total time) ⚠️
2. "Rate Limit Delay" - 2.015s (15% of total time) ⚠️
3. All other nodes < 1s each

Without critical path context:
- We'd just see "Claude node is slow"
- No way to quantify impact

With critical path + scoring:
- "Claude node: 95/100 bottleneck score (severe)"
- "Blocks 41% of execution time"
- "On critical path - optimize first!"
```

---

## Scoring Algorithm Design

### The Four Factors

Every bottleneck score is calculated from four weighted factors:

#### 1. Duration Factor (40% weight)
**Question**: How long does this node take to execute?

**Measurement**: 
- Absolute duration in milliseconds
- Percentile rank vs other nodes in execution
- Normalized to 0-1 scale

**Calculation**:
```python
def calculate_duration_factor(node_duration_ms: int, all_node_durations: List[int]) -> float:
    """
    Returns 0.0 (fastest) to 1.0 (slowest)
    
    Uses percentile ranking:
    - Node faster than 50% of nodes → 0.5
    - Node faster than 90% of nodes → 0.9
    - Slowest node in execution → 1.0
    """
    percentile = calculate_percentile(node_duration_ms, all_node_durations)
    return percentile / 100.0
```

**Example** (from 72-node workflow):
```python
all_durations = [100, 150, 200, 2015, 5559, ...]  # 52 nodes

# Claude node: 5559ms
duration_factor = calculate_duration_factor(5559, all_durations)
# Result: 1.0 (slowest node, 100th percentile)

# Rate Limit node: 2015ms  
duration_factor = calculate_duration_factor(2015, all_durations)
# Result: 0.98 (98th percentile - second slowest)

# Fast node: 100ms
duration_factor = calculate_duration_factor(100, all_durations)
# Result: 0.05 (5th percentile - very fast)
```

**Why Percentile?**
- Handles outliers gracefully
- Works across workflows of different scales
- A 5s node in a 10s workflow is worse than in a 100s workflow

---

#### 2. Position Factor (30% weight)
**Question**: Is this node on the critical path?

**Measurement**: Binary (yes/no) with multiplier effect

**Calculation**:
```python
def calculate_position_factor(node_id: str, critical_path: List[str]) -> float:
    """
    Returns:
    - 1.0 if node is ON critical path (blocks everything)
    - 0.3 if node is NOT on critical path (runs in parallel)
    
    The 3.33x difference (1.0 vs 0.3) reflects that critical path nodes
    have disproportionate impact on total execution time.
    """
    if node_id in critical_path:
        return 1.0  # Maximum impact
    else:
        return 0.3  # Still matters, but less urgent
```

**Example** (from 72-node workflow):
```python
critical_path = [50 node IDs]  # 96.15% of executed nodes

# Claude node: On critical path
position_factor = 1.0  
# → This node BLOCKS the workflow

# Hypothetical parallel node: Not on critical path
position_factor = 0.3
# → This node runs while other work happens
```

**Why This Matters**:
- Node A: 5s on critical path → delays everything by 5s
- Node B: 10s NOT on critical path → delays nothing (parallel)
- Node A is the bigger problem despite being faster!

**Why 0.3 instead of 0.0?**
- Off-path nodes still consume resources (memory, CPU, API quotas)
- Could become on-path if workflow changes
- Still worth optimizing, just lower priority

---

#### 3. Frequency Factor (20% weight)
**Question**: How many times does this node execute?

**Measurement**: 
- Execution count (for loops, retries)
- Impact multiplier (more executions = bigger bottleneck)

**Calculation**:
```python
def calculate_frequency_factor(execution_count: int) -> float:
    """
    Returns 0.0 to 1.0 based on how many times node executed
    
    Scale:
    - 1 execution → 0.0 (baseline, no frequency impact)
    - 2 executions → 0.1
    - 5 executions → 0.4
    - 10 executions → 0.7
    - 20+ executions → 1.0 (maximum frequency penalty)
    
    Uses logarithmic scale because 2→4 executions is more
    impactful than 20→22 executions.
    """
    if execution_count == 1:
        return 0.0
    
    # Logarithmic scaling
    # log(20) ≈ 3, so we normalize: log(count) / log(20)
    normalized = min(math.log(execution_count) / math.log(20), 1.0)
    return normalized
```

**Example** (from 72-node workflow):
```python
# Most nodes execute once
execution_count = 1
frequency_factor = 0.0  # No frequency penalty

# Loop node that runs 5 times
execution_count = 5
frequency_factor = 0.4  # Moderate frequency penalty

# Loop node that runs 20 times
execution_count = 20
frequency_factor = 1.0  # Maximum frequency penalty
```

**Why Frequency Matters**:
```
Scenario 1: Node takes 1s, executes once → Total impact: 1s
Scenario 2: Node takes 1s, executes 20 times → Total impact: 20s!

Even though the node is "fast" per execution, high frequency
makes it a severe bottleneck.
```

**Implementation Note**:
- For single executions (like our test data), frequency_factor = 0.0
- This factor becomes important when analyzing workflows with loops
- Future enhancement: Analyze multiple executions of same workflow

---

#### 4. Variance Factor (10% weight)
**Question**: Is this node's performance consistent or unpredictable?

**Measurement**:
- Standard deviation of duration across multiple executions
- Coefficient of variation (CV = std_dev / mean)

**Calculation**:
```python
def calculate_variance_factor(durations: List[int]) -> float:
    """
    Returns 0.0 (consistent) to 1.0 (highly variable)
    
    Uses Coefficient of Variation (CV):
    CV = (std_dev / mean) * 100%
    
    Scale:
    - CV < 10% → 0.0 (very consistent)
    - CV = 50% → 0.5 (moderate variance)
    - CV > 100% → 1.0 (highly unpredictable)
    """
    if len(durations) < 2:
        return 0.0  # Can't calculate variance with single data point
    
    mean = statistics.mean(durations)
    std_dev = statistics.stdev(durations)
    
    if mean == 0:
        return 0.0
    
    cv = (std_dev / mean) * 100  # Coefficient of variation %
    
    # Normalize to 0-1 scale
    # CV > 100% is capped at 1.0
    normalized = min(cv / 100.0, 1.0)
    return normalized
```

**Example** (hypothetical - requires multiple executions):
```python
# Consistent node: Always takes ~5s
durations = [5000, 5100, 4950, 5050, 5000]  # ms
variance_factor = 0.02  # CV = 2%, very consistent

# Variable node: Sometimes 2s, sometimes 30s (Claude API!)
durations = [2000, 8000, 15000, 30000, 5000]
variance_factor = 0.85  # CV = 85%, highly unpredictable

# Current test data: Only 1 execution per node
durations = [5559]  # Single data point
variance_factor = 0.0  # Can't calculate variance
```

**Why Variance Matters**:
- Consistent 10s node is easier to optimize than variable 2-30s node
- High variance nodes cause user frustration ("Why is it so slow today?")
- May indicate external dependencies (API rate limits, network issues)

**Implementation Note**:
- For single execution analysis (like our test), variance_factor = 0.0
- Becomes valuable when comparing across multiple workflow runs
- Week 3 Day 5 recommendation engine can flag: "Inconsistent performance detected"

---

### Combined Score Calculation

#### The Formula
```python
def calculate_bottleneck_score(
    duration_factor: float,      # 0.0 to 1.0
    position_factor: float,      # 0.3 or 1.0
    frequency_factor: float,     # 0.0 to 1.0
    variance_factor: float       # 0.0 to 1.0
) -> int:
    """
    Combines all factors with weights to produce final score 0-100
    
    Weights:
    - Duration: 40% (most important - raw time impact)
    - Position: 30% (critical path location)
    - Frequency: 20% (loop/retry multiplier)
    - Variance: 10% (consistency penalty)
    
    Returns: Integer score 0-100
    - 0-30: Low bottleneck (green)
    - 31-60: Medium bottleneck (yellow)  
    - 61-80: High bottleneck (orange)
    - 81-100: Severe bottleneck (red)
    """
    weighted_score = (
        duration_factor * 0.40 +
        position_factor * 0.30 +
        frequency_factor * 0.20 +
        variance_factor * 0.10
    )
    
    # Scale to 0-100
    score = int(weighted_score * 100)
    
    # Ensure bounds
    return max(0, min(100, score))
```

#### Score Interpretation
```python
def get_severity_level(score: int) -> str:
    """Returns severity category for UI display"""
    if score >= 81:
        return "severe"    # Red - optimize immediately
    elif score >= 61:
        return "high"      # Orange - optimize soon
    elif score >= 31:
        return "medium"    # Yellow - monitor
    else:
        return "low"       # Green - acceptable
```

---

## Worked Examples (Real Data)

### Example 1: Claude Node (Severe Bottleneck)

**Node**: "Claude: Generate Variant"  
**Data**:
- Duration: 5559ms (slowest node in execution)
- On critical path: Yes
- Executions: 1
- Variance: N/A (single execution)

**Calculation**:
```python
# Duration factor
all_durations = [100, 150, 200, ..., 2015, 5559]
duration_factor = 1.0  # 100th percentile (slowest)

# Position factor
on_critical_path = True
position_factor = 1.0  # Maximum impact

# Frequency factor
execution_count = 1
frequency_factor = 0.0  # No frequency penalty

# Variance factor
variance_factor = 0.0  # Single execution

# Combined score
score = (1.0 * 0.40) + (1.0 * 0.30) + (0.0 * 0.20) + (0.0 * 0.10)
score = 0.40 + 0.30 + 0.0 + 0.0 = 0.70
score = 70  # Out of 100

# Severity
severity = "high"  # 61-80 range (orange)
```

**Result**: 70/100 - High bottleneck ⚠️
- 41% of total execution time (5.559s / 13.47s)
- Blocks all downstream nodes
- Top priority for optimization

**Note**: Score is 70 (not 95) because frequency and variance factors are 0.0 in single execution. With loop data, score would increase significantly.

---

### Example 2: Rate Limit Delay (Medium-High Bottleneck)

**Node**: "Rate Limit Delay"  
**Data**:
- Duration: 2015ms (2nd slowest)
- On critical path: Yes
- Executions: 1
- Variance: N/A

**Calculation**:
```python
# Duration factor
duration_factor = 0.98  # 98th percentile

# Position factor  
position_factor = 1.0  # On critical path

# Frequency factor
frequency_factor = 0.0  # Single execution

# Variance factor
variance_factor = 0.0

# Combined score
score = (0.98 * 0.40) + (1.0 * 0.30) + (0.0 * 0.20) + (0.0 * 0.10)
score = 0.392 + 0.30 + 0.0 + 0.0 = 0.692
score = 69  # Out of 100

# Severity
severity = "high"  # 61-80 range
```

**Result**: 69/100 - High bottleneck ⚠️
- 15% of total execution time
- Intentional delay (hardcoded wait)
- Recommendation: Replace with dynamic condition check

---

### Example 3: Fast Node (Low Priority)

**Node**: "Parse Request"  
**Data**:
- Duration: 100ms
- On critical path: Yes
- Executions: 1

**Calculation**:
```python
# Duration factor
duration_factor = 0.05  # 5th percentile (very fast)

# Position factor
position_factor = 1.0  # On critical path

# Frequency factor
frequency_factor = 0.0

# Variance factor
variance_factor = 0.0

# Combined score
score = (0.05 * 0.40) + (1.0 * 0.30) + 0.0 + 0.0
score = 0.02 + 0.30 = 0.32
score = 32  # Out of 100

# Severity
severity = "medium"  # 31-60 range (yellow)
```

**Result**: 32/100 - Medium bottleneck ⚠️
- Only scores medium because it's on critical path
- Duration is actually great (fast)
- Low priority for optimization

---

### Example 4: Off-Path Slow Node (Lower Priority)

**Node**: Hypothetical parallel branch  
**Data**:
- Duration: 3000ms (slower than rate limit node!)
- On critical path: No (runs in parallel)
- Executions: 1

**Calculation**:
```python
# Duration factor
duration_factor = 0.95  # 95th percentile (slow)

# Position factor
position_factor = 0.3  # NOT on critical path

# Frequency factor
frequency_factor = 0.0

# Variance factor
variance_factor = 0.0

# Combined score
score = (0.95 * 0.40) + (0.3 * 0.30) + 0.0 + 0.0
score = 0.38 + 0.09 = 0.47
score = 47  # Out of 100

# Severity
severity = "medium"  # 31-60 range
```

**Result**: 47/100 - Medium bottleneck
- Even though node takes 3s (slower than rate limit delay!)
- Scores lower because it runs in parallel (doesn't block)
- Optimize after critical path nodes

**Key Insight**: Position factor is powerful! Being off the critical path reduces score by ~30 points even for slow nodes.

---

## Edge Cases & Handling

### 1. Single Execution (Current State)
**Scenario**: Only analyzing one execution of the workflow

**Impact**:
- Frequency factor = 0.0 for all nodes
- Variance factor = 0.0 for all nodes
- Scores range from 0-70 instead of 0-100

**Handling**:
```python
if len(execution_data) == 1:
    # Adjust weights to compensate
    # Give more weight to duration and position
    adjusted_weights = {
        'duration': 0.57,   # Was 0.40
        'position': 0.43,   # Was 0.30
        'frequency': 0.0,   # Was 0.20
        'variance': 0.0     # Was 0.10
    }
```

**Alternative**: Keep original weights, accept that scores max at 70 for single execution analysis. Add note in API response: `"analysis_type": "single_execution"`

**Recommendation**: Use original weights (simpler, more consistent). Document that single execution scores are conservative estimates.

---

### 2. All Nodes on Critical Path (96%+ path percentage)
**Scenario**: Workflow is highly sequential (like our test data)

**Impact**:
- Almost every node gets position_factor = 1.0
- Position factor doesn't differentiate much
- Scores primarily determined by duration

**Handling**:
- This is actually correct behavior!
- In sequential workflows, duration IS the main differentiator
- Position factor still helps (the 4% off-path nodes get lower scores)

**User Insight**: 
> "Your workflow is 96% sequential. Almost every node is a bottleneck because they all block each other. Consider parallelizing operations."

This becomes a Week 3 Day 5 recommendation!

---

### 3. Loop Nodes (Multiple Executions)
**Scenario**: Node executes 10 times in a loop

**Example**:
```python
# Node in loop that runs 10 times at 500ms each
total_duration = 5000ms  # 10 * 500ms
execution_count = 10
durations = [500, 510, 490, 505, 500, 495, 500, 510, 490, 500]

# Duration factor (use TOTAL duration for percentile)
duration_factor = calculate_percentile(5000, all_node_total_durations)
# Result: High (5s total vs other nodes)

# Frequency factor
frequency_factor = calculate_frequency_factor(10)
# Result: 0.7 (high frequency penalty)

# Variance factor
variance_factor = calculate_variance_factor(durations)
# CV = std_dev(durations) / mean ≈ 2%
# Result: 0.02 (very consistent)

# Combined score
score = (0.95 * 0.40) + (1.0 * 0.30) + (0.7 * 0.20) + (0.02 * 0.10)
score = 0.38 + 0.30 + 0.14 + 0.002 = 0.822
score = 82  # Severe bottleneck!
```

**Insight**: Even though per-execution duration is low (500ms), high frequency makes it a severe bottleneck.

---

### 4. Zero-Duration Nodes
**Scenario**: Node completes instantly (0ms duration)

**Handling**:
```python
if node_duration == 0:
    duration_factor = 0.0
    # Node still gets position factor if on critical path
    # Final score will be: position_factor * 0.30
    # Result: 30/100 if on path, 9/100 if off path
```

**Result**: Zero-duration nodes can't be bottlenecks (correct!)

---

### 5. Error Nodes
**Scenario**: Node fails with ERROR event

**Handling**:
- Include in bottleneck analysis (error still took time)
- Flag in results: `"status": "error"`
- Duration is time until error occurred

**Example**:
```python
# Node that errors after 10s
duration = 10000ms
on_critical_path = True
status = "error"

# Calculate score normally
score = 70  # High bottleneck

# Return with error flag
{
    "node_id": "...",
    "score": 70,
    "severity": "high",
    "status": "error",  # <-- Flag for UI
    "message": "Node failed but still consumed 10s"
}
```

**User Insight**: "This node is slow AND failing. Fix errors first, then optimize speed."

---

## Database Schema

### Table: `node_stats`
```sql
CREATE TABLE node_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID REFERENCES executions(id),
    workflow_id UUID REFERENCES workflows(id),
    node_id TEXT NOT NULL,
    
    -- Raw metrics
    duration_ms INTEGER NOT NULL,
    execution_count INTEGER DEFAULT 1,
    on_critical_path BOOLEAN NOT NULL,
    
    -- Calculated factors (0.0 to 1.0)
    duration_factor DECIMAL(3,2),
    position_factor DECIMAL(3,2),
    frequency_factor DECIMAL(3,2),
    variance_factor DECIMAL(3,2),
    
    -- Final score
    bottleneck_score INTEGER NOT NULL,  -- 0-100
    severity_level TEXT NOT NULL,  -- low, medium, high, severe
    
    -- Metadata
    calculated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(execution_id, node_id)
);

CREATE INDEX idx_node_stats_execution ON node_stats(execution_id);
CREATE INDEX idx_node_stats_score ON node_stats(execution_id, bottleneck_score DESC);
CREATE INDEX idx_node_stats_severity ON node_stats(execution_id, severity_level);
```

### Why Store Factors Separately?
- **Debugging**: See which factor contributed most to score
- **Tuning**: Adjust weights without recalculating factors
- **Transparency**: Show users the breakdown
- **Analysis**: Identify patterns (e.g., "All high scores are due to position factor")

---

## API Endpoint Design

### Endpoint: `GET /api/workflows/{workflow_id}/executions/{execution_id}/bottlenecks`

#### Request
```bash
curl "http://localhost:8000/api/workflows/8ce95407-8381-4756-85aa-c5c2a0251384/executions/15720484-8e33-464b-84b8-0936ecfa7096/bottlenecks?limit=10"
```

#### Query Parameters
- `limit` (optional, default: 10) - Number of top bottlenecks to return
- `severity` (optional) - Filter by severity level: `low`, `medium`, `high`, `severe`
- `min_score` (optional) - Only return nodes with score >= threshold

#### Response (Success)
```json
{
  "success": true,
  "data": {
    "bottlenecks": [
      {
        "rank": 1,
        "node_id": "claude_generate_variant",
        "node_name": "Claude: Generate Variant",
        "node_type": "n8n-nodes-base.ai",
        "score": 70,
        "severity": "high",
        "on_critical_path": true,
        "duration_ms": 5559,
        "execution_count": 1,
        "percentage_of_total": 41.3,
        "factors": {
          "duration": 1.0,
          "position": 1.0,
          "frequency": 0.0,
          "variance": 0.0
        },
        "evidence": {
          "critical_path_position": 12,
          "blocks_downstream": true,
          "cumulative_duration_ms": 8234
        }
      },
      {
        "rank": 2,
        "node_id": "rate_limit_delay",
        "node_name": "Rate Limit Delay",
        "node_type": "n8n-nodes-base.wait",
        "score": 69,
        "severity": "high",
        "on_critical_path": true,
        "duration_ms": 2015,
        "execution_count": 1,
        "percentage_of_total": 15.0,
        "factors": {
          "duration": 0.98,
          "position": 1.0,
          "frequency": 0.0,
          "variance": 0.0
        }
      }
    ],
    "summary": {
      "total_nodes_analyzed": 52,
      "severe_bottlenecks": 0,
      "high_bottlenecks": 2,
      "medium_bottlenecks": 50,
      "low_bottlenecks": 0,
      "total_execution_duration_ms": 13470,
      "top_bottleneck_impact_percentage": 41.3
    },
    "analysis_context": {
      "execution_id": "15720484-8e33-464b-84b8-0936ecfa7096",
      "analysis_type": "single_execution",
      "critical_path_percentage": 96.15,
      "calculated_at": "2026-01-11T10:30:00Z",
      "from_cache": false
    }
  }
}
```

#### Response (Error: Critical Path Not Found)
```json
{
  "success": false,
  "error": {
    "code": "CRITICAL_PATH_REQUIRED",
    "message": "Critical path must be calculated before bottleneck analysis",
    "details": "Run GET /critical-path endpoint first"
  }
}
```

---

## Implementation Checklist

### File Structure
```
backend/src/analysis/
├── __init__.py
├── critical_path.py          # ✅ Complete (Day 1)
├── bottlenecks.py             # 🆕 Day 2
└── tests/
    ├── test_critical_path.py  # ✅ Day 1
    └── test_bottlenecks.py    # 🆕 Day 2
```

### bottlenecks.py Outline
```python
from typing import Dict, List, Optional
from dataclasses import dataclass
import statistics
import math

@dataclass
class BottleneckScore:
    node_id: str
    node_name: str
    score: int  # 0-100
    severity: str  # low, medium, high, severe
    duration_ms: int
    on_critical_path: bool
    factors: Dict[str, float]

class BottleneckAnalyzer:
    def __init__(self, supabase_client):
        self.db = supabase_client
    
    def analyze(self, execution_id: str, limit: int = 10) -> List[BottleneckScore]:
        """Main entry point - orchestrates analysis"""
        pass
    
    def _load_critical_path(self, execution_id: str) -> Dict:
        """Load critical path results from Day 1"""
        pass
    
    def _load_node_durations(self, execution_id: str) -> Dict:
        """Load execution timing for all nodes"""
        pass
    
    def _calculate_duration_factor(self, duration: int, 
                                   all_durations: List[int]) -> float:
        """Calculate percentile-based duration factor"""
        pass
    
    def _calculate_position_factor(self, node_id: str,
                                   critical_path: List[str]) -> float:
        """Determine if node is on critical path"""
        pass
    
    def _calculate_frequency_factor(self, execution_count: int) -> float:
        """Calculate frequency impact (for loops)"""
        pass
    
    def _calculate_variance_factor(self, durations: List[int]) -> float:
        """Calculate consistency factor (requires multiple executions)"""
        pass
    
    def _calculate_bottleneck_score(self, duration_factor: float,
                                    position_factor: float,
                                    frequency_factor: float,
                                    variance_factor: float) -> int:
        """Combine factors into final score"""
        pass
    
    def _get_severity_level(self, score: int) -> str:
        """Map score to severity category"""
        pass
    
    def _store_results(self, execution_id: str, 
                      bottlenecks: List[BottleneckScore]):
        """Save to node_stats table"""
        pass
    
    def _get_cached_results(self, execution_id: str) -> Optional[List[BottleneckScore]]:
        """Check if already calculated"""
        pass
```

### API Integration (main.py)
```python
from src.analysis.bottlenecks import BottleneckAnalyzer

@app.get("/api/workflows/{workflow_id}/executions/{execution_id}/bottlenecks")
async def get_bottlenecks(
    workflow_id: str,
    execution_id: str,
    limit: int = 10,
    severity: Optional[str] = None,
    min_score: Optional[int] = None
):
    analyzer = BottleneckAnalyzer(supabase)
    
    try:
        bottlenecks = analyzer.analyze(execution_id, limit=limit)
        
        # Apply filters
        if severity:
            bottlenecks = [b for b in bottlenecks if b.severity == severity]
        if min_score:
            bottlenecks = [b for b in bottlenecks if b.score >= min_score]
        
        # Format response
        return {
            "success": True,
            "data": {
                "bottlenecks": [asdict(b) for b in bottlenecks],
                "summary": calculate_summary(bottlenecks)
            }
        }
    except ValueError as e:
        return {
            "success": False,
            "error": {
                "code": "ANALYSIS_ERROR",
                "message": str(e)
            }
        }
```

---

## Testing Strategy

### Unit Tests

#### Test 1: Duration Factor Calculation
```python
def test_duration_factor():
    """
    All durations: [100, 200, 500, 1000, 5000]
    
    Node at 5000ms → factor = 1.0 (100th percentile)
    Node at 1000ms → factor = 0.6 (60th percentile)
    Node at 100ms → factor = 0.0 (0th percentile)
    """
```

#### Test 2: Position Factor
```python
def test_position_factor():
    """
    Critical path: [A, B, C]
    
    Node A → factor = 1.0 (on path)
    Node D → factor = 0.3 (off path)
    """
```

#### Test 3: Frequency Factor
```python
def test_frequency_factor():
    """
    1 execution → factor = 0.0
    5 executions → factor ≈ 0.4
    20 executions → factor = 1.0
    """
```

#### Test 4: Combined Score
```python
def test_combined_score():
    """
    Test the weighted formula with known inputs
    
    duration=1.0, position=1.0, freq=0.0, var=0.0
    Expected: 70/100
    
    duration=0.5, position=0.3, freq=0.0, var=0.0
    Expected: 29/100
    """
```

### Integration Test with Real Data
```python
def test_real_72_node_workflow():
    """
    Load actual execution: 15720484-8e33-464b-84b8-0936ecfa7096
    
    Assertions:
    - Top bottleneck is "Claude: Generate Variant"
    - Score is 65-75 range (high severity)
    - Second bottleneck is "Rate Limit Delay"
    - At least 2 high severity bottlenecks identified
    - All scores are 0-100 range
    - Severity levels assigned correctly
    """
```

---

## Performance Considerations

### Time Complexity
- Load critical path: O(1) (database lookup)
- Load node durations: O(V) where V = number of nodes
- Calculate duration factors: O(V log V) (sorting for percentiles)
- Calculate other factors: O(V)
- **Total: O(V log V)** - Very efficient even for large workflows

### Space Complexity
- Node data storage: O(V)
- Critical path: O(path length) ≈ O(V) worst case
- **Total: O(V)** - Linear space

### Real-World Performance (72-Node Workflow)
- Nodes: 52 executed
- Expected calculation time: < 30ms
- Database queries: < 100ms (load critical path + node data)
- **Total API response: < 150ms**

### Optimization: Single Query
```python
# Load everything in one query
query = """
    SELECT 
        ee.node_id,
        wn.node_name,
        wn.node_type,
        ee.duration_ms,
        COUNT(*) as execution_count,
        cp.path_node_ids  -- Critical path from Day 1
    FROM execution_events ee
    JOIN workflow_nodes wn ON ee.node_id = wn.node_id
    LEFT JOIN critical_paths cp ON ee.execution_id = cp.execution_id
    WHERE ee.execution_id = %s
    AND ee.event_type IN ('FINISHED', 'ERROR')
    GROUP BY ee.node_id, wn.node_name, wn.node_type, ee.duration_ms, cp.path_node_ids
"""
# Reduces database round trips significantly
```

---

## Success Criteria

### Algorithm Correctness
- [ ] Scores range from 0-100 for all nodes
- [ ] Top bottleneck matches longest duration node on critical path
- [ ] Severity levels assigned correctly (low/medium/high/severe)
- [ ] Position factor gives 3.33x advantage to critical path nodes
- [ ] Scores are deterministic (same input = same output)

### Real Data Validation
- [ ] "Claude: Generate Variant" scores as top bottleneck (65-75 range)
- [ ] "Rate Limit Delay" scores as second bottleneck (65-70 range)
- [ ] Fast nodes (<200ms) score below 40
- [ ] At least 2 nodes flagged as "high" severity
- [ ] Summary statistics accurate (count by severity level)

### API Functionality
- [ ] Endpoint returns top N bottlenecks (limit parameter works)
- [ ] Results sorted by score descending (highest score first)
- [ ] Includes all required fields (node_id, name, score, factors)
- [ ] Response time < 150ms
- [ ] Error handling for missing critical path

### Data Integrity
- [ ] Results stored in node_stats table
- [ ] Factors stored separately for transparency
- [ ] Caching works (second call returns cached results)
- [ ] All scores are integers 0-100

---

## Next Steps (Week 3 Day 3)

Once bottleneck detection is working, Day 3 will add error clustering:

### Error Pattern Detection
Use bottleneck scores to prioritize which errors matter most:

```python
# Combine bottleneck scores with error patterns

# High-frequency error in high-bottleneck node → CRITICAL
if error_node_score > 60 and error_frequency > 5:
    priority = "critical"

# Rare error in low-bottleneck node → LOW PRIORITY  
if error_node_score < 30 and error_frequency == 1:
    priority = "low"
```

**Day 3 Preview**: Semantic clustering of error messages using HuggingFace embeddings + pgvector similarity search.

---

## Key Design Decisions

### Why Percentile for Duration?
**Alternative**: Use absolute thresholds (>5s = bottleneck)

**Problem**: Doesn't scale across workflows
- 5s is severe in a 10s workflow
- 5s is minor in a 100s workflow

**Solution**: Percentile ranking is relative and scales automatically

---

### Why 40/30/20/10 Weighting?
**Duration (40%)**: Most direct impact - longer time = bigger problem

**Position (30%)**: Critical path location is second most important - blocks everything

**Frequency (20%)**: Multiplier effect - repeated slow operations accumulate

**Variance (10%)**: Least important for single execution, but flags unpredictability

**Validation**: Can be tuned based on user feedback in production

---

### Why Not Absolute Time Thresholds?
**Alternative**: "Any node >5s is a bottleneck"

**Problem**:
- Ignores context (is 5s a lot for this workflow?)
- Ignores position (5s off path vs 2s on path)
- Binary (either bottleneck or not)

**Our Approach**:
- Continuous scale (0-100 gives nuance)
- Relative to workflow (percentile-based)
- Context-aware (position + frequency matter)

---

## References

### Academic Background
- **Performance Analysis**: Critical path method (CPM) from 1950s
- **Percentile Ranking**: Standard statistics for outlier detection
- **Coefficient of Variation**: Measure of relative variability

### Industry Usage
- **Datadog APM**: Uses similar multi-factor scoring for bottleneck detection
- **New Relic**: Percentile-based performance thresholds
- **n8n**: Currently has no bottleneck scoring (our opportunity!)

### Statistical Methods
- **Percentile calculation**: Python `statistics.quantiles()`
- **Standard deviation**: Python `statistics.stdev()`
- **Coefficient of variation**: Industry standard for comparing variability

---

**END OF SPECIFICATION**

This spec is ready for implementation. Next: Create `backend/src/analysis/bottlenecks.py` and build the scoring algorithm!
