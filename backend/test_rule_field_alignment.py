"""
Test rules 1 and 15 against the REAL stored data shapes.

Rule 1 (sequential API calls) matched node_type against full n8n type
strings ('n8n-nodes-base.httpRequest'), but the bottleneck cache
(node_stats, written by BottleneckAnalyzer) stores STRIPPED types
('httpRequest') -- so the rule never fired on real data.

Rule 15 (error clusters) read cluster['error_count'], but the
error_clusters table column is member_count, and affected_nodes is a
list of dicts {node_id, node_name, occurrence_count}, not strings.
Passing dicts into affected_node_ids also breaks the has_recommendations
set built in main.py (dicts are unhashable).

Verifies:
1. Rule 1 fires on 3+ consecutive critical-path bottlenecks with
   stripped node_type 'httpRequest'.
2. Rule 15 fires on member_count > 3 with 2+ affected-node dicts, and
   affected_node_ids contains node_id strings (hashable).

Run: venv/bin/python test_rule_field_alignment.py
"""

import asyncio
import sys
from pathlib import Path
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).parent / "src"))

from analysis.recommendations import RecommendationEngine


def make_engine():
    engine = RecommendationEngine(Mock())
    engine.execution_id = "exec-1"
    engine.workflow_id = "wf-1"
    engine.critical_path = {"path_node_ids": ["a", "b", "c"], "total_duration_ms": 9000}
    engine.bottlenecks = []
    engine.error_analysis = None
    engine.execution_data = {"events": [], "nodes": [], "execution": None}
    return engine


def bottleneck(node_id, name, node_type, duration_ms):
    """Shape produced by _load_bottlenecks from the node_stats cache."""
    return {
        "node_id": node_id,
        "node_name": name,
        "node_type": node_type,  # stripped by BottleneckAnalyzer
        "duration_ms": duration_ms,
        "on_critical_path": True,
        "bottleneck_score": 50.0,
    }


def test_rule_1_fires_on_stripped_types():
    print("\n=== Test: rule 1 matches stripped node types ===")
    engine = make_engine()
    engine.bottlenecks = [
        bottleneck("a", "Fetch A", "httpRequest", 2000),
        bottleneck("b", "Fetch B", "httpRequest", 2500),
        bottleneck("c", "Fetch C", "httpRequest", 1800),
    ]

    recs = asyncio.run(engine._apply_rule_1_sequential_api_calls())

    assert len(recs) == 1, f"expected 1 recommendation, got {len(recs)}"
    assert recs[0].rule_id == 1
    print("✅ rule 1 fires for node_type 'httpRequest' (stripped form)")


def test_rule_15_reads_member_count_and_node_dicts():
    print("\n=== Test: rule 15 reads member_count / affected_nodes dicts ===")
    engine = make_engine()
    engine.error_analysis = {
        "clusters": [{
            "id": "cluster-1",
            "member_count": 6,
            "affected_nodes": [
                {"node_id": "uuid-a", "node_name": "Sync Contacts", "occurrence_count": 4},
                {"node_id": "uuid-b", "node_name": "Sync Deals", "occurrence_count": 2},
            ],
            "pattern_type": "timeout",
            "label": "Request timeouts",
        }],
        "errors": [],
    }

    recs = asyncio.run(engine._apply_rule_15_error_clusters())

    assert len(recs) == 1, f"expected 1 recommendation, got {len(recs)}"
    rec = recs[0]
    assert rec.error_count == 6, rec.error_count
    assert rec.affected_node_ids == ["uuid-a", "uuid-b"], rec.affected_node_ids
    assert all(isinstance(n, str) for n in rec.affected_node_ids), \
        "affected_node_ids must be hashable strings"
    print("✅ rule 15 fires with error_count=6 and string node ids")


def main():
    tests = [
        test_rule_1_fires_on_stripped_types,
        test_rule_15_reads_member_count_and_node_dicts,
    ]

    print("=" * 60)
    print("RULE FIELD ALIGNMENT TESTS")
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
