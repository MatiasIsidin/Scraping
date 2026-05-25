import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

/**
 * POST /api/mvt/results
 * Registra un resultado de test.
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

    // Auto-clasificar basado en porcentaje de cumplimiento
    let classification = 'INCONCLUSA';
    const fulfillment = Number(body.fulfillment_percentage || 0);
    if (fulfillment >= 70) classification = 'VALIDADA';
    else if (fulfillment < 40) classification = 'INVALIDADA';

    const { data, error } = await supabaseAdmin
      .from('mvt_results')
      .insert({
        mvt_process_id: process.id,
        test_id: body.test_id || null,
        target_metric: body.target_metric || null,
        actual_result: body.actual_result || null,
        difference: body.difference || null,
        fulfillment_percentage: fulfillment,
        classification: body.classification || classification,
        reasoning: body.reasoning || null
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, result: data });

  } catch (error: any) {
    console.error('[API-MVT-RESULTS] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
