"""
Execution Comparison Algorithm

Compares bottleneck analysis between two executions to show:
1. Severity distribution changes (SEVERE/HIGH/MEDIUM/LOW)
2. Resolved bottlenecks (nodes that actually got faster)
3. Persisting bottlenecks (nodes still slow)
4. New bottlenecks (regressions)

Key insight: Severity matters more than count. An optimized workflow with
8 LOW bottlenecks (all <100ms) is better than an unoptimized workflow with
2 SEVERE bottlenecks.
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime
from src.analysis.bottlenecks import BottleneckAnalyzer


@dataclass
class ExecutionSnapshot:
    """Snapshot of an execution's analysis data"""
    execution_id: str
    n8n_execution_id: str  # User-facing ID from n8n
    timestamp: str
    duration_ms: int
    status: str
    node_count: int
    bottlenecks_by_severity: Dict[str, int]
    total_bottlenecks: int
    recommendation_count: int
    critical_path: Dict[str, Any]
    nodes: Dict[str, Dict[str, Any]]  # node_id -> {duration, score, severity}


def get_severity_with_absolute_threshold(score: int, duration_ms: int) -> str:
    """
    Combine relative score with absolute duration thresholds.

    Fast nodes should never be classified as severe/high bottlenecks,
    regardless of their relative score within the execution.

    Absolute thresholds take precedence for very fast nodes:
    - < 50ms: NONE (too fast to matter)
    - < 100ms: LOW (fast in absolute terms)
    - >= 100ms: Use score-based classification

    Score-based classification:
    - 90-100: SEVERE
    - 70-89: HIGH
    - 50-69: MEDIUM
    - < 50: LOW
    """
    if duration_ms < 50:
        return "NONE"

    if duration_ms < 100:
        return "LOW"

    # Use score for slower nodes
    if score >= 90:
        return "SEVERE"
    elif score >= 70:
        return "HIGH"
    elif score >= 50:
        return "MEDIUM"
    else:
        return "LOW"


class ComparisonAnalyzer:
    """Compares two workflow executions to identify optimization impact"""

    def __init__(self, supabase_client):
        self.db = supabase_client

    def compare(self, execution_id_a: str, execution_id_b: str) -> Dict[str, Any]:
        """
        Compare two executions and return detailed diff.

        Args:
            execution_id_a: "Before" execution UUID
            execution_id_b: "After" execution UUID

        Returns:
            Comparison result with severity distributions, resolved items,
            persisting issues, new bottlenecks, and verdict.
        """
        # Load analysis data for both executions
        exec_a = self._load_execution_analysis(execution_id_a)
        exec_b = self._load_execution_analysis(execution_id_b)

        if not exec_a:
            raise ValueError(f"Execution {execution_id_a} not found or not analyzed")
        if not exec_b:
            raise ValueError(f"Execution {execution_id_b} not found or not analyzed")

        # Categorize bottlenecks by severity
        before_by_severity = self._categorize_by_severity(exec_a.nodes)
        after_by_severity = self._categorize_by_severity(exec_b.nodes)

        # Track resolved, improved, persisting, worsened, and new bottlenecks
        resolved = []
        improved = []
        persisting = []
        worsened = []
        new_bottlenecks = []

        # Find significant bottlenecks in "before" (score >= 50 or duration >= 500ms)
        before_bottleneck_nodes = {
            node_id for node_id, data in exec_a.nodes.items()
            if data['score'] >= 50 or data['duration_ms'] >= 500
        }

        # Check each before bottleneck
        for node_id in before_bottleneck_nodes:
            before_node = exec_a.nodes[node_id]
            after_node = exec_b.nodes.get(node_id)

            if after_node is None:
                # Node removed entirely
                resolved.append({
                    "node_id": node_id,
                    "node_name": before_node['name'],
                    "reason": "Node removed from workflow",
                    "before_duration": before_node['duration_ms'],
                    "after_duration": 0,
                    "before_score": before_node['score'],
                    "after_score": 0,
                    "improvement_pct": 100.0,
                    "impact": "Node removed"
                })
                continue

            before_dur = before_node['duration_ms']
            after_dur = after_node['duration_ms']

            # Calculate improvement percentage
            improvement_pct = ((before_dur - after_dur) / before_dur * 100) if before_dur > 0 else 0

            # Classification thresholds:
            # - RESOLVED: ≥50% improvement OR now <100ms absolute
            # - IMPROVED: 25-49% improvement
            # - PERSISTING: <25% improvement (but not worsened)
            # - WORSENED: >10% slower

            now_fast = after_dur < 100
            is_resolved = improvement_pct >= 50 or now_fast
            is_improved = 25 <= improvement_pct < 50
            is_worsened = improvement_pct < -10

            if is_resolved:
                resolved.append({
                    "node_id": node_id,
                    "node_name": before_node['name'],
                    "before_duration": before_dur,
                    "after_duration": after_dur,
                    "before_score": before_node['score'],
                    "after_score": after_node['score'],
                    "improvement_pct": round(improvement_pct, 2),
                    "impact": self._get_improvement_impact(before_node, after_node)
                })
            elif is_improved:
                improved.append({
                    "node_id": node_id,
                    "node_name": before_node['name'],
                    "before_duration": before_dur,
                    "after_duration": after_dur,
                    "before_score": before_node['score'],
                    "after_score": after_node['score'],
                    "improvement_pct": round(improvement_pct, 2),
                    "reason": f"Good progress ({improvement_pct:.1f}% faster)"
                })
            elif is_worsened:
                worsened.append({
                    "node_id": node_id,
                    "node_name": before_node['name'],
                    "before_duration": before_dur,
                    "after_duration": after_dur,
                    "before_score": before_node['score'],
                    "after_score": after_node['score'],
                    "change_pct": round(-improvement_pct, 2),
                    "note": "Performance degraded"
                })
            else:
                # Persisting: <25% improvement
                persisting.append({
                    "node_id": node_id,
                    "node_name": before_node['name'],
                    "before_duration": before_dur,
                    "after_duration": after_dur,
                    "before_score": before_node['score'],
                    "after_score": after_node['score'],
                    "improvement_pct": round(improvement_pct, 2),
                    "note": self._get_persisting_note(before_node, after_node)
                })

        # Check for new bottlenecks (regressions)
        after_bottleneck_nodes = {
            node_id for node_id, data in exec_b.nodes.items()
            if data['score'] >= 50 or data['duration_ms'] >= 500
        }

        for node_id in after_bottleneck_nodes:
            if node_id not in before_bottleneck_nodes:
                after_node = exec_b.nodes[node_id]
                before_node = exec_a.nodes.get(node_id)

                new_bottlenecks.append({
                    "node_id": node_id,
                    "node_name": after_node['name'],
                    "duration": after_node['duration_ms'],
                    "score": after_node['score'],
                    "severity": get_severity_with_absolute_threshold(
                        after_node['score'], after_node['duration_ms']
                    ),
                    "before_duration": before_node['duration_ms'] if before_node else None,
                    "is_new_node": before_node is None
                })

        # Calculate delta
        duration_saved = exec_a.duration_ms - exec_b.duration_ms
        pct_improvement = (duration_saved / exec_a.duration_ms * 100) if exec_a.duration_ms > 0 else 0

        # Generate verdict (now considers improved count and overall improvement)
        verdict = self._generate_verdict(
            before_by_severity, after_by_severity,
            resolved_count=len(resolved),
            improved_count=len(improved),
            persisting_count=len(persisting),
            worsened_count=len(worsened),
            new_count=len(new_bottlenecks),
            overall_pct_improvement=pct_improvement
        )

        # Build top improvements (combine resolved + improved, sorted by improvement percentage)
        all_improvements = resolved + improved
        top_improvements = sorted(
            all_improvements,
            key=lambda x: x.get('improvement_pct', 0),
            reverse=True
        )[:5]

        return {
            "workflow_name": exec_a.nodes.get('_metadata', {}).get('workflow_name', 'Unknown'),
            "before": {
                "execution_id": exec_a.execution_id,
                "n8n_execution_id": exec_a.n8n_execution_id,
                "timestamp": exec_a.timestamp,
                "duration": exec_a.duration_ms,
                "status": exec_a.status,
                "node_count": exec_a.node_count,
                "bottlenecks": {
                    "severe": before_by_severity["SEVERE"],
                    "high": before_by_severity["HIGH"],
                    "medium": before_by_severity["MEDIUM"],
                    "low": before_by_severity["LOW"],
                    "total": exec_a.total_bottlenecks
                },
                "recommendations": exec_a.recommendation_count,
                "critical_path": exec_a.critical_path
            },
            "after": {
                "execution_id": exec_b.execution_id,
                "n8n_execution_id": exec_b.n8n_execution_id,
                "timestamp": exec_b.timestamp,
                "duration": exec_b.duration_ms,
                "status": exec_b.status,
                "node_count": exec_b.node_count,
                "bottlenecks": {
                    "severe": after_by_severity["SEVERE"],
                    "high": after_by_severity["HIGH"],
                    "medium": after_by_severity["MEDIUM"],
                    "low": after_by_severity["LOW"],
                    "total": exec_b.total_bottlenecks
                },
                "recommendations": exec_b.recommendation_count,
                "critical_path": exec_b.critical_path
            },
            "delta": {
                "duration_saved": duration_saved,
                "pct_improvement": round(pct_improvement, 1),
                "bottlenecks_resolved": len(resolved),
                "bottlenecks_improved": len(improved),
                "bottlenecks_persisting": len(persisting),
                "bottlenecks_worsened": len(worsened),
                "bottlenecks_new": len(new_bottlenecks),
                "verdict": verdict["status"],
                "verdict_message": verdict["message"]
            },
            "resolved": {
                "count": len(resolved),
                "items": resolved
            },
            "improved": {
                "count": len(improved),
                "items": improved
            },
            "persisting": {
                "count": len(persisting),
                "items": persisting
            },
            "worsened": {
                "count": len(worsened),
                "items": worsened
            },
            "new": {
                "count": len(new_bottlenecks),
                "items": new_bottlenecks
            },
            "top_improvements": top_improvements
        }

    def _load_execution_analysis(self, execution_id: str) -> Optional[ExecutionSnapshot]:
        """Load execution metadata and bottleneck analysis from database."""
        try:
            # Load execution metadata (include workflow_id for fallback analysis)
            exec_response = self.db.table('executions').select(
                'id, workflow_id, n8n_execution_id, started_at, finished_at, duration_ms, status'
            ).eq('id', execution_id).execute()

            if not exec_response.data:
                return None

            exec_data = exec_response.data[0]
            workflow_id = exec_data.get('workflow_id')

            # Try to load cached node stats first
            stats_response = self.db.table('node_stats').select(
                'node_id, node_name, node_type, bottleneck_score, total_duration_ms, is_on_critical_path'
            ).eq('execution_id', execution_id).execute()

            nodes = {}
            total_bottlenecks = 0
            severity_counts = {"SEVERE": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "NONE": 0}

            if stats_response.data:
                # Use cached data
                for stat in stats_response.data:
                    score = stat['bottleneck_score'] or 0
                    duration = stat['total_duration_ms'] or 0
                    severity = get_severity_with_absolute_threshold(score, duration)

                    nodes[stat['node_id']] = {
                        'name': stat['node_name'],
                        'type': stat['node_type'],
                        'score': score,
                        'duration_ms': duration,
                        'severity': severity,
                        'on_critical_path': stat['is_on_critical_path']
                    }

                    if score >= 30:
                        total_bottlenecks += 1
                        if severity in severity_counts:
                            severity_counts[severity] += 1
            elif workflow_id:
                # Fallback: Run bottleneck analysis on the fly
                try:
                    analyzer = BottleneckAnalyzer(self.db)
                    bottlenecks = analyzer.analyze(execution_id, workflow_id, limit=1000)

                    for b in bottlenecks:
                        severity = get_severity_with_absolute_threshold(b.score, b.duration_ms)
                        nodes[b.node_id] = {
                            'name': b.node_name,
                            'type': b.node_type,
                            'score': b.score,
                            'duration_ms': b.duration_ms,
                            'severity': severity,
                            'on_critical_path': b.on_critical_path
                        }

                        if b.score >= 30:
                            total_bottlenecks += 1
                            if severity in severity_counts:
                                severity_counts[severity] += 1
                except Exception as e:
                    print(f"Warning: Could not run bottleneck analysis for {execution_id}: {e}")

            # Load critical path data
            cp_response = self.db.table('critical_paths').select(
                'path_nodes, total_duration_ms'
            ).eq('execution_id', execution_id).execute()

            critical_path = {
                "duration": 0,
                "nodes": 0,
                "coverage": 0
            }

            if cp_response.data:
                cp_data = cp_response.data[0]
                path_nodes = cp_data.get('path_nodes', [])
                critical_path = {
                    "duration": cp_data['total_duration_ms'],
                    "nodes": len(path_nodes),
                    "coverage": round(len(path_nodes) / len(nodes) * 100, 1) if nodes else 0
                }

            # Count recommendations (if cached)
            rec_count = 0
            try:
                rec_response = self.db.table('recommendations').select(
                    'id'
                ).eq('execution_id', execution_id).execute()
                rec_count = len(rec_response.data) if rec_response.data else 0
            except Exception:
                pass  # Recommendations table may not exist

            timestamp = exec_data.get('started_at', '')
            if timestamp:
                try:
                    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                    timestamp = dt.strftime("%b %d, %I:%M %p")
                except Exception:
                    pass

            return ExecutionSnapshot(
                execution_id=execution_id,
                n8n_execution_id=exec_data.get('n8n_execution_id', ''),
                timestamp=timestamp,
                duration_ms=exec_data.get('duration_ms', 0),
                status=exec_data.get('status', 'unknown'),
                node_count=len(nodes),
                bottlenecks_by_severity=severity_counts,
                total_bottlenecks=total_bottlenecks,
                recommendation_count=rec_count,
                critical_path=critical_path,
                nodes=nodes
            )

        except Exception as e:
            print(f"Error loading execution analysis: {e}")
            return None

    def _categorize_by_severity(self, nodes: Dict[str, Dict]) -> Dict[str, int]:
        """Count bottlenecks by severity level."""
        counts = {"SEVERE": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "NONE": 0}

        for node_id, data in nodes.items():
            if node_id.startswith('_'):
                continue  # Skip metadata keys
            severity = get_severity_with_absolute_threshold(
                data['score'], data['duration_ms']
            )
            if severity in counts:
                counts[severity] += 1

        return counts

    def _get_improvement_impact(self, before: Dict, after: Dict) -> str:
        """Generate impact description for a resolved bottleneck."""
        improvement_pct = 0
        if before['duration_ms'] > 0:
            improvement_pct = (before['duration_ms'] - after['duration_ms']) / before['duration_ms'] * 100

        if improvement_pct >= 95:
            return "Removed from critical path"
        elif improvement_pct >= 75:
            return "Major speedup"
        elif improvement_pct >= 50:
            return "Significant improvement"
        elif improvement_pct >= 25:
            return "Moderate improvement"
        else:
            return "Minor improvement"

    def _get_persisting_note(self, before: Dict, after: Dict) -> str:
        """Generate note for persisting bottleneck."""
        change = after['duration_ms'] - before['duration_ms']
        pct_change = (change / before['duration_ms'] * 100) if before['duration_ms'] > 0 else 0

        if pct_change > 10:
            return "Duration increased - may need investigation"
        elif pct_change < -10:
            return "Duration improved but still significant"
        else:
            return "Duration did not improve significantly"

    def _generate_verdict(
        self,
        before: Dict[str, int],
        after: Dict[str, int],
        resolved_count: int,
        improved_count: int,
        persisting_count: int,
        worsened_count: int,
        new_count: int,
        overall_pct_improvement: float
    ) -> Dict[str, str]:
        """
        Generate optimization verdict based on comparison.

        Verdict priority (highest to lowest):
        1. regression - Performance worsened overall OR <5% gain with worsened nodes
        2. mixed_results - 5-14% overall improvement but some nodes worsened
        3. good_improvement_with_concerns - ≥15% overall but some worsened nodes
        4. excellent - All critical resolved
        5. good_progress - Mix of resolved + improved
        6. good_improvement - Significant overall improvement with improved nodes
        7. some_improvement - Performance improved but bottlenecks persist
        8. moderate_improvement - Modest gains (10-25%)
        9. minimal_change - <10% overall improvement
        """

        # Check for mixed results / regression (worsened nodes or new bottlenecks)
        has_concerns = worsened_count > 0 or (new_count > resolved_count and new_count > 0)

        if has_concerns:
            # True regression: new severe bottlenecks appeared
            if after["SEVERE"] > before["SEVERE"]:
                return {
                    "status": "regression",
                    "message": f"Regression: {after['SEVERE'] - before['SEVERE']} new severe bottleneck(s)"
                }

            # Overall got faster despite some nodes getting slower
            if overall_pct_improvement >= 15:
                concern_detail = f"{worsened_count} node(s) got slower" if worsened_count > 0 else f"{new_count} new bottleneck(s)"
                return {
                    "status": "good_improvement_with_concerns",
                    "message": f"{overall_pct_improvement:.1f}% faster overall, but {concern_detail} - investigate trade-offs"
                }

            if overall_pct_improvement >= 5:
                concern_detail = f"{worsened_count} node(s) got slower" if worsened_count > 0 else f"{new_count} new bottleneck(s)"
                return {
                    "status": "mixed_results",
                    "message": f"{overall_pct_improvement:.1f}% faster overall, but {concern_detail} - review changes"
                }

            # True regression: minimal/no overall improvement with worsened nodes
            if worsened_count > 0:
                return {
                    "status": "regression",
                    "message": f"Regression: {worsened_count} bottleneck(s) got slower ({overall_pct_improvement:.1f}% overall change)"
                }
            return {
                "status": "regression",
                "message": f"Regression: {new_count} new bottleneck(s) introduced"
            }

        # All critical resolved
        if before["SEVERE"] > 0 and after["SEVERE"] == 0:
            if before["HIGH"] > 0 and after["HIGH"] == 0:
                return {
                    "status": "excellent",
                    "message": "All critical bottlenecks resolved. Workflow is production-ready."
                }
            return {
                "status": "excellent",
                "message": f"All severe bottlenecks resolved ({overall_pct_improvement:.1f}% faster overall)"
            }

        # Check if critical issues remain
        if after["SEVERE"] > 0:
            if after["SEVERE"] < before["SEVERE"]:
                return {
                    "status": "good_progress",
                    "message": f"Good progress: {before['SEVERE'] - after['SEVERE']} severe bottleneck(s) resolved, {after['SEVERE']} remain"
                }
            return {
                "status": "needs_work",
                "message": f"{after['SEVERE']} severe bottleneck(s) still require attention"
            }

        if after["HIGH"] > 0:
            if after["HIGH"] < before["HIGH"]:
                return {
                    "status": "good_progress",
                    "message": f"Good progress: {before['HIGH'] - after['HIGH']} high-priority bottleneck(s) resolved"
                }
            return {
                "status": "good_progress",
                "message": f"Severe issues resolved, {after['HIGH']} high-priority bottleneck(s) remain"
            }

        # No severe/high remaining - check improvement levels
        total_fixed = resolved_count + improved_count

        # Excellent: All bottlenecks resolved
        if persisting_count == 0 and resolved_count > 0:
            return {
                "status": "excellent",
                "message": f"Excellent optimization: {resolved_count} bottleneck(s) resolved ({overall_pct_improvement:.1f}% faster)"
            }

        # Good progress: Mix of resolved and improved
        if resolved_count > 0 and improved_count > 0:
            return {
                "status": "good_progress",
                "message": f"Good progress: {resolved_count} resolved, {improved_count} improved ({overall_pct_improvement:.1f}% faster)"
            }

        # Good improvement: Significant overall improvement with improved nodes
        if improved_count >= 1 and overall_pct_improvement >= 25:
            return {
                "status": "good_improvement",
                "message": f"Good improvement: {overall_pct_improvement:.1f}% faster overall, {improved_count} bottleneck(s) improved"
            }

        # Some improvement: Performance improved but bottlenecks persist
        if improved_count >= 1 and overall_pct_improvement >= 10:
            return {
                "status": "some_improvement",
                "message": f"Some improvement: {overall_pct_improvement:.1f}% faster, {improved_count} bottleneck(s) partially improved"
            }

        # Moderate improvement: 10-25% overall with some resolved
        if overall_pct_improvement >= 10:
            if resolved_count > 0:
                return {
                    "status": "moderate_improvement",
                    "message": f"Moderate improvement: {resolved_count} bottleneck(s) resolved ({overall_pct_improvement:.1f}% faster)"
                }
            return {
                "status": "moderate_improvement",
                "message": f"Moderate improvement: {overall_pct_improvement:.1f}% faster overall"
            }

        # Minimal change: <10% improvement
        if overall_pct_improvement > 0:
            return {
                "status": "minimal_change",
                "message": f"Minimal change: {overall_pct_improvement:.1f}% faster (below significance threshold)"
            }

        return {
            "status": "minimal_change",
            "message": "No significant performance change detected"
        }
