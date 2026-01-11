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
- **Backend**: Python FastAPI (ML/AI processing)
- **Database**: Supabase (PostgreSQL + Auth + Storage + pgvector)
- **Queue**: BullMQ + Redis (background jobs)
- **ML/AI**: Hugging Face Inference API
- **Deployment**: Vercel (frontend), Railway/Fly.io (backend)

---

## Project Status

🚧 **Phase 1 - V1 MVP Development**

Current Sprint: Week 1 - Foundation
- [ ] Project setup
- [ ] Database schema
- [ ] Execution normalizer (core truth engine)
- [ ] Basic dashboard

See [docs/v1-spec.md](./docs/v1-spec.md) for complete V1 specification.

---

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL 14+ (or Supabase account)
- Redis (for background jobs)

### Setup

```bash
# Clone and navigate
cd signalflow

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev          # Frontend (Next.js)
npm run dev:backend  # Backend (FastAPI)
```

Visit `http://localhost:3000`

---

## Project Structure

```
signalflow/
├── .project-context.md     # Project context for Claude.ai
├── README.md               # This file
├── docs/                   # Documentation
│   ├── v1-spec.md         # Complete V1 specification
│   ├── data-model.sql     # Database schema
│   ├── architecture.md    # Technical architecture
│   ├── specs/             # Feature specifications
│   └── rules/             # Recommendation rules
├── .claude-code-prompts/  # Implementation prompts for Claude Code
├── frontend/              # Next.js application
│   ├── src/
│   │   ├── app/          # Next.js App Router
│   │   ├── components/   # React components
│   │   └── lib/          # Utilities
│   └── supabase/         # Supabase config
├── backend/               # Python FastAPI
│   ├── src/
│   │   ├── normalizer/   # Execution normalizer
│   │   ├── analysis/     # Critical path, bottlenecks
│   │   ├── scoring/      # Scoring algorithms
│   │   └── rules/        # Recommendation rules
│   └── requirements.txt
└── demo/                  # Demo workflows
    ├── workflows/        # Sample workflow JSONs
    └── executions/       # Sample execution data
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
- **[Data Model](./docs/data-model.sql)**: Full database schema
- **[Architecture](./docs/architecture.md)**: Technical design decisions
- **[Project Context](./.project-context.md)**: Context for Claude.ai

### For Developers

- **Specs**: [docs/specs/](./docs/specs/) - Feature specifications
- **Rules**: [docs/rules/](./docs/rules/) - Recommendation rule definitions
- **Prompts**: [.claude-code-prompts/](./.claude-code-prompts/) - Implementation prompts

---

## Workflow

### For Strategy & Design (Claude.ai)

1. Review `.project-context.md` for project understanding
2. Read `docs/v1-spec.md` for current scope
3. Create feature specs in `docs/specs/`
4. Generate implementation prompts in `.claude-code-prompts/`

### For Implementation (Claude Code)

1. Read `.project-context.md`
2. Follow prompts in `.claude-code-prompts/[feature].md`
3. Reference specs in `docs/specs/[feature].md`
4. Test with demo data in `demo/`

---

## Development Workflow

```bash
# Start all services
npm run dev:all

# Run tests
npm test
cd backend && pytest

# Lint
npm run lint
cd backend && flake8

# Database
npm run db:migrate     # Run migrations
npm run db:reset       # Reset to fresh state
npm run db:seed        # Load demo data

# Build
npm run build
cd backend && python -m build
```

---

## Deployment

### Frontend (Vercel)

```bash
vercel --prod
```

### Backend (Railway/Fly.io)

```bash
# Railway
railway up

# Fly.io
flyctl deploy
```

### Database (Supabase)

Migrations run automatically via Supabase CLI.

---

## Demo

**3 Demo Workflows Available**:

1. **Sequential HTTP Hell** - Customer data enrichment (5 sequential APIs)
2. **Credential Expiry Chaos** - Daily Slack reporter (auth failures)
3. **Rate Limit Cascade** - Bulk user sync (100+ users)

Load demo data:

```bash
npm run db:seed
```

Then navigate to `/workflows` and select a demo workflow.

---

## Roadmap

### ✅ Phase 1: V1 MVP (Weeks 1-8)
- Import-based workflow analysis
- Critical path detection
- Error clustering
- 15 recommendation rules
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
