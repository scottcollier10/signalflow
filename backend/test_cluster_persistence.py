"""
Test cluster persistence failure surfacing (Tier 2.3)

_store_clusters used to swallow insert failures with a bare print(), making
cluster persistence failures invisible to callers. Verifies:

1. _store_clusters returns a warning per failed cluster (and does not raise).
2. analyze_execution surfaces those warnings in the result's
   analysis_context['persistence_warnings'] while still returning the
   in-memory clusters.

Requires local Supabase (supabase start). Reuses seed/cleanup fixtures from
test_pgvector_search.

Run: venv/bin/python test_cluster_persistence.py
"""

import asyncio

from supabase import create_client
from src.config import settings
from src.analysis.embeddings import ErrorEmbedder
from src.analysis.error_clustering import ErrorClusteringAnalyzer, ErrorCluster

from test_pgvector_search import require_local_db, seed, cleanup


class FailingTable:
    """Query builder stub whose execute() always fails."""

    def insert(self, *args, **kwargs):
        return self

    def execute(self):
        raise Exception("simulated insert failure")


class FailingClustersDB:
    """Wraps a real client but fails all error_clusters operations."""

    def __init__(self, real_client):
        self._real = real_client

    def table(self, name):
        if name == "error_clusters":
            return FailingTable()
        return self._real.table(name)

    def rpc(self, *args, **kwargs):
        return self._real.rpc(*args, **kwargs)


def make_cluster(workflow_id):
    return ErrorCluster(
        id="00000000-0000-0000-0000-00000000dead",
        workflow_id=workflow_id,
        label="Timeout Issues (2 occurrences)",
        representative_error_id="00000000-0000-0000-0000-00000000beef",
        representative_message="api timeout after 30s",
        member_count=2,
        avg_similarity=0.9,
        affected_nodes=[],
        pattern_type="timeout",
        severity="medium",
    )


async def test_store_clusters_returns_warnings(db, ids):
    """_store_clusters reports failures to the caller instead of printing."""
    print("\n=== Test 1: _store_clusters returns failure warnings ===")
    analyzer = ErrorClusteringAnalyzer(FailingClustersDB(db))

    cluster = make_cluster(ids["wf_a"])
    warnings = await analyzer._store_clusters([cluster])

    assert isinstance(warnings, list), (
        f"_store_clusters should return a list of warnings, got {type(warnings)}"
    )
    assert len(warnings) == 1, f"Expected 1 warning, got {warnings!r}"
    assert cluster.id in warnings[0], (
        f"Warning should identify the failed cluster: {warnings[0]!r}"
    )
    print(f"  ✓ Failure reported to caller: {warnings[0][:70]}...")
    return True


async def test_analyze_execution_surfaces_warnings(db, ids):
    """analyze_execution exposes persistence failures in the result."""
    print("\n=== Test 2: analyze_execution surfaces persistence warnings ===")
    analyzer = ErrorClusteringAnalyzer(FailingClustersDB(db))

    result = await analyzer.analyze_execution(
        execution_id=ids["e2"],
        workflow_id=ids["wf_a"],
    )

    # In-memory clusters are still returned (analysis succeeded)
    timeout_clusters = [c for c in result.clusters if c["pattern_type"] == "timeout"]
    assert len(timeout_clusters) == 1, (
        f"Analysis should still return clusters when storage fails, "
        f"got {len(timeout_clusters)} timeout clusters"
    )
    print("  ✓ In-memory clusters still returned")

    warnings = result.analysis_context.get("persistence_warnings")
    assert warnings, (
        "Storage failed but analysis_context['persistence_warnings'] is "
        f"missing/empty: {result.analysis_context!r}"
    )
    assert len(warnings) == 1, f"Expected 1 warning, got {warnings!r}"
    print(f"  ✓ Warning surfaced in result: {warnings[0][:70]}...")
    return True


async def main():
    print("=" * 70)
    print("CLUSTER PERSISTENCE FAILURE TESTS")
    print("=" * 70)

    require_local_db()
    db = create_client(settings.supabase_url, settings.supabase_key)
    embedder = ErrorEmbedder()

    ids = {}
    try:
        ids = seed(db, embedder)
        print(f"Seeded workflow A={ids['wf_a'][:8]}...")

        ok1 = await test_store_clusters_returns_warnings(db, ids)
        ok2 = await test_analyze_execution_surfaces_warnings(db, ids)
        success = ok1 and ok2
    finally:
        cleanup(db, ids)
        print("\nCleaned up seeded data.")

    print("\n" + "=" * 70)
    print("✅ ALL TESTS PASSED" if success else "❌ TESTS FAILED")
    print("=" * 70)
    return success


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
