import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

export const dynamic = 'force-dynamic';

/**
 * GET /api/audit-painpoints
 * Returns a comprehensive audit report of all pain point data:
 *   - Total counts, score distributions, category breakdown
 *   - Quality analysis (enriched vs non-enriched, validated vs pending)
 *   - Extraction and enrichment run history
 *   - Top pain points by composite score
 *   - Duplicate detection summary
 */
export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    const report: any = {
      generated_at: new Date().toISOString(),
    };

    // ── 1. Overall Counts ─────────────────────────────────
    // Resilient counts: try Sprint 3 filters, fallback to basic if missing
    const getCount = async (table: string, filter?: any) => {
      try {
        let q = supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
        if (filter) {
          for (const [k, v] of Object.entries(filter)) {
            q = q.eq(k, v);
          }
        }
        const { count, error } = await q;
        if (error) {
           // Fallback: try without filter if error is about missing column
           if (error.message.includes('column')) {
             const { count: c2 } = await supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
             return c2 || 0;
           }
           return 0;
        }
        return count || 0;
      } catch { return 0; }
    };

    const totalPainPoints = await getCount('pain_points');
    const enrichedCount = await getCount('pain_points', { enriched: true }); // Dummy filter to trigger check or similar
    
    // Check enrichment by looking at latam_relevance_score or final_score > 0
    const { count: realEnriched } = await supabaseAdmin
      .from('pain_points')
      .select('*', { count: 'exact', head: true })
      .or('latam_relevance_score.gt.0,final_score.gt.0');

    const validatedCount = await getCount('pain_points', { is_validated: true });
    const totalSources = await getCount('pain_point_sources');
    const totalTranscripts = await getCount('transcripts', { status: 'success' });
    const processedTranscripts = await getCount('transcripts', { processed_for_painpoints: true });

    report.counts = {
      total_pain_points: totalPainPoints,
      enriched_with_latam: realEnriched || 0,
      pending_enrichment: totalPainPoints - (realEnriched || 0),
      validated: validatedCount,
      total_sources: totalSources,
      transcripts_available: totalTranscripts,
      transcripts_processed: processedTranscripts,
      transcripts_pending: totalTranscripts - processedTranscripts,
    };

    // ── 2. Category Distribution ──────────────────────────
    const { data: allPP, error: catErr } = await supabaseAdmin
      .from('pain_points')
      .select('category, severity, severity_score, opportunity_score, composite_score, final_score, frequency_count');

    if (catErr) {
      report.error = `Could not fetch categories: ${catErr.message}`;
    } else if (allPP && allPP.length > 0) {
      const catGroups: Record<string, number> = {};
      let totalSeverity = 0;
      let totalOpp = 0;
      let totalComposite = 0;
      let maxComposite = 0;
      let totalFreq = 0;

      for (const pp of allPP) {
        catGroups[pp.category] = (catGroups[pp.category] || 0) + 1;
        totalSeverity += pp.severity || 0;
        totalOpp += pp.opportunity_score || 0;
        totalComposite += pp.composite_score || 0;
        totalFreq += pp.frequency_count || 0;
        if ((pp.composite_score || 0) > maxComposite) maxComposite = pp.composite_score;
      }

      report.distribution = {
        by_category: catGroups,
        averages: {
          severity: Math.round((totalSeverity / allPP.length) * 100) / 100,
          opportunity: Math.round((totalOpp / allPP.length) * 100) / 100,
          composite_score: Math.round((totalComposite / allPP.length) * 100) / 100,
          frequency: Math.round((totalFreq / allPP.length) * 100) / 100,
        },
        max_composite_score: maxComposite,
      };

      // Duplicate analysis: pain points with frequency > 1
      const duplicates = allPP.filter((pp) => (pp.frequency_count || 0) > 1);
      report.quality = {
        unique_pain_points: allPP.length - duplicates.length,
        multi_source_pain_points: duplicates.length,
        enrichment_coverage: allPP.length > 0
          ? `${Math.round(((enrichedCount || 0) / allPP.length) * 100)}%`
          : '0%',
      };
    }

    // ── 3. Top Pain Points ────────────────────────────────
    // Try to find the correct column for sorting
    const scoreCol = (allPP && allPP[0] && 'composite_score' in allPP[0]) ? 'composite_score' : 'final_score';
    
    const { data: topPP } = await supabaseAdmin
      .from('pain_points')
      .select('*')
      .order(scoreCol, { ascending: false })
      .limit(10);

    report.top_pain_points = topPP || [];

    // ── 4. Extraction Logs ────────────────────────────────
    const { data: logs } = await supabaseAdmin
      .from('extraction_logs')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(10);

    report.recent_extraction_logs = logs || [];

    // Aggregate extraction costs
    if (logs && logs.length > 0) {
      let totalCost = 0;
      let totalTokensIn = 0;
      let totalTokensOut = 0;
      for (const log of logs) {
        totalCost += log.estimated_cost_usd || 0;
        totalTokensIn += log.total_input_tokens || 0;
        totalTokensOut += log.total_output_tokens || 0;
      }
      report.cost_summary = {
        total_cost_usd: Math.round(totalCost * 10000) / 10000,
        total_input_tokens: totalTokensIn,
        total_output_tokens: totalTokensOut,
        runs_count: logs.length,
      };
    }

    // ── 5. Detailed data (optional) ───────────────────────
    if (detailed) {
      const { data: allPPDetailed } = await supabaseAdmin
        .from('pain_points')
        .select('*, pain_point_sources(*)')
        .eq('is_active', true)
        .order('composite_score', { ascending: false })
        .limit(50);

      report.detailed_pain_points = allPPDetailed || [];
    }

    report.duration_ms = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      audit_report: report,
    });
  } catch (error: any) {
    console.error('[API-ERROR] audit-painpoints:', error.message);
    return NextResponse.json(
      { success: false, error: error.message, duration_ms: Date.now() - startTime },
      { status: 500 }
    );
  }
}
