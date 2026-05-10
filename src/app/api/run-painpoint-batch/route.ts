import { NextResponse } from 'next/server';
import { runPainPointExtractionBatch } from '@services/painPointExtractionAI';
import { runLatamEnrichmentBatch } from '@services/latamEnrichmentService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '3');
    const dryRun = searchParams.get('dryRun') === 'true';
    const enrich = searchParams.get('enrich') !== 'false'; // Default to true

    console.log(`\n[BATCH-API] Starting full pipeline | Limit: ${limit} | Enrich: ${enrich} | DryRun: ${dryRun}`);

    // 1. Extraction Phase
    const extractionStats = await runPainPointExtractionBatch({
      limit,
      version: 'v3-batch'
    });

    let enrichmentStats = null;

    // 2. Enrichment Phase (if extraction found something and requested)
    if (enrich && !dryRun && (extractionStats.pain_points_inserted > 0)) {
      console.log(`[BATCH-API] Starting enrichment for ${extractionStats.pain_points_inserted} new pain points...`);
      enrichmentStats = await runLatamEnrichmentBatch({
        limit: extractionStats.pain_points_inserted + 2, // Slightly more to catch pending ones
        dryRun: false,
        version: 'v3-batch-enrich'
      });
    }

    return NextResponse.json({
      success: extractionStats.errors === 0,
      run_id: extractionStats.run_id,
      message: enrichmentStats 
        ? `Pipeline completado: ${extractionStats.pain_points_inserted} extraídos, ${enrichmentStats.pain_points_enriched} enriquecidos.`
        : `Extracción completada: ${extractionStats.pain_points_inserted} extraídos.`,
      stats: {
        extraction: extractionStats,
        enrichment: enrichmentStats
      }
    });

  } catch (error: any) {
    console.error(`[BATCH-API] Fatal Error: ${error.message}`);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
