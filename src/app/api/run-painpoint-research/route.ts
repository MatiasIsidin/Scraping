import { NextResponse } from 'next/server';
import { collectMarketData } from '../../../../services/marketPainPointCollector';
import { extractPainPointsFromText, clusterAndScorePainPoints, ExtractedPainPoint, IntelligenceStats } from '../../../../services/painPointIntelligence';
import { savePainPointsToDB } from '../../../../services/painPointStorage';
import { logScrapingExecution } from '../../../../services/logService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const RESEARCH_VERSION = "v1_market_research";
    
    // 1. RECOLECCIÓN
    console.log(`--- [1/4] Iniciando Recolección ---`);
    const rawData = await collectMarketData();
    
    if (!rawData || rawData.length === 0) {
      return NextResponse.json({ success: false, message: 'No se encontraron datos en las fuentes.' }, { status: 404 });
    }

    // 2. EXTRACCIÓN IA
    console.log(`--- [2/4] Extracción IA (${rawData.length} docs) ---`);
    let allExtracted: ExtractedPainPoint[] = [];
    
    // Iteramos secuencial
    for (const doc of rawData) {
      const extracted = await extractPainPointsFromText(doc);
      if (extracted.length > 0) {
        allExtracted = allExtracted.concat(extracted);
      }
    }

    if (allExtracted.length === 0) {
      return NextResponse.json({ success: true, message: 'low_signal_document: Ningún texto analizado contenía señales suficientes.', raw_docs_count: rawData.length });
    }

    // 3. AGRUPACIÓN Y SCORING CON FILTROS DE CONFIANZA
    console.log(`--- [3/4] Agrupación y Scoring (${allExtracted.length} pain points iniciales) ---`);
    const stats: IntelligenceStats = { extractedTotal: 0, discardedLowConfidence: 0, mergedClusters: 0, confidenceSum: 0 };
    const clusteredPainPoints = clusterAndScorePainPoints(allExtracted, stats);

    const validItems = stats.extractedTotal - stats.discardedLowConfidence;
    const avgConfidence = validItems > 0 ? (stats.confidenceSum / validItems).toFixed(2) : 0;

    // FASE 5: LOGGING MEJORADO
    console.log(`[PAINPOINT] confidence avg: ${avgConfidence}`);
    console.log(`[PAINPOINT] discarded_low_confidence: ${stats.discardedLowConfidence}`);
    console.log(`[PAINPOINT] merged_clusters: ${stats.mergedClusters}`);

    if (clusteredPainPoints.length === 0) {
      return NextResponse.json({ success: true, message: 'Todos los pain points fueron descartados por baja confianza.', stats });
    }

    // 4. PERSISTENCIA
    console.log(`--- [4/4] Guardando en BD (${clusteredPainPoints.length} clusters finales) ---`);
    const dbResult = await savePainPointsToDB(clusteredPainPoints, RESEARCH_VERSION);

    // 5. REGISTRO EN LOGS
    await logScrapingExecution({
      run_type: 'market_painpoint_research',
      scraper_version: RESEARCH_VERSION,
      status: dbResult.success ? 'success' : 'error',
      source: 'reddit_and_mock',
      videos_found: rawData.length,
      new_videos: clusteredPainPoints.length,
      errors_count: dbResult.success ? 0 : 1,
      error_details: { 
        extracted_total: allExtracted.length,
        discarded_low_confidence: stats.discardedLowConfidence,
        merged_clusters: stats.mergedClusters,
        avg_confidence: avgConfidence
      }
    });

    if (!dbResult.success) {
      throw new Error(dbResult.error || 'Error guardando en base de datos.');
    }

    // FASE 6: REPORTE DEL ENDPOINT
    return NextResponse.json({
      success: true,
      report: {
        version: RESEARCH_VERSION,
        documents_analyzed: rawData.length,
        pain_points_extracted: stats.extractedTotal,
        discarded_low_confidence: stats.discardedLowConfidence,
        merged_clusters: stats.mergedClusters,
        final_clusters_generated: clusteredPainPoints.length,
        average_confidence: avgConfidence,
        top_pain_points: clusteredPainPoints.slice(0, 5)
      }
    });

  } catch (error: any) {
    console.error(`[RESEARCH-ERROR] Pipeline falló:`, error.message);
    
    await logScrapingExecution({
      run_type: 'market_painpoint_research',
      status: 'error',
      errors_count: 1,
      error_details: { message: error.message }
    });

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Permitir GET para testing rápido desde navegador
export async function GET(request: Request) {
  return POST(request);
}
