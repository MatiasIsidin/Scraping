import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

/**
 * Crea las tablas necesarias si no existen.
 */
async function ensureTablesExist() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.selected_solutions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      solution_id UUID,
      rpm_profile_id UUID,
      criteria_hash TEXT NOT NULL DEFAULT 'local',
      proposal_version INTEGER DEFAULT 1,
      selected_at TIMESTAMPTZ DEFAULT NOW(),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS public.mvt_processes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      selected_solution_id UUID,
      solution_title TEXT NOT NULL,
      pain_point_title TEXT,
      fit_score INTEGER DEFAULT 0,
      selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      current_state TEXT NOT NULL DEFAULT 'INMERSION',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS public.solution_generation_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      rpm_profile_id UUID,
      criteria_hash TEXT NOT NULL,
      rpm_version INTEGER DEFAULT 1,
      rpm_snapshot JSONB DEFAULT '{}'::jsonb,
      solutions_generated INTEGER DEFAULT 0,
      solutions_snapshot JSONB DEFAULT '[]'::jsonb,
      is_current BOOLEAN DEFAULT TRUE,
      generated_at TIMESTAMPTZ DEFAULT NOW(),
      invalidated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS public.mvt_immersion_conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mvt_process_id UUID,
      contact_name TEXT NOT NULL,
      segment TEXT,
      company TEXT,
      role TEXT,
      conversation_date TIMESTAMPTZ DEFAULT NOW(),
      channel TEXT,
      duration_minutes INTEGER,
      notes TEXT,
      problems_detected TEXT,
      literal_quotes TEXT,
      pain_level INTEGER DEFAULT 5,
      willingness_to_pay TEXT,
      observations TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS public.mvt_hypotheses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mvt_process_id UUID,
      hypothesis TEXT NOT NULL,
      type TEXT,
      risk TEXT DEFAULT 'MEDIA',
      impact TEXT DEFAULT 'MEDIA',
      priority INTEGER DEFAULT 0,
      justification TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS public.mvt_tests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mvt_process_id UUID,
      hypothesis_id UUID,
      name TEXT NOT NULL,
      test_type TEXT DEFAULT 'OTRO',
      description TEXT,
      start_date TIMESTAMPTZ,
      end_date TIMESTAMPTZ,
      status TEXT DEFAULT 'PENDIENTE',
      url TEXT,
      screenshots JSONB DEFAULT '[]'::jsonb,
      target_metric TEXT,
      expected_result TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS public.mvt_results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mvt_process_id UUID,
      test_id UUID,
      target_metric TEXT,
      actual_result TEXT,
      difference TEXT,
      fulfillment_percentage NUMERIC(5,2) DEFAULT 0,
      classification TEXT DEFAULT 'INCONCLUSA',
      reasoning TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS public.mvt_decisions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mvt_process_id UUID,
      decision TEXT NOT NULL,
      justification TEXT,
      learnings TEXT,
      next_steps TEXT,
      version INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS public.mvt_immersion_summary (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mvt_process_id UUID,
      ai_summary TEXT,
      repeated_patterns TEXT,
      insights TEXT,
      frequent_problems TEXT,
      generated_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  try {
    await supabaseAdmin.rpc('exec_sql', { query_text: sql });
  } catch (e: any) {
    console.warn('[ENSURE-TABLES] RPC exec_sql no disponible o error:', e.message);
  }
}

/**
 * POST /api/solutions/select
 * Selecciona una solución como activa para el usuario.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { solution_id, solution_data } = body;
    const userId = 'Matias'; // En producción vendría de la sesión

    if (!solution_id) {
      return NextResponse.json({ success: false, error: 'solution_id es requerido' }, { status: 400 });
    }

    // Asegurar que las tablas existen
    await ensureTablesExist();

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
