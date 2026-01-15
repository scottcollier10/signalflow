# Implement Week 3 Days 6-7: Frontend Analysis Dashboard

Read the complete specification in `docs/specs/week3-day6-7-frontend-dashboard-spec.md` and implement the analysis dashboard that displays all Week 3 analysis results.

## CONTEXT

**Status**: Week 3 Days 1-5 complete ✅
- ✅ Critical path API working
- ✅ Bottleneck detection API working
- ✅ Error clustering API working
- ✅ Recommendation engine API working (3 recommendations generated)

**Test Data**:
- Workflow: `6a71673e-623d-42c9-a7c5-09e8acda50f4`
- Execution: `09f2d02b-2137-4da8-8e68-cd15535bee3f`
- Backend: `http://localhost:8000`

## DELIVERABLES

### Day 6: Core Dashboard (4-5 hours)
1. Create page route: `app/execution/[id]/analysis/page.tsx`
2. Build `AnalysisDashboard` main container component
3. Implement `CriticalPathOverlay` for graph highlighting
4. Create `BottleneckPanel` with color-coded cards
5. Build `RecommendationsList` with sorting
6. Add loading states for all async operations

### Day 7: Interactions + Polish (3-4 hours)
7. Build `ErrorClustersSection` component
8. Create `EvidenceDrawer` for drill-down
9. Add `CodeExampleBlock` with syntax highlighting
10. Implement `FilterControls` (category, impact, effort)
11. Add sort functionality (priority, time saved)
12. Mobile responsive design (320px - 1920px)
13. Error handling for API failures

## API ENDPOINTS

All 4 endpoints are working and return data:

```bash
GET /api/workflows/{wf_id}/executions/{exec_id}/critical-path
GET /api/workflows/{wf_id}/executions/{exec_id}/bottlenecks
GET /api/workflows/{wf_id}/executions/{exec_id}/error-analysis
GET /api/workflows/{wf_id}/executions/{exec_id}/recommendations
```

## COMPONENT STRUCTURE

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
    ├── BottleneckCard.tsx          # Individual bottleneck
    ├── RecommendationsList.tsx     # Recommendations container
    ├── RecommendationCard.tsx      # Individual recommendation
    ├── EvidenceDrawer.tsx          # Evidence drill-down
    ├── CodeExampleBlock.tsx        # Syntax highlighted code
    ├── ErrorClustersSection.tsx    # Error clusters
    ├── FilterControls.tsx          # Filter/sort controls
    ├── LoadingState.tsx            # Loading spinner
    └── ErrorState.tsx              # Error display

lib/
└── api/
    └── analysis.ts                 # API client functions
```

## KEY REQUIREMENTS

### Data Fetching
- Fetch all 4 APIs in parallel using `Promise.all()`
- Handle loading states during fetch
- Show error states if APIs fail
- Cache responses in component state

### Color Coding
**Bottleneck Severity**:
- Severe (81-100): Red (`bg-red-50`, `border-red-200`)
- High (61-80): Orange (`bg-orange-50`, `border-orange-200`)
- Medium (31-60): Yellow (`bg-yellow-50`, `border-yellow-200`)
- Low (0-30): Green (`bg-green-50`, `border-green-200`)

**Priority Badges**:
- CRITICAL: Red (`bg-red-100 text-red-800`)
- HIGH: Orange (`bg-orange-100 text-orange-800`)
- MEDIUM: Yellow (`bg-yellow-100 text-yellow-800`)
- LOW: Green (`bg-green-100 text-green-800`)

### Evidence Links
- Make evidence links clickable
- Open drawer on click showing full details
- Include code examples when available
- Show related nodes

### Filtering & Sorting
**Filters**:
- Category: all | performance | reliability
- Impact: all | CRITICAL | HIGH | MEDIUM | LOW
- Effort: all | LOW | MEDIUM | HIGH

**Sort Options**:
- Priority score (default, descending)
- Time saved (descending)
- Impact level
- Effort level

### Mobile Responsive
Use Tailwind responsive classes:
```typescript
// Container
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

// Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Text
<h1 className="text-xl sm:text-2xl lg:text-3xl">

// Flex
<div className="flex flex-col md:flex-row gap-4">
```

## API RESPONSE TYPES

```typescript
interface CriticalPathResponse {
  path_nodes: Array<{
    node_id: string;
    node_name: string;
    duration_ms: number;
  }>;
  summary: {
    total_duration_ms: number;
    node_count: number;
    path_percentage: number;
  };
}

interface BottlenecksResponse {
  bottlenecks: Array<{
    node_id: string;
    node_name: string;
    bottleneck_score: number;
    total_duration_ms: number;
    is_on_critical_path: boolean;
    severity: 'low' | 'medium' | 'high' | 'severe';
  }>;
  summary: {
    total_nodes_analyzed: number;
    bottlenecks_by_severity: Record<string, number>;
  };
}

interface RecommendationsResponse {
  recommendations: Array<{
    id: string;
    rule_id: number;
    title: string;
    description: string;
    evidence: Array<{
      type: string;
      description: string;
      data: any;
      link: string;
    }>;
    impact: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    effort: 'LOW' | 'MEDIUM' | 'HIGH';
    priority_score: number;
    category: 'performance' | 'reliability';
    code_example: string | null;
    affected_node_ids: string[];
    time_saved_ms?: number;
  }>;
  summary: {
    total_recommendations: number;
    by_category: Record<string, number>;
    by_impact: Record<string, number>;
  };
}

interface ErrorAnalysisResponse {
  clusters: Array<{
    cluster_id: string;
    error_count: number;
    pattern: string;
    severity: string;
    sample_message: string;
  }>;
  summary: {
    total_errors: number;
    total_clusters: number;
  };
}
```

## IMPLEMENTATION STRATEGY

### Step 1: Create API Client
```typescript
// lib/api/analysis.ts

export async function fetchAnalysisData(
  workflowId: string,
  executionId: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  
  const [criticalPath, bottlenecks, errors, recommendations] = await Promise.all([
    fetch(`${baseUrl}/api/workflows/${workflowId}/executions/${executionId}/critical-path`),
    fetch(`${baseUrl}/api/workflows/${workflowId}/executions/${executionId}/bottlenecks`),
    fetch(`${baseUrl}/api/workflows/${workflowId}/executions/${executionId}/error-analysis`),
    fetch(`${baseUrl}/api/workflows/${workflowId}/executions/${executionId}/recommendations`)
  ]);

  return {
    criticalPath: await criticalPath.json(),
    bottlenecks: await bottlenecks.json(),
    errors: await errors.json(),
    recommendations: await recommendations.json()
  };
}
```

### Step 2: Build Main Dashboard Component
- Use `useEffect` to fetch data on mount
- Store in component state
- Show loading state while fetching
- Render sub-components with data

### Step 3: Build Sub-Components
- Start with simple display components (cards, lists)
- Add interactivity (click handlers, filters)
- Apply styling (colors, spacing, responsive)
- Test with real data

### Step 4: Add Code Highlighting
Install dependencies:
```bash
npm install react-syntax-highlighter @types/react-syntax-highlighter
```

Use in component:
```typescript
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

<SyntaxHighlighter language="javascript" style={vscDarkPlus}>
  {code}
</SyntaxHighlighter>
```

## TESTING

### Start Services
```bash
# Terminal 1: Backend
cd ~/dev/signalflow/backend
python3 -m uvicorn src.main:app --reload --port 8000

# Terminal 2: Frontend
cd ~/dev/signalflow/frontend
npm run dev
```

### Test URLs
```
# Navigate to
http://localhost:3000/execution/09f2d02b-2137-4da8-8e68-cd15535bee3f/analysis

# Should show:
- 50 nodes on critical path (96%)
- 5 severe bottlenecks
- 3 recommendations
- 0 errors (clean execution)
```

### Manual Checks
- [ ] Page loads without errors
- [ ] All 4 APIs return data
- [ ] Critical path highlighted
- [ ] Bottlenecks color-coded
- [ ] Recommendations sorted
- [ ] Filters work
- [ ] Evidence drawer opens
- [ ] Code examples render
- [ ] Mobile responsive

## SUCCESS CRITERIA

✅ Dashboard page at `/execution/[id]/analysis`  
✅ All 4 APIs integrated  
✅ Critical path overlay working  
✅ Bottleneck color coding correct  
✅ Recommendations sortable/filterable  
✅ Evidence drawer functional  
✅ Code examples highlighted  
✅ Mobile responsive (320px+)  
✅ Loading states present  
✅ Error handling working

## DEPENDENCIES

**Already Installed** (from Weeks 1-2):
- Next.js 14
- TypeScript
- Tailwind CSS
- React Flow (for graph)

**Need to Install**:
```bash
npm install react-syntax-highlighter @types/react-syntax-highlighter
```

## NOTES

- Backend APIs are already working and tested
- Test execution has clean data (0 errors, 3 recommendations)
- Use existing execution graph from Weeks 1-2, just add overlays
- Focus on evidence-first presentation (clickable proof)
- Keep it simple - this is V1, don't over-engineer

Follow the spec precisely - it contains complete component examples, API types, and styling patterns. Implement components incrementally and test with real data as you go.
