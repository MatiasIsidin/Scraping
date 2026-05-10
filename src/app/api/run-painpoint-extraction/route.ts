import { NextResponse } from 'next/server';
import { runPainPointExtractionBatch } from '../../../../services/painPointExtractionAI';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/run-painpoint-extraction
 * Executes the pain point extraction pipeline from transcripts.
 *
 * Query params:
 *   - limit: max transcripts to process (default: 10)
 *   - version: extraction version tag (default: v1)
 *   - dryRun: if "true", extract but don't persist (default: false)
 *   - minWords: minimum word count for transcript (default: 50)
 */
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const version = searchParams.get('version') || 'v1';
    const dryRun = searchParams.get('dryRun') === 'true';
    const minWordCount = parseInt(searchParams.get('minWords') || '50');

    console.log(`[API] run-painpoint-extraction | limit=${limit} version=${version} dryRun=${dryRun}`);

    const stats = await runPainPointExtractionBatch({
      limit,
      version,
      dryRun,
      minWordCount,
    });

    return NextResponse.json({
      success: stats.errors === 0,
      run_id: stats.run_id,
      message: stats.errors > 0
        ? `Extracción parcial: ${stats.pain_points_extracted} extraídos con ${stats.errors} errores.`
        : `Extracción completada: ${stats.pain_points_extracted} pain points de ${stats.transcripts_processed} transcripts.`,
      stats: {
        transcripts_found: stats.transcripts_found,
        transcripts_processed: stats.transcripts_processed,
        transcripts_skipped: stats.transcripts_skipped,
        pain_points_extracted: stats.pain_points_extracted,
        pain_points_rejected: stats.pain_points_rejected,
        pain_points_deduplicated_db: stats.pain_points_deduplicated_db,
        sources_created: stats.sources_created,
        tokens: {
          input: stats.total_input_tokens,
          output: stats.total_output_tokens,
        },
        cost_usd: stats.total_cost_usd,
        model: stats.model_used,
        provider: stats.provider,
        errors: stats.errors,
        duration_ms: Date.now() - startTime,
      },
      // Include full results only in dryRun mode
      ...(dryRun && { results: stats.results }),
    });
  } catch (error: any) {
    console.error('[API-ERROR] run-painpoint-extraction:', error.message);
    return NextResponse.json(
      { success: false, error: error.message, duration_ms: Date.now() - startTime },
      { status: 500 }
    );
  }
}

/**
 * GET /api/run-painpoint-extraction
 * Returns endpoint documentation.
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/run-painpoint-extraction',
    method: 'POST',
    description: 'Extrae pain points desde transcripts usando OpenRouter/OpenAI.',
    parameters: {
      limit: 'Máx transcripts a procesar (default: 10)',
      version: 'Versión de extracción para versionado (default: v1)',
      dryRun: 'Si "true", extrae pero no persiste en DB (default: false)',
      minWords: 'Mín palabras del transcript (default: 50)',
    },
    example: 'POST /api/run-painpoint-extraction?limit=5&version=v1&dryRun=true',
  });
}
