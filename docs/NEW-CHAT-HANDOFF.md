# New Chat Handoff Checklist - Week 3 Days 4-5

**Date**: January 11, 2026  
**Status**: Ready to implement Recommendation Engine  
**Git Tag**: v0.5-week3-day1-3

---

## Quick Start Message for New Chat

Copy and paste this into your new chat:

```
SignalFlow - Week 3 Days 4-5: Recommendation Engine

Read these documents for context:
1. docs/PROJECT-CONTEXT-WEEK3.md (complete project overview)
2. docs/specs/week3-day4-5-recommendation-engine.md (implementation spec)

STATUS: Days 1-3 complete (critical path, bottlenecks, error clustering)
NEXT: Implement 15 detection rules for recommendation engine

LOCATION: /Users/scottcollier/dev/signalflow/
TEST WORKFLOW: 8ce95407-8381-4756-85aa-c5c2a0251384
TEST EXECUTION: 15720484-8e33-464b-84b8-0936ecfa7096

CORE PRINCIPLE: Evidence-first (every recommendation must have clickable proof)
```

---

## Files to Share with New Chat

**Essential Context** (share these first):
1. `docs/PROJECT-CONTEXT-WEEK3.md` - Complete project overview
2. `docs/specs/week3-day4-5-recommendation-engine.md` - Days 4-5 spec (70+ pages)

**Reference if Needed**:
3. `docs/WEEK3-DAY1-COMPLETE.md` - Day 1 summary
4. `docs/WEEK3-DAY2-COMPLETE.md` - Day 2 summary  
5. `docs/WEEK3-DAY3-COMPLETE.md` - Day 3 summary

**Implementation Specs** (for deep dives):
6. `docs/specs/week3-day1-critical-path.md`
7. `docs/specs/week3-day2-bottleneck-detection.md`
8. `docs/specs/week3-day3-error-clustering.md`

---

## What's Already Complete

### ✅ Week 3 Day 1: Critical Path Algorithm
- File: `backend/src/analysis/critical_path.py` (540 lines)
- API: `GET /api/workflows/{id}/executions/{id}/critical-path`
- Result: 96% of test workflow nodes on critical path (highly sequential)

### ✅ Week 3 Day 2: Bottleneck Detection
- File: `backend/src/analysis/bottlenecks.py` (540 lines)
- API: `GET /api/workflows/{id}/executions/{id}/bottlenecks`
- Result: Top bottlenecks scored 86-87/100 (severe)

### ✅ Week 3 Day 3: Error Clustering
- Files: `backend/src/analysis/embeddings.py`, `error_clustering.py` (650 lines)
- API: `GET /api/workflows/{id}/executions/{id}/error-analysis`
- Result: 88-91% similarity accuracy, HuggingFace model working locally

---

## What's Next: Days 4-5

### Goal
Generate prioritized, evidence-backed optimization recommendations using the 15 detection rules.

### Implementation Plan

**Day 4** (4-6 hours):
1. Create `backend/src/analysis/recommendations.py`
2. Implement Recommendation and Evidence dataclasses
3. Implement RecommendationEngine class structure
4. Implement Performance Rules #1-7
5. Test each rule individually

**Day 5** (3-4 hours):
6. Implement Reliability Rules #8-15
7. Implement priority score calculation
8. Add API endpoint to `backend/src/main.py`
9. Write comprehensive tests
10. Test with real workflow data (expect 6-8 recommendations)

### Expected Results

For test execution `15720484-8e33-464b-84b8-0936ecfa7096`:

**Top Recommendations**:
1. Rule #1: Parallelize API Calls (Priority: 92/100)
   - Evidence: 96% sequential, Claude node 86/100 bottleneck
   - Impact: HIGH (80% speedup potential)

2. Rule #7: Review Rate Limit Delay (Priority: 75/100)
   - Evidence: 2015ms delay, 87/100 bottleneck
   - Impact: MEDIUM

3-8: Various error-based recommendations depending on error clusters

---

## Claude Code Command

Once ready to implement:

```bash
cd ~/dev/signalflow
claude code --prompt .claude-code-prompts/week3-day4-5-recommendation-engine.md
```

---

## Test Commands

**Start backend** (in separate terminal):
```bash
cd ~/dev/signalflow/backend
python3 -m uvicorn src.main:app --reload --port 8000
```

**Test API** (after implementation):
```bash
curl "http://localhost:8000/api/workflows/8ce95407-8381-4756-85aa-c5c2a0251384/executions/15720484-8e33-464b-84b8-0936ecfa7096/recommendations"
```

**Run unit tests**:
```bash
cd ~/dev/signalflow/backend
python3 -m pytest test_recommendations.py -v
```

---

## Key Concepts to Remember

### Evidence-First Philosophy
Every recommendation must include:
- **Trigger**: Which rule fired and why
- **Evidence**: Clickable links to proof
- **Impact**: Quantified improvement
- **Effort**: Implementation difficulty
- **Priority**: 0-100 score for ranking

### Priority Score Formula
```python
priority_score = (impact_score / effort_multiplier) * 100

# Effort multipliers:
# LOW: 1.0 (no penalty)
# MEDIUM: 0.7 (30% penalty)
# HIGH: 0.4 (60% penalty)
```

### The 15 Rules (Quick Reference)

**Performance** (optimize speed):
1. Sequential API calls → Parallelize
2. Long duration → Optimize algorithm
3. High loop iterations → Batch processing
4. Duplicate requests → Add caching
5. Polling → Use webhooks
6. Large transfers → Compress/stream
7. Hardcoded delays → Remove/justify

**Reliability** (prevent errors):
8. Timeouts → Increase timeout
9. Auth failures → Fix credentials
10. Rate limits → Add backoff
11. Network errors → Add retry
12. Validation → Add input checks
13. Resource errors → Scale infrastructure
14. High error rate → Investigate
15. Multi-node errors → Systemic issue

---

## Common Issues & Solutions

### Issue: Can't see backend files
**Solution**: You're in a container with limited mounts. The docs/ folder is mounted and visible. Backend code is there but may need to work with Claude Code or check mounting.

### Issue: Database connection fails
**Solution**: Check `backend/.env` has correct Supabase credentials. Load with `load_dotenv()`.

### Issue: Test execution not found
**Solution**: Use `dd8fcc85-8470-4beb-91fe-7d7f03dd95de` as backup, or create test data with `create_minimal_test_data.py`.

### Issue: HuggingFace model not loading
**Solution**: Model downloads automatically (~80MB) to `~/.cache/huggingface/` on first run. Subsequent runs are fast.

---

## Git Workflow for After Completion

```bash
# Exit container
exit

# On host
cd ~/dev/signalflow

# Stage files
git add backend/src/analysis/recommendations.py
git add backend/src/main.py
git add backend/test_recommendations.py
git add docs/specs/week3-day4-5-recommendation-engine.md
git add .claude-code-prompts/week3-day4-5-recommendation-engine.md

# Commit
git commit -m "Week 3 Days 4-5: Recommendation engine complete

- Implemented 15 detection rules (7 performance, 8 reliability)
- Priority score calculation with impact/effort formula
- Evidence-backed recommendations with clickable links
- Code examples for applicable rules
- API endpoint: /recommendations
- All tests passing
- Generated 6-8 recommendations for test workflow"

# Tag
git tag -a v0.6-week3-day4-5 -m "Week 3 Days 4-5: Recommendation engine with 15 rules"

# Push
git push origin main --tags
```

---

## After Days 4-5: Next Steps

**Week 3 Days 6-7**: Frontend Analysis Dashboard
- Display critical path overlay on graph
- Highlight bottleneck nodes (color-coded)
- Show error cluster cards
- List recommendations (sorted by priority)
- Evidence drill-down on click

**Week 3 Complete**: 100% (7 of 7 days) 🎉
- Full analysis pipeline working
- Evidence-first recommendations
- Ready for real n8n workflow data

---

## Emergency Contacts (for AI)

If you get stuck, reference these sections in the specs:

**Algorithm confusion**: Check pseudocode in day 4-5 spec (lines 100-800)
**Priority calculation**: Day 4-5 spec (lines 850-900)
**Test data issues**: PROJECT-CONTEXT-WEEK3.md (lines 200-250)
**API format**: Day 4-5 spec (lines 900-1000)

---

## Success Indicators

You'll know Days 4-5 are complete when:

1. ✅ All 15 rules implemented as separate methods
2. ✅ Each recommendation has 2+ evidence items
3. ✅ Priority scores range from 20-100 (realistic spread)
4. ✅ API returns 6-8 recommendations for test workflow
5. ✅ Code examples included for 8-10 rules
6. ✅ Tests pass for all rules
7. ✅ API response time <600ms

---

**READY TO GO!** 🚀

This checklist contains everything needed to seamlessly continue in a new chat session.
