"""
Perf tests: ErrorClusteringAnalyzer must not load the sentence-transformers
model eagerly, and the model must be a process-wide singleton.

Why: the /error-analysis endpoint constructs a fresh analyzer per request.
Eagerly loading the ~80MB MiniLM model in __init__ cost ~1.4s on EVERY
request — including zero-error executions that never embed anything.

Run: python test_error_embedder_lazy.py
"""

import asyncio
import sys
import threading
from unittest.mock import MagicMock, patch

sys.path.insert(0, ".")

import src.analysis.embeddings as embeddings_module
from src.analysis.embeddings import get_shared_embedder
from src.analysis.error_clustering import ErrorClusteringAnalyzer


# =============================================================================
# Fakes
# =============================================================================

class FakeModel:
    """Stands in for SentenceTransformer; counts constructions."""
    constructions = 0

    def __init__(self, model_name):
        FakeModel.constructions += 1
        self.model_name = model_name

    def eval(self):
        pass


class FakeQuery:
    """Chainable query that always returns no rows."""

    def __getattr__(self, name):
        if name == "execute":
            return lambda: MagicMock(data=[])
        return lambda *args, **kwargs: self


class FakeSupabase:
    def table(self, name):
        return FakeQuery()


def reset_singleton():
    FakeModel.constructions = 0
    embeddings_module._shared_embedder = None


# =============================================================================
# Tests
# =============================================================================

def test_analyzer_construction_does_not_load_model():
    """ErrorClusteringAnalyzer() must be cheap — no model load in __init__."""
    reset_singleton()
    with patch.object(embeddings_module, "SentenceTransformer", FakeModel):
        ErrorClusteringAnalyzer(FakeSupabase())
        assert FakeModel.constructions == 0, (
            f"Constructing the analyzer loaded the model "
            f"({FakeModel.constructions} constructions) — must be lazy"
        )
    print("✅ Analyzer construction does not load the model")


def test_zero_error_analysis_never_loads_model():
    """analyze_execution on an execution with no errors must skip the model."""
    reset_singleton()
    with patch.object(embeddings_module, "SentenceTransformer", FakeModel):
        analyzer = ErrorClusteringAnalyzer(FakeSupabase())
        result = asyncio.run(analyzer.analyze_execution(
            execution_id="exec-no-errors",
            workflow_id="wf-1",
        ))
        assert result.summary["total_errors"] == 0
        assert FakeModel.constructions == 0, (
            "Zero-error analysis loaded the embedding model for nothing"
        )
    print("✅ Zero-error analysis never loads the model")


def test_embedder_is_a_shared_singleton():
    """Two analyzers that need the embedder share ONE model instance."""
    reset_singleton()
    with patch.object(embeddings_module, "SentenceTransformer", FakeModel):
        a = ErrorClusteringAnalyzer(FakeSupabase())
        b = ErrorClusteringAnalyzer(FakeSupabase())
        assert a.embedder is b.embedder, "Analyzers must share one embedder"
        assert FakeModel.constructions == 1, (
            f"Model constructed {FakeModel.constructions}x — must be once"
        )
    print("✅ Embedder is a process-wide singleton (model loads once)")


def test_singleton_is_thread_safe():
    """Concurrent first access (to_thread workers) constructs exactly one model."""
    reset_singleton()

    class SlowFakeModel(FakeModel):
        def __init__(self, model_name):
            import time
            time.sleep(0.05)  # widen the race window
            super().__init__(model_name)

    with patch.object(embeddings_module, "SentenceTransformer", SlowFakeModel):
        results = []
        threads = [
            threading.Thread(target=lambda: results.append(get_shared_embedder()))
            for _ in range(8)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert FakeModel.constructions == 1, (
            f"Race: model constructed {FakeModel.constructions}x under "
            f"concurrent access — needs a lock"
        )
        assert all(r is results[0] for r in results)
    print("✅ Singleton construction is thread-safe")


if __name__ == "__main__":
    tests = [
        test_analyzer_construction_does_not_load_model,
        test_zero_error_analysis_never_loads_model,
        test_embedder_is_a_shared_singleton,
        test_singleton_is_thread_safe,
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
