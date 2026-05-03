import { supabaseAdmin } from '@lib/supabaseClient';
import { ClusteredPainPoint } from './painPointIntelligence';

/**
 * FASE 6: BASE DE DATOS
 */
export async function savePainPointsToDB(painPoints: ClusteredPainPoint[], version: string = 'v1_market_research') {
  if (painPoints.length === 0) return { success: true, inserted: 0 };

  try {
    const payload = painPoints.map(p => ({
      title: p.title.substring(0, 255),
      description: p.description,
      category: p.category,
      market_segment: p.market_segment,
      severity_score: p.severity_score,
      frequency_score: p.frequency_score,
      recency_score: p.recency_score,
      final_score: p.final_score,
      evidence_sources: p.evidence_sources,
      version: version,
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabaseAdmin
      .from('pain_points')
      .insert(payload);
      
    if (error) {
      console.error(`[STORAGE-ERROR] No se pudieron guardar pain points:`, error.message);
      return { success: false, error: error.message };
    }

    return { success: true, inserted: payload.length };

  } catch (error: any) {
    console.error(`[STORAGE-CRITICAL] Error guardando pain points:`, error.message);
    return { success: false, error: error.message };
  }
}
