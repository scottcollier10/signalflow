"""
Unit tests for Recommendation Engine

Tests the detection rules with mock data to verify the recommendation
logic works correctly before testing with real workflow data.

Uses real assertions and a nonzero exit code on failure (this file used to
print ✅/❌ and always exit 0, so failures were invisible to CI/scripts).

Run: venv/bin/python test_recommendations.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from src.analysis.recommendations import (
    RecommendationEngine,
    Recommendation,
    Evidence,
    ImpactLevel,
    EffortLevel,
    RecommendationCategory
)
from unittest.mock import Mock, AsyncMock
import asyncio


class MockSupabaseClient:
    """Mock Supabase client for testing"""

    def __init__(self, mock_data):
        self.mock_data = mock_data

    def table(self, table_name):
        return MockTable(self.mock_data.get(table_name, []))


class MockTable:
    """Mock table for query building"""

    def __init__(self, data):
        self._data = data
        self._filters = {}
        self._order_by = None
        self._order_desc = False

    def select(self, *args):
        return self

    def eq(self, column, value):
        self._filters[column] = value
        return self

    def order(self, column, desc=False):
        self._order_by = column
        self._order_desc = desc
        return self

    def execute(self):
        # Apply filters
        result_data = self._data
        for col, val in self._filters.items():
            result_data = [r for r in result_data if r.get(col) == val]

        # Apply ordering
        if self._order_by:
            result_data = sorted(result_data,
                               key=lambda x: x.get(self._order_by, 0),
                               reverse=self._order_desc)

        return Mock(data=result_data)


def create_mock_data():
    """Create comprehensive mock data for testing all rules"""

    execution_id = "test-execution-123"
    workflow_id = "test-workflow-456"

    # Critical path data
    critical_paths = [{
        'execution_id': execution_id,
        'path_nodes': ['node1', 'node2', 'node3', 'node4', 'node5'],
        'total_duration_ms': 50000,
        'path_percentage': 70
    }]

    # Bottleneck data - covering multiple rules.
    # Mirrors the real node_stats cache written by BottleneckAnalyzer:
    # column names are total_duration_ms / is_on_critical_path (renamed by
    # _load_bottlenecks) and node_type has 'n8n-nodes-base.' stripped.
    node_stats = [
        # Rule 1: Sequential API calls
        {
            'execution_id': execution_id,
            'node_id': 'node1',
            'node_name': 'API Call 1',
            'node_type': 'httpRequest',
            'total_duration_ms': 3000,
            'bottleneck_score': 75,
            'is_on_critical_path': True,
            'execution_count': 1
        },
        {
            'execution_id': execution_id,
            'node_id': 'node2',
            'node_name': 'API Call 2',
            'node_type': 'httpRequest',
            'total_duration_ms': 2500,
            'bottleneck_score': 70,
            'is_on_critical_path': True,
            'execution_count': 1
        },
        {
            'execution_id': execution_id,
            'node_id': 'node3',
            'node_name': 'API Call 3',
            'node_type': 'httpRequest',
            'total_duration_ms': 2000,
            'bottleneck_score': 65,
            'is_on_critical_path': True,
            'execution_count': 1
        },
        # Rule 2: Long duration node
        {
            'execution_id': execution_id,
            'node_id': 'node4',
            'node_name': 'Claude AI Generate',
            'node_type': '@n8n/n8n-nodes-langchain.agent',
            'total_duration_ms': 35000,
            'bottleneck_score': 90,
            'is_on_critical_path': True,
            'execution_count': 1
        },
        # Rule 3: High loop iterations
        {
            'execution_id': execution_id,
            'node_id': 'node5',
            'node_name': 'Loop: Process Items',
            'node_type': 'function',
            'total_duration_ms': 100,
            'bottleneck_score': 60,
            'is_on_critical_path': True,
            'execution_count': 75
        },
        # Rule 7: Hardcoded delay
        {
            'execution_id': execution_id,
            'node_id': 'node6',
            'node_name': 'Rate Limit Delay',
            'node_type': 'wait',
            'total_duration_ms': 5000,
            'bottleneck_score': 55,
            'is_on_critical_path': True,
            'execution_count': 1
        },
    ]

    # Error data - covering reliability rules
    error_embeddings = [
        # Rule 8: Timeout errors
        {
            'id': 'err1',
            'execution_id': execution_id,
            'node_id': 'node7',
            'error_message': 'Request timeout after 30s',
            'cluster_id': 'cluster1'
        },
        {
            'id': 'err2',
            'execution_id': execution_id,
            'node_id': 'node7',
            'error_message': 'Connection timed out',
            'cluster_id': 'cluster1'
        },
        {
            'id': 'err3',
            'execution_id': execution_id,
            'node_id': 'node7',
            'error_message': 'Timeout waiting for response',
            'cluster_id': 'cluster1'
        },
        # Rule 9: Auth failures
        {
            'id': 'err4',
            'execution_id': execution_id,
            'node_id': 'node8',
            'error_message': '401 Unauthorized: Invalid API key',
            'cluster_id': 'cluster2'
        },
        # Rule 10: Rate limits
        {
            'id': 'err5',
            'execution_id': execution_id,
            'node_id': 'node9',
            'error_message': '429 Too Many Requests: Rate limit exceeded',
            'cluster_id': 'cluster3'
        },
        {
            'id': 'err6',
            'execution_id': execution_id,
            'node_id': 'node9',
            'error_message': 'Rate limit reached, please try again later',
            'cluster_id': 'cluster3'
        },
        # Rule 11: Network errors
        {
            'id': 'err7',
            'execution_id': execution_id,
            'node_id': 'node10',
            'error_message': 'ECONNREFUSED: Connection refused',
            'cluster_id': 'cluster4'
        },
        # Rule 14: High error rate (6+ errors on single node)
        {
            'id': 'err8',
            'execution_id': execution_id,
            'node_id': 'node11',
            'error_message': 'Validation error 1',
            'cluster_id': None
        },
        {
            'id': 'err9',
            'execution_id': execution_id,
            'node_id': 'node11',
            'error_message': 'Validation error 2',
            'cluster_id': None
        },
        {
            'id': 'err10',
            'execution_id': execution_id,
            'node_id': 'node11',
            'error_message': 'Validation error 3',
            'cluster_id': None
        },
        {
            'id': 'err11',
            'execution_id': execution_id,
            'node_id': 'node11',
            'error_message': 'Validation error 4',
            'cluster_id': None
        },
        {
            'id': 'err12',
            'execution_id': execution_id,
            'node_id': 'node11',
            'error_message': 'Validation error 5',
            'cluster_id': None
        },
        {
            'id': 'err13',
            'execution_id': execution_id,
            'node_id': 'node11',
            'error_message': 'Validation error 6',
            'cluster_id': None
        },
    ]

    # Error clusters - Rule 15. Real rows store member_count and
    # affected_nodes as dicts {node_id, node_name, occurrence_count}.
    error_clusters = [
        {
            'id': 'cluster1',
            'execution_id': execution_id,
            'workflow_id': workflow_id,
            'member_count': 3,
            'affected_nodes': [
                {'node_id': 'node7', 'node_name': 'Fetch Data', 'occurrence_count': 3},
            ],
            'pattern_type': 'timeout',
            'label': 'Request timeouts',
            'representative_message': 'Request timeout after 30s'
        },
        {
            'id': 'cluster_systemic',
            'execution_id': execution_id,
            'workflow_id': workflow_id,
            'member_count': 8,
            'affected_nodes': [
                {'node_id': 'node12', 'node_name': 'Sync A', 'occurrence_count': 3},
                {'node_id': 'node13', 'node_name': 'Sync B', 'occurrence_count': 3},
                {'node_id': 'node14', 'node_name': 'Sync C', 'occurrence_count': 2},
            ],
            'pattern_type': 'network',
            'label': 'Network failures',
            'representative_message': 'Network connection failed'
        }
    ]

    # Execution events
    execution_events = []

    # Workflow definition (node metadata comes from workflows.raw_json)
    workflows = [{
        'id': workflow_id,
        'raw_json': {'nodes': []}
    }]

    # Execution metadata
    executions = [{
        'id': execution_id,
        'workflow_id': workflow_id,
        'status': 'success',
        'duration_ms': 50000
    }]

    return {
        'critical_paths': critical_paths,
        'node_stats': node_stats,
        'error_embeddings': error_embeddings,
        'error_clusters': error_clusters,
        'execution_events': execution_events,
        'workflows': workflows,
        'executions': executions
    }


async def test_recommendation_engine():
    """Test the recommendation engine with mock data"""

    print("=" * 80)
    print("Testing Recommendation Engine with Mock Data")
    print("=" * 80)

    # Create mock data
    mock_data = create_mock_data()

    # Create mock Supabase client
    mock_client = MockSupabaseClient(mock_data)

    # Create recommendation engine
    engine = RecommendationEngine(mock_client)

    # Generate recommendations
    print("\n🔄 Generating recommendations...")
    result = await engine.generate_recommendations(
        execution_id="test-execution-123",
        workflow_id="test-workflow-456"
    )

    # Display results
    assert result['success'] is True, f"Engine reported failure: {result!r}"
    print(f"\n✅ Success: {result['success']}")
    print(f"\n📊 Summary:")
    print(f"   Total recommendations: {result['data']['summary']['total_recommendations']}")
    print(f"   By category: {result['data']['summary']['by_category']}")
    print(f"   By impact: {result['data']['summary']['by_impact']}")

    print(f"\n📋 Recommendations (sorted by priority):")
    print("-" * 80)

    for i, rec in enumerate(result['data']['recommendations'], 1):
        print(f"\n{i}. [{rec['rule_id']}] {rec['title']}")
        print(f"   Priority Score: {rec['priority_score']:.1f}/100")
        print(f"   Impact: {rec['impact']} | Effort: {rec['effort']} | Category: {rec['category']}")
        print(f"   {rec['impact_details']}")
        print(f"   Evidence items: {len(rec['evidence'])}")
        if rec.get('code_example'):
            print(f"   ✅ Has code example")
        if rec.get('affected_node_ids'):
            print(f"   Affects {len(rec['affected_node_ids'])} node(s)")

    # Verify expected rules triggered
    print(f"\n🎯 Rules Verification:")
    print("-" * 80)

    expected_rules = {
        1: "Sequential API Calls",
        2: "Long Duration Node",
        3: "High Loop Iterations",
        7: "Hardcoded Delays",
        8: "Timeouts",
        9: "Auth Failures",
        10: "Rate Limits",
        11: "Network Errors",
        14: "High Error Rate",
        15: "Error Clusters"
    }

    triggered_rules = {rec['rule_id']: rec['title'] for rec in result['data']['recommendations']}

    missing_rules = [
        f"#{rule_id} ({rule_name})"
        for rule_id, rule_name in expected_rules.items()
        if rule_id not in triggered_rules
    ]
    assert not missing_rules, f"Expected rules did not trigger: {missing_rules}"
    for rule_id, rule_name in expected_rules.items():
        print(f"   ✅ Rule #{rule_id}: {rule_name}")

    # Test priority calculation
    print(f"\n🔢 Priority Score Calculation:")
    print("-" * 80)

    for rec in result['data']['recommendations'][:3]:
        time_saved = rec.get('time_saved_ms', 0) / 1000 if rec.get('time_saved_ms') else 0
        error_count = rec.get('error_count', 0)
        print(f"\nRule #{rec['rule_id']}: {rec['title']}")
        print(f"   Impact: {rec['impact']}")
        print(f"   Effort: {rec['effort']}")
        print(f"   Time saved: {time_saved:.1f}s" if time_saved > 0 else f"   Errors: {error_count}")
        print(f"   Priority score: {rec['priority_score']:.1f}/100")

    # Verify all recommendations have evidence
    print(f"\n🔍 Evidence Validation:")
    print("-" * 80)

    # priority_score is documented as 0-100 (dataclass field, frontend "/100")
    out_of_range = [(rec['rule_id'], rec['priority_score'])
                    for rec in result['data']['recommendations']
                    if not 0 <= rec['priority_score'] <= 100]
    assert not out_of_range, f"priority_score outside 0-100: {out_of_range}"

    no_evidence = [rec['rule_id'] for rec in result['data']['recommendations']
                   if len(rec['evidence']) < 1]
    assert not no_evidence, f"Recommendations without evidence: rules {no_evidence}"
    print("   All recommendations have evidence: ✅ Yes")

    no_links = [rec['rule_id'] for rec in result['data']['recommendations']
                if not any(e.get('link') for e in rec['evidence'])]
    assert not no_links, f"Recommendations without clickable links: rules {no_links}"
    print("   All recommendations have clickable links: ✅ Yes")

    # Count recommendations with code examples
    with_code = sum(1 for rec in result['data']['recommendations'] if rec.get('code_example'))
    print(f"   Recommendations with code examples: {with_code}/{len(result['data']['recommendations'])}")

    print("\n" + "=" * 80)
    print("✅ Test Complete!")
    print("=" * 80)

    return True


async def test_priority_score_calculation():
    """Test priority score calculation logic.

    Formula (recommendations.py): impact_score * effort_multiplier * 100
    - impact_score: CRITICAL=1.0, else min(time_saved_ms/10000, 1.0) or
      min(error_count/20, 1.0); the ImpactLevel enum does NOT scale
      time/error-based scores.
    - effort multipliers are discount factors: LOW=1.0, MEDIUM=0.7, HIGH=0.4,
      so at equal impact, easier fixes rank higher (quick wins first) and the
      score is bounded to 0-100 as the Recommendation.priority_score field
      and the frontend's "/100" displays promise.
    """

    print("\n" + "=" * 80)
    print("Testing Priority Score Calculation")
    print("=" * 80)

    test_cases = [
        {
            'name': 'High impact, low effort',
            'impact': ImpactLevel.HIGH,
            'effort': EffortLevel.LOW,
            'time_saved_ms': 10000,
            # min(10000/10000, 1.0) * 1.0 * 100
            'expected': 100.0
        },
        {
            'name': 'Critical impact, high effort',
            'impact': ImpactLevel.CRITICAL,
            'effort': EffortLevel.HIGH,
            'time_saved_ms': None,
            'error_count': 10,
            # CRITICAL pins impact_score to 1.0: 1.0 * 0.4 * 100
            'expected': 40.0
        },
        {
            'name': 'Medium impact, medium effort',
            'impact': ImpactLevel.MEDIUM,
            'effort': EffortLevel.MEDIUM,
            'time_saved_ms': 5000,
            # min(5000/10000, 1.0) * 0.7 * 100
            'expected': 35.0
        },
        {
            'name': 'Low impact, low effort',
            'impact': ImpactLevel.LOW,
            'effort': EffortLevel.LOW,
            'time_saved_ms': 1000,
            # min(1000/10000, 1.0) * 1.0 * 100
            'expected': 10.0
        }
    ]

    mock_client = MockSupabaseClient({})
    engine = RecommendationEngine(mock_client)

    for test in test_cases:
        rec = Recommendation(
            id="test",
            rule_id=1,
            title="Test",
            description="Test",
            evidence=[],
            impact=test['impact'],
            impact_details="Test",
            effort=test['effort'],
            priority_score=0.0,
            category=RecommendationCategory.PERFORMANCE,
            time_saved_ms=test.get('time_saved_ms'),
            error_count=test.get('error_count')
        )

        score = engine._calculate_priority_score(rec)

        assert 0 <= score <= 100, (
            f"{test['name']}: score {score} outside the documented 0-100 range"
        )
        assert score == test['expected'], (
            f"{test['name']}: expected {test['expected']}, got {score}"
        )
        print(f"\n✅ {test['name']}")
        print(f"   Impact: {test['impact'].value} | Effort: {test['effort'].value}")
        print(f"   Priority Score: {score:.1f} (expected: {test['expected']})")

    # Quick wins first: at equal impact, LOW effort must outrank HIGH effort
    def make_rec(effort):
        return Recommendation(
            id="test", rule_id=1, title="Test", description="Test",
            evidence=[], impact=ImpactLevel.HIGH, impact_details="Test",
            effort=effort, priority_score=0.0,
            category=RecommendationCategory.PERFORMANCE, time_saved_ms=8000,
        )

    low_score = engine._calculate_priority_score(make_rec(EffortLevel.LOW))
    high_score = engine._calculate_priority_score(make_rec(EffortLevel.HIGH))
    assert low_score > high_score, (
        f"Equal impact: LOW effort ({low_score}) should outrank "
        f"HIGH effort ({high_score})"
    )
    print(f"\n✅ Quick wins first: equal impact ranks LOW effort ({low_score}) "
          f"above HIGH effort ({high_score})")

    return True


def main():
    print("\n🚀 Starting Recommendation Engine Tests\n")

    ok1 = asyncio.run(test_recommendation_engine())
    ok2 = asyncio.run(test_priority_score_calculation())
    success = ok1 and ok2

    print("\n" + "=" * 80)
    print("✅ ALL TESTS PASSED" if success else "❌ TESTS FAILED")
    print("=" * 80)
    return success


if __name__ == "__main__":
    exit(0 if main() else 1)
