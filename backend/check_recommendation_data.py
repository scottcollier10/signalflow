from supabase import create_client
import os

# Hardcode your local Supabase credentials
SUPABASE_URL = "http://127.0.0.1:54321"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsI..."  # Your key from .env

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

WF_ID = "6a71673e-623d-42c9-a7c5-09e8acda50f4"
EXEC_ID = "09f2d02b-2137-4da8-8e68-cd15535bee3f"

print("="*60)
print("RECOMMENDATION ENGINE DIAGNOSTIC")
print("="*60)

# Check critical path data
print("\n1. CRITICAL PATH DATA")
cp = supabase.table('critical_paths').select('*').eq('execution_id', EXEC_ID).execute()
print(f"   Records found: {len(cp.data)}")
if cp.data:
    path_nodes = cp.data[0].get('path_node_ids', [])
    print(f"   Nodes on path: {len(path_nodes)}")
    print(f"   Path percentage: {cp.data[0].get('path_percentage', 0):.1f}%")
else:
    print("   ❌ NO CRITICAL PATH DATA - Rules won't trigger!")

# Check bottleneck data  
print("\n2. BOTTLENECK DATA")
bn = supabase.table('node_stats').select('*').eq('execution_id', EXEC_ID).order('bottleneck_score', desc=True).limit(5).execute()
print(f"   Records found: {len(bn.data)}")
if bn.data:
    for i, b in enumerate(bn.data[:5], 1):
        print(f"   {i}. {b['node_name'][:30]:30s} | score={b['bottleneck_score']:5.1f} | duration={b['total_duration_ms']:6d}ms")
else:
    print("   ❌ NO BOTTLENECK DATA - Rules won't trigger!")

# Check execution events
print("\n3. EXECUTION EVENTS")
events = supabase.table('execution_events').select('node_id, event_type').eq('execution_id', EXEC_ID).execute()
print(f"   Total events: {len(events.data)}")

# Check for loops
node_counts = {}
for e in events.data:
    node_id = e['node_id']
    node_counts[node_id] = node_counts.get(node_id, 0) + 1

loop_nodes = [(nid, count) for nid, count in node_counts.items() if count > 4]
print(f"   Loop nodes (>4 executions): {len(loop_nodes)}")
if loop_nodes:
    for nid, count in sorted(loop_nodes, key=lambda x: x[1], reverse=True)[:5]:
        print(f"     - {nid[:36]}: {count} executions")

# Check error embeddings
print("\n4. ERROR DATA")
errors = supabase.table('error_embeddings').select('*').eq('execution_id', EXEC_ID).execute()
print(f"   Errors found: {len(errors.data)}")

print("\n" + "="*60)
print("DIAGNOSIS:")
print("="*60)

if not cp.data:
    print("❌ Missing critical_paths table data")
    print("   → Run critical path analysis first")
if not bn.data:
    print("❌ Missing node_stats table data")
    print("   → Run bottleneck analysis first")
if cp.data and bn.data:
    print("✅ Data exists - recommendation engine should work")
    print("   → Check rule thresholds in recommendations.py")
