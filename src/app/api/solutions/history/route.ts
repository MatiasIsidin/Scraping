import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

/**
 * GET /api/solutions/history
 * Obtiene el historial de generaciones para demostrar dinamismo RPM.
 */
export async function GET() {
  try {
    const userId = 'Matias';

    const { data: history, error } = await supabaseAdmin
      .from('solution_generation_history')
      .select('*')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      history: history || []
    });

  } catch (error: any) {
    console.error('[API-HISTORY] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/solutions/history
 * Registra una nueva entrada en el historial de generaciones.
 * Se llama automáticamente al generar nuevas soluciones.
 */
export async function POST(request: Request) {
  try {
    const userId = 'Matias';
    const body = await request.json();
    const { rpm_profile_id, criteria_hash, rpm_snapshot, solutions_snapshot, solutions_count } = body;

    // Marcar generaciones anteriores como no-current
    await supabaseAdmin
      .from('solution_generation_history')
      .update({ is_current: false, invalidated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_current', true);

    // Calcular versión
    const { count } = await supabaseAdmin
      .from('solution_generation_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const version = (count || 0) + 1;

    // Insertar nueva entrada
    const { data, error } = await supabaseAdmin
      .from('solution_generation_history')
      .insert({
        user_id: userId,
        rpm_profile_id,
        criteria_hash,
        rpm_version: version,
        rpm_snapshot: rpm_snapshot || {},
        solutions_generated: solutions_count || 0,
        solutions_snapshot: solutions_snapshot || [],
        is_current: true,
        generated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, entry: data });

  } catch (error: any) {
    console.error('[API-HISTORY-POST] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
