import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const report: any = {
      generated_at: new Date().toISOString(),
      counts: {},
      distributions: {},
      top_pain_points: [],
      recent_logs: []
    };

    // 1. Basic Counts
    const { count: totalPP } = await supabaseAdmin.from('pain_points').select('*', { count: 'exact', head: true });
    const { count: totalSources } = await supabaseAdmin.from('pain_point_sources').select('*', { count: 'exact', head: true });
    
    // Count enriched (Pain points that have at least one 'latam_intelligence' source)
    const { data: enrichedPP } = await supabaseAdmin
      .from('pain_point_sources')
      .select('pain_point_id')
      .eq('source_type', 'latam_intelligence');
    
    const uniqueEnrichedIds = new Set(enrichedPP?.map(s => s.pain_point_id));
    const enrichedCount = uniqueEnrichedIds.size;

    const { data: allPP } = await supabaseAdmin.from('pain_points').select('id, category, final_score, market_segment');

    report.counts = {
      total_pain_points: totalPP || 0,
      total_sources: totalSources || 0,
      enriched_count: enrichedCount,
      pending_enrichment: (totalPP || 0) - enrichedCount
    };

    // 2. Distributions
    if (allPP && allPP.length > 0) {
      const cats: Record<string, number> = {};
      const segments: Record<string, number> = {};
      let totalScore = 0;

      allPP.forEach(p => {
        cats[p.category] = (cats[p.category] || 0) + 1;
        segments[p.market_segment] = (segments[p.market_segment] || 0) + 1;
        totalScore += p.final_score || 0;
      });

      report.distributions = {
        categories: cats,
        market_segments: segments,
        average_score: Math.round((totalScore / allPP.length) * 100) / 100
      };
    }

    // 3. Top Pain Points (Detailed)
    const { data: topPP } = await supabaseAdmin
      .from('pain_points')
      .select('*, pain_point_sources(*)')
      .order('final_score', { ascending: false })
      .limit(10);
    
    report.top_pain_points = topPP || [];

    // 4. Recent Logs
    const { data: logs } = await supabaseAdmin
      .from('scraping_logs')
      .select('*')
      .eq('run_type', 'pain_point_extraction')
      .order('executed_at', { ascending: false })
      .limit(5);
    
    report.recent_logs = logs || [];

    return NextResponse.json({
      success: true,
      report
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
