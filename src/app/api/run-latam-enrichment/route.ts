import { NextResponse } from 'next/server';
import { runLatamEnrichmentBatch } from '../../../../services/latamEnrichmentService';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/run-latam-enrichment
 * Enriches extracted pain points with LATAM-specific market context.
 *
 * Query params:
 *   - limit: max pain points to enrich (default: 10)
 *   - dryRun: if "true", enrich but don't persist (default: false)
 *   - minScore: minimum composite_score threshold (default: 0)
 */
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const dryRun = searchParams.get('dryRun') === 'true';
    const minScore = parseFloat(searchParams.get('minScore') || '0');

    console.log(`[API] run-latam-enrichment | limit=${limit} dryRun=${dryRun} minScore=${minScore}`);

    const stats = await runLatamEnrichmentBatch({
      limit,
      dryRun,
      minCompositeScore: minScore,
    });

    return NextResponse.json({
      success: stats.errors === 0,
      run_id: stats.run_id,
      message: stats.errors > 0
        ? `Enriquecimiento parcial: ${stats.pain_points_enriched} enriquecidos con ${stats.errors} errores.`
        : `Enriquecimiento LATAM completado: ${stats.pain_points_enriched} pain points contextualizados.`,
      stats: {
        pain_points_found: stats.pain_points_found,
        pain_points_enriched: stats.pain_points_enriched,
        pain_points_skipped: stats.pain_points_skipped,
        tokens: {
          input: stats.total_input_tokens,
          output: stats.total_output_tokens,
        },
        cost_usd: stats.total_cost_usd,
        model: stats.model_used,
        errors: stats.errors,
        duration_ms: Date.now() - startTime,
      },
      results: stats.results.map((r) => ({
        pain_point_id: r.pain_point_id,
        title: r.title,
        final_latam_score: r.final_latam_score,
        most_affected_countries: r.latam.most_affected_countries,
        market_validation: r.latam.market_validation_score,
        latam_fit: r.latam.latam_fit_score,
        references_count: r.latam.references.length,
      })),
    });
  } catch (error: any) {
    console.error('[API-ERROR] run-latam-enrichment:', error.message);
    return NextResponse.json(
      { success: false, error: error.message, duration_ms: Date.now() - startTime },
      { status: 500 }
    );
  }
}

/**
 * GET /api/run-latam-enrichment
 * Returns endpoint documentation.
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/run-latam-enrichment',
    method: 'POST',
    description: 'Enriquece pain points extraídos con contexto de mercado LATAM.',
    parameters: {
      limit: 'Máx pain points a enriquecer (default: 10)',
      dryRun: 'Si "true", enriquece pero no persiste (default: false)',
      minScore: 'Score compuesto mínimo para filtrar (default: 0)',
    },
    example: 'POST /api/run-latam-enrichment?limit=5&dryRun=true',
  });
}
