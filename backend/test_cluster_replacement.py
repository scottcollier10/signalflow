"""
Bug-fix tests: storing clusters must REPLACE the workflow's clusters,
not pile new rows on top of old ones.

Why: _store_clusters was insert-only. Every /error-analysis run generated
clusters with fresh UUIDs and inserted them, so error_clusters grew by
~6 rows per run (observed 66 -> 84 over 3 runs on WF2). Rule 15 in the
recommendation engine reads ALL error_clusters for a workflow, so stale
copies inflated recommendation counts. Same delete-then-insert pattern
node_stats uses in the bottleneck analyzer.

Run: python test_cluster_replacement.py
"""

import asyncio
import sys
import uuid

sys.path.insert(0, ".")

from src.analysis.error_clustering import ErrorCluster, ErrorClusteringAnalyzer


# =============================================================================
# Fakes
# =============================================================================

class FakeQuery:
    def __init__(self, db, table_name):
        self.db = db
        self.table_name = table_name
        self.filters = []
        self._insert_payload = None
        self._is_delete = False

    def eq(self, column, value):
        self.filters.append((column, value))
        return self

    def insert(self, payload):
        self._insert_payload = payload
        return self

    def delete(self):
        self._is_delete = True
        return self

    def update(self, payload):
        self._insert_payload = None
        self._is_update = True
        return self

    def execute(self):
        rows = self.db.tables.setdefault(self.table_name, [])
        if self._is_delete:
            if self.db.fail_deletes and self.table_name == "error_clusters":
                raise RuntimeError("simulated delete failure")
            kept = [
                r for r in rows
                if not all(r.get(c) == v for c, v in self.filters)
            ]
            self.db.tables[self.table_name] = kept
            self.db.deletes.append((self.table_name, list(self.filters)))
            return type("R", (), {"data": []})()
        if self._insert_payload is not None:
            if (self.db.fail_inserts_for_label is not None
                    and self._insert_payload.get("label") == self.db.fail_inserts_for_label):
                raise RuntimeError("simulated insert failure")
            row = dict(self._insert_payload)
            rows.append(row)
            return type("R", (), {"data": [row]})()
        # update path (cluster assignment on embeddings) — no-op
        return type("R", (), {"data": []})()


class FakeSupabase:
    def __init__(self):
        self.tables = {}
        self.deletes = []
        self.fail_deletes = False
        self.fail_inserts_for_label = None

    def table(self, name):
        return FakeQuery(self, name)

    def seed_cluster(self, workflow_id, label):
        self.tables.setdefault("error_clusters", []).append({
            "id": str(uuid.uuid4()),
            "workflow_id": workflow_id,
            "label": label,
        })


def make_cluster(workflow_id, label):
    return ErrorCluster(
        id=str(uuid.uuid4()),
        workflow_id=workflow_id,
        label=label,
        representative_error_id=str(uuid.uuid4()),
        representative_message="timeout connecting to api",
        member_count=4,
        avg_similarity=0.9,
        affected_nodes=[{"node_id": "node-1", "error_count": 4}],
        pattern_type="timeout",
        severity="CRITICAL",
    )


def store(db, clusters, workflow_id):
    analyzer = ErrorClusteringAnalyzer(db)
    return asyncio.run(analyzer._store_clusters(clusters, workflow_id))


# =============================================================================
# Tests
# =============================================================================

def test_restore_replaces_workflow_clusters():
    """Re-analysis replaces the workflow's clusters instead of accumulating."""
    db = FakeSupabase()
    for i in range(6):
        db.seed_cluster("wf-A", f"stale cluster {i}")
    new = [make_cluster("wf-A", f"fresh cluster {i}") for i in range(3)]
    warnings = store(db, new, "wf-A")
    rows = db.tables["error_clusters"]
    assert warnings == []
    assert len(rows) == 3, (
        f"expected 3 rows after re-store, got {len(rows)} — stale clusters "
        f"must be deleted before inserting the fresh set"
    )
    assert all(r["label"].startswith("fresh") for r in rows)
    print("✅ Re-store replaces the workflow's clusters")


def test_other_workflows_untouched():
    """Replacement is scoped to the analyzed workflow only."""
    db = FakeSupabase()
    db.seed_cluster("wf-A", "stale A")
    db.seed_cluster("wf-B", "other workflow")
    store(db, [make_cluster("wf-A", "fresh A")], "wf-A")
    labels = {r["label"] for r in db.tables["error_clusters"]}
    assert labels == {"fresh A", "other workflow"}, f"got {labels}"
    print("✅ Other workflows' clusters are untouched")


def test_empty_result_clears_stale_clusters():
    """A run that finds no clusters clears the stale stored state."""
    db = FakeSupabase()
    db.seed_cluster("wf-A", "stale A")
    warnings = store(db, [], "wf-A")
    assert warnings == []
    assert db.tables["error_clusters"] == [], "stale clusters must be cleared"
    print("✅ Empty cluster result clears stale rows")


def test_insert_failure_surfaces_warning_others_persist():
    """Existing contract: one failed insert warns, the rest still persist."""
    db = FakeSupabase()
    db.fail_inserts_for_label = "bad cluster"
    clusters = [make_cluster("wf-A", "good cluster"),
                make_cluster("wf-A", "bad cluster")]
    warnings = store(db, clusters, "wf-A")
    assert len(warnings) == 1 and "bad cluster" in warnings[0]
    labels = [r["label"] for r in db.tables.get("error_clusters", [])]
    assert labels == ["good cluster"]
    print("✅ Insert failure warns; other clusters persist")


def test_delete_failure_warns_and_still_inserts():
    """If clearing stale rows fails, surface a warning but keep the analysis alive."""
    db = FakeSupabase()
    db.fail_deletes = True
    warnings = store(db, [make_cluster("wf-A", "fresh A")], "wf-A")
    assert any("stale" in w.lower() or "delete" in w.lower() or "clear" in w.lower()
               for w in warnings), f"expected a warning about the failed clear: {warnings}"
    labels = [r["label"] for r in db.tables.get("error_clusters", [])]
    assert labels == ["fresh A"], "new clusters must still be stored"
    print("✅ Delete failure warns but new clusters still persist")


if __name__ == "__main__":
    tests = [
        test_restore_replaces_workflow_clusters,
        test_other_workflows_untouched,
        test_empty_result_clears_stale_clusters,
        test_insert_failure_surfaces_warning_others_persist,
        test_delete_failure_warns_and_still_inserts,
    ]
    failures = 0
    for test in tests:
        try:
            test()
        except AssertionError as e:
            failures += 1
            print(f"❌ {test.__name__}: {e}")
        except TypeError as e:
            failures += 1
            print(f"❌ {test.__name__}: {e}")
    print("=" * 60)
    if failures:
        print(f"❌ {failures}/{len(tests)} tests FAILED")
        sys.exit(1)
    print(f"✅ All {len(tests)} tests passed")
    print("=" * 60)
