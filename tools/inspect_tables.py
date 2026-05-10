import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

def check_table(table_name):
    print(f"\n--- Table: {table_name} ---")
    try:
        res = supabase.table(table_name).select("*").limit(1).execute()
        if res.data:
            print(f"Columns: {list(res.data[0].keys())}")
        else:
            print("No data found to infer columns.")
    except Exception as e:
        print(f"Error checking {table_name}: {e}")

check_table("videos")
check_table("pain_points")
check_table("pain_point_sources")
