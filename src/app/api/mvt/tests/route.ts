import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

/**
 * POST /api/mvt/tests
 * Crea un nuevo test/experimento.
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
      .from('mvt_tests')
      .insert({
        mvt_process_id: process.id,
        hypothesis_id: body.hypothesis_id || null,
        name: body.name,
        test_type: body.test_type || 'OTRO',
        description: body.description || null,
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        status: body.status || 'PENDIENTE',
        url: body.url || null,
        screenshots: body.screenshots || [],
        target_metric: body.target_metric || null,
        expected_result: body.expected_result || null
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, test: data });

  } catch (error: any) {
    console.error('[API-MVT-TEST] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/mvt/tests
 * Actualiza el estado de un test.
 */
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('mvt_tests')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, test: data });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/mvt/tests
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('mvt_tests')
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
