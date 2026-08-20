# SignalFlow V1 - Complete Specification

> **Historical document.** This spec guided V1 development (January - July 2026). V1 is now complete and audited. The authoritative description of what SignalFlow does is the [README](../README.md). This file is preserved for project-history context, not as a current reference.

**Version**: 1.0  
**Status**: Complete  
**Timeline**: 8 weeks (completed)  
**Type**: MVP - Profiler + Failure Pattern Finder

---

## Executive Summary

SignalFlow V1 is an n8n workflow profiler that:
1. Reconstructs execution waterfalls showing what waited on what
2. Identifies true bottlenecks via critical path analysis
3. Clusters similar failures with AI-powered classification
4. Provides evidence-backed recommendations

**What makes it credible**: Every conclusion is clickable and backed by execution data.

---

## What We're Building (V1 Scope)

### In Scope ✅

**Core Features**:
- Workflow JSON import (upload)
- Execution JSON import (upload or paste)
- Interactive workflow graph visualization (React Flow)
- Execution waterfall view (per-run timing analysis)
- Critical path detection and highlighting
- Bottleneck scoring (evidence-based)
- Error pattern clustering
- Recommendation engine (37 rules, rules-first)
- Weekly digest generator

**Tech Foundation**:
- Next.js 14 frontend
- Supabase (PostgreSQL + Auth)
- Python FastAPI for analysis
- React Flow for graphs
- HuggingFace for text classification/summarization

### Out of Scope ❌ (Post-V1)

- n8n API direct integration (V1 is import-based)
- Auto-applying patches
- "Predict failure in 3 days" (except specific patterns like credential expiry)
- Community learning / cross-workspace patterns
- Multi-platform support (Make, Zapier)
- Graph neural networks
- Real-time monitoring with webhooks

---

## Core Technical Challenges

### Challenge #1: Execution Normalization (The Ground Truth)

**The Problem**: n8n execution data varies by version, hosting, node types. We must normalize to a consistent internal format or everything downstream becomes garbage.

**The Solution**: Build an "Execution Normalizer" that transforms n8n's execution JSON into a canonical event stream:

```typescript
NormalizedExecution {
  executionId
  workflowId
  startedAt, finishedAt
  status
  events: ExecutionEvent[] // THE CORE
}

ExecutionEvent {
  nodeId
  eventType: started | finished | retry | error | skipped
  timestamp
  durationMs
  status
  errorMessage (normalized)
  retryAttempt
  itemsProcessed
  sequenceOrder
  metadata: {
    fromNodes // causal dependencies
    branchIndex
  }
}
```

**Success Criteria**:
- Parse 5+ n8n versions correctly
- Handle IF, Merge, SplitInBatches, Code, HTTP nodes
- Detect retries and partial failures
- Preserve causal ordering

**Implementation**: See `backend/src/normalizer/` and `docs/specs/execution-normalizer.md`

---

### Challenge #2: Critical Path Detection

**The Problem**: "Slowest node" is lazy. We need to identify what actually contributed to wall time.

**The Solution**: Build a DAG from execution events, compute longest path through the graph accounting for:
- Actual execution dependencies (not just workflow structure)
- Concurrent execution
- Wait times vs execution times

**Algorithm**: Topological sort + dynamic programming for longest path.

**Success Criteria**:
- Highlight actual bottlenecks (nodes that delayed completion)
- Ignore nodes that ran in parallel
- Show % wall-time contribution per node

**Implementation**: See `backend/src/analysis/critical_path.py` and `docs/specs/critical-path-algorithm.md`

---

### Challenge #3: Bottleneck Scoring That Doesn't Lie

**The Problem**: Users must trust our bottleneck rankings or they won't use the tool.

**The Solution**: Composite scoring with evidence:

```
Score (0-100) =
  Critical Path Contribution (0-40 points)
  + Duration Variance (0-30 points)
  + Execution Frequency (0-20 points)
  + Error Rate (0-10 points)
```

Plus confidence score based on sample size.

**Success Criteria**:
- Click any bottleneck → see the runs that prove it
- Show p50/p95/p99 distributions
- Include variance warnings ("This node is inconsistent")

**Implementation**: See `backend/src/scoring/bottlenecks.py` and `docs/specs/bottleneck-scoring.md`

---

## Data Model

See full SQL schema in `docs/data-model.sql` (included below)

**Core Tables**:
- `workflows` - Workflow definitions
- `nodes` - Extracted nodes with configs
- `edges` - Workflow structure
- `executions` - Execution runs
- `execution_events` - **THE GROUND TRUTH** (normalized events)
- `critical_paths` - Cached per-execution analysis
- `node_stats` - Aggregated statistics
- `error_signatures` - Clustered error patterns (with embeddings)
- `recommendations` - Generated suggestions with evidence

**Key Indexes**:
- `execution_events` by execution_id, node_id, timestamp, event_type
- `error_signatures` with pgvector index for similarity search

---

## Architecture

```
┌─────────────────────────────────────┐
│         Next.js Frontend            │
│  (Upload, Graph, Waterfall, Recs)   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      Supabase (PostgreSQL)           │
│  - Workflows, Executions, Stats     │
│  - pgvector for error clustering    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    Python FastAPI Backend           │
│  - Execution Normalizer             │
│  - Critical Path Algorithm          │
│  - Bottleneck Scoring               │
│  - Recommendation Engine            │
│  - HF Integration (classify/cluster)│
└─────────────────────────────────────┘
```

**Data Flow**:
1. User uploads workflow JSON + execution JSON
2. Frontend stores in Supabase
3. Background job triggers Python analysis
4. Python normalizes → analyzes → stores results
5. Frontend queries results and renders

**Why this architecture**:
- Fast iteration (Next.js API routes for simple stuff)
- Python for graph algorithms and ML
- Supabase for persistence + real-time updates
- Clear separation of concerns

---

## UI Spec (3 Core Screens)

### Screen 1: Dashboard
**URL**: `/workflows/[id]`

**Sections**:
- Health Score (0-100) with breakdown
- Execution stats (count, success rate, avg duration)
- Critical Issues (priority 1 recommendations)
- Top 3 Opportunities (by estimated impact)

**Interactions**:
- Click recommendation → Navigate to Analyzer with nodes highlighted
- Click health score → Expand breakdown modal
- "Analyze Now" → Trigger fresh analysis

### Screen 2: Workflow Analyzer (The Core)
**URL**: `/workflows/[id]/analyzer`

**Layout**: Split view (left: graph, right: details panel)

**Left: Interactive Graph** (React Flow)
- Nodes with heat-map overlay (avg duration)
- Critical path highlighted
- Errors shown as red indicators
- Click node → Load details in right panel

**Right: Details Panel** (4 modes):
1. **Overview**: Critical path, bottlenecks list
2. **Node Details**: Stats, recent executions, recommendations, error patterns
3. **Execution View**: Waterfall for specific run
4. **Recommendation Details**: Evidence, visual diff, actions

**Interactions**:
- Toggle overlay: Heatmap / Critical Path / Errors
- Click execution in node panel → Load waterfall
- Hover node → Quick stats tooltip
- "Apply suggestion" → Show confirmation with preview

### Screen 3: Execution Waterfall
**URL**: `/workflows/[id]/executions/[execId]`

**View**:
- Timeline with bars showing node execution
- Critical path items highlighted
- Swim lanes showing concurrency
- Click bar → Show details panel

**Interactions**:
- Zoom timeline (scroll)
- "Compare with" → Select another execution, show delta
- Export → Download as PNG or CSV

---

## Recommendation Rules (V1 - Top 15)

Full rule set (37 rules) lives in `backend/src/analysis/recommendations.py`. Original top-15 summary:

1. **sequential-http-parallelizable** (P1) - Detect HTTP chains that could run in parallel
2. **missing-timeout** (P1) - HTTP/Webhook nodes without timeout config
3. **missing-retry** (P2) - Nodes with transient errors but no retry
4. **missing-error-handling** (P2) - Nodes with errors but no error branch
5. **duplicate-requests** (P2) - Identical HTTP requests made multiple times
6. **high-variance-node** (P2) - p95/avg ratio >3x
7. **unbounded-split** (P1) - SplitInBatches without max iterations
8. **slow-code-node** (P2) - Code nodes >500ms avg
9. **credential-expiry-risk** (P1) - 401/403 errors in last 7 days
10. **rate-limit-pattern** (P2) - 429 errors detected
11. **unused-node** (P4) - Never executed in last 50 runs
12. **large-json-parsing** (P3) - JSON responses >1MB
13. **webhook-timeout-risk** (P2) - Webhook workflows >25s avg
14. **merge-node-bottleneck** (P3) - Merge causing waits >1s
15. **excessive-transformations** (P3) - 3+ sequential Set/MoveBinary nodes

Each rule includes:
- Detection logic
- Confidence score
- Risk level (safe / review_required / risky)
- Estimated impact (if performance-related)
- Evidence structure

---

## AI Integration (Selective Use)

**Where AI Actually Helps**:
1. **Text Classification**: Normalize error messages → categories (http_401, timeout, json_parse, etc.)
2. **Sentence Similarity**: Cluster "same error, different wording"
3. **Summarization**: Weekly digest, recommendation copy
4. **Text Ranking**: Prioritize fix options

**Where AI Does NOT Help** (V1):
- Detecting bottlenecks (graph math solves this)
- Finding parallelization opportunities (dependency analysis solves this)
- Predicting future failures (too unreliable without constraints)

**HuggingFace Models** (start with Inference API):
- `distilbert-base-uncased` for text classification
- `sentence-transformers/all-MiniLM-L6-v2` for embeddings
- `facebook/bart-large-cnn` for summarization

**Later**: Self-host with Text Generation Inference (TGI) if we need custom fine-tuning.

---

## Demo Data Strategy

**3 Demo Workflows** (synthetic but realistic):

1. **"Sequential HTTP Hell"** - Customer data enrichment with 5 sequential API calls
   - Pattern: Could parallelize 4 requests, save ~1800ms
   - Issues: Rate limit errors, missing retries

2. **"Credential Expiry Chaos"** - Daily Slack report generator
   - Pattern: Auth failures started 7 days ago
   - Issues: Missing error handling, no retry on 503

3. **"Rate Limit Cascade"** - Bulk user sync (100+ users)
   - Pattern: Fan-out without rate limiting
   - Issues: 429 errors cluster in batch 4-7, unbounded split

**Generation Strategy**: Synthetic execution data with realistic:
- Timing distributions (log-normal)
- Error injection at specific nodes
- Success rates matching patterns
- 25-50 executions per workflow

---

## 8-Week Build Plan

### Week 1: Foundation
- ✅ Project setup (Next.js, Supabase, Python)
- ✅ Database schema
- ✅ Workflow JSON ingestion
- ✅ Execution normalizer (basic)
- ✅ Dashboard skeleton

### Week 2: Visualization
- React Flow integration
- Workflow graph renderer
- Node stat overlays (heatmap)
- Basic node details panel

### Week 3: Analysis Core
- Critical path algorithm
- Bottleneck scoring
- Node stats aggregation
- Execution waterfall view

### Week 4: Error Clustering
- Error normalization logic
- HF text classification integration
- Sentence similarity clustering
- Error signature storage

### Week 5: Recommendations (Part 1)
- Implement rules 1-5 (sequential-http, missing-timeout, missing-retry, missing-error-handling, duplicate-requests)
- Evidence linking
- Recommendation UI cards

### Week 6: Recommendations (Part 2)
- Implement rules 6-15
- Visual diff renderer
- Evidence panel with citations
- Confidence + risk indicators

### Week 7: Demo Data + Polish
- Generate 3 demo workflows
- Synthetic execution data
- Public demo mode (no auth)
- UI polish pass

### Week 8: Launch Prep
- Weekly digest generator
- Export functionality (PDF, JSON)
- Landing page
- Demo video
- n8n community forum post

---

## Success Criteria (How We Know V1 Is Done)

**Functional**:
- [ ] Can import workflow JSON + execution JSON
- [ ] Renders workflow graph with stats overlay
- [ ] Shows execution waterfall with critical path
- [ ] Scores bottlenecks with evidence links
- [ ] Clusters error patterns
- [ ] Generates 15 types of recommendations
- [ ] Every recommendation has clickable evidence
- [ ] Weekly digest exports

**Performance**:
- [ ] Graph renders in <200ms
- [ ] Analysis completes in <2s for 50-node workflow
- [ ] Works on tablet (mobile-responsive)

**Quality**:
- [ ] Zero TypeScript errors
- [ ] Critical path matches manual verification
- [ ] Bottleneck scores make sense (spot-checked)
- [ ] Error clustering groups similar errors correctly

**Demo**:
- [ ] 3 preset workflows with realistic data
- [ ] Interactive walkthrough
- [ ] Case study: "How I optimized my 74-node workflow"

---

## What Comes After V1

**Phase 2 (Months 4-6)**:
- n8n API direct integration (webhook mode)
- Real-time monitoring
- Slack/email alerts
- Multi-workspace support

**Phase 3 (Months 7-9)**:
- Auto-patch generation (safe transforms only)
- Historical trend analysis
- Cost optimization tracking
- Team collaboration features

**Phase 4 (Months 10-12)**:
- Multi-platform (Make, Zapier)
- Self-hosted deployment option
- Enterprise features (SSO, RBAC)

---

## Key Decisions & Rationale

### Why Import-First (Not API-First)?
- Faster to build and test
- Works regardless of n8n hosting setup
- Users can manually export and analyze
- Webhook integration adds complexity we don't need for V1

### Why Python Backend?
- Graph algorithms are easier in Python
- ML/AI ecosystem is Python-first
- Can iterate faster on analysis logic
- Next.js handles UI well, Python handles compute

### Why Rules-First (Not Pure AI)?
- Deterministic analysis is more trustworthy
- AI should explain, not discover
- Users need to understand *why* something is a bottleneck
- Rules are testable and debuggable

### Why No Auto-Apply Patches?
- Trust killer if one patch breaks prod
- Requires extensive safety checks
- Better to suggest with diff + user applies manually
- Can add in Phase 2 with sandbox mode

---

## Documentation Structure

```
signalflow/
├── .project-context.md (this context for Claude.ai)
├── docs/
│   ├── v1-spec.md (this file)
│   ├── data-model.sql (full schema)
│   ├── architecture.md (detailed technical architecture)
│   ├── specs/
│   │   ├── execution-normalizer.md
│   │   ├── critical-path-algorithm.md
│   │   ├── bottleneck-scoring.md
│   │   └── recommendation-engine.md
│   └── rules/
│       ├── template.md (rule spec template)
│       ├── rule-001-sequential-http.md
│       ├── rule-002-missing-timeout.md
│       └── ... (15 total)
├── .claude-code-prompts/
│   ├── 001-setup-project.md
│   ├── 002-execution-normalizer.md
│   ├── 003-graph-visualization.md
│   └── ... (task-specific prompts)
└── README.md (quickstart)
```

---

## Next Steps

1. **Read this spec fully**
2. **Review data-model.sql** (see `docs/data-model.sql`)
3. **Start with execution normalizer** (Week 1 priority)
4. **Build demo workflow JSONs** (so we can test early)
5. **Set up project** (Next.js + Supabase + Python)

---

**Questions? Clarifications needed? Ask before building.**
