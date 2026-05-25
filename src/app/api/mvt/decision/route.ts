import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

/**
 * POST /api/mvt/decision
 * Registra la decisión final del proceso MVT.
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

    const validDecisions = ['AVANZAR', 'AJUSTAR', 'DESCARTAR'];
    if (!validDecisions.includes(body.decision)) {
      return NextResponse.json({ success: false, error: 'Decisión inválida. Opciones: AVANZAR, AJUSTAR, DESCARTAR' }, { status: 400 });
    }

    // Contar versiones previas
    const { count } = await supabaseAdmin
      .from('mvt_decisions')
      .select('*', { count: 'exact', head: true })
      .eq('mvt_process_id', process.id);

    const { data, error } = await supabaseAdmin
      .from('mvt_decisions')
      .insert({
        mvt_process_id: process.id,
        decision: body.decision,
        justification: body.justification || null,
        learnings: body.learnings || null,
        next_steps: body.next_steps || null,
        version: (count || 0) + 1
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Actualizar estado del proceso a DECISION
    await supabaseAdmin
      .from('mvt_processes')
      .update({ current_state: 'DECISION', updated_at: new Date().toISOString() })
      .eq('id', process.id);

    return NextResponse.json({ success: true, decision: data });

  } catch (error: any) {
    console.error('[API-MVT-DECISION] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
