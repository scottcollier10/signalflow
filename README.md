# SignalFlow

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.128-009688?logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-pgvector-3FCF8E?logo=supabase&logoColor=white)
![n8n](https://img.shields.io/badge/n8n-profiler-EA4B71?logo=n8n&logoColor=white)
![Tests](https://img.shields.io/badge/tests-12_suites-brightgreen)

**An n8n Workflow Profiler — Graph Algorithms, Composite Scoring, and ML Where Each Actually Belongs**

SignalFlow reconstructs the true dependency graph behind an n8n execution — what actually blocked completion, not just what looked slow — clusters recurring failures by meaning instead of exact text, and turns both into evidence-backed optimization recommendations. Built to profile a real 72-node, 115-second production workflow that n8n's own execution log couldn't explain on its own.

---

## What It Does

- **Critical Path Analysis** — Kahn's topological sort + dynamic programming find what actually blocked completion, not just the slowest node. A node that gates the workflow outranks one that merely runs long in parallel.
- **Composite Bottleneck Scoring** — a 4-factor weighted score (duration, criticality, frequency, variance) with calibrated duration caps, so a fast node on the critical path never reads like a genuinely slow one.
- **Semantic Error Clustering** — sentence-transformer embeddings and pgvector's HNSW index for real similarity search, DBSCAN to group errors that mean the same thing but are worded differently — scoped to the workflow being analyzed, not the whole database.
- **Evidence-First Recommendations** — 37 deterministic detection rules, each backed by a clickable link to the exact execution data that triggered it. No rule fires without proof.

---

## Proof: The Optimize Loop

The claim behind any profiler is "act on my findings and things get faster." SignalFlow's is tested end to end: a 28-node content pipeline (webhook fan-out, legacy API chain with polling, a 6-iteration Claude loop) was profiled, its own recommendations were applied, and the same workflow was re-run and re-imported.

| | Baseline | After applying recommendations |
|---|---|---|
| Duration | ~43s | **13.1s** |
| Recommendations | 31 | **9** |
| Critical-impact findings | multiple | 0 |

The 9 that remain are the honest floor — architecture hygiene rules plus a legitimate flag on an LLM call still sitting on the critical path. Determinism is verified too: every demo workflow was executed 3x, and the same rules fire on every run.

Reproducible via [demo/](./demo/) (workflow build scripts + import tooling) and the walkthrough in [docs/demo-optimize-loop.md](./docs/demo-optimize-loop.md).

---

## Why Not Just Ask an LLM?

Every piece of analysis here uses the tool suited to the problem, not the most impressive one:

- **Critical path** has a correct algorithmic answer — Kahn's + DP, linear time once the dependency graph exists. An LLM here would be slower, costlier, and sometimes wrong.
- **Bottleneck scoring** is arithmetic against real percentiles and path membership. Deterministic — the same input always produces the same output.
- **Error clustering** is where AI actually earns its place: two messages meaning the same thing but worded differently need semantic similarity, not substring matching. That's a genuine ML problem, and it's the one place in the system that uses ML for the core analysis.
- **Recommendations** are 37 rules that fire the same way every time and point to the exact data that justifies them — not a prompt guessing what might be wrong.

---

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui, React Flow
- **Backend**: Python FastAPI
- **Database**: Supabase (PostgreSQL + pgvector), run locally via Docker
- **ML**: sentence-transformers (`all-MiniLM-L6-v2`, runs locally) + scikit-learn DBSCAN, retrieval via pgvector's HNSW index

---

## Project Status

**V1 feature-complete, audited, and hardened.** Every core analysis path — critical path, bottleneck scoring, error clustering, recommendations — has a passing test suite backed by real fixtures and a real local database, not just isolated unit tests. Runs locally, import-based, no hosted deployment.

See [docs/v1-spec.md](./docs/v1-spec.md) for the V1 specification.

---

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- Docker Desktop (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### 1. Database (local Supabase via Docker)

```bash
# From the repo root
supabase start   # starts Postgres + pgvector and applies supabase/migrations/
```

Note the API URL and keys that `supabase start` prints — you need them for the env files below.

### 2. Backend (FastAPI)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env: set SUPABASE_URL and SUPABASE_KEY (service_role key) from `supabase start` output

uvicorn src.main:app --reload --port 8001
```

The backend must run on port **8001** — the frontend expects it there.

First run downloads the all-MiniLM-L6-v2 embedding model (~80MB) from Hugging Face; after that everything works offline.

### 3. Frontend (Next.js)

```bash
cd frontend
npm install

cp .env.local.example .env.local
# Edit .env.local: set the Supabase URL and anon key, and NEXT_PUBLIC_API_BASE_URL if not using localhost:8001

npm run dev
```

Visit `http://localhost:3000`, then use **Import** to load an n8n execution JSON (file upload, paste, or n8n API fetch).

---

## Testing & Verification

This has been through an actual audit pass, not just a feature checklist. Along the way it caught a live scoring bug (`priority_score` values rendering as "250.0/100" in the UI before the fix — an inverted effort multiplier), confirmed via `EXPLAIN` that error clustering genuinely queries pgvector's HNSW index rather than loading every embedding into memory, and closed out two tests that were silently passing without actually asserting anything.

```bash
# From backend/, with venv active and local Supabase running
python test_normalizer.py
python test_parser_continue_on_fail.py
python test_recommendations.py
python test_recommendation_data_loading.py
python test_rule_field_alignment.py
python test_bottleneck_node_metadata.py
python test_error_clustering.py
python test_pgvector_search.py
python test_cluster_persistence.py
python test_unmapped_nodes.py
python test_api_errors.py
python test_comparison_logic.py
```

All twelve exit with a real pass/fail code — none of them print a failure and exit 0. The mock-based suites encode the real database schema (column names, stripped node types, cluster shapes), a deliberate guard after a round of bugs where tests passed against mocks that didn't match production. The pgvector suites refuse to run against a non-local database by design.

---

## Project Structure

```
signalflow/
├── README.md               # This file
├── .project-context.md     # Project context for Claude sessions
├── docs/                   # Documentation
│   ├── v1-spec.md         # V1 specification
│   ├── data-model.sql     # Original schema sketch (historical; live schema is in supabase/migrations/)
│   └── specs/             # Feature specifications
├── supabase/               # Supabase config + live migrations
├── demo/                   # Demo workflow build scripts + optimize-loop tooling
├── frontend/               # Next.js application
│   ├── app/               # Next.js App Router pages
│   ├── components/        # React components
│   └── lib/               # API client, utilities
└── backend/                # Python FastAPI
    ├── src/
    │   ├── normalizer/    # Execution normalizer
    │   ├── analysis/      # Critical path, bottlenecks, recommendations, error clustering
    │   └── services/      # Database, external APIs
    ├── test_*.py          # Test suite (12 files, see Testing & Verification)
    └── requirements.txt
```

---

## Core Concepts

### 1. Execution Normalizer

Transforms n8n's variable execution format into a consistent event stream:

```typescript
ExecutionEvent {
  nodeId: string
  eventType: 'started' | 'finished' | 'retry' | 'error'
  timestamp: Date
  durationMs: number
  status: 'success' | 'error'
  errorMessage?: string
  metadata: { fromNodes, branchIndex }
}
```

**Why it matters**: This is the ground truth for all analysis. Get this wrong and everything downstream is garbage.

### 2. Critical Path Analysis

Builds a temporal dependency graph from finish-order (a deliberate choice — it guarantees a DAG even with n8n's loops and retries), then finds the longest path through it:

- Identifies nodes that actually delayed completion
- Distinguishes them from nodes that merely ran long in parallel
- Shows % contribution to total wall time

**Why it matters**: "Slowest node" is often not the bottleneck. Critical path tells you what actually blocked completion — with the honest caveat that genuinely parallel branches can occasionally get chained together, since edges are inferred from timing, not from the workflow's actual structure.

### 3. Evidence-First Recommendations

Every recommendation includes:
- **Clickable evidence**: Links to the exact runs that prove the issue
- **Confidence score**: Based on sample size and variance
- **Risk level**: Safe, needs review, or risky
- **Estimated impact**: Projected time savings (when applicable)

**Why it matters**: Trust. Nobody applies an optimization suggestion they can't verify.

---

## Documentation

- **[V1 Specification](./docs/v1-spec.md)**: Complete MVP scope and timeline
- **[Demo Guide](./docs/demo-optimize-loop.md)**: The optimize loop — baseline, apply recommendations, compare
- **[Data Model](./docs/data-model.sql)**: Original schema sketch (historical — live schema is in [supabase/migrations/](./supabase/migrations/))
- **[Project Context](./.project-context.md)**: Context for Claude sessions

### For Developers

- **Specs**: [docs/specs/](./docs/specs/) - Feature specifications
- **Rules**: [backend/src/analysis/recommendations.py](./backend/src/analysis/recommendations.py) - All 37 recommendation rules live in code

---

## Development Workflow

```bash
# Frontend lint / typecheck
cd frontend && npm run lint
npx tsc --noEmit

# Database
supabase db reset      # Re-apply all migrations from scratch (from repo root)

# Frontend production build
cd frontend && npm run build
```

See **Testing & Verification** above for the backend test suite.

---

## Roadmap

### ✅ Phase 1: V1 MVP (Weeks 1-8)
- Import-based workflow analysis
- Critical path detection
- Error clustering
- 37 recommendation rules (19 performance / 13 reliability / 5 cost)
- Evidence-first UI

### 🚧 Phase 2: Real-time Monitoring
- n8n API integration (✅ execution fetch/import shipped — see [demo/](./demo/))
- Webhook-based execution ingestion
- Live alerts (Slack, email)
- Historical trend analysis

### 📋 Phase 3: Advanced Features
- Auto-patch generation (safe transforms)
- Cost optimization tracking
- Team collaboration
- Multi-workspace support

### 🔮 Phase 4: Scale & Enterprise
- Multi-platform (Make, Zapier)
- Self-hosted deployment
- SSO, RBAC, audit logs
- Custom rule builder

---

## Contributing

SignalFlow is currently in private development. Contributions will be opened after V1 launch.

---

## License

TBD (Likely MIT or commercial)

---

## Contact

**Creator**: Scott Collier
**Project Start**: January 2026
**Status**: V1 complete, audited, portfolio-ready

---

## Acknowledgments

Built with guidance from Claude (Anthropic) for strategic design and Claude Code for implementation, including an end-to-end audit pass covering logic correctness, test integrity, and documentation accuracy.

Inspired by the need to optimize a 72-node n8n workflow that was taking nearly two minutes per execution.

---

**SignalFlow** - Trust through evidence.
