Implement Week 3 Day 3: Error Clustering & Pattern Detection

Read the complete specification in docs/specs/week3-day3-error-clustering.md and implement the error clustering system.

DELIVERABLES:
1. Database migrations for error_embeddings and error_clusters tables (with pgvector indexes)
2. backend/src/analysis/error_clustering.py - ErrorClusteringAnalyzer class
3. backend/src/analysis/embeddings.py - ErrorEmbedder class (HuggingFace integration)
4. API endpoint: GET /api/workflows/{workflow_id}/executions/{execution_id}/error-analysis
5. Unit tests for embedding generation, similarity calculation, pattern detection
6. Integration test with real error data

TECH STACK:
- HuggingFace sentence-transformers: all-MiniLM-L6-v2 model (no API key needed - runs locally)
- pgvector for similarity search (already installed in Supabase)
- DBSCAN clustering from scikit-learn
- FastAPI for endpoint

PYTHON DEPENDENCIES TO ADD:
```
sentence-transformers>=2.2.0
scikit-learn>=1.3.0
```

TEST DATA:
- Use workflow 8ce95407-8381-4756-85aa-c5c2a0251384
- Use execution 15720484-8e33-464b-84b8-0936ecfa7096
- If no errors exist, create synthetic test errors per spec (see "Test Data Preparation" section)

IMPLEMENTATION ORDER:
1. Database migrations first (test pgvector extension works)
2. ErrorEmbedder class (test embedding generation works)
3. Error extraction + cleaning utilities
4. ErrorClusteringAnalyzer main class
5. Similarity search with pgvector
6. DBSCAN clustering
7. Pattern detection + severity calculation
8. API endpoint
9. Tests

PERFORMANCE TARGETS:
- Embedding generation: <10ms per error
- API response: <500ms total
- Handle 100 errors efficiently

CRITICAL REMINDERS:
- HuggingFace model runs LOCALLY (no API key needed)
- Use cosine similarity with pgvector (already supports this)
- DBSCAN eps=0.25 (distance) = 0.75 similarity threshold
- Clean error messages before embedding (remove UUIDs, timestamps, paths)
- Follow spec's database schema exactly

Follow the spec precisely - it contains complete pseudocode, test cases, and expected results.
