# Tier 1 Implementation Checklist

## Pre-Implementation
- [ ] Run git checkpoint commands (see below)
- [ ] Verify backend is running on port 8000
- [ ] Verify frontend is running on port 3001
- [ ] Have test executions ready (4671 original, 4733 optimized)

## Backend Changes
- [ ] Task 1: Add fallback recommendation rule in `recommendations.py`
- [ ] Task 2: Add `has_recommendations` flag to bottleneck API response
- [ ] Task 3: Update verdict logic to check recommendation availability

## Frontend Changes
- [ ] Task 4: Make verdict banner clickable (AnalysisOverview.tsx)
- [ ] Task 5: Add "View Fix" button to bottleneck cards
- [ ] Task 6: (Optional) Add node filtering to Recommendations tab

## Testing
- [ ] Test Case 1: Orphaned bottleneck gets fallback recommendation
- [ ] Test Case 2: Verdict matches recommendation availability
- [ ] Test Case 3: "View Fix" button appears on correct cards
- [ ] Test Case 4: Verdict banner navigation works
- [ ] Test Case 5: End-to-end flow (Overview → Recommendations)

## Post-Implementation
- [ ] All tests pass
- [ ] Test with both AI Lead Scoring executions (4671 and 4733)
- [ ] Create post-Tier 1 git checkpoint
- [ ] Document any remaining UX issues
- [ ] Decide: Proceed to Tier 2 or iterate?

---

## Git Checkpoint Commands

### Before Starting (Run Now)
```bash
cd /Users/scottcollier/dev/signalflow
git add -A
git commit -m "Checkpoint: Pre-Tier 1 UX fixes - v0.8 baseline"
git tag -a v0.8-pre-tier1 -m "Baseline before Tier 1 UX improvements"
git push origin main
git push origin v0.8-pre-tier1
```

### After Tier 1 Complete
```bash
git add -A
git commit -m "Tier 1: Trust gap fixes - recommendations, verdict UX, actionable bottlenecks"
git tag -a v0.8-tier1-complete -m "Tier 1 UX fixes complete"
git push origin main
git push origin v0.8-tier1-complete
```

### Rollback If Needed
```bash
git reset --hard v0.8-pre-tier1
```

---

## Estimated Time
- Backend changes: 2-3 hours
- Frontend changes: 1-2 hours
- Testing: 30-60 minutes
- **Total: 4-6 hours**

## Success Metrics
1. Zero executions show "Optimization Recommended" with 0 recommendations
2. All high-severity bottlenecks have at least one recommendation
3. Bottleneck cards clearly indicate which are actionable
4. Verdict banner provides clear navigation path
5. User can go from "problem identified" to "here's the fix" in 1-2 clicks
