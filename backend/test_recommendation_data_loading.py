"""
Test RecommendationEngine._load_execution_data.

The loader used to query a 'workflow_nodes' table that does not exist in any
environment (local or hosted). The real Supabase client raises PGRST205 for
missing tables, and because all three queries shared one try/except, the
whole load returned {'events': [], 'nodes': [], 'execution': None} on every
real execution — silently disabling rules 17/20/21/26/31 (anything needing
execution duration_ms or events).

Verifies:
1. Node metadata comes from workflows.raw_json (no workflow_nodes query),
   and each node dict has the 'name' key rule 35 reads.
2. events and execution load correctly alongside nodes.
3. Queries are independent: if the workflows query raises, events and
   execution still load (nodes degrade to []).

Run: venv/bin/python test_recommendation_data_loading.py
"""

import asyncio
import sys
from pathlib import Path
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).parent / "src"))

from analysis.recommendations import RecommendationEngine

EXECUTION_ID = "exec-1"
WORKFLOW_ID = "wf-1"

RAW_JSON_NODES = [
    {"id": "uuid-1", "name": "Fetch Contacts", "type": "n8n-nodes-base.httpRequest"},
    {"id": "uuid-2", "name": "Cleanup Old Records", "type": "n8n-nodes-base.code"},
]

EVENTS = [
    {"execution_id": EXECUTION_ID, "node_id": "fetch_contacts",
     "event_type": "finished", "duration_ms": 1200, "timestamp": "2026-07-08T12:00:01Z"},
]

EXECUTIONS = [
    {"id": EXECUTION_ID, "workflow_id": WORKFLOW_ID,
     "status": "success", "duration_ms": 10662},
]


class FakeTable:
    def __init__(self, data, error=None):
        self._data = data
        self._error = error

    def select(self, *args):
        return self

    def eq(self, column, value):
        return self

    def order(self, *args, **kwargs):
        return self

    def execute(self):
        if self._error:
            raise self._error
        return Mock(data=self._data)


class FakeSupabase:
    """Mimics the real client: unknown tables raise PGRST205 on execute()."""

    def __init__(self, tables, failing=()):
        self._tables = tables
        self._failing = set(failing)

    def table(self, name):
        if name in self._failing:
            return FakeTable(None, error=Exception(f"forced failure on {name}"))
        if name not in self._tables:
            return FakeTable(None, error=Exception(
                f"Could not find the table 'public.{name}' in the schema cache (PGRST205)"))
        return FakeTable(self._tables[name])


def load(db):
    engine = RecommendationEngine(db)
    return asyncio.run(engine._load_execution_data(EXECUTION_ID, WORKFLOW_ID))


def base_tables():
    return {
        "execution_events": EVENTS,
        "executions": EXECUTIONS,
        "workflows": [{"id": WORKFLOW_ID, "raw_json": {"nodes": RAW_JSON_NODES}}],
    }


def test_nodes_from_workflow_raw_json():
    print("\n=== Test: nodes come from workflows.raw_json ===")
    data = load(FakeSupabase(base_tables()))

    assert data["nodes"] == RAW_JSON_NODES, data["nodes"]
    assert all("name" in n for n in data["nodes"])
    print("✅ nodes sourced from raw_json with 'name' keys")


def test_events_and_execution_load():
    print("\n=== Test: events and execution metadata load ===")
    data = load(FakeSupabase(base_tables()))

    assert data["events"] == EVENTS, data["events"]
    assert data["execution"] is not None, "execution row missing"
    assert data["execution"]["duration_ms"] == 10662
    print("✅ events + execution loaded (duration_ms=10662)")


def test_queries_are_independent():
    print("\n=== Test: workflows query failure does not zero events/execution ===")
    data = load(FakeSupabase(base_tables(), failing={"workflows"}))

    assert data["nodes"] == [], data["nodes"]
    assert data["events"] == EVENTS, "events lost when workflows query failed"
    assert data["execution"] is not None, "execution lost when workflows query failed"
    print("✅ partial failure degrades gracefully")


def main():
    tests = [
        test_nodes_from_workflow_raw_json,
        test_events_and_execution_load,
        test_queries_are_independent,
    ]

    print("=" * 60)
    print("RECOMMENDATION DATA LOADING TESTS")
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
