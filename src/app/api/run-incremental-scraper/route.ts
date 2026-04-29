import { NextResponse } from 'next/server';
import { runIncrementalScrape } from '../../../../services/incrementalScraperService';

export const dynamic = 'force-dynamic';

/**
 * ENDPOINT: /api/run-incremental-scraper
 * Ejecuta el pipeline de scraping optimizado para producción.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const threshold = parseInt(searchParams.get('threshold') || '5', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const runType = searchParams.get('run_type') || 'manual';

    console.log(`--- [API] Iniciando Incremental Scraper (Type: ${runType}, Threshold: ${threshold}) ---`);
    
    const results = await runIncrementalScrape(threshold, limit, runType);

    return NextResponse.json({
      success: results.success,
      fetched: results.total_fetched,
      inserted: results.inserted_count,
      skipped_existing: results.skipped_existing,
      transcripts_created: results.transcripts_created,
      fallback_used: results.fallback_used,
      snapshots_created: results.snapshots_created,
      api_optimized: true,
      scraper_version: results.scraper_version,
      early_stop_triggered: results.early_stop_triggered,
      errors: results.errors
    });

  } catch (error: any) {
    console.error(`[API-INCREMENTAL-ERROR]`, error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
