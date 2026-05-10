import { supabaseAdmin } from "@lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET() {
  const results: any = {};
  
  // Check pain_points
  const { data: ppData, error: ppErr } = await supabaseAdmin.from('pain_points').select('*').limit(1);
  if (ppErr) {
    results.pain_points = { error: ppErr.message };
  } else if (ppData && ppData.length > 0) {
    results.pain_points = { columns: Object.keys(ppData[0]) };
  } else {
    results.pain_points = { status: 'empty_cannot_detect_columns' };
  }

  // Check pain_point_sources
  const { data: psData, error: psErr } = await supabaseAdmin.from('pain_point_sources').select('*').limit(1);
  if (psErr) {
    results.pain_point_sources = { error: psErr.message };
  } else if (psData && psData.length > 0) {
    results.pain_point_sources = { columns: Object.keys(psData[0]) };
  } else {
    results.pain_point_sources = { status: 'empty_cannot_detect_columns' };
  }

  return NextResponse.json(results);
}
