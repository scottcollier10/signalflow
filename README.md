# SignalFlow

**AI-Powered Workflow Intelligence Platform for n8n**

SignalFlow profiles n8n workflows by reconstructing per-run node timing and dependencies from execution logs, then highlights critical path bottlenecks and recurring failure patterns with evidence.

---

## What It Does

- ✅ **Execution Profiling**: Reconstructs execution waterfalls showing what waited on what
- ✅ **Critical Path Analysis**: Identifies true bottlenecks (not just "slowest node")
- ✅ **Error Clustering**: Groups similar failures with AI-powered classification
- ✅ **Evidence-First Recommendations**: Every suggestion backed by execution data
- ✅ **Performance Optimization**: Detects parallelization opportunities, missing timeouts, retry configs

---

## The Problem We're Solving

n8n workflow optimization is currently manual, time-consuming, and error-prone:

- 🔍 Hunting for bottlenecks across 74-node workflows takes hours
- 📊 Failures get lost in logs without pattern detection
- ⚡ No systematic way to identify optimization opportunities
- 📉 Performance degradation goes unnoticed until critical

**SignalFlow makes this automatic and evidence-based.**

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, React Flow
- **Backend**: Python FastAPI (analysis engine)
- **Database**: Supabase (PostgreSQL + pgvector), run locally via Docker
- **ML**: sentence-transformers (all-MiniLM-L6-v2, local) + scikit-learn DBSCAN for error clustering

---

## Project Status

**V1 feature-complete.** Portfolio / technical case-study project — runs locally, import-based, no hosted deployment.

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
# Edit .env.local: set the Supabase URL and anon key

npm run dev
```

Visit `http://localhost:3000`, then use **Import** to load an n8n execution JSON (file upload, paste, or n8n API fetch).

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
├── frontend/               # Next.js application
│   ├── app/               # Next.js App Router pages
│   ├── components/        # React components
│   └── lib/               # API client, utilities
└── backend/                # Python FastAPI
    ├── src/
    │   ├── normalizer/    # Execution normalizer
    │   ├── analysis/      # Critical path, bottlenecks, recommendations, error clustering
    │   └── services/      # Database, external APIs
    ├── test_*.py          # Test scripts
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

**Why it matters**: This is the "ground truth" for all analysis. Get this wrong and everything downstream is garbage.

### 2. Critical Path Analysis

Uses graph algorithms to find the longest path through your workflow execution:

- Identifies nodes that actually delayed completion
- Ignores nodes that ran in parallel
- Shows % contribution to total wall time

**Why it matters**: "Slowest node" is often not the bottleneck. Critical path tells you what actually matters.

### 3. Evidence-First Recommendations

Every recommendation includes:
- **Clickable evidence**: Links to the exact runs that prove the issue
- **Confidence score**: Based on sample size and variance
- **Risk level**: Safe, needs review, or risky
- **Estimated impact**: Projected time savings (when applicable)

**Why it matters**: Trust. Users won't apply suggestions they don't understand or trust.

---

## Documentation

- **[V1 Specification](./docs/v1-spec.md)**: Complete MVP scope and timeline
- **[Data Model](./docs/data-model.sql)**: Original schema sketch (historical — live schema is in [supabase/migrations/](./supabase/migrations/))
- **[Project Context](./.project-context.md)**: Context for Claude sessions

### For Developers

- **Specs**: [docs/specs/](./docs/specs/) - Feature specifications
- **Rules**: [backend/src/analysis/recommendations.py](./backend/src/analysis/recommendations.py) - All 37 recommendation rules live in code

---

## Development Workflow

```bash
# Backend tests (from backend/, with venv active)
python test_normalizer.py
python test_recommendations.py
python test_error_clustering.py

# Frontend lint
cd frontend && npm run lint

# Database
supabase db reset      # Re-apply all migrations from scratch (from repo root)

# Frontend production build
cd frontend && npm run build
```

---

## Roadmap

### ✅ Phase 1: V1 MVP (Weeks 1-8)
- Import-based workflow analysis
- Critical path detection
- Error clustering
- 37 recommendation rules (19 performance / 13 reliability / 5 cost)
- Evidence-first UI

### 🚧 Phase 2: Real-time Monitoring (Weeks 9-16)
- n8n API integration
- Webhook-based execution ingestion
- Live alerts (Slack, email)
- Historical trend analysis

### 📋 Phase 3: Advanced Features (Weeks 17-24)
- Auto-patch generation (safe transforms)
- Cost optimization tracking
- Team collaboration
- Multi-workspace support

### 🔮 Phase 4: Scale & Enterprise (Weeks 25+)
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
**Status**: Active Development

---

## Acknowledgments

Built with guidance from Claude (Anthropic) for strategic design and Claude Code for implementation.

Inspired by the need to optimize a 74-node n8n workflow that was taking 3-5 minutes per execution.

---

**SignalFlow** - Trust through evidence.
