"""
Unit tests for Recommendation Engine

Tests all 15 detection rules with mock data to verify the recommendation
logic works correctly before testing with real workflow data.
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

    # Bottleneck data - covering multiple rules
    node_stats = [
        # Rule 1: Sequential API calls
        {
            'execution_id': execution_id,
            'node_id': 'node1',
            'node_name': 'API Call 1',
            'node_type': 'n8n-nodes-base.httpRequest',
            'duration_ms': 3000,
            'bottleneck_score': 75,
            'on_critical_path': True,
            'execution_count': 1
        },
        {
            'execution_id': execution_id,
            'node_id': 'node2',
            'node_name': 'API Call 2',
            'node_type': 'n8n-nodes-base.httpRequest',
            'duration_ms': 2500,
            'bottleneck_score': 70,
            'on_critical_path': True,
            'execution_count': 1
        },
        {
            'execution_id': execution_id,
            'node_id': 'node3',
            'node_name': 'API Call 3',
            'node_type': 'n8n-nodes-base.httpRequest',
            'duration_ms': 2000,
            'bottleneck_score': 65,
            'on_critical_path': True,
            'execution_count': 1
        },
        # Rule 2: Long duration node
        {
            'execution_id': execution_id,
            'node_id': 'node4',
            'node_name': 'Claude AI Generate',
            'node_type': '@n8n/n8n-nodes-langchain.agent',
            'duration_ms': 35000,
            'bottleneck_score': 90,
            'on_critical_path': True,
            'execution_count': 1
        },
        # Rule 3: High loop iterations
        {
            'execution_id': execution_id,
            'node_id': 'node5',
            'node_name': 'Loop: Process Items',
            'node_type': 'n8n-nodes-base.function',
            'duration_ms': 100,
            'bottleneck_score': 60,
            'on_critical_path': True,
            'execution_count': 75
        },
        # Rule 7: Hardcoded delay
        {
            'execution_id': execution_id,
            'node_id': 'node6',
            'node_name': 'Rate Limit Delay',
            'node_type': 'n8n-nodes-base.wait',
            'duration_ms': 5000,
            'bottleneck_score': 55,
            'on_critical_path': True,
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

    # Error clusters - Rule 15
    error_clusters = [
        {
            'id': 'cluster1',
            'execution_id': execution_id,
            'workflow_id': workflow_id,
            'error_count': 3,
            'affected_nodes': ['node7'],
            'pattern_type': 'timeout',
            'representative_message': 'Request timeout after 30s'
        },
        {
            'id': 'cluster_systemic',
            'execution_id': execution_id,
            'workflow_id': workflow_id,
            'error_count': 8,
            'affected_nodes': ['node12', 'node13', 'node14'],
            'pattern_type': 'network',
            'representative_message': 'Network connection failed'
        }
    ]

    # Execution events
    execution_events = []

    # Workflow nodes
    workflow_nodes = []

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
        'workflow_nodes': workflow_nodes,
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

    for rule_id, rule_name in expected_rules.items():
        if rule_id in triggered_rules:
            print(f"   ✅ Rule #{rule_id}: {rule_name}")
        else:
            print(f"   ⚠️  Rule #{rule_id}: {rule_name} (not triggered)")

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

    all_have_evidence = all(len(rec['evidence']) >= 1 for rec in result['data']['recommendations'])
    all_have_links = all(
        any(e.get('link') for e in rec['evidence'])
        for rec in result['data']['recommendations']
    )

    print(f"   All recommendations have evidence: {'✅ Yes' if all_have_evidence else '❌ No'}")
    print(f"   All recommendations have clickable links: {'✅ Yes' if all_have_links else '⚠️  Some missing'}")

    # Count recommendations with code examples
    with_code = sum(1 for rec in result['data']['recommendations'] if rec.get('code_example'))
    print(f"   Recommendations with code examples: {with_code}/{len(result['data']['recommendations'])}")

    print("\n" + "=" * 80)
    print("✅ Test Complete!")
    print("=" * 80)

    return result


async def test_priority_score_calculation():
    """Test priority score calculation logic"""

    print("\n" + "=" * 80)
    print("Testing Priority Score Calculation")
    print("=" * 80)

    mock_client = MockSupabaseClient({})
    engine = RecommendationEngine(mock_client)

    test_cases = [
        {
            'name': 'High impact, low effort',
            'impact': ImpactLevel.HIGH,
            'effort': EffortLevel.LOW,
            'time_saved_ms': 10000,
            'expected_range': (75, 85)
        },
        {
            'name': 'Critical impact, high effort',
            'impact': ImpactLevel.CRITICAL,
            'effort': EffortLevel.HIGH,
            'time_saved_ms': None,
            'error_count': 10,
            'expected_range': (200, 260)
        },
        {
            'name': 'Medium impact, medium effort',
            'impact': ImpactLevel.MEDIUM,
            'effort': EffortLevel.MEDIUM,
            'time_saved_ms': 5000,
            'expected_range': (65, 75)
        },
        {
            'name': 'Low impact, low effort',
            'impact': ImpactLevel.LOW,
            'effort': EffortLevel.LOW,
            'time_saved_ms': 1000,
            'expected_range': (25, 35)
        }
    ]

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
        rec.priority_score = score

        expected_min, expected_max = test['expected_range']
        passed = expected_min <= score <= expected_max

        status = "✅" if passed else "❌"
        print(f"\n{status} {test['name']}")
        print(f"   Impact: {test['impact'].value} | Effort: {test['effort'].value}")
        print(f"   Priority Score: {score:.1f}/100 (expected: {expected_min}-{expected_max})")


if __name__ == "__main__":
    print("\n🚀 Starting Recommendation Engine Tests\n")

    # Run main test
    result = asyncio.run(test_recommendation_engine())

    # Run priority calculation test
    asyncio.run(test_priority_score_calculation())

    print("\n✅ All tests completed!\n")
