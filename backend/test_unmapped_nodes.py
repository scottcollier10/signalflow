"""
Test unmapped execution node flagging (Tier 2.4)

Execution events whose node_id can't be mapped to a workflow node used to be
dropped with a bare print(), then silently blend into the analysis as if the
workflow simply had fewer nodes. Verifies:

1. CriticalPathAnalyzer.calculate() reports unmapped node ids on the result
   (result.unmapped_nodes) instead of only printing.
2. BottleneckAnalyzer surfaces unmapped node ids in get_summary(), and never
   scores them as if they were real off-critical-path nodes.

Requires local Supabase (supabase start). Seeds and cleans up its own data.

Run: venv/bin/python test_unmapped_nodes.py
"""

from datetime import datetime, timedelta, timezone

from supabase import create_client
from src.config import settings
from src.analysis.critical_path import CriticalPathAnalyzer
from src.analysis.bottlenecks import BottleneckAnalyzer

from test_pgvector_search import require_local_db


WORKFLOW_RAW_JSON = {
    "nodes": [
        {"id": "node-a", "name": "Fetch Data", "type": "n8n-nodes-base.httpRequest"},
        {"id": "node-b", "name": "Save Data", "type": "n8n-nodes-base.postgres"},
    ],
    "connections": {
        "Fetch Data": {"main": [[{"node": "Save Data"}]]},
    },
}


def seed(db):
    now = datetime.now(timezone.utc)
    t0 = now - timedelta(minutes=5)

    wf = db.table("workflows").insert({
        "name": "unmapped-nodes-test-workflow",
        "raw_json": WORKFLOW_RAW_JSON,
        "node_count": 2,
        "edge_count": 1,
    }).execute().data[0]["id"]

    ex = db.table("executions").insert({
        "workflow_id": wf,
        "started_at": t0.isoformat(),
        "finished_at": (t0 + timedelta(seconds=1)).isoformat(),
        "status": "success",
        "raw_json": {},
    }).execute().data[0]["id"]

    # fetch_data and save_data map to workflow nodes; ghost_node does not
    events = []
    seq = 0
    for node_id, start_ms, dur_ms in [
        ("fetch_data", 0, 100),
        ("save_data", 150, 100),
        ("ghost_node", 300, 100),
    ]:
        start = t0 + timedelta(milliseconds=start_ms)
        finish = start + timedelta(milliseconds=dur_ms)
        events.append({
            "execution_id": ex, "node_id": node_id, "event_type": "started",
            "timestamp": start.isoformat(), "status": "success",
            "sequence_order": seq,
        })
        events.append({
            "execution_id": ex, "node_id": node_id, "event_type": "finished",
            "timestamp": finish.isoformat(), "duration_ms": dur_ms,
            "status": "success", "sequence_order": seq + 1,
        })
        seq += 2
    db.table("execution_events").insert(events).execute()

    return {"wf": wf, "ex": ex}


def cleanup(db, ids):
    # Workflow delete cascades to executions, execution_events, critical_paths,
    # and node_stats (workflow_id FK is ON DELETE CASCADE).
    if ids.get("wf"):
        db.table("workflows").delete().eq("id", ids["wf"]).execute()


def test_critical_path_reports_unmapped(db, ids):
    print("\n=== Test 1: critical path result reports unmapped nodes ===")
    analyzer = CriticalPathAnalyzer(db)

    result = analyzer.calculate(ids["ex"], ids["wf"])

    assert result.unmapped_nodes == ["ghost_node"], (
        f"Expected unmapped_nodes == ['ghost_node'], got {result.unmapped_nodes!r}"
    )
    print("  ✓ result.unmapped_nodes == ['ghost_node']")

    assert "ghost_node" not in result.path_node_ids, (
        "Unmapped node leaked into the critical path"
    )
    assert "unmapped_nodes" in result.to_dict(), (
        "unmapped_nodes missing from API dict"
    )
    print("  ✓ Excluded from path, present in API dict")
    return True


def test_bottlenecks_report_unmapped(db, ids):
    print("\n=== Test 2: bottleneck summary reports unmapped nodes ===")
    analyzer = BottleneckAnalyzer(db)

    bottlenecks = analyzer.analyze(ids["ex"], ids["wf"], limit=100)

    scored_names = [b.node_name for b in bottlenecks]
    assert "ghost_node" not in scored_names, (
        f"Unmapped node was scored as a real node: {scored_names}"
    )
    assert len(bottlenecks) == 2, f"Expected 2 scored nodes, got {len(bottlenecks)}"
    print("  ✓ Unmapped node not scored (2 real nodes scored)")

    summary = analyzer.get_summary(bottlenecks, len(bottlenecks))
    assert summary.get("unmapped_nodes") == ["ghost_node"], (
        f"Expected summary['unmapped_nodes'] == ['ghost_node'], "
        f"got {summary.get('unmapped_nodes')!r}"
    )
    print("  ✓ summary['unmapped_nodes'] == ['ghost_node']")
    return True


def main():
    print("=" * 70)
    print("UNMAPPED EXECUTION NODE TESTS")
    print("=" * 70)

    require_local_db()
    db = create_client(settings.supabase_url, settings.supabase_key)

    ids = {}
    try:
        ids = seed(db)
        print(f"Seeded workflow {ids['wf'][:8]}... with 1 unmapped event node")

        ok1 = test_critical_path_reports_unmapped(db, ids)
        ok2 = test_bottlenecks_report_unmapped(db, ids)
        success = ok1 and ok2
    finally:
        cleanup(db, ids)
        print("\nCleaned up seeded data.")

    print("\n" + "=" * 70)
    print("✅ ALL TESTS PASSED" if success else "❌ TESTS FAILED")
    print("=" * 70)
    return success


if __name__ == "__main__":
    exit(0 if main() else 1)
