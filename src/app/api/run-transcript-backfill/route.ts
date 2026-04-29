import { NextResponse } from 'next/server';
import { runTranscriptBackfill } from '../../../../services/transcriptBackfillService';

export const dynamic = 'force-dynamic';


/**
 * ENDPOINT: /api/run-transcript-backfill
 * Permite ejecutar manualmente el backfill de transcripciones para videos existentes.
 * 
 * Query Params opcionales:
 * - limit: Cantidad de videos a procesar (default 10)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    console.log(`[API-BACKFILL] Iniciando ejecución manual. Limit: ${limit}`);
    
    const results = await runTranscriptBackfill(limit);

    return NextResponse.json({
      success: results.success,
      pending_total: results.pending_total,
      checked: results.checked,
      processed_count: results.processed_count,
      inserted: results.inserted,
      skipped: results.skipped,
      fallback_used: results.fallback_used,
      errors: results.errors,
      message: results.message || "Proceso completado"
    });

  } catch (error: any) {
    console.error(`[API-BACKFILL-ERROR]`, error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

// También permitimos POST por si se prefiere
export async function POST(request: Request) {
  return GET(request);
}
