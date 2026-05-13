// ============================================================
// VIDEO CLASSIFICATION SERVICE — Enhanced Milestone 4
// Features: Versioning, Re-classification logic, Error handling
// ============================================================

import { supabaseAdmin } from '@lib/supabaseClient';
import { callLLM } from './openRouterService';
import { 
  ANALYSIS_SYSTEM_PROMPT, 
  buildVideoAnalysisPrompt, 
  buildClassificationPrompt 
} from '@lib/prompts/classification-prompts';

export interface ClassificationStats {
  videos_processed: number;
  analyses_created: number;
  classifications_created: number;
  total_tokens: number;
  estimated_cost: number;
  errors: string[];
}

export class VideoClassificationService {
  private readonly VERSION = 'v1.1-hito4'; // Incrementamos versión para Hito 4
  private readonly MODEL = 'openai/gpt-4o-mini';

  /**
   * Ejecuta clasificación batch evitando duplicados por versión
   */
  async runBatchClassification(limit: number = 5): Promise<ClassificationStats> {
    const stats: ClassificationStats = {
      videos_processed: 0,
      analyses_created: 0,
      classifications_created: 0,
      total_tokens: 0,
      estimated_cost: 0,
      errors: []
    };

    try {
      // 1. Obtener videos procesados para esta versión para excluirlos
      const { data: processed } = await supabaseAdmin
        .from('video_analysis')
        .select('youtube_video_id')
        .eq('extraction_version', this.VERSION);
      
      const processedIds = new Set(processed?.map(p => p.youtube_video_id) || []);

      // 2. Obtener videos con transcripts exitosos
      const { data: allPending, error: fetchErr } = await supabaseAdmin
        .from('transcripts')
        .select(`
          youtube_video_id,
          transcript,
          videos!inner(title)
        `)
        .eq('status', 'success')
        .order('updated_at', { ascending: false });

      if (fetchErr) throw fetchErr;

      const pendingVideos = (allPending || [])
        .filter(v => !processedIds.has(v.youtube_video_id))
        .slice(0, limit);

      if (pendingVideos.length === 0) {
        console.log(`[CLASSIFIER] No hay videos pendientes para la versión ${this.VERSION}.`);
        return stats;
      }

      // 3. Obtener Pain Points
      const { data: painPoints } = await supabaseAdmin
        .from('pain_points')
        .select('id, title, description')
        .eq('is_active', true)
        .limit(50);

      for (const item of pendingVideos) {
        const videoId = item.youtube_video_id;
        const videoTitle = (item.videos as any).title;
        
        try {
          // --- ANALISIS ---
          const anaRes = await callLLM({
            messages: [{ role: 'system', content: ANALYSIS_SYSTEM_PROMPT }, { role: 'user', content: buildVideoAnalysisPrompt(videoTitle, item.transcript) }],
            model: this.MODEL,
            pipelineTag: 'video_analysis'
          });

          if (!anaRes.success) throw new Error(anaRes.error);
          const ba = anaRes.parsed.business_analysis;

          const { data: newAna, error: anaErr } = await supabaseAdmin
            .from('video_analysis')
            .upsert({
              youtube_video_id: videoId,
              business_summary: ba.business_summary,
              business_model: ba.business_model,
              core_mechanic: ba.core_mechanic,
              extraction_model: this.MODEL,
              extraction_version: this.VERSION,
              extraction_confidence: ba.extraction_confidence
            }, { onConflict: 'youtube_video_id, extraction_version' })
            .select('id').single();

          if (anaErr) throw anaErr;
          stats.analyses_created++;

          // --- CLASIFICACION ---
          const classRes = await callLLM({
            messages: [{ role: 'system', content: ANALYSIS_SYSTEM_PROMPT }, { role: 'user', content: buildClassificationPrompt(videoTitle, ba, painPoints || []) }],
            model: this.MODEL,
            pipelineTag: 'video_classification'
          });

          if (classRes.success) {
            for (const c of classRes.parsed.classifications) {
              await supabaseAdmin.from('video_classifications').upsert({
                youtube_video_id: videoId,
                pain_point_id: c.pain_point_id,
                analysis_id: newAna.id,
                classification_version: this.VERSION,
                business_model: ba.business_model,
                latam_relevance_score: c.relevance_score,
                confidence_score: c.confidence_score,
                reasoning: c.reasoning
              }, { onConflict: 'youtube_video_id, pain_point_id, classification_version' });
              stats.classifications_created++;
            }
          }

          stats.videos_processed++;
          stats.total_tokens += (anaRes.token_usage?.total_tokens || 0) + (classRes.token_usage?.total_tokens || 0);

        } catch (err: any) {
          stats.errors.push(`${videoId}: ${err.message}`);
        }
      }

      stats.estimated_cost = (stats.total_tokens / 1000000) * 0.20;
      return stats;

    } catch (err: any) {
      stats.errors.push(`Fatal: ${err.message}`);
      return stats;
    }
  }
}

export const videoClassificationService = new VideoClassificationService();
