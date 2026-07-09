"""
Bottleneck Detection & Scoring Algorithm

This module scores each node by its impact on overall workflow performance,
combining multiple factors to provide a trustworthy, evidence-backed ranking.

Scoring Algorithm:
1. Duration Factor (40% weight): Percentile-based duration ranking
2. Position Factor (30% weight): Critical path location (1.0 on path, 0.3 off path)
3. Frequency Factor (20% weight): Execution count multiplier (for loops)
4. Variance Factor (10% weight): Performance consistency (requires multiple executions)

Final Score: 0-100 integer
- 0-30: Low bottleneck (green)
- 31-60: Medium bottleneck (yellow)
- 61-80: High bottleneck (orange)
- 81-100: Severe bottleneck (red)
"""

from typing import Dict, List, Optional
from datetime import datetime
from dataclasses import dataclass, asdict
import logging
import statistics
import math

logger = logging.getLogger(__name__)


@dataclass
class BottleneckScore:
    """Result of bottleneck scoring for a single node"""
    rank: int
    node_id: str
    node_name: str
    node_type: str
    score: int  # 0-100
    severity: str  # low, medium, high, severe
    on_critical_path: bool
    duration_ms: int
    execution_count: int
    percentage_of_total: float
    factors: Dict[str, float]  # duration, position, frequency, variance
    evidence: Optional[Dict] = None
    has_recommendations: Optional[bool] = None  # Set by API after checking recommendations

    def to_dict(self) -> Dict:
        """Convert to dictionary for API response"""
        return asdict(self)


class BottleneckAnalyzer:
    """Analyzes workflow executions to identify and score bottlenecks"""

    def __init__(self, supabase_client):
        self.db = supabase_client
        # Execution event node_ids from the last analyze() call that could
        # not be mapped to a workflow node. Exposed via get_summary().
        self.unmapped_nodes: List[str] = []

    def analyze(self, execution_id: str, workflow_id: str, limit: int = 10) -> List[BottleneckScore]:
        """
        Main entry point - orchestrates bottleneck analysis

        Args:
            execution_id: UUID of the execution to analyze
            workflow_id: UUID of the workflow
            limit: Number of top bottlenecks to return

        Returns:
            List of BottleneckScore objects sorted by score descending

        Raises:
            ValueError: If critical path not found or no execution data
        """
        # Phase 1: Load critical path (from Day 1)
        critical_path_data = self._load_critical_path(execution_id)

        if not critical_path_data:
            raise ValueError(
                "Critical path must be calculated before bottleneck analysis. "
                "Run the critical path endpoint first."
            )

        critical_path_nodes = critical_path_data['path_nodes']

        # Phase 2: Load workflow structure to get node name mappings
        workflow_graph = self._load_workflow_graph(workflow_id)

        # Phase 3: Load node execution data (maps normalized names to UUIDs)
        node_durations, self.unmapped_nodes = self._load_node_durations(
            execution_id, workflow_graph
        )

        if not node_durations:
            raise ValueError(f"No execution data found for execution {execution_id}")

        # Phase 3: Calculate scores for each node
        bottlenecks = []
        all_durations = [data['duration_ms'] for data in node_durations.values()]
        total_duration_ms = critical_path_data.get('total_duration_ms', sum(all_durations))

        for node_id, node_data in node_durations.items():
            # Calculate individual factors
            duration_factor = self._calculate_duration_factor(
                node_data['duration_ms'],
                all_durations
            )

            position_factor = self._calculate_position_factor(
                node_id,
                critical_path_nodes
            )

            frequency_factor = self._calculate_frequency_factor(
                node_data['execution_count']
            )

            variance_factor = self._calculate_variance_factor(
                node_data.get('durations', [node_data['duration_ms']])
            )

            # Calculate combined score
            score = self._calculate_bottleneck_score(
                duration_factor,
                position_factor,
                frequency_factor,
                variance_factor,
                duration_ms=node_data['duration_ms']
            )

            severity = self._get_severity_level(score)

            # Calculate percentage of total execution time
            percentage_of_total = (node_data['duration_ms'] / total_duration_ms * 100) if total_duration_ms > 0 else 0

            bottleneck = BottleneckScore(
                rank=0,  # Will be set after sorting
                node_id=node_id,
                node_name=node_data['name'],
                node_type=node_data['type'],
                score=score,
                severity=severity,
                on_critical_path=node_id in critical_path_nodes,
                duration_ms=node_data['duration_ms'],
                execution_count=node_data['execution_count'],
                percentage_of_total=round(percentage_of_total, 1),
                factors={
                    'duration': round(duration_factor, 2),
                    'position': round(position_factor, 2),
                    'frequency': round(frequency_factor, 2),
                    'variance': round(variance_factor, 2)
                }
            )

            bottlenecks.append(bottleneck)

        # Phase 4: Sort by score and assign ranks
        bottlenecks.sort(key=lambda x: x.score, reverse=True)

        for i, bottleneck in enumerate(bottlenecks):
            bottleneck.rank = i + 1

        # Phase 5: Store results in database for recommendation engine
        self._store_results(execution_id, workflow_id, bottlenecks)

        # Return top N bottlenecks
        return bottlenecks[:limit]

    def _load_critical_path(self, execution_id: str) -> Optional[Dict]:
        """
        Load critical path results from the critical_paths table (from Day 1)

        Returns:
        {
            'path_nodes': [node_uuid_1, node_uuid_2, ...],
            'total_duration_ms': int
        }
        """
        try:
            response = self.db.table('critical_paths').select('*').eq('execution_id', execution_id).execute()

            if response.data and len(response.data) > 0:
                cached = response.data[0]
                return {
                    'path_nodes': cached.get('path_node_ids', cached.get('path_nodes', [])),
                    'total_duration_ms': cached['total_duration_ms']
                }
        except Exception as e:
            print(f"Error loading critical path: {e}")

        return None

    def _load_workflow_graph(self, workflow_id: str) -> Dict:
        """
        Load workflow structure from database to get node mappings

        Returns:
        {
            'nodes': {
                'node_uuid': {'name': 'Node Name', 'type': 'node_type'},
                ...
            }
        }
        """
        # Load workflow with raw_json
        workflow_response = self.db.table('workflows').select('raw_json').eq('id', workflow_id).execute()

        if not workflow_response.data:
            raise ValueError(f"Workflow {workflow_id} not found")

        raw_json = workflow_response.data[0].get('raw_json', {})

        # Extract nodes from raw JSON
        nodes = {}
        for node in raw_json.get('nodes', []):
            node_id = node.get('id', '')
            node_type = node.get('type', 'unknown')

            # Remove n8n-nodes-base. prefix if present
            if node_type.startswith('n8n-nodes-base.'):
                node_type = node_type.replace('n8n-nodes-base.', '')

            nodes[node_id] = {
                'name': node.get('name', 'Unknown'),
                'type': node_type
            }

        return {'nodes': nodes}

    def _normalize_node_name(self, node_name: str) -> str:
        """
        Normalize node name to match the format used in execution events.
        Same logic as N8nExecutionParser._normalize_node_id()
        """
        return node_name.lower().replace(" ", "_")

    def _load_node_durations(self, execution_id: str, workflow_graph: Dict) -> tuple:
        """
        Load execution timing for all nodes from execution_events
        Maps normalized node names to UUIDs using workflow structure

        Returns:
        Tuple of (node_durations, unmapped_node_ids) where node_durations is:
        {
            'node_uuid_1': {
                'name': str,
                'type': str,
                'duration_ms': int,
                'execution_count': int,
                'durations': [int]  # List of durations if node executed multiple times
            },
            ...
        }
        and unmapped_node_ids lists event node_ids with no workflow match
        (excluded from scoring, surfaced so they don't vanish silently).
        """
        # Build mapping from normalized name to UUID
        name_to_uuid = {}
        for uuid, node_data in workflow_graph['nodes'].items():
            normalized_name = self._normalize_node_name(node_data['name'])
            name_to_uuid[normalized_name] = uuid

        # Load all FINISHED and ERROR events for this execution
        events_response = self.db.table('execution_events').select('*').eq(
            'execution_id', execution_id
        ).in_('event_type', ['finished', 'error']).execute()

        # Group by normalized node_id and aggregate
        from collections import defaultdict
        node_data_by_normalized = defaultdict(lambda: {
            'durations': [],
            'execution_count': 0
        })

        for event in events_response.data:
            normalized_node_id = event['node_id']
            duration = event.get('duration_ms', 0)

            node_data_by_normalized[normalized_node_id]['durations'].append(duration)
            node_data_by_normalized[normalized_node_id]['execution_count'] += 1

        # Map to UUIDs and calculate aggregate duration
        result = {}
        unmapped = []
        for normalized_id, data in node_data_by_normalized.items():
            # Map normalized name to UUID
            uuid = name_to_uuid.get(normalized_id)
            if uuid:
                # Take name/type from the workflow graph: execution_events
                # rows carry no node metadata, so event-derived values are
                # always 'unknown' / normalized lowercase ids.
                graph_node = workflow_graph['nodes'][uuid]
                result[uuid] = {
                    'name': graph_node['name'],
                    'type': graph_node['type'],
                    'duration_ms': sum(data['durations']),  # Total duration
                    'execution_count': data['execution_count'],
                    'durations': data['durations']
                }
            else:
                unmapped.append(normalized_id)

        if unmapped:
            logger.warning(
                f"Could not map {len(unmapped)} execution nodes to workflow "
                f"UUIDs (excluded from scoring): {unmapped[:10]}"
            )

        return result, unmapped

    def _calculate_duration_factor(self, duration_ms: int, all_durations: List[int]) -> float:
        """
        Calculate duration factor using percentile ranking

        Args:
            duration_ms: Duration of this node
            all_durations: List of all node durations in execution

        Returns:
            0.0 (fastest) to 1.0 (slowest)
        """
        if not all_durations or duration_ms == 0:
            return 0.0

        # Calculate percentile rank
        # percentile = (number of values below this value) / (total values - 1)
        sorted_durations = sorted(all_durations)
        rank = sorted_durations.index(duration_ms) if duration_ms in sorted_durations else 0

        # If there are duplicates, take the highest rank
        count_below = sum(1 for d in sorted_durations if d < duration_ms)
        count_equal = sum(1 for d in sorted_durations if d == duration_ms)

        # Use the middle of the equal values for ranking
        percentile_rank = (count_below + count_equal / 2) / len(sorted_durations)

        return min(max(percentile_rank, 0.0), 1.0)

    def _calculate_position_factor(self, node_id: str, critical_path: List[str]) -> float:
        """
        Calculate position factor based on critical path membership

        Args:
            node_id: UUID of the node
            critical_path: List of node UUIDs on the critical path

        Returns:
            1.0 if on critical path (blocks everything)
            0.3 if not on critical path (runs in parallel)
        """
        if node_id in critical_path:
            return 1.0  # Maximum impact
        else:
            return 0.3  # Still matters, but lower priority

    def _calculate_frequency_factor(self, execution_count: int) -> float:
        """
        Calculate frequency factor based on execution count

        Args:
            execution_count: Number of times this node executed

        Returns:
            0.0 to 1.0 based on frequency
            - 1 execution → 0.0 (baseline, no frequency impact)
            - 2 executions → 0.1
            - 5 executions → 0.4
            - 10 executions → 0.7
            - 20+ executions → 1.0 (maximum frequency penalty)
        """
        if execution_count <= 1:
            return 0.0

        # Logarithmic scaling: log(count) / log(20)
        # This makes 2→4 executions more impactful than 20→22 executions
        normalized = min(math.log(execution_count) / math.log(20), 1.0)
        return normalized

    def _calculate_variance_factor(self, durations: List[int]) -> float:
        """
        Calculate variance factor based on performance consistency

        Args:
            durations: List of duration measurements for this node

        Returns:
            0.0 (consistent) to 1.0 (highly variable)
            Uses Coefficient of Variation (CV = std_dev / mean * 100%)
        """
        if len(durations) < 2:
            return 0.0  # Can't calculate variance with single data point

        mean = statistics.mean(durations)
        if mean == 0:
            return 0.0

        std_dev = statistics.stdev(durations)

        # Coefficient of Variation (CV) as percentage
        cv = (std_dev / mean) * 100

        # Normalize to 0-1 scale (CV > 100% is capped at 1.0)
        normalized = min(cv / 100.0, 1.0)
        return normalized

    def _calculate_bottleneck_score(
        self,
        duration_factor: float,
        position_factor: float,
        frequency_factor: float,
        variance_factor: float,
        duration_ms: int = 0
    ) -> int:
        """
        Combine all factors with weights to produce final score 0-100

        Weights:
        - Duration: 40% (most important - raw time impact)
        - Position: 30% (critical path location)
        - Frequency: 20% (loop/retry multiplier)
        - Variance: 10% (consistency penalty)

        CALIBRATION RULES (applied AFTER weighted calculation):
        - Nodes < 10ms: capped at 39 (Low max) regardless of other factors
        - Nodes < 100ms: capped at 49 (Medium max)
        - Nodes < 500ms: capped at 69 (High max)
        - Nodes >= 500ms: no cap, use calculated score

        This prevents fast nodes from getting inflated scores due to
        relative percentile ranking in already-optimized workflows.

        Returns:
            Integer score 0-100
        """
        weighted_score = (
            duration_factor * 0.40 +
            position_factor * 0.30 +
            frequency_factor * 0.20 +
            variance_factor * 0.10
        )

        # Scale to 0-100
        score = int(weighted_score * 100)

        # TIER 1: Absolute duration caps
        # Fast nodes should never score as severe/high bottlenecks
        if duration_ms < 10:
            score = min(score, 39)   # Cap at Low
        elif duration_ms < 100:
            score = min(score, 49)   # Cap at Medium max
        elif duration_ms < 500:
            score = min(score, 69)   # Cap at High max
        # Nodes >= 500ms: no cap, use calculated score

        # Ensure bounds
        return max(0, min(100, score))

    def _get_severity_level(self, score: int) -> str:
        """
        Map score to severity category

        Returns:
            'severe' (81-100) - red - optimize immediately
            'high' (61-80) - orange - optimize soon
            'medium' (31-60) - yellow - monitor
            'low' (0-30) - green - acceptable
        """
        if score >= 81:
            return "severe"
        elif score >= 61:
            return "high"
        elif score >= 31:
            return "medium"
        else:
            return "low"

    def _store_results(self, execution_id: str, workflow_id: str, bottlenecks: List[BottleneckScore]):
        """
        Store bottleneck results in database for recommendation engine

        Saves each bottleneck to node_stats table for use by recommendation engine
        """
        try:
            # Delete existing records for this execution first
            self.db.table('node_stats').delete().eq('execution_id', execution_id).execute()

            # Prepare records for batch insert
            records = []
            for bottleneck in bottlenecks:
                records.append({
                    'execution_id': execution_id,
                    'workflow_id': workflow_id,
                    'node_id': bottleneck.node_id,
                    'node_name': bottleneck.node_name,
                    'node_type': bottleneck.node_type,
                    'bottleneck_score': bottleneck.score,
                    'total_duration_ms': bottleneck.duration_ms,
                    'is_on_critical_path': bottleneck.on_critical_path,
                    'execution_count': bottleneck.execution_count
                })

            # Batch insert all records
            if records:
                self.db.table('node_stats').insert(records).execute()
        except Exception as e:
            # Don't fail the request if caching fails
            print(f"Warning: Failed to cache bottleneck results: {e}")

    def get_summary(self, bottlenecks: List[BottleneckScore], total_nodes: int) -> Dict:
        """
        Generate summary statistics for bottleneck analysis

        Args:
            bottlenecks: List of all bottleneck scores
            total_nodes: Total number of nodes analyzed

        Returns:
            Dictionary with summary statistics
        """
        severity_counts = {
            'severe': 0,
            'high': 0,
            'medium': 0,
            'low': 0
        }

        for bottleneck in bottlenecks:
            severity_counts[bottleneck.severity] += 1

        top_bottleneck_impact = bottlenecks[0].percentage_of_total if bottlenecks else 0

        return {
            'total_nodes_analyzed': total_nodes,
            'severe_bottlenecks': severity_counts['severe'],
            'high_bottlenecks': severity_counts['high'],
            'medium_bottlenecks': severity_counts['medium'],
            'low_bottlenecks': severity_counts['low'],
            'top_bottleneck_impact_percentage': round(top_bottleneck_impact, 1),
            # Event node_ids that could not be mapped to a workflow node in
            # the last analyze() call -- excluded from scoring, not off-path
            'unmapped_nodes': list(self.unmapped_nodes)
        }

    def get_optimization_verdict(self, bottlenecks: List[BottleneckScore], total_duration_ms: int, recommendation_count: int = None) -> Dict:
        """
        Generate an optimization verdict based on bottleneck analysis.

        Returns a verdict with status, message, and supporting data
        to help users understand if further optimization is needed.

        IMPORTANT: Verdict only shows "needs_optimization" or "critical" when
        recommendations actually exist. This prevents the confusing UX where
        the banner says "Optimization Recommended" but no recommendations are available.

        Verdict levels:
        - "well_optimized": No severe/high bottlenecks, total < 5s
        - "minor_improvements": Only medium bottlenecks, reasonable total time
        - "needs_optimization": Has high/severe bottlenecks AND recommendations exist
        - "critical": Multiple severe bottlenecks AND recommendations exist

        Args:
            bottlenecks: List of all bottleneck scores
            total_duration_ms: Total execution duration in milliseconds
            recommendation_count: Number of recommendations (optional, enables verdict gating)

        Returns:
            Dictionary with verdict status, message, color, and stats
        """
        severe_count = sum(1 for b in bottlenecks if b.severity == "severe")
        high_count = sum(1 for b in bottlenecks if b.severity == "high")
        medium_count = sum(1 for b in bottlenecks if b.severity == "medium")

        total_seconds = total_duration_ms / 1000

        # Check if recommendations exist (enables verdict gating)
        # If recommendation_count is None, we fall back to old behavior for backwards compatibility
        has_recommendations = recommendation_count is None or recommendation_count > 0

        # Determine verdict
        # Only show "needs_optimization" or "critical" if recommendations exist
        if severe_count > 0 and has_recommendations:
            if severe_count >= 2:
                verdict_status = "critical"
                verdict_message = f"Critical: {severe_count} severe bottlenecks detected. Immediate optimization recommended."
                verdict_color = "red"
            else:
                verdict_status = "needs_optimization"
                verdict_message = "1 severe bottleneck found. Focus optimization on the top-ranked node."
                verdict_color = "red"
        elif high_count > 0 and has_recommendations:
            verdict_status = "needs_optimization"
            verdict_message = f"{high_count} high-impact bottleneck{'s' if high_count > 1 else ''} found. Optimization recommended."
            verdict_color = "yellow"
        elif severe_count > 0 or high_count > 0:
            # Has bottlenecks but NO recommendations - downgrade to minor_improvements
            verdict_status = "minor_improvements"
            verdict_message = "Bottlenecks detected but no specific optimizations identified. Performance is acceptable."
            verdict_color = "yellow"
        elif medium_count > 3:
            verdict_status = "minor_improvements"
            verdict_message = "Several medium bottlenecks detected. Consider reviewing workflow architecture."
            verdict_color = "yellow"
        elif total_seconds <= 5:
            verdict_status = "well_optimized"
            verdict_message = "This workflow is well-optimized. No critical bottlenecks detected."
            verdict_color = "green"
        else:
            verdict_status = "minor_improvements"
            verdict_message = "Workflow performance is acceptable. Minor improvements possible."
            verdict_color = "green"

        return {
            "status": verdict_status,
            "message": verdict_message,
            "color": verdict_color,
            "stats": {
                "total_duration_s": round(total_seconds, 2),
                "severe_count": severe_count,
                "high_count": high_count,
                "medium_count": medium_count,
                "high_impact_count": severe_count + high_count,
                "recommendation_count": recommendation_count
            }
        }
