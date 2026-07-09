# SignalFlow Demo: The Optimize Loop

The story in one line: SignalFlow profiled a 43s content pipeline, we applied its
recommendations, and the same workflow now runs in 13s with recommendations down
from 31 to 9.

## Proven result (Content Pipeline, 2026-07-08)

| | Baseline (V1) | Optimized (V2) |
|---|---|---|
| n8n execution | 13781/13782/13784 | 13793 |
| Duration | ~43s | 13.1s |
| Nodes | 28 | 21 |
| Recommendations | 31 | 9 |
| Rules firing | 1, 2, 5, 6, 7, 17, 18, 31, 37, 38, 39 | 1, 17, 38, 39 |

What was applied, straight from the recommendation list:

1. **Batch the AI loop** (rules 31/18): 6 sequential "Claude: Enrich Section"
   calls became one batched call that writes all 6 sections.
2. **Delete the hardcoded delay** (rule 7): "Rate Limit Wait" (5s) removed.
3. **Kill the polling loop** (rule 5): Poll + Check + If + Wait(2s) x3 became a
   single synchronous render call.
4. **Cache the slow service** (rules 2/17): "Legacy Export API" (10s) became the
   v2 cached endpoint (1s).
5. **Merge sequential fetches** (rule 1): two chained research calls became one
   batched request.

Residual 9 recommendations are the honest floor: rules 38/39 are architecture
hygiene that fire on nearly any workflow, and rule 1/17 flag the remaining
publish chain (Claude SEO -> Publish -> Archive). An LLM call on the critical
path stays flagged until you cache it. That is correct behavior, not noise.

## Demo script (5 minutes)

1. Dashboard: show the workflow group. Baseline executions all ~43s with 31
   recommendations each. Point out determinism: same workflow, same findings,
   every run.
2. Open baseline analysis: Critical Path tab (Legacy Export API dominates),
   then Recommendations tab. Call out the top 4 by priority.
3. "We applied exactly these." Open the optimized execution: 13.1s, 9
   recommendations, zero CRITICAL.
4. Hit **Compare Versions** on the workflow card for the before/after.
5. Close on the floor: the 9 that remain are hygiene plus one honest flag on
   the LLM call. A profiler that goes to zero is lying to you.

## How to run the loop yourself

### Fast path: Claude Code + n8n MCP (recommended)

One prompt does the whole loop. Claude Code reads the recommendations from the
SignalFlow API, patches the workflow through the n8n API, triggers it, and
imports the result. No copy-paste, no node surgery in the UI.

Prompt template:

```
Optimize n8n workflow <N8N_WORKFLOW_ID> using its SignalFlow recommendations.

1. GET http://localhost:8001/api/workflows/<WF_UUID>/executions/<EX_UUID>/recommendations
2. Fetch the workflow via the n8n API, apply the top recommendations
   (parallelize/batch/remove waits), and PUT it back to the SAME workflow id
   so SignalFlow groups the executions for Compare Versions.
3. Trigger the production webhook, wait for completion.
4. Import: POST http://localhost:8001/api/n8n/fetch-execution
   {"execution_id": "<n8n exec id>", "n8n_url": ..., "api_key": ...}
5. Run the analysis chain (critical-path, bottlenecks, error-analysis,
   recommendations) and report before/after counts.
```

Key rule: **update the same n8n workflow in place.** A new workflow imports as
a separate SignalFlow workflow and you lose the version comparison. Keep the
original definition in a file first if you want to restore the baseline.

### Manual path (UI only, no MCP)

The old flow, cleaned up:

1. Open the execution's Recommendations tab, hit **Optimize**, copy the
   generated prompt.
2. Paste into Claude Code (Opus/Sonnet 4.6) along with the workflow JSON
   (n8n editor: select all nodes, Ctrl/Cmd+C copies them as JSON).
3. Ask for the optimized nodes back as paste-ready JSON.
4. In the n8n editor: select all, delete, Ctrl/Cmd+V the new nodes. This keeps
   the workflow id, which is what makes Compare Versions work.
5. Re-run the workflow (webhook or manual execute).
6. Import the new execution id in SignalFlow, open the analysis, compare.

Step 2's copy-paste is the only genuinely manual part. Everything after is
what the fast path automates.

## Reference

| Workflow | Webhook path | n8n id | SignalFlow id |
|---|---|---|---|
| Demo 1 Lead Intake | `sf-demo-lead-intake` | S2LBskBqoo1fHCTO | e4d3e4ac-2cb4-420f-8724-f7d1ff4e8a62 |
| Demo 2 CRM Sync | `sf-demo-crm-sync` | r4ezuLjS8LxFmzur | fd3a889d-5178-4101-9d85-eb63781083f3 |
| Demo 3 Content Pipeline | `sf-demo-content-pipeline` | UL1TiuFvfDWtsDEF | 9be8d0aa-715a-4673-bc37-85b9fd93d5bd |

- Baseline WF3 definition: `demo/build_wf3.py` (re-run it to restore V1; note it
  POSTs a new workflow, so prefer editing it to PUT to the existing id)
- Optimized WF3 definition: `demo/build_wf3_v2.py`
- Import mappings: `demo/imported.json`, `demo/imported_v2.json`
- Rerun all analyses: `demo/rerun_chain.py`
- Demo 1 and 2 are still at baseline. Demo 2 (CRM Sync) has the richest
  baseline story: 19 rules, 36 errors, semantic clusters, CRITICAL timeouts.
