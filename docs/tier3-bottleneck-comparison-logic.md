# Bottleneck Comparison Logic - Tier 3

## Problem Statement

Current bottleneck scoring is **relative within each execution**. This creates a "trust gap" in the comparison view:

**What happens now:**
```
Before: 12 bottlenecks (scores: 95, 88, 76...)
After:  8 bottlenecks (scores: 45, 42, 38...)
```

**User thinks:** "I still have 8 bottlenecks? Did I actually fix it??"

**Reality:** The 8 "bottlenecks" in the optimized workflow are all <100ms and can be ignored. They're only flagged because they're the slowest nodes in a fast workflow.

---

## Solution: Severity Distribution + Resolved Tracking

### Short-term Implementation (Tier 3)

Show bottlenecks by **severity distribution** instead of raw count:

```
Before Optimization:
├─ 2 SEVERE (90-100 score) 🔴  ← Actually slow (>2s)
├─ 3 HIGH (70-89 score)    🟠  ← Actually slow (500ms-2s)
└─ 7 MEDIUM (50-69 score)  🟡  ← Moderately slow (100-500ms)
   Total: 12 bottlenecks

After Optimization:
├─ 0 SEVERE ✅
├─ 0 HIGH ✅
└─ 8 LOW (30-49 score) 🟢      ← All under 100ms - safe to ignore
   These nodes are all fast in absolute terms

Impact:
✅ All critical bottlenecks resolved
✅ 10 bottlenecks actually fixed (2 SEVERE + 3 HIGH + 5 MEDIUM)
✅ Workflow is production-ready
```

### Key Messages

1. **Severity matters more than count**
   - 2 SEVERE bottlenecks = critical problem
   - 8 LOW bottlenecks = normal for optimized workflow

2. **Absolute performance matters**
   - Node under 100ms = fast, even if "slower than others"
   - Node over 2s = slow, needs attention

3. **Focus on resolved items**
   - "10 bottlenecks resolved" (not "8 still exist")
   - Show what got fixed, not what remains

---

## Backend Implementation

### 1. Severity Buckets

Map scores to severity levels:

```python
def get_severity(score: int, absolute_duration_ms: int) -> str:
    """
    Combine relative score with absolute duration thresholds.
    """
    # Absolute duration takes precedence for very fast nodes
    if absolute_duration_ms < 50:
        return "NONE"  # Too fast to matter
    
    if absolute_duration_ms < 100:
        return "LOW"   # Fast enough in absolute terms
    
    # Use score for slower nodes
    if score >= 90:
        return "SEVERE"
    elif score >= 70:
        return "HIGH"
    elif score >= 50:
        return "MEDIUM"
    else:
        return "LOW"
```

### 2. Comparison Algorithm

```python
def compare_bottlenecks(exec_before, exec_after):
    """
    Compare bottlenecks between two executions.
    Returns severity distribution and resolved count.
    """
    before_by_severity = {
        "SEVERE": [],
        "HIGH": [],
        "MEDIUM": [],
        "LOW": []
    }
    
    after_by_severity = {
        "SEVERE": [],
        "HIGH": [],
        "MEDIUM": [],
        "LOW": []
    }
    
    resolved = []
    persisting = []
    new_bottlenecks = []
    
    # Categorize before bottlenecks
    for node in exec_before.bottlenecks:
        severity = get_severity(node.score, node.duration)
        before_by_severity[severity].append(node)
    
    # Categorize after bottlenecks
    for node in exec_after.bottlenecks:
        severity = get_severity(node.score, node.duration)
        after_by_severity[severity].append(node)
    
    # Track what got resolved
    for node_name in exec_before.bottleneck_node_names:
        before_node = exec_before.get_node(node_name)
        after_node = exec_after.get_node(node_name)
        
        if after_node is None:
            # Node removed entirely (edge case)
            resolved.append({
                "node": node_name,
                "reason": "Node removed from workflow"
            })
            continue
        
        # Check if actually resolved
        # Criteria: Duration improved by >50% OR now under 100ms
        duration_improved = (
            after_node.duration < before_node.duration * 0.5
        )
        now_fast = after_node.duration < 100
        
        if duration_improved or now_fast:
            resolved.append({
                "node": node_name,
                "before_duration": before_node.duration,
                "after_duration": after_node.duration,
                "before_score": before_node.bottleneck_score,
                "after_score": after_node.bottleneck_score,
                "improvement_pct": (
                    (before_node.duration - after_node.duration) 
                    / before_node.duration * 100
                )
            })
        else:
            # Still slow in absolute terms
            persisting.append({
                "node": node_name,
                "before_duration": before_node.duration,
                "after_duration": after_node.duration,
                "note": "Duration did not improve significantly"
            })
    
    # Check for new bottlenecks (nodes that weren't slow before)
    for node_name in exec_after.bottleneck_node_names:
        if node_name not in exec_before.bottleneck_node_names:
            new_bottlenecks.append({
                "node": node_name,
                "duration": exec_after.get_node(node_name).duration,
                "score": exec_after.get_node(node_name).bottleneck_score
            })
    
    return {
        "before": {
            "severe": len(before_by_severity["SEVERE"]),
            "high": len(before_by_severity["HIGH"]),
            "medium": len(before_by_severity["MEDIUM"]),
            "low": len(before_by_severity["LOW"]),
            "total": len(exec_before.bottlenecks)
        },
        "after": {
            "severe": len(after_by_severity["SEVERE"]),
            "high": len(after_by_severity["HIGH"]),
            "medium": len(after_by_severity["MEDIUM"]),
            "low": len(after_by_severity["LOW"]),
            "total": len(exec_after.bottlenecks)
        },
        "resolved": {
            "count": len(resolved),
            "items": resolved
        },
        "persisting": {
            "count": len(persisting),
            "items": persisting
        },
        "new": {
            "count": len(new_bottlenecks),
            "items": new_bottlenecks
        }
    }
```

### 3. API Response Format

```json
{
  "comparison": {
    "bottlenecks": {
      "before": {
        "severe": 2,
        "high": 3,
        "medium": 5,
        "low": 2,
        "total": 12
      },
      "after": {
        "severe": 0,
        "high": 0,
        "medium": 0,
        "low": 8,
        "total": 8
      },
      "resolved": {
        "count": 10,
        "items": [
          {
            "node": "delete_existing_data",
            "before_duration": 11000,
            "after_duration": 8,
            "improvement_pct": 99.93
          }
        ]
      },
      "persisting": {
        "count": 2,
        "items": [
          {
            "node": "slow_external_api",
            "before_duration": 3000,
            "after_duration": 2800,
            "note": "External dependency - limited improvement"
          }
        ]
      },
      "new": {
        "count": 0,
        "items": []
      }
    }
  }
}
```

---

## Frontend Display

### Bottleneck Comparison Card

```tsx
<div className="neu-flat p-6 rounded-xl">
  <h3 className="text-xl font-semibold mb-4">Bottleneck Resolution</h3>
  
  {/* Before distribution */}
  <div className="mb-4">
    <div className="text-sm text-neu-text-secondary mb-2">
      Before Optimization
    </div>
    <div className="flex gap-2">
      {comparison.before.severe > 0 && (
        <Badge variant="severe" count={comparison.before.severe} />
      )}
      {comparison.before.high > 0 && (
        <Badge variant="high" count={comparison.before.high} />
      )}
      {comparison.before.medium > 0 && (
        <Badge variant="medium" count={comparison.before.medium} />
      )}
    </div>
  </div>
  
  {/* After distribution */}
  <div className="mb-4">
    <div className="text-sm text-neu-text-secondary mb-2">
      After Optimization
    </div>
    {comparison.after.severe === 0 && comparison.after.high === 0 ? (
      <div className="text-green-400 flex items-center gap-2">
        <CheckCircle className="w-5 h-5" />
        <span>All critical bottlenecks resolved</span>
      </div>
    ) : (
      <div className="flex gap-2">
        {comparison.after.severe > 0 && (
          <Badge variant="severe" count={comparison.after.severe} />
        )}
        {comparison.after.high > 0 && (
          <Badge variant="high" count={comparison.after.high} />
        )}
      </div>
    )}
    
    {comparison.after.low > 0 && (
      <div className="text-xs text-neu-text-muted mt-2">
        {comparison.after.low} nodes flagged as low-priority bottlenecks 
        (all under 100ms - safe to ignore)
      </div>
    )}
  </div>
  
  {/* Resolution summary */}
  <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
    <div className="text-2xl font-bold text-green-400">
      ✅ {comparison.resolved.count} Bottlenecks Resolved
    </div>
    <div className="text-sm text-green-300 mt-1">
      Average improvement: 95% faster
    </div>
  </div>
</div>
```

### Resolved Items List

```tsx
<div className="mt-4">
  <h4 className="text-sm font-semibold mb-2">Top Improvements</h4>
  
  {comparison.resolved.items.slice(0, 3).map(item => (
    <div key={item.node} className="neu-flat p-3 rounded-lg mb-2">
      <div className="flex justify-between items-center">
        <span className="font-mono text-sm">{item.node}</span>
        <span className="text-green-400 font-bold">
          -{item.improvement_pct.toFixed(1)}%
        </span>
      </div>
      <div className="text-xs text-neu-text-secondary mt-1">
        {item.before_duration}ms → {item.after_duration}ms
      </div>
    </div>
  ))}
</div>
```

---

## Messaging Strategy

### When All Critical Bottlenecks Resolved

**Verdict:**
```
✅ EXCELLENT OPTIMIZATION

All critical bottlenecks resolved. Workflow is production-ready.

Details:
• 2 SEVERE bottlenecks → Fixed ✅
• 3 HIGH bottlenecks → Fixed ✅
• 5 MEDIUM bottlenecks → Fixed ✅
• 8 nodes remain flagged as "bottlenecks" but all are under 100ms

No further optimization needed.
```

### When Some Bottlenecks Persist

**Verdict:**
```
⚠️ GOOD PROGRESS - REVIEW REMAINING ISSUES

10 bottlenecks resolved, 2 persist.

Details:
• 2 SEVERE bottlenecks → Fixed ✅
• 3 HIGH bottlenecks → Fixed ✅
• 2 MEDIUM bottlenecks → Still present ⚠️

Remaining issues:
• slow_external_api (3.0s → 2.8s) - External dependency
• database_query (1.5s → 1.4s) - Consider indexing

Further optimization recommended.
```

### When Regression Detected

**Verdict:**
```
🔴 REGRESSION DETECTED

Performance worsened in some areas.

Details:
• 2 new SEVERE bottlenecks introduced
• 1 existing bottleneck got slower

Review changes and consider rollback.
```

---

## Testing Scenarios

### Test Case 1: Perfect Optimization (Executive Pulse)
```
Before: 2 SEVERE, 3 HIGH, 5 MEDIUM, 2 LOW
After: 0 SEVERE, 0 HIGH, 0 MEDIUM, 8 LOW

Expected:
- Verdict: "Excellent optimization"
- Resolved count: 10
- Persisting count: 0
- Message: "All critical bottlenecks resolved"
```

### Test Case 2: Partial Optimization
```
Before: 2 SEVERE, 3 HIGH, 5 MEDIUM
After: 0 SEVERE, 1 HIGH, 2 MEDIUM, 5 LOW

Expected:
- Verdict: "Good progress"
- Resolved count: 7
- Persisting count: 3
- Message: "Review remaining HIGH/MEDIUM issues"
```

### Test Case 3: Regression
```
Before: 1 SEVERE, 2 HIGH, 3 MEDIUM
After: 3 SEVERE, 2 HIGH, 1 MEDIUM

Expected:
- Verdict: "Regression detected"
- Resolved count: 3
- New count: 2
- Message: "Performance worsened - review changes"
```

---

## Long-term: Fix Scoring System (v2)

**Add absolute thresholds to bottleneck detection:**

```python
def calculate_bottleneck_severity(node, all_nodes):
    relative_score = calculate_relative_score(node, all_nodes)
    duration_ms = node.duration
    
    # Absolute thresholds take precedence
    if duration_ms < 50:
        return None  # Too fast to be a bottleneck
    elif duration_ms < 100:
        return "LOW" if relative_score > 40 else None
    elif duration_ms < 500:
        return "MEDIUM" if relative_score > 50 else "LOW"
    elif duration_ms < 2000:
        return "HIGH" if relative_score > 60 else "MEDIUM"
    else:  # > 2 seconds
        return "SEVERE"
```

**Result:** Optimized workflows naturally show 0 bottlenecks instead of "8 LOW bottlenecks".

---

## Summary

**Tier 3 Implementation:**
1. Show severity distribution (SEVERE/HIGH/MEDIUM/LOW)
2. Track "resolved" count (nodes that actually got faster)
3. Explain that LOW bottlenecks in optimized workflows are normal
4. Focus messaging on resolved items, not remaining items

**Future Enhancement (v2):**
- Add absolute thresholds to scoring algorithm
- Optimized workflows show "0 bottlenecks" naturally

**Key Message:**
"10 bottlenecks resolved ✅" not "8 bottlenecks remain ⚠️"
