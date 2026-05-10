import { supabaseAdmin } from "@lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET() {
  console.log("Starting purge of mock data...");
  
  // 1. Delete sources associated with mock pain points
  const { data: mockPPs } = await supabaseAdmin
    .from('pain_points')
    .select('id')
    .ilike('video_id', 'test%');
  
  if (mockPPs && mockPPs.length > 0) {
    const ids = mockPPs.map(p => p.id);
    await supabaseAdmin.from('pain_point_sources').delete().in('pain_point_id', ids);
    await supabaseAdmin.from('pain_points').delete().in('id', ids);
  }

  // 2. Final check
  const { count: remainingMock } = await supabaseAdmin
    .from('pain_points')
    .select('*', { count: 'exact', head: true })
    .ilike('video_id', 'test%');

  return NextResponse.json({ 
    success: true, 
    purged_count: mockPPs?.length || 0,
    remaining_mock: remainingMock 
  });
}
