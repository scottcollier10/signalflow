from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

EXEC_ID = "09f2d02b-2137-4da8-8e68-cd15535bee3f"

print("CHECKING WHY RECOMMENDATIONS ARE EMPTY")
print("="*60)

# Check if critical path was saved to database
cp = supabase.table('critical_paths').select('*').eq('execution_id', EXEC_ID).execute()
print(f"\n1. Critical paths table: {len(cp.data)} records")
if cp.data:
    # Database uses 'path_nodes' not 'path_node_ids'
    print(f"   Path nodes: {len(cp.data[0].get('path_nodes', cp.data[0].get('path_node_ids', [])))}")
    print(f"   Path %: {cp.data[0].get('path_percentage', 'N/A')}")
else:
    print("   ❌ ISSUE: Critical path data not saved to database!")
    print("   → The API returns it but doesn't cache it")

# Check if bottlenecks were saved
bn = supabase.table('node_stats').select('*').eq('execution_id', EXEC_ID).order('bottleneck_score', desc=True).limit(3).execute()
print(f"\n2. Node stats table: {len(bn.data)} records")
if bn.data:
    for b in bn.data[:3]:
        print(f"   - {b.get('node_name', 'N/A')}: {b.get('bottleneck_score', 0):.1f}")
else:
    print("   ❌ ISSUE: Bottleneck data not saved to database!")
    print("   → The API calculates it but doesn't cache it")

# Check error clusters
ec = supabase.table('error_clusters').select('*').eq('execution_id', EXEC_ID).execute()
print(f"\n3. Error clusters table: {len(ec.data)} records")

print("\n" + "="*60)
print("DIAGNOSIS:")
if not cp.data and not bn.data:
    print("❌ The APIs work but don't save results to database")
    print("✅ Fix: The APIs need to cache their results")
    print("   Files to check:")
    print("   - backend/src/analysis/critical_path.py")
    print("   - backend/src/analysis/bottlenecks.py")
elif not cp.data:
    print("❌ Only critical path data is missing from cache")
elif not bn.data:
    print("❌ Only bottleneck data is missing from cache")
else:
    print("✅ Data is cached - check recommendation engine logic")
