"""
Create minimal test data for error clustering demonstration.

Creates:
- 1 workflow
- 1 execution
- 6 synthetic errors (2 clusters + 1 outlier)
"""

from supabase import create_client
import os
from dotenv import load_dotenv
import uuid
from datetime import datetime, timezone

load_dotenv()

supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))


def create_minimal_workflow():
    """Create a minimal test workflow"""
    workflow_id = str(uuid.uuid4())

    workflow_data = {
        'id': workflow_id,
        'name': 'Test Workflow - Error Clustering',
        'n8n_workflow_id': 'test-workflow-1',
        'raw_json': {
            'name': 'Test Workflow',
            'nodes': []
        },
        'node_count': 6,
        'edge_count': 5
    }

    supabase.table('workflows').insert(workflow_data).execute()
    print(f"✅ Created workflow: {workflow_id}")

    return workflow_id


def create_test_nodes(workflow_id):
    """Create test nodes for the workflow"""
    nodes = [
        {'node_id': 'node_http_1', 'node_name': 'HTTP Request 1', 'node_type': 'n8n-nodes-base.httpRequest'},
        {'node_id': 'node_http_2', 'node_name': 'HTTP Request 2', 'node_type': 'n8n-nodes-base.httpRequest'},
        {'node_id': 'node_http_3', 'node_name': 'HTTP Request 3', 'node_type': 'n8n-nodes-base.httpRequest'},
        {'node_id': 'node_claude_1', 'node_name': 'Claude AI 1', 'node_type': 'n8n-nodes-base.anthropic'},
        {'node_id': 'node_claude_2', 'node_name': 'Claude AI 2', 'node_type': 'n8n-nodes-base.anthropic'},
        {'node_id': 'node_code_1', 'node_name': 'Code Parser', 'node_type': 'n8n-nodes-base.code'},
    ]

    for node in nodes:
        node_data = {
            'id': str(uuid.uuid4()),
            'workflow_id': workflow_id,
            **node
        }
        supabase.table('nodes').insert(node_data).execute()

    print(f"✅ Created {len(nodes)} nodes")
    return nodes


def create_test_execution(workflow_id):
    """Create a test execution"""
    execution_id = str(uuid.uuid4())

    execution_data = {
        'id': execution_id,
        'workflow_id': workflow_id,
        'n8n_execution_id': 'test-exec-1',
        'started_at': datetime.now(timezone.utc).isoformat(),
        'finished_at': datetime.now(timezone.utc).isoformat(),
        'status': 'error',
        'duration_ms': 5000,
        'trigger_mode': 'manual',
        'raw_json': {'status': 'error'}
    }

    supabase.table('executions').insert(execution_data).execute()
    print(f"✅ Created execution: {execution_id}")

    return execution_id


def create_test_errors(execution_id, nodes):
    """Create synthetic error events"""

    # Use normalized node names (lowercase with underscores)
    node_names = [n['node_name'].lower().replace(' ', '_') for n in nodes]

    test_errors = [
        # Cluster 1: API Timeouts (3 errors - should cluster together)
        {
            'node_id': node_names[0],
            'error_message': 'ConnectionError: API timeout after 30s',
            'error_type': 'ConnectionError',
            'description': 'Timeout #1'
        },
        {
            'node_id': node_names[1],
            'error_message': 'RequestTimeout: Claude API failed to respond within 30s',
            'error_type': 'TimeoutError',
            'description': 'Timeout #2'
        },
        {
            'node_id': node_names[2],
            'error_message': 'TimeoutError: Request exceeded 30 second limit',
            'error_type': 'TimeoutError',
            'description': 'Timeout #3'
        },

        # Cluster 2: Auth Failures (2 errors - should cluster together)
        {
            'node_id': node_names[3],
            'error_message': 'AuthenticationError: Invalid API key provided',
            'error_type': 'AuthenticationError',
            'description': 'Auth #1'
        },
        {
            'node_id': node_names[4],
            'error_message': 'Unauthorized: Missing or invalid credentials',
            'error_type': 'AuthenticationError',
            'description': 'Auth #2'
        },

        # Outlier: Unique error (should NOT cluster)
        {
            'node_id': node_names[5],
            'error_message': 'SyntaxError: Unexpected token in JSON at position 42',
            'error_type': 'SyntaxError',
            'description': 'Syntax Error (outlier)'
        }
    ]

    base_timestamp = datetime.now(timezone.utc).isoformat()
    created_count = 0

    for i, error_data in enumerate(test_errors):
        event = {
            'id': str(uuid.uuid4()),
            'execution_id': execution_id,
            'node_id': error_data['node_id'],  # This is the normalized name
            'event_type': 'error',
            'status': 'error',
            'error_message': error_data['error_message'],
            'metadata': {'error_type': error_data['error_type']},
            'timestamp': base_timestamp,
            'sequence_order': i
        }

        supabase.table('execution_events').insert(event).execute()
        print(f"  ✅ {error_data['description']}: {error_data['error_message'][:50]}...")
        created_count += 1

    print(f"✅ Created {created_count} error events")
    return created_count


def main():
    print("\n" + "="*70)
    print("Creating Minimal Test Data for Error Clustering")
    print("="*70 + "\n")

    # Create workflow
    workflow_id = create_minimal_workflow()

    # Create nodes
    nodes = create_test_nodes(workflow_id)

    # Create execution
    execution_id = create_test_execution(workflow_id)

    # Create errors
    error_count = create_test_errors(execution_id, nodes)

    print("\n" + "="*70)
    print("✅ Test data created successfully!")
    print("="*70)
    print(f"\nWorkflow ID:  {workflow_id}")
    print(f"Execution ID: {execution_id}")
    print(f"Error count:  {error_count}")

    print("\n📊 Expected Clustering Results:")
    print("  - Cluster 1 (Timeouts): 3 errors with similarity ~0.85-0.95")
    print("  - Cluster 2 (Auth): 2 errors with similarity ~0.90+")
    print("  - Outlier: 1 error (unclustered)")

    print("\n🔗 Test the API:")
    print(f"  curl http://localhost:8000/api/workflows/{workflow_id}/executions/{execution_id}/error-analysis")
    print()

    return workflow_id, execution_id


if __name__ == "__main__":
    workflow_id, execution_id = main()
