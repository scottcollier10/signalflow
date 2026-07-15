"""
Test dashboard load performance query patterns.

The dashboard was slow because of two server-side patterns:

1. GET /api/executions had an N+1: the enrichment loop queried
   execution_events once PER execution (~100 sequential PostgREST round
   trips for a default page). It must batch with .in_("execution_id", ids)
   like the workflow and critical_paths lookups above it, and paginate the
   batched query with .range() so PostgREST's max-rows cap (default 1000)
   cannot silently truncate node/error counts.

2. GET .../bottlenecks ran analyzer.analyze() twice per request (once for
   the display list, once for the summary). analyze() loads critical path,
   workflow graph, and all events, then DELETEs and re-INSERTs node_stats —
   so everything was doubled, including the writes. One analyze() call must
   serve both the filtered display list and the summary.

Verifies:
1. /api/executions issues exactly ONE execution_events query regardless of
   how many executions are listed, with correct node_count / error_count.
2. Batched event fetch paginates: counts stay correct when the server caps
   rows per response (simulated cap smaller than the event count).
3. Bottlenecks endpoint runs the analysis once: node_stats is written
   exactly once and execution_events is not loaded twice by the analyzer.

Run: venv/bin/python test_dashboard_load_perf.py
"""

import sys
from pathlib import Path
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).parent))

from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)

WF_ID = "wf-1"
EXEC_IDS = ["exec-1", "exec-2", "exec-3"]


# =============================================================================
# Fake Supabase that filters like PostgREST and logs every query
# =============================================================================

class FakeQuery:
    def __init__(self, db, table_name):
        self._db = db
        self._table = table_name
        self._filters = []
        self._limit = None
        self._range = None
        self._is_delete = False
        self._insert_records = None

    def select(self, *args, **kwargs):
        return self

    def eq(self, column, value):
        self._filters.append(lambda row: row.get(column) == value)
        return self

    def in_(self, column, values):
        allowed = list(values)
        self._filters.append(lambda row: row.get(column) in allowed)
        return self

    def order(self, *args, **kwargs):
        return self

    def limit(self, n):
        self._limit = n
        return self

    def range(self, start, end):
        self._range = (start, end)
        return self

    def delete(self):
        self._is_delete = True
        return self

    def insert(self, records):
        self._insert_records = records
        return self

    def execute(self):
        rows = self._db.tables.setdefault(self._table, [])

        if self._insert_records is not None:
            self._db.log(self._table, "insert")
            rows.extend(self._insert_records)
            return Mock(data=self._insert_records)

        matched = [r for r in rows if all(f(r) for f in self._filters)]

        if self._is_delete:
            self._db.log(self._table, "delete")
            self._db.tables[self._table] = [r for r in rows if r not in matched]
            return Mock(data=[])

        self._db.log(self._table, "select")
        if self._range is not None:
            start, end = self._range
            matched = matched[start:end + 1]
        elif self._limit is not None:
            matched = matched[:self._limit]

        # Simulate PostgREST max-rows: never return more than the cap,
        # whatever the client asked for.
        if self._db.max_rows is not None:
            matched = matched[:self._db.max_rows]

        return Mock(data=matched)


class FakeSupabase:
    def __init__(self, tables, max_rows=None):
        self.tables = tables
        self.max_rows = max_rows
        self.query_log = []  # (table, op) tuples

    def table(self, name):
        return FakeQuery(self, name)

    def log(self, table, op):
        self.query_log.append((table, op))

    def count(self, table, op):
        return sum(1 for t, o in self.query_log if t == table and o == op)


# =============================================================================
# Fixtures
# =============================================================================

def executions_dashboard_db(max_rows=None, events=None):
    """Three executions, each with distinct node/error profiles."""
    if events is None:
        events = [
            # exec-1: 2 unique nodes, 1 error
            {"execution_id": "exec-1", "node_id": "webhook", "status": "success"},
            {"execution_id": "exec-1", "node_id": "http", "status": "error"},
            # exec-2: 3 unique nodes (one looped), 0 errors
            {"execution_id": "exec-2", "node_id": "webhook", "status": "success"},
            {"execution_id": "exec-2", "node_id": "loop", "status": "success"},
            {"execution_id": "exec-2", "node_id": "loop", "status": "success"},
            {"execution_id": "exec-2", "node_id": "save", "status": "success"},
            # exec-3: 1 node, 1 error
            {"execution_id": "exec-3", "node_id": "webhook", "status": "error"},
        ]
    return FakeSupabase({
        "executions": [
            {"id": eid, "workflow_id": WF_ID, "n8n_execution_id": str(i),
             "status": "success", "started_at": f"2026-07-15T0{i}:00:00Z",
             "finished_at": None, "duration_ms": 1000 + i}
            for i, eid in enumerate(EXEC_IDS)
        ],
        "workflows": [{"id": WF_ID, "name": "Demo WF"}],
        "critical_paths": [],
        "execution_events": events,
    }, max_rows=max_rows)


def bottlenecks_db():
    """One execution with a critical path and mappable events."""
    return FakeSupabase({
        "critical_paths": [{
            "execution_id": "exec-1",
            "path_node_ids": ["uuid-http", "uuid-code"],
            "total_duration_ms": 10000,
        }],
        "workflows": [{
            "id": WF_ID,
            "raw_json": {"nodes": [
                {"id": "uuid-http", "name": "Enrich: Company Data",
                 "type": "n8n-nodes-base.httpRequest"},
                {"id": "uuid-code", "name": "Transform Contact Record",
                 "type": "n8n-nodes-base.code"},
            ]},
        }],
        "execution_events": [
            {"execution_id": "exec-1", "node_id": "enrich:_company_data",
             "event_type": "finished", "duration_ms": 8000},
            {"execution_id": "exec-1", "node_id": "transform_contact_record",
             "event_type": "finished", "duration_ms": 2000},
        ],
        "executions": [{"id": "exec-1", "workflow_id": WF_ID,
                        "status": "success", "duration_ms": 10000}],
        "node_stats": [],
    })


# =============================================================================
# Tests
# =============================================================================

def test_list_executions_batches_event_counts():
    print("\n=== Test: /api/executions queries execution_events once, not per execution ===")
    db = executions_dashboard_db()

    with patch("src.main.create_client", return_value=db):
        resp = client.get("/api/executions")

    assert resp.status_code == 200, resp.text
    by_id = {e["id"]: e for e in resp.json()}

    assert by_id["exec-1"]["node_count"] == 2, by_id["exec-1"]
    assert by_id["exec-1"]["error_count"] == 1, by_id["exec-1"]
    assert by_id["exec-2"]["node_count"] == 3, by_id["exec-2"]
    assert by_id["exec-2"]["error_count"] == 0, by_id["exec-2"]
    assert by_id["exec-3"]["node_count"] == 1, by_id["exec-3"]
    assert by_id["exec-3"]["error_count"] == 1, by_id["exec-3"]

    event_queries = db.count("execution_events", "select")
    assert event_queries == 1, (
        f"Expected 1 batched execution_events query, got {event_queries} "
        f"(N+1: one per execution)"
    )
    print(f"✅ 1 execution_events query for {len(EXEC_IDS)} executions, counts correct")


def test_batched_event_fetch_paginates_past_row_cap():
    print("\n=== Test: batched event fetch paginates past the server row cap ===")
    # exec-1 has 5 events (4 unique nodes, 2 errors); server caps at 3
    # rows per response. Without .range() pagination the counts undercount.
    events = [
        {"execution_id": "exec-1", "node_id": "webhook", "status": "success"},
        {"execution_id": "exec-1", "node_id": "http", "status": "error"},
        {"execution_id": "exec-1", "node_id": "loop", "status": "success"},
        {"execution_id": "exec-1", "node_id": "loop", "status": "error"},
        {"execution_id": "exec-1", "node_id": "save", "status": "success"},
    ]
    db = executions_dashboard_db(max_rows=3, events=events)

    with patch("src.main.create_client", return_value=db), \
         patch("src.main.EVENTS_PAGE_SIZE", 3, create=True):
        resp = client.get("/api/executions")

    assert resp.status_code == 200, resp.text
    by_id = {e["id"]: e for e in resp.json()}

    assert by_id["exec-1"]["node_count"] == 4, (
        f"node_count truncated by row cap: {by_id['exec-1']['node_count']} "
        f"(expected 4 — batched query must paginate with .range())"
    )
    assert by_id["exec-1"]["error_count"] == 2, by_id["exec-1"]
    print("✅ Counts survive a 3-row server cap (paginated fetch)")


def test_bottlenecks_endpoint_analyzes_once():
    print("\n=== Test: bottlenecks endpoint runs analysis once ===")
    db = bottlenecks_db()

    with patch("src.main.create_client", return_value=db):
        resp = client.get(f"/api/workflows/{WF_ID}/executions/exec-1/bottlenecks")

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["success"] is True, body

    data = body["data"]
    assert len(data["bottlenecks"]) == 2, data["bottlenecks"]
    assert data["summary"]["total_execution_duration_ms"] == 10000, data["summary"]
    assert data["verdict"], "verdict missing"

    # analyze() ends with delete + insert on node_stats; running it twice
    # doubles the writes. Exactly one insert == exactly one analysis pass.
    inserts = db.count("node_stats", "insert")
    deletes = db.count("node_stats", "delete")
    assert inserts == 1, f"node_stats inserted {inserts}x — analyze() ran {inserts} times"
    assert deletes == 1, f"node_stats deleted {deletes}x — analyze() ran {deletes} times"
    print("✅ One node_stats delete+insert: single analysis pass")


def test_bottlenecks_filters_still_apply():
    print("\n=== Test: severity/limit filters still work off the single pass ===")
    db = bottlenecks_db()

    with patch("src.main.create_client", return_value=db):
        resp = client.get(
            f"/api/workflows/{WF_ID}/executions/exec-1/bottlenecks?limit=1"
        )

    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert len(data["bottlenecks"]) == 1, data["bottlenecks"]
    # Summary must still describe ALL nodes, not just the limited list
    assert data["summary"]["total_nodes_analyzed"] == 2, data["summary"]
    print("✅ limit=1 returns 1 bottleneck while summary covers all 2 nodes")


def main():
    tests = [
        test_list_executions_batches_event_counts,
        test_batched_event_fetch_paginates_past_row_cap,
        test_bottlenecks_endpoint_analyzes_once,
        test_bottlenecks_filters_still_apply,
    ]

    print("=" * 60)
    print("DASHBOARD LOAD PERFORMANCE TESTS")
    print("=" * 60)

    failed = 0
    for test in tests:
        try:
            test()
        except AssertionError as e:
            failed += 1
            print(f"❌ {test.__name__}: {e}")
        except Exception as e:
            failed += 1
            print(f"❌ {test.__name__} errored: {type(e).__name__}: {e}")

    print("\n" + "=" * 60)
    if failed:
        print(f"❌ {failed}/{len(tests)} tests failed")
    else:
        print(f"✅ All {len(tests)} tests passed")
    print("=" * 60)
    return failed == 0


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
