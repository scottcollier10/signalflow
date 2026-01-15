# Week 3 Days 6-7: Quick Reference

**Task**: Build Frontend Analysis Dashboard  
**Estimated Time**: 7-9 hours (Day 6: 4-5h, Day 7: 3-4h)  
**Status**: Ready to implement

---

## 📋 Checklist

### Day 6: Core Dashboard + Visualizations (4-5 hours)
- [ ] Create `/execution/[id]/analysis` page route
- [ ] Set up API integration layer (fetch all 4 endpoints)
- [ ] Build AnalysisDashboard layout component
- [ ] Implement CriticalPathOverlay on execution graph
- [ ] Create BottleneckPanel with color-coded badges
- [ ] Build RecommendationsList component
- [ ] Add loading states for all async operations
- [ ] Test with real workflow data

### Day 7: Interactions + Polish (3-4 hours)
- [ ] Build ErrorClustersSection component
- [ ] Create EvidenceDrawer for recommendation drill-down
- [ ] Add CodeExampleBlock with syntax highlighting
- [ ] Implement FilterControls (category, impact, effort)
- [ ] Add sort functionality (priority, impact, effort)
- [ ] Mobile responsive design
- [ ] Error handling for API failures
- [ ] Final testing and polish

---

## 🎯 Success Criteria

**All must pass**:
✅ Dashboard accessible at `/execution/[id]/analysis`  
✅ All 4 APIs integrated and returning data  
✅ Critical path nodes highlighted on graph  
✅ Bottlenecks shown with severity colors  
✅ Recommendations displayed as sortable cards  
✅ Evidence links clickable and functional  
✅ Code examples render with highlighting  
✅ Filters work (category, impact, effort)  
✅ Mobile responsive (320px - 1920px)  
✅ Loading states present  
✅ Error handling for API failures

---

## 🚀 Quick Start

**1. Start backend** (if not running):
```bash
cd ~/dev/signalflow/backend
python3 -m uvicorn src.main:app --reload --port 8000
```

**2. Start frontend dev server**:
```bash
cd ~/dev/signalflow/frontend
npm run dev
# Opens at http://localhost:3000
```

**3. Test APIs are working**:
```bash
WF_ID="6a71673e-623d-42c9-a7c5-09e8acda50f4"
EXEC_ID="09f2d02b-2137-4da8-8e68-cd15535bee3f"

# Should all return success: true
curl "http://localhost:8000/api/workflows/$WF_ID/executions/$EXEC_ID/critical-path" | jq '.success'
curl "http://localhost:8000/api/workflows/$WF_ID/executions/$EXEC_ID/bottlenecks" | jq '.success'
curl "http://localhost:8000/api/workflows/$WF_ID/executions/$EXEC_ID/error-analysis" | jq '.success'
curl "http://localhost:8000/api/workflows/$WF_ID/executions/$EXEC_ID/recommendations" | jq '.data.summary'
```

**4. Navigate to test execution**:
```
http://localhost:3000/execution/09f2d02b-2137-4da8-8e68-cd15535bee3f
```

**5. Implement dashboard** (Claude Code):
```bash
cd ~/dev/signalflow
claude code --prompt .claude-code-prompts/week3-day6-7-frontend-dashboard.md
```

---

## 📊 Expected Output

For test execution `09f2d02b-2137-4da8-8e68-cd15535bee3f`:

### Critical Path
- **50 of 52 nodes** highlighted on graph (96.15%)
- Visual indicator showing sequential bottleneck
- Total path duration: 115.12s

### Bottlenecks
**Top 5 Bottlenecks** (color-coded by severity):
1. 🔴 rate_limit_delay - 87/100 (36.4s)
2. 🔴 Claude: Generate Variant - 86/100 (varies)
3. 🔴 Another severe node - 85/100
4. 🟠 High priority node - 75/100
5. 🟠 High priority node - 72/100

### Recommendations
**3 cards sorted by priority**:
1. [Priority: 250] Optimize Long-Running Node: rate_limit_delay
   - Impact: HIGH, Effort: HIGH
   - Evidence: 2 items with clickable links
   - Time saved: 36.4s
   
2. [Priority: 100+] Second recommendation
   - Impact: HIGH, Effort: MEDIUM
   
3. [Priority: 75+] Third recommendation
   - Impact: MEDIUM, Effort: LOW

### Errors
- Clean execution (0 errors)
- Empty state message: "No errors detected in this execution ✅"

---

## 💡 Key Patterns

### API Integration
```typescript
// Fetch all analyses in parallel
const fetchAnalysisData = async (workflowId: string, executionId: string) => {
  const [criticalPath, bottlenecks, errors, recommendations] = await Promise.all([
    fetch(`/api/workflows/${workflowId}/executions/${executionId}/critical-path`),
    fetch(`/api/workflows/${workflowId}/executions/${executionId}/bottlenecks`),
    fetch(`/api/workflows/${workflowId}/executions/${executionId}/error-analysis`),
    fetch(`/api/workflows/${workflowId}/executions/${executionId}/recommendations`)
  ]);
  
  return {
    criticalPath: await criticalPath.json(),
    bottlenecks: await bottlenecks.json(),
    errors: await errors.json(),
    recommendations: await recommendations.json()
  };
};
```

### Color Coding
```typescript
const getSeverityColor = (score: number) => {
  if (score >= 81) return 'text-red-600 bg-red-50 border-red-200'; // Severe
  if (score >= 61) return 'text-orange-600 bg-orange-50 border-orange-200'; // High
  if (score >= 31) return 'text-yellow-600 bg-yellow-50 border-yellow-200'; // Medium
  return 'text-green-600 bg-green-50 border-green-200'; // Low
};

const getPriorityBadge = (impact: string) => {
  const colors = {
    CRITICAL: 'bg-red-100 text-red-800',
    HIGH: 'bg-orange-100 text-orange-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-green-100 text-green-800'
  };
  return colors[impact] || colors.LOW;
};
```

### Evidence Links
```typescript
// Evidence links should route to same page with query params
const handleEvidenceClick = (evidence: Evidence) => {
  if (evidence.type === 'bottleneck') {
    // Highlight node on graph and scroll to bottlenecks section
    router.push(`/execution/${executionId}?highlight=${nodeId}&section=bottlenecks`);
  }
};
```

---

## 🎨 Component Structure

```
app/
└── execution/[id]/
    └── analysis/
        └── page.tsx          # Main dashboard page

components/
└── analysis/
    ├── AnalysisDashboard.tsx       # Main container
    ├── CriticalPathOverlay.tsx     # Graph overlay
    ├── BottleneckPanel.tsx         # Bottleneck cards
    ├── RecommendationsList.tsx     # Recommendations container
    ├── RecommendationCard.tsx      # Individual recommendation
    ├── EvidenceDrawer.tsx          # Evidence drill-down
    ├── CodeExampleBlock.tsx        # Syntax highlighted code
    ├── ErrorClustersSection.tsx    # Error clusters
    └── FilterControls.tsx          # Filter/sort controls
```

---

## 🔗 Reference Links

**Full Spec**: `docs/specs/week3-day6-7-frontend-dashboard.md` (detailed implementation guide)  
**Project Context**: `docs/PROJECT-CONTEXT-WEEK3-FINAL.md`  
**New Chat Handoff**: `docs/NEW-CHAT-HANDOFF-WEEK3-DAY6-7.md`  
**Claude Code Prompt**: `.claude-code-prompts/week3-day6-7-frontend-dashboard.md`  
**Backend Complete**: `docs/WEEK3-DAY4-5-COMPLETE.md`

---

## 🛠️ Tech Stack Reference

**Frontend**:
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Flow (already set up for execution graph)
- Prism.js or react-syntax-highlighter (for code examples)

**APIs**:
- Backend running on `http://localhost:8000`
- Configured in `.env.local` as `NEXT_PUBLIC_API_URL`

---

## 🐛 Common Issues

**Issue: API CORS errors**
**Solution**: Check `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local`

**Issue: Can't see execution graph**
**Solution**: Make sure React Flow is properly initialized from Weeks 1-2 setup

**Issue: Recommendations return 0**
**Solution**: Run prerequisite analyses first:
```bash
curl "http://localhost:8000/api/workflows/$WF_ID/executions/$EXEC_ID/critical-path"
curl "http://localhost:8000/api/workflows/$WF_ID/executions/$EXEC_ID/bottlenecks"
```

**Issue: Code examples not highlighting**
**Solution**: Install syntax highlighter:
```bash
npm install react-syntax-highlighter @types/react-syntax-highlighter
```

**Issue: Mobile layout broken**
**Solution**: Use Tailwind responsive classes: `flex-col md:flex-row`, `text-sm md:text-base`

---

## ✨ After Completion

**Commit**:
```bash
cd ~/dev/signalflow

git add frontend/src/app/execution/[id]/analysis/
git add frontend/src/components/analysis/
git add docs/WEEK3-DAY6-7-COMPLETE.md

git commit -m "Week 3 Days 6-7: Frontend analysis dashboard complete

- Analysis dashboard page with all visualizations
- Critical path overlay on execution graph
- Color-coded bottleneck highlighting
- Recommendations list with priority sorting
- Evidence drill-down with clickable links
- Code example syntax highlighting
- Filter/sort controls
- Mobile responsive design
- Loading states and error handling

All 4 APIs integrated:
✅ Critical path visualization
✅ Bottleneck detection display
✅ Error clustering (when present)
✅ Recommendations with evidence"

git tag -a v0.7-week3-complete -m "Week 3 Complete: Full analysis pipeline + frontend dashboard"
git push origin main --tags
```

**Celebrate** 🎉 - Week 3 is 100% complete!

**Next Steps**:
- Polish and bug fixes
- User testing with real workflows
- Performance optimization
- Documentation

---

**Week 3 Progress**: 71% → 100% complete (5→7 of 7 days)
