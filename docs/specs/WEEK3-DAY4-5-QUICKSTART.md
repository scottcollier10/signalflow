# Week 3 Days 4-5: Quick Reference

**Task**: Implement Recommendation Engine with 15 Detection Rules  
**Estimated Time**: 7-10 hours (Day 4: 4-6h, Day 5: 3-4h)  
**Status**: Ready to implement

---

## 📋 Checklist

### Day 4: Performance Rules (1-7)
- [ ] Create `backend/src/analysis/recommendations.py`
- [ ] Define Recommendation & Evidence dataclasses
- [ ] Implement RecommendationEngine class
- [ ] Rule #1: Sequential API Calls → Parallelize
- [ ] Rule #2: Long Node Duration → Optimize
- [ ] Rule #3: High Loop Iterations → Batch
- [ ] Rule #4: Duplicate Requests → Cache
- [ ] Rule #5: Polling → Webhooks
- [ ] Rule #6: Large Transfers → Compress
- [ ] Rule #7: Hardcoded Delays → Remove
- [ ] Test each rule individually

### Day 5: Reliability Rules (8-15)
- [ ] Rule #8: Timeouts → Increase Timeout
- [ ] Rule #9: Auth Failures → Fix Credentials
- [ ] Rule #10: Rate Limits → Add Backoff
- [ ] Rule #11: Network Errors → Add Retry
- [ ] Rule #12: Validation → Add Checks
- [ ] Rule #13: Resource Errors → Scale
- [ ] Rule #14: High Error Rate → Investigate
- [ ] Rule #15: Multi-Node Errors → Systemic
- [ ] Implement priority_score calculation
- [ ] Add API endpoint to main.py
- [ ] Write comprehensive tests
- [ ] Test with real workflow data
- [ ] Verify 6-8 recommendations generated

---

## 🎯 Success Criteria

**All must pass**:
✅ All 15 rules implemented  
✅ Each recommendation has 2+ evidence items with links  
✅ Priority scores calculated correctly (0-100)  
✅ API response <600ms  
✅ Test workflow generates 6-8 recommendations  
✅ Code examples for 8-10 rules  
✅ Unit tests pass for all rules

---

## 🚀 Quick Start

**1. Read the specs** (15 min):
```bash
cat docs/specs/week3-day4-5-recommendation-engine.md
```

**2. Start implementation** (Claude Code):
```bash
cd ~/dev/signalflow
claude code --prompt .claude-code-prompts/week3-day4-5-recommendation-engine.md
```

**3. Test as you go**:
```bash
# Start backend
cd backend && python3 -m uvicorn src.main:app --reload --port 8000

# In another terminal, test API
curl http://localhost:8000/api/workflows/{wf_id}/executions/{exec_id}/recommendations
```

---

## 📊 Expected Output

For test execution `15720484-8e33-464b-84b8-0936ecfa7096`:

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "rule_id": 1,
        "title": "Parallelize API Calls in Loop",
        "priority_score": 92,
        "impact": "HIGH",
        "effort": "MEDIUM",
        "evidence": [...]
      },
      {
        "rule_id": 7,
        "title": "Review Rate Limit Delay",
        "priority_score": 75,
        "impact": "MEDIUM",
        "effort": "LOW",
        "evidence": [...]
      },
      // ... 4-6 more recommendations
    ],
    "summary": {
      "total_recommendations": 8,
      "by_category": {
        "performance": 5,
        "reliability": 3
      }
    }
  }
}
```

---

## 💡 Key Formulas

**Priority Score**:
```python
priority = (impact_score / effort_multiplier) * 100

# Impact score: 0-1 (based on time_saved or error_count)
# Effort multipliers: LOW=1.0, MEDIUM=0.7, HIGH=0.4
```

**Impact Levels**:
- CRITICAL: Security issues, complete failures
- HIGH: >5s time saved or >10 errors
- MEDIUM: 2-5s saved or 5-10 errors
- LOW: <2s saved or <5 errors

---

## 🔗 Reference Links

**Full Spec**: `docs/specs/week3-day4-5-recommendation-engine.md` (70 pages)  
**Project Context**: `docs/PROJECT-CONTEXT-WEEK3.md`  
**New Chat Handoff**: `docs/NEW-CHAT-HANDOFF.md`  
**Claude Code Prompt**: `.claude-code-prompts/week3-day4-5-recommendation-engine.md`

---

## 🐛 Common Issues

**"Can't load critical path"**: Make sure Days 1-3 APIs are working  
**"No recommendations generated"**: Check test data exists, rules are triggering  
**"Priority scores all the same"**: Verify impact/effort calculation logic  
**"Tests failing"**: Check mock data matches real data structure

---

## ✨ After Completion

**Commit**:
```bash
git add backend/src/analysis/recommendations.py
git commit -m "Week 3 Days 4-5: Recommendation engine complete"
git tag -a v0.6-week3-day4-5 -m "15 detection rules implemented"
git push origin main --tags
```

**Celebrate** 🎉 - You've built the intelligence layer of SignalFlow!

**Next**: Week 3 Days 6-7 - Frontend dashboard to display everything

---

**Week 3 Progress**: 42% → 71% complete (3→5 of 7 days)
