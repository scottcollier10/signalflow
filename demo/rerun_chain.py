"""Rerun the full SignalFlow analysis chain for all 9 demo executions
and report which recommendation rules fire per execution."""

import json
import urllib.request
from pathlib import Path

BASE = "http://localhost:8001"

with open(Path(__file__).parent / "imported.json") as f:
    imported = json.load(f)

WF_NAMES = {
    "e4d3e4ac-2cb4-420f-8724-f7d1ff4e8a62": "WF1 Lead Intake",
    "fd3a889d-5178-4101-9d85-eb63781083f3": "WF2 CRM Sync",
    "9be8d0aa-715a-4673-bc37-85b9fd93d5bd": "WF3 Content Pipeline",
}


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=300) as r:
        return json.loads(r.read())


results = {}
for n8n_id, info in sorted(imported.items()):
    wf, ex = info["workflow_id"], info["execution_id"]
    prefix = f"/api/workflows/{wf}/executions/{ex}"
    for step in ("critical-path", "bottlenecks", "error-analysis"):
        try:
            get(f"{prefix}/{step}")
        except Exception as e:
            print(f"{n8n_id} {step} FAILED: {e}")
    try:
        recs = get(f"{prefix}/recommendations")
        rules = sorted({r["rule_id"] for r in recs["data"]["recommendations"]})
    except Exception as e:
        rules = f"ERROR: {e}"
    results.setdefault(WF_NAMES[wf], {})[n8n_id] = rules
    print(f"{WF_NAMES[wf]} exec {n8n_id}: rules {rules}")

print("\n=== Per-workflow rule union ===")
for wf_name, per_exec in results.items():
    union = sorted(set().union(*(set(r) for r in per_exec.values() if isinstance(r, list))))
    print(f"{wf_name}: {union}")
