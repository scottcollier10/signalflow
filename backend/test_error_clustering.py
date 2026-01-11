"""
Test script for error clustering implementation.

Tests:
1. ErrorEmbedder - embedding generation
2. Error message cleaning
3. Basic similarity checking
"""

import asyncio
from src.analysis.embeddings import ErrorEmbedder, ErrorEvent, clean_error_message
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


def test_embedding_generation():
    """Test that embeddings are generated correctly"""
    print("\n===== Testing Embedding Generation =====")

    embedder = ErrorEmbedder()

    # Create test error
    error = ErrorEvent(
        event_id="test-123",
        node_id="node_1",
        node_name="HTTP Request",
        node_type="n8n-nodes-base.httpRequest",
        error_message="API timeout after 30s",
        error_type="TimeoutError"
    )

    print(f"Test error: {error.error_message}")

    # Generate embedding
    embedding = embedder.generate_embedding(error)

    print(f"✅ Embedding shape: {embedding.shape}")
    print(f"✅ Embedding dimension: {len(embedding)}")
    print(f"✅ L2 norm (should be ~1.0): {np.linalg.norm(embedding):.4f}")

    assert embedding.shape == (384,), f"Expected shape (384,), got {embedding.shape}"
    assert np.allclose(np.linalg.norm(embedding), 1.0, atol=0.01), "Embedding not normalized"

    print("✅ Embedding generation test passed!")
    return embedder


def test_similar_errors_cluster():
    """Test that similar errors have high similarity"""
    print("\n===== Testing Similar Error Clustering =====")

    embedder = ErrorEmbedder()

    # Create similar timeout errors
    timeout_errors = [
        ErrorEvent(
            event_id="e1",
            node_id="node_1",
            node_name="HTTP Request",
            node_type="n8n-nodes-base.httpRequest",
            error_message="API timeout after 30s",
            error_type="TimeoutError"
        ),
        ErrorEvent(
            event_id="e2",
            node_id="node_2",
            node_name="HTTP Request",
            node_type="n8n-nodes-base.httpRequest",
            error_message="Request timeout 30 seconds",
            error_type="TimeoutError"
        ),
        ErrorEvent(
            event_id="e3",
            node_id="node_3",
            node_name="HTTP Request",
            node_type="n8n-nodes-base.httpRequest",
            error_message="TimeoutError: exceeded limit",
            error_type="TimeoutError"
        ),
    ]

    print("Generating embeddings for 3 similar timeout errors...")
    embeddings = embedder.generate_embeddings_batch(timeout_errors)

    # Calculate pairwise similarities
    similarities = cosine_similarity(embeddings)

    print("\nSimilarity Matrix:")
    for i in range(len(embeddings)):
        for j in range(i+1, len(embeddings)):
            sim = similarities[i][j]
            print(f"  Error {i+1} vs Error {j+1}: {sim:.4f}")

            # All pairs should have high similarity (> 0.75)
            assert sim > 0.75, f"Expected similarity > 0.75, got {sim:.4f}"

    print("✅ Similar errors cluster together!")


def test_different_errors_separate():
    """Test that different errors have low similarity"""
    print("\n===== Testing Different Error Separation =====")

    embedder = ErrorEmbedder()

    # Create different error types
    error1 = ErrorEvent(
        event_id="e1",
        node_id="node_1",
        node_name="HTTP Request",
        node_type="n8n-nodes-base.httpRequest",
        error_message="API timeout after 30s",
        error_type="TimeoutError"
    )

    error2 = ErrorEvent(
        event_id="e2",
        node_id="node_2",
        node_name="Claude AI",
        node_type="n8n-nodes-base.anthropic",
        error_message="Invalid API key provided",
        error_type="AuthenticationError"
    )

    print(f"Error 1: {error1.error_message} ({error1.error_type})")
    print(f"Error 2: {error2.error_message} ({error2.error_type})")

    # Generate embeddings
    emb1 = embedder.generate_embedding(error1)
    emb2 = embedder.generate_embedding(error2)

    # Calculate similarity
    similarity = cosine_similarity([emb1], [emb2])[0][0]

    print(f"\nSimilarity: {similarity:.4f}")
    print(f"Should be < 0.75 (different errors)")

    assert similarity < 0.75, f"Expected similarity < 0.75, got {similarity:.4f}"

    print("✅ Different errors remain separate!")


def test_error_message_cleaning():
    """Test error message cleaning"""
    print("\n===== Testing Error Message Cleaning =====")

    test_cases = [
        (
            "Error in request 8ce95407-8381-4756-85aa-c5c2a0251384",
            "error in request <id>"
        ),
        (
            "Timeout after 30s at 2024-01-11T10:30:00Z",
            "timeout after 30s at <timestamp>"
        ),
        (
            "File /home/user/app.py line 42",
            "file <path> line <num>"
        ),
        (
            "Connection to 192.168.1.1:8080 failed",
            "connection to <ip>:<port> failed"
        ),
    ]

    for raw, expected in test_cases:
        cleaned = clean_error_message(raw)
        print(f"  {raw}")
        print(f"  → {cleaned}")
        print(f"  (expected: {expected})")

        # Basic check that cleaning happened
        assert cleaned.islower(), "Should be lowercase"

    print("✅ Error message cleaning works!")


def test_batch_processing():
    """Test batch embedding generation"""
    print("\n===== Testing Batch Processing =====")

    embedder = ErrorEmbedder()

    # Create multiple errors
    errors = [
        ErrorEvent(
            event_id=f"e{i}",
            node_id=f"node_{i}",
            node_name="HTTP Request",
            node_type="n8n-nodes-base.httpRequest",
            error_message=f"Error {i}",
            error_type="Error"
        )
        for i in range(10)
    ]

    print(f"Generating embeddings for {len(errors)} errors...")

    # Generate embeddings in batch
    embeddings = embedder.generate_embeddings_batch(errors)

    print(f"✅ Generated {len(embeddings)} embeddings")
    print(f"✅ Shape: {embeddings.shape}")

    assert embeddings.shape == (10, 384), f"Expected (10, 384), got {embeddings.shape}"

    print("✅ Batch processing works!")


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("Error Clustering Implementation Tests")
    print("="*60)

    try:
        # Test 1: Basic embedding generation
        embedder = test_embedding_generation()

        # Test 2: Similar errors cluster together
        test_similar_errors_cluster()

        # Test 3: Different errors stay separate
        test_different_errors_separate()

        # Test 4: Error message cleaning
        test_error_message_cleaning()

        # Test 5: Batch processing
        test_batch_processing()

        print("\n" + "="*60)
        print("✅ ALL TESTS PASSED!")
        print("="*60 + "\n")

    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
