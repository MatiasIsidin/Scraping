import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pain-points
 * Devuelve todos los pain points activos ordenados por final_score.
 * Schema real: pain_points (id, title, description, category, market_segment,
 *   severity_score, frequency_score, recency_score, final_score, version,
 *   video_id, is_active, created_at, updated_at)
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
      .order('final_score', { ascending: false })
      .order('created_at', { ascending: false })
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

/**
 * POST /api/pain-points
 * Crea un nuevo pain point manualmente.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, category, severity_score } = body;

    if (!title || !description) {
      return NextResponse.json({ success: false, error: 'Title and description are required' }, { status: 400 });
    }

    const newPainPoint = {
      title,
      description,
      category: category || 'General',
      severity_score: parseInt(severity_score) || 5,
      frequency_score: 1,
      recency_score: 10,
      final_score: parseInt(severity_score) || 5,
      is_active: true,
      market_segment: 'General'
    };

    const { data, error } = await supabaseAdmin
      .from('pain_points')
      .insert([newPainPoint])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
