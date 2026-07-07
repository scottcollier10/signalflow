"""
Test pgvector similarity search wiring (Tier 2.1)

Verifies that error clustering actually uses the pgvector HNSW index:

1. ErrorClusteringAnalyzer.find_similar_errors() queries the
   match_error_embeddings RPC (ORDER BY embedding <=> query -> HNSW path),
   scoped to a workflow, distance-capped, ascending order.

2. analyze_execution() uses vector-search candidate retrieval: clusters are
   seeded from the CURRENT execution's errors plus their pgvector neighbors.
   Historical-only patterns (validation errors with no instance in the
   current execution) must NOT appear in the result. The old full-corpus
   DBSCAN flow reports them; the new flow must not.

Requires local Supabase (supabase start). Seeds and cleans up its own data.

Run: venv/bin/python test_pgvector_search.py
"""

import asyncio
from datetime import datetime, timedelta, timezone

from supabase import create_client
from src.config import settings
from src.analysis.embeddings import ErrorEmbedder, ErrorEvent, clean_error_message
from src.analysis.error_clustering import ErrorClusteringAnalyzer

# Fixture messages. Verified pairwise cosine similarities (production
# embedding text: "Error: <msg>\nType: <type>\nNode: <humanized>"):
#   - all timeouts (historical + current + wf B) mutually >= 0.915
#   - validation pair 0.995
#   - timeout <-> validation max 0.379 (clean separation vs 0.75 threshold)
HIST_TIMEOUTS = ["API timeout after 30s", "Request timeout 30 seconds"]
HIST_VALIDATIONS = [
    "Validation failed: missing required field 'email'",
    "Validation error: required field 'email' is missing",
]
WF_B_TIMEOUT = "Request timed out after 30 seconds"
CURRENT_TIMEOUTS = ["API request timeout: 30s exceeded", "HTTP request timeout after 30s"]

TIMEOUT_NODE = {"node_id": "http_request", "node_name": "HTTP Request",
                "node_type": "n8n-nodes-base.httpRequest"}
VALIDATION_NODE = {"node_id": "validate_input", "node_name": "Validate Input",
                   "node_type": "n8n-nodes-base.code"}


def require_local_db():
    """Never run destructive seeding against a remote database."""
    assert "127.0.0.1" in settings.supabase_url or "localhost" in settings.supabase_url, (
        f"Refusing to run: supabase_url is not local ({settings.supabase_url})"
    )


def make_embedding_row(embedder, execution_id, message, error_type, node, event_id):
    """Build an error_embeddings insert payload the way the analyzer does."""
    cleaned = clean_error_message(message)
    event = ErrorEvent(
        event_id=event_id,
        node_id=node["node_id"],
        node_name=node["node_name"],
        node_type=node["node_type"],
        error_message=cleaned,
        error_type=error_type,
    )
    embedding = embedder.generate_embedding(event)
    return {
        "execution_id": execution_id,
        "node_id": node["node_id"],
        "event_id": event_id,
        "error_message": cleaned,
        "error_type": error_type,
        "stack_trace": None,
        "node_type": node["node_type"],
        "node_name": node["node_name"],
        "embedding": [float(x) for x in embedding.tolist()],
    }


def seed(db, embedder):
    """Seed two workflows with historical embeddings and one current execution."""
    now = datetime.now(timezone.utc)

    def insert_workflow(name):
        return db.table("workflows").insert({
            "name": name, "raw_json": {}, "node_count": 2, "edge_count": 1,
        }).execute().data[0]["id"]

    def insert_execution(workflow_id, started_offset_min, status="error"):
        started = now - timedelta(minutes=started_offset_min)
        return db.table("executions").insert({
            "workflow_id": workflow_id,
            "started_at": started.isoformat(),
            "finished_at": (started + timedelta(seconds=30)).isoformat(),
            "status": status,
            "raw_json": {},
        }).execute().data[0]["id"]

    wf_a = insert_workflow("pgvector-test-workflow-a")
    wf_b = insert_workflow("pgvector-test-workflow-b")

    for wf in (wf_a, wf_b):
        db.table("nodes").insert([
            {**TIMEOUT_NODE, "workflow_id": wf},
            {**VALIDATION_NODE, "workflow_id": wf},
        ]).execute()

    def insert_error_event(execution_id, message, node, seq, ts):
        return db.table("execution_events").insert({
            "execution_id": execution_id,
            "node_id": node["node_id"],
            "event_type": "error",
            "timestamp": ts.isoformat(),
            "status": "error",
            "error_message": message,
            "sequence_order": seq,
        }).execute().data[0]["id"]

    # Historical execution E1 in workflow A: 2 timeouts + 2 validations
    e1 = insert_execution(wf_a, started_offset_min=60)
    rows = []
    seq = 0
    for m in HIST_TIMEOUTS:
        ev_id = insert_error_event(e1, m, TIMEOUT_NODE, seq,
                                   now - timedelta(minutes=60, seconds=-seq))
        rows.append(make_embedding_row(embedder, e1, m, "TimeoutError", TIMEOUT_NODE, ev_id))
        seq += 1
    for m in HIST_VALIDATIONS:
        ev_id = insert_error_event(e1, m, VALIDATION_NODE, seq,
                                   now - timedelta(minutes=60, seconds=-seq))
        rows.append(make_embedding_row(embedder, e1, m, "ValidationError", VALIDATION_NODE, ev_id))
        seq += 1

    # Workflow B execution: 1 timeout (must never appear in workflow A results)
    e_b = insert_execution(wf_b, started_offset_min=50)
    ev_id = insert_error_event(e_b, WF_B_TIMEOUT, TIMEOUT_NODE, 0,
                               now - timedelta(minutes=50))
    rows.append(make_embedding_row(embedder, e_b, WF_B_TIMEOUT, "TimeoutError",
                                   TIMEOUT_NODE, ev_id))

    db.table("error_embeddings").insert(rows).execute()

    # Current execution E2 in workflow A: 2 timeout error EVENTS (no embeddings
    # yet -- analyze_execution must generate and persist them)
    e2 = insert_execution(wf_a, started_offset_min=5)
    events = []
    for i, msg in enumerate(CURRENT_TIMEOUTS):
        ts = now - timedelta(minutes=5) + timedelta(seconds=i)
        events.append({
            "execution_id": e2,
            "node_id": TIMEOUT_NODE["node_id"],
            "event_type": "error",
            "timestamp": ts.isoformat(),
            "status": "error",
            "error_message": msg,
            "metadata": {"error_type": "TimeoutError"},
            "sequence_order": i,
        })
    db.table("execution_events").insert(events).execute()

    return {"wf_a": wf_a, "wf_b": wf_b, "e1": e1, "e2": e2, "e_b": e_b}


def cleanup(db, ids):
    # Deleting workflows cascades to everything seeded here: nodes and
    # executions (ON DELETE CASCADE), executions to execution_events and
    # error_embeddings, and error_clusters via its workflow_id FK.
    for wf in ("wf_a", "wf_b"):
        if ids.get(wf):
            db.table("workflows").delete().eq("id", ids[wf]).execute()


async def test_find_similar_errors(db, embedder, ids):
    """find_similar_errors() returns workflow-scoped HNSW neighbors."""
    print("\n=== Test 1: find_similar_errors (HNSW similarity search) ===")
    analyzer = ErrorClusteringAnalyzer(db)

    query_event = ErrorEvent(
        event_id=None,
        node_id=TIMEOUT_NODE["node_id"],
        node_name=TIMEOUT_NODE["node_name"],
        node_type=TIMEOUT_NODE["node_type"],
        error_message=clean_error_message(CURRENT_TIMEOUTS[0]),
        error_type="TimeoutError",
    )
    query_embedding = embedder.generate_embedding(query_event)

    results = await analyzer.find_similar_errors(
        query_embedding=query_embedding,
        workflow_id=ids["wf_a"],
        match_count=10,
        max_distance=0.25,
    )

    assert len(results) >= 2, f"Expected >=2 similar errors, got {len(results)}"
    messages = [r["error_message"] for r in results]
    for m in HIST_TIMEOUTS:
        assert clean_error_message(m) in messages, f"Missing historical timeout: {m!r}"
    print(f"  ✓ Both historical timeouts returned ({len(results)} results)")

    for m in HIST_VALIDATIONS:
        assert clean_error_message(m) not in messages, (
            f"Validation error leaked past max_distance: {m!r}"
        )
    print("  ✓ Dissimilar validation errors excluded (max_distance respected)")

    assert clean_error_message(WF_B_TIMEOUT) not in messages, (
        "Workflow B embedding leaked into workflow A results (scoping broken)"
    )
    print("  ✓ Workflow-scoped (workflow B timeout excluded)")

    distances = [r["distance"] for r in results]
    assert all(0 <= d <= 0.25 for d in distances), f"Distance out of range: {distances}"
    assert distances == sorted(distances), f"Results not ascending by distance: {distances}"
    print(f"  ✓ Distances valid and ascending: {[round(d, 3) for d in distances]}")
    return True


async def test_cluster_via_vector_candidates(db, ids):
    """analyze_execution clusters current errors with HNSW-retrieved neighbors only."""
    print("\n=== Test 2: analyze_execution uses vector candidate retrieval ===")
    analyzer = ErrorClusteringAnalyzer(db)

    result = await analyzer.analyze_execution(
        execution_id=ids["e2"],
        workflow_id=ids["wf_a"],
    )

    assert len(result.execution_errors) == 2, (
        f"Expected 2 current errors, got {len(result.execution_errors)}"
    )
    print("  ✓ Both current timeout errors extracted")

    stored = db.table("error_embeddings").select("id").eq(
        "execution_id", ids["e2"]
    ).execute().data
    assert len(stored) == 2, f"Expected 2 persisted embeddings for E2, got {len(stored)}"
    print("  ✓ Embeddings persisted for current execution")

    timeout_clusters = [c for c in result.clusters if c["pattern_type"] == "timeout"]
    assert len(timeout_clusters) == 1, (
        f"Expected exactly 1 timeout cluster, got {len(timeout_clusters)}: "
        f"{[(c['pattern_type'], c['member_count']) for c in result.clusters]}"
    )
    members = timeout_clusters[0]["member_count"]
    assert members == 4, (
        f"Timeout cluster should include historical neighbors via vector search "
        f"(expected exactly 4 members: 2 current + 2 historical), got {members}"
    )
    print(f"  ✓ Timeout cluster includes historical neighbors ({members} members)")

    validation_clusters = [c for c in result.clusters
                           if c["pattern_type"] == "validation"]
    assert not validation_clusters, (
        "Historical-only validation cluster reported. The current execution has "
        "no validation errors, so candidate retrieval via vector search must not "
        "surface this pattern. (Old full-corpus DBSCAN behavior detected.)"
    )
    print("  ✓ No historical-only clusters (candidate retrieval, not full corpus)")
    return True


async def main():
    print("=" * 70)
    print("PGVECTOR SIMILARITY SEARCH TESTS")
    print("=" * 70)

    require_local_db()
    db = create_client(settings.supabase_url, settings.supabase_key)
    embedder = ErrorEmbedder()

    ids = {}
    try:
        ids = seed(db, embedder)
        print(f"Seeded workflow A={ids['wf_a'][:8]}..., workflow B={ids['wf_b'][:8]}...")

        ok1 = await test_find_similar_errors(db, embedder, ids)
        ok2 = await test_cluster_via_vector_candidates(db, ids)
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
