from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_KEY')
)

print("Checking local database...")
print("="*60)

# Check workflows
workflows = supabase.table('workflows').select('id, name').execute()
print(f"\n✓ Workflows: {len(workflows.data)}")
for w in workflows.data[:3]:
    print(f"  - {w['id']}: {w['name']}")

# Check executions
executions = supabase.table('executions').select('id, workflow_id, status').execute()
print(f"\n✓ Executions: {len(executions.data)}")
for e in executions.data[:3]:
    print(f"  - {e['id']}: status={e['status']}")

# Check execution events
events = supabase.table('execution_events').select('id').execute()
print(f"\n✓ Execution Events: {len(events.data)}")

# Check if node_stats table exists and has execution_id column
try:
    stats = supabase.table('node_stats').select('id, execution_id').limit(1).execute()
    print(f"\n✓ node_stats has execution_id column: YES")
    print(f"  Records: {len(stats.data)}")
except Exception as e:
    print(f"\n✗ node_stats issue: {e}")

# Check if error_clusters has execution_id
try:
    clusters = supabase.table('error_clusters').select('id, execution_id').limit(1).execute()
    print(f"\n✓ error_clusters has execution_id column: YES")
    print(f"  Records: {len(clusters.data)}")
except Exception as e:
    print(f"\n✗ error_clusters issue: {e}")

print("\n" + "="*60)
