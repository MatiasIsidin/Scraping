import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

/**
 * POST /api/mvt/hypotheses
 * Crea una nueva hipótesis.
 */
export async function POST(request: Request) {
  try {
    const userId = 'Matias';
    const body = await request.json();

    const { data: process } = await supabaseAdmin
      .from('mvt_processes')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (!process) {
      return NextResponse.json({ success: false, error: 'No hay proceso MVT activo' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('mvt_hypotheses')
      .insert({
        mvt_process_id: process.id,
        hypothesis: body.hypothesis,
        type: body.type || null,
        risk: body.risk || 'MEDIA',
        impact: body.impact || 'MEDIA',
        priority: body.priority || 0,
        justification: body.justification || null
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, hypothesis: data });

  } catch (error: any) {
    console.error('[API-MVT-HYP] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/mvt/hypotheses
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('mvt_hypotheses')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
