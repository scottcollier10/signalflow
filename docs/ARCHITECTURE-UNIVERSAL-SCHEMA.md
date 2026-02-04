# SignalFlow Architecture: Universal Schema Strategy

**Created:** January 23, 2026
**Purpose:** Future-proof data model for multi-platform workflow observability
**Status:** Strategic Planning

---

## Executive Summary

SignalFlow's current value is tightly coupled to n8n, but the core capabilities—execution graph reconstruction, critical path analysis, and bottleneck detection—are platform-agnostic.

To expand beyond n8n (Make, Zapier, Temporal, LangChain, custom orchestrators), we need a universal schema that can represent diverse execution models without platform-specific leakage into the analysis layer.

**Key insight:** Separate the execution container (Run) from the work units (Spans).

---

## Market Context

### n8n Market Position (2025)
- ~230k active users, growing rapidly
- ~5% of automation market (Zapier ~60%, Make ~20%)
- $40M ARR, $2.5B valuation
- Strong developer community, underserved by tooling

### Expansion Opportunities
1. **Multi-orchestrator observability** - "Datadog for workflows"
2. **AI workflow/agent pipeline tooling** - LLM cost and latency analysis
3. **Agency/consultancy vertical** - Multi-client portfolio analytics

### Strategic Positioning
- **Now:** n8n wedge (build credibility, testimonials)
- **6-12 months:** Multi-platform (Make, Zapier adapters)
- **12-18 months:** AI/agent pipelines (LangChain, Temporal)

---

## Universal Schema Design

### Design Principles

1. **Run vs Span separation** - Container and work units are distinct
2. **Retry-aware** - First-class support for attempts
3. **Hierarchy-aware** - Subflows/child workflows supported
4. **Cost-aware** - LLM and API costs tracked per span
5. **Platform-agnostic core** - Platform details in metadata, not schema
6. **Dual dependency model** - Static graph edges + runtime causality

### Core Types
```typescript
/**
 * ExecutionRun: One workflow execution across any platform
 * 
 * Maps to:
 * - n8n: Workflow execution
 * - Zapier: Zap run
 * - Make: Scenario execution
 * - Temporal: Workflow execution
 * - LangChain: Chain invocation
 */
interface ExecutionRun {
  // Identity
  runId: string;              // Platform-specific execution ID
  workflowId: string;         // Logical workflow/zap/scenario ID
  workflowName?: string;      // Human-readable name
  
  // Platform
  platform: Platform;
  platformVersion?: string;   // e.g., "n8n@1.24.0"
  
  // Timing (milliseconds since epoch)
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  
  // Status
  status: RunStatus;
  errorMessage?: string;
  
  // Hierarchy
  parentRunId?: string;       // For subflows/child workflows
  rootRunId?: string;         // Ultimate parent (for deep nesting)
  
  // Metadata
  triggerType?: string;       // "webhook", "schedule", "manual", etc.
  metadata?: Record<string, any>;
}

type Platform = 
  | "n8n" 
  | "zapier" 
  | "make" 
  | "temporal" 
  | "langchain"
  | "langgraph"
  | "prefect"
  | "airflow"
  | "custom";

type RunStatus = 
  | "running"
  | "success" 
  | "error" 
  | "cancelled" 
  | "timeout"
  | "waiting";


/**
 * ExecutionSpan: A single unit of work within a run
 * 
 * Maps to:
 * - n8n: Node execution
 * - Zapier: Step execution
 * - Make: Module execution
 * - Temporal: Activity attempt
 * - LangChain: Chain step / LLM call
 */
interface ExecutionSpan {
  // Identity
  id: string;                 // Unique span ID
  runId: string;              // FK → ExecutionRun.runId
  
  // Node identity (static graph position)
  nodeId: string;             // Logical node ID in workflow
  nodeName: string;           // Human-readable name
  nodeType: NodeType;         // Normalized type
  nodeTypeRaw?: string;       // Platform-specific type (e.g., "n8n-nodes-base.httpRequest")
  
  // Execution
  attempt: number;            // 1, 2, 3... for retries
  startTime: number;          // Milliseconds since epoch
  endTime: number;
  durationMs: number;
  
  // Status
  status: SpanStatus;
  errorMessage?: string;
  errorType?: string;         // "timeout", "rate_limit", "auth", etc.
  
  // Resource metrics
  inputSizeBytes?: number;
  outputSizeBytes?: number;
  
  // Cost tracking (critical for LLM/API calls)
  cost?: CostInfo;
  
  // Dependencies
  upstreamNodeIds: string[];  // Static graph edges (from workflow definition)
  upstreamSpanIds?: string[]; // Runtime causal parents (actual execution order)
  
  // Classification
  tags?: string[];            // e.g., ["llm:claude-3", "external:true"]
  onCriticalPath?: boolean;   // Set by analysis
  
  // Platform-specific
  metadata?: Record<string, any>;
}

type NodeType = 
  // Triggers
  | "trigger"
  | "webhook"
  | "schedule"
  // I/O
  | "http"
  | "database"
  | "file"
  | "queue"
  // Logic
  | "code"
  | "transform"
  | "filter"
  | "switch"
  | "merge"
  | "loop"
  // AI
  | "llm"
  | "embedding"
  | "vector_search"
  | "agent"
  // External
  | "external_service"
  | "subflow"
  // Other
  | "unknown";

type SpanStatus = 
  | "scheduled"
  | "started"
  | "running"
  | "success"
  | "error"
  | "timeout"
  | "cancelled"
  | "waiting"
  | "skipped";


/**
 * CostInfo: Normalized cost tracking
 */
interface CostInfo {
  totalUsd: number;           // Total cost in USD
  breakdown?: {
    inputTokens?: number;
    outputTokens?: number;
    inputCostUsd?: number;
    outputCostUsd?: number;
    apiCallCostUsd?: number;
  };
  model?: string;             // e.g., "claude-3-opus", "gpt-4"
  provider?: string;          // e.g., "anthropic", "openai"
}
```

### Platform Adapters

Each platform needs an adapter that translates native format to universal schema:
```typescript
interface PlatformAdapter {
  platform: Platform;
  
  // Parse raw execution data into universal format
  parseRun(raw: any): ExecutionRun;
  parseSpans(raw: any, runId: string): ExecutionSpan[];
  
  // Extract workflow graph (for static dependency analysis)
  parseWorkflowGraph?(raw: any): WorkflowGraph;
}

// Example: n8n adapter
class N8nAdapter implements PlatformAdapter {
  platform = "n8n" as const;
  
  parseRun(executionJson: N8nExecution): ExecutionRun {
    return {
      runId: executionJson.id,
      workflowId: executionJson.workflowId,
      workflowName: executionJson.workflowData?.name,
      platform: "n8n",
      startedAt: new Date(executionJson.startedAt).getTime(),
      endedAt: executionJson.stoppedAt 
        ? new Date(executionJson.stoppedAt).getTime() 
        : undefined,
      status: this.mapStatus(executionJson.status),
      metadata: {
        mode: executionJson.mode,
        retryOf: executionJson.retryOf,
      }
    };
  }
  
  parseSpans(executionJson: N8nExecution, runId: string): ExecutionSpan[] {
    // Walk executionJson.data.resultData.runData
    // Create one span per node execution
    // Handle itemIndex for loop iterations
  }
}
```

### Adapter Roadmap

| Platform | Priority | Complexity | Notes |
|----------|----------|------------|-------|
| n8n | ✅ Done | Medium | Current implementation |
| Make | High | Medium | Similar model to n8n |
| Zapier | High | Low | Simpler, linear workflows |
| Temporal | Medium | High | Multi-event activities, complex retry semantics |
| LangChain | Medium | Medium | Nested chains, callbacks |
| Prefect | Low | Medium | Python orchestrator |
| Airflow | Low | High | Complex DAGs, XComs |

---

## Analysis Layer

The analysis layer operates on the universal schema, not platform-specific data:
```typescript
interface AnalysisEngine {
  // Critical path analysis
  computeCriticalPath(run: ExecutionRun, spans: ExecutionSpan[]): CriticalPathResult;
  
  // Bottleneck detection
  detectBottlenecks(run: ExecutionRun, spans: ExecutionSpan[]): Bottleneck[];
  
  // Error clustering
  clusterErrors(spans: ExecutionSpan[]): ErrorCluster[];
  
  // Recommendations
  generateRecommendations(
    run: ExecutionRun, 
    spans: ExecutionSpan[],
    bottlenecks: Bottleneck[]
  ): Recommendation[];
}
```

**Key insight:** Because analysis operates on universal schema, adding a new platform only requires writing an adapter—zero changes to analysis logic.

---

## Data Normalization Rules

### Time
- All timestamps: milliseconds since Unix epoch
- All durations: milliseconds
- Timezone: UTC

### Cost
- All costs: USD
- LLM costs: Include token breakdown when available
- API costs: Per-call cost if known

### Node Types
- Normalize to curated vocabulary
- Preserve raw type in `nodeTypeRaw`
- Use tags for additional classification

### Dependencies
- `upstreamNodeIds`: Static edges from workflow definition
- `upstreamSpanIds`: Runtime causality (for accurate critical path)

---

## Migration Path

### Phase 1: Refactor Current Normalizer (Week 6-7)
1. Extract n8n-specific code into `N8nAdapter`
2. Define `ExecutionRun` and `ExecutionSpan` interfaces
3. Refactor analysis to use universal types
4. Verify all existing tests pass

### Phase 2: Add Make Adapter (Week 8-9)
1. Research Make execution log format
2. Implement `MakeAdapter`
3. Test with real Make scenarios
4. Verify analysis produces valid results

### Phase 3: Add Cost Tracking (Week 10)
1. Extend span schema with `CostInfo`
2. Add LLM cost extraction to n8n adapter
3. Build cost analysis views in UI

### Phase 4: Temporal/LangChain (Month 4+)
1. Research execution formats
2. Implement adapters
3. Handle complex retry/event semantics

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Adapter implementation time | < 1 week per platform |
| Analysis code changes for new platform | Zero |
| Schema breaking changes | Zero after v1 |
| Platform-specific leakage in analysis | Zero |

---

## Open Questions

1. **Versioning:** How do we handle schema evolution?
2. **Storage:** Optimize for time-series queries (spans) vs graph queries (dependencies)?
3. **Real-time:** Support streaming span ingestion for live debugging?
4. **Aggregation:** How to efficiently compute cross-run statistics?

---

## References

- Perplexity market analysis (January 2026)
- n8n execution data format documentation
- OpenTelemetry trace/span model (inspiration)
- Temporal event history documentation

---

**Document Status:** Strategic planning
**Next Review:** After Week 5 completion