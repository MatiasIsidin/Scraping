// ============================================================
// PAIN POINT EXTRACTION AI — Strict Relational V3.2
// Pipeline: IA Output (1:1) → SQL Insert (Step-by-Step)
// ============================================================

import { supabaseAdmin } from '@lib/supabaseClient';
import { callLLM } from './openRouterService';
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionUserPrompt,
} from '@lib/prompts/latam-prompts';

// ── Types ───────────────────────────────────────────────────

export interface ExtractionStats {
  run_id: string;
  transcripts_found: number;
  transcripts_processed: number;
  transcripts_skipped: number;
  pain_points_extracted: number;
  pain_points_rejected: number;
  pain_points_deduplicated_db: number;
  pain_points_inserted: number;
  sources_created: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  model_used: string;
  provider: string;
  errors: number;
  error_details: Array<{ video_id: string; message: string }>;
  results?: any[];
}

export interface ExtractionConfig {
  limit: number;
  version: string;
  dryRun?: boolean;
  minWordCount?: number;
}

// ── Main Logic ──────────────────────────────────────────────

export async function runPainPointExtractionBatch(config: ExtractionConfig): Promise<ExtractionStats> {
  const startTime = Date.now();
  const runId = `ext_${Date.now()}`;
  const stats: ExtractionStats = {
    run_id: runId,
    transcripts_found: 0,
    transcripts_processed: 0,
    transcripts_skipped: 0,
    pain_points_extracted: 0,
    pain_points_rejected: 0,
    pain_points_deduplicated_db: 0,
    pain_points_inserted: 0,
    sources_created: 0,
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_cost_usd: 0,
    model_used: 'google/gemini-pro-1.5-exp:free',
    provider: 'openrouter',
    errors: 0,
    error_details: [],
    results: []
  };

  try {
    // 1. Fetch pending transcripts
    const { data: transcripts, error: tErr } = await supabaseAdmin
      .from('transcripts')
      .select('youtube_video_id, transcript, word_count, status')
      .eq('status', 'success')
      .limit(config.limit);

    if (tErr) throw new Error(`Fetch transcripts failed: ${tErr.message}`);
    stats.transcripts_found = transcripts?.length || 0;
    if (!transcripts || transcripts.length === 0) return stats;

    const videoIds = transcripts.map(t => t.youtube_video_id);
    const { data: videos } = await supabaseAdmin
      .from('videos')
      .select('youtube_video_id, title')
      .in('youtube_video_id', videoIds);
    
    const videoMap = new Map(videos?.map(v => [v.youtube_video_id, v.title]));

    // 2. Iterate and process
    for (const t of transcripts) {
      if (config.minWordCount && t.word_count < config.minWordCount) {
        stats.transcripts_skipped++;
        continue;
      }

      const videoTitle = videoMap.get(t.youtube_video_id);
      
      if (!videoTitle) {
        console.warn(`[STRICT-REJECT] Video ID ${t.youtube_video_id} not found. Skipping.`);
        stats.errors++;
        stats.error_details.push({ video_id: t.youtube_video_id, message: 'Source video missing' });
        continue;
      }
      
      try {
        console.log(`[PIPELINE] Processing Video: ${t.youtube_video_id}`);

        const llmRes = await callLLM({
          messages: [
            { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
            { role: 'user', content: buildExtractionUserPrompt(videoTitle, t.transcript) }
          ],
          model: stats.model_used,
          pipelineTag: 'extraction_v3_batch'
        });

        if (!llmRes.success) throw new Error(llmRes.error);

        stats.total_input_tokens += llmRes.token_usage?.prompt_tokens || 0;
        stats.total_output_tokens += llmRes.token_usage?.completion_tokens || 0;
        stats.model_used = llmRes.model_used;
        stats.provider = llmRes.provider;

        const extracted = llmRes.parsed?.pain_points || [];
        stats.pain_points_extracted += extracted.length;

        for (const pp of extracted) {
          if (!pp.category || (pp.severity_score < 3 && pp.final_score < 3)) {
            stats.pain_points_rejected++;
            continue;
          }

          if (!config.dryRun) {
            // Duplication Check
            const { data: existing } = await supabaseAdmin
              .from('pain_points')
              .select('id')
              .eq('title', pp.title)
              .eq('video_id', t.youtube_video_id)
              .maybeSingle();

            if (existing) {
              stats.pain_points_deduplicated_db++;
              continue;
            }

            // Insert
            const { data: newPP, error: ppErr } = await supabaseAdmin
              .from('pain_points')
              .insert({
                video_id: t.youtube_video_id,
                title: pp.title,
                description: pp.description,
                category: pp.category,
                market_segment: pp.market_segment || 'LATAM General',
                severity_score: pp.severity_score || 5,
                frequency_score: pp.frequency_score || 5,
                recency_score: 0,
                final_score: pp.final_score || pp.severity_score || 5,
                version: config.version
              })
              .select('id')
              .single();

            if (ppErr) {
              stats.errors++;
              stats.error_details.push({ video_id: t.youtube_video_id, message: `PP Insert Failed: ${ppErr.message}` });
              continue;
            }

            stats.pain_points_inserted++;

            const sources = pp.sources || [{ source_name: `Video: ${videoTitle}`, source_type: 'video_transcript', evidence: pp.description }];
            for (const src of sources) {
              await supabaseAdmin
                .from('pain_point_sources')
                .insert({
                  pain_point_id: newPP.id,
                  source_name: src.source_name,
                  source_type: src.source_type,
                  source_url: src.source_url || `https://youtube.com/watch?v=${t.youtube_video_id}`,
                  country: src.country || 'LATAM',
                  evidence: src.evidence || 'Extracted from transcript',
                  credibility_score: src.credibility_score || 80
                });
              stats.sources_created++;
            }
          }
        }

        if (!config.dryRun) {
          await supabaseAdmin
            .from('transcripts')
            .update({ status: 'processed_for_intelligence' })
            .eq('youtube_video_id', t.youtube_video_id);
        }

        stats.transcripts_processed++;

      } catch (err: any) {
        stats.errors++;
        stats.error_details.push({ video_id: t.youtube_video_id, message: err.message });
      }
    }

    // Logging to extraction_logs (dedicated IA pipeline table)
    const duration = (Date.now() - startTime) / 1000;
    stats.total_cost_usd = (stats.total_input_tokens * 0.00000015) + (stats.total_output_tokens * 0.0000006);

    if (!config.dryRun) {
      // Log one summary entry per batch run
      await supabaseAdmin.from('extraction_logs').insert({
        video_id: `batch_${stats.transcripts_processed}_videos`,
        model_used: stats.model_used,
        tokens_used: stats.total_input_tokens + stats.total_output_tokens,
        cost_estimated: stats.total_cost_usd,
        status: stats.errors === 0 ? 'success' : 'partial',
        error_message: stats.errors > 0
          ? JSON.stringify({ run_id: runId, errors: stats.error_details, duration_s: duration })
          : null
      });
    }

  } catch (err: any) {
    stats.errors++;
    stats.error_details.push({ video_id: 'GLOBAL', message: err.message });
  }

  return stats;
}
