"""
Error Clustering & Pattern Detection Module

This module implements semantic error clustering using embeddings and DBSCAN algorithm.
It identifies patterns in errors across workflow executions and provides actionable insights.

Week 3 Day 3: Error Clustering & Pattern Detection
"""

import ast
import logging
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import cosine_distances, cosine_similarity
import uuid

from .embeddings import ErrorEmbedder, ErrorEvent, clean_error_message, get_shared_embedder

logger = logging.getLogger(__name__)


# ==================================================================================
# Pattern Detection Configuration
# ==================================================================================

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
        'dns', 'econnrefused', 'socket', 'econnreset'
    ],
    'validation': [
        'validation failed', 'invalid input', 'missing required',
        'schema error', 'type error'
    ],
    'resource': [
        'out of memory', 'disk space', 'file not found',
        '404', 'resource not available', 'not found'
    ],
    'unknown': []  # Default
}


# ==================================================================================
# Data Models
# ==================================================================================

@dataclass
class ErrorCluster:
    """Represents a cluster of similar errors"""
    id: str
    workflow_id: str
    label: str
    representative_error_id: str
    representative_message: str
    member_count: int
    avg_similarity: float
    affected_nodes: List[Dict[str, Any]]
    pattern_type: str
    severity: str
    first_seen: Optional[str] = None
    last_seen: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return asdict(self)


@dataclass
class ErrorAnalysisResult:
    """Complete error analysis result for an execution"""
    execution_id: str
    workflow_id: str
    execution_errors: List[Dict[str, Any]]
    clusters: List[Dict[str, Any]]
    summary: Dict[str, Any]
    calculated_at: str
    analysis_context: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response"""
        return {
            "execution_errors": self.execution_errors,
            "clusters": self.clusters,
            "summary": self.summary,
            "analysis_context": self.analysis_context
        }


# ==================================================================================
# Main Analyzer Class
# ==================================================================================

class ErrorClusteringAnalyzer:
    """
    Analyzes and clusters errors using semantic similarity.

    This analyzer:
    1. Extracts errors from executions
    2. Generates embeddings using a local sentence-transformers model
    3. Stores embeddings in pgvector-enabled database
    4. Retrieves similar historical errors via pgvector (HNSW index)
    5. Clusters the candidate set using DBSCAN
    6. Detects error patterns and assigns severity
    7. Provides actionable insights with evidence
    """

    def __init__(self, supabase_client):
        """
        Initialize the analyzer.

        Args:
            supabase_client: Initialized Supabase client for database operations
        """
        self.db = supabase_client

    @property
    def embedder(self) -> ErrorEmbedder:
        """Process-wide embedder, loaded lazily on first use.

        Loading the model costs ~1.4s; zero-error analyses (the common
        happy path) never touch it, and analyzers across requests share
        one instance.
        """
        return get_shared_embedder()

    async def analyze_execution(
        self,
        execution_id: str,
        workflow_id: str,
        include_historical: bool = True,
        similarity_threshold: float = 0.75,
        execution_window: int = 100
    ) -> ErrorAnalysisResult:
        """
        Analyze errors in an execution and cluster with historical errors.

        Args:
            execution_id: Execution to analyze
            workflow_id: Workflow identifier
            include_historical: Whether to cluster with past errors
            similarity_threshold: Minimum similarity for clustering (0-1)
            execution_window: Number of past executions to include

        Returns:
            ErrorAnalysisResult with clusters and recommendations
        """
        # Phase 1: Extract errors from current execution
        errors = await self._extract_errors(execution_id)

        if not errors:
            return ErrorAnalysisResult(
                execution_id=execution_id,
                workflow_id=workflow_id,
                execution_errors=[],
                clusters=[],
                summary={
                    "total_errors": 0,
                    "clustered_errors": 0,
                    "unclustered_errors": 0,
                    "unique_patterns": 0,
                    "critical_patterns": 0,
                    "high_patterns": 0,
                    "medium_patterns": 0,
                    "low_patterns": 0
                },
                calculated_at=datetime.utcnow().isoformat() + "Z",
                analysis_context={
                    "execution_id": execution_id,
                    "workflow_id": workflow_id,
                    "include_historical": include_historical,
                    "persistence_warnings": []
                }
            )

        # Phase 2: Generate embeddings and store them
        error_embedding_ids = await self._generate_and_store_embeddings(
            errors,
            execution_id
        )

        # Phase 3: Cluster errors (current + historical)
        if include_historical:
            clusters, persistence_warnings = await self._cluster_errors(
                workflow_id=workflow_id,
                execution_id=execution_id,
                execution_window=execution_window,
                similarity_threshold=similarity_threshold
            )
        else:
            clusters, persistence_warnings = [], []

        # Phase 4: Build result
        result = await self._build_analysis_result(
            execution_id=execution_id,
            workflow_id=workflow_id,
            errors=errors,
            clusters=clusters,
            include_historical=include_historical,
            persistence_warnings=persistence_warnings
        )

        return result

    # =============================================================================
    # Phase 1: Error Extraction
    # =============================================================================

    async def _extract_errors(self, execution_id: str) -> List[ErrorEvent]:
        """
        Extract all error events from an execution.

        Returns:
            List of ErrorEvent objects with cleaned error messages
        """
        try:
            # Query error events with node information
            response = self.db.table('execution_events').select(
                'id, node_id, event_type, error_message, metadata, timestamp'
            ).eq('execution_id', execution_id).eq('status', 'error').order('timestamp').execute()

            if not response.data:
                return []

            # Get workflow to map node IDs to node info
            exec_response = self.db.table('executions').select(
                'workflow_id'
            ).eq('id', execution_id).execute()

            if not exec_response.data:
                raise ValueError(f"Execution {execution_id} not found")

            workflow_id = exec_response.data[0]['workflow_id']

            # Get node details
            nodes_response = self.db.table('nodes').select(
                'node_id, node_name, node_type'
            ).eq('workflow_id', workflow_id).execute()

            # Build node lookup map (normalized name -> node data)
            node_map = {}
            for node in nodes_response.data:
                normalized_name = self._normalize_node_name(node['node_name'])
                node_map[normalized_name] = node

            # Convert to ErrorEvent objects
            errors = []
            for row in response.data:
                # node_id in execution_events is actually the normalized node name
                node_data = node_map.get(row['node_id'], {})

                error_message = row.get('error_message', '')
                if not error_message:
                    continue

                # Clean the error message
                cleaned_message = clean_error_message(error_message)

                # Extract error type from metadata if available
                error_type = None
                if row.get('metadata'):
                    if isinstance(row['metadata'], dict):
                        error_type = row['metadata'].get('error_type') or row['metadata'].get('type')

                error = ErrorEvent(
                    event_id=row['id'],
                    node_id=row['node_id'],
                    node_name=node_data.get('node_name', row['node_id']),
                    node_type=node_data.get('node_type', 'unknown'),
                    error_message=cleaned_message,
                    error_type=error_type,
                    stack_trace=None,  # Not stored in our schema
                    timestamp=row['timestamp']
                )

                errors.append(error)

            return errors

        except Exception as e:
            print(f"Error extracting errors: {e}")
            raise

    def _normalize_node_name(self, node_name: str) -> str:
        """Normalize node name to match execution event format"""
        return node_name.lower().replace(' ', '_')

    # =============================================================================
    # Phase 2: Embedding Generation & Storage
    # =============================================================================

    async def _generate_and_store_embeddings(
        self,
        errors: List[ErrorEvent],
        execution_id: str
    ) -> List[str]:
        """
        Generate embeddings for errors and store in database.

        Returns:
            List of error_embedding IDs
        """
        if not errors:
            return []

        # Reuse embeddings already stored for this execution. Re-analyses
        # (every page load hits this endpoint) must not insert duplicate
        # rows: duplicates inflate the historical clustering set, corrupt
        # summary counts, and make the endpoint slower on every run.
        existing_response = self.db.table('error_embeddings').select(
            'id, event_id'
        ).eq('execution_id', execution_id).in_(
            'event_id', [error.event_id for error in errors]
        ).execute()

        existing_by_event: Dict[str, str] = {}
        for row in (existing_response.data or []):
            # setdefault: if pre-fix pollution left multiple copies,
            # consistently reuse the first stored row.
            existing_by_event.setdefault(row['event_id'], row['id'])

        new_errors = [e for e in errors if e.event_id not in existing_by_event]

        # Only new errors are embedded — a full re-analysis never touches
        # the embedding model at all.
        new_ids_by_event: Dict[str, str] = {}
        if new_errors:
            embeddings = self.embedder.generate_embeddings_batch(new_errors)
            for error, embedding in zip(new_errors, embeddings):
                new_ids_by_event[error.event_id] = await self._store_embedding(
                    error=error,
                    embedding=embedding,
                    execution_id=execution_id
                )

        return [
            existing_by_event.get(error.event_id, new_ids_by_event.get(error.event_id))
            for error in errors
        ]

    async def _store_embedding(
        self,
        error: ErrorEvent,
        embedding: np.ndarray,
        execution_id: str
    ) -> str:
        """
        Store error embedding in database for similarity search.

        Returns:
            UUID of created error_embeddings row
        """
        # Convert numpy array to plain Python list
        # Ensure it's a native Python list, not numpy types
        embedding_list = [float(x) for x in embedding.tolist()]

        try:
            response = self.db.table('error_embeddings').insert({
                'execution_id': execution_id,
                'node_id': error.node_id,
                'event_id': error.event_id,
                'error_message': error.error_message,
                'error_type': error.error_type,
                'stack_trace': error.stack_trace,
                'node_type': error.node_type,
                'node_name': error.node_name,
                'embedding': embedding_list
            }).execute()

            return response.data[0]['id']

        except Exception as e:
            print(f"Error storing embedding: {e}")
            raise

    # =============================================================================
    # Phase 3: Clustering
    # =============================================================================

    async def find_similar_errors(
        self,
        query_embedding: np.ndarray,
        workflow_id: str,
        match_count: int = 10,
        max_distance: float = 0.25
    ) -> List[Dict[str, Any]]:
        """
        Find historical errors similar to a query embedding using pgvector.

        Calls the match_error_embeddings SQL function, which orders by
        `embedding <=> query` (cosine distance) so Postgres can serve the
        query from the HNSW index, scoped to a single workflow.

        Args:
            query_embedding: 384-dim embedding to search with
            workflow_id: Only return errors from this workflow's executions
            match_count: Maximum neighbors to return
            max_distance: Cosine distance cutoff (distance = 1 - similarity)

        Returns:
            Embedding records (ascending distance), each with a parsed
            numpy `embedding` and its `distance` from the query
        """
        embedding_list = [float(x) for x in np.asarray(query_embedding).tolist()]

        response = self.db.rpc('match_error_embeddings', {
            'query_embedding': embedding_list,
            'target_workflow_id': workflow_id,
            'match_count': match_count,
            'max_distance': max_distance
        }).execute()

        results = response.data or []
        for record in results:
            record['embedding'] = self._parse_embedding(record['embedding'])

        return results

    async def _cluster_errors(
        self,
        workflow_id: str,
        execution_id: str,
        execution_window: int = 100,
        similarity_threshold: float = 0.75
    ) -> Tuple[List[ErrorCluster], List[str]]:
        """
        Cluster the current execution's errors with similar historical errors.

        Candidate retrieval: for each error in the current execution, fetch
        its nearest historical neighbors via pgvector (HNSW index), then run
        DBSCAN over that candidate set only. Historical patterns with no
        similar error in the current execution are not re-reported.

        Args:
            workflow_id: Workflow to analyze
            execution_id: Current execution (source of cluster seeds)
            execution_window: Maximum neighbors to retrieve per current error
            similarity_threshold: Minimum similarity for same cluster

        Returns:
            Tuple of (ErrorCluster list, persistence warning strings)
        """
        current = await self._load_embeddings_for_execution(execution_id)

        if not current:
            return [], []

        # Retrieve similar historical errors for each current error
        max_distance = 1 - similarity_threshold
        candidates = {row['id']: row for row in current}
        for row in current:
            neighbors = await self.find_similar_errors(
                query_embedding=row['embedding'],
                workflow_id=workflow_id,
                match_count=execution_window,
                max_distance=max_distance
            )
            for neighbor in neighbors:
                candidates.setdefault(neighbor['id'], neighbor)

        embeddings_data = list(candidates.values())

        if len(embeddings_data) < 2:
            return [], []  # Need at least 2 errors to cluster

        # Extract embeddings and metadata
        embeddings = np.array([e['embedding'] for e in embeddings_data])
        error_ids = [e['id'] for e in embeddings_data]

        # Calculate pairwise cosine distance matrix
        # DBSCAN uses distance, pgvector uses similarity
        # distance = 1 - similarity
        distance_matrix = cosine_distances(embeddings)

        # Run DBSCAN clustering
        # eps = 1 - similarity_threshold (0.75 similarity = 0.25 distance)
        eps = 1 - similarity_threshold
        clustering = DBSCAN(
            eps=eps,
            min_samples=2,  # Minimum cluster size
            metric='precomputed'  # Use our distance matrix
        )
        labels = clustering.fit_predict(distance_matrix)

        # Group errors by cluster label
        cluster_groups = {}
        for idx, label in enumerate(labels):
            if label == -1:
                continue  # Skip noise points (outliers)

            if label not in cluster_groups:
                cluster_groups[label] = []

            cluster_groups[label].append({
                'id': error_ids[idx],
                'data': embeddings_data[idx],
                'embedding': embeddings[idx]
            })

        # Create ErrorCluster objects
        clusters = []
        for cluster_label, members in cluster_groups.items():
            cluster = await self._create_cluster_object(
                cluster_label,
                members,
                workflow_id
            )
            clusters.append(cluster)

        # Store clusters in database (failures are surfaced, not fatal)
        persistence_warnings = await self._store_clusters(clusters, workflow_id)

        return clusters, persistence_warnings

    async def _load_embeddings_for_execution(
        self,
        execution_id: str
    ) -> List[Dict[str, Any]]:
        """
        Load error embeddings for a single execution.

        Returns:
            List of embedding records with parsed numpy embeddings
        """
        try:
            response = self.db.table('error_embeddings').select(
                'id, execution_id, node_id, event_id, error_message, error_type, node_type, node_name, embedding'
            ).eq('execution_id', execution_id).execute()

            for record in response.data:
                record['embedding'] = self._parse_embedding(record['embedding'])

            return response.data

        except Exception as e:
            print(f"Error loading embeddings: {e}")
            import traceback
            traceback.print_exc()
            return []

    @staticmethod
    def _parse_embedding(value) -> np.ndarray:
        """Parse a pgvector column value ("[1.0, ...]" or list) to numpy."""
        if isinstance(value, str):
            value = ast.literal_eval(value)
        return np.array(value, dtype=np.float32)

    async def _create_cluster_object(
        self,
        label: int,
        members: List[Dict],
        workflow_id: str
    ) -> ErrorCluster:
        """
        Create ErrorCluster object from cluster members.

        Selects representative error (medoid = most central point).
        Calculates cluster statistics.
        """
        # Find representative error (medoid)
        member_embeddings = np.array([m['embedding'] for m in members])

        # Calculate average distance from each point to all others
        distances = cosine_distances(member_embeddings)
        avg_distances = distances.mean(axis=1)
        medoid_idx = avg_distances.argmin()

        representative = members[medoid_idx]['data']

        # Calculate cluster statistics
        member_count = len(members)

        # Average similarity within cluster (1 - average distance)
        avg_distance = distances[np.triu_indices_from(distances, k=1)].mean()
        avg_similarity = 1 - avg_distance

        # Get affected nodes
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

        # Detect pattern type
        pattern_type = self._detect_pattern_type(representative['error_message'])

        # Calculate severity
        severity = self._calculate_severity(member_count, pattern_type)

        # Generate cluster label
        cluster_label = self._generate_cluster_label(pattern_type, member_count)

        return ErrorCluster(
            id=str(uuid.uuid4()),
            workflow_id=workflow_id,
            label=cluster_label,
            representative_error_id=representative['id'],
            representative_message=representative['error_message'],
            member_count=member_count,
            avg_similarity=float(avg_similarity),
            affected_nodes=list(affected_nodes.values()),
            pattern_type=pattern_type,
            severity=severity
        )

    # =============================================================================
    # Phase 4: Pattern Detection
    # =============================================================================

    def _detect_pattern_type(self, error_message: str) -> str:
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

    def _calculate_severity(
        self,
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

    def _generate_cluster_label(self, pattern_type: str, member_count: int) -> str:
        """Generate human-readable cluster label"""
        pattern_labels = {
            'timeout': 'Timeout Issues',
            'auth_failure': 'Authentication Failures',
            'rate_limit': 'Rate Limit Errors',
            'network': 'Network Connection Issues',
            'validation': 'Validation Errors',
            'resource': 'Resource Not Found Errors',
            'unknown': 'Error Pattern'
        }

        base_label = pattern_labels.get(pattern_type, 'Error Pattern')
        return f"{base_label} ({member_count} occurrences)"

    async def _store_clusters(
        self,
        clusters: List[ErrorCluster],
        workflow_id: str
    ) -> List[str]:
        """
        Replace the workflow's stored clusters with the freshly computed set.

        Clusters get new UUIDs on every analysis run, so insert-only storage
        accumulated stale copies forever — and rule 15 of the recommendation
        engine reads ALL of a workflow's clusters, inflating recommendation
        counts. Delete-then-insert (same pattern as node_stats in the
        bottleneck analyzer) keeps exactly one current set per workflow.

        Returns:
            Warning strings for steps that failed to persist (empty on
            full success). Failures are logged and surfaced to the caller;
            they do not abort the analysis.
        """
        warnings = []

        try:
            self.db.table('error_clusters').delete().eq(
                'workflow_id', workflow_id
            ).execute()
        except Exception as e:
            warning = (
                f"Failed to clear stale clusters for workflow "
                f"{workflow_id}: {e}"
            )
            logger.warning(warning)
            warnings.append(warning)

        for cluster in clusters:
            try:
                self.db.table('error_clusters').insert({
                    'id': cluster.id,
                    'workflow_id': cluster.workflow_id,
                    'label': cluster.label,
                    'representative_error_id': cluster.representative_error_id,
                    'representative_message': cluster.representative_message,
                    'member_count': cluster.member_count,
                    'avg_similarity': cluster.avg_similarity,
                    'affected_nodes': cluster.affected_nodes,
                    'pattern_type': cluster.pattern_type,
                    'severity': cluster.severity
                }).execute()

                # Update error_embeddings with cluster assignment
                for node in cluster.affected_nodes:
                    self.db.table('error_embeddings').update({
                        'cluster_id': cluster.id,
                        'cluster_label': cluster.label
                    }).eq('node_id', node['node_id']).eq(
                        'error_message', cluster.representative_message
                    ).execute()

            except Exception as e:
                warning = f"Failed to store cluster {cluster.id} ({cluster.label}): {e}"
                logger.warning(warning)
                warnings.append(warning)

        return warnings

    # =============================================================================
    # Phase 5: Result Building
    # =============================================================================

    async def _build_analysis_result(
        self,
        execution_id: str,
        workflow_id: str,
        errors: List[ErrorEvent],
        clusters: List[ErrorCluster],
        include_historical: bool,
        persistence_warnings: Optional[List[str]] = None
    ) -> ErrorAnalysisResult:
        """Build final analysis result for API response"""

        # Format execution errors
        execution_errors = [
            {
                "event_id": error.event_id,
                "node_id": error.node_id,
                "node_name": error.node_name,
                "error_message": error.error_message,
                "error_type": error.error_type,
                "timestamp": error.timestamp
            }
            for error in errors
        ]

        # Format clusters
        formatted_clusters = [cluster.to_dict() for cluster in clusters]

        # Calculate summary statistics
        severity_counts = {
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0
        }

        for cluster in clusters:
            if cluster.severity in severity_counts:
                severity_counts[cluster.severity] += 1

        summary = {
            "total_errors": len(errors),
            "clustered_errors": sum(c.member_count for c in clusters),
            "unclustered_errors": len(errors) - sum(c.member_count for c in clusters),
            "unique_patterns": len(clusters),
            "critical_patterns": severity_counts['critical'],
            "high_patterns": severity_counts['high'],
            "medium_patterns": severity_counts['medium'],
            "low_patterns": severity_counts['low']
        }

        return ErrorAnalysisResult(
            execution_id=execution_id,
            workflow_id=workflow_id,
            execution_errors=execution_errors,
            clusters=formatted_clusters,
            summary=summary,
            calculated_at=datetime.utcnow().isoformat() + "Z",
            analysis_context={
                "execution_id": execution_id,
                "workflow_id": workflow_id,
                "include_historical": include_historical,
                "similarity_threshold": 0.75,
                "persistence_warnings": persistence_warnings or []
            }
        )
