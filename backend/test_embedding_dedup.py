"""
Bug-fix tests: re-running error analysis must NOT duplicate embedding rows.

Why: _generate_and_store_embeddings did a plain .insert per error with no
existence check, so every /error-analysis request re-inserted every error's
embedding. WF2's demo execution accumulated 10 copies of each of its 36
errors — the historical clustering set grew on every page load, the endpoint
got slower forever (94s measured), and summary counts went nonsensical
(clustered_errors 540 from 36 errors, unclustered_errors negative).

Run: python test_embedding_dedup.py
"""

import asyncio
import sys
import uuid
from unittest.mock import patch

import numpy as np

sys.path.insert(0, ".")

from src.analysis.embeddings import ErrorEvent
from src.analysis.error_clustering import ErrorClusteringAnalyzer


# =============================================================================
# Fakes
# =============================================================================

class FakeEmbedder:
    """Records batch calls; returns deterministic vectors."""

    def __init__(self):
        self.batch_calls = []

    def generate_embeddings_batch(self, errors):
        self.batch_calls.append([e.event_id for e in errors])
        return [np.zeros(384, dtype=np.float32) for _ in errors]


class FakeQuery:
    """Chainable query over error_embeddings rows, filters like PostgREST."""

    def __init__(self, db, table_name):
        self.db = db
        self.table_name = table_name
        self.filters = []
        self._insert_payload = None

    def select(self, *args):
        return self

    def eq(self, column, value):
        self.filters.append(lambda r: r.get(column) == value)
        return self

    def in_(self, column, values):
        self.filters.append(lambda r: r.get(column) in values)
        return self

    def insert(self, payload):
        self._insert_payload = payload
        return self

    def execute(self):
        rows = self.db.tables.setdefault(self.table_name, [])
        if self._insert_payload is not None:
            row = dict(self._insert_payload)
            row.setdefault("id", str(uuid.uuid4()))
            rows.append(row)
            self.db.inserts.setdefault(self.table_name, []).append(row)
            return type("R", (), {"data": [row]})()
        matches = [r for r in rows if all(f(r) for f in self.filters)]
        return type("R", (), {"data": matches})()


class FakeSupabase:
    def __init__(self):
        self.tables = {}
        self.inserts = {}

    def table(self, name):
        return FakeQuery(self, name)

    def seed_embedding(self, execution_id, event_id, row_id=None):
        row = {
            "id": row_id or str(uuid.uuid4()),
            "execution_id": execution_id,
            "event_id": event_id,
        }
        self.tables.setdefault("error_embeddings", []).append(row)
        return row["id"]


def make_errors(n):
    return [
        ErrorEvent(
            event_id=f"event-{i}",
            node_id=f"node-{i}",
            node_name=f"Node {i}",
            node_type="n8n-nodes-base.httpRequest",
            error_message=f"timeout connecting to api {i}",
        )
        for i in range(n)
    ]


def run_store(db, errors, execution_id="exec-1", embedder=None):
    embedder = embedder or FakeEmbedder()
    with patch("src.analysis.error_clustering.get_shared_embedder",
               return_value=embedder):
        analyzer = ErrorClusteringAnalyzer(db)
        ids = asyncio.run(
            analyzer._generate_and_store_embeddings(errors, execution_id)
        )
    return ids, embedder


# =============================================================================
# Tests
# =============================================================================

def test_first_run_inserts_all():
    """Fresh execution: every error gets exactly one row, ids in order."""
    db = FakeSupabase()
    errors = make_errors(3)
    ids, embedder = run_store(db, errors)
    inserted = db.inserts.get("error_embeddings", [])
    assert len(inserted) == 3, f"expected 3 inserts, got {len(inserted)}"
    assert len(ids) == 3 and all(ids)
    assert [r["event_id"] for r in inserted] == ["event-0", "event-1", "event-2"]
    print("✅ First run inserts one row per error")


def test_rerun_inserts_nothing_and_reuses_ids():
    """Re-analysis of an already-embedded execution: 0 inserts, 0 embeddings."""
    db = FakeSupabase()
    errors = make_errors(3)
    seeded = [db.seed_embedding("exec-1", e.event_id) for e in errors]
    ids, embedder = run_store(db, errors)
    inserted = db.inserts.get("error_embeddings", [])
    assert len(inserted) == 0, (
        f"re-run duplicated {len(inserted)} embedding rows — must reuse"
    )
    assert ids == seeded, "must return the existing embedding ids, in order"
    assert embedder.batch_calls == [], "must not re-embed already-stored errors"
    print("✅ Re-run inserts nothing and reuses existing ids")


def test_partial_rerun_embeds_only_new_errors():
    """Mixed case: only errors without a stored embedding are embedded/inserted."""
    db = FakeSupabase()
    errors = make_errors(3)
    existing_id = db.seed_embedding("exec-1", "event-1")
    ids, embedder = run_store(db, errors)
    inserted = db.inserts.get("error_embeddings", [])
    assert len(inserted) == 2, f"expected 2 inserts, got {len(inserted)}"
    assert embedder.batch_calls == [["event-0", "event-2"]], (
        f"embedded wrong set: {embedder.batch_calls}"
    )
    assert len(ids) == 3 and ids[1] == existing_id, "order must be preserved"
    print("✅ Partial re-run embeds and inserts only new errors")


def test_polluted_duplicates_resolve_to_one_id():
    """Pre-polluted DB (multiple copies per event): reuse one, insert none."""
    db = FakeSupabase()
    errors = make_errors(1)
    first = db.seed_embedding("exec-1", "event-0")
    db.seed_embedding("exec-1", "event-0")  # duplicate copy
    ids, _ = run_store(db, errors)
    assert db.inserts.get("error_embeddings", []) == [], "must not add an 11th copy"
    assert ids == [first], "must resolve duplicates to the first stored row"
    print("✅ Polluted duplicates resolve to a single reused id")


def test_scoped_to_execution():
    """An embedding for the same event_id on a DIFFERENT execution doesn't count."""
    db = FakeSupabase()
    errors = make_errors(1)
    db.seed_embedding("other-exec", "event-0")
    ids, embedder = run_store(db, errors)
    assert len(db.inserts.get("error_embeddings", [])) == 1, (
        "row for another execution must not suppress this execution's insert"
    )
    print("✅ Dedup is scoped to the execution being analyzed")


if __name__ == "__main__":
    tests = [
        test_first_run_inserts_all,
        test_rerun_inserts_nothing_and_reuses_ids,
        test_partial_rerun_embeds_only_new_errors,
        test_polluted_duplicates_resolve_to_one_id,
        test_scoped_to_execution,
    ]
    failures = 0
    for test in tests:
        try:
            test()
        except AssertionError as e:
            failures += 1
            print(f"❌ {test.__name__}: {e}")
    print("=" * 60)
    if failures:
        print(f"❌ {failures}/{len(tests)} tests FAILED")
        sys.exit(1)
    print(f"✅ All {len(tests)} tests passed")
    print("=" * 60)
