import { supabaseAdmin } from "@lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET() {
  const audit: any = {
    real_schema: {},
    integrity: {},
    relations: 'UNKNOWN'
  };

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    // 1. Fetch OpenAPI (REAL PostgREST state)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_SERVICE_ROLE_KEY}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Accept': 'application/openapi+json'
      }
    });
    const schema = await response.json();
    
    const targetTables = ['pain_points', 'pain_point_sources'];
    for (const t of targetTables) {
      const def = schema.definitions?.[t];
      if (def) {
        audit.real_schema[t] = {
          columns: Object.entries(def.properties).map(([name, props]: [string, any]) => ({
            column_name: name,
            data_type: props.format || props.type,
            is_nullable: !def.required?.includes(name),
            description: props.description || null
          }))
        };
      } else {
        audit.real_schema[t] = 'NOT_FOUND';
      }
    }

    // 2. Data Integrity Checks
    const { count: ppTotal } = await supabaseAdmin.from('pain_points').select('*', { count: 'exact', head: true });
    const { count: ppsTotal } = await supabaseAdmin.from('pain_point_sources').select('*', { count: 'exact', head: true });
    
    // Check null video_ids
    let nullVideoIds = 0;
    try {
      const { count } = await supabaseAdmin.from('pain_points').select('*', { count: 'exact', head: true }).is('video_id', null);
      nullVideoIds = count || 0;
    } catch (e) { nullVideoIds = -1; } // Column might not exist

    audit.integrity = {
      pain_points_count: ppTotal || 0,
      pain_point_sources_count: ppsTotal || 0,
      null_video_ids: nullVideoIds
    };

    return NextResponse.json(audit);

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
