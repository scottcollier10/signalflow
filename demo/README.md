# SignalFlow Demo Scripts

Builder scripts that create three demo workflows on an n8n instance for
profiling with SignalFlow. Each workflow is engineered to trigger specific
recommendation rules.

## Prerequisites

- A running n8n instance with API access enabled
- n8n API key (Settings > API > Create API Key)
- Python 3.11+

## Environment Variables

```bash
export N8N_API_URL=https://your-n8n-instance.com
export N8N_API_KEY=n8n_api_...

# Demo 2 (CRM Sync) — n8n credential IDs for HubSpot
export N8N_HUBSPOT_CRED_ID=your-credential-id
export N8N_HUBSPOT_CRED_NAME=hubspot-api-key

# Demo 3 (Content Pipeline) — n8n credential IDs for Anthropic
export N8N_ANTHROPIC_CRED_ID=your-credential-id
export N8N_ANTHROPIC_CRED_NAME=anthropic-api-key

# Demo 3 V2 (optimized) — workflow ID from build_wf3.py output
export N8N_WF3_ID=your-workflow-id
```

## Safety

All scripts are **non-mutating by default**. Running without flags prints a
preview of what would be created:

```bash
python build_wf1.py          # dry run — prints node count, webhook path
python build_wf1.py --apply  # creates the workflow on n8n
python build_wf1.py --apply --activate  # creates and activates
```

## Scripts

| Script | Workflow | Nodes | Key rules triggered |
|---|---|---|---|
| `build_wf1.py` | Lead Intake & Enrichment | 9 | 1, 5, 7, 17, 18 |
| `build_wf2.py` | CRM Contact Sync | 14 | 3, 4, 7, 8, 10, 14, 15, 21, 26 |
| `build_wf3.py` | Content Pipeline (baseline) | 28 | 1, 2, 5, 7, 17, 18, 31, 37 |
| `build_wf3_v2.py` | Content Pipeline (optimized) | 21 | Updates existing WF3 in place |

## Other Files

- `n8n_api.py` — shared API helper (reads env vars above)
- `rerun_chain.py` — re-runs analysis endpoints on localhost:8001 for all imported executions
