import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pain-points
 * Devuelve todos los pain points activos ordenados por composite_score.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = supabaseAdmin
      .from('pain_points')
      .select('*')
      .eq('is_active', true)
      .order('composite_score', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, total: data?.length || 0 });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
