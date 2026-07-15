"""
Perf tests: per-error pgvector similarity lookups must run concurrently.

Why: _cluster_errors called find_similar_errors sequentially, one await per
current error — and find_similar_errors does a blocking RPC, so 36 errors
meant 36 back-to-back round trips to hosted Supabase (~180ms each ≈ 6.5s of
pure network serialization). The math afterward (DBSCAN over ~100 vectors)
is microseconds. Fanning the lookups out across threads collapses the wall
time to roughly one round trip.

Run: python test_parallel_similarity.py
"""

import asyncio
import sys
import threading
import time

import numpy as np

sys.path.insert(0, ".")

from src.analysis.error_clustering import ErrorClusteringAnalyzer


RPC_DELAY = 0.10  # simulated round-trip latency per similarity lookup


class FakeRpcQuery:
    def __init__(self, db, params):
        self.db = db
        self.params = params

    def execute(self):
        with self.db.lock:
            self.db.in_flight += 1
            self.db.max_concurrent = max(self.db.max_concurrent, self.db.in_flight)
            self.db.calls.append(self.params)
        time.sleep(RPC_DELAY)
        with self.db.lock:
            self.db.in_flight -= 1
        # One unique neighbor per query, tagged by query embedding's first dim
        tag = int(self.params["query_embedding"][0])
        return type("R", (), {"data": [{
            "id": f"neighbor-{tag}",
            "embedding": str([float(tag)] + [0.0] * 383),
        }]})()


class FakeSupabase:
    def __init__(self):
        self.lock = threading.Lock()
        self.in_flight = 0
        self.max_concurrent = 0
        self.calls = []

    def rpc(self, name, params):
        assert name == "match_error_embeddings"
        return FakeRpcQuery(self, params)


def make_rows(n):
    return [
        {"id": f"current-{i}", "embedding": np.array([float(i)] + [0.0] * 383)}
        for i in range(n)
    ]


def gather(db, rows):
    analyzer = ErrorClusteringAnalyzer(db)
    return asyncio.run(analyzer._gather_neighbors(
        current=rows,
        workflow_id="wf-1",
        execution_window=100,
        max_distance=0.25,
    ))


def test_lookups_run_concurrently():
    """8 lookups at 100ms each must overlap, not serialize (~800ms)."""
    db = FakeSupabase()
    rows = make_rows(8)
    start = time.monotonic()
    gather(db, rows)
    elapsed = time.monotonic() - start
    assert db.max_concurrent >= 2, (
        f"lookups never overlapped (max concurrent {db.max_concurrent})"
    )
    assert elapsed < 8 * RPC_DELAY * 0.6, (
        f"took {elapsed:.2f}s for 8 x {RPC_DELAY}s lookups — still sequential"
    )
    print(f"✅ Lookups overlap (max concurrent {db.max_concurrent}, "
          f"{elapsed:.2f}s for 8 x {RPC_DELAY}s)")


def test_results_ordered_and_parsed():
    """Neighbor lists come back in input order with parsed numpy embeddings."""
    db = FakeSupabase()
    rows = make_rows(4)
    neighbor_lists = gather(db, rows)
    assert len(neighbor_lists) == 4
    for i, neighbors in enumerate(neighbor_lists):
        assert neighbors[0]["id"] == f"neighbor-{i}", (
            f"list {i} out of order: got {neighbors[0]['id']}"
        )
        emb = neighbors[0]["embedding"]
        assert isinstance(emb, np.ndarray) and emb.shape == (384,), (
            "embedding must be parsed to a 384-dim numpy array"
        )
    print("✅ Neighbor lists preserve input order and parse embeddings")


def test_rpc_params_unchanged():
    """Each lookup still sends the same workflow-scoped RPC parameters."""
    db = FakeSupabase()
    gather(db, make_rows(2))
    assert len(db.calls) == 2
    for params in db.calls:
        assert params["target_workflow_id"] == "wf-1"
        assert params["match_count"] == 100
        assert params["max_distance"] == 0.25
        assert len(params["query_embedding"]) == 384
    print("✅ RPC parameters unchanged (workflow scope, count, distance)")


if __name__ == "__main__":
    tests = [
        test_lookups_run_concurrently,
        test_results_ordered_and_parsed,
        test_rpc_params_unchanged,
    ]
    failures = 0
    for test in tests:
        try:
            test()
        except (AssertionError, AttributeError) as e:
            failures += 1
            print(f"❌ {test.__name__}: {e}")
    print("=" * 60)
    if failures:
        print(f"❌ {failures}/{len(tests)} tests FAILED")
        sys.exit(1)
    print(f"✅ All {len(tests)} tests passed")
    print("=" * 60)
