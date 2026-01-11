# SignalFlow - Quick Reference

**Location**: `/Users/scottcollier/dev/signalflow`  
**Status**: Ready for Week 1 Development

---

## 📁 What's Been Created

```
signalflow/
├── .project-context.md           # Context for Claude.ai
├── README.md                      # Full project overview  
├── PROJECT_ORGANIZATION.md        # This summary (read second)
├── docs/
│   ├── v1-spec.md                # Complete V1 spec (14 pages)
│   ├── data-model.sql            # Full database schema
│   ├── specs/                    # Feature specs (empty, ready)
│   └── rules/                    # Rule docs (empty, ready)
└── .claude-code-prompts/
    └── 001-setup-project.md      # First implementation task
```

---

## 🚀 Getting Started (Right Now)

### Option 1: Start with Claude Code
```bash
# In Claude Code, from signalflow directory:
"Follow .claude-code-prompts/001-setup-project.md"
```

### Option 2: Read First, Then Build
1. Read `PROJECT_ORGANIZATION.md` (overview)
2. Skim `docs/v1-spec.md` (full spec)
3. Review `.project-context.md` (project context)
4. Then hand to Claude Code with prompt above

---

## 📋 Week 1 Checklist

- [ ] Run Claude Code setup (prompt 001)
- [ ] Frontend running (`npm run dev`)
- [ ] Backend running (FastAPI)
- [ ] Database migrated (Supabase)
- [ ] Export one of your n8n workflows as JSON
- [ ] Test importing workflow JSON
- [ ] Build execution normalizer (next prompt)

---

## 🎯 Core Value Prop

**Before SignalFlow**:
- Manually hunt for bottlenecks in 74-node workflows
- Failures lost in logs
- No systematic optimization

**After SignalFlow**:
- Click workflow → See critical path highlighted
- Click bottleneck → See exact runs that prove it
- Get 15 types of evidence-backed recommendations
- Export weekly performance digest

---

## 🔑 Key Decisions

| Decision | Rationale |
|----------|-----------|
| **Import-first** (not API) | Faster to build, works with any n8n setup |
| **Python backend** | Graph algorithms + ML ecosystem |
| **Rules-first, AI-assist** | Trustworthy, testable, debuggable |
| **Evidence-first UX** | Every claim must be clickable and provable |
| **8-week V1** | Realistic scope for solo dev |

---

## 🧠 Core Technical Challenges

### 1. Execution Normalizer (Week 1-2)
Transform n8n's messy execution JSON into clean event stream.
**Hard part**: n8n versions vary, node types behave differently.

### 2. Critical Path (Week 3)
Find longest path through execution graph.
**Hard part**: Accounting for concurrency, branches, retries.

### 3. Bottleneck Scoring (Week 3)
Composite score: critical path + variance + frequency + errors.
**Hard part**: Must be trustworthy or users won't use it.

---

## 💡 What Makes This Special

1. **You're solving your own problem** (74-node workflow)
2. **Graph-based analysis** (not just "slowest node")
3. **Evidence-first** (every conclusion clickable)
4. **Realistic scope** (can ship V1 in 8 weeks)
5. **Clear differentiation** (no competition in this space)

---

## 📚 Documentation Hierarchy

```
High-level Overview
├── README.md (what it does, why it matters)
└── PROJECT_ORGANIZATION.md (this file)

Strategic Specs
├── .project-context.md (for Claude.ai)
└── docs/v1-spec.md (complete V1 scope)

Technical Details
├── docs/data-model.sql (database schema)
├── docs/specs/ (feature specifications)
└── docs/rules/ (recommendation rules)

Implementation Guides
└── .claude-code-prompts/ (step-by-step tasks)
```

---

## 🔄 Workflow Pattern

```
1. You identify need/feature
   ↓
2. Ask Claude.ai to create spec
   ↓ 
   Creates in docs/specs/[feature].md
   ↓
3. Ask Claude.ai for implementation prompt
   ↓
   Creates in .claude-code-prompts/[task].md
   ↓
4. Give prompt to Claude Code
   ↓
5. Claude Code implements
   ↓
6. Test, iterate, ship
```

---

## 🎨 Demo Data (Week 7)

3 synthetic workflows created:
1. **Sequential HTTP Hell** - 5 API calls (could parallelize)
2. **Credential Expiry Chaos** - Auth failures
3. **Rate Limit Cascade** - Unbounded fan-out

Each has realistic execution data (25-50 runs).

---

## 📊 8-Week Timeline

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1-2 | Foundation + Normalizer | Import workflows, store events |
| 3-4 | Analysis + Clustering | Critical path, error patterns |
| 5-6 | Recommendations | 15 rules, evidence panel |
| 7 | Demo + Polish | 3 workflows, public demo |
| 8 | Launch Prep | Digest, export, docs, video |

---

## 🧪 Success Criteria

**V1 is done when**:
- [ ] Can import workflow + execution JSON
- [ ] Graph renders with critical path highlighted
- [ ] Bottlenecks scored with evidence
- [ ] 15 recommendation types working
- [ ] Every recommendation has clickable proof
- [ ] 3 demo workflows with data
- [ ] Weekly digest generates
- [ ] Works on tablet (mobile-responsive)

---

## 🚦 Next Actions

### Today:
1. Review `PROJECT_ORGANIZATION.md` ← You're here
2. Skim `docs/v1-spec.md`
3. Hand to Claude Code: "Follow `.claude-code-prompts/001-setup-project.md`"

### This Week:
4. Get project running locally
5. Export your 74-node workflow as JSON
6. Build execution normalizer
7. Test with your real data

### This Month:
- Complete Weeks 1-4 (Foundation + Analysis)
- Have working critical path detection
- Start building UI

---

## 💬 Getting Help

**Ask Claude.ai to**:
- Create more specs: "Create spec for [feature]"
- Design rules: "Design rule for detecting [pattern]"
- Generate prompts: "Create implementation prompt for [task]"
- Refine architecture: "How should we handle [problem]?"

**Ask Claude Code to**:
- Implement: "Follow `.claude-code-prompts/[task].md`"
- Fix bugs: "Fix [issue] in [file]"
- Add tests: "Add tests for [feature]"

---

## 🎯 Why This Will Work

✅ **Problem is real** (you're living it)  
✅ **Scope is realistic** (8 weeks, focused V1)  
✅ **Architecture is sound** (graph-based, evidence-first)  
✅ **Differentiation is clear** (no competition)  
✅ **Foundation is complete** (specs written, data model defined)  
✅ **Market exists** (n8n has 60k+ stars, growing)  

---

## 📞 Status Updates

Update `.project-context.md` weekly:
```markdown
## Current Focus
- Week X: [What you're building]
- Completed: [What shipped]
- Next: [What's coming]
```

---

**Ready to build?** → Open Claude Code, load the setup prompt, and start Week 1.

This is going to be good. 🔥
