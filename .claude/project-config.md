# SignalFlow Project Configuration

**DO NOT MODIFY THIS FILE WITHOUT UPDATING THE ACTUAL PROJECT STRUCTURE**

## Project Location
```
/Users/scottcollier/dev/signalflow/
```

## Directory Structure
```
/Users/scottcollier/dev/signalflow/
├── backend/           # Python FastAPI backend (port 8001)
├── frontend/          # Next.js 14 frontend (port 3001)
├── docs/              # Documentation
├── .claude-code-prompts/  # Claude Code implementation prompts
└── .claude/           # Claude configuration (this directory)
```

## Running the Project

### Using devctl (Recommended)
```bash
# Start both frontend and backend
sf

# Stop all services
devstop

# Clean restart (if services are stuck)
sfclean

# Check status
devstatus

# View logs
devlogs signalflow
```

### Manual Start (Development)
```bash
# Backend (from /Users/scottcollier/dev/signalflow/backend)
source venv/bin/activate
python -m uvicorn src.main:app --reload --port 8001

# Frontend (from /Users/scottcollier/dev/signalflow/frontend)
npm run dev
```

## Active Services When Running

| Service | Port | URL | Process |
|---------|------|-----|---------|
| Frontend | 3001 | http://localhost:3001 | Next.js dev server |
| Backend | 8001 | http://localhost:8001 | Python uvicorn |

## Key Files for Code Changes

### Backend Changes
- **API endpoints**: `/Users/scottcollier/dev/signalflow/backend/src/main.py`
- **Analysis logic**: `/Users/scottcollier/dev/signalflow/backend/src/analysis/`
- **Data models**: `/Users/scottcollier/dev/signalflow/backend/src/models/`

### Frontend Changes
- **Components**: `/Users/scottcollier/dev/signalflow/frontend/components/`
- **API client**: `/Users/scottcollier/dev/signalflow/frontend/lib/api/`
- **Pages**: `/Users/scottcollier/dev/signalflow/frontend/app/`

## Environment Setup

### Backend Requirements
- Python 3.13
- Virtual environment at `/Users/scottcollier/dev/signalflow/backend/venv/`
- Supabase connection (credentials in .env)

### Frontend Requirements
- Node.js (managed via nvm)
- Dependencies installed via npm

## Troubleshooting

### Services Won't Start
1. Check if ports are already in use: `devports`
2. Stop all services: `devstop`
3. Clean restart: `sfclean`

### Backend Changes Not Showing
1. Backend auto-reloads on file changes (uvicorn --reload)
2. If stuck, restart: `devstop && sf`

### Frontend Changes Not Showing
1. Clear Next.js cache: `rm -rf frontend/.next`
2. Restart: `devstop && sf`

## Important Notes

- **Backend runs from**: `/Users/scottcollier/dev/signalflow/backend/` (confirmed via `lsof -p <PID> | grep cwd`)
- **Frontend runs from**: `/Users/scottcollier/dev/signalflow/frontend/`
- **devctl script location**: `~/dev/tools/devctl/devctl.sh`
- **Shell config**: `~/.zshrc` (contains `sf` alias)

## For Claude Code

When implementing changes:
1. Backend changes go in `/Users/scottcollier/dev/signalflow/backend/src/`
2. Frontend changes go in `/Users/scottcollier/dev/signalflow/frontend/`
3. Backend will auto-reload if uvicorn is running with `--reload`
4. Frontend requires browser refresh (or use Next.js Fast Refresh)

## Version Info
- Project: SignalFlow v0.8
- Created: 2026-02-04
- Last Updated: 2026-02-04
