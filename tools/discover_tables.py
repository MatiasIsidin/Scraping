import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

# Try to list all tables by querying information_schema
# This might not work via the client, but we can try a raw RPC or just list common names
tables = ["videos", "video_snapshots", "pain_points", "pain_point_sources", "transcripts", "video_transcripts"]

for table in tables:
    try:
        res = supabase.table(table).select("*").limit(1).execute()
        print(f"Table '{table}' exists. Columns: {list(res.data[0].keys()) if res.data else 'Empty table'}")
    except Exception as e:
        if "PGRST204" in str(e) or "PGRST205" in str(e):
            # Table doesn't exist
            pass
        else:
            print(f"Error checking {table}: {e}")

# Try to get table names via postgrest if possible
try:
    # This is a hacky way to get some info if the above fails
    pass
except:
    pass
