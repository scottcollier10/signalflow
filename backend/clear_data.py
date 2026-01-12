from supabase import create_client
import os

# Read .env manually
with open('.env') as f:
    for line in f:
        if line.startswith('SUPABASE_URL='):
            SUPABASE_URL = line.split('=', 1)[1].strip()
        elif line.startswith('SUPABASE_KEY='):
            SUPABASE_KEY = line.split('=', 1)[1].strip()

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

EXEC_ID = "09f2d02b-2137-4da8-8e68-cd15535bee3f"

# Delete corrupted data
supabase.table('critical_paths').delete().eq('execution_id', EXEC_ID).execute()
supabase.table('node_stats').delete().eq('execution_id', EXEC_ID).execute()

print("✅ Cleared old data - ready for fresh analysis")
