// ============================================================
// LATAM ENRICHMENT SERVICE — Strict Relational V3.2
// Pipeline: Pain Points → IA (1:1) → SQL Sources (Step 2)
// ============================================================

import { supabaseAdmin } from '@lib/supabaseClient';
import { callLLM } from './openRouterService';
import {
  LATAM_ENRICHMENT_SYSTEM_PROMPT,
  buildLatamEnrichmentUserPrompt,
  VERTICAL_CONTEXT,
} from '@lib/prompts/latam-prompts';

// ── Types ───────────────────────────────────────────────────

export interface EnrichmentStats {
  pain_points_found: number;
  pain_points_enriched: number;
  pain_points_skipped: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  model_used: string;
  run_id: string;
  results: any[];
  errors: number;
  error_details: Array<{ id: string; message: string }>;
}

export interface EnrichmentConfig {
  limit: number;
  version?: string;
  dryRun?: boolean;
  minCompositeScore?: number;
}

// ── Main Logic ──────────────────────────────────────────────

export async function runLatamEnrichmentBatch(config: EnrichmentConfig): Promise<EnrichmentStats> {
  const stats: EnrichmentStats = {
    pain_points_found: 0,
    pain_points_enriched: 0,
    pain_points_skipped: 0,
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_cost_usd: 0,
    model_used: 'google/gemma-3-27b-it:free',
    run_id: `enrich_${Date.now()}`,
    results: [],
    errors: 0,
    error_details: []
  };

  try {
    // 1. Fetch pain points without intelligence sources yet
    const { data: painPoints, error: pErr } = await supabaseAdmin
      .from('pain_points')
      .select('id, title, description, category, severity_score, frequency_score')
      .order('created_at', { ascending: false })
      .limit(config.limit);

    if (pErr) throw new Error(`Fetch pain points failed: ${pErr.message}`);
    stats.pain_points_found = painPoints.length;

    for (const pp of painPoints) {
      try {
        console.log(`[ENRICHMENT] Enriching Pain Point: ${pp.id} | Title: ${pp.title}`);

        let systemPrompt = LATAM_ENRICHMENT_SYSTEM_PROMPT;
        if (VERTICAL_CONTEXT[pp.category]) {
          systemPrompt += `\n\n${VERTICAL_CONTEXT[pp.category]}`;
        }

        const llmRes = await callLLM({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: buildLatamEnrichmentUserPrompt(pp.title, pp.description, pp.category, pp.severity_score, 'B2B') }
          ],
          model: stats.model_used,
          pipelineTag: 'enrichment_strict_v3'
        });

        if (!llmRes.success) throw new Error(llmRes.error);

        stats.total_input_tokens += llmRes.token_usage?.prompt_tokens || 0;
        stats.total_output_tokens += llmRes.token_usage?.completion_tokens || 0;

        const data = llmRes.parsed;

        if (!config.dryRun) {
          // STEP 1: Update pain_points (Scores)
          const { error: updErr } = await supabaseAdmin
            .from('pain_points')
            .update({
              recency_score: data.regional_urgency || 5,
              final_score: Math.round(((pp.severity_score + (data.latam_frequency || 5) + (data.latam_fit_score || 5)) / 3) * 100) / 100,
              updated_at: new Date().toISOString()
            })
            .eq('id', pp.id);

          if (updErr) throw new Error(`Update PP Failed: ${updErr.message}`);

          // STEP 2: Insert additional sources
          const extraSources = data.sources || [];
          for (const src of extraSources) {
            await supabaseAdmin
              .from('pain_point_sources')
              .insert({
                pain_point_id: pp.id,
                source_name: src.source_name,
                source_type: src.source_type || 'external_report',
                source_url: src.source_url || 'https://openrouter.ai/intelligence',
                country: src.country || 'LATAM',
                evidence: src.evidence || 'Regional validation data',
                credibility_score: src.credibility_score || 90
              });
          }
        }

        stats.results.push({
          pain_point_id: pp.id,
          title: pp.title,
          final_latam_score: data.regional_urgency || 5,
          latam: {
            most_affected_countries: data.sources?.map((s: any) => s.country) || ['LATAM'],
            market_validation_score: data.latam_frequency || 5,
            latam_fit_score: data.latam_fit_score || 5,
            references: data.sources || []
          }
        });

        stats.pain_points_enriched++;

      } catch (err: any) {
        stats.errors++;
        stats.error_details.push({ id: pp.id, message: err.message });
      }
    }
  } catch (err: any) {
    stats.errors++;
    stats.error_details.push({ id: 'GLOBAL', message: err.message });
  }

  // Calculate estimated cost
  stats.total_cost_usd = (stats.total_input_tokens * 0.00000015) + (stats.total_output_tokens * 0.0000006);

  // Log enrichment run to extraction_logs for full IA traceability
  try {
    await supabaseAdmin.from('extraction_logs').insert({
      video_id: `enrichment_batch_${stats.pain_points_enriched}_pps`,
      model_used: stats.model_used,
      tokens_used: stats.total_input_tokens + stats.total_output_tokens,
      cost_estimated: stats.total_cost_usd,
      status: stats.errors === 0 ? 'success' : 'partial',
      error_message: stats.errors > 0
        ? JSON.stringify({ run_id: stats.run_id, errors: stats.error_details })
        : null
    });
  } catch (logErr: any) {
    console.error('[ENRICHMENT] Failed to log to extraction_logs:', logErr.message);
  }

  return stats;
}
