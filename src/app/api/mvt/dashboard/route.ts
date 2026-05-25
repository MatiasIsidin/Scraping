import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

/**
 * GET /api/mvt/dashboard
 * Resumen visual completo del progreso MVT + Hito 5/6.
 */
export async function GET() {
  try {
    const userId = 'Matias';

    // Proceso MVT activo
    const { data: process } = await supabaseAdmin
      .from('mvt_processes')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!process) {
      return NextResponse.json({
        success: true,
        dashboard: null,
        message: 'No hay proceso MVT activo.'
      });
    }

    // Conteos
    const { count: convCount } = await supabaseAdmin
      .from('mvt_immersion_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('mvt_process_id', process.id);

    const { count: hypCount } = await supabaseAdmin
      .from('mvt_hypotheses')
      .select('*', { count: 'exact', head: true })
      .eq('mvt_process_id', process.id);

    const { data: hypCritical } = await supabaseAdmin
      .from('mvt_hypotheses')
      .select('id')
      .eq('mvt_process_id', process.id)
      .eq('risk', 'CRITICA');

    const { count: testCount } = await supabaseAdmin
      .from('mvt_tests')
      .select('*', { count: 'exact', head: true })
      .eq('mvt_process_id', process.id);

    const { data: allResults } = await supabaseAdmin
      .from('mvt_results')
      .select('classification')
      .eq('mvt_process_id', process.id);

    const { data: decisionData } = await supabaseAdmin
      .from('mvt_decisions')
      .select('decision')
      .eq('mvt_process_id', process.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Solución seleccionada
    const { data: selection } = await supabaseAdmin
      .from('selected_solutions')
      .select('*, solution_engine_outputs(title, fit_score, difficulty_level)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    // Historial de generaciones
    const { count: genCount } = await supabaseAdmin
      .from('solution_generation_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const validated = (allResults || []).filter(r => r.classification === 'VALIDADA').length;
    const invalidated = (allResults || []).filter(r => r.classification === 'INVALIDADA').length;

    // Progreso Hito 5
    const hito5Progress = {
      solution_engine: true,
      fit_score_engine: true,
      rpm_dynamic: true,
      solution_selection: !!selection,
      mvt_initiated: !!process
    };
    const hito5Score = Object.values(hito5Progress).filter(Boolean).length;

    // Progreso Hito 6
    const hito6Progress = {
      immersion: (convCount || 0) >= 5,
      hypotheses: (hypCount || 0) >= 5,
      testing: (testCount || 0) >= 1,
      results: (allResults || []).length >= 1,
      decision: !!decisionData
    };
    const hito6Score = Object.values(hito6Progress).filter(Boolean).length;

    return NextResponse.json({
      success: true,
      dashboard: {
        process,
        selection,
        stats: {
          conversations: convCount || 0,
          hypotheses: hypCount || 0,
          critical_hypotheses: (hypCritical || []).length,
          tests: testCount || 0,
          validated,
          invalidated,
          decision: decisionData?.decision || null
        },
        progress: {
          hito5: { items: hito5Progress, score: hito5Score, total: 5 },
          hito6: { items: hito6Progress, score: hito6Score, total: 5 }
        },
        generation_count: genCount || 0
      }
    });

  } catch (error: any) {
    console.error('[API-MVT-DASHBOARD] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
