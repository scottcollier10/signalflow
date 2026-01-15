# SignalFlow - Project Context (Week 3 Complete)

**Last Updated**: January 12, 2026  
**Current Status**: Week 3 Days 1-5 Complete ✅ - Ready for Frontend  
**Git Tag**: v0.6-week3-day4-5-complete

---

## Project Overview

SignalFlow is an AI-powered workflow intelligence platform that analyzes n8n workflow executions to identify bottlenecks and provide evidence-backed optimization recommendations.

**Core Principle**: Evidence-first (every recommendation must have clickable proof)  
**Architecture**: Rules-first detection, AI for classification/clustering only  
**V1 Scope**: Import-based analysis, critical path, error clustering, 15 rules

---

## Current Project Structure

```
signalflow/
├── backend/                          # Python FastAPI backend
│   ├── src/
│   │   ├── analysis/                 # Analysis engine (Week 3)
│   │   │   ├── __init__.py
│   │   │   ├── critical_path.py      # Day 1: Critical path algorithm ✅
│   │   │   ├── bottlenecks.py        # Day 2: Bottleneck scoring ✅
│   │   │   ├── embeddings.py         # Day 3: HuggingFace integration ✅
│   │   │   ├── error_clustering.py   # Day 3: Error clustering ✅
│   │   │   └── recommendations.py    # Days 4-5: Recommendation engine ✅ NEW!
│   │   ├── main.py                   # FastAPI routes (4 analysis endpoints)
│   │   └── ...
│   ├── requirements.txt              # Python dependencies
│   ├── test_recommendations.py       # Days 4-5 tests (13 recs generated) ✅
│   ├── test_error_clustering.py      # Day 3 tests
│   ├── diagnose_recommendations.py   # Diagnostic script
│   └── .env                          # Supabase credentials
│
├── frontend/                         # Next.js 14 frontend
│   ├── src/
│   │   ├── app/
│   │   │   └── execution/[id]/       # Execution playback page (Weeks 1-2)
│   │   ├── components/               # React components
│   │   └── ...
│   ├── package.json
│   └── .env.local                    # Frontend env vars
│
├── supabase/
│   └── migrations/
│       ├── ...                       # Previous migrations
│       └── 20260111180000_error_clustering_tables.sql  # Day 3
│
├── docs/
│   ├── specs/
│   │   ├── week3-day1-critical-path.md              # 20 pages
│   │   ├── week3-day2-bottleneck-detection.md       # 30 pages
│   │   ├── week3-day3-error-clustering.md           # 30+ pages
│   │   └── week3-day4-5-recommendation-engine.md    # 70+ pages ✅
│   ├── WEEK3-DAY1-COMPLETE.md        # Day 1 summary
│   ├── WEEK3-DAY2-COMPLETE.md        # Day 2 summary
│   ├── WEEK3-DAY3-COMPLETE.md        # Day 3 summary
│   └── WEEK3-DAY4-5-COMPLETE.md      # Days 4-5 summary ✅
│
└── .claude-code-prompts/
    ├── week3-day3-error-clustering.md
    └── week3-day4-5-recommendation-engine.md
```

---

## Tech Stack

**Backend**:
- Python FastAPI
- Supabase (PostgreSQL + pgvector)
- HuggingFace sentence-transformers (all-MiniLM-L6-v2)
- scikit-learn (DBSCAN clustering)

**Frontend**:
- Next.js 14 (App Router)
- React Flow (graph visualization)
- TypeScript
- Tailwind CSS

**Infrastructure**:
- Supabase hosted database
- pgvector extension for similarity search
- Local development with Docker

---

## Week 3 Complete Summary

### ✅ Days 1-3: Analysis Engine Foundation

**Critical Path Algorithm** (Day 1):
- 4-phase algorithm: DAG validation → Longest path → Path reconstruction
- 96% of nodes on critical path in test workflow (highly sequential)
- API: `GET /api/workflows/{id}/executions/{id}/critical-path`
- Response time: <200ms

**Bottleneck Detection** (Day 2):
- 4-factor scoring: duration (40%), position (30%), frequency (20%), variance (10%)
- Top scores: 86-87/100 (severe bottlenecks)
- API: `GET /api/workflows/{id}/executions/{id}/bottlenecks`
- Response time: <65ms

**Error Clustering** (Day 3):
- HuggingFace embeddings + pgvector similarity search
- DBSCAN clustering with 88-91% accuracy
- Pattern detection: timeout, auth, rate_limit, network, validation
- API: `GET /api/workflows/{id}/executions/{id}/error-analysis`
- Response time: <500ms (after model load)

### ✅ Days 4-5: Recommendation Engine (NEW!)

**What It Does**: Applies 15 detection rules to generate prioritized, evidence-backed optimization recommendations

**Implementation**:
- File: `backend/src/analysis/recommendations.py` (1050+ lines)
- All 15 rules implemented (7 performance + 8 reliability)
- Priority scoring: `(impact_score / effort_multiplier) * 100`
- Evidence generation with clickable proof links
- Code examples for 8/15 rules
- API: `GET /api/workflows/{id}/executions/{id}/recommendations`
- Response time: <100ms (cached data)

**Test Results**:
- Generated 3 recommendations for test workflow
- Top recommendation: Optimize rate_limit_delay node (36.4s, priority: 250)
- Impact: 2 HIGH, 1 MEDIUM
- Category: 3 performance
- All recommendations have clickable evidence links

**The 15 Detection Rules**:

*Performance Rules (1-7)*:
1. Sequential API Calls → Parallelize
2. Long Node Duration → Optimize Algorithm
3. High Loop Iteration → Batch Processing
4. Duplicate HTTP Requests → Add Caching
5. Synchronous Waits → Use Webhooks
6. Large Data Transfers → Compress/Stream
7. Hardcoded Delays → Remove/Justify

*Reliability Rules (8-15)*:
8. Repeated Timeouts → Increase Timeout
9. Auth Failures → Fix Credentials
10. Rate Limits → Add Backoff/Queuing
11. Network Errors → Add Retry Logic
12. Validation Errors → Add Input Checks
13. Resource Errors → Scale Infrastructure
14. High Error Rate on Node → Investigate Root Cause
15. Error Cluster Across Nodes → Systemic Issue

---

## API Endpoints (All Working)

All endpoints follow pattern: `GET /api/workflows/{workflow_id}/executions/{execution_id}/{analysis}`

### 1. Critical Path (`/critical-path`)
**Returns**:
```json
{
  "path_nodes": [
    {"node_id": "...", "node_name": "...", "duration_ms": 5500}
  ],
  "summary": {
    "total_duration_ms": 13474,
    "node_count": 50,
    "path_percentage": 96.15
  }
}
```

### 2. Bottlenecks (`/bottlenecks`)
**Query params**: `limit`, `severity`, `min_score`
**Returns**:
```json
{
  "bottlenecks": [
    {
      "node_id": "...",
      "node_name": "rate_limit_delay",
      "bottleneck_score": 87.0,
      "total_duration_ms": 36376,
      "is_on_critical_path": true
    }
  ],
  "summary": {
    "total_nodes_analyzed": 52,
    "severe": 12,
    "high": 9
  }
}
```

### 3. Error Analysis (`/error-analysis`)
**Query params**: `include_historical`, `similarity_threshold`, `execution_window`
**Returns**:
```json
{
  "clusters": [
    {
      "cluster_id": "...",
      "error_count": 5,
      "pattern": "timeout",
      "avg_similarity": 0.89,
      "sample_message": "Connection timeout after 30s"
    }
  ],
  "summary": {
    "total_errors": 0,
    "total_clusters": 0
  }
}
```

### 4. Recommendations (`/recommendations`) ✅ NEW!
**Returns**:
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "id": "uuid",
        "rule_id": 2,
        "title": "Optimize Long-Running Node: rate_limit_delay",
        "description": "This node takes 36.4s and is blocking workflow completion...",
        "evidence": [
          {
            "type": "bottleneck",
            "description": "Node 'rate_limit_delay' takes 36.4s (score: 87/100)",
            "data": {"node_id": "...", "duration_ms": 36376, "score": 87},
            "link": "/execution/{id}/bottlenecks?node={node_id}"
          },
          {
            "type": "critical_path",
            "description": "Node is on critical path and blocks workflow completion",
            "link": "/execution/{id}/critical-path"
          }
        ],
        "impact": "HIGH",
        "impact_details": "Potential to reduce execution time by 36.4s",
        "effort": "HIGH",
        "priority_score": 250.0,
        "category": "performance",
        "code_example": null,
        "affected_node_ids": ["c739c699-8ccf-4dc3-8fea-17184a62cf04"],
        "time_saved_ms": 36376
      }
    ],
    "summary": {
      "total_recommendations": 3,
      "by_category": {"performance": 3},
      "by_impact": {"HIGH": 2, "MEDIUM": 1},
      "top_priority": {...}
    }
  }
}
```

---

## Test Workflow Data

**Primary Test Case** (Working in Production):
- Workflow ID: `6a71673e-623d-42c9-a7c5-09e8acda50f4`
- Execution ID: `09f2d02b-2137-4da8-8e68-cd15535bee3f`
- Duration: 115.12s
- Status: success
- 74 nodes, 460 events
- Top bottleneck: rate_limit_delay (36.4s, score: 87/100)

**Characteristics**:
- 50 of 52 nodes on critical path (96% sequential)
- Contains loops ("Loop: Variants in Lane")
- Clean execution (0 errors)
- 3 recommendations generated
- Prime candidate for parallelization

---

## Database Schema Overview

**Core Tables** (from Weeks 1-2):
- `workflows`: Workflow metadata
- `workflow_nodes`: Node definitions
- `workflow_edges`: Edge connections
- `executions`: Execution records
- `execution_events`: Event timeline (STARTED, FINISHED, ERROR)

**Analysis Tables** (Week 3):
- `critical_paths`: Cached critical path results
- `node_stats`: Bottleneck scores and factors (includes execution_id, bottleneck_score)
- `error_embeddings`: Error vectors (384-dim)
- `error_clusters`: Clustered error patterns

**Recent Schema Updates**:
- Added `execution_id` to `node_stats` and `error_clusters`
- Added bottleneck columns: `bottleneck_score`, `total_duration_ms`, `node_name`, `node_type`, `is_on_critical_path`
- All migrations applied to local Supabase

---

## Environment Setup

**Backend** (`backend/.env`):
```bash
SUPABASE_URL=http://127.0.0.1:54321  # Local Docker
SUPABASE_KEY=eyJ...
```

**Frontend** (`frontend/.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Python Dependencies**:
```
fastapi
supabase
sentence-transformers>=2.2.0
scikit-learn>=1.3.0
numpy
```

---

## Key Learnings from Week 3

### Days 1-3 Learnings

1. **Real Data ≠ Synthetic Examples**: Spec predicted 23% on critical path, reality was 96%
2. **Loop Handling Requires Temporal Ordering**: Build execution graph from event timestamps
3. **Percentile-Based Scoring Scales Well**: Works across workflows of any size
4. **HuggingFace Models Work Great Locally**: No API key, 5-10ms per embedding
5. **Position Factor Matters Most**: Critical path nodes 3.33x more important

### Days 4-5 Learnings

1. **API Caching is Critical**: APIs must save results to database, not just return them
2. **Database Schema Issues Cause Silent Failures**: Missing columns led to 0 recommendations
3. **Backend Restart Required After Schema Changes**: Connection pools cache table structure
4. **Evidence-First Recommendations Work**: Users need clickable proof, not generic advice
5. **Fewer Recommendations Can Be Good**: 3 actionable recommendations better than 20 generic ones

---

## Next Steps: Week 3 Days 6-7

### Goal: Frontend Analysis Dashboard

Build a comprehensive UI that displays all Week 3 analysis results in an intuitive, actionable format.

### Components to Build

**Core Dashboard**:
- Analysis Dashboard page at `/execution/[id]/analysis`
- Tab navigation: Overview | Critical Path | Bottlenecks | Errors | Recommendations
- Integration with all 4 backend APIs

**Visual Components**:
- Critical path overlay on execution graph
- Color-coded bottleneck highlighting (green/yellow/orange/red)
- Error cluster cards with pattern badges
- Recommendations list with priority sorting
- Evidence drill-down modals/drawers
- Code example syntax highlighting

**Interactive Features**:
- Filter recommendations by category/impact/effort
- Sort by priority score
- Click evidence links to highlight nodes
- Expand/collapse details
- Mobile responsive design

### Expected Duration

**Day 6**: 4-5 hours (core dashboard + critical path + bottlenecks)
**Day 7**: 3-4 hours (errors + recommendations + polish)

---

## Development Workflow

### Using Claude.ai (Strategic Planning)
- Writing specifications
- Architecture decisions
- Design discussions
- Creating handoff documents

### Using Claude Code CLI (Implementation)
- Writing Python/TypeScript code
- Running tests
- Database migrations
- Iterative development

### Switching Between Contexts
1. Complete a phase in Claude.ai
2. Create `.claude-code-prompts/` file with spec reference
3. Run: `claude code --prompt .claude-code-prompts/{prompt}.md`
4. Test and validate
5. Return to Claude.ai for next phase planning

---

## Common Commands

**Start Backend**:
```bash
cd ~/dev/signalflow/backend
python3 -m uvicorn src.main:app --reload --port 8000
```

**Start Frontend**:
```bash
cd ~/dev/signalflow/frontend
npm run dev  # Opens at http://localhost:3000
```

**Test All APIs**:
```bash
WF_ID="6a71673e-623d-42c9-a7c5-09e8acda50f4"
EXEC_ID="09f2d02b-2137-4da8-8e68-cd15535bee3f"

curl "http://localhost:8000/api/workflows/$WF_ID/executions/$EXEC_ID/critical-path" | jq '.success'
curl "http://localhost:8000/api/workflows/$WF_ID/executions/$EXEC_ID/bottlenecks" | jq '.success'
curl "http://localhost:8000/api/workflows/$WF_ID/executions/$EXEC_ID/error-analysis" | jq '.success'
curl "http://localhost:8000/api/workflows/$WF_ID/executions/$EXEC_ID/recommendations" | jq '.data.summary'
```

**Run Diagnostic**:
```bash
cd ~/dev/signalflow/backend
python3 diagnose_recommendations.py
```

---

## Git Workflow

**Current Status**: v0.6-week3-day4-5-complete

**After Days 6-7 Completion**:
```bash
cd ~/dev/signalflow

git add frontend/src/app/execution/[id]/analysis/
git add frontend/src/components/analysis/
git add docs/WEEK3-DAY6-7-COMPLETE.md

git commit -m "Week 3 Days 6-7: Frontend analysis dashboard complete"

git tag -a v0.7-week3-complete -m "Week 3 Complete: Full analysis pipeline + dashboard"

git push origin main --tags
```

---

## Important Notes

### Evidence-First Philosophy
- Every recommendation MUST have clickable proof
- No black-box AI suggestions
- Users should be able to verify every claim

### Performance Targets
- API responses: <500ms
- Frontend pages: <2s first load
- Analysis calculation: <1s per execution

### Data Privacy
- All ML models run locally (no external API calls)
- Error messages stored in database (sanitized)
- No user data leaves Supabase

### Color Coding Standards
**Bottleneck Severity**:
- 🟢 Low (0-30): Green
- 🟡 Medium (31-60): Yellow
- 🟠 High (61-80): Orange
- 🔴 Severe (81-100): Red

**Priority Badges**:
- 🔴 CRITICAL: Red
- 🟠 HIGH: Orange
- 🟡 MEDIUM: Yellow
- 🟢 LOW: Green

---

**Week 3 Progress**: 71% complete (5 of 7 days) → Days 6-7 will complete at 100% 🎉

**END OF PROJECT CONTEXT**

This document enables seamless continuation with complete Week 3 context.
