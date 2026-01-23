/**
 * Claude Code Prompt Generator
 * Generates optimization prompts from SignalFlow analysis data
 */

import { Bottleneck, Recommendation, ErrorCluster } from './api/analysis';

export interface PromptGeneratorInput {
  workflowName: string;
  executionId: string;
  workflowId: string;
  durationMs: number;
  nodeCount: number;
  criticalPathNodes: number;
  criticalPathDurationMs: number;
  bottlenecks: Bottleneck[];
  recommendations: Recommendation[];
  errors?: ErrorCluster[];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function generateClaudeCodePrompt(input: PromptGeneratorInput): string {
  const {
    workflowName,
    executionId,
    workflowId,
    durationMs,
    nodeCount,
    criticalPathNodes,
    criticalPathDurationMs,
    bottlenecks,
    recommendations,
    errors,
  } = input;

  // Group recommendations by category
  // Note: Current types support 'performance' and 'reliability'. Cost is handled as performance optimization.
  const performanceRecs = recommendations.filter(r => r.category === 'performance');
  const reliabilityRecs = recommendations.filter(r => r.category === 'reliability');
  // Cost recommendations would be a subset of performance (future enhancement)
  const costRecs: Recommendation[] = [];

  // Get critical bottlenecks (severe + high only, sorted by score)
  const criticalBottlenecks = bottlenecks
    .filter(b => b.severity === 'severe' || b.severity === 'high')
    .sort((a, b) => b.bottleneck_score - a.bottleneck_score)
    .slice(0, 10);

  // Build bottleneck section
  const bottleneckSection = criticalBottlenecks.length > 0
    ? criticalBottlenecks.map((b, i) => `
${i + 1}. **${b.node_name}** (Score: ${b.bottleneck_score}/100 - ${b.severity.toUpperCase()})
   - Duration: ${formatDuration(b.total_duration_ms)}
   - Type: ${b.node_type}
   - ${b.is_on_critical_path ? '⚠️ ON CRITICAL PATH' : 'Not on critical path'}`).join('\n')
    : 'No severe or high-severity bottlenecks detected.';

  // Build performance recommendations section
  const performanceSection = performanceRecs.length > 0
    ? performanceRecs.slice(0, 10).map(r => `
- **${r.title}** (Priority: ${r.priority_score}/100)
  ${r.description}
  ${r.affected_node_ids?.length ? `Affected nodes: ${r.affected_node_ids.join(', ')}` : ''}
  ${r.time_saved_ms ? `Potential savings: ${formatDuration(r.time_saved_ms)}` : ''}`).join('\n')
    : 'No performance recommendations.';

  // Build reliability recommendations section
  const reliabilitySection = reliabilityRecs.length > 0
    ? reliabilityRecs.slice(0, 10).map(r => `
- **${r.title}** (Priority: ${r.priority_score}/100)
  ${r.description}
  ${r.affected_node_ids?.length ? `Affected nodes: ${r.affected_node_ids.join(', ')}` : ''}`).join('\n')
    : 'No reliability recommendations.';

  // Build cost recommendations section
  const costSection = costRecs.length > 0
    ? costRecs.slice(0, 10).map(r => `
- **${r.title}** (Priority: ${r.priority_score}/100)
  ${r.description}
  ${r.affected_node_ids?.length ? `Affected nodes: ${r.affected_node_ids.join(', ')}` : ''}`).join('\n')
    : 'No cost optimization recommendations.';

  // Build errors section
  const errorsSection = errors && errors.length > 0
    ? `
## ERRORS DETECTED (${errors.length} clusters)

${errors.slice(0, 5).map(e => `
- **${e.pattern.toUpperCase()}** (${e.severity}) - ${e.error_count} occurrences
  Sample: "${e.sample_message.slice(0, 100)}${e.sample_message.length > 100 ? '...' : ''}"
  Affected nodes: ${e.affected_nodes?.join(', ') || 'Unknown'}`).join('\n')}`
    : '';

  return `I need help optimizing an n8n workflow based on SignalFlow analysis results.

## WORKFLOW CONTEXT
- **Name:** ${workflowName}
- **Workflow ID:** ${workflowId}
- **Execution ID:** ${executionId}
- **Total Duration:** ${formatDuration(durationMs)}
- **Nodes:** ${nodeCount} total, ${criticalPathNodes} on critical path
- **Critical Path Duration:** ${formatDuration(criticalPathDurationMs)} (${((criticalPathDurationMs / durationMs) * 100).toFixed(0)}% of total)

## CRITICAL BOTTLENECKS (${criticalBottlenecks.length} high-impact nodes)

These nodes have the highest impact on execution time:
${bottleneckSection}

## RECOMMENDATIONS BY CATEGORY

### Performance (${performanceRecs.length} recommendations)
${performanceSection}

### Reliability (${reliabilityRecs.length} recommendations)
${reliabilitySection}

### Cost Optimization (${costRecs.length} recommendations)
${costSection}
${errorsSection}

## INSTRUCTIONS

Please help me implement these optimizations. Important guidelines:

1. **DO NOT modify business logic** - only structural/performance improvements
2. **Preserve all existing functionality** - workflow must produce same outputs
3. **Start with highest-impact changes** - severe bottlenecks first
4. **Explain each change** before implementing

### Priority Order:
1. Parallelize sequential operations where possible
2. Add error handling/retry logic to external API calls
3. Implement caching for repeated API calls
4. Optimize data transformations

### What I Need:
- Review the workflow JSON (attached separately if available)
- Identify which recommendations are safe to implement
- Provide modified node configurations
- Explain the expected performance improvement

Let's start with the top 3 highest-impact changes.`;
}

/**
 * Generate a summary for the clipboard toast
 */
export function generatePromptSummary(input: PromptGeneratorInput): string {
  const criticalCount = input.bottlenecks.filter(
    b => b.severity === 'severe' || b.severity === 'high'
  ).length;

  return `${input.recommendations.length} recommendations, ${criticalCount} critical bottlenecks`;
}
