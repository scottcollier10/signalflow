"""
Create synthetic test errors for error clustering testing.

Creates various error types that should cluster:
- Cluster 1: API Timeouts (3 errors)
- Cluster 2: Auth Failures (2 errors)
- Outlier: Unique syntax error (1 error)
"""

from supabase import create_client
import os
from dotenv import load_dotenv
import uuid
from datetime import datetime

load_dotenv()

supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

# Test data IDs from spec
WORKFLOW_ID = '8ce95407-8381-4756-85aa-c5c2a0251384'
EXECUTION_ID = '15720484-8e33-464b-84b8-0936ecfa7096'


def create_test_errors():
    """Create synthetic error events for testing"""

    # Get some nodes from the workflow to use as error locations
    nodes_response = supabase.table('nodes').select(
        'node_id, node_name, node_type'
    ).eq('workflow_id', WORKFLOW_ID).limit(10).execute()

    if not nodes_response.data or len(nodes_response.data) < 3:
        print("❌ Not enough nodes in workflow to create test errors")
        return False

    nodes = nodes_response.data[:6]  # Use first 6 nodes

    # Get the execution start time for realistic timestamps
    exec_response = supabase.table('executions').select(
        'started_at'
    ).eq('id', EXECUTION_ID).execute()

    if not exec_response.data:
        print(f"❌ Execution {EXECUTION_ID} not found")
        return False

    base_timestamp = exec_response.data[0]['started_at']

    print(f"\n📝 Creating test errors for execution {EXECUTION_ID}")
    print(f"Using {len(nodes)} nodes from workflow {WORKFLOW_ID}\n")

    # Define test errors (following spec's test data structure)
    test_errors = [
        # Cluster 1: API Timeouts (should cluster together)
        {
            "node_id": nodes[0]['node_name'].lower().replace(' ', '_'),
            "error_message": "ConnectionError: API timeout after 30s",
            "error_type": "ConnectionError",
            "description": "Timeout error #1"
        },
        {
            "node_id": nodes[1]['node_name'].lower().replace(' ', '_'),
            "error_message": "RequestTimeout: Claude API failed to respond within 30s",
            "error_type": "TimeoutError",
            "description": "Timeout error #2"
        },
        {
            "node_id": nodes[2]['node_name'].lower().replace(' ', '_'),
            "error_message": "TimeoutError: Request exceeded 30 second limit",
            "error_type": "TimeoutError",
            "description": "Timeout error #3"
        },

        # Cluster 2: Auth Failures (should cluster together)
        {
            "node_id": nodes[3]['node_name'].lower().replace(' ', '_'),
            "error_message": "AuthenticationError: Invalid API key provided",
            "error_type": "AuthenticationError",
            "description": "Auth error #1"
        },
        {
            "node_id": nodes[4]['node_name'].lower().replace(' ', '_'),
            "error_message": "Unauthorized: Missing or invalid credentials",
            "error_type": "AuthenticationError",
            "description": "Auth error #2"
        },

        # Outlier: Unique error (should not cluster)
        {
            "node_id": nodes[5]['node_name'].lower().replace(' ', '_'),
            "error_message": "SyntaxError: Unexpected token in JSON at position 42",
            "error_type": "SyntaxError",
            "description": "Unique syntax error (outlier)"
        }
    ]

    # Insert test errors
    created_count = 0
    for i, error_data in enumerate(test_errors):
        try:
            # Create execution event with error
            event = {
                'id': str(uuid.uuid4()),
                'execution_id': EXECUTION_ID,
                'node_id': error_data['node_id'],
                'event_type': 'error',
                'status': 'error',
                'error_message': error_data['error_message'],
                'error_details': {
                    'type': error_data['error_type']
                },
                'timestamp': base_timestamp,
                'sequence_order': 1000 + i  # High sequence to not interfere with existing events
            }

            supabase.table('execution_events').insert(event).execute()

            print(f"✅ Created: {error_data['description']}")
            print(f"   Node: {error_data['node_id']}")
            print(f"   Error: {error_data['error_message']}\n")

            created_count += 1

        except Exception as e:
            print(f"❌ Failed to create error: {e}")

    print(f"\n✅ Successfully created {created_count}/{len(test_errors)} test errors")
    print("\nExpected clustering:")
    print("  - Cluster 1 (Timeout): 3 errors (high similarity ~0.85-0.95)")
    print("  - Cluster 2 (Auth): 2 errors (high similarity ~0.90+)")
    print("  - Outlier (Syntax): 1 error (unclustered)")

    return created_count == len(test_errors)


def verify_test_errors():
    """Verify test errors were created"""
    print("\n🔍 Verifying test errors...")

    response = supabase.table('execution_events').select(
        'id, node_id, error_message, status'
    ).eq('execution_id', EXECUTION_ID).eq('status', 'error').execute()

    print(f"✅ Found {len(response.data)} error events in execution")

    return len(response.data) >= 6


def main():
    print("\n" + "="*60)
    print("Creating Synthetic Test Errors for Error Clustering")
    print("="*60)

    # Check if errors already exist
    response = supabase.table('execution_events').select(
        'id'
    ).eq('execution_id', EXECUTION_ID).eq('status', 'error').execute()

    if response.data:
        print(f"\n⚠️  Found {len(response.data)} existing errors.")
        choice = input("Delete existing errors and create new ones? (y/n): ")
        if choice.lower() == 'y':
            for error in response.data:
                supabase.table('execution_events').delete().eq('id', error['id']).execute()
            print("✅ Deleted existing errors")

    # Create test errors
    success = create_test_errors()

    if success:
        # Verify
        verify_test_errors()

        print("\n" + "="*60)
        print("✅ Test errors created successfully!")
        print("="*60)
        print("\nYou can now test the error clustering API:")
        print(f"  GET /api/workflows/{WORKFLOW_ID}/executions/{EXECUTION_ID}/error-analysis")
        print("\n")
    else:
        print("\n❌ Failed to create all test errors")

    return success


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
