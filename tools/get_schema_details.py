import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

def get_columns(table_name):
    print(f"\n--- Columns for {table_name} ---")
    try:
        # Using a raw SQL query via the supabase client is tricky without a specific RPC.
        # But we can try to select a non-existent column to see the error message which often lists columns,
        # OR just try to select * and if empty, we are out of luck with simple select.
        # However, we can try to use the REST API directly to get the OpenAPI spec if enabled.
        import requests
        headers = {"apikey": key, "Authorization": f"Bearer {key}"}
        response = requests.get(f"{url}/rest/v1/?select=*", headers=headers)
        if response.status_code == 200:
            spec = response.json()
            if 'definitions' in spec and table_name in spec['definitions']:
                cols = spec['definitions'][table_name]['properties'].keys()
                print(list(cols))
            else:
                print(f"Table {table_name} not found in definitions")
        else:
            print(f"Failed to get spec: {response.status_code}")
    except Exception as e:
        print(f"Error: {e}")

get_columns("pain_points")
get_columns("pain_point_sources")
get_columns("transcripts")
get_columns("videos")
