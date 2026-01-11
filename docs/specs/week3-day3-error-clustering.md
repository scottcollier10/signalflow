# Week 3 Day 3: Error Clustering & Pattern Detection Specification

**Created**: January 11, 2026  
**Status**: Implementation Ready  
**Module**: `backend/src/analysis/error_clustering.py`  
**API Endpoint**: `GET /api/workflows/{workflow_id}/executions/{execution_id}/error-analysis`

---

## Overview

The error clustering system identifies and groups similar errors across workflow executions using semantic similarity. Instead of treating each error as unique, we cluster them by meaning to reveal patterns, recurring issues, and systemic problems.

### Why Error Clustering Matters

**Without clustering:**
```
Execution 1: "ConnectionError: API timeout after 30s"
Execution 2: "RequestTimeout: Claude API failed to respond"
Execution 3: "TimeoutError: Request exceeded 30 second limit"
```
→ User sees 3 different errors, no pattern recognition

**With clustering:**
```
Cluster: "API Timeout Issues" (3 occurrences)
├─ Similarity: 0.89 (very similar)
├─ Pattern: Claude API timeouts under load
├─ Recommendation: Increase timeout or add retry logic
└─ Evidence: [Link to 3 executions]
```
→ User sees 1 systemic issue with 3 examples

### SignalFlow's Evidence-First Approach

Every clustered error pattern must include:
1. **Similarity score** (0-1, how similar errors are)
2. **Representative error** (best example from cluster)
3. **Occurrence count** (how many times this pattern appears)
4. **Affected nodes** (which nodes experience this error)
5. **Clickable links** to actual execution events (proof!)

---

## Technical Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│ Error Clustering Pipeline                                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ 1. Error Extraction                                          │
│    ├─ Query execution_events WHERE status = 'ERROR'         │
│    ├─ Extract error messages, stack traces, node context    │
│    └─ Deduplicate identical messages                         │
│                                                               │
│ 2. Embedding Generation (HuggingFace)                       │
│    ├─ Model: sentence-transformers/all-MiniLM-L6-v2         │
│    ├─ Input: Error message + node type + context            │
│    └─ Output: 384-dimensional vector                         │
│                                                               │
│ 3. Similarity Search (pgvector)                             │
│    ├─ Store embeddings in error_embeddings table            │
│    ├─ Use cosine similarity for clustering                  │
│    └─ Find errors with similarity > 0.75                     │
│                                                               │
│ 4. Cluster Formation (DBSCAN)                               │
│    ├─ Group similar errors (eps=0.25, min_samples=2)        │
│    ├─ Identify representative error for each cluster        │
│    └─ Calculate cluster statistics                           │
│                                                               │
│ 5. Pattern Detection (Rules Engine)                         │
│    ├─ Analyze cluster characteristics                        │
│    ├─ Match against known error patterns                    │
│    └─ Generate evidence-backed recommendations              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Table: error_embeddings

```sql
CREATE TABLE error_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to original error event
    execution_id UUID NOT NULL REFERENCES executions(id),
    node_id TEXT NOT NULL,
    event_id UUID NOT NULL,
    
    -- Error details
    error_message TEXT NOT NULL,
    error_type TEXT,
    stack_trace TEXT,
    node_type TEXT,
    node_name TEXT,
    
    -- Embedding (384 dimensions for all-MiniLM-L6-v2)
    embedding vector(384) NOT NULL,
    
    -- Cluster assignment (filled during clustering)
    cluster_id UUID,
    cluster_label TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for fast similarity search
    CONSTRAINT fk_execution FOREIGN KEY (execution_id) 
        REFERENCES executions(id) ON DELETE CASCADE
);

-- Vector similarity index (HNSW for fast approximate search)
CREATE INDEX idx_error_embeddings_vector 
    ON error_embeddings 
    USING hnsw (embedding vector_cosine_ops);

-- Standard indexes
CREATE INDEX idx_error_embeddings_execution 
    ON error_embeddings(execution_id);
CREATE INDEX idx_error_embeddings_cluster 
    ON error_embeddings(cluster_id);
CREATE INDEX idx_error_embeddings_node_type 
    ON error_embeddings(node_type);
```

### Table: error_clusters

```sql
CREATE TABLE error_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Cluster identity
    workflow_id UUID NOT NULL REFERENCES workflows(id),
    label TEXT NOT NULL,  -- e.g., "API Timeout Issues"
    
    -- Representative error (best example from cluster)
    representative_error_id UUID REFERENCES error_embeddings(id),
    representative_message TEXT NOT NULL,
    
    -- Cluster statistics
    member_count INT NOT NULL DEFAULT 0,
    avg_similarity FLOAT,  -- Average similarity within cluster
    
    -- Affected nodes
    affected_nodes JSONB,  -- Array of {node_id, node_name, occurrence_count}
    
    -- Pattern detection
    pattern_type TEXT,  -- e.g., "timeout", "auth_failure", "rate_limit"
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Metadata
    first_seen TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_workflow FOREIGN KEY (workflow_id) 
        REFERENCES workflows(id) ON DELETE CASCADE
);

CREATE INDEX idx_error_clusters_workflow 
    ON error_clusters(workflow_id);
CREATE INDEX idx_error_clusters_pattern 
    ON error_clusters(pattern_type);
CREATE INDEX idx_error_clusters_severity 
    ON error_clusters(severity);
```

---

## Algorithm: Error Clustering with DBSCAN

### Phase 1: Error Extraction

**Input**: Execution ID  
**Output**: List of error events with context

```python
def extract_errors(execution_id: str) -> List[ErrorEvent]:
    """
    Extract all error events from an execution with context.
    
    Returns:
        List of ErrorEvent objects containing:
        - event_id: UUID of the error event
        - node_id: Node where error occurred
        - node_name: Human-readable node name
        - node_type: Type of node (e.g., 'n8n-nodes-base.httpRequest')
        - error_message: The actual error text
        - error_type: Extracted error class (e.g., 'TimeoutError')
        - stack_trace: Full stack trace if available
        - timestamp: When error occurred
    """
    query = """
        SELECT 
            ee.id AS event_id,
            ee.node_id,
            wn.name AS node_name,
            wn.type AS node_type,
            ee.error_message,
            ee.error_details->>'type' AS error_type,
            ee.error_details->>'stack' AS stack_trace,
            ee.timestamp
        FROM execution_events ee
        JOIN workflow_nodes wn ON wn.id = ee.node_id
        WHERE ee.execution_id = %s
          AND ee.status = 'ERROR'
        ORDER BY ee.timestamp
    """
    
    results = db.execute(query, [execution_id])
    
    return [
        ErrorEvent(
            event_id=row['event_id'],
            node_id=row['node_id'],
            node_name=row['node_name'],
            node_type=row['node_type'],
            error_message=clean_error_message(row['error_message']),
            error_type=row['error_type'],
            stack_trace=row['stack_trace'],
            timestamp=row['timestamp']
        )
        for row in results
    ]
```

**Error Message Cleaning**:
```python
def clean_error_message(raw_message: str) -> str:
    """
    Remove noise from error messages while preserving semantic meaning.
    
    Cleaning steps:
    1. Remove UUIDs, IDs, timestamps (ephemeral data)
    2. Normalize paths (e.g., /home/user/app -> <path>)
    3. Remove line numbers from stack traces
    4. Lowercase for consistency
    5. Trim whitespace
    
    Examples:
        "Error in request abc-123-def" → "error in request <id>"
        "Timeout after 30s at 2024-01-11T10:30:00Z" → "timeout after 30s"
        "File /home/user/app.py line 42" → "file <path> line <num>"
    """
    import re
    
    # Remove UUIDs
    cleaned = re.sub(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '<id>', raw_message)
    
    # Remove timestamps (ISO 8601)
    cleaned = re.sub(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', '<timestamp>', cleaned)
    
    # Remove file paths
    cleaned = re.sub(r'/[a-zA-Z0-9_/.-]+\.(py|js|ts)', '<path>', cleaned)
    
    # Remove line numbers
    cleaned = re.sub(r'line \d+', 'line <num>', cleaned)
    
    # Remove IP addresses
    cleaned = re.sub(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', '<ip>', cleaned)
    
    # Normalize whitespace
    cleaned = ' '.join(cleaned.split())
    
    # Lowercase
    cleaned = cleaned.lower()
    
    return cleaned
```

---

### Phase 2: Embedding Generation

**Model Selection**: `sentence-transformers/all-MiniLM-L6-v2`

**Why this model?**
- Fast inference (~5ms per embedding on CPU)
- Small size (80MB, easy to deploy)
- Good semantic understanding of error messages
- 384 dimensions (efficient for pgvector)
- Trained on diverse text (handles technical errors well)

**Alternative models considered**:
- `all-mpnet-base-v2`: Better quality but slower (768 dims)
- `paraphrase-MiniLM-L6-v2`: Similar speed but worse on technical text
- OpenAI `text-embedding-ada-002`: Great quality but costs $0.0001/1K tokens

**Implementation**:
```python
from sentence_transformers import SentenceTransformer
from typing import List
import numpy as np

class ErrorEmbedder:
    def __init__(self):
        self.model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        self.model.eval()  # Set to evaluation mode (no training)
    
    def generate_embedding(self, error: ErrorEvent) -> np.ndarray:
        """
        Generate semantic embedding for an error.
        
        Combines multiple fields for rich context:
        - Error message (primary signal)
        - Node type (context: what was being attempted)
        - Error type (class: timeout, auth, etc.)
        
        Returns:
            384-dimensional vector as numpy array
        """
        # Construct rich text representation
        text_parts = []
        
        # 1. Error message (most important)
        if error.error_message:
            text_parts.append(f"Error: {error.error_message}")
        
        # 2. Error type (category)
        if error.error_type:
            text_parts.append(f"Type: {error.error_type}")
        
        # 3. Node type (context)
        if error.node_type:
            # Convert technical name to readable format
            # 'n8n-nodes-base.httpRequest' → 'HTTP Request'
            readable_type = error.node_type.split('.')[-1]
            readable_type = ''.join([' ' + c if c.isupper() else c for c in readable_type]).strip()
            text_parts.append(f"Node: {readable_type}")
        
        # 4. Combine with newlines (helps model understand structure)
        text = "\n".join(text_parts)
        
        # 5. Generate embedding
        embedding = self.model.encode(
            text,
            convert_to_numpy=True,
            normalize_embeddings=True  # L2 normalization for cosine similarity
        )
        
        return embedding
    
    def generate_embeddings_batch(self, errors: List[ErrorEvent]) -> np.ndarray:
        """
        Generate embeddings for multiple errors efficiently.
        
        Uses batching for 3-5x speedup vs sequential processing.
        
        Returns:
            Array of shape (len(errors), 384)
        """
        texts = [
            self._create_text_representation(error)
            for error in errors
        ]
        
        embeddings = self.model.encode(
            texts,
            batch_size=32,  # Process 32 at a time
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        
        return embeddings
    
    def _create_text_representation(self, error: ErrorEvent) -> str:
        """Helper to create text from error (reused in both methods)"""
        parts = []
        if error.error_message:
            parts.append(f"Error: {error.error_message}")
        if error.error_type:
            parts.append(f"Type: {error.error_type}")
        if error.node_type:
            readable = error.node_type.split('.')[-1]
            readable = ''.join([' ' + c if c.isupper() else c for c in readable]).strip()
            parts.append(f"Node: {readable}")
        return "\n".join(parts)
```

**Embedding Storage**:
```python
def store_embedding(
    error: ErrorEvent,
    embedding: np.ndarray,
    execution_id: str
) -> str:
    """
    Store error embedding in database for similarity search.
    
    Returns:
        UUID of created error_embeddings row
    """
    # Convert numpy array to pgvector format
    embedding_list = embedding.tolist()
    
    query = """
        INSERT INTO error_embeddings (
            execution_id,
            node_id,
            event_id,
            error_message,
            error_type,
            stack_trace,
            node_type,
            node_name,
            embedding
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """
    
    result = db.execute(query, [
        execution_id,
        error.node_id,
        error.event_id,
        error.error_message,
        error.error_type,
        error.stack_trace,
        error.node_type,
        error.node_name,
        embedding_list  # pgvector handles list → vector conversion
    ])
    
    return result[0]['id']
```

---

### Phase 3: Similarity Search

**pgvector Cosine Similarity**:

```python
def find_similar_errors(
    embedding: np.ndarray,
    workflow_id: str,
    threshold: float = 0.75,
    limit: int = 50
) -> List[SimilarError]:
    """
    Find errors similar to the given embedding using pgvector.
    
    Args:
        embedding: 384-dim vector to search for
        workflow_id: Limit search to this workflow
        threshold: Minimum cosine similarity (0-1)
        limit: Maximum results to return
    
    Returns:
        List of similar errors sorted by similarity (highest first)
    """
    # Convert embedding to pgvector format
    embedding_list = embedding.tolist()
    
    query = """
        SELECT 
            ee.id,
            ee.error_message,
            ee.node_id,
            ee.node_name,
            ee.node_type,
            ee.execution_id,
            ee.cluster_id,
            -- Cosine similarity (1 = identical, 0 = orthogonal)
            1 - (ee.embedding <=> %s::vector) AS similarity
        FROM error_embeddings ee
        WHERE 
            -- Filter to workflow
            ee.execution_id IN (
                SELECT id FROM executions WHERE workflow_id = %s
            )
            -- Filter by similarity threshold
            AND 1 - (ee.embedding <=> %s::vector) >= %s
        ORDER BY similarity DESC
        LIMIT %s
    """
    
    results = db.execute(query, [
        embedding_list,
        workflow_id,
        embedding_list,
        threshold,
        limit
    ])
    
    return [
        SimilarError(
            id=row['id'],
            error_message=row['error_message'],
            node_id=row['node_id'],
            node_name=row['node_name'],
            node_type=row['node_type'],
            execution_id=row['execution_id'],
            cluster_id=row['cluster_id'],
            similarity=row['similarity']
        )
        for row in results
    ]
```

**Understanding Cosine Similarity**:
```
Similarity Score | Interpretation            | Action
-----------------+---------------------------+---------------------------
0.95 - 1.00      | Nearly identical errors   | Definitely same cluster
0.85 - 0.95      | Very similar errors       | Likely same cluster
0.75 - 0.85      | Similar errors            | Possibly same cluster
0.60 - 0.75      | Somewhat similar          | Different clusters
< 0.60           | Different errors          | Ignore
```

**Example Similarity Scores**:
```python
# Example 1: Nearly Identical (0.98)
error_1 = "ConnectionError: API timeout after 30s"
error_2 = "ConnectionError: API timeout after 30 seconds"

# Example 2: Very Similar (0.89)
error_1 = "ConnectionError: API timeout after 30s"
error_2 = "RequestTimeout: Claude API failed to respond within 30s"

# Example 3: Similar (0.78)
error_1 = "ConnectionError: API timeout after 30s"
error_2 = "TimeoutError: Request exceeded time limit"

# Example 4: Somewhat Similar (0.65)
error_1 = "ConnectionError: API timeout after 30s"
error_2 = "AuthenticationError: Invalid API key"
```

---

### Phase 4: DBSCAN Clustering

**Why DBSCAN?**
- Automatically determines number of clusters (no k-means guessing)
- Handles noise (outliers labeled as -1)
- Works well with cosine similarity in embedding space
- Produces interpretable clusters

**Algorithm Parameters**:
```python
from sklearn.cluster import DBSCAN

# eps: Maximum distance between points in same cluster
#      (0.25 = 0.75 similarity threshold since distance = 1 - similarity)
# min_samples: Minimum cluster size (2 = at least 2 similar errors)
eps = 0.25
min_samples = 2
```

**Implementation**:
```python
def cluster_errors(
    workflow_id: str,
    execution_window: int = 100  # Analyze last N executions
) -> List[ErrorCluster]:
    """
    Cluster all errors for a workflow using DBSCAN.
    
    Args:
        workflow_id: Workflow to analyze
        execution_window: Number of recent executions to include
    
    Returns:
        List of ErrorCluster objects with statistics
    """
    # 1. Load all error embeddings for workflow
    embeddings_data = _load_embeddings_for_workflow(
        workflow_id,
        limit=execution_window
    )
    
    if len(embeddings_data) < 2:
        return []  # Need at least 2 errors to cluster
    
    # 2. Extract embeddings as numpy array
    embeddings = np.array([e['embedding'] for e in embeddings_data])
    error_ids = [e['id'] for e in embeddings_data]
    
    # 3. Compute pairwise cosine distance matrix
    # (DBSCAN needs distances, not similarities)
    from sklearn.metrics.pairwise import cosine_distances
    distance_matrix = cosine_distances(embeddings)
    
    # 4. Run DBSCAN clustering
    clustering = DBSCAN(
        eps=0.25,           # Max distance (1 - 0.75 similarity)
        min_samples=2,      # Minimum cluster size
        metric='precomputed'  # Use our distance matrix
    )
    labels = clustering.fit_predict(distance_matrix)
    
    # 5. Group errors by cluster
    clusters = {}
    for idx, label in enumerate(labels):
        if label == -1:
            continue  # Skip noise points (outliers)
        
        if label not in clusters:
            clusters[label] = []
        
        clusters[label].append({
            'id': error_ids[idx],
            'data': embeddings_data[idx],
            'embedding': embeddings[idx]
        })
    
    # 6. Create ErrorCluster objects
    result = []
    for cluster_label, members in clusters.items():
        cluster = _create_cluster_object(
            cluster_label,
            members,
            workflow_id
        )
        result.append(cluster)
    
    return result

def _create_cluster_object(
    label: int,
    members: List[Dict],
    workflow_id: str
) -> ErrorCluster:
    """
    Create ErrorCluster object from cluster members.
    
    Selects representative error (medoid = most central point).
    Calculates cluster statistics.
    """
    # 1. Find representative error (medoid)
    # Medoid = point with minimum average distance to all other points
    member_embeddings = np.array([m['embedding'] for m in members])
    
    # Calculate average distance from each point to all others
    distances = cosine_distances(member_embeddings)
    avg_distances = distances.mean(axis=1)
    medoid_idx = avg_distances.argmin()
    
    representative = members[medoid_idx]['data']
    
    # 2. Calculate cluster statistics
    member_count = len(members)
    
    # Average similarity within cluster
    # (Convert distance back to similarity: similarity = 1 - distance)
    avg_distance = distances.mean()
    avg_similarity = 1 - avg_distance
    
    # 3. Get affected nodes
    affected_nodes = {}
    for member in members:
        node_id = member['data']['node_id']
        node_name = member['data']['node_name']
        
        if node_id not in affected_nodes:
            affected_nodes[node_id] = {
                'node_id': node_id,
                'node_name': node_name,
                'occurrence_count': 0
            }
        affected_nodes[node_id]['occurrence_count'] += 1
    
    # 4. Detect pattern type
    pattern_type = _detect_pattern_type(representative['error_message'])
    
    # 5. Calculate severity
    severity = _calculate_severity(member_count, pattern_type)
    
    # 6. Create cluster object
    return ErrorCluster(
        id=str(uuid.uuid4()),
        workflow_id=workflow_id,
        label=f"Error Pattern {label}",
        representative_error_id=representative['id'],
        representative_message=representative['error_message'],
        member_count=member_count,
        avg_similarity=avg_similarity,
        affected_nodes=list(affected_nodes.values()),
        pattern_type=pattern_type,
        severity=severity
    )
```

---

### Phase 5: Pattern Detection

**Pattern Types** (matched via keyword detection):

```python
PATTERN_KEYWORDS = {
    'timeout': [
        'timeout', 'timed out', 'time limit', 'exceeded time',
        'no response', 'did not respond'
    ],
    'auth_failure': [
        'authentication', 'unauthorized', 'invalid credentials',
        'invalid api key', 'forbidden', '401', '403'
    ],
    'rate_limit': [
        'rate limit', 'too many requests', '429',
        'quota exceeded', 'throttled'
    ],
    'network': [
        'connection refused', 'connection timeout', 'network error',
        'dns', 'econnrefused', 'socket'
    ],
    'validation': [
        'validation failed', 'invalid input', 'missing required',
        'schema error', 'type error'
    ],
    'resource': [
        'out of memory', 'disk space', 'file not found',
        '404', 'resource not available'
    ],
    'unknown': []  # Default
}

def _detect_pattern_type(error_message: str) -> str:
    """
    Detect error pattern type from message keywords.
    
    Returns:
        Pattern type string (e.g., 'timeout', 'auth_failure')
    """
    message_lower = error_message.lower()
    
    # Check each pattern's keywords
    for pattern, keywords in PATTERN_KEYWORDS.items():
        if pattern == 'unknown':
            continue
        
        for keyword in keywords:
            if keyword in message_lower:
                return pattern
    
    return 'unknown'
```

**Severity Calculation**:
```python
def _calculate_severity(
    occurrence_count: int,
    pattern_type: str
) -> str:
    """
    Calculate cluster severity based on frequency and type.
    
    Severity Levels:
    - critical: High frequency (10+) OR auth failures
    - high: Medium frequency (5-9) OR rate limits
    - medium: Low frequency (2-4) OR network issues
    - low: Single occurrence OR validation errors
    
    Returns:
        Severity string: 'critical', 'high', 'medium', 'low'
    """
    # Auth failures are always critical (security issue)
    if pattern_type == 'auth_failure':
        return 'critical'
    
    # Frequency-based severity
    if occurrence_count >= 10:
        return 'critical'
    elif occurrence_count >= 5:
        return 'high'
    elif occurrence_count >= 2:
        # Rate limits and network issues are higher priority
        if pattern_type in ['rate_limit', 'network']:
            return 'high'
        else:
            return 'medium'
    else:
        return 'low'
```

---

## API Endpoint Design

### GET /api/workflows/{workflow_id}/executions/{execution_id}/error-analysis

**Purpose**: Analyze errors in a specific execution and cluster with historical errors

**Query Parameters**:
```
?include_historical=true     # Include similar errors from past executions
?similarity_threshold=0.75   # Minimum similarity for clustering (0-1)
?execution_window=100        # Number of past executions to analyze
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "execution_errors": [
      {
        "event_id": "12345678-90ab-cdef-1234-567890abcdef",
        "node_id": "node_1",
        "node_name": "Claude: Generate Variant",
        "error_message": "ConnectionError: API timeout after 30s",
        "error_type": "ConnectionError",
        "timestamp": "2026-01-11T10:30:00Z",
        "cluster_id": "abc-123",
        "similarity_to_cluster": 0.94
      }
    ],
    "clusters": [
      {
        "id": "abc-123",
        "label": "API Timeout Issues",
        "representative_message": "ConnectionError: API timeout after 30s",
        "pattern_type": "timeout",
        "severity": "high",
        "member_count": 5,
        "avg_similarity": 0.89,
        "affected_nodes": [
          {
            "node_id": "node_1",
            "node_name": "Claude: Generate Variant",
            "occurrence_count": 3
          },
          {
            "node_id": "node_2",
            "node_name": "HTTP Request",
            "occurrence_count": 2
          }
        ],
        "recommendations": [
          {
            "type": "increase_timeout",
            "description": "Increase timeout from 30s to 60s",
            "evidence": [
              "5 occurrences across 3 nodes",
              "Average duration: 31.2s (just over current limit)"
            ]
          },
          {
            "type": "add_retry",
            "description": "Add retry logic with exponential backoff",
            "evidence": [
              "Transient network issues",
              "Similar nodes succeed on retry"
            ]
          }
        ],
        "example_executions": [
          {
            "execution_id": "exec-1",
            "timestamp": "2026-01-11T10:30:00Z",
            "url": "/executions/exec-1"
          },
          {
            "execution_id": "exec-2",
            "timestamp": "2026-01-10T15:20:00Z",
            "url": "/executions/exec-2"
          }
        ]
      }
    ],
    "summary": {
      "total_errors": 3,
      "clustered_errors": 3,
      "unclustered_errors": 0,
      "unique_patterns": 1,
      "critical_patterns": 0,
      "high_patterns": 1,
      "medium_patterns": 0,
      "low_patterns": 0
    }
  }
}
```

**Implementation**:
```python
from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter()

@router.get("/api/workflows/{workflow_id}/executions/{execution_id}/error-analysis")
async def analyze_execution_errors(
    workflow_id: str,
    execution_id: str,
    include_historical: bool = Query(True),
    similarity_threshold: float = Query(0.75, ge=0.0, le=1.0),
    execution_window: int = Query(100, ge=1, le=1000)
):
    """
    Analyze errors in an execution and cluster with historical patterns.
    
    Args:
        workflow_id: Workflow identifier
        execution_id: Execution to analyze
        include_historical: Whether to cluster with past errors
        similarity_threshold: Minimum similarity for clustering
        execution_window: Number of past executions to include
    
    Returns:
        ErrorAnalysisResult with clusters and recommendations
    """
    analyzer = ErrorClusteringAnalyzer()
    
    result = await analyzer.analyze_execution(
        execution_id=execution_id,
        workflow_id=workflow_id,
        include_historical=include_historical,
        similarity_threshold=similarity_threshold,
        execution_window=execution_window
    )
    
    return {
        "success": True,
        "data": result.to_dict()
    }
```

---

## Testing Strategy

### Test Data Preparation

Create synthetic error scenarios that mirror real-world patterns:

```python
TEST_ERRORS = [
    # Cluster 1: API Timeouts (should cluster together)
    {
        "message": "ConnectionError: API timeout after 30s",
        "node_type": "n8n-nodes-base.httpRequest",
        "expected_cluster": "timeout"
    },
    {
        "message": "RequestTimeout: Claude API failed to respond within 30s",
        "node_type": "n8n-nodes-base.anthropic",
        "expected_cluster": "timeout"
    },
    {
        "message": "TimeoutError: Request exceeded 30 second limit",
        "node_type": "n8n-nodes-base.httpRequest",
        "expected_cluster": "timeout"
    },
    
    # Cluster 2: Auth Failures (should cluster together)
    {
        "message": "AuthenticationError: Invalid API key provided",
        "node_type": "n8n-nodes-base.anthropic",
        "expected_cluster": "auth_failure"
    },
    {
        "message": "Unauthorized: Missing or invalid credentials",
        "node_type": "n8n-nodes-base.httpRequest",
        "expected_cluster": "auth_failure"
    },
    
    # Outlier: Unique error (should not cluster)
    {
        "message": "SyntaxError: Unexpected token in JSON at position 42",
        "node_type": "n8n-nodes-base.code",
        "expected_cluster": None  # No cluster
    }
]
```

### Unit Tests

```python
import pytest
from analysis.error_clustering import ErrorClusteringAnalyzer

class TestErrorClustering:
    
    def test_embedding_generation(self):
        """Test that embeddings are generated correctly"""
        analyzer = ErrorClusteringAnalyzer()
        
        error = ErrorEvent(
            error_message="API timeout after 30s",
            node_type="n8n-nodes-base.httpRequest",
            error_type="TimeoutError"
        )
        
        embedding = analyzer.embedder.generate_embedding(error)
        
        assert embedding.shape == (384,)  # Correct dimensions
        assert np.allclose(np.linalg.norm(embedding), 1.0)  # Normalized
    
    def test_similar_errors_cluster_together(self):
        """Test that similar errors are clustered"""
        analyzer = ErrorClusteringAnalyzer()
        
        # Create test errors
        timeout_errors = [
            ErrorEvent(message="API timeout after 30s", ...),
            ErrorEvent(message="Request timeout 30 seconds", ...),
            ErrorEvent(message="TimeoutError: exceeded limit", ...)
        ]
        
        # Generate embeddings
        embeddings = [
            analyzer.embedder.generate_embedding(e)
            for e in timeout_errors
        ]
        
        # Calculate similarities
        from sklearn.metrics.pairwise import cosine_similarity
        similarities = cosine_similarity(embeddings)
        
        # All pairs should have high similarity (> 0.75)
        for i in range(len(embeddings)):
            for j in range(i+1, len(embeddings)):
                assert similarities[i][j] > 0.75
    
    def test_different_errors_dont_cluster(self):
        """Test that different errors remain separate"""
        analyzer = ErrorClusteringAnalyzer()
        
        error1 = ErrorEvent(message="API timeout", ...)
        error2 = ErrorEvent(message="Invalid API key", ...)
        
        emb1 = analyzer.embedder.generate_embedding(error1)
        emb2 = analyzer.embedder.generate_embedding(error2)
        
        similarity = cosine_similarity([emb1], [emb2])[0][0]
        
        assert similarity < 0.75  # Should NOT cluster
    
    def test_pattern_detection(self):
        """Test that pattern types are detected correctly"""
        test_cases = [
            ("API timeout after 30s", "timeout"),
            ("Invalid API key", "auth_failure"),
            ("Rate limit exceeded", "rate_limit"),
            ("Connection refused", "network"),
            ("Validation failed", "validation"),
            ("Unknown error XYZ", "unknown")
        ]
        
        for message, expected_pattern in test_cases:
            detected = _detect_pattern_type(message)
            assert detected == expected_pattern
    
    def test_severity_calculation(self):
        """Test that severity is calculated correctly"""
        # High frequency = critical
        assert _calculate_severity(15, "timeout") == "critical"
        
        # Auth failure always critical
        assert _calculate_severity(1, "auth_failure") == "critical"
        
        # Medium frequency + rate limit = high
        assert _calculate_severity(6, "rate_limit") == "high"
        
        # Low frequency + validation = medium
        assert _calculate_severity(3, "validation") == "medium"
        
        # Single occurrence = low
        assert _calculate_severity(1, "validation") == "low"
```

### Integration Tests

```python
class TestErrorClusteringIntegration:
    
    @pytest.fixture
    def test_workflow(self):
        """Create test workflow with error history"""
        # Create workflow
        workflow_id = create_test_workflow()
        
        # Create 10 executions with various errors
        for i in range(10):
            execution_id = create_test_execution(workflow_id)
            
            # Add timeout errors (should cluster)
            if i % 3 == 0:
                add_error_event(
                    execution_id,
                    "API timeout after 30s",
                    "n8n-nodes-base.httpRequest"
                )
            
            # Add auth errors (should cluster separately)
            if i % 4 == 0:
                add_error_event(
                    execution_id,
                    "Invalid API key",
                    "n8n-nodes-base.anthropic"
                )
        
        return workflow_id
    
    def test_end_to_end_clustering(self, test_workflow):
        """Test complete clustering pipeline"""
        analyzer = ErrorClusteringAnalyzer()
        
        # Run clustering
        clusters = analyzer.cluster_errors(
            workflow_id=test_workflow,
            execution_window=100
        )
        
        # Should find 2 clusters (timeout + auth)
        assert len(clusters) == 2
        
        # Check cluster properties
        timeout_cluster = [c for c in clusters if c.pattern_type == "timeout"][0]
        assert timeout_cluster.member_count >= 3
        assert timeout_cluster.avg_similarity > 0.75
        assert timeout_cluster.severity in ["high", "critical"]
        
        auth_cluster = [c for c in clusters if c.pattern_type == "auth_failure"][0]
        assert auth_cluster.severity == "critical"  # Auth always critical
    
    def test_api_endpoint(self, test_workflow):
        """Test API endpoint returns correct format"""
        # Create execution with error
        execution_id = create_test_execution(test_workflow)
        add_error_event(
            execution_id,
            "API timeout after 30s",
            "n8n-nodes-base.httpRequest"
        )
        
        # Call API
        response = client.get(
            f"/api/workflows/{test_workflow}/executions/{execution_id}/error-analysis",
            params={
                "include_historical": True,
                "similarity_threshold": 0.75
            }
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Check response structure
        assert "execution_errors" in data
        assert "clusters" in data
        assert "summary" in data
        
        # Check cluster has recommendations
        assert len(data["clusters"]) > 0
        cluster = data["clusters"][0]
        assert "recommendations" in cluster
        assert "example_executions" in cluster
```

---

## Performance Targets

### Latency
- **Embedding generation**: < 10ms per error (CPU)
- **Similarity search**: < 50ms (with HNSW index)
- **DBSCAN clustering**: < 200ms for 100 errors
- **Total API response**: < 500ms

### Scalability
- **Errors per execution**: 1-100 (typical)
- **Historical window**: 100 executions (10,000 errors max)
- **Clustering batch size**: 1000 errors efficiently
- **Database queries**: < 3 queries per API call

### Accuracy
- **Clustering precision**: > 90% (similar errors in same cluster)
- **Clustering recall**: > 85% (all similar errors found)
- **Pattern detection**: > 95% accuracy on known patterns

---

## Real-World Test Case

### Scenario: Scott's 72-Node Workflow

**Historical Error Pattern** (hypothetical):
```
Last 50 executions:
- 12 API timeouts on "Claude: Generate Variant" node
- 3 rate limit errors on "Claude: Generate Variant" node  
- 2 network errors on "HTTP Request: Fetch Brief" node
- 1 validation error on "Code: Parse JSON" node
```

**Expected Clustering Result**:

**Cluster 1: "Claude API Issues" (15 members)**
- Representative: "ConnectionError: API timeout after 30s"
- Pattern: timeout (12) + rate_limit (3)
- Severity: critical (high frequency)
- Affected nodes: "Claude: Generate Variant" (15)
- Recommendation: "Increase timeout to 60s and add retry with exponential backoff"

**Cluster 2: "Network Errors" (2 members)**
- Representative: "ECONNREFUSED: Connection refused"
- Pattern: network
- Severity: medium (low frequency)
- Affected nodes: "HTTP Request: Fetch Brief" (2)
- Recommendation: "Add connection retry logic with 3 attempts"

**Outlier: "JSON Parse Error" (1 member)**
- Not clustered (unique error)
- Severity: low (single occurrence)
- Recommendation: "Add input validation before JSON parsing"

### Expected API Response Time

```
Phase                  | Time
-----------------------+--------
Load errors            | 30ms
Generate embeddings    | 80ms  (8 errors × 10ms each)
Similarity search      | 40ms
DBSCAN clustering      | 50ms
Pattern detection      | 20ms
Build response         | 30ms
-----------------------+--------
TOTAL                  | 250ms ✅ (under 500ms target)
```

---

## Implementation Checklist

### Day 3 Deliverables

- [ ] **Database Migration**
  - [ ] Create `error_embeddings` table
  - [ ] Create `error_clusters` table
  - [ ] Create HNSW indexes for vector search
  - [ ] Test pgvector extension installed

- [ ] **Backend Implementation**
  - [ ] `ErrorClusteringAnalyzer` class
  - [ ] `ErrorEmbedder` class (HuggingFace integration)
  - [ ] Error extraction from `execution_events`
  - [ ] Error message cleaning/normalization
  - [ ] Similarity search with pgvector
  - [ ] DBSCAN clustering implementation
  - [ ] Pattern detection (keyword matching)
  - [ ] Severity calculation
  - [ ] Cluster storage in database

- [ ] **API Endpoint**
  - [ ] `GET /api/workflows/{id}/executions/{id}/error-analysis`
  - [ ] Query parameter validation
  - [ ] Response formatting
  - [ ] Error handling

- [ ] **Testing**
  - [ ] Unit tests for embedding generation
  - [ ] Unit tests for similarity calculation
  - [ ] Unit tests for pattern detection
  - [ ] Integration test with real error data
  - [ ] API endpoint test
  - [ ] Performance benchmarks

- [ ] **Documentation**
  - [ ] Update API documentation
  - [ ] Add clustering algorithm explanation
  - [ ] Document HuggingFace model selection

---

## Next Steps: Week 3 Day 4-5

### Recommendation Engine

With error clustering complete, Day 4-5 will build the recommendation engine that:

1. **Analyzes clusters** to identify optimization opportunities
2. **Applies 15 detection rules** (from V1 spec)
3. **Generates evidence-backed recommendations** with clickable proof
4. **Prioritizes by impact** (severity × frequency × cluster size)

**Example Recommendation from Error Cluster**:
```
Recommendation: "Increase Claude API timeout"
├─ Trigger: Error cluster with 12 timeout occurrences
├─ Evidence:
│   ├─ 12 timeouts across 8 executions
│   ├─ Average duration: 31.2s (just over 30s limit)
│   └─ All on "Claude: Generate Variant" node
├─ Impact: HIGH (blocks 41% of execution time)
├─ Effort: LOW (configuration change only)
└─ Priority Score: 85/100
```

---

## Appendix: HuggingFace Model Comparison

| Model | Dimensions | Size | Speed (CPU) | Quality | Use Case |
|-------|------------|------|-------------|---------|----------|
| **all-MiniLM-L6-v2** ✅ | 384 | 80MB | 5ms | Good | Production (our choice) |
| all-mpnet-base-v2 | 768 | 420MB | 15ms | Excellent | High-accuracy needs |
| paraphrase-MiniLM-L6-v2 | 384 | 80MB | 5ms | Fair | Paraphrase detection |
| text-embedding-ada-002 | 1536 | N/A (API) | 50ms | Excellent | Budget available |

**Our choice**: `all-MiniLM-L6-v2`
- Best speed/quality tradeoff
- Small enough to deploy with backend
- Good semantic understanding of technical errors
- 384 dimensions = efficient pgvector storage

---

**END OF SPECIFICATION**

Ready for implementation! 🚀
