# Contributing to SignalFlow

## Prerequisites

- Python 3.11+
- Node.js 18+
- Docker Desktop (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

## Setup

```bash
git clone https://github.com/scottcollier10/signalflow.git
cd signalflow

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

## What You Can Work On Without Credentials

Most of the codebase is testable locally without any API keys or a running database:

- Recommendation engine rules and scoring logic
- Execution normalizer and parser
- Critical path and bottleneck algorithms
- API error handling and input validation
- Frontend components and styling
- Documentation

The credential-free test suite (14 files, 60 tests) runs in CI on every push.

## What Requires Local Supabase

These tests need a local Supabase instance (`supabase start` from the repo root):

- `test_pgvector_search.py` - pgvector similarity search wiring
- `test_cluster_persistence.py` - cluster storage failure surfacing
- `test_unmapped_nodes.py` - unmapped execution node flagging

These tests refuse to run against non-local URLs by design. See the README for database setup.

## What Requires the Embedding Model

- `test_error_clustering.py` - downloads `all-MiniLM-L6-v2` (~80MB) on first run

## Running Tests

```bash
# From backend/, with venv active
# Credential-free suite (same as CI)
python -m pytest \
  test_normalizer.py test_parser_continue_on_fail.py \
  test_recommendations.py test_recommendation_data_loading.py \
  test_rule_field_alignment.py test_bottleneck_node_metadata.py \
  test_api_errors.py test_comparison_logic.py \
  test_cluster_replacement.py test_dashboard_load_perf.py \
  test_embedding_dedup.py test_error_embedder_lazy.py \
  test_http1_supabase_client.py test_parallel_similarity.py \
  -v --tb=short

# Frontend
cd frontend
npx tsc --noEmit      # TypeScript check
npm run build          # Production build
```

## Pull Request Guidelines

- All credential-free tests must pass
- Frontend must build and typecheck cleanly
- No credentials or secrets in committed code
- Follow existing code patterns
- Update docs if behavior changes
- Include tests for new functionality

## Code Style

- Backend: Python, no speculative abstractions, mock-based tests that encode the real DB schema
- Frontend: TypeScript, Tailwind CSS, Next.js App Router conventions
- Prefer simplicity over abstraction

## Known Issues Open for Contribution

Check the [issue tracker](https://github.com/scottcollier10/signalflow/issues) for issues labeled `good first issue` or `help wanted`.
