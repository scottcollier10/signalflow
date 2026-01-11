# SignalFlow - Architecture Decisions Log

**Purpose**: Record key technical decisions and their rationale for future reference.

---

## Decision 001: Import-First, API-Later

**Date**: January 9, 2026  
**Context**: Need to ingest n8n workflow and execution data  
**Decision**: Build V1 with file upload, defer n8n API integration to Phase 2

**Rationale**:
- Faster to build and test
- Works regardless of n8n hosting setup (self-hosted, cloud, version)
- Users can manually export and analyze
- De-risks n8n version/hosting variations
- Webhook integration adds complexity we don't need for V1

**Alternatives Considered**:
- Direct n8n API integration (too complex for V1)
- Webhook-based ingestion (requires n8n configuration)

**Status**: Implemented  
**Impact**: Week 1-2 (Foundation)

---

## Decision 002: Python Backend for Analysis

**Date**: January 9, 2026  
**Context**: Need to process complex graph algorithms and ML tasks  
**Decision**: Use Python FastAPI backend alongside Next.js frontend

**Rationale**:
- Graph algorithms easier in Python (networkx)
- ML/AI ecosystem is Python-first (HuggingFace)
- Can iterate faster on analysis logic
- Next.js handles UI/UX well, Python handles compute
- Clear separation of concerns

**Alternatives Considered**:
- Pure Next.js with serverless functions (limited compute, harder graph algorithms)
- Rust backend (overkill, slower iteration)

**Status**: Implemented  
**Impact**: All phases

---

## Decision 003: Rules-First, AI-Assisted

**Date**: January 9, 2026  
**Context**: How much AI vs deterministic analysis?  
**Decision**: Use deterministic rules for bottleneck detection, AI only for classification/clustering/summarization

**Rationale**:
- Deterministic analysis is more trustworthy
- Users need to understand *why* something is a bottleneck
- Rules are testable and debuggable
- AI should explain, not discover (for V1)
- Trust is the core differentiator

**Where AI Helps**:
- Text classification (normalize error messages)
- Sentence similarity (cluster errors)
- Summarization (weekly digests)
- Text ranking (prioritize fixes)

**Where AI Does NOT Help**:
- Detecting bottlenecks (graph math solves this)
- Finding parallelization opportunities (dependency analysis)
- Predicting failures (too unreliable without constraints)

**Status**: Framework established  
**Impact**: All analysis features

---

## Decision 004: Event-Based Architecture

**Date**: January 9, 2026  
**Context**: How to represent execution data internally?  
**Decision**: Normalize all n8n execution data into canonical event stream

**Rationale**:
- Single source of truth
- Easier to debug (inspect events directly)
- Scales better (one event = one row)
- Enables time-travel debugging
- Simplifies critical path algorithm

**Event Schema**:
```typescript
{
  node_id: string
  event_type: 'started' | 'finished' | 'retry' | 'error' | 'skipped'
  timestamp: Date
  duration_ms: number
  status: 'success' | 'error' | 'timeout'
  sequence_order: number
  metadata: { fromNodes, branchIndex }
}
```

**Status**: Implemented in schema  
**Impact**: Normalizer, all analysis

---

## Decision 005: Synthetic Data for Initial Testing

**Date**: January 10, 2026  
**Context**: Need execution data to test normalizer, but n8n API access is complex  
**Decision**: Generate synthetic execution data matching real workflow structure

**Rationale**:
- Avoids blocking on n8n API auth
- Lets us start building immediately
- Controlled test scenarios (success, error, partial)
- Can add real data later without changing code
- Scott's 72-node workflow structure is what matters

**Test Data Approach**:
- Parse real workflow JSON (nodes, edges)
- Generate realistic execution events
- Match timing patterns from observed executions
- Include success, error, and partial cases

**Status**: In progress  
**Impact**: Week 1 (Normalizer testing)

---

## Decision 006: Evidence-First UX

**Date**: January 9, 2026  
**Context**: How to present recommendations to users?  
**Decision**: Every recommendation must have clickable proof (links to runs, metrics, evidence)

**Rationale**:
- Trust is everything - users won't apply unverified suggestions
- Differentiation from "AI vibes" tools
- Enables user verification
- Builds credibility
- Educational for users

**Evidence Requirements**:
- Link to specific execution runs
- Show exact metrics that triggered rule
- Visual diff for suggested changes
- Confidence score based on sample size
- Risk level indicator

**Status**: Design complete, implementation Week 5-6  
**Impact**: All recommendations

---

## Decision 007: PostgreSQL + pgvector for Storage

**Date**: January 9, 2026  
**Context**: Database choice for workflow analysis data  
**Decision**: Use Supabase (PostgreSQL + pgvector) for all storage

**Rationale**:
- Relational model fits workflow graph naturally
- pgvector enables error similarity search
- Supabase provides auth, realtime, storage in one
- SQL makes complex queries easier
- Good performance characteristics

**Tables Created**:
- Core: workflows, nodes, edges, executions, execution_events
- Computed: critical_paths, node_stats, error_signatures
- Output: recommendations, weekly_digests

**Status**: Implemented  
**Impact**: All data operations

---

## Decision 008: No Auto-Apply Patches (V1)

**Date**: January 9, 2026  
**Context**: Should we automatically apply suggested fixes?  
**Decision**: Show diffs + require manual review. No auto-patching in V1.

**Rationale**:
- Trust killer if one patch breaks prod
- Requires extensive safety checks
- Better to suggest with diff + user applies manually
- Reduces risk dramatically
- Can add in Phase 2 with sandbox mode

**V1 Approach**:
- Show visual diff of suggested change
- Explain what it does and why
- Let user copy/paste or manually apply
- Track which recommendations were applied

**Status**: Deferred to Phase 2+  
**Impact**: Recommendation engine UX

---

## Decision 009: React Flow for Graph Visualization

**Date**: January 9, 2026  
**Context**: Need to visualize workflow graphs interactively  
**Decision**: Use React Flow library for workflow graph rendering

**Rationale**:
- Battle-tested for node-based UIs
- Handles large graphs well
- Interactive (zoom, pan, click)
- Customizable node rendering
- Good TypeScript support

**Features Needed**:
- Custom node styles (heatmap colors)
- Edge highlighting (critical path)
- Click handlers (node details)
- Overlays (stats, errors)

**Status**: Library installed, implementation Week 2  
**Impact**: UI visualization

---

## Decision 010: 72-Node Workflow as Primary Test

**Date**: January 10, 2026  
**Context**: What workflow to use for testing/validation?  
**Decision**: Use Scott's real 72-node Content Ops workflow

**Rationale**:
- Real production workflow (not synthetic)
- Genuinely complex (tests edge cases)
- Scott can verify correctness intuitively
- Immediate dogfooding
- 9 different node types (comprehensive)

**Characteristics**:
- 72 nodes (large scale)
- 9 node types (variety)
- In-progress state (tests partial execution)
- Has error cases (tests failure handling)

**Status**: Workflow JSON available, using for testing  
**Impact**: Normalizer development, all validation

---

## Decision Template

```markdown
## Decision XXX: [Title]

**Date**: YYYY-MM-DD  
**Context**: [What situation led to this decision?]  
**Decision**: [What did we decide?]

**Rationale**:
- [Reason 1]
- [Reason 2]
- [Reason 3]

**Alternatives Considered**:
- [Alternative 1] (why not chosen)
- [Alternative 2] (why not chosen)

**Status**: [Proposed | Implemented | Deprecated]  
**Impact**: [What parts of the system does this affect?]
```

---

**Note**: Add new decisions as they're made. This helps future you (and Claude) understand why things are the way they are.
