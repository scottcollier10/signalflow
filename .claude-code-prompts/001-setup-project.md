# Setup SignalFlow Project Foundation

## Context
- **Project**: SignalFlow (from .project-context.md)
- **Read First**: `.project-context.md`, `docs/v1-spec.md`
- **Phase**: Week 1 - Foundation
- **Related Files**: `docs/data-model.sql`, `README.md`

## Objective
Set up the complete SignalFlow project foundation including Next.js frontend, Python FastAPI backend, Supabase database, and development tooling.

## Tech Stack (from project context)
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Python 3.10+, FastAPI, Pydantic
- **Database**: Supabase (PostgreSQL + pgvector)
- **Queue**: BullMQ + Redis
- **ML/AI**: Hugging Face Inference API
- **Deployment**: Vercel (frontend), Railway (backend)

## Requirements

**Must Have**:
- Next.js 14 project with App Router
- TypeScript strict mode
- Tailwind CSS + shadcn/ui configured
- Python FastAPI backend structure
- Supabase local development setup
- Database migrations from `docs/data-model.sql`
- Environment variable templates
- Development scripts (dev, build, test)

**Edge Cases**:
- Handle case where Supabase CLI not installed
- Provide fallback for local PostgreSQL + pgvector
- Clear error messages if Python version < 3.10

## Implementation Steps

### Step 1: Initialize Next.js Frontend

**Commands**:
```bash
# Create Next.js app with TypeScript
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir --import-alias "@/*"

cd frontend

# Install core dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install lucide-react class-variance-authority clsx tailwind-merge

# Install shadcn/ui
npx shadcn-ui@latest init

# Install React Flow for graph visualization
npm install reactflow

# Install chart libraries
npm install recharts

# Install dev dependencies
npm install -D @types/node
```

**Files to create**:
- `frontend/.env.local.example`
- `frontend/src/lib/supabase/client.ts`
- `frontend/src/lib/supabase/server.ts`
- `frontend/tailwind.config.ts` (ensure proper config)
- `frontend/src/app/layout.tsx` (with proper metadata)

**Frontend structure**:
```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx (dashboard home)
│   │   ├── workflows/
│   │   │   └── [id]/
│   │   │       ├── page.tsx (analyzer view)
│   │   │       └── executions/
│   │   │           └── [execId]/
│   │   │               └── page.tsx (waterfall view)
│   │   └── api/
│   │       └── analyze/
│   │           └── route.ts (trigger backend analysis)
│   ├── components/
│   │   ├── ui/ (shadcn components)
│   │   ├── workflow/
│   │   │   ├── WorkflowGraph.tsx
│   │   │   └── ExecutionWaterfall.tsx
│   │   └── recommendations/
│   │       └── RecommendationCard.tsx
│   └── lib/
│       ├── supabase/
│       ├── types/
│       │   └── database.ts
│       └── utils.ts
├── public/
├── .env.local.example
└── package.json
```

---

### Step 2: Initialize Python Backend

**Commands**:
```bash
# Create backend directory
mkdir -p backend/src
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn pydantic python-dotenv
pip install supabase-py
pip install httpx  # for HuggingFace API calls
pip install numpy pandas  # for data processing
pip install networkx  # for graph algorithms
pip install redis  # for queue
pip install pytest pytest-asyncio  # testing

# Create requirements.txt
pip freeze > requirements.txt
```

**Files to create**:
- `backend/src/main.py` (FastAPI app)
- `backend/src/config.py` (environment config)
- `backend/src/normalizer/` (execution normalizer module)
- `backend/src/analysis/` (critical path, bottlenecks)
- `backend/src/scoring/` (scoring algorithms)
- `backend/src/rules/` (recommendation rules)
- `backend/.env.example`
- `backend/Dockerfile` (for deployment)

**Backend structure**:
```
backend/
├── src/
│   ├── main.py (FastAPI app entry point)
│   ├── config.py (settings from env)
│   ├── normalizer/
│   │   ├── __init__.py
│   │   ├── parser.py (n8n JSON parser)
│   │   └── models.py (Pydantic models)
│   ├── analysis/
│   │   ├── __init__.py
│   │   ├── critical_path.py
│   │   └── bottlenecks.py
│   ├── scoring/
│   │   ├── __init__.py
│   │   └── bottleneck_scorer.py
│   ├── rules/
│   │   ├── __init__.py
│   │   ├── base.py (rule interface)
│   │   └── rule_001_sequential_http.py
│   └── utils/
│       ├── __init__.py
│       ├── supabase_client.py
│       └── huggingface_client.py
├── tests/
│   └── test_normalizer.py
├── .env.example
├── requirements.txt
└── Dockerfile
```

---

### Step 3: Supabase Setup

**Option A: Supabase Cloud** (recommended for development)

1. Create project at supabase.com
2. Get connection details

**Option B: Local Supabase**

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize in project root
cd ..  # back to signalflow root
supabase init

# Start local Supabase
supabase start

# Note: This will give you local URLs and keys
```

**Create migration**:
```bash
# From signalflow root
cp docs/data-model.sql supabase/migrations/20260109000000_initial_schema.sql

# Apply migration
supabase db push
```

**Files to create**:
- `supabase/config.toml` (Supabase config)
- `supabase/seed.sql` (demo data - optional for now)

---

### Step 4: Environment Variables

**frontend/.env.local.example**:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**backend/.env.example**:
```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_role_key

# HuggingFace
HUGGINGFACE_API_KEY=your_hf_key

# Redis
REDIS_URL=redis://localhost:6379

# App
DEBUG=true
PORT=8000
```

---

### Step 5: Development Scripts

**Root package.json**:
```json
{
  "name": "signalflow",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && source venv/bin/activate && uvicorn src.main:app --reload --port 8000",
    "build": "cd frontend && npm run build",
    "db:migrate": "supabase db push",
    "db:reset": "supabase db reset",
    "db:seed": "supabase db seed",
    "test": "cd frontend && npm test && cd ../backend && pytest"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

Install concurrently:
```bash
npm install -D concurrently
```

---

### Step 6: Basic FastAPI App

**backend/src/main.py**:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.config import settings

app = FastAPI(
    title="SignalFlow API",
    description="Workflow intelligence backend",
    version="0.1.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "SignalFlow API", "version": "0.1.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# TODO: Add endpoints for:
# - POST /api/workflows (import workflow)
# - POST /api/executions (import execution)
# - POST /api/analyze (trigger analysis)
# - GET /api/workflows/{id}/stats
# - GET /api/recommendations/{workflow_id}
```

**backend/src/config.py**:
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    huggingface_api_key: str
    redis_url: str = "redis://localhost:6379"
    debug: bool = True
    port: int = 8000
    
    class Config:
        env_file = ".env"

settings = Settings()
```

---

### Step 7: Basic Frontend Pages

**frontend/src/app/page.tsx** (Dashboard):
```typescript
export default function Home() {
  return (
    <main className="container mx-auto py-8">
      <h1 className="text-4xl font-bold mb-4">SignalFlow</h1>
      <p className="text-muted-foreground">
        Workflow intelligence for n8n
      </p>
      
      {/* TODO: Add workflow list */}
      {/* TODO: Add upload workflow button */}
    </main>
  );
}
```

**frontend/src/lib/supabase/client.ts**:
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/types/database';

export const createClient = () => createClientComponentClient<Database>();
```

**frontend/src/lib/supabase/server.ts**:
```typescript
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/lib/types/database';

export const createClient = () => 
  createServerComponentClient<Database>({ cookies });
```

---

## File Structure After Implementation

```
signalflow/
├── .project-context.md
├── README.md
├── package.json (root scripts)
├── docs/
│   ├── v1-spec.md
│   ├── data-model.sql
│   └── specs/
├── .claude-code-prompts/
│   └── 001-setup-project.md (this file)
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── workflows/
│   │   │   └── api/
│   │   ├── components/
│   │   └── lib/
│   ├── public/
│   ├── .env.local.example
│   ├── package.json
│   └── tsconfig.json
├── backend/
│   ├── src/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── normalizer/
│   │   ├── analysis/
│   │   ├── scoring/
│   │   └── rules/
│   ├── tests/
│   ├── .env.example
│   ├── requirements.txt
│   └── Dockerfile
└── supabase/
    ├── config.toml
    └── migrations/
        └── 20260109000000_initial_schema.sql
```

## Testing Checklist

- [ ] **Frontend**: Next.js dev server starts
  ```bash
  cd frontend && npm run dev
  # Should run on http://localhost:3000
  ```

- [ ] **Backend**: FastAPI server starts
  ```bash
  cd backend && source venv/bin/activate && uvicorn src.main:app --reload
  # Should run on http://localhost:8000
  # Visit http://localhost:8000/docs for API docs
  ```

- [ ] **Database**: Migrations applied
  ```bash
  supabase db push
  # Check Supabase dashboard - tables should exist
  ```

- [ ] **Environment**: All .env files created
  - frontend/.env.local (from .env.local.example)
  - backend/.env (from .env.example)

- [ ] **Types**: Generate database types
  ```bash
  npx supabase gen types typescript --local > frontend/src/lib/types/database.ts
  ```

- [ ] **Health Checks**: All services respond
  - Frontend: http://localhost:3000
  - Backend: http://localhost:8000/health
  - Supabase: Check dashboard

## Success Criteria

✅ Project is complete when:
- Frontend runs without errors
- Backend API responds to health check
- Database schema is applied
- All environment templates exist
- Root dev script works: `npm run dev`
- README instructions are accurate
- Can import demo workflow JSON (manually, no processing yet)

## Commands to Run

```bash
# From signalflow root

# Setup everything
./setup.sh  # Create this script or run manually

# Or manually:
# 1. Frontend
cd frontend
npm install
cd ..

# 2. Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# 3. Database
supabase start
supabase db push

# 4. Run dev servers
npm run dev

# Navigate to
http://localhost:3000  # Frontend
http://localhost:8000/docs  # Backend API docs
```

## Rollback Plan

If something goes wrong:
```bash
# Stop services
pkill -f "next dev"
pkill -f "uvicorn"
supabase stop

# Reset database
supabase db reset

# Clean installs
cd frontend && rm -rf node_modules package-lock.json && npm install
cd backend && rm -rf venv && python3 -m venv venv
```

## Notes for Implementation

- Use TypeScript strict mode in frontend
- Add proper error boundaries in Next.js
- Use Pydantic models for all FastAPI request/response
- Keep backend stateless (use Redis for job state)
- Log everything during development (remove in prod)

## After Implementation

Once complete, next steps:
1. Create `.claude-code-prompts/002-execution-normalizer.md`
2. Build out normalizer module
3. Test with real n8n workflow JSON
4. Generate demo data

---

**Created by**: Claude.ai
**Created on**: January 9, 2026  
**Priority**: High (Week 1 Foundation)  
**Estimated time**: 4-6 hours (includes troubleshooting)
