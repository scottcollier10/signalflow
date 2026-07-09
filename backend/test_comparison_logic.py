"""
Test ComparisonAnalyzer classification logic.

The comparison report was misleading: two nodes of timing jitter
(+78ms, +32ms on a run that saved 30s) flipped the verdict to
"investigate trade-offs"; improvements ranked by percentage so all
removed nodes tied at 100% and a 272ms node outranked a 13.7s win;
sub-500ms nodes showed as "Persisting Issues"; and the recommendation
count silently read 0 because the recommendations table has no
execution_id column.

Verifies:
1. Noise gate: a node >10% slower but below max(250ms, 1% of total)
   absolute delta is NOT worsened -- it lands in the new 'unchanged'
   bucket, and the verdict is not dragged to "concerns".
2. Persisting floor: a still-slow node (>=500ms after) persists; a
   marginal node (408ms -> 406ms) is 'unchanged', not a persisting issue.
3. Ranking: top_improvements sorts by absolute time_saved_ms, so a
   removed 13.7s node outranks a removed 272ms node.
4. Removed nodes carry removed=True and time_saved_ms = before duration.
5. A material regression (+3s, -150%) IS worsened and the verdict
   flags concerns.
6. Recommendation counts are passed through (rec_count_a/b), defaulting
   to None -- never a fabricated 0.
7. Verdict is 'excellent' when >=50% faster, no worsened, no SEVERE after.

Run: venv/bin/python test_comparison_logic.py
"""

import sys
from pathlib import Path
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).parent))

from src.analysis.comparison import ComparisonAnalyzer

EXEC_A = "exec-a"
EXEC_B = "exec-b"
WORKFLOW_ID = "wf-1"


class FakeTable:
    """Filters on eq(), unlike simpler fakes -- comparison loads 2 executions."""

    def __init__(self, rows):
        self._rows = rows
        self._filters = []

    def select(self, *args):
        return self

    def eq(self, column, value):
        self._filters.append((column, value))
        return self

    def execute(self):
        rows = [
            r for r in self._rows
            if all(r.get(col) == val for col, val in self._filters)
        ]
        self._filters = []
        return Mock(data=rows)


class FakeSupabase:
    def __init__(self, tables):
        self._tables = tables

    def table(self, name):
        return FakeTable(self._tables.get(name, []))


def node_stat(execution_id, node_id, name, score, duration, on_cp=False):
    return {
        "execution_id": execution_id,
        "node_id": node_id,
        "node_name": name,
        "node_type": "httpRequest",
        "bottleneck_score": score,
        "total_duration_ms": duration,
        "is_on_critical_path": on_cp,
    }


def build_db(after_stats):
    """Before execution is fixed; after varies per test."""
    before_stats = [
        # The real WF3 shape: two huge wins, one marginal node that gets
        # removed, two jitter-level nodes, one genuinely persisting node.
        node_stat(EXEC_A, "legacy", "Legacy Export API", 90, 10000, True),
        node_stat(EXEC_A, "claude", "Claude: Enrich Section", 82, 13700, True),
        node_stat(EXEC_A, "submit", "Submit Render Job", 50, 272),
        node_stat(EXEC_A, "publish", "Publish To CMS", 55, 349),
        node_stat(EXEC_A, "transform", "Transform Legacy Payload", 52, 408),
        node_stat(EXEC_A, "brand", "Fetch Brand Assets", 60, 1300),
    ]
    return FakeSupabase({
        "executions": [
            {"id": EXEC_A, "workflow_id": WORKFLOW_ID, "n8n_execution_id": "13781",
             "started_at": "2026-07-08T10:00:00Z", "duration_ms": 40000, "status": "success"},
            {"id": EXEC_B, "workflow_id": WORKFLOW_ID, "n8n_execution_id": "13793",
             "started_at": "2026-07-08T11:00:00Z", "duration_ms": 13000, "status": "success"},
        ],
        "node_stats": before_stats + after_stats,
        "critical_paths": [
            {"execution_id": EXEC_A, "path_nodes": ["legacy", "claude"], "total_duration_ms": 40000},
            {"execution_id": EXEC_B, "path_nodes": ["publish"], "total_duration_ms": 13000},
        ],
    })


def optimized_after_stats():
    """legacy/claude/submit removed; publish +78ms jitter; transform -2ms;
    brand unchanged at 1.3s."""
    return [
        node_stat(EXEC_B, "publish", "Publish To CMS", 40, 427),
        node_stat(EXEC_B, "transform", "Transform Legacy Payload", 50, 406),
        node_stat(EXEC_B, "brand", "Fetch Brand Assets", 60, 1300),
    ]


def test_noise_gate_and_unchanged_bucket():
    analyzer = ComparisonAnalyzer(build_db(optimized_after_stats()))
    result = analyzer.compare(EXEC_A, EXEC_B)

    worsened_ids = [i["node_id"] for i in result["worsened"]["items"]]
    assert worsened_ids == [], f"jitter nodes must not be worsened, got {worsened_ids}"

    unchanged_ids = sorted(i["node_id"] for i in result["unchanged"]["items"])
    assert "publish" in unchanged_ids, f"publish (+78ms) should be unchanged, got {unchanged_ids}"
    assert "transform" in unchanged_ids, f"transform (-2ms) should be unchanged, got {unchanged_ids}"

    assert result["delta"]["bottlenecks_worsened"] == 0
    print("PASS: noise gate + unchanged bucket")


def test_persisting_floor():
    analyzer = ComparisonAnalyzer(build_db(optimized_after_stats()))
    result = analyzer.compare(EXEC_A, EXEC_B)

    persisting_ids = [i["node_id"] for i in result["persisting"]["items"]]
    assert persisting_ids == ["brand"], (
        f"only brand (1.3s) should persist, got {persisting_ids}"
    )
    print("PASS: persisting floor")


def test_ranking_by_time_saved():
    analyzer = ComparisonAnalyzer(build_db(optimized_after_stats()))
    result = analyzer.compare(EXEC_A, EXEC_B)

    top = result["top_improvements"]
    top_ids = [i["node_id"] for i in top]
    assert top_ids[0] == "claude", f"claude saved 13.7s, must rank #1, got {top_ids}"
    assert top_ids[1] == "legacy", f"legacy saved 10s, must rank #2, got {top_ids}"
    assert top_ids.index("submit") > top_ids.index("legacy"), (
        f"submit saved only 272ms, must rank below legacy: {top_ids}"
    )
    for item in top:
        assert "time_saved_ms" in item, f"missing time_saved_ms: {item}"
    print("PASS: ranking by time saved")


def test_removed_nodes_labeled():
    analyzer = ComparisonAnalyzer(build_db(optimized_after_stats()))
    result = analyzer.compare(EXEC_A, EXEC_B)

    removed = {i["node_id"]: i for i in result["resolved"]["items"] if i.get("removed")}
    assert set(removed) == {"legacy", "claude", "submit"}, f"got {set(removed)}"
    assert removed["claude"]["time_saved_ms"] == 13700
    print("PASS: removed nodes labeled")


def test_material_regression_still_flags():
    after = optimized_after_stats() + [
        node_stat(EXEC_B, "cms2", "New CMS Sync", 70, 5000),
    ]
    # give cms2 a slow before-state so it's a before-bottleneck that worsened
    db = build_db(after)
    db._tables["node_stats"].append(
        node_stat(EXEC_A, "cms2", "New CMS Sync", 60, 2000)
    )
    analyzer = ComparisonAnalyzer(db)
    result = analyzer.compare(EXEC_A, EXEC_B)

    worsened_ids = [i["node_id"] for i in result["worsened"]["items"]]
    assert worsened_ids == ["cms2"], f"+3s regression must be worsened, got {worsened_ids}"
    verdict = result["delta"]["verdict"]
    assert "concern" in verdict or "mixed" in verdict or "regression" in verdict, (
        f"verdict must flag the regression, got {verdict}"
    )
    print("PASS: material regression still flags")


def test_recommendation_counts_passed_through():
    analyzer = ComparisonAnalyzer(build_db(optimized_after_stats()))

    result = analyzer.compare(EXEC_A, EXEC_B, rec_count_a=31, rec_count_b=9)
    assert result["before"]["recommendations"] == 31
    assert result["after"]["recommendations"] == 9

    result_default = analyzer.compare(EXEC_A, EXEC_B)
    assert result_default["before"]["recommendations"] is None, (
        "unknown rec count must be None, never a fabricated 0"
    )
    print("PASS: recommendation counts passed through")


def test_verdict_excellent_for_big_clean_win():
    analyzer = ComparisonAnalyzer(build_db(optimized_after_stats()))
    result = analyzer.compare(EXEC_A, EXEC_B)

    # 27s saved on 40s = 67.5% faster, zero worsened, zero SEVERE after
    assert result["delta"]["verdict"] == "excellent", (
        f"expected excellent, got {result['delta']['verdict']}: "
        f"{result['delta']['verdict_message']}"
    )
    print("PASS: verdict excellent for big clean win")


if __name__ == "__main__":
    failures = 0
    for test in [
        test_noise_gate_and_unchanged_bucket,
        test_persisting_floor,
        test_ranking_by_time_saved,
        test_removed_nodes_labeled,
        test_material_regression_still_flags,
        test_recommendation_counts_passed_through,
        test_verdict_excellent_for_big_clean_win,
    ]:
        try:
            test()
        except AssertionError as e:
            failures += 1
            print(f"FAIL: {test.__name__}: {e}")
        except Exception as e:
            failures += 1
            print(f"ERROR: {test.__name__}: {type(e).__name__}: {e}")
    sys.exit(1 if failures else 0)
