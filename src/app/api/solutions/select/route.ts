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
    const { solution_id, solution_data } = body;
    const userId = 'Matias'; // En producción vendría de la sesión

    if (!solution_id) {
      return NextResponse.json({ success: false, error: 'solution_id es requerido' }, { status: 400 });
    }

    let solution: any = null;
    let painPointTitle = 'Pain Point asociado';

    // Intentar buscar en DB primero
    const { data: dbSolution, error: solError } = await supabaseAdmin
      .from('solution_engine_outputs')
      .select('*')
      .eq('id', solution_id)
      .maybeSingle();

    if (dbSolution) {
      solution = dbSolution;
      // Obtener pain point asociado
      const { data: painPoint } = await supabaseAdmin
        .from('pain_points')
        .select('title')
        .eq('id', solution.matched_pain_point_id)
        .maybeSingle();
      painPointTitle = painPoint?.title || 'Pain Point asociado';
    } else if (solution_data) {
      // Fallback: usar los datos enviados desde el frontend (para soluciones locales)
      solution = solution_data;
      painPointTitle = solution_data.pain_point?.title || 'Pain Point asociado';
    } else {
      return NextResponse.json({ success: false, error: 'Solución no encontrada en DB y no se proporcionaron datos.' }, { status: 404 });
    }

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
        solution_id: dbSolution ? solution_id : null,
        rpm_profile_id: solution.rpm_profile_id || null,
        criteria_hash: solution.criteria_hash || 'local',
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
        solution_title: solution.title || 'Solución seleccionada',
        pain_point_title: painPointTitle,
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
      .select('*')
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
