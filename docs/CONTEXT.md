# SignalFlow - Active Development Context

**Last Updated**: January 10, 2026  
**Current Sprint**: Week 1, Day 2  
**Focus**: Execution Normalizer (Core Engine)

---

## 🎯 Current Status

### What's Complete ✅
- **Foundation Setup**: All services running
  - Frontend: Next.js 14 on http://localhost:3000
  - Backend: Python FastAPI on http://localhost:8000
  - Database: Supabase local with full schema migrated
- **Documentation**: Complete V1 spec, data model, architecture
- **Project Structure**: All directories created, dependencies installed

### What's Next ⏭️
- **Building**: Execution Normalizer (THE critical piece)
- **Testing With**: Scott's 72-node Content Ops workflow
- **Approach**: Synthetic execution data initially, real data later

---

## 📊 Project Stats

| Metric | Value |
|--------|-------|
| **Week** | 1 of 8 |
| **Phase** | Foundation → Core Engine |
| **Complexity** | Testing with 72-node real workflow |
| **Test Data** | Synthetic executions (real n8n export available) |

---

## 🔧 Tech Stack Status

| Component | Status | URL |
|-----------|--------|-----|
| Frontend (Next.js) | ✅ Running | http://localhost:3000 |
| Backend (FastAPI) | ✅ Running | http://localhost:8000 |
| Database (Supabase) | ✅ Migrated | http://127.0.0.1:54323 |
| Studio | ✅ Available | Table Editor accessible |

**Database Tables Created** (10 total):
- workflows, nodes, edges, executions, execution_events
- critical_paths, node_stats, error_signatures
- recommendations, weekly_digests

---

## 📁 Test Workflow Details

### Content Ops Brief Generation (72 nodes)

**Location**: `content-ops-copilot/02-n8n-workflows/exports/[02] Content Ops_ Brief Generation.json`

**Complexity**:
- 72 nodes total
- Multiple execution paths
- Real production workflow (in progress)
- Has both successful and error executions available

**Node Types Present** (9 types):
1. Webhook Triggers
2. Supabase native nodes
3. HTTP Request nodes
4. Code nodes
5. IF conditions
6. Merge nodes
7. Claude AI nodes
8. OpenAI nodes
9. Response nodes

**Execution History**:
- Multiple successful runs (418ms - 774ms range)
- Error cases present (328ms - 35.8s range)
- Real-world timing data available

---

## 🎯 Current Sprint: Execution Normalizer

### Why This Matters
The normalizer is the **"ground truth" engine**:
- ❌ Without it: No analysis possible
- ✅ With it: Critical path, bottlenecks, recommendations all flow

### What It Does
Transforms n8n's messy execution format into clean event stream:

**Input** (n8n execution JSON):
```json
{
  "data": {
    "resultData": {
      "runData": {
        "HTTP Request": [{
          "startTime": 1234567890,
          "executionTime": 245,
          ...
        }]
      }
    }
  }
}
```

**Output** (Normalized events):
```json
{
  "execution_id": "uuid",
  "events": [
    {
      "node_id": "http_1",
      "event_type": "started",
      "timestamp": "2026-01-10T10:00:00Z",
      "duration_ms": 245,
      "status": "success",
      "sequence_order": 1
    }
  ]
}
```

### Edge Cases to Handle
- ✅ Partial executions (workflow stops mid-way)
- ✅ Error states (node failures)
- ✅ Retries (automatic and manual)
- ✅ IF branches (conditional paths)
- ✅ Merge nodes (wait for multiple inputs)
- ✅ Parallel execution
- ✅ Webhook triggers vs manual triggers

---

## 🧠 Key Technical Decisions

### 1. Synthetic Data First
**Decision**: Build normalizer with synthetic execution data, add real data later  
**Why**: Avoids blocking on n8n API auth, lets us start building immediately  
**Status**: Creating synthetic data matching Scott's 72-node workflow structure

### 2. Event-Based Architecture
**Decision**: Everything flows from normalized execution events  
**Why**: Single source of truth, easier to debug, scales better  
**Status**: Schema in place (execution_events table)

### 3. Rules-First Analysis
**Decision**: Use deterministic rules for bottleneck detection, AI only for classification  
**Why**: Trustworthy, testable, explainable  
**Status**: Framework design complete, implementation starts Week 5

---

## 📋 Week 1 Remaining Tasks

- [ ] **Day 2-3**: Build execution normalizer
  - Parse n8n workflow JSON
  - Generate/parse execution data
  - Create normalized event stream
  - Store in execution_events table

- [ ] **Day 4**: Test with Scott's workflow
  - Import 72-node workflow
  - Generate synthetic executions
  - Verify event stream correctness

- [ ] **Day 5**: Validate foundation
  - Query events from database
  - Verify node/edge relationships
  - Confirm ready for Week 2 (visualization)

---

## 🔗 Important Files

### Documentation
- `docs/v1-spec.md` - Complete V1 specification
- `docs/data-model.sql` - Database schema
- `.project-context.md` - Project overview for Claude.ai
- `QUICK_REFERENCE.md` - One-page guide

### Implementation
- `.claude-code-prompts/001-setup-project.md` - Completed ✅
- `.claude-code-prompts/002-execution-normalizer.md` - Next ⏭️

### Test Data
- `content-ops-copilot/02-n8n-workflows/exports/[02] Content Ops_ Brief Generation.json` - Real workflow

---

## 💡 Notes for Next Session

### When Starting Fresh Chat
1. Read this file (CONTEXT.md) first
2. Reference `.project-context.md` for broader context
3. Check `docs/workflow-analysis/content-ops-brief.md` for workflow details
4. Follow prompt in `.claude-code-prompts/002-execution-normalizer.md`

### Quick Status Check
```bash
# Verify services
curl http://localhost:8000/health     # Backend
open http://localhost:3000            # Frontend
open http://127.0.0.1:54323          # Database Studio

# Check database
supabase db diff                      # Should show "No changes"
```

### Token Conservation
- Use memory for: Node types, current sprint, key decisions
- Reference files instead of pasting full context
- Start fresh chats when context gets large (>50k tokens)
- Update this file instead of repeating in chat

---

## 🎯 Success Criteria for This Week

By end of Week 1, we should have:
- [x] All services running locally
- [x] Database schema applied
- [x] Execution normalizer working ✅
- [x] Can import real workflow (72 nodes) ✅
- [x] Can generate normalized event stream ✅
- [x] Events stored in database correctly ✅
- [ ] Ready to build visualization (Week 2) ⏭️

## Stats from Real Execution:
- Execution ID: 4349 (n8n) / 15720484-... (internal UUID)
- Total Events: 474
- Duration: 115,124ms (~2 minutes)
- Status: Success
- Bottleneck: claude_ai_generate (3200ms)

---

## 📞 Key Contacts & Resources

- **n8n Instance**: http://n8n-jobbot.onrender.com
- **Workflow ID**: [02] Content Ops: Brief Generation
- **Execution Examples**: Multiple in screenshot (Jan 9-10, 2026)
- **Test Execution IDs**: 4362 (success), others available

---

**Remember**: The normalizer is the foundation. Get this right and everything else flows naturally. Take time to handle edge cases properly.
