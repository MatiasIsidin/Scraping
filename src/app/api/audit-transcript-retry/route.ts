import { supabaseAdmin } from '@lib/supabaseClient';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const results: any = {};

    // Estado general de transcripts
    const { data: allStatuses, error: errStatus } = await supabaseAdmin
      .from('transcripts')
      .select('status, retry_count');
    
    if (errStatus) throw errStatus;

    if (allStatuses) {
      const summary = allStatuses.reduce((acc: any, curr) => {
        const s = curr.status || 'unknown';
        acc[s] = (acc[s] || 0) + 1;
        if (curr.retry_count && curr.retry_count > 0) {
          acc.total_retried = (acc.total_retried || 0) + 1;
        }
        return acc;
      }, { success: 0, failed: 0, retry_success: 0, failed_final: 0, total_retried: 0 });
      
      results.status_distribution = summary;
    }

    // Calcular faltantes directos (videos sin nada en transcripts)
    const { count: missingCount, error: errMissing } = await supabaseAdmin
      .from('videos')
      .select('youtube_video_id, transcripts!left(youtube_video_id)', { count: 'exact', head: true })
      .is('transcripts', null);
    
    if (!errMissing) results.total_missing_completely = missingCount;

    results.system_health = {
      overall_status: (results.status_distribution?.failed_final > 100) ? 'warning' : 'healthy',
      total_missing: (missingCount || 0) + (results.status_distribution?.failed || 0)
    };

    return NextResponse.json({
      success: true,
      retry_audit: results
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch transcript retry audit', error: error.message },
      { status: 500 }
    );
  }
}
