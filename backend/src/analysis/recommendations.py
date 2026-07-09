"""
Recommendation Engine with 37 Detection Rules

This module analyzes workflow executions to generate evidence-backed optimization
recommendations based on critical path, bottleneck, and error cluster data.

The 37 Detection Rules (numbering has a gap: rules 27-30 were reserved during the
Week-4 expansion and never built):

PERFORMANCE RULES (1-7, 17-22):
1. Sequential API Calls → Parallelize
2. Long Node Duration → Optimize Algorithm
3. High Loop Iteration → Batch Processing
4. Duplicate HTTP Requests → Add Caching
5. Synchronous Waits → Use Webhooks
6. Large Data Transfers → Compress/Stream
7. Hardcoded Delays → Remove/Justify
17. Critical Path Heavy Node → Optimize bottleneck
18. High Latency External Service → Add caching
19. Database Query Slow → Optimize query
20. Redundant API Calls → Batch requests
21. Heavy Computation in Loop → Vectorize
22. Inefficient Data Filtering → Server-side filter

RELIABILITY RULES (8-16, 23-26):
8. Repeated Timeouts → Increase Timeout
9. Auth Failures → Fix Credentials
10. Rate Limits → Add Backoff/Queuing
11. Network Errors → Add Retry Logic
12. Validation Errors → Add Input Checks
13. Resource Errors → Scale Infrastructure
14. High Error Rate on Node → Investigate Root Cause
15. Error Cluster Across Nodes → Systemic Issue
16. Any Execution Error → Investigate and Fix
23. No Retry Logic → Add retry with backoff
24. Missing Timeout Config → Add timeout
25. Single Point of Failure → Add fallback
26. No Rate Limit Handling → Handle 429 responses

COST OPTIMIZATION RULES (31-35):
31. Expensive API in Loop → Batch to reduce costs
32. Redundant Storage Operations → Consolidate
33. Unnecessary Full Scans → Add filtering
34. Heavy Compute in Sync Flow → Use async
35. Storage Without Cleanup → Add cleanup

BOTTLENECK-BASED RULES (36-41):
36. Severe Bottleneck → Immediate optimization
37. High Bottleneck → Optimization recommended
38. Multiple Medium Bottlenecks → Review workflow
39. Critical Path Bottleneck → Priority optimization
40. High Variance Node → Stabilize performance
41. Orphaned Bottleneck → Surface bottlenecks no other rule covered

Priority Score Formula: impact_score * effort_multiplier * 100 (0-100)
- Impact score: 0-1 (based on time_saved or error_count; CRITICAL=1.0)
- Effort multipliers (discount factors): LOW=1.0, MEDIUM=0.7, HIGH=0.4
"""

from typing import Dict, List, Optional
from dataclasses import dataclass, asdict, field
from datetime import datetime
import uuid
from enum import Enum


class ImpactLevel(str, Enum):
    """Impact level for recommendations"""
    CRITICAL = "CRITICAL"  # Security issues, complete failures
    HIGH = "HIGH"  # >5s time saved or >10 errors
    MEDIUM = "MEDIUM"  # 2-5s saved or 5-10 errors
    LOW = "LOW"  # <2s saved or <5 errors


class EffortLevel(str, Enum):
    """Effort level for implementing recommendations"""
    LOW = "LOW"  # Simple config change, 1-2 hours
    MEDIUM = "MEDIUM"  # Code changes, 4-8 hours
    HIGH = "HIGH"  # Architecture changes, 1-3 days


class RecommendationCategory(str, Enum):
    """Category of recommendation"""
    PERFORMANCE = "performance"
    RELIABILITY = "reliability"
    COST = "cost"
    SECURITY = "security"


@dataclass
class Evidence:
    """Evidence item backing a recommendation with clickable link"""
    type: str  # e.g., "critical_path", "bottleneck", "error_cluster"
    description: str  # Human-readable explanation
    data: Dict  # Relevant data for debugging
    link: Optional[str] = None  # Clickable URL to proof

    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class Recommendation:
    """A single optimization recommendation with evidence"""
    id: str
    rule_id: int  # 1-15
    title: str
    description: str
    evidence: List[Evidence]
    impact: ImpactLevel
    impact_details: str  # e.g., "Save 80% execution time (45s → 9s)"
    effort: EffortLevel
    priority_score: float  # 0-100
    category: RecommendationCategory
    code_example: Optional[str] = None
    affected_node_ids: List[str] = field(default_factory=list)
    time_saved_ms: Optional[int] = None
    error_count: Optional[int] = None

    def to_dict(self) -> Dict:
        result = asdict(self)
        result['impact'] = self.impact.value
        result['effort'] = self.effort.value
        result['category'] = self.category.value
        return result


class RecommendationEngine:
    """Generates evidence-backed recommendations from analysis results"""

    # Effort multipliers for priority calculation
    EFFORT_MULTIPLIERS = {
        EffortLevel.LOW: 1.0,
        EffortLevel.MEDIUM: 0.7,
        EffortLevel.HIGH: 0.4
    }

    def __init__(self, supabase_client):
        self.db = supabase_client

    async def generate_recommendations(
        self,
        execution_id: str,
        workflow_id: str
    ) -> Dict:
        """
        Main entry point - generates all recommendations for an execution

        Args:
            execution_id: UUID of the execution to analyze
            workflow_id: UUID of the workflow

        Returns:
            Dict with recommendations and summary
        """
        # Phase 1: Load all analysis data in parallel
        critical_path_data = await self._load_critical_path(execution_id)
        bottlenecks_data = await self._load_bottlenecks(execution_id)
        error_analysis_data = await self._load_error_analysis(execution_id)
        execution_data = await self._load_execution_data(execution_id, workflow_id)

        # Store data for rule methods to access
        self.critical_path = critical_path_data
        self.bottlenecks = bottlenecks_data
        self.error_analysis = error_analysis_data
        self.execution_data = execution_data
        self.execution_id = execution_id
        self.workflow_id = workflow_id

        # Phase 2: Apply all 40 rules
        recommendations = []

        # Performance rules (1-7)
        recommendations.extend(await self._apply_rule_1_sequential_api_calls())
        recommendations.extend(await self._apply_rule_2_long_duration())
        recommendations.extend(await self._apply_rule_3_high_loop_iterations())
        recommendations.extend(await self._apply_rule_4_duplicate_requests())
        recommendations.extend(await self._apply_rule_5_polling())
        recommendations.extend(await self._apply_rule_6_large_transfers())
        recommendations.extend(await self._apply_rule_7_hardcoded_delays())

        # Reliability rules (8-16)
        recommendations.extend(await self._apply_rule_8_timeouts())
        recommendations.extend(await self._apply_rule_9_auth_failures())
        recommendations.extend(await self._apply_rule_10_rate_limits())
        recommendations.extend(await self._apply_rule_11_network_errors())
        recommendations.extend(await self._apply_rule_12_validation_errors())
        recommendations.extend(await self._apply_rule_13_resource_errors())
        recommendations.extend(await self._apply_rule_14_high_error_rate())
        recommendations.extend(await self._apply_rule_15_error_clusters())
        recommendations.extend(await self._apply_rule_16_any_errors())

        # New Performance rules (17-22)
        recommendations.extend(await self._apply_rule_17_critical_path_heavy_node())
        recommendations.extend(await self._apply_rule_18_high_latency_service())
        recommendations.extend(await self._apply_rule_19_slow_database())
        recommendations.extend(await self._apply_rule_20_redundant_api_calls())
        recommendations.extend(await self._apply_rule_21_heavy_computation_loop())
        recommendations.extend(await self._apply_rule_22_inefficient_filtering())

        # New Reliability rules (23-26)
        recommendations.extend(await self._apply_rule_23_no_retry_logic())
        recommendations.extend(await self._apply_rule_24_missing_timeout())
        recommendations.extend(await self._apply_rule_25_single_point_failure())
        recommendations.extend(await self._apply_rule_26_no_rate_limit_handling())

        # Cost optimization rules (31-35)
        recommendations.extend(await self._apply_rule_31_expensive_api_loop())
        recommendations.extend(await self._apply_rule_32_redundant_storage())
        recommendations.extend(await self._apply_rule_33_unnecessary_full_scans())
        recommendations.extend(await self._apply_rule_34_heavy_compute_sync())
        recommendations.extend(await self._apply_rule_35_storage_no_cleanup())

        # Bottleneck-based rules (36-40)
        recommendations.extend(await self._apply_rule_36_severe_bottleneck())
        recommendations.extend(await self._apply_rule_37_high_bottleneck())
        recommendations.extend(await self._apply_rule_38_multiple_medium_bottlenecks())
        recommendations.extend(await self._apply_rule_39_critical_path_bottleneck())
        recommendations.extend(await self._apply_rule_40_high_variance_node())

        # Fallback rule (41) - FINAL PASS: catch orphaned high-severity bottlenecks
        # This ensures "Optimization Recommended" verdict always has recommendations
        recommendations.extend(await self._apply_rule_41_orphaned_bottleneck(recommendations))

        # Phase 3: Calculate priority scores and sort
        for rec in recommendations:
            rec.priority_score = self._calculate_priority_score(rec)

        recommendations.sort(key=lambda r: r.priority_score, reverse=True)

        # Phase 4: Build summary
        summary = self._build_summary(recommendations)

        return {
            "success": True,
            "data": {
                "recommendations": [r.to_dict() for r in recommendations],
                "summary": summary
            }
        }

    # =========================================================================
    # DATA LOADING METHODS
    # =========================================================================

    async def _load_critical_path(self, execution_id: str) -> Optional[Dict]:
        """Load critical path analysis results"""
        try:
            response = self.db.table('critical_paths') \
                .select('*') \
                .eq('execution_id', execution_id) \
                .execute()

            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            print(f"Error loading critical path: {e}")
            return None

    async def _load_bottlenecks(self, execution_id: str) -> List[Dict]:
        """Load bottleneck analysis results"""
        try:
            response = self.db.table('node_stats') \
                .select('*') \
                .eq('execution_id', execution_id) \
                .order('bottleneck_score', desc=True) \
                .execute()

            # Map database column names to expected names
            bottlenecks = []
            for record in (response.data if response.data else []):
                bottleneck = dict(record)
                # Rename columns to match expected names in rules
                if 'total_duration_ms' in bottleneck:
                    bottleneck['duration_ms'] = bottleneck['total_duration_ms']
                if 'is_on_critical_path' in bottleneck:
                    bottleneck['on_critical_path'] = bottleneck['is_on_critical_path']
                bottlenecks.append(bottleneck)

            return bottlenecks
        except Exception as e:
            print(f"Error loading bottlenecks: {e}")
            return []

    async def _load_error_analysis(self, execution_id: str) -> Optional[Dict]:
        """Load error clustering results and execution errors"""
        try:
            # First get workflow_id for this execution
            exec_response = self.db.table('executions') \
                .select('workflow_id') \
                .eq('id', execution_id) \
                .execute()

            workflow_id = None
            if exec_response.data:
                workflow_id = exec_response.data[0].get('workflow_id')

            # Load error clusters by workflow_id (clusters are stored by workflow)
            clusters = []
            if workflow_id:
                clusters_response = self.db.table('error_clusters') \
                    .select('*') \
                    .eq('workflow_id', workflow_id) \
                    .execute()
                clusters = clusters_response.data if clusters_response.data else []

            # Load individual error embeddings for this execution
            embeddings_response = self.db.table('error_embeddings') \
                .select('*') \
                .eq('execution_id', execution_id) \
                .execute()

            errors_from_embeddings = embeddings_response.data if embeddings_response.data else []

            # Also load errors directly from execution_events table
            # This catches errors even if embedding generation failed
            events_response = self.db.table('execution_events') \
                .select('id, node_id, error_message, timestamp, status') \
                .eq('execution_id', execution_id) \
                .eq('status', 'error') \
                .execute()

            errors_from_events = events_response.data if events_response.data else []

            # Merge errors - prefer embeddings data but include all errors
            all_errors = errors_from_embeddings.copy()
            existing_event_ids = {e.get('event_id') for e in errors_from_embeddings}

            for event in errors_from_events:
                if event.get('id') not in existing_event_ids:
                    all_errors.append({
                        'event_id': event.get('id'),
                        'node_id': event.get('node_id'),
                        'error_message': event.get('error_message'),
                        'timestamp': event.get('timestamp')
                    })

            return {
                'clusters': clusters,
                'errors': all_errors
            }
        except Exception as e:
            print(f"Error loading error analysis: {e}")
            import traceback
            traceback.print_exc()
            return {'clusters': [], 'errors': []}

    async def _load_execution_data(self, execution_id: str, workflow_id: str) -> Dict:
        """Load execution events and workflow structure.

        Each query is independent so one failure does not zero out the rest
        (a shared try/except previously turned any single error into
        execution=None, disabling every rule that needs duration or events).
        """
        events = []
        try:
            events_response = self.db.table('execution_events') \
                .select('*') \
                .eq('execution_id', execution_id) \
                .order('timestamp') \
                .execute()
            events = events_response.data if events_response.data else []
        except Exception as e:
            print(f"Error loading execution events: {e}")

        # Node metadata lives in workflows.raw_json (there is no
        # workflow_nodes table in any environment).
        nodes = []
        try:
            workflow_response = self.db.table('workflows') \
                .select('raw_json') \
                .eq('id', workflow_id) \
                .execute()
            if workflow_response.data:
                raw_json = workflow_response.data[0].get('raw_json') or {}
                nodes = raw_json.get('nodes', [])
        except Exception as e:
            print(f"Error loading workflow nodes: {e}")

        execution = None
        try:
            execution_response = self.db.table('executions') \
                .select('*') \
                .eq('id', execution_id) \
                .execute()
            execution = execution_response.data[0] if execution_response.data else None
        except Exception as e:
            print(f"Error loading execution metadata: {e}")

        return {'events': events, 'nodes': nodes, 'execution': execution}

    # =========================================================================
    # PERFORMANCE RULES (1-7)
    # =========================================================================

    async def _apply_rule_1_sequential_api_calls(self) -> List[Recommendation]:
        """
        Rule #1: Sequential API Calls → Parallelize

        Detects: Multiple HTTP/API nodes in sequence on critical path
        Trigger: 3+ sequential API calls on critical path
        Impact: Time saved = sum of durations - max(durations)
        """
        recommendations = []

        if not self.critical_path or not self.bottlenecks:
            return recommendations

        # Find sequential API nodes on critical path
        api_node_types = ['n8n-nodes-base.httpRequest', 'n8n-nodes-base.http',
                          'n8n-nodes-base.webhook', '@n8n/n8n-nodes-langchain.agent']

        api_sequences = []
        current_sequence = []

        for bottleneck in self.bottlenecks:
            if bottleneck.get('on_critical_path') and bottleneck.get('node_type') in api_node_types:
                current_sequence.append(bottleneck)
            else:
                if len(current_sequence) >= 3:
                    api_sequences.append(current_sequence)
                current_sequence = []

        if len(current_sequence) >= 3:
            api_sequences.append(current_sequence)

        # Create recommendations for each sequence
        for sequence in api_sequences:
            total_time = sum(node['duration_ms'] for node in sequence)
            max_time = max(node['duration_ms'] for node in sequence)
            time_saved = total_time - max_time

            if time_saved > 1000:  # Only recommend if saves >1s
                evidence = [
                    Evidence(
                        type="critical_path",
                        description=f"Found {len(sequence)} sequential API calls on critical path",
                        data={
                            'node_count': len(sequence),
                            'total_duration_ms': total_time,
                            'potential_parallel_duration_ms': max_time
                        },
                        link=f"/execution/{self.execution_id}/critical-path"
                    ),
                    Evidence(
                        type="bottlenecks",
                        description=f"API nodes: {', '.join(n['node_name'] for n in sequence[:3])}{'...' if len(sequence) > 3 else ''}",
                        data={'nodes': [n['node_name'] for n in sequence]},
                        link=f"/execution/{self.execution_id}/bottlenecks"
                    )
                ]

                impact = ImpactLevel.HIGH if time_saved > 5000 else ImpactLevel.MEDIUM

                code_example = """
// Before: Sequential calls
const result1 = await api.call1();
const result2 = await api.call2();
const result3 = await api.call3();

// After: Parallel calls
const [result1, result2, result3] = await Promise.all([
  api.call1(),
  api.call2(),
  api.call3()
]);
                """.strip()

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=1,
                    title="Parallelize Sequential API Calls",
                    description=f"Found {len(sequence)} API calls executing sequentially on the critical path. These could be parallelized to save {time_saved/1000:.1f}s per execution.",
                    evidence=evidence,
                    impact=impact,
                    impact_details=f"Save {(time_saved/total_time)*100:.0f}% execution time ({time_saved/1000:.1f}s)",
                    effort=EffortLevel.MEDIUM,
                    priority_score=0.0,  # Calculated later
                    category=RecommendationCategory.PERFORMANCE,
                    code_example=code_example,
                    affected_node_ids=[n['node_id'] for n in sequence],
                    time_saved_ms=time_saved
                ))

        return recommendations

    async def _apply_rule_2_long_duration(self) -> List[Recommendation]:
        """
        Rule #2: Long Node Duration → Optimize Algorithm

        Detects: Nodes with exceptionally long duration
        Trigger: Node duration > 10s on critical path with high bottleneck score
        Impact: Based on bottleneck score and position on critical path
        """
        recommendations = []

        if not self.bottlenecks:
            return recommendations

        for bottleneck in self.bottlenecks:
            duration_s = bottleneck.get('duration_ms', 0) / 1000
            score = bottleneck.get('bottleneck_score', 0)
            on_critical_path = bottleneck.get('on_critical_path', False)

            # Trigger: >10s duration, score >70, on critical path
            if duration_s > 10 and score > 70 and on_critical_path:
                evidence = [
                    Evidence(
                        type="bottleneck",
                        description=f"Node '{bottleneck['node_name']}' takes {duration_s:.1f}s (score: {score}/100)",
                        data={
                            'node_id': bottleneck['node_id'],
                            'duration_ms': bottleneck['duration_ms'],
                            'score': score
                        },
                        link=f"/execution/{self.execution_id}/bottlenecks?node={bottleneck['node_id']}"
                    ),
                    Evidence(
                        type="critical_path",
                        description="Node is on critical path and blocks workflow completion",
                        data={'on_critical_path': True},
                        link=f"/execution/{self.execution_id}/critical-path"
                    )
                ]

                impact = ImpactLevel.HIGH if duration_s > 30 else ImpactLevel.MEDIUM

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=2,
                    title=f"Optimize Long-Running Node: {bottleneck['node_name']}",
                    description=f"This node takes {duration_s:.1f}s and is blocking workflow completion. Consider optimizing the algorithm, adding caching, or reducing data processing.",
                    evidence=evidence,
                    impact=impact,
                    impact_details=f"Potential to reduce execution time by {duration_s:.1f}s",
                    effort=EffortLevel.HIGH,
                    priority_score=0.0,
                    category=RecommendationCategory.PERFORMANCE,
                    affected_node_ids=[bottleneck['node_id']],
                    time_saved_ms=bottleneck['duration_ms']
                ))

        return recommendations

    async def _apply_rule_3_high_loop_iterations(self) -> List[Recommendation]:
        """
        Rule #3: High Loop Iteration → Batch Processing

        Detects: Loop nodes with high iteration counts
        Trigger: Loop with >50 iterations or loop node with high frequency factor
        Impact: Based on total time spent in loop
        """
        recommendations = []

        if not self.bottlenecks or not self.execution_data:
            return recommendations

        # Find loop nodes (high execution count)
        for bottleneck in self.bottlenecks:
            exec_count = bottleneck.get('execution_count', 1)
            duration_ms = bottleneck.get('duration_ms', 0)
            node_name = bottleneck.get('node_name', '')

            # Trigger: >50 executions or "Loop" in name with >20 executions
            if exec_count > 50 or ('Loop' in node_name and exec_count > 20):
                total_time = duration_ms * exec_count

                evidence = [
                    Evidence(
                        type="bottleneck",
                        description=f"Loop executed {exec_count} times, spending {total_time/1000:.1f}s total",
                        data={
                            'execution_count': exec_count,
                            'single_iteration_ms': duration_ms,
                            'total_time_ms': total_time
                        },
                        link=f"/execution/{self.execution_id}/bottlenecks?node={bottleneck['node_id']}"
                    )
                ]

                impact = ImpactLevel.HIGH if total_time > 10000 else ImpactLevel.MEDIUM

                code_example = """
// Before: Process items one-by-one
for (const item of items) {
  await processItem(item);
}

// After: Batch process
const BATCH_SIZE = 10;
for (let i = 0; i < items.length; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE);
  await processBatch(batch);
}
                """.strip()

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=3,
                    title=f"Batch Process Loop: {node_name}",
                    description=f"This loop executes {exec_count} times. Consider batch processing to reduce overhead and improve performance.",
                    evidence=evidence,
                    impact=impact,
                    impact_details=f"Reduce loop overhead, potential 30-50% time savings",
                    effort=EffortLevel.MEDIUM,
                    priority_score=0.0,
                    category=RecommendationCategory.PERFORMANCE,
                    code_example=code_example,
                    affected_node_ids=[bottleneck['node_id']],
                    time_saved_ms=int(total_time * 0.3)  # Estimate 30% savings
                ))

        return recommendations

    async def _apply_rule_4_duplicate_requests(self) -> List[Recommendation]:
        """
        Rule #4: Duplicate HTTP Requests → Add Caching

        Detects: Multiple HTTP nodes with same configuration/endpoint
        Trigger: 2+ nodes with same type and similar names
        Impact: Based on total time saved from caching
        """
        recommendations = []

        if not self.bottlenecks:
            return recommendations

        # Group HTTP nodes by type and similar names
        http_nodes = [b for b in self.bottlenecks
                      if 'http' in b.get('node_type', '').lower() or
                         'api' in b.get('node_name', '').lower()]

        # Simple duplicate detection: same type + similar name prefix
        seen = {}
        for node in http_nodes:
            # Use first 20 chars of name as key
            key = node.get('node_name', '')[:20]
            if key in seen:
                seen[key].append(node)
            else:
                seen[key] = [node]

        # Find groups with duplicates
        for key, nodes in seen.items():
            if len(nodes) >= 2:
                total_time = sum(n.get('duration_ms', 0) for n in nodes)
                max_time = max(n.get('duration_ms', 0) for n in nodes)
                time_saved = total_time - max_time

                if time_saved > 1000:  # Only recommend if saves >1s
                    evidence = [
                        Evidence(
                            type="bottleneck",
                            description=f"Found {len(nodes)} similar HTTP requests",
                            data={
                                'node_count': len(nodes),
                                'nodes': [n['node_name'] for n in nodes]
                            },
                            link=f"/execution/{self.execution_id}/bottlenecks"
                        )
                    ]

                    code_example = """
// Add caching layer
const cache = new Map();

async function fetchWithCache(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }
  const result = await fetch(url);
  cache.set(url, result);
  return result;
}
                    """.strip()

                    recommendations.append(Recommendation(
                        id=str(uuid.uuid4()),
                        rule_id=4,
                        title="Add Caching for Duplicate Requests",
                        description=f"Found {len(nodes)} similar HTTP requests that could benefit from caching.",
                        evidence=evidence,
                        impact=ImpactLevel.MEDIUM,
                        impact_details=f"Save {time_saved/1000:.1f}s by caching duplicate requests",
                        effort=EffortLevel.LOW,
                        priority_score=0.0,
                        category=RecommendationCategory.PERFORMANCE,
                        code_example=code_example,
                        affected_node_ids=[n['node_id'] for n in nodes],
                        time_saved_ms=time_saved
                    ))

        return recommendations

    async def _apply_rule_5_polling(self) -> List[Recommendation]:
        """
        Rule #5: Synchronous Waits → Use Webhooks

        Detects: Wait/delay nodes or polling patterns
        Trigger: Wait node or repeated HTTP checks
        Impact: Can eliminate wait time entirely
        """
        recommendations = []

        if not self.bottlenecks or not self.execution_data:
            return recommendations

        # Find wait/delay nodes
        for bottleneck in self.bottlenecks:
            node_name = bottleneck.get('node_name', '').lower()
            node_type = bottleneck.get('node_type', '').lower()
            duration_ms = bottleneck.get('duration_ms', 0)

            # Trigger: Wait node or "wait" in name
            if 'wait' in node_name or 'wait' in node_type or 'delay' in node_name:
                evidence = [
                    Evidence(
                        type="bottleneck",
                        description=f"Wait node '{bottleneck['node_name']}' adds {duration_ms/1000:.1f}s delay",
                        data={'duration_ms': duration_ms},
                        link=f"/execution/{self.execution_id}/bottlenecks?node={bottleneck['node_id']}"
                    )
                ]

                code_example = """
// Before: Polling with delays
while (!isComplete) {
  await sleep(5000);
  status = await checkStatus();
}

// After: Webhook callback
await registerWebhook('/callback');
// Service calls webhook when complete
                """.strip()

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=5,
                    title=f"Replace Polling with Webhook: {bottleneck['node_name']}",
                    description="Replace synchronous waiting with webhook-based callbacks for faster, more efficient workflows.",
                    evidence=evidence,
                    impact=ImpactLevel.MEDIUM,
                    impact_details=f"Eliminate {duration_ms/1000:.1f}s wait time",
                    effort=EffortLevel.HIGH,
                    priority_score=0.0,
                    category=RecommendationCategory.PERFORMANCE,
                    code_example=code_example,
                    affected_node_ids=[bottleneck['node_id']],
                    time_saved_ms=duration_ms
                ))

        return recommendations

    async def _apply_rule_6_large_transfers(self) -> List[Recommendation]:
        """
        Rule #6: Large Data Transfers → Compress/Stream

        Detects: Nodes with potentially large data transfers
        Trigger: Node with "data" or "transfer" in name and high duration
        Impact: 30-50% reduction in transfer time
        """
        recommendations = []

        if not self.bottlenecks:
            return recommendations

        for bottleneck in self.bottlenecks:
            node_name = bottleneck.get('node_name', '').lower()
            duration_ms = bottleneck.get('duration_ms', 0)

            # Trigger: Keywords suggesting data transfer + duration >5s
            keywords = ['data', 'transfer', 'upload', 'download', 'file', 'export', 'import']
            if any(kw in node_name for kw in keywords) and duration_ms > 5000:
                time_saved = int(duration_ms * 0.4)  # Estimate 40% savings

                evidence = [
                    Evidence(
                        type="bottleneck",
                        description=f"Data transfer node takes {duration_ms/1000:.1f}s",
                        data={'duration_ms': duration_ms},
                        link=f"/execution/{self.execution_id}/bottlenecks?node={bottleneck['node_id']}"
                    )
                ]

                code_example = """
// Add compression
const zlib = require('zlib');
const compressed = zlib.gzipSync(data);

// Or use streaming for large files
const stream = fs.createReadStream(file)
  .pipe(zlib.createGzip())
  .pipe(response);
                """.strip()

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=6,
                    title=f"Compress Large Data Transfer: {bottleneck['node_name']}",
                    description="Add compression or streaming to reduce data transfer time.",
                    evidence=evidence,
                    impact=ImpactLevel.MEDIUM,
                    impact_details=f"Potential 30-50% reduction ({time_saved/1000:.1f}s saved)",
                    effort=EffortLevel.MEDIUM,
                    priority_score=0.0,
                    category=RecommendationCategory.PERFORMANCE,
                    code_example=code_example,
                    affected_node_ids=[bottleneck['node_id']],
                    time_saved_ms=time_saved
                ))

        return recommendations

    async def _apply_rule_7_hardcoded_delays(self) -> List[Recommendation]:
        """
        Rule #7: Hardcoded Delays → Remove/Justify

        Detects: Wait nodes with fixed delays (rate limiting, testing, etc.)
        Trigger: Wait node with duration that's a round number (1s, 5s, etc.)
        Impact: Can potentially eliminate unnecessary delays
        """
        recommendations = []

        if not self.bottlenecks:
            return recommendations

        for bottleneck in self.bottlenecks:
            node_name = bottleneck.get('node_name', '').lower()
            duration_ms = bottleneck.get('duration_ms', 0)

            # Trigger: "wait" or "delay" in name with round-number duration
            if ('wait' in node_name or 'delay' in node_name or 'rate limit' in node_name):
                # Check if duration is a round number (within 10% tolerance)
                duration_s = duration_ms / 1000
                round_durations = [0.5, 1, 2, 3, 5, 10, 15, 30, 60]
                is_round = any(abs(duration_s - rd) / rd < 0.1 for rd in round_durations)

                if is_round:
                    evidence = [
                        Evidence(
                            type="bottleneck",
                            description=f"Fixed delay of {duration_s:.1f}s in '{bottleneck['node_name']}'",
                            data={'duration_ms': duration_ms},
                            link=f"/execution/{self.execution_id}/bottlenecks?node={bottleneck['node_id']}"
                        ),
                        Evidence(
                            type="critical_path",
                            description="Review if this delay is necessary or can be reduced",
                            data={'on_critical_path': bottleneck.get('on_critical_path', False)},
                            link=f"/execution/{self.execution_id}/critical-path"
                        )
                    ]

                    recommendations.append(Recommendation(
                        id=str(uuid.uuid4()),
                        rule_id=7,
                        title=f"Review Fixed Delay: {bottleneck['node_name']}",
                        description=f"This node has a hardcoded {duration_s:.1f}s delay. Consider if this is necessary or if it can be reduced/removed.",
                        evidence=evidence,
                        impact=ImpactLevel.MEDIUM if duration_ms > 3000 else ImpactLevel.LOW,
                        impact_details=f"Could save {duration_s:.1f}s if delay is unnecessary",
                        effort=EffortLevel.LOW,
                        priority_score=0.0,
                        category=RecommendationCategory.PERFORMANCE,
                        affected_node_ids=[bottleneck['node_id']],
                        time_saved_ms=duration_ms
                    ))

        return recommendations

    # =========================================================================
    # RELIABILITY RULES (8-15)
    # =========================================================================

    async def _apply_rule_8_timeouts(self) -> List[Recommendation]:
        """
        Rule #8: Repeated Timeouts → Increase Timeout

        Detects: Multiple timeout errors on same node
        Trigger: 3+ timeout errors on same node
        Impact: CRITICAL - prevents workflow failures
        """
        recommendations = []

        if not self.error_analysis or not self.error_analysis['errors']:
            return recommendations

        # Group errors by node and check for timeout patterns
        node_timeouts = {}
        for error in self.error_analysis['errors']:
            node_id = error.get('node_id')
            error_msg = error.get('error_message', '').lower()

            if 'timeout' in error_msg or 'timed out' in error_msg:
                if node_id not in node_timeouts:
                    node_timeouts[node_id] = []
                node_timeouts[node_id].append(error)

        # Create recommendations for nodes with repeated timeouts
        for node_id, timeout_errors in node_timeouts.items():
            if len(timeout_errors) >= 3:
                evidence = [
                    Evidence(
                        type="error_pattern",
                        description=f"Found {len(timeout_errors)} timeout errors on this node",
                        data={
                            'error_count': len(timeout_errors),
                            'sample_errors': [e['error_message'][:100] for e in timeout_errors[:3]]
                        },
                        link=f"/execution/{self.execution_id}/errors?node={node_id}"
                    )
                ]

                code_example = """
// Increase timeout configuration
{
  "timeout": 60000,  // Increase from 30s to 60s
  "retryOnTimeout": true
}
                """.strip()

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=8,
                    title="Increase Timeout for Failing Node",
                    description=f"This node has {len(timeout_errors)} timeout errors. Consider increasing the timeout value or optimizing the operation.",
                    evidence=evidence,
                    impact=ImpactLevel.CRITICAL,
                    impact_details="Prevents workflow failures from timeouts",
                    effort=EffortLevel.LOW,
                    priority_score=0.0,
                    category=RecommendationCategory.RELIABILITY,
                    code_example=code_example,
                    affected_node_ids=[node_id],
                    error_count=len(timeout_errors)
                ))

        return recommendations

    async def _apply_rule_9_auth_failures(self) -> List[Recommendation]:
        """
        Rule #9: Auth Failures → Fix Credentials

        Detects: Authentication/authorization errors
        Trigger: Any auth error
        Impact: CRITICAL - blocks workflow execution
        """
        recommendations = []

        if not self.error_analysis or not self.error_analysis['errors']:
            return recommendations

        # Find auth-related errors
        auth_keywords = ['auth', 'unauthorized', '401', '403', 'credential', 'permission', 'forbidden']
        auth_errors = []

        for error in self.error_analysis['errors']:
            error_msg = error.get('error_message', '').lower()
            if any(kw in error_msg for kw in auth_keywords):
                auth_errors.append(error)

        if auth_errors:
            # Group by node
            node_auth_errors = {}
            for error in auth_errors:
                node_id = error.get('node_id')
                if node_id not in node_auth_errors:
                    node_auth_errors[node_id] = []
                node_auth_errors[node_id].append(error)

            for node_id, errors in node_auth_errors.items():
                evidence = [
                    Evidence(
                        type="error_pattern",
                        description=f"Authentication failures detected: {errors[0]['error_message'][:100]}...",
                        data={
                            'error_count': len(errors),
                            'sample_error': errors[0]['error_message']
                        },
                        link=f"/execution/{self.execution_id}/errors?node={node_id}"
                    )
                ]

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=9,
                    title="Fix Authentication Credentials",
                    description="Authentication failures detected. Check credentials, API keys, and permissions.",
                    evidence=evidence,
                    impact=ImpactLevel.CRITICAL,
                    impact_details="Blocking workflow execution - must fix immediately",
                    effort=EffortLevel.LOW,
                    priority_score=0.0,
                    category=RecommendationCategory.RELIABILITY,
                    affected_node_ids=[node_id],
                    error_count=len(errors)
                ))

        return recommendations

    async def _apply_rule_10_rate_limits(self) -> List[Recommendation]:
        """
        Rule #10: Rate Limits → Add Backoff/Queuing

        Detects: Rate limit errors from APIs
        Trigger: Rate limit or 429 errors
        Impact: HIGH - prevents successful execution
        """
        recommendations = []

        if not self.error_analysis or not self.error_analysis['errors']:
            return recommendations

        # Find rate limit errors
        rate_limit_keywords = ['rate limit', '429', 'too many requests', 'quota exceeded']
        rate_limit_errors = []

        for error in self.error_analysis['errors']:
            error_msg = error.get('error_message', '').lower()
            if any(kw in error_msg for kw in rate_limit_keywords):
                rate_limit_errors.append(error)

        if rate_limit_errors:
            node_errors = {}
            for error in rate_limit_errors:
                node_id = error.get('node_id')
                if node_id not in node_errors:
                    node_errors[node_id] = []
                node_errors[node_id].append(error)

            for node_id, errors in node_errors.items():
                evidence = [
                    Evidence(
                        type="error_pattern",
                        description=f"Rate limit errors: {errors[0]['error_message'][:100]}...",
                        data={'error_count': len(errors)},
                        link=f"/execution/{self.execution_id}/errors?node={node_id}"
                    )
                ]

                code_example = """
// Add exponential backoff
async function callWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }
      throw error;
    }
  }
}
                """.strip()

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=10,
                    title="Add Rate Limit Handling",
                    description=f"Rate limit errors detected ({len(errors)} occurrences). Add exponential backoff or request queuing.",
                    evidence=evidence,
                    impact=ImpactLevel.HIGH,
                    impact_details="Prevents workflow failures from rate limiting",
                    effort=EffortLevel.MEDIUM,
                    priority_score=0.0,
                    category=RecommendationCategory.RELIABILITY,
                    code_example=code_example,
                    affected_node_ids=[node_id],
                    error_count=len(errors)
                ))

        return recommendations

    async def _apply_rule_11_network_errors(self) -> List[Recommendation]:
        """
        Rule #11: Network Errors → Add Retry Logic

        Detects: Network connectivity errors
        Trigger: ECONNREFUSED, ETIMEDOUT, DNS errors
        Impact: MEDIUM - intermittent failures
        """
        recommendations = []

        if not self.error_analysis or not self.error_analysis['errors']:
            return recommendations

        # Find network errors
        network_keywords = ['econnrefused', 'etimedout', 'enetunreach', 'dns',
                           'network', 'connection refused', 'connection reset']
        network_errors = []

        for error in self.error_analysis['errors']:
            error_msg = error.get('error_message', '').lower()
            if any(kw in error_msg for kw in network_keywords):
                network_errors.append(error)

        if network_errors:
            node_errors = {}
            for error in network_errors:
                node_id = error.get('node_id')
                if node_id not in node_errors:
                    node_errors[node_id] = []
                node_errors[node_id].append(error)

            for node_id, errors in node_errors.items():
                evidence = [
                    Evidence(
                        type="error_pattern",
                        description=f"Network errors: {errors[0]['error_message'][:100]}...",
                        data={'error_count': len(errors)},
                        link=f"/execution/{self.execution_id}/errors?node={node_id}"
                    )
                ]

                code_example = """
// Add retry logic for network errors
async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(1000 * (i + 1));
    }
  }
}
                """.strip()

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=11,
                    title="Add Network Error Retry Logic",
                    description=f"Network errors detected ({len(errors)} occurrences). Add retry logic to handle intermittent connectivity issues.",
                    evidence=evidence,
                    impact=ImpactLevel.MEDIUM,
                    impact_details="Improves reliability for intermittent network issues",
                    effort=EffortLevel.LOW,
                    priority_score=0.0,
                    category=RecommendationCategory.RELIABILITY,
                    code_example=code_example,
                    affected_node_ids=[node_id],
                    error_count=len(errors)
                ))

        return recommendations

    async def _apply_rule_12_validation_errors(self) -> List[Recommendation]:
        """
        Rule #12: Validation Errors → Add Input Checks

        Detects: Input validation failures
        Trigger: Validation, invalid input, or type errors
        Impact: MEDIUM - prevents invalid data processing
        """
        recommendations = []

        if not self.error_analysis or not self.error_analysis['errors']:
            return recommendations

        # Find validation errors
        validation_keywords = ['validation', 'invalid', 'required', 'missing',
                              'type error', 'parse error', 'malformed']
        validation_errors = []

        for error in self.error_analysis['errors']:
            error_msg = error.get('error_message', '').lower()
            if any(kw in error_msg for kw in validation_keywords):
                validation_errors.append(error)

        if validation_errors:
            node_errors = {}
            for error in validation_errors:
                node_id = error.get('node_id')
                if node_id not in node_errors:
                    node_errors[node_id] = []
                node_errors[node_id].append(error)

            for node_id, errors in node_errors.items():
                evidence = [
                    Evidence(
                        type="error_pattern",
                        description=f"Validation errors: {errors[0]['error_message'][:100]}...",
                        data={'error_count': len(errors)},
                        link=f"/execution/{self.execution_id}/errors?node={node_id}"
                    )
                ]

                code_example = """
// Add input validation
function validateInput(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid input: expected object');
  }
  if (!data.requiredField) {
    throw new Error('Missing required field');
  }
  return true;
}
                """.strip()

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=12,
                    title="Add Input Validation",
                    description=f"Validation errors detected ({len(errors)} occurrences). Add input validation to catch errors early.",
                    evidence=evidence,
                    impact=ImpactLevel.MEDIUM,
                    impact_details="Prevents invalid data from causing failures",
                    effort=EffortLevel.LOW,
                    priority_score=0.0,
                    category=RecommendationCategory.RELIABILITY,
                    code_example=code_example,
                    affected_node_ids=[node_id],
                    error_count=len(errors)
                ))

        return recommendations

    async def _apply_rule_13_resource_errors(self) -> List[Recommendation]:
        """
        Rule #13: Resource Errors → Scale Infrastructure

        Detects: Out of memory, CPU, or disk errors
        Trigger: OOM, memory, CPU, or resource exhaustion errors
        Impact: CRITICAL - causes workflow failures
        """
        recommendations = []

        if not self.error_analysis or not self.error_analysis['errors']:
            return recommendations

        # Find resource errors
        resource_keywords = ['out of memory', 'oom', 'memory limit', 'cpu limit',
                            'disk full', 'no space', 'resource exhausted']
        resource_errors = []

        for error in self.error_analysis['errors']:
            error_msg = error.get('error_message', '').lower()
            if any(kw in error_msg for kw in resource_keywords):
                resource_errors.append(error)

        if resource_errors:
            evidence = [
                Evidence(
                    type="error_pattern",
                    description=f"Resource exhaustion: {resource_errors[0]['error_message'][:100]}...",
                    data={'error_count': len(resource_errors)},
                    link=f"/execution/{self.execution_id}/errors"
                )
            ]

            recommendations.append(Recommendation(
                id=str(uuid.uuid4()),
                rule_id=13,
                title="Scale Infrastructure Resources",
                description=f"Resource exhaustion detected ({len(resource_errors)} occurrences). Increase memory, CPU, or disk resources.",
                evidence=evidence,
                impact=ImpactLevel.CRITICAL,
                impact_details="Critical - prevents workflow execution",
                effort=EffortLevel.MEDIUM,
                priority_score=0.0,
                category=RecommendationCategory.RELIABILITY,
                affected_node_ids=list(set(e.get('node_id') for e in resource_errors)),
                error_count=len(resource_errors)
            ))

        return recommendations

    async def _apply_rule_14_high_error_rate(self) -> List[Recommendation]:
        """
        Rule #14: High Error Rate on Node → Investigate Root Cause

        Detects: Single node with many errors
        Trigger: Node has >5 errors
        Impact: HIGH - indicates systematic issue
        """
        recommendations = []

        if not self.error_analysis or not self.error_analysis['errors']:
            return recommendations

        # Count errors by node
        node_error_count = {}
        for error in self.error_analysis['errors']:
            node_id = error.get('node_id')
            if node_id:
                node_error_count[node_id] = node_error_count.get(node_id, 0) + 1

        # Find nodes with high error rates
        for node_id, error_count in node_error_count.items():
            if error_count > 5:
                node_errors = [e for e in self.error_analysis['errors'] if e.get('node_id') == node_id]

                evidence = [
                    Evidence(
                        type="error_rate",
                        description=f"Node has {error_count} errors",
                        data={
                            'error_count': error_count,
                            'sample_errors': [e['error_message'][:100] for e in node_errors[:3]]
                        },
                        link=f"/execution/{self.execution_id}/errors?node={node_id}"
                    )
                ]

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=14,
                    title="Investigate High Error Rate on Node",
                    description=f"This node has {error_count} errors, indicating a systematic issue. Review error logs and node configuration.",
                    evidence=evidence,
                    impact=ImpactLevel.HIGH,
                    impact_details=f"{error_count} errors suggest underlying configuration or logic issue",
                    effort=EffortLevel.MEDIUM,
                    priority_score=0.0,
                    category=RecommendationCategory.RELIABILITY,
                    affected_node_ids=[node_id],
                    error_count=error_count
                ))

        return recommendations

    async def _apply_rule_15_error_clusters(self) -> List[Recommendation]:
        """
        Rule #15: Error Cluster Across Nodes → Systemic Issue

        Detects: Error clusters affecting multiple nodes
        Trigger: Error cluster with >3 errors across 2+ nodes
        Impact: CRITICAL - indicates system-wide problem
        """
        recommendations = []

        if not self.error_analysis or not self.error_analysis.get('clusters'):
            return recommendations

        # Find significant error clusters
        for cluster in self.error_analysis['clusters']:
            error_count = cluster.get('error_count', 0)
            affected_nodes = cluster.get('affected_nodes', [])

            # Trigger: >3 errors across 2+ nodes
            if error_count > 3 and len(affected_nodes) >= 2:
                pattern = cluster.get('pattern_type', 'unknown')

                evidence = [
                    Evidence(
                        type="error_cluster",
                        description=f"Error cluster with {error_count} errors across {len(affected_nodes)} nodes",
                        data={
                            'cluster_id': cluster.get('id'),
                            'error_count': error_count,
                            'affected_nodes': affected_nodes,
                            'pattern': pattern
                        },
                        link=f"/execution/{self.execution_id}/error-analysis?cluster={cluster.get('id')}"
                    )
                ]

                impact = ImpactLevel.CRITICAL if error_count > 10 else ImpactLevel.HIGH

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=15,
                    title=f"Systemic Issue: {pattern.replace('_', ' ').title()} Pattern",
                    description=f"Detected {error_count} similar errors across {len(affected_nodes)} nodes, indicating a system-wide issue.",
                    evidence=evidence,
                    impact=impact,
                    impact_details=f"Systemic {pattern} issue affecting multiple workflow components",
                    effort=EffortLevel.HIGH,
                    priority_score=0.0,
                    category=RecommendationCategory.RELIABILITY,
                    affected_node_ids=affected_nodes,
                    error_count=error_count
                ))

        return recommendations

    async def _apply_rule_16_any_errors(self) -> List[Recommendation]:
        """
        Rule #16: Any Execution Error → Investigate and Fix

        Detects: Any error in execution (catches single errors)
        Trigger: Execution has at least 1 error
        Impact: MEDIUM for single error, HIGH for multiple

        This is a catch-all rule to ensure executions with errors
        always generate at least one recommendation.
        """
        recommendations = []

        if not self.error_analysis or not self.error_analysis.get('errors'):
            return recommendations

        errors = self.error_analysis['errors']
        error_count = len(errors)

        if error_count == 0:
            return recommendations

        # Group errors by node
        errors_by_node = {}
        for error in errors:
            node_id = error.get('node_id', 'unknown')
            if node_id not in errors_by_node:
                errors_by_node[node_id] = []
            errors_by_node[node_id].append(error)

        # Create one recommendation per failed node
        for node_id, node_errors in errors_by_node.items():
            node_error_count = len(node_errors)
            sample_error = node_errors[0]
            error_message = sample_error.get('error_message', 'Unknown error')

            # Truncate long error messages
            if len(error_message) > 200:
                error_message = error_message[:200] + '...'

            evidence = [
                Evidence(
                    type="execution_error",
                    description=f"Node failed with error: {error_message[:100]}",
                    data={
                        'error_count': node_error_count,
                        'error_message': error_message,
                        'node_id': node_id
                    },
                    link=f"/execution/{self.execution_id}/analysis?tab=errors"
                )
            ]

            # Determine impact based on error count
            if node_error_count >= 5:
                impact = ImpactLevel.HIGH
            elif node_error_count >= 2:
                impact = ImpactLevel.MEDIUM
            else:
                impact = ImpactLevel.MEDIUM

            recommendations.append(Recommendation(
                id=str(uuid.uuid4()),
                rule_id=16,
                title=f"Execution Error: Node Failed",
                description=f"Node '{node_id}' encountered an error during execution. Review the error message and fix the underlying issue.",
                evidence=evidence,
                impact=impact,
                impact_details=f"Execution failed with {node_error_count} error(s) - workflow did not complete successfully",
                effort=EffortLevel.MEDIUM,
                priority_score=0.0,
                category=RecommendationCategory.RELIABILITY,
                affected_node_ids=[node_id],
                error_count=node_error_count
            ))

        return recommendations

    # =========================================================================
    # NEW PERFORMANCE RULES (17-22)
    # =========================================================================

    async def _apply_rule_17_critical_path_heavy_node(self) -> List[Recommendation]:
        """
        Rule #17: Critical Path Heavy Node → Optimize Bottleneck

        Trigger: Node on critical path taking >10% of total workflow time
        """
        recommendations = []

        if not self.critical_path or not self.bottlenecks or not self.execution_data:
            return recommendations

        execution = self.execution_data.get('execution')
        total_duration = execution.get('duration_ms', 0) if execution else 0

        if total_duration == 0:
            return recommendations

        for bottleneck in self.bottlenecks:
            if not bottleneck.get('on_critical_path'):
                continue

            duration_ms = bottleneck.get('duration_ms', 0)
            percentage = (duration_ms / total_duration) * 100

            if percentage > 10:
                evidence = [
                    Evidence(
                        type="critical_path",
                        description=f"Node accounts for {percentage:.1f}% of total execution time",
                        data={'percentage': percentage, 'duration_ms': duration_ms},
                        link=f"/execution/{self.execution_id}?tab=critical-path"
                    )
                ]

                impact = ImpactLevel.HIGH if percentage > 25 else ImpactLevel.MEDIUM

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=17,
                    title=f"Optimize Critical Path Node: {bottleneck['node_name']}",
                    description=f"This node accounts for {percentage:.1f}% of total workflow time. Focus optimization efforts here for maximum impact.",
                    evidence=evidence,
                    impact=impact,
                    impact_details=f"Reducing this node's time directly reduces workflow duration",
                    effort=EffortLevel.MEDIUM,
                    priority_score=0.0,
                    category=RecommendationCategory.PERFORMANCE,
                    affected_node_ids=[bottleneck['node_id']],
                    time_saved_ms=int(duration_ms * 0.3)
                ))

        return recommendations

    async def _apply_rule_18_high_latency_service(self) -> List[Recommendation]:
        """
        Rule #18: High Latency External Service → Add Caching

        Trigger: HTTP node with consistent >2s response time
        """
        recommendations = []

        if not self.bottlenecks:
            return recommendations

        http_types = ['httpRequest', 'http', 'webhook', 'api']

        for bottleneck in self.bottlenecks:
            node_type = bottleneck.get('node_type', '').lower()
            duration_ms = bottleneck.get('duration_ms', 0)

            if any(t in node_type for t in http_types) and duration_ms > 2000:
                evidence = [
                    Evidence(
                        type="bottleneck",
                        description=f"External service response time: {duration_ms/1000:.1f}s",
                        data={'duration_ms': duration_ms, 'avg_response_time': duration_ms},
                        link=f"/execution/{self.execution_id}?tab=bottlenecks"
                    )
                ]

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=18,
                    title=f"Add Caching for Slow Service: {bottleneck['node_name']}",
                    description=f"External service has {duration_ms/1000:.1f}s latency. Consider response caching or async processing.",
                    evidence=evidence,
                    impact=ImpactLevel.MEDIUM,
                    impact_details=f"Caching could eliminate {duration_ms/1000:.1f}s on repeated calls",
                    effort=EffortLevel.MEDIUM,
                    priority_score=0.0,
                    category=RecommendationCategory.PERFORMANCE,
                    affected_node_ids=[bottleneck['node_id']],
                    time_saved_ms=duration_ms
                ))

        return recommendations

    async def _apply_rule_19_slow_database(self) -> List[Recommendation]:
        """
        Rule #19: Database Query Slow → Optimize Query

        Trigger: Database node >1s execution
        """
        recommendations = []

        if not self.bottlenecks:
            return recommendations

        db_keywords = ['database', 'mysql', 'postgres', 'mongodb', 'redis', 'sql', 'query']

        for bottleneck in self.bottlenecks:
            node_name = bottleneck.get('node_name', '').lower()
            node_type = bottleneck.get('node_type', '').lower()
            duration_ms = bottleneck.get('duration_ms', 0)

            is_db_node = any(kw in node_name or kw in node_type for kw in db_keywords)

            if is_db_node and duration_ms > 1000:
                evidence = [
                    Evidence(
                        type="bottleneck",
                        description=f"Database query taking {duration_ms/1000:.1f}s",
                        data={'duration_ms': duration_ms},
                        link=f"/execution/{self.execution_id}?tab=bottlenecks"
                    )
                ]

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=19,
                    title=f"Optimize Database Query: {bottleneck['node_name']}",
                    description=f"Database query takes {duration_ms/1000:.1f}s. Consider adding indexes, optimizing query, or implementing pagination.",
                    evidence=evidence,
                    impact=ImpactLevel.HIGH if duration_ms > 5000 else ImpactLevel.MEDIUM,
                    impact_details=f"Query optimization could reduce time significantly",
                    effort=EffortLevel.MEDIUM,
                    priority_score=0.0,
                    category=RecommendationCategory.PERFORMANCE,
                    affected_node_ids=[bottleneck['node_id']],
                    time_saved_ms=int(duration_ms * 0.5)
                ))

        return recommendations

    async def _apply_rule_20_redundant_api_calls(self) -> List[Recommendation]:
        """
        Rule #20: Redundant API Calls → Batch Requests

        Trigger: Same HTTP endpoint called multiple times
        """
        recommendations = []

        if not self.execution_data:
            return recommendations

        events = self.execution_data.get('events', [])

        # Group HTTP events by node type
        http_events = [e for e in events if 'http' in e.get('node_type', '').lower()]

        # Count by node_id
        node_counts = {}
        for event in http_events:
            node_id = event.get('node_id')
            if node_id:
                node_counts[node_id] = node_counts.get(node_id, 0) + 1

        for node_id, count in node_counts.items():
            if count > 2:
                evidence = [
                    Evidence(
                        type="pattern",
                        description=f"API endpoint called {count} times in single execution",
                        data={'call_count': count, 'node_id': node_id},
                        link=f"/execution/{self.execution_id}?tab=bottlenecks"
                    )
                ]

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=20,
                    title="Batch Redundant API Calls",
                    description=f"Same API called {count} times. Consider batching requests or implementing caching.",
                    evidence=evidence,
                    impact=ImpactLevel.MEDIUM,
                    impact_details=f"Batching could reduce {count-1} redundant calls",
                    effort=EffortLevel.MEDIUM,
                    priority_score=0.0,
                    category=RecommendationCategory.PERFORMANCE,
                    affected_node_ids=[node_id]
                ))

        return recommendations

    async def _apply_rule_21_heavy_computation_loop(self) -> List[Recommendation]:
        """
        Rule #21: Heavy Computation in Loop → Vectorize

        Trigger: Code/Function node with high execution count
        """
        recommendations = []

        if not self.bottlenecks:
            return recommendations

        code_keywords = ['code', 'function', 'script', 'execute']

        for bottleneck in self.bottlenecks:
            node_name = bottleneck.get('node_name', '').lower()
            node_type = bottleneck.get('node_type', '').lower()
            exec_count = bottleneck.get('execution_count', 1)
            duration_ms = bottleneck.get('duration_ms', 0)

            is_code_node = any(kw in node_name or kw in node_type for kw in code_keywords)

            if is_code_node and exec_count > 10 and duration_ms > 500:
                total_time = duration_ms * exec_count

                evidence = [
                    Evidence(
                        type="pattern",
                        description=f"Code executed {exec_count} times, {total_time/1000:.1f}s total",
                        data={'execution_count': exec_count, 'total_time_ms': total_time},
                        link=f"/execution/{self.execution_id}?tab=bottlenecks"
                    )
                ]

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=21,
                    title=f"Optimize Loop Computation: {bottleneck['node_name']}",
                    description=f"Code runs {exec_count} times. Consider vectorizing operations or moving computation outside the loop.",
                    evidence=evidence,
                    impact=ImpactLevel.HIGH if total_time > 10000 else ImpactLevel.MEDIUM,
                    impact_details=f"Vectorization could reduce {total_time/1000:.1f}s execution time",
                    effort=EffortLevel.MEDIUM,
                    priority_score=0.0,
                    category=RecommendationCategory.PERFORMANCE,
                    affected_node_ids=[bottleneck['node_id']],
                    time_saved_ms=int(total_time * 0.5)
                ))

        return recommendations

    async def _apply_rule_22_inefficient_filtering(self) -> List[Recommendation]:
        """
        Rule #22: Inefficient Data Filtering → Server-Side Filter

        Trigger: Filter/IF node after large data fetch
        """
        recommendations = []

        if not self.bottlenecks:
            return recommendations

        filter_keywords = ['filter', 'if', 'switch', 'condition']
        data_keywords = ['http', 'database', 'query', 'fetch', 'get']

        # Find filter nodes that follow data nodes
        for i, bottleneck in enumerate(self.bottlenecks):
            node_name = bottleneck.get('node_name', '').lower()

            is_filter = any(kw in node_name for kw in filter_keywords)

            if is_filter and i > 0:
                prev_node = self.bottlenecks[i-1]
                prev_name = prev_node.get('node_name', '').lower()
                prev_type = prev_node.get('node_type', '').lower()

                is_data_fetch = any(kw in prev_name or kw in prev_type for kw in data_keywords)

                if is_data_fetch and prev_node.get('duration_ms', 0) > 2000:
                    evidence = [
                        Evidence(
                            type="pattern",
                            description=f"Filtering after {prev_node.get('duration_ms', 0)/1000:.1f}s data fetch",
                            data={'fetch_duration': prev_node.get('duration_ms')},
                            link=f"/execution/{self.execution_id}?tab=bottlenecks"
                        )
                    ]

                    recommendations.append(Recommendation(
                        id=str(uuid.uuid4()),
                        rule_id=22,
                        title="Use Server-Side Filtering",
                        description="Filtering data after full fetch. Move filter logic to the data source to reduce transfer time.",
                        evidence=evidence,
                        impact=ImpactLevel.MEDIUM,
                        impact_details="Server-side filtering reduces data transfer",
                        effort=EffortLevel.MEDIUM,
                        priority_score=0.0,
                        category=RecommendationCategory.PERFORMANCE,
                        affected_node_ids=[bottleneck['node_id'], prev_node['node_id']]
                    ))

        return recommendations

    # =========================================================================
    # NEW RELIABILITY RULES (23-26)
    # =========================================================================

    async def _apply_rule_23_no_retry_logic(self) -> List[Recommendation]:
        """
        Rule #23: No Retry Logic → Add Retry with Backoff

        Trigger: HTTP node that failed without retry
        """
        recommendations = []

        if not self.error_analysis or not self.bottlenecks:
            return recommendations

        errors = self.error_analysis.get('errors', [])
        failed_nodes = set(e.get('node_id') for e in errors)

        http_types = ['http', 'webhook', 'api']

        for bottleneck in self.bottlenecks:
            node_id = bottleneck.get('node_id')
            node_type = bottleneck.get('node_type', '').lower()

            is_http = any(t in node_type for t in http_types)

            if is_http and node_id in failed_nodes:
                evidence = [
                    Evidence(
                        type="reliability",
                        description="HTTP node failed without automatic retry",
                        data={'node_id': node_id},
                        link=f"/execution/{self.execution_id}?tab=errors"
                    )
                ]

                code_example = """
// Add retry configuration
{
  "retry": {
    "enabled": true,
    "maxRetries": 3,
    "backoff": "exponential"
  }
}
                """.strip()

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=23,
                    title=f"Add Retry Logic: {bottleneck['node_name']}",
                    description="External API call failed without retry. Add exponential backoff to handle transient failures.",
                    evidence=evidence,
                    impact=ImpactLevel.HIGH,
                    impact_details="Retry logic prevents workflow failures from transient issues",
                    effort=EffortLevel.LOW,
                    priority_score=0.0,
                    category=RecommendationCategory.RELIABILITY,
                    code_example=code_example,
                    affected_node_ids=[node_id]
                ))

        return recommendations

    async def _apply_rule_24_missing_timeout(self) -> List[Recommendation]:
        """
        Rule #24: Missing Timeout Config → Add Timeout

        Trigger: Long-running HTTP/DB node without explicit timeout
        """
        recommendations = []

        if not self.bottlenecks:
            return recommendations

        slow_threshold = 30000  # 30 seconds

        for bottleneck in self.bottlenecks:
            duration_ms = bottleneck.get('duration_ms', 0)
            node_type = bottleneck.get('node_type', '').lower()

            is_external = any(t in node_type for t in ['http', 'database', 'api'])

            if is_external and duration_ms > slow_threshold:
                evidence = [
                    Evidence(
                        type="reliability",
                        description=f"Node ran for {duration_ms/1000:.1f}s without timeout protection",
                        data={'duration_ms': duration_ms},
                        link=f"/execution/{self.execution_id}?tab=bottlenecks"
                    )
                ]

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=24,
                    title=f"Add Timeout: {bottleneck['node_name']}",
                    description=f"Operation ran for {duration_ms/1000:.1f}s. Add timeout to prevent workflow hangs.",
                    evidence=evidence,
                    impact=ImpactLevel.MEDIUM,
                    impact_details="Timeout prevents indefinite waits",
                    effort=EffortLevel.LOW,
                    priority_score=0.0,
                    category=RecommendationCategory.RELIABILITY,
                    affected_node_ids=[bottleneck['node_id']]
                ))

        return recommendations

    async def _apply_rule_25_single_point_failure(self) -> List[Recommendation]:
        """
        Rule #25: Single Point of Failure → Add Fallback

        Trigger: Critical path has single route without error handling
        """
        recommendations = []

        if not self.critical_path or not self.error_analysis:
            return recommendations

        errors = self.error_analysis.get('errors', [])

        if errors:
            critical_nodes = self.critical_path.get('path_nodes', [])
            failed_critical = [e for e in errors if e.get('node_id') in critical_nodes]

            if failed_critical:
                evidence = [
                    Evidence(
                        type="reliability",
                        description=f"Critical path node failed with no fallback: {len(failed_critical)} errors",
                        data={'error_count': len(failed_critical)},
                        link=f"/execution/{self.execution_id}?tab=critical-path"
                    )
                ]

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=25,
                    title="Add Fallback for Critical Path",
                    description="Critical path failed with no alternative route. Add error handling branches or fallback logic.",
                    evidence=evidence,
                    impact=ImpactLevel.HIGH,
                    impact_details="Fallback prevents complete workflow failure",
                    effort=EffortLevel.HIGH,
                    priority_score=0.0,
                    category=RecommendationCategory.RELIABILITY,
                    affected_node_ids=[e.get('node_id') for e in failed_critical]
                ))

        return recommendations

    async def _apply_rule_26_no_rate_limit_handling(self) -> List[Recommendation]:
        """
        Rule #26: No Rate Limit Handling → Handle 429 Responses

        Trigger: High-frequency API calls without rate limit handling
        """
        recommendations = []

        if not self.bottlenecks:
            return recommendations

        for bottleneck in self.bottlenecks:
            exec_count = bottleneck.get('execution_count', 1)
            node_type = bottleneck.get('node_type', '').lower()

            is_api = 'http' in node_type or 'api' in node_type

            if is_api and exec_count > 10:
                evidence = [
                    Evidence(
                        type="reliability",
                        description=f"API called {exec_count} times - risk of rate limiting",
                        data={'call_count': exec_count},
                        link=f"/execution/{self.execution_id}?tab=bottlenecks"
                    )
                ]

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=26,
                    title=f"Add Rate Limit Handling: {bottleneck['node_name']}",
                    description=f"API called {exec_count} times. Add rate limit handling to avoid 429 errors.",
                    evidence=evidence,
                    impact=ImpactLevel.MEDIUM,
                    impact_details="Prevents failures from API rate limiting",
                    effort=EffortLevel.MEDIUM,
                    priority_score=0.0,
                    category=RecommendationCategory.RELIABILITY,
                    affected_node_ids=[bottleneck['node_id']]
                ))

        return recommendations

    # =========================================================================
    # COST OPTIMIZATION RULES (31-35)
    # =========================================================================

    async def _apply_rule_31_expensive_api_loop(self) -> List[Recommendation]:
        """
        Rule #31: Expensive API in Loop → Batch to Reduce Costs

        Trigger: Paid API called in loop (high execution count)
        """
        recommendations = []

        if not self.bottlenecks:
            return recommendations

        # Common paid API indicators
        paid_apis = ['openai', 'gpt', 'claude', 'anthropic', 'langchain', 'agent',
                     'twilio', 'sendgrid', 'stripe', 'aws', 'google-cloud']

        for bottleneck in self.bottlenecks:
            node_name = bottleneck.get('node_name', '').lower()
            node_type = bottleneck.get('node_type', '').lower()
            exec_count = bottleneck.get('execution_count', 1)

            is_paid = any(api in node_name or api in node_type for api in paid_apis)

            if is_paid and exec_count > 5:
                evidence = [
                    Evidence(
                        type="cost",
                        description=f"Paid API called {exec_count} times in loop",
                        data={'call_count': exec_count},
                        link=f"/execution/{self.execution_id}?tab=bottlenecks"
                    )
                ]

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=31,
                    title=f"Batch Paid API Calls: {bottleneck['node_name']}",
                    description=f"Paid API called {exec_count} times. Consider batching to reduce API costs.",
                    evidence=evidence,
                    impact=ImpactLevel.MEDIUM,
                    impact_details=f"Batching could reduce costs by {(exec_count-1)/exec_count*100:.0f}%",
                    effort=EffortLevel.MEDIUM,
                    priority_score=0.0,
                    category=RecommendationCategory.COST,
                    affected_node_ids=[bottleneck['node_id']]
                ))

        return recommendations

    async def _apply_rule_32_redundant_storage(self) -> List[Recommendation]:
        """
        Rule #32: Redundant Storage Operations → Consolidate

        Trigger: Multiple writes to storage in single execution
        """
        recommendations = []

        if not self.execution_data:
            return recommendations

        events = self.execution_data.get('events', [])

        storage_keywords = ['write', 'save', 'store', 'put', 'upload', 's3', 'storage']

        storage_events = [e for e in events
                         if any(kw in e.get('node_name', '').lower() for kw in storage_keywords)]

        if len(storage_events) > 2:
            evidence = [
                Evidence(
                    type="cost",
                    description=f"Found {len(storage_events)} storage write operations",
                    data={'write_count': len(storage_events)},
                    link=f"/execution/{self.execution_id}?tab=overview"
                )
            ]

            recommendations.append(Recommendation(
                id=str(uuid.uuid4()),
                rule_id=32,
                title="Consolidate Storage Operations",
                description=f"Multiple storage writes ({len(storage_events)}) detected. Consider consolidating to reduce costs.",
                evidence=evidence,
                impact=ImpactLevel.LOW,
                impact_details="Fewer storage operations = lower costs",
                effort=EffortLevel.MEDIUM,
                priority_score=0.0,
                category=RecommendationCategory.COST,
                affected_node_ids=[e.get('node_id') for e in storage_events]
            ))

        return recommendations

    async def _apply_rule_33_unnecessary_full_scans(self) -> List[Recommendation]:
        """
        Rule #33: Unnecessary Full Scans → Add Filtering

        Trigger: Database query with high duration and "all" or "list" in name
        """
        recommendations = []

        if not self.bottlenecks:
            return recommendations

        scan_keywords = ['all', 'list', 'fetch', 'get all', 'find all', 'select *']

        for bottleneck in self.bottlenecks:
            node_name = bottleneck.get('node_name', '').lower()
            duration_ms = bottleneck.get('duration_ms', 0)

            is_scan = any(kw in node_name for kw in scan_keywords)

            if is_scan and duration_ms > 3000:
                evidence = [
                    Evidence(
                        type="cost",
                        description=f"Full scan taking {duration_ms/1000:.1f}s",
                        data={'duration_ms': duration_ms},
                        link=f"/execution/{self.execution_id}?tab=bottlenecks"
                    )
                ]

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=33,
                    title=f"Add Filtering: {bottleneck['node_name']}",
                    description="Full data scan detected. Add filtering or pagination to reduce data processed.",
                    evidence=evidence,
                    impact=ImpactLevel.MEDIUM,
                    impact_details="Filtering reduces compute and transfer costs",
                    effort=EffortLevel.LOW,
                    priority_score=0.0,
                    category=RecommendationCategory.COST,
                    affected_node_ids=[bottleneck['node_id']]
                ))

        return recommendations

    async def _apply_rule_34_heavy_compute_sync(self) -> List[Recommendation]:
        """
        Rule #34: Heavy Compute in Sync Flow → Use Async

        Trigger: Heavy computation blocking workflow (>10s)
        """
        recommendations = []

        if not self.bottlenecks:
            return recommendations

        compute_keywords = ['process', 'compute', 'calculate', 'transform', 'aggregate']

        for bottleneck in self.bottlenecks:
            node_name = bottleneck.get('node_name', '').lower()
            duration_ms = bottleneck.get('duration_ms', 0)

            is_compute = any(kw in node_name for kw in compute_keywords)

            if is_compute and duration_ms > 10000:
                evidence = [
                    Evidence(
                        type="cost",
                        description=f"Heavy computation: {duration_ms/1000:.1f}s blocking",
                        data={'duration_ms': duration_ms},
                        link=f"/execution/{self.execution_id}?tab=bottlenecks"
                    )
                ]

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=34,
                    title=f"Use Async Processing: {bottleneck['node_name']}",
                    description=f"Heavy computation ({duration_ms/1000:.1f}s). Consider async job queue for better resource utilization.",
                    evidence=evidence,
                    impact=ImpactLevel.MEDIUM,
                    impact_details="Async processing improves resource efficiency",
                    effort=EffortLevel.HIGH,
                    priority_score=0.0,
                    category=RecommendationCategory.COST,
                    affected_node_ids=[bottleneck['node_id']]
                ))

        return recommendations

    async def _apply_rule_35_storage_no_cleanup(self) -> List[Recommendation]:
        """
        Rule #35: Storage Without Cleanup → Add Cleanup

        Trigger: Storage write without corresponding delete/cleanup
        """
        recommendations = []

        if not self.execution_data:
            return recommendations

        events = self.execution_data.get('events', [])
        nodes = self.execution_data.get('nodes', [])

        write_keywords = ['write', 'save', 'store', 'put', 'upload', 'create']
        cleanup_keywords = ['delete', 'remove', 'clean', 'purge', 'expire']

        has_writes = any(any(kw in e.get('node_name', '').lower() for kw in write_keywords) for e in events)
        has_cleanup = any(any(kw in n.get('name', '').lower() for kw in cleanup_keywords) for n in nodes)

        if has_writes and not has_cleanup:
            evidence = [
                Evidence(
                    type="cost",
                    description="Storage writes detected without cleanup logic",
                    data={'has_cleanup': False},
                    link=f"/execution/{self.execution_id}?tab=overview"
                )
            ]

            recommendations.append(Recommendation(
                id=str(uuid.uuid4()),
                rule_id=35,
                title="Add Storage Cleanup Logic",
                description="Storage writes detected without cleanup. Add expiration or cleanup to prevent cost accumulation.",
                evidence=evidence,
                impact=ImpactLevel.LOW,
                impact_details="Cleanup prevents storage cost accumulation",
                effort=EffortLevel.LOW,
                priority_score=0.0,
                category=RecommendationCategory.COST
            ))

        return recommendations

    # =========================================================================
    # BOTTLENECK-BASED RULES (36-40)
    # =========================================================================

    async def _apply_rule_36_severe_bottleneck(self) -> List[Recommendation]:
        """
        Rule #36: Severe Bottleneck → Immediate Optimization

        Trigger: Bottleneck score >= 90
        """
        recommendations = []

        if not self.bottlenecks:
            return recommendations

        for bottleneck in self.bottlenecks:
            score = bottleneck.get('bottleneck_score', 0)

            if score >= 90:
                duration_ms = bottleneck.get('duration_ms', 0)

                evidence = [
                    Evidence(
                        type="bottleneck",
                        description=f"Severe bottleneck score: {score}/100",
                        data={
                            'score': score,
                            'duration_ms': duration_ms,
                            'severity': 'SEVERE'
                        },
                        link=f"/execution/{self.execution_id}?tab=bottlenecks"
                    )
                ]

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=36,
                    title=f"SEVERE: Optimize {bottleneck['node_name']}",
                    description=f"Critical bottleneck (score: {score}/100). This node requires immediate optimization attention.",
                    evidence=evidence,
                    impact=ImpactLevel.CRITICAL,
                    impact_details=f"Severe impact on workflow performance ({duration_ms/1000:.1f}s)",
                    effort=EffortLevel.MEDIUM,
                    priority_score=0.0,
                    category=RecommendationCategory.PERFORMANCE,
                    affected_node_ids=[bottleneck['node_id']],
                    time_saved_ms=int(duration_ms * 0.5)
                ))

        return recommendations

    async def _apply_rule_37_high_bottleneck(self) -> List[Recommendation]:
        """
        Rule #37: High Bottleneck → Optimization Recommended

        Trigger: Bottleneck score 70-89
        """
        recommendations = []

        if not self.bottlenecks:
            return recommendations

        for bottleneck in self.bottlenecks:
            score = bottleneck.get('bottleneck_score', 0)

            if 70 <= score < 90:
                duration_ms = bottleneck.get('duration_ms', 0)

                evidence = [
                    Evidence(
                        type="bottleneck",
                        description=f"High bottleneck score: {score}/100",
                        data={
                            'score': score,
                            'duration_ms': duration_ms,
                            'severity': 'HIGH'
                        },
                        link=f"/execution/{self.execution_id}?tab=bottlenecks"
                    )
                ]

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=37,
                    title=f"HIGH: Optimize {bottleneck['node_name']}",
                    description=f"High bottleneck score ({score}/100). Should be optimized soon for better performance.",
                    evidence=evidence,
                    impact=ImpactLevel.HIGH,
                    impact_details=f"High impact on workflow ({duration_ms/1000:.1f}s)",
                    effort=EffortLevel.MEDIUM,
                    priority_score=0.0,
                    category=RecommendationCategory.PERFORMANCE,
                    affected_node_ids=[bottleneck['node_id']],
                    time_saved_ms=int(duration_ms * 0.3)
                ))

        return recommendations

    async def _apply_rule_38_multiple_medium_bottlenecks(self) -> List[Recommendation]:
        """
        Rule #38: Multiple Medium Bottlenecks → Review Workflow

        Trigger: 3+ bottlenecks with score 50-69
        """
        recommendations = []

        if not self.bottlenecks:
            return recommendations

        medium_bottlenecks = [b for b in self.bottlenecks
                             if 50 <= b.get('bottleneck_score', 0) < 70]

        if len(medium_bottlenecks) >= 3:
            total_time = sum(b.get('duration_ms', 0) for b in medium_bottlenecks)

            evidence = [
                Evidence(
                    type="bottleneck",
                    description=f"{len(medium_bottlenecks)} medium bottlenecks detected",
                    data={
                        'count': len(medium_bottlenecks),
                        'total_time_ms': total_time,
                        'nodes': [b['node_name'] for b in medium_bottlenecks[:5]]
                    },
                    link=f"/execution/{self.execution_id}?tab=bottlenecks"
                )
            ]

            recommendations.append(Recommendation(
                id=str(uuid.uuid4()),
                rule_id=38,
                title="Review Workflow Architecture",
                description=f"Found {len(medium_bottlenecks)} medium bottlenecks. Consider reviewing overall workflow design.",
                evidence=evidence,
                impact=ImpactLevel.MEDIUM,
                impact_details=f"Combined impact: {total_time/1000:.1f}s",
                effort=EffortLevel.HIGH,
                priority_score=0.0,
                category=RecommendationCategory.PERFORMANCE,
                affected_node_ids=[b['node_id'] for b in medium_bottlenecks],
                time_saved_ms=int(total_time * 0.2)
            ))

        return recommendations

    async def _apply_rule_39_critical_path_bottleneck(self) -> List[Recommendation]:
        """
        Rule #39: Critical Path Bottleneck → Priority Optimization

        Trigger: Bottleneck on critical path with score > 50
        """
        recommendations = []

        if not self.bottlenecks or not self.critical_path:
            return recommendations

        for bottleneck in self.bottlenecks:
            score = bottleneck.get('bottleneck_score', 0)
            on_critical = bottleneck.get('on_critical_path', False)

            if on_critical and score > 50:
                duration_ms = bottleneck.get('duration_ms', 0)

                evidence = [
                    Evidence(
                        type="critical_path",
                        description=f"Critical path bottleneck (score: {score}/100)",
                        data={
                            'score': score,
                            'on_critical_path': True,
                            'duration_ms': duration_ms
                        },
                        link=f"/execution/{self.execution_id}?tab=critical-path"
                    )
                ]

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=39,
                    title=f"Priority: {bottleneck['node_name']} (Critical Path)",
                    description=f"Bottleneck on critical path. Optimizing this directly reduces workflow time.",
                    evidence=evidence,
                    impact=ImpactLevel.HIGH,
                    impact_details=f"Direct workflow time reduction: {duration_ms/1000:.1f}s potential",
                    effort=EffortLevel.MEDIUM,
                    priority_score=0.0,
                    category=RecommendationCategory.PERFORMANCE,
                    affected_node_ids=[bottleneck['node_id']],
                    time_saved_ms=int(duration_ms * 0.4)
                ))

        return recommendations

    async def _apply_rule_40_high_variance_node(self) -> List[Recommendation]:
        """
        Rule #40: High Variance Node → Stabilize Performance

        Trigger: Node with high variance factor
        """
        recommendations = []

        if not self.bottlenecks:
            return recommendations

        for bottleneck in self.bottlenecks:
            variance = bottleneck.get('variance_factor', 0)

            if variance > 0.7:  # High variance
                duration_ms = bottleneck.get('duration_ms', 0)

                evidence = [
                    Evidence(
                        type="bottleneck",
                        description=f"High performance variance: {variance:.2f}",
                        data={
                            'variance_factor': variance,
                            'duration_ms': duration_ms
                        },
                        link=f"/execution/{self.execution_id}?tab=bottlenecks"
                    )
                ]

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=40,
                    title=f"Stabilize: {bottleneck['node_name']}",
                    description=f"Node has unpredictable performance (variance: {variance:.2f}). Investigate causes and stabilize.",
                    evidence=evidence,
                    impact=ImpactLevel.MEDIUM,
                    impact_details="Consistent performance improves predictability",
                    effort=EffortLevel.MEDIUM,
                    priority_score=0.0,
                    category=RecommendationCategory.PERFORMANCE,
                    affected_node_ids=[bottleneck['node_id']]
                ))

        return recommendations

    async def _apply_rule_41_orphaned_bottleneck(self, existing_recommendations: List[Recommendation]) -> List[Recommendation]:
        """
        Rule #41: Orphaned High-Severity Bottleneck → Generic Review Recommendation

        This is a FALLBACK RULE that runs AFTER all other rules.
        It ensures that high-severity bottlenecks on the critical path always have
        at least one recommendation, preventing the "Optimization Recommended" verdict
        from appearing with 0 recommendations.

        Trigger: Bottleneck score >= 70 (high or severe) AND on critical path AND no existing recommendations
        """
        recommendations = []

        if not self.bottlenecks:
            return recommendations

        # Build set of node_ids that already have recommendations
        nodes_with_recommendations = set()
        for rec in existing_recommendations:
            for node_id in rec.affected_node_ids:
                nodes_with_recommendations.add(node_id)

        for bottleneck in self.bottlenecks:
            score = bottleneck.get('bottleneck_score', 0)
            on_critical_path = bottleneck.get('on_critical_path', False)
            node_id = bottleneck.get('node_id')
            node_name = bottleneck.get('node_name', 'Unknown')
            node_type = bottleneck.get('node_type', 'unknown')
            duration_ms = bottleneck.get('duration_ms', 0)

            # Only target high-severity (>= 70) bottlenecks on critical path with no recommendations
            if score >= 70 and on_critical_path and node_id not in nodes_with_recommendations:
                severity_label = "severe" if score >= 90 else "high"

                evidence = [
                    Evidence(
                        type="bottleneck",
                        description=f"High-impact bottleneck (score: {score}/100) on critical path",
                        data={
                            'score': score,
                            'duration_ms': duration_ms,
                            'on_critical_path': True,
                            'node_type': node_type
                        },
                        link=f"/execution/{self.execution_id}?tab=bottlenecks&node={node_name}"
                    )
                ]

                # Create actionable guidance based on node type
                guidance_items = [
                    "reducing the amount of data processed",
                    "optimizing the node's internal logic",
                    "adding caching for repeated operations",
                    "parallelizing independent operations"
                ]

                # Add node-type specific suggestions
                if 'http' in node_type.lower() or 'api' in node_type.lower():
                    guidance_items.insert(0, "batching multiple API calls")
                elif 'database' in node_type.lower() or 'query' in node_type.lower():
                    guidance_items.insert(0, "optimizing database queries")
                elif 'loop' in node_type.lower() or 'foreach' in node_type.lower():
                    guidance_items.insert(0, "reducing loop iterations")

                guidance_text = ", ".join(guidance_items[:3])

                recommendations.append(Recommendation(
                    id=str(uuid.uuid4()),
                    rule_id=41,
                    title=f"Review High-Impact Node: {node_name}",
                    description=f"This node is a significant bottleneck ({severity_label} severity, {duration_ms/1000:.1f}s) on your critical path but doesn't match specific optimization patterns. Review its configuration and consider: {guidance_text}.",
                    evidence=evidence,
                    impact=ImpactLevel.HIGH if score >= 80 else ImpactLevel.MEDIUM,
                    impact_details=f"Potential time savings: {duration_ms * 0.3 / 1000:.1f}s (30% improvement target)",
                    effort=EffortLevel.MEDIUM,
                    priority_score=0.0,
                    category=RecommendationCategory.PERFORMANCE,
                    affected_node_ids=[node_id],
                    time_saved_ms=int(duration_ms * 0.3)
                ))

        return recommendations

    # =========================================================================
    # PRIORITY CALCULATION & UTILITIES
    # =========================================================================

    def _calculate_priority_score(self, rec: Recommendation) -> float:
        """
        Calculate priority score: impact_score * effort_multiplier * 100

        Impact score (0-1):
        - Time-based: min(time_saved_ms / 10000, 1.0)  # 10s = max score
        - Error-based: min(error_count / 20, 1.0)  # 20 errors = max score
        - Critical impact: 1.0

        Effort multipliers (LOW=1.0, MEDIUM=0.7, HIGH=0.4) are discount
        factors: at equal impact, easier fixes rank higher (quick wins
        first), and the result stays within the 0-100 range the
        priority_score field and the frontend's "/100" displays promise.
        (This used to divide by the multiplier, which both inverted the
        effort ordering and produced scores up to 250.)
        """
        # Determine impact score
        if rec.impact == ImpactLevel.CRITICAL:
            impact_score = 1.0
        elif rec.time_saved_ms:
            impact_score = min(rec.time_saved_ms / 10000, 1.0)
        elif rec.error_count:
            impact_score = min(rec.error_count / 20, 1.0)
        else:
            # Fallback based on impact level
            impact_map = {
                ImpactLevel.HIGH: 0.8,
                ImpactLevel.MEDIUM: 0.5,
                ImpactLevel.LOW: 0.3
            }
            impact_score = impact_map.get(rec.impact, 0.5)

        # Get effort multiplier
        effort_multiplier = self.EFFORT_MULTIPLIERS[rec.effort]

        # Calculate priority
        priority = impact_score * effort_multiplier * 100

        return round(priority, 1)

    def _build_summary(self, recommendations: List[Recommendation]) -> Dict:
        """Build summary statistics for recommendations"""
        by_category = {}
        by_impact = {}

        for rec in recommendations:
            # Count by category
            cat = rec.category.value
            by_category[cat] = by_category.get(cat, 0) + 1

            # Count by impact
            impact = rec.impact.value
            by_impact[impact] = by_impact.get(impact, 0) + 1

        return {
            "total_recommendations": len(recommendations),
            "by_category": by_category,
            "by_impact": by_impact,
            "top_priority": recommendations[0].to_dict() if recommendations else None
        }
