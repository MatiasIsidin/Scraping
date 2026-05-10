import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

query = """
SELECT 
  pp.video_id,
  pp.title,
  COUNT(pps.id) as sources
FROM pain_points pp
LEFT JOIN pain_point_sources pps
ON pp.id = pps.pain_point_id
GROUP BY pp.id, pp.video_id, pp.title;
"""

# Since I can't run raw SQL easily via the standard python client without an RPC,
# I'll just query both tables and join them locally to simulate the result and verify integrity.

def verify_integrity():
    print("--- Verifying Data Integrity ---")
    pp_res = supabase.table("pain_points").select("id, video_id, title").execute()
    pps_res = supabase.table("pain_point_sources").select("pain_point_id").execute()
    
    pps_counts = {}
    for pps in pps_res.data:
        pp_id = pps["pain_point_id"]
        pps_counts[pp_id] = pps_counts.get(pp_id, 0) + 1
        
    print(f"{'Video ID':<15} | {'Title':<40} | {'Sources'}")
    print("-" * 70)
    for pp in pp_res.data:
        count = pps_counts.get(pp["id"], 0)
        print(f"{pp['video_id']:<15} | {pp['title'][:40]:<40} | {count}")
        
    print(f"\nTotal Pain Points: {len(pp_res.data)}")
    print(f"Total Sources: {len(pps_res.data)}")
    
    # Check for orphans
    pp_ids = {pp["id"] for pp in pp_res.data}
    orphans = [pps for pps in pps_res.data if pps["pain_point_id"] not in pp_ids]
    print(f"Orphan Sources: {len(orphans)}")

verify_integrity()
