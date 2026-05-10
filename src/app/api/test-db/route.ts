import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: pps } = await supabaseAdmin.from('pain_point_sources').select('*').limit(1);
    const { data: trans } = await supabaseAdmin.from('transcripts').select('*').limit(1);
    const { data: pp } = await supabaseAdmin.from('pain_points').select('*').limit(1);

    return NextResponse.json({
      success: true,
      pain_point_sources_cols: pps && pps.length > 0 ? Object.keys(pps[0]) : [],
      transcripts_cols: trans && trans.length > 0 ? Object.keys(trans[0]) : [],
      pain_points_cols: pp && pp.length > 0 ? Object.keys(pp[0]) : []
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, details: err.message }, { status: 500 });
  }
}

