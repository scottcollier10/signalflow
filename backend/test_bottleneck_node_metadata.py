"""
Test BottleneckAnalyzer node metadata propagation and execution_count persistence.

execution_events rows carry no node_type/node_name columns, so the analyzer
must take node metadata from the workflow graph (workflows.raw_json) it
already loads — NOT from events. Before this fix every bottleneck row got
node_type='unknown' and a normalized lowercase name, which silently killed
all type-matching recommendation rules (1, 4, 18, 23, 26) and made titles
ugly ('enrich:_company_data').

Also verifies _store_results persists execution_count to node_stats: the
column exists and rules 3/21/26/31 read it, but it was never written, so
loop-based rules could never fire.

Verifies:
1. BottleneckScore.node_type comes from the workflow graph with the
   'n8n-nodes-base.' prefix stripped (e.g. 'httpRequest').
2. BottleneckScore.node_name is the display name from the workflow graph
   (e.g. 'Enrich: Company Data'), not the normalized event node_id.
3. node_stats insert records include execution_count.

Run: venv/bin/python test_bottleneck_node_metadata.py
"""

import sys
from pathlib import Path
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).parent / "src"))

from analysis.bottlenecks import BottleneckAnalyzer

EXECUTION_ID = "exec-1"
WORKFLOW_ID = "wf-1"


class FakeTable:
    def __init__(self, data, inserts):
        self._data = data
        self._inserts = inserts

    def select(self, *args):
        return self

    def eq(self, column, value):
        return self

    def in_(self, column, values):
        return self

    def order(self, *args, **kwargs):
        return self

    def delete(self):
        return self

    def insert(self, records):
        self._inserts.extend(records)
        return self

    def execute(self):
        return Mock(data=self._data)


class FakeSupabase:
    def __init__(self):
        self.node_stats_inserts = []
        self.tables = {
            "critical_paths": [{
                "execution_id": EXECUTION_ID,
                "path_node_ids": ["uuid-http", "uuid-code"],
                "total_duration_ms": 10000,
            }],
            "workflows": [{
                "raw_json": {"nodes": [
                    {"id": "uuid-http", "name": "Enrich: Company Data",
                     "type": "n8n-nodes-base.httpRequest"},
                    {"id": "uuid-code", "name": "Transform Contact Record",
                     "type": "n8n-nodes-base.code"},
                ]},
            }],
            "execution_events": [
                {"execution_id": EXECUTION_ID, "node_id": "enrich:_company_data",
                 "event_type": "finished", "duration_ms": 2200},
                {"execution_id": EXECUTION_ID, "node_id": "transform_contact_record",
                 "event_type": "finished", "duration_ms": 600},
                {"execution_id": EXECUTION_ID, "node_id": "transform_contact_record",
                 "event_type": "finished", "duration_ms": 620},
                {"execution_id": EXECUTION_ID, "node_id": "transform_contact_record",
                 "event_type": "finished", "duration_ms": 580},
            ],
            "node_stats": [],
        }

    def table(self, name):
        inserts = self.node_stats_inserts if name == "node_stats" else []
        return FakeTable(self.tables.get(name, []), inserts)


def run_analysis():
    db = FakeSupabase()
    analyzer = BottleneckAnalyzer(db)
    bottlenecks = analyzer.analyze(EXECUTION_ID, WORKFLOW_ID, limit=10)
    by_id = {b.node_id: b for b in bottlenecks}
    return by_id, db.node_stats_inserts


def test_node_type_from_workflow_graph():
    print("\n=== Test: node_type comes from workflow graph, prefix stripped ===")
    by_id, _ = run_analysis()

    assert by_id["uuid-http"].node_type == "httpRequest", by_id["uuid-http"].node_type
    assert by_id["uuid-code"].node_type == "code", by_id["uuid-code"].node_type
    print("✅ node_type: httpRequest / code (not 'unknown')")


def test_node_name_is_display_name():
    print("\n=== Test: node_name is the workflow display name ===")
    by_id, _ = run_analysis()

    assert by_id["uuid-http"].node_name == "Enrich: Company Data", by_id["uuid-http"].node_name
    assert by_id["uuid-code"].node_name == "Transform Contact Record", by_id["uuid-code"].node_name
    print("✅ node_name uses display names, not normalized ids")


def test_execution_count_persisted():
    print("\n=== Test: node_stats insert includes execution_count ===")
    _, inserts = run_analysis()

    assert inserts, "No node_stats records were inserted"
    by_node = {r["node_id"]: r for r in inserts}
    assert "execution_count" in by_node["uuid-code"], \
        f"execution_count missing from insert: {sorted(by_node['uuid-code'])}"
    assert by_node["uuid-code"]["execution_count"] == 3, by_node["uuid-code"]["execution_count"]
    assert by_node["uuid-http"]["execution_count"] == 1, by_node["uuid-http"]["execution_count"]
    print("✅ execution_count persisted (3 for looped node, 1 for single run)")


def main():
    tests = [
        test_node_type_from_workflow_graph,
        test_node_name_is_display_name,
        test_execution_count_persisted,
    ]

    print("=" * 60)
    print("BOTTLENECK NODE METADATA TESTS")
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
