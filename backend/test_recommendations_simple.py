import sys
sys.path.insert(0, 'src')

from analysis.recommendations import RecommendationEngine

# Create engine
engine = RecommendationEngine()

# Mock data for testing
mock_critical_path = {
    'path_node_ids': ['node1', 'node2', 'node3', 'node4', 'node5'],
    'path_percentage': 96.15,
    'total_duration_ms': 13474
}

mock_bottlenecks = [
    {
        'node_id': 'node1',
        'node_name': 'Claude: Generate Variant',
        'bottleneck_score': 87.0,
        'total_duration_ms': 5500,
        'is_on_critical_path': True
    },
    {
        'node_id': 'node2', 
        'node_name': 'Rate Limit Delay',
        'bottleneck_score': 86.0,
        'total_duration_ms': 2015,
        'is_on_critical_path': True
    }
]

mock_error_clusters = []

print("Testing rule detection...")
print(f"Critical path nodes: {len(mock_critical_path['path_node_ids'])}")
print(f"Path percentage: {mock_critical_path['path_percentage']}%")
print(f"Bottlenecks: {len(mock_bottlenecks)}")

# Try to generate recommendations
try:
    recommendations = engine.generate_recommendations(
        execution_id='test',
        workflow_id='test',
        critical_path=mock_critical_path,
        bottlenecks=mock_bottlenecks,
        error_clusters=mock_error_clusters
    )
    
    print(f"\n✅ Generated {len(recommendations)} recommendations:")
    for rec in recommendations:
        print(f"  - Rule #{rec.rule_id}: {rec.title} (priority: {rec.priority_score:.1f})")
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
