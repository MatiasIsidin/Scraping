import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

export async function GET() {
  try {
    const [
      { count: totalVideos },
      { count: totalTranscripts },
      { count: totalPainPoints },
      { count: totalSources },
      lastLogRes,
      { count: totalClassifications },
      recentClassificationsRes
    ] = await Promise.all([
      supabaseAdmin.from('videos').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('transcripts').select('*', { count: 'exact', head: true }).eq('status', 'success'),
      supabaseAdmin.from('pain_points').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('pain_point_sources').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('scraping_logs').select('executed_at').order('executed_at', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('video_classifications').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('video_classifications')
        .select(`
          relevance_score,
          reasoning,
          videos(title),
          pain_points(title)
        `)
        .order('created_at', { ascending: false })
        .limit(3)
    ]);

    // Severity average calculation
    let avgSeverity = 0;
    const { data: ppScores } = await supabaseAdmin.from('pain_points').select('severity_score');
    if (ppScores && ppScores.length > 0) {
      avgSeverity = ppScores.reduce((acc, curr) => acc + (curr.severity_score || 0), 0) / ppScores.length;
    }

    return NextResponse.json({
      totalVideos: totalVideos || 0,
      totalTranscripts: totalTranscripts || 0,
      totalPainPoints: totalPainPoints || 0,
      totalSources: totalSources || 0,
      successRate: totalVideos ? ((totalTranscripts || 0) / totalVideos) * 100 : 0,
      avgSeverity: Math.round(avgSeverity * 10) / 10,
      lastExecution: lastLogRes.data?.executed_at || null,
      totalClassifications: totalClassifications || 0,
      recentClassifications: recentClassificationsRes.data || []
    });
  } catch (error: unknown) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
