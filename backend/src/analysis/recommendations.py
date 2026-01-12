"""
Recommendation Engine with 15 Detection Rules

This module analyzes workflow executions to generate evidence-backed optimization
recommendations based on critical path, bottleneck, and error cluster data.

The 15 Detection Rules:

Performance Rules (1-7):
1. Sequential API Calls → Parallelize
2. Long Node Duration → Optimize Algorithm
3. High Loop Iteration → Batch Processing
4. Duplicate HTTP Requests → Add Caching
5. Synchronous Waits → Use Webhooks
6. Large Data Transfers → Compress/Stream
7. Hardcoded Delays → Remove/Justify

Reliability Rules (8-15):
8. Repeated Timeouts → Increase Timeout
9. Auth Failures → Fix Credentials
10. Rate Limits → Add Backoff/Queuing
11. Network Errors → Add Retry Logic
12. Validation Errors → Add Input Checks
13. Resource Errors → Scale Infrastructure
14. High Error Rate on Node → Investigate Root Cause
15. Error Cluster Across Nodes → Systemic Issue

Priority Score Formula: (impact_score / effort_multiplier) * 100
- Impact score: 0-1 (based on time_saved or error_count)
- Effort multipliers: LOW=1.0, MEDIUM=0.7, HIGH=0.4
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

        # Phase 2: Apply all 15 rules
        recommendations = []

        # Performance rules (1-7)
        recommendations.extend(await self._apply_rule_1_sequential_api_calls())
        recommendations.extend(await self._apply_rule_2_long_duration())
        recommendations.extend(await self._apply_rule_3_high_loop_iterations())
        recommendations.extend(await self._apply_rule_4_duplicate_requests())
        recommendations.extend(await self._apply_rule_5_polling())
        recommendations.extend(await self._apply_rule_6_large_transfers())
        recommendations.extend(await self._apply_rule_7_hardcoded_delays())

        # Reliability rules (8-15)
        recommendations.extend(await self._apply_rule_8_timeouts())
        recommendations.extend(await self._apply_rule_9_auth_failures())
        recommendations.extend(await self._apply_rule_10_rate_limits())
        recommendations.extend(await self._apply_rule_11_network_errors())
        recommendations.extend(await self._apply_rule_12_validation_errors())
        recommendations.extend(await self._apply_rule_13_resource_errors())
        recommendations.extend(await self._apply_rule_14_high_error_rate())
        recommendations.extend(await self._apply_rule_15_error_clusters())

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
        """Load error clustering results"""
        try:
            # Load error clusters
            clusters_response = self.db.table('error_clusters') \
                .select('*') \
                .eq('execution_id', execution_id) \
                .execute()

            # Load individual error embeddings
            embeddings_response = self.db.table('error_embeddings') \
                .select('*') \
                .eq('execution_id', execution_id) \
                .execute()

            return {
                'clusters': clusters_response.data if clusters_response.data else [],
                'errors': embeddings_response.data if embeddings_response.data else []
            }
        except Exception as e:
            print(f"Error loading error analysis: {e}")
            return {'clusters': [], 'errors': []}

    async def _load_execution_data(self, execution_id: str, workflow_id: str) -> Dict:
        """Load execution events and workflow structure"""
        try:
            # Load execution events
            events_response = self.db.table('execution_events') \
                .select('*') \
                .eq('execution_id', execution_id) \
                .order('timestamp') \
                .execute()

            # Load workflow nodes
            nodes_response = self.db.table('workflow_nodes') \
                .select('*') \
                .eq('workflow_id', workflow_id) \
                .execute()

            # Load execution metadata
            execution_response = self.db.table('executions') \
                .select('*') \
                .eq('id', execution_id) \
                .execute()

            return {
                'events': events_response.data if events_response.data else [],
                'nodes': nodes_response.data if nodes_response.data else [],
                'execution': execution_response.data[0] if execution_response.data else None
            }
        except Exception as e:
            print(f"Error loading execution data: {e}")
            return {'events': [], 'nodes': [], 'execution': None}

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

    # =========================================================================
    # PRIORITY CALCULATION & UTILITIES
    # =========================================================================

    def _calculate_priority_score(self, rec: Recommendation) -> float:
        """
        Calculate priority score: (impact_score / effort_multiplier) * 100

        Impact score (0-1):
        - Time-based: min(time_saved_ms / 10000, 1.0)  # 10s = max score
        - Error-based: min(error_count / 20, 1.0)  # 20 errors = max score
        - Critical impact: 1.0
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
        priority = (impact_score / effort_multiplier) * 100

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
