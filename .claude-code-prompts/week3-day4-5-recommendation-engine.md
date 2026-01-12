Implement Week 3 Days 4-5: Recommendation Engine (15 Detection Rules)

Read the complete specification in docs/specs/week3-day4-5-recommendation-engine.md and implement the recommendation engine that generates evidence-backed optimization suggestions.

DELIVERABLES:
1. backend/src/analysis/recommendations.py - RecommendationEngine class with all 15 rules
2. API endpoint: GET /api/workflows/{workflow_id}/executions/{execution_id}/recommendations
3. Unit tests for each detection rule
4. Integration test with real workflow data
5. Priority score calculation working correctly

THE 15 DETECTION RULES:

Performance Rules (1-7):
1. Sequential API Calls → Parallelize
2. Long Node Duration → Optimize Algorithm  
3. High Loop Iteration → Batch Processing
4. Duplicate HTTP Requests → Add Caching
5. Synchronous Waits → Use Webhooks
6. Large Data Transfers → Compress/Stream
7. Hardcoded Delays → Remove/Justify

Reliability Rules (8-15):
8. Repeated Timeouts → Increase Timeout
9. Auth Failures → Fix Credentials
10. Rate Limits → Add Backoff/Queuing
11. Network Errors → Add Retry Logic
12. Validation Errors → Add Input Checks
13. Resource Errors → Scale Infrastructure
14. High Error Rate on Node → Investigate Root Cause
15. Error Cluster Across Nodes → Systemic Issue

IMPLEMENTATION STRATEGY:

1. Create Recommendation dataclass with Evidence
2. Implement RecommendationEngine main class
3. Add each rule as separate method (_apply_rule_1, _apply_rule_2, etc.)
4. Implement priority score calculation
5. Add API endpoint to main.py
6. Write tests for each rule
7. Test with real workflow data

TEST DATA:
- Workflow: 8ce95407-8381-4756-85aa-c5c2a0251384
- Execution: 15720484-8e33-464b-84b8-0936ecfa7096
- Expected: 6-8 recommendations including Rule #1 (parallelize) and Rule #7 (delays)

DEPENDS ON (already complete):
- Critical path results (Day 1)
- Bottleneck scores (Day 2)
- Error clusters (Day 3)

PERFORMANCE TARGETS:
- API response: <600ms
- Load analyses in parallel: <200ms
- Apply all 15 rules: <300ms

CRITICAL REQUIREMENTS:
- Every recommendation must have clickable evidence with links
- Priority score formula: (impact_score / effort_multiplier) * 100
- Code examples for applicable rules (8-10 rules should have examples)
- Sort recommendations by priority score (descending)

EVIDENCE FORMAT:
Each recommendation must include:
- type: evidence category (e.g., "critical_path", "error_cluster")
- description: human-readable explanation
- data: relevant data for debugging
- link: clickable URL to proof (e.g., "/execution/{id}/bottlenecks?node={id}")

Follow the spec precisely - it contains complete pseudocode for all 15 rules, priority calculation, and expected test results.
