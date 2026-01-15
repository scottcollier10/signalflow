# Week 3 Days 6-7: Frontend Analysis Dashboard - Implementation Spec

**Version**: 1.0  
**Date**: January 12, 2026  
**Status**: Ready for Implementation  
**Estimated Time**: 7-9 hours

---

## Table of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [Component Architecture](#component-architecture)
4. [API Integration](#api-integration)
5. [Visual Design](#visual-design)
6. [Interactions](#interactions)
7. [Implementation Guide](#implementation-guide)
8. [Testing Strategy](#testing-strategy)

---

## Overview

### Purpose

Build a comprehensive analysis dashboard that displays all Week 3 analysis results (critical path, bottlenecks, error clustering, recommendations) in an intuitive, actionable UI that follows the evidence-first philosophy.

### Goals

1. **Visibility**: Make all analysis insights immediately scannable
2. **Evidence**: Provide clickable proof for every claim
3. **Action**: Enable users to quickly understand and act on recommendations
4. **Context**: Show how different analyses relate to each other

### Non-Goals

- Real-time analysis (data is pre-computed)
- Workflow editing (read-only dashboard)
- Historical comparison (V1 scope: single execution)

---

## Requirements

### Functional Requirements

**FR1**: Display critical path overlay on execution graph  
**FR2**: Show bottleneck scores with severity-based color coding  
**FR3**: List recommendations sorted by priority score  
**FR4**: Show error clusters (when present) with pattern detection  
**FR5**: Enable evidence drill-down with clickable links  
**FR6**: Display code examples with syntax highlighting  
**FR7**: Filter recommendations by category, impact, effort  
**FR8**: Sort recommendations by priority, impact, time saved  

### Non-Functional Requirements

**NFR1**: Page load time <2s on 3G connection  
**NFR2**: Mobile responsive (320px - 1920px)  
**NFR3**: Accessible (WCAG 2.1 AA)  
**NFR4**: Loading states for all async operations  
**NFR5**: Graceful degradation when APIs fail  

---

## Component Architecture

### Page Structure

```
/execution/[id]/analysis
  ├── Header (execution info)
  ├── Navigation Tabs
  │   ├── Overview (default)
  │   ├── Critical Path
  │   ├── Bottlenecks
  │   ├── Errors
  │   └── Recommendations
  ├── Main Content Area
  │   ├── Executive Summary (Overview tab)
  │   ├── Execution Graph + Overlays
  │   ├── Analysis Sections (conditional)
  │   └── Recommendations List
  └── Evidence Drawer (slide-out)
```

### Component Hierarchy

```typescript
AnalysisDashboard (page)
├── AnalysisHeader
│   ├── ExecutionMetadata
│   └── TabNavigation
├── AnalysisOverview (tab: overview)
│   ├── ExecutiveSummary
│   ├── KeyMetrics
│   └── QuickInsights
├── CriticalPathView (tab: critical-path)
│   ├── ExecutionGraph
│   ├── CriticalPathOverlay
│   └── PathStatistics
├── BottleneckView (tab: bottlenecks)
│   ├── ExecutionGraph
│   ├── BottleneckOverlay
│   └── BottleneckList
│       └── BottleneckCard (repeated)
├── ErrorView (tab: errors)
│   ├── ErrorClustersSection
│   │   └── ErrorClusterCard (repeated)
│   └── ErrorPatternSummary
├── RecommendationsView (tab: recommendations)
│   ├── FilterControls
│   ├── RecommendationsList
│   │   └── RecommendationCard (repeated)
│   │       ├── RecommendationHeader
│   │       ├── ImpactDisplay
│   │       ├── EvidencePreview
│   │       └── ActionButtons
│   └── RecommendationStats
└── EvidenceDrawer (global)
    ├── EvidenceList
    │   └── EvidenceItem (repeated)
    ├── CodeExampleBlock
    └── RelatedNodes
```

---

## API Integration

### Endpoints

All endpoints return standardized responses:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
```

#### 1. Critical Path API

**Endpoint**: `GET /api/workflows/{workflowId}/executions/{executionId}/critical-path`

**Response**:
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
    contains_error: boolean;
  };
}
```

#### 2. Bottlenecks API

**Endpoint**: `GET /api/workflows/{workflowId}/executions/{executionId}/bottlenecks`

**Query Params**: `limit`, `severity`, `min_score`

**Response**:
```typescript
interface BottlenecksResponse {
  bottlenecks: Array<{
    node_id: string;
    node_name: string;
    node_type: string;
    bottleneck_score: number;
    total_duration_ms: number;
    is_on_critical_path: boolean;
    severity: 'low' | 'medium' | 'high' | 'severe';
    factors: {
      duration_factor: number;
      position_factor: number;
      frequency_factor: number;
      variance_factor: number;
    };
  }>;
  summary: {
    total_nodes_analyzed: number;
    bottlenecks_by_severity: {
      severe: number;
      high: number;
      medium: number;
      low: number;
    };
  };
}
```

#### 3. Error Analysis API

**Endpoint**: `GET /api/workflows/{workflowId}/executions/{executionId}/error-analysis`

**Response**:
```typescript
interface ErrorAnalysisResponse {
  clusters: Array<{
    cluster_id: string;
    error_count: number;
    pattern: 'timeout' | 'auth_failure' | 'rate_limit' | 'network' | 'validation' | 'unknown';
    severity: 'critical' | 'high' | 'medium' | 'low';
    avg_similarity: number;
    sample_message: string;
    affected_nodes: string[];
  }>;
  summary: {
    total_errors: number;
    total_clusters: number;
    critical_count: number;
  };
}
```

#### 4. Recommendations API

**Endpoint**: `GET /api/workflows/{workflowId}/executions/{executionId}/recommendations`

**Response**:
```typescript
interface RecommendationsResponse {
  recommendations: Array<{
    id: string;
    rule_id: number;
    title: string;
    description: string;
    evidence: Array<{
      type: 'bottleneck' | 'critical_path' | 'error_cluster' | 'error_pattern';
      description: string;
      data: Record<string, any>;
      link: string;
    }>;
    impact: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    impact_details: string;
    effort: 'LOW' | 'MEDIUM' | 'HIGH';
    priority_score: number;
    category: 'performance' | 'reliability';
    code_example: string | null;
    affected_node_ids: string[];
    time_saved_ms?: number;
    error_count?: number;
  }>;
  summary: {
    total_recommendations: number;
    by_category: Record<string, number>;
    by_impact: Record<string, number>;
    top_priority: Recommendation | null;
  };
}
```

### Data Fetching Strategy

```typescript
// lib/api/analysis.ts

export async function fetchAnalysisData(
  workflowId: string,
  executionId: string
) {
  try {
    // Fetch all analyses in parallel
    const [criticalPath, bottlenecks, errors, recommendations] = await Promise.all([
      fetch(`${API_URL}/workflows/${workflowId}/executions/${executionId}/critical-path`),
      fetch(`${API_URL}/workflows/${workflowId}/executions/${executionId}/bottlenecks`),
      fetch(`${API_URL}/workflows/${workflowId}/executions/${executionId}/error-analysis`),
      fetch(`${API_URL}/workflows/${workflowId}/executions/${executionId}/recommendations`)
    ]);

    // Parse responses
    const data = {
      criticalPath: await criticalPath.json(),
      bottlenecks: await bottlenecks.json(),
      errors: await errors.json(),
      recommendations: await recommendations.json()
    };

    // Validate all succeeded
    const allSuccessful = Object.values(data).every(d => d.success);
    
    if (!allSuccessful) {
      throw new Error('One or more analysis APIs failed');
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch analysis data:', error);
    throw error;
  }
}
```

---

## Visual Design

### Color Palette

#### Bottleneck Severity Colors
```typescript
const SEVERITY_COLORS = {
  severe: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    badge: 'bg-red-100 text-red-800'
  },
  high: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    badge: 'bg-orange-100 text-orange-800'
  },
  medium: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-800'
  },
  low: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-800'
  }
};
```

#### Impact Level Colors
```typescript
const IMPACT_COLORS = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-300',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  LOW: 'bg-green-100 text-green-800 border-green-300'
};
```

#### Category Colors
```typescript
const CATEGORY_COLORS = {
  performance: 'bg-blue-100 text-blue-800',
  reliability: 'bg-purple-100 text-purple-800'
};
```

### Typography

```typescript
const TYPOGRAPHY = {
  pageTitle: 'text-2xl font-bold text-gray-900',
  sectionTitle: 'text-xl font-semibold text-gray-800',
  cardTitle: 'text-lg font-medium text-gray-900',
  body: 'text-base text-gray-700',
  small: 'text-sm text-gray-600',
  code: 'font-mono text-sm'
};
```

### Layout Grid

```typescript
// Desktop: 12-column grid
// Mobile: Single column, full width

const GRID = {
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  twoColumn: 'grid grid-cols-1 lg:grid-cols-2 gap-6',
  threeColumn: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
  sidebar: 'w-full lg:w-64 flex-shrink-0'
};
```

---

## Interactions

### Navigation Flow

1. **Landing**: User arrives at `/execution/{id}/analysis`
2. **Default View**: Overview tab showing executive summary
3. **Tab Navigation**: Click tabs to view different analyses
4. **Evidence Drill-Down**: Click evidence link → drawer opens with details
5. **Node Highlighting**: Click node reference → graph highlights node
6. **Filter/Sort**: Adjust controls → list updates

### State Management

```typescript
// app/execution/[id]/analysis/page.tsx

interface AnalysisState {
  // Data
  criticalPath: CriticalPathResponse | null;
  bottlenecks: BottlenecksResponse | null;
  errors: ErrorAnalysisResponse | null;
  recommendations: RecommendationsResponse | null;
  
  // UI State
  activeTab: 'overview' | 'critical-path' | 'bottlenecks' | 'errors' | 'recommendations';
  selectedRecommendation: Recommendation | null;
  evidenceDrawerOpen: boolean;
  highlightedNodeId: string | null;
  
  // Filters
  filters: {
    category: 'all' | 'performance' | 'reliability';
    impact: 'all' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    effort: 'all' | 'LOW' | 'MEDIUM' | 'HIGH';
  };
  sortBy: 'priority' | 'impact' | 'effort' | 'time_saved';
  
  // Loading
  isLoading: boolean;
  error: string | null;
}
```

### User Actions

**UA1: View Recommendation Details**
- Trigger: Click recommendation card
- Action: Open evidence drawer with full details
- Result: Drawer slides in from right with evidence, code example

**UA2: Filter Recommendations**
- Trigger: Select filter option
- Action: Update filter state, re-render list
- Result: List shows only matching recommendations

**UA3: Highlight Node on Graph**
- Trigger: Click evidence link or node reference
- Action: Scroll to graph, highlight node, pulse animation
- Result: Node visually emphasized for 2s

**UA4: View Code Example**
- Trigger: Click "View Code" button
- Action: Expand code example section
- Result: Syntax-highlighted code block appears

---

## Implementation Guide

### Day 6: Core Dashboard (4-5 hours)

#### Step 1: Create Page Route (30 min)

```typescript
// app/execution/[id]/analysis/page.tsx

import { fetchAnalysisData } from '@/lib/api/analysis';
import AnalysisDashboard from '@/components/analysis/AnalysisDashboard';

export default async function AnalysisPage({
  params
}: {
  params: { id: string }
}) {
  // Fetch execution metadata first
  const execution = await fetchExecution(params.id);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <AnalysisDashboard 
        workflowId={execution.workflow_id}
        executionId={params.id}
      />
    </div>
  );
}
```

#### Step 2: Build AnalysisDashboard Component (1 hour)

```typescript
// components/analysis/AnalysisDashboard.tsx

'use client';

import { useState, useEffect } from 'react';
import { fetchAnalysisData } from '@/lib/api/analysis';

export default function AnalysisDashboard({
  workflowId,
  executionId
}: {
  workflowId: string;
  executionId: string;
}) {
  const [state, setState] = useState<AnalysisState>({
    // ... initial state
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchAnalysisData(workflowId, executionId);
        setState(prev => ({
          ...prev,
          ...data,
          isLoading: false
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: 'Failed to load analysis data',
          isLoading: false
        }));
      }
    };
    
    loadData();
  }, [workflowId, executionId]);

  if (state.isLoading) {
    return <LoadingState />;
  }

  if (state.error) {
    return <ErrorState error={state.error} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <AnalysisHeader 
        activeTab={state.activeTab}
        onTabChange={(tab) => setState(prev => ({ ...prev, activeTab: tab }))}
      />
      
      {state.activeTab === 'overview' && (
        <AnalysisOverview data={state} />
      )}
      
      {state.activeTab === 'critical-path' && (
        <CriticalPathView data={state.criticalPath} />
      )}
      
      {state.activeTab === 'bottlenecks' && (
        <BottleneckView data={state.bottlenecks} />
      )}
      
      {state.activeTab === 'errors' && (
        <ErrorView data={state.errors} />
      )}
      
      {state.activeTab === 'recommendations' && (
        <RecommendationsView 
          data={state.recommendations}
          filters={state.filters}
          sortBy={state.sortBy}
          onFilterChange={(filters) => setState(prev => ({ ...prev, filters }))}
          onSortChange={(sortBy) => setState(prev => ({ ...prev, sortBy }))}
        />
      )}
      
      <EvidenceDrawer 
        open={state.evidenceDrawerOpen}
        recommendation={state.selectedRecommendation}
        onClose={() => setState(prev => ({ 
          ...prev, 
          evidenceDrawerOpen: false,
          selectedRecommendation: null
        }))}
      />
    </div>
  );
}
```

#### Step 3: Build CriticalPathOverlay (1 hour)

```typescript
// components/analysis/CriticalPathOverlay.tsx

import { useReactFlow } from 'reactflow';

export default function CriticalPathOverlay({
  pathNodes
}: {
  pathNodes: Array<{ node_id: string }>;
}) {
  const { setNodes } = useReactFlow();
  
  useEffect(() => {
    // Highlight nodes on critical path
    setNodes((nodes) => 
      nodes.map(node => ({
        ...node,
        style: {
          ...node.style,
          border: pathNodes.some(p => p.node_id === node.id)
            ? '3px solid #ef4444' // red-500
            : '1px solid #d1d5db' // gray-300
        }
      }))
    );
  }, [pathNodes]);
  
  return (
    <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-4 border-red-500 rounded" />
        <span className="text-sm font-medium">Critical Path</span>
      </div>
      <p className="text-xs text-gray-600 mt-1">
        {pathNodes.length} nodes blocking completion
      </p>
    </div>
  );
}
```

#### Step 4: Build BottleneckPanel (1 hour)

```typescript
// components/analysis/BottleneckPanel.tsx

export default function BottleneckPanel({
  bottlenecks
}: {
  bottlenecks: Bottleneck[];
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Top Bottlenecks</h2>
      
      <div className="grid gap-3">
        {bottlenecks.slice(0, 5).map(bottleneck => (
          <BottleneckCard key={bottleneck.node_id} bottleneck={bottleneck} />
        ))}
      </div>
    </div>
  );
}

function BottleneckCard({ bottleneck }: { bottleneck: Bottleneck }) {
  const severityColors = getSeverityColors(bottleneck.severity);
  
  return (
    <div className={`p-4 rounded-lg border-2 ${severityColors.bg} ${severityColors.border}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900">{bottleneck.node_name}</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${severityColors.badge}`}>
              {bottleneck.bottleneck_score}/100
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {formatDuration(bottleneck.total_duration_ms)}
          </p>
        </div>
        
        {bottleneck.is_on_critical_path && (
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
            Critical Path
          </span>
        )}
      </div>
    </div>
  );
}
```

#### Step 5: Build RecommendationsList (1.5 hours)

```typescript
// components/analysis/RecommendationsList.tsx

export default function RecommendationsList({
  recommendations,
  filters,
  sortBy,
  onSelectRecommendation
}: {
  recommendations: Recommendation[];
  filters: Filters;
  sortBy: SortOption;
  onSelectRecommendation: (rec: Recommendation) => void;
}) {
  // Filter recommendations
  const filtered = recommendations.filter(rec => {
    if (filters.category !== 'all' && rec.category !== filters.category) return false;
    if (filters.impact !== 'all' && rec.impact !== filters.impact) return false;
    if (filters.effort !== 'all' && rec.effort !== filters.effort) return false;
    return true;
  });
  
  // Sort recommendations
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        return b.priority_score - a.priority_score;
      case 'time_saved':
        return (b.time_saved_ms || 0) - (a.time_saved_ms || 0);
      default:
        return 0;
    }
  });
  
  if (sorted.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No recommendations match your filters</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {sorted.map(rec => (
        <RecommendationCard 
          key={rec.id}
          recommendation={rec}
          onClick={() => onSelectRecommendation(rec)}
        />
      ))}
    </div>
  );
}
```

### Day 7: Interactions + Polish (3-4 hours)

#### Step 6: Build EvidenceDrawer (1.5 hours)

```typescript
// components/analysis/EvidenceDrawer.tsx

export default function EvidenceDrawer({
  open,
  recommendation,
  onClose
}: {
  open: boolean;
  recommendation: Recommendation | null;
  onClose: () => void;
}) {
  if (!recommendation) return null;
  
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div className={`
        fixed top-0 right-0 h-full w-full md:w-2/3 lg:w-1/2 
        bg-white shadow-xl z-50
        transform transition-transform duration-300
        ${open ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="p-6 h-full overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {recommendation.title}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <PriorityBadge score={recommendation.priority_score} />
                <ImpactBadge impact={recommendation.impact} />
                <CategoryBadge category={recommendation.category} />
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
          
          {/* Description */}
          <div className="mb-6">
            <p className="text-gray-700">{recommendation.description}</p>
          </div>
          
          {/* Impact Details */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Expected Impact</h3>
            <p className="text-blue-700">{recommendation.impact_details}</p>
            {recommendation.time_saved_ms && (
              <p className="text-sm text-blue-600 mt-1">
                Time saved: {formatDuration(recommendation.time_saved_ms)}
              </p>
            )}
          </div>
          
          {/* Evidence */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Evidence</h3>
            <div className="space-y-3">
              {recommendation.evidence.map((ev, idx) => (
                <EvidenceItem key={idx} evidence={ev} />
              ))}
            </div>
          </div>
          
          {/* Code Example */}
          {recommendation.code_example && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Code Example</h3>
              <CodeExampleBlock code={recommendation.code_example} />
            </div>
          )}
          
          {/* Affected Nodes */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Affected Nodes</h3>
            <div className="space-y-2">
              {recommendation.affected_node_ids.map(nodeId => (
                <NodeLink key={nodeId} nodeId={nodeId} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
```

#### Step 7: Add CodeExampleBlock (30 min)

```typescript
// components/analysis/CodeExampleBlock.tsx

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

export default function CodeExampleBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      
      <SyntaxHighlighter
        language="javascript"
        style={vscDarkPlus}
        customStyle={{
          borderRadius: '0.5rem',
          padding: '1rem',
          fontSize: '0.875rem'
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
```

#### Step 8: Build FilterControls (30 min)

```typescript
// components/analysis/FilterControls.tsx

export default function FilterControls({
  filters,
  sortBy,
  onFilterChange,
  onSortChange
}: {
  filters: Filters;
  sortBy: SortOption;
  onFilterChange: (filters: Filters) => void;
  onSortChange: (sortBy: SortOption) => void;
}) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-wrap gap-4">
        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={filters.category}
            onChange={(e) => onFilterChange({ ...filters, category: e.target.value as any })}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="all">All</option>
            <option value="performance">Performance</option>
            <option value="reliability">Reliability</option>
          </select>
        </div>
        
        {/* Impact Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Impact
          </label>
          <select
            value={filters.impact}
            onChange={(e) => onFilterChange({ ...filters, impact: e.target.value as any })}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="all">All</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
        
        {/* Effort Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Effort
          </label>
          <select
            value={filters.effort}
            onChange={(e) => onFilterChange({ ...filters, effort: e.target.value as any })}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="all">All</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        
        {/* Sort */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="priority">Priority</option>
            <option value="impact">Impact</option>
            <option value="effort">Effort</option>
            <option value="time_saved">Time Saved</option>
          </select>
        </div>
      </div>
    </div>
  );
}
```

#### Step 9: Mobile Responsive Design (1 hour)

Apply responsive classes throughout:

```typescript
// Example responsive patterns

// Container
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

// Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Text
<h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">

// Flex
<div className="flex flex-col md:flex-row gap-4">

// Padding
<div className="p-4 sm:p-6 lg:p-8">
```

#### Step 10: Loading & Error States (30 min)

```typescript
// components/analysis/LoadingState.tsx

export function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading analysis...</p>
      </div>
    </div>
  );
}

// components/analysis/ErrorState.tsx

export function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md">
        <div className="text-red-600 text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Failed to Load Analysis
        </h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
```

---

## Testing Strategy

### Manual Testing Checklist

- [ ] Page loads without errors
- [ ] All 4 APIs return data
- [ ] Critical path nodes highlighted
- [ ] Bottlenecks display with correct colors
- [ ] Recommendations sorted by priority
- [ ] Evidence drawer opens/closes
- [ ] Code examples render correctly
- [ ] Filters work as expected
- [ ] Sort options work
- [ ] Mobile layout looks good (test 320px, 768px, 1920px)
- [ ] Loading states show during fetch
- [ ] Error states handle API failures

### Test with Real Data

```bash
WF_ID="6a71673e-623d-42c9-a7c5-09e8acda50f4"
EXEC_ID="09f2d02b-2137-4da8-8e68-cd15535bee3f"

# Navigate to
http://localhost:3000/execution/$EXEC_ID/analysis

# Expected results:
# - 50 nodes highlighted on critical path
# - 5 severe bottlenecks shown
# - 3 recommendations listed
# - 0 errors (clean execution)
```

### Edge Cases

1. **No recommendations**: Show empty state
2. **No errors**: Show success message
3. **API timeout**: Show error state with retry
4. **Very long node names**: Truncate with ellipsis
5. **Many recommendations** (20+): Pagination or infinite scroll

---

## Success Criteria

✅ Dashboard accessible at `/execution/[id]/analysis`  
✅ All APIs integrated and working  
✅ Visual design matches spec  
✅ All interactions functional  
✅ Mobile responsive  
✅ Loading/error states present  
✅ Accessible (keyboard navigation, screen readers)

---

## Appendix: Utility Functions

```typescript
// lib/utils/formatting.ts

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

export function getSeverityColors(severity: string) {
  // Returns Tailwind classes for severity level
}

export function getPriorityBadgeColor(score: number) {
  // Returns color based on priority score
}

export function truncate(text: string, length: number) {
  return text.length > length ? text.slice(0, length) + '...' : text;
}
```

---

**END OF SPECIFICATION**

This comprehensive spec provides everything needed to build a production-ready analysis dashboard in 7-9 hours of focused work.
