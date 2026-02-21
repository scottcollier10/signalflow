// Real Executive Pulse workflow comparison data
export const comparisonData = {
  workflow_name: "Executive Pulse V2",

  before: {
    execution_id: "4671",
    timestamp: "Jan 29, 1:30 PM",
    duration: 13100,  // 13.1 seconds
    status: "success",
    node_count: 72,
    bottlenecks: {
      severe: 2,
      high: 3,
      medium: 5,
      total: 10
    },
    recommendations: 6,
    critical_path: {
      duration: 13100,
      nodes: 7,
      coverage: 100
    }
  },

  after: {
    execution_id: "4733",
    timestamp: "Jan 29, 1:50 PM",
    duration: 1600,  // 1.6 seconds
    status: "success",
    node_count: 72,
    bottlenecks: {
      severe: 0,
      high: 0,
      medium: 0,
      total: 0
    },
    recommendations: 0,
    critical_path: {
      duration: 1600,
      nodes: 7,
      coverage: 100
    }
  },

  delta: {
    duration_saved: 11500,
    pct_improvement: 87.8,
    bottlenecks_resolved: 10,
    verdict: "Excellent optimization"
  },

  top_improvements: [
    {
      node_name: "delete_existing_data",
      before_duration: 11000,
      after_duration: 8,
      saved: 10992,
      pct_improvement: 99.93,
      bottleneck_before: 95,
      bottleneck_after: 0,
      impact: "Removed from critical path"
    },
    {
      node_name: "get_previous_week_values",
      before_duration: 1500,
      after_duration: 100,
      saved: 1400,
      pct_improvement: 93.3,
      bottleneck_before: 64,
      bottleneck_after: 0,
      impact: "Significant speedup"
    },
    {
      node_name: "claude_api_call",
      before_duration: 500,
      after_duration: 350,
      saved: 150,
      pct_improvement: 30,
      bottleneck_before: 55,
      bottleneck_after: 0,
      impact: "Moderate improvement"
    }
  ]
};

// Helper to format duration
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// Helper to format percentage
export function formatPct(pct: number): string {
  return `${pct.toFixed(1)}%`;
}
