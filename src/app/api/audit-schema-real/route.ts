import { NextResponse } from "next/server";

export async function GET() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_SERVICE_ROLE_KEY}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Accept': 'application/openapi+json'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: `HTTP Error: ${response.status}` }, { status: 500 });
    }

    const schema = await response.json();
    const tables = ['pain_points', 'pain_point_sources', 'videos', 'transcripts', 'scraping_logs'];
    
    const results: any = {};
    for (const t of tables) {
      const def = schema.definitions?.[t];
      if (def) {
        results[t] = {
          columns: Object.keys(def.properties),
          required: def.required || []
        };
      } else {
        results[t] = { error: 'Table not found' };
      }
    }

    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
