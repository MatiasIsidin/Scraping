import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

/**
 * POST /api/solutions/select
 * Selecciona una solución como activa para el usuario.
 * - Desactiva selección previa
 * - Crea registro de selección
 * - Crea automáticamente proceso MVT
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { solution_id } = body;
    const userId = 'Matias'; // En producción vendría de la sesión

    if (!solution_id) {
      return NextResponse.json({ success: false, error: 'solution_id es requerido' }, { status: 400 });
    }

    // 1. Obtener la solución completa
    const { data: solution, error: solError } = await supabaseAdmin
      .from('solution_engine_outputs')
      .select('*')
      .eq('id', solution_id)
      .single();

    if (solError || !solution) {
      return NextResponse.json({ success: false, error: 'Solución no encontrada' }, { status: 404 });
    }

    // 2. Obtener pain point asociado
    const { data: painPoint } = await supabaseAdmin
      .from('pain_points')
      .select('title')
      .eq('id', solution.matched_pain_point_id)
      .maybeSingle();

    // 3. Desactivar selección previa del usuario
    await supabaseAdmin
      .from('selected_solutions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    // 4. Desactivar procesos MVT previos
    await supabaseAdmin
      .from('mvt_processes')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    // 5. Crear nuevo registro de selección
    const { data: selection, error: selError } = await supabaseAdmin
      .from('selected_solutions')
      .insert({
        user_id: userId,
        solution_id: solution_id,
        rpm_profile_id: solution.rpm_profile_id,
        criteria_hash: solution.criteria_hash,
        proposal_version: solution.tracking_version || 1,
        selected_at: new Date().toISOString(),
        is_active: true
      })
      .select('*')
      .single();

    if (selError) {
      console.error('[SELECT] Error al insertar selección:', selError);
      return NextResponse.json({ success: false, error: selError.message }, { status: 500 });
    }

    // 6. Crear automáticamente proceso MVT
    const { data: mvtProcess, error: mvtError } = await supabaseAdmin
      .from('mvt_processes')
      .insert({
        user_id: userId,
        selected_solution_id: selection.id,
        solution_title: solution.title,
        pain_point_title: painPoint?.title || 'Pain Point asociado',
        fit_score: solution.fit_score || 0,
        selected_at: selection.selected_at,
        current_state: 'INMERSION',
        is_active: true
      })
      .select('*')
      .single();

    if (mvtError) {
      console.error('[SELECT] Error al crear proceso MVT:', mvtError);
      return NextResponse.json({ success: false, error: mvtError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      selection,
      mvt_process: mvtProcess,
      message: 'Solución seleccionada y proceso MVT iniciado correctamente.'
    });

  } catch (error: any) {
    console.error('[API-SELECT] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/solutions/select
 * Obtiene la solución actualmente seleccionada por el usuario.
 */
export async function GET() {
  try {
    const userId = 'Matias';

    const { data: selection, error } = await supabaseAdmin
      .from('selected_solutions')
      .select('*, solution_engine_outputs(*)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      selection: selection || null
    });

  } catch (error: any) {
    console.error('[API-SELECT-GET] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
