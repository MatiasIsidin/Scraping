import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

/**
 * GET /api/mvt
 * Obtiene el proceso MVT activo del usuario con todos sus datos.
 */
export async function GET() {
  try {
    const userId = 'Matias';

    // 1. Obtener proceso MVT activo
    const { data: process, error: procError } = await supabaseAdmin
      .from('mvt_processes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (procError) {
      return NextResponse.json({ success: false, error: procError.message }, { status: 500 });
    }

    if (!process) {
      return NextResponse.json({ success: true, process: null, message: 'No hay proceso MVT activo.' });
    }

    // 2. Obtener conversaciones de inmersión
    const { data: conversations } = await supabaseAdmin
      .from('mvt_immersion_conversations')
      .select('*')
      .eq('mvt_process_id', process.id)
      .order('created_at', { ascending: true });

    // 3. Obtener resumen IA
    const { data: summary } = await supabaseAdmin
      .from('mvt_immersion_summary')
      .select('*')
      .eq('mvt_process_id', process.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 4. Obtener hipótesis
    const { data: hypotheses } = await supabaseAdmin
      .from('mvt_hypotheses')
      .select('*')
      .eq('mvt_process_id', process.id)
      .order('priority', { ascending: false });

    // 5. Obtener tests
    const { data: tests } = await supabaseAdmin
      .from('mvt_tests')
      .select('*')
      .eq('mvt_process_id', process.id)
      .order('created_at', { ascending: true });

    // 6. Obtener resultados
    const { data: results } = await supabaseAdmin
      .from('mvt_results')
      .select('*')
      .eq('mvt_process_id', process.id)
      .order('created_at', { ascending: true });

    // 7. Obtener decisión
    const { data: decision } = await supabaseAdmin
      .from('mvt_decisions')
      .select('*')
      .eq('mvt_process_id', process.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      process,
      conversations: conversations || [],
      summary: summary || null,
      hypotheses: hypotheses || [],
      tests: tests || [],
      results: results || [],
      decision: decision || null
    });

  } catch (error: any) {
    console.error('[API-MVT-GET] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/mvt
 * Actualiza el estado del proceso MVT.
 */
export async function PATCH(request: Request) {
  try {
    const userId = 'Matias';
    const body = await request.json();
    const { current_state } = body;

    const validStates = ['INMERSION', 'HIPOTESIS', 'TESTING', 'RESULTADOS', 'DECISION'];
    if (!validStates.includes(current_state)) {
      return NextResponse.json({ success: false, error: 'Estado inválido' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('mvt_processes')
      .update({ current_state, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, process: data });

  } catch (error: any) {
    console.error('[API-MVT-PATCH] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
