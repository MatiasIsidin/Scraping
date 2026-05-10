import { supabaseAdmin } from "@lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await supabaseAdmin.from('pain_point_sources').insert({
    pain_point_id: '00000000-0000-0000-0000-000000000000',
    source_name: 'test',
    source_type: 'test',
    source_url: 'test',
    country: 'test',
    evidence: 'test',
    credibility_score: 0
  });

  return NextResponse.json({ error: error?.message || 'Success' });
}
