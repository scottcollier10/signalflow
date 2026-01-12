# SignalFlow - Project Context for New Chat Sessions

**Last Updated**: January 11, 2026  
**Current Status**: Week 3 Days 1-3 Complete, Starting Days 4-5  
**Git Tag**: v0.5-week3-day1-3

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
│   │   │   ├── critical_path.py      # Day 1: Critical path algorithm
│   │   │   ├── bottlenecks.py        # Day 2: Bottleneck scoring
│   │   │   ├── embeddings.py         # Day 3: HuggingFace integration
│   │   │   └── error_clustering.py   # Day 3: Error clustering
│   │   ├── main.py                   # FastAPI routes
│   │   └── ...
│   ├── requirements.txt              # Python dependencies
│   ├── test_error_clustering.py      # Day 3 tests
│   ├── create_minimal_test_data.py   # Test data generator
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
│   │   └── week3-day3-error-clustering.md           # 30+ pages
│   ├── WEEK3-DAY1-COMPLETE.md        # Day 1 summary
│   ├── WEEK3-DAY2-COMPLETE.md        # Day 2 summary
│   └── WEEK3-DAY3-COMPLETE.md        # Day 3 summary
│
└── .claude-code-prompts/
    └── week3-day3-error-clustering.md
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

**Infrastructure**:
- Supabase hosted database
- pgvector extension for similarity search

---

## Week 3 Progress Summary

### ✅ Day 1: Critical Path Algorithm (Complete)

**What It Does**: Identifies which nodes block workflow completion

**Key Results**:
- 4-phase algorithm: DAG validation → Longest path → Path reconstruction
- Tested with 74-node workflow, 460 events
- Found 96% of nodes on critical path (highly sequential workflow)
- API: `GET /api/workflows/{id}/executions/{id}/critical-path`
- Response time: <200ms

**Files**:
- Spec: `docs/specs/week3-day1-critical-path.md`
- Code: `backend/src/analysis/critical_path.py` (540 lines)
- Summary: `docs/WEEK3-DAY1-COMPLETE.md`

**Key Insight**: Test workflow is 96% sequential → prime candidate for parallelization recommendations

---

### ✅ Day 2: Bottleneck Detection & Scoring (Complete)

**What It Does**: Scores each node by its impact on workflow performance (0-100)

**Scoring Formula**:
```python
bottleneck_score = (
    duration_factor * 0.40 +      # Percentile rank
    position_factor * 0.30 +      # On critical path?
    frequency_factor * 0.20 +     # Execution count (loops)
    variance_factor * 0.10        # Performance consistency
) * 100
```

**Key Results**:
- Correctly identified top 2 bottlenecks: "Rate Limit Delay" (87/100), "Claude: Generate Variant" (86/100)
- Loop nodes scored higher due to frequency factor (expected behavior)
- Severity levels: low (0-30), medium (31-60), high (61-80), severe (81-100)
- API: `GET /api/workflows/{id}/executions/{id}/bottlenecks`
- Response time: <65ms

**Files**:
- Spec: `docs/specs/week3-day2-bottleneck-detection.md`
- Code: `backend/src/analysis/bottlenecks.py` (540 lines)
- Summary: `docs/WEEK3-DAY2-COMPLETE.md`

---

### ✅ Day 3: Error Clustering & Pattern Detection (Complete)

**What It Does**: Groups similar errors semantically using ML embeddings

**Technology**:
- HuggingFace model: `sentence-transformers/all-MiniLM-L6-v2` (runs locally, no API key)
- pgvector cosine similarity with HNSW indexes
- DBSCAN clustering (automatic cluster count detection)
- Pattern detection: timeout, auth_failure, rate_limit, network, validation

**Key Results**:
- 88-91% similarity accuracy within clusters
- Correctly separated timeout errors from auth errors
- Pattern detection: 100% accuracy on test data
- Auth failures always marked as critical severity
- API: `GET /api/workflows/{id}/executions/{id}/error-analysis`
- Response time: ~1.6s first call (model load), <500ms cached

**Files**:
- Spec: `docs/specs/week3-day3-error-clustering.md`
- Code: `backend/src/analysis/embeddings.py` (250 lines), `error_clustering.py` (400 lines)
- Migration: `supabase/migrations/20260111180000_error_clustering_tables.sql`
- Tests: `backend/test_error_clustering.py`
- Summary: `docs/WEEK3-DAY3-COMPLETE.md`

**Database Schema**:
```sql
CREATE TABLE error_embeddings (
    id UUID PRIMARY KEY,
    execution_id UUID NOT NULL,
    error_message TEXT NOT NULL,
    embedding vector(384) NOT NULL,  -- pgvector
    cluster_id UUID,
    ...
);

CREATE INDEX idx_error_embeddings_vector 
    ON error_embeddings 
    USING hnsw (embedding vector_cosine_ops);
```

---

## Test Workflow Data

**Primary Test Case**:
- Workflow ID: `8ce95407-8381-4756-85aa-c5c2a0251384`
- Execution ID: `15720484-8e33-464b-84b8-0936ecfa7096` (duration varies: 13.47s - 115.12s)
- Alternative: `dd8fcc85-8470-4beb-91fe-7d7f03dd95de` (status: error)

**Characteristics**:
- 72-74 nodes total
- 460 execution events
- 52 nodes executed, 22 skipped (IF branches)
- 9 different node types
- Contains loops ("Loop: Variants in Lane")
- Top bottleneck: "Claude: Generate Variant" (5.5s-58.9s depending on iterations)

---

## API Endpoints (Week 3 Days 1-3)

All endpoints follow pattern: `GET /api/workflows/{workflow_id}/executions/{execution_id}/{analysis}`

1. **Critical Path** (`/critical-path`)
   - Returns: path nodes, total duration, path percentage
   - Performance: <200ms

2. **Bottlenecks** (`/bottlenecks`)
   - Query params: `limit`, `severity`, `min_score`
   - Returns: ranked bottlenecks with scores and factors
   - Performance: <65ms

3. **Error Analysis** (`/error-analysis`)
   - Query params: `include_historical`, `similarity_threshold`, `execution_window`
   - Returns: clustered errors with patterns and recommendations
   - Performance: <500ms (after model load)

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
- `node_stats`: Bottleneck scores and factors
- `error_embeddings`: Error vectors (384-dim)
- `error_clusters`: Clustered error patterns

---

## Environment Setup

**Backend** (`backend/.env`):
```bash
SUPABASE_URL=https://[project].supabase.co
SUPABASE_KEY=eyJ...
```

**Frontend** (`frontend/.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
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

## Key Learnings from Week 3 Days 1-3

### 1. Real Data ≠ Synthetic Examples
- Spec predicted 10-15 nodes on critical path (23%)
- Reality: 50 nodes on critical path (96%)
- Lesson: Test with real data early!

### 2. Loop Handling Requires Temporal Ordering
- n8n loops create apparent cycles in graph
- Solution: Build execution graph from event timestamps
- Handles any n8n construct (loops, retries, branches)

### 3. Percentile-Based Scoring Scales Well
- Works across workflows of any size
- Handles outliers gracefully
- Intuitive interpretation for users

### 4. HuggingFace Models Work Great Locally
- No API key needed
- Fast enough for production (5-10ms per embedding)
- Good semantic understanding out-of-the-box

### 5. Position Factor Matters Most
- Critical path nodes 3.33x more important (1.0 vs 0.3)
- Even slow off-path nodes are lower priority
- Evidence-based prioritization

---

## Next Steps: Week 3 Days 4-5

### Build: Recommendation Engine (15 Detection Rules)

**Goal**: Generate prioritized, evidence-backed optimization recommendations

**Input**: 
- Critical path results (Day 1)
- Bottleneck scores (Day 2)
- Error clusters (Day 3)

**Output**: Ranked recommendations with:
- Trigger rule (which of 15 rules fired)
- Evidence (clickable links to proof)
- Impact score (time saved)
- Effort estimate (Low/Med/High)
- Priority score (0-100)
- Code examples (where applicable)

### The 15 Detection Rules

From V1 spec (need to reference for details):

1. Sequential API calls → Parallelize
2. Long node duration → Optimize algorithm
3. High loop iteration count → Batch processing
4. Duplicate HTTP requests → Add caching
5. Synchronous waits → Use webhooks
6. Large data transfers → Compress/stream
7. Hardcoded delays → Remove/justify
8. Repeated timeouts → Increase timeout
9. Auth failures → Fix credentials
10. Rate limits → Add backoff/queuing
11. Network errors → Add retry logic
12. Validation errors → Add input checks
13. Resource errors → Scale infrastructure
14. High error rate on node → Investigate root cause
15. Error cluster across nodes → Systemic issue

### Implementation Strategy

**Class Structure**:
```python
class RecommendationEngine:
    def generate_recommendations(
        execution_id: str,
        workflow_id: str
    ) -> List[Recommendation]:
        # Load all analyses
        critical_path = load_critical_path()
        bottlenecks = load_bottlenecks()
        error_clusters = load_error_clusters()
        
        # Apply rules
        recommendations = []
        recommendations.extend(apply_performance_rules())
        recommendations.extend(apply_error_rules())
        
        # Prioritize
        recommendations = calculate_priority_scores()
        recommendations = rank_by_priority()
        
        return recommendations
```

**Each Rule Returns**:
```python
@dataclass
class Recommendation:
    id: str
    rule_id: int  # 1-15
    title: str
    description: str
    evidence: List[Evidence]  # Links to nodes, events, clusters
    impact: str  # "HIGH", "MEDIUM", "LOW"
    impact_details: str  # e.g., "Save 80% execution time"
    effort: str  # "LOW", "MEDIUM", "HIGH"
    priority_score: float  # 0-100
    category: str  # "performance", "reliability", "cost"
    code_example: Optional[str]
```

---

## Development Workflow

### Using Claude.ai (Strategic Planning)
- Writing specifications
- Architecture decisions
- Design discussions
- Token-heavy context

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

## Git Workflow

**Branching**: Working on `main` branch (small team)

**Commit Pattern**:
```bash
git commit -m "Week 3 Day X: [Feature] complete

- Bullet point of major accomplishment
- Another accomplishment
- Test results"
```

**Tagging**: After each day/milestone
```bash
git tag -a v0.X-week3-dayX -m "Week 3 Day X: [Feature]"
git push origin main --tags
```

**Current Tags**:
- v0.4-week3-day2: Bottleneck detection
- v0.5-week3-day1-3: Days 1-3 complete

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
npm run dev
```

**Run Tests**:
```bash
cd ~/dev/signalflow/backend
python3 test_error_clustering.py
```

**Test API**:
```bash
curl http://localhost:8000/api/workflows/{workflow_id}/executions/{execution_id}/critical-path
```

---

## When Starting New Chat

**Share this document** + say:

> "SignalFlow - Week 3 Days 4-5: Recommendation Engine
> 
> Read docs/PROJECT-CONTEXT-WEEK3.md for full context.
> 
> Status: Days 1-3 complete (critical path, bottlenecks, error clustering)
> Next: Implement 15 detection rules for recommendation engine
> 
> Key files to reference:
> - docs/specs/week3-day1-critical-path.md
> - docs/specs/week3-day2-bottleneck-detection.md  
> - docs/specs/week3-day3-error-clustering.md
> - docs/WEEK3-DAY[1-3]-COMPLETE.md
> 
> Test workflow: 8ce95407-8381-4756-85aa-c5c2a0251384
> Test execution: 15720484-8e33-464b-84b8-0936ecfa7096"

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

---

**END OF PROJECT CONTEXT**

This document should enable seamless continuation in new chat sessions with full context preservation.
