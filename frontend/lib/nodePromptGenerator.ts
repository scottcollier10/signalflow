/**
 * Node-specific prompt generator for Claude Code
 * Creates targeted optimization prompts based on bottleneck analysis
 */

import { Bottleneck, Recommendation } from './api/analysis';

interface NodePromptInput {
  node: {
    id: string;
    data?: {
      label?: string;
      nodeType?: string;
      duration?: number | null;
    };
  };
  bottleneck: Bottleneck | null;
  recommendations: Recommendation[];
  executionId: string;
  workflowName: string;
}

export function generateNodeFixPrompt(input: NodePromptInput): string {
  const { node, bottleneck, recommendations, executionId, workflowName } = input;

  const nodeName = node.data?.label || node.id;
  const nodeType = node.data?.nodeType || 'unknown';
  const duration = node.data?.duration;

  return `I need help optimizing a specific node in my n8n workflow.

## CONTEXT
- **Workflow:** ${workflowName}
- **Execution ID:** ${executionId}
- **Analysis Tool:** SignalFlow

## NODE DETAILS
- **Name:** ${nodeName}
- **Type:** ${nodeType}
- **Duration:** ${typeof duration === 'number' ? `${duration}ms` : 'unknown'}
${bottleneck?.is_on_critical_path ? '- **⚠️ ON CRITICAL PATH** - This node directly impacts total workflow time' : ''}

## BOTTLENECK ANALYSIS
${bottleneck ? `
**Severity:** ${bottleneck.severity.toUpperCase()} (Score: ${bottleneck.bottleneck_score}/100)

**Score Breakdown:**
| Factor | Score | Description |
|--------|-------|-------------|
| Duration | ${Math.round(bottleneck.factors.duration_factor * 40)}/40 | Time relative to workflow total |
| Position | ${Math.round(bottleneck.factors.position_factor * 30)}/30 | Impact on critical path |
| Frequency | ${Math.round(bottleneck.factors.frequency_factor * 20)}/20 | How consistently it's slow |
| Variance | ${Math.round(bottleneck.factors.variance_factor * 10)}/10 | Performance predictability |

**Total Duration:** ${bottleneck.total_duration_ms}ms
` : 'No bottleneck detected for this node.'}

## RECOMMENDATIONS FOR THIS NODE
${recommendations.length > 0 ? recommendations.map((r, i) => `
${i + 1}. **${r.title}**
   ${r.description}
   ${r.time_saved_ms ? `Potential savings: ${r.time_saved_ms}ms` : ''}
   Impact: ${r.impact} | Effort: ${r.effort}
`).join('') : 'No specific recommendations for this node.'}

## INSTRUCTIONS

Please help me optimize this node. Important guidelines:

1. **DO NOT modify business logic** - only structural/performance improvements
2. **Preserve existing functionality** - the node must produce the same outputs
3. **Explain your reasoning** before suggesting changes
4. **Be specific** - provide exact configuration changes or code modifications

### What I Need:
1. Analyze why this node might be slow based on its type (${nodeType})
2. Suggest specific optimizations for this node type
3. If applicable, provide modified node configuration
4. Estimate the expected performance improvement

### Common Optimizations by Node Type:
- **HTTP Request**: Connection pooling, timeout settings, response size limits
- **Code/Function**: Algorithm efficiency, avoid blocking operations
- **Database**: Query optimization, indexing, connection pooling
- **Loop/SplitInBatches**: Batch size tuning, parallel processing
- **IF/Switch**: Condition ordering, early returns

Please start by explaining what might be causing the slowdown, then provide actionable fixes.`;
}
