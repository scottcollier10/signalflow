# SignalFlow - Week 3 Kickoff: Analysis Engine

## 🎉 WEEK 1-2 COMPLETE - ALL SYSTEMS GO!

### What We Built (Weeks 1-2)
**Week 1 Day 2**: Execution Normalizer
- ✅ Converts n8n execution JSON → normalized event stream
- ✅ Tested with real 72-node workflow (474KB execution file)
- ✅ 460 events normalized and stored in database
- ✅ Event types: STARTED, FINISHED, ERROR, RETRY, SKIPPED

**Week 2 Day 1**: Graph Visualization API
- ✅ Built Python FastAPI backend with 3 endpoints:
  - `GET /api/workflows` - List all workflows
  - `GET /api/workflows/{id}` - Get workflow in React Flow format
  - `GET /api/workflows/{id}/executions/{exec_id}` - Get workflow + execution events
- ✅ Transforms n8n format → React Flow format (nodes, edges)
- ✅ All endpoints tested and working

**Week 2 Day 2**: React Flow Frontend
- ✅ Built execution playback visualization
- ✅ 74 nodes rendered with positions
- ✅ 460 events playing back chronologically
- ✅ Playback controls (Play, Reset, Speed: 1x-10x)
- ✅ Progress bar showing execution timeline
- ✅ Node highlighting (executing = green)
- ✅ Status display (success, duration: 115.12s)

**Infrastructure**:
- ✅ Git repository initialized and pushed to GitHub
- ✅ Branch strategy: main → development → feature branches
- ✅ Tagged milestones: v0.2-graph-api, v0.3-week2-complete
- ✅ Supabase production database schema deployed (12 tables)
- ✅ Frontend submodule issue fixed (34 files, 9419 lines committed)

---

## 📊 Current Database State

### Production Supabase
**Status**: Schema deployed, empty (ready for production data)
**Tables**: 12 tables with proper indexes and relationships
**Connection**: `ncvfmbiixxwxkzjzpkog.supabase.co`

### Local Development
**Status**: Contains test data from 72-node workflow
**Data**:
- 2 workflows stored
- 2 executions (474KB real n8n execution)
- 460 normalized events
- 74 nodes, 75 edges

### Key Identifiers (for testing)
```
Workflow ID:  8ce95407-8381-4756-85aa-c5c2a0251384
Execution ID: 15720484-8e33-464b-84b8-0936ecfa7096
n8n Workflow: JLZQ93WHBhbLGcal
n8n Execution: 4349
```

---

## 🎯 WEEK 3 OBJECTIVE: Analysis Engine

Build the core intelligence that makes SignalFlow valuable:
1. **Critical Path Detection** - Identify the longest execution path
2. **Bottleneck Analysis** - Find slowest nodes with evidence
3. **Pattern Detection** - Cluster similar errors
4. **Recommendation Engine** - Suggest optimizations (15 rules)

### Week 3 Architecture
```
Backend Analysis Layer:
├── Critical Path Algorithm (DAG longest path)
├── Bottleneck Scorer (duration + frequency + variance)
├── Error Clustering (HuggingFace embeddings + pgvector)
└── Rule Engine (15 detection rules → recommendations)

Frontend Analysis Display:
├── Critical Path Visualization (highlighted in red)
├── Bottleneck Cards (with evidence links)
├── Error Pattern Groups
└── Recommendation List (clickable to source nodes)
```

---

## 📁 Current Project Structure

```
signalflow/
├── backend/
│   ├── src/
│   │   ├── normalizer/          # ✅ COMPLETE
│   │   │   ├── models.py        # Event types, data models
│   │   │   ├── parser.py        # n8n → normalized events
│   │   │   └── storage.py       # Database operations
│   │   ├── services/            # ✅ COMPLETE
│   │   │   └── workflow_service.py  # React Flow transformation
│   │   ├── analysis/            # 🆕 WEEK 3 - TO BUILD
│   │   │   ├── critical_path.py
│   │   │   ├── bottlenecks.py
│   │   │   ├── error_clustering.py
│   │   │   └── recommendations.py
│   │   └── main.py              # FastAPI app
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── execution/
│   │   │   └── page.tsx         # ✅ Playback visualization
│   │   └── analysis/            # 🆕 WEEK 3 - TO BUILD
│   │       └── page.tsx
│   └── components/
│       ├── execution-visualizer/  # ✅ COMPLETE
│       └── analysis-dashboard/    # 🆕 WEEK 3 - TO BUILD
├── docs/
│   ├── v1-spec.md               # Full V1 specification
│   ├── week2-day1-api-test-results.md
│   ├── EVENT-STRUCTURE-ANSWERS.md
│   └── specs/
│       └── react-flow-execution-visualizer.md
├── supabase/
│   └── migrations/
│       └── 20260109000000_initial_schema.sql
├── .project-context.md
└── START_HERE.md
```

---

## 🔧 Development Environment

### Backend (Python FastAPI)
```bash
cd ~/dev/signalflow/backend
source venv/bin/activate
uvicorn src.main:app --reload --port 8000
```
**Running**: http://localhost:8000
**Health check**: http://localhost:8000/api/health

### Frontend (Next.js)
```bash
cd ~/dev/signalflow/frontend
npm run dev
```
**Running**: http://localhost:3000
**Execution playback**: http://localhost:3000/execution

### Database
**Local**: Supabase local (if needed)
**Production**: https://supabase.com/dashboard/project/ncvfmbiixxwxkzjzpkog

---

## 🎯 Week 3 Implementation Priority

### Day 1: Critical Path Algorithm
**Goal**: Identify the longest execution path through the workflow DAG

**Input**: 460 events with node_ids, timestamps, durations
**Output**: Array of node_ids representing critical path
**Algorithm**: Topological sort + longest path (DAG)

**Deliverables**:
- `backend/src/analysis/critical_path.py`
- API endpoint: `GET /api/workflows/{id}/executions/{exec_id}/critical-path`
- Store results in `critical_paths` table

### Day 2: Bottleneck Detection
**Goal**: Score nodes by bottleneck severity with evidence

**Factors**:
- Duration (node execution time)
- Frequency (how often node executes)
- Variance (inconsistent performance)
- Position (on critical path = higher weight)

**Deliverables**:
- `backend/src/analysis/bottlenecks.py`
- Scoring algorithm (0-100 scale)
- API endpoint: `GET /api/workflows/{id}/executions/{exec_id}/bottlenecks`
- Store in `node_stats` table

### Day 3: Error Clustering
**Goal**: Group similar errors using semantic similarity

**Approach**:
- Extract error messages from ERROR events
- Generate embeddings (HuggingFace sentence-transformers)
- Cluster using pgvector similarity search
- Group errors with > 0.85 similarity

**Deliverables**:
- `backend/src/analysis/error_clustering.py`
- Store embeddings in `error_signatures` table (vector column)
- API endpoint: `GET /api/workflows/{id}/error-clusters`

### Day 4-5: Recommendation Engine
**Goal**: Generate evidence-backed optimization suggestions

**15 Detection Rules** (from V1 spec):
1. Sequential API calls (should parallelize)
2. Synchronous waits (use webhooks)
3. Large data transfers (paginate)
4. Unoptimized queries (add indexes)
5. Missing error handlers
6. Retry without backoff
7. Hardcoded delays (use dynamic waits)
8. Single-item loops (batch operations)
9. Redundant data fetching
10. Missing caching
11. Unindexed searches
12. Heavy computations in main path
13. Excessive logging
14. Unused branches
15. Inefficient transformations

**Deliverables**:
- `backend/src/analysis/recommendations.py`
- Rule detection logic for all 15 rules
- API endpoint: `GET /api/workflows/{id}/recommendations`
- Store in `recommendations` table
- Each recommendation must include:
  - `evidence_node_ids` (clickable proof)
  - `confidence_score` (0-100)
  - `estimated_savings_ms`

---

## 🎨 Week 3 Frontend (Day 6-7)

### Analysis Dashboard Page
**Route**: `/analysis?workflow={id}&execution={id}`

**Components**:
1. **Critical Path Visualization**
   - Highlight critical path nodes in red
   - Show cumulative time along path
   - Toggle on/off overlay

2. **Bottleneck Cards**
   - Top 5 bottlenecks ranked by score
   - Each card shows: node name, duration, score, evidence link
   - Click card → zoom to node on graph

3. **Error Pattern Groups**
   - Clustered error messages
   - Group count, sample message
   - Expand to see all instances

4. **Recommendation List**
   - 15 rules with detection status
   - Green checkmark = passed
   - Red flag = detected issue
   - Click → show evidence nodes + suggestion

---

## 🧪 Testing Strategy

### Unit Tests (Week 3 Day 1-5)
```bash
cd backend
pytest tests/test_critical_path.py
pytest tests/test_bottlenecks.py
pytest tests/test_error_clustering.py
pytest tests/test_recommendations.py
```

### Integration Tests (Week 3 Day 6)
Test with real 72-node workflow:
- Critical path should identify ~10-15 nodes
- Bottlenecks should detect claude_ai_generate (3.2s)
- Error clustering (if errors exist in test data)
- Recommendations should trigger 3-5 rules

### End-to-End Test (Week 3 Day 7)
1. Load execution playback
2. Click "View Analysis" button
3. See critical path overlaid in red
4. See bottleneck cards populated
5. See recommendations with clickable evidence
6. Click evidence → zoom to node

---

## 📝 Git Workflow for Week 3

```bash
# Already on week3-analysis-engine branch
git status  # Should show: On branch week3-analysis-engine

# Daily commits
git add .
git commit -m "Week 3 Day X: [Component] complete"
git push

# End of week merge
git checkout development
git merge week3-analysis-engine
git push

git checkout main
git merge development
git push

git tag -a v0.4-week3-complete -m "Week 3: Analysis engine complete - critical path, bottlenecks, recommendations"
git push origin v0.4-week3-complete
```

---

## 🚨 Known Issues / Edge Cases

### From Week 1-2 Implementation

1. **Frontend was a git submodule** - Fixed by removing `.git` folder
2. **UUID vs n8n ID confusion** - Fixed with separate `n8n_execution_id` column
3. **Supabase migration ordering** - Second migration tried to revert first (deleted bad migration)

### Week 3 Considerations

1. **Cyclic dependencies**: n8n workflows shouldn't have cycles, but IF branches can create apparent cycles. Handle with topological sort validation.

2. **Parallel execution**: Multiple nodes can execute simultaneously. Critical path should account for this (use max path, not sum).

3. **Missing events**: If execution was partial (error/cancelled), some nodes won't have FINISHED events. Bottleneck detection should skip incomplete nodes.

4. **Error message variations**: Similar errors may have different timestamps/IDs embedded. Normalize before embedding.

5. **Recommendation false positives**: Rules should require multiple pieces of evidence (not just single occurrence).

---

## 📚 Key Resources

### Documentation
- **V1 Spec**: `docs/v1-spec.md` (complete specification)
- **Data Model**: `docs/data-model.sql` (all tables and relationships)
- **Project Context**: `.project-context.md` (high-level overview)

### APIs to Reference
- **React Flow**: https://reactflow.dev/api-reference
- **HuggingFace Embeddings**: sentence-transformers/all-MiniLM-L6-v2
- **pgvector**: https://github.com/pgvector/pgvector

### Test Data
- Real execution JSON: `execution_4349.json` (474KB)
- 72-node workflow from production n8n instance
- 52 nodes executed, 22 skipped (IF branches)

---

## 🎯 Success Criteria for Week 3

### Backend
- [ ] Critical path algorithm returns valid path (10-15 nodes for test workflow)
- [ ] Bottleneck scoring ranks claude_ai_generate node highest
- [ ] Error clustering groups similar errors (>0.85 similarity)
- [ ] All 15 recommendation rules implemented
- [ ] API endpoints return data in < 500ms
- [ ] Recommendations include evidence_node_ids (clickable proof)

### Frontend
- [ ] Critical path highlights in red overlay
- [ ] Bottleneck cards display top 5 with scores
- [ ] Click bottleneck → zoom to node
- [ ] Recommendation list shows all 15 rules
- [ ] Click recommendation → show evidence nodes
- [ ] Analysis page loads in < 2 seconds

### Testing
- [ ] Unit tests pass for all analysis modules
- [ ] Integration test with real workflow succeeds
- [ ] End-to-end flow works (playback → analysis → evidence)

---

## 🚀 Getting Started (Week 3 Day 1)

1. **Read the V1 spec** (`docs/v1-spec.md`) - Section 5: Analysis Layer
2. **Review critical path algorithm** - Understand DAG longest path approach
3. **Create spec file**: `docs/specs/week3-critical-path.md`
4. **Build algorithm**: `backend/src/analysis/critical_path.py`
5. **Test with real data**: Use workflow `8ce95407-8381-4756-85aa-c5c2a0251384`

---

## 💡 Tips from Weeks 1-2

### What Worked Well
- Starting with data models first (clear structure)
- Testing with real n8n data early (found UUID issue)
- Using React Flow for visualization (industry standard)
- Git branches for feature isolation
- Frequent commits (easy to rollback)

### What to Watch Out For
- Git submodule issues (check with `git status` often)
- Supabase migration ordering (verify with `supabase migration list`)
- Frontend build caching (`.next` folder can cause issues)
- Type mismatches (UUID vs TEXT in database)

### Development Flow
1. **Spec first** - Write the spec document before coding
2. **Test with real data** - Don't use synthetic data
3. **Commit frequently** - Small, focused commits
4. **Verify database** - Check Supabase Studio after migrations
5. **API testing** - Use curl to verify endpoints work

---

## 📞 Handoff Notes

**From**: Week 1-2 Chat (Claude.ai)
**To**: Week 3 Chat (Claude.ai or Claude Code)
**Date**: January 10, 2026
**Status**: All systems operational, ready for Week 3

**Key Context**:
- Scott has strong technical knowledge across n8n, web dev, system architecture
- Prefers structured approach with comprehensive documentation
- Evidence-first philosophy: every recommendation needs clickable proof
- Uses Claude.ai for strategic planning, Claude Code for implementation
- Working directory: `/Users/scottcollier/dev/signalflow/`

**Current Branch**: `week3-analysis-engine`
**Last Commit**: "Fix: Convert frontend from submodule to normal directory"
**Tagged Milestones**: v0.2-graph-api, v0.3-week2-complete

---

**LET'S BUILD THE INTELLIGENCE ENGINE!** 🧠🚀

Week 3 is where SignalFlow becomes truly valuable - transforming raw execution data into actionable insights. The foundation is solid, the data is flowing, now let's make it smart.

**Evidence-first. Rules-first. Trustworthy insights.**
