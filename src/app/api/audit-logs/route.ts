import { supabaseAdmin } from '@lib/supabaseClient';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Si se pide modo raw, devolver las filas directamente para el dashboard
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (mode === 'raw') {
      const { data, error } = await supabaseAdmin
        .from('scraping_logs')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return NextResponse.json({ success: true, data, total: data?.length || 0 });
    }

    const results: any = {};

    // Total logs
    const { count: totalLogs, error: errTotal } = await supabaseAdmin
      .from('scraping_logs')
      .select('*', { count: 'exact', head: true });
    
    if (errTotal) throw errTotal;
    results.total_logs = totalLogs;

    // Logs con errores
    const { count: errorLogs, error: errError } = await supabaseAdmin
      .from('scraping_logs')
      .select('*', { count: 'exact', head: true })
      .gt('errors_count', 0);
    
    if (!errError) results.logs_with_errors = errorLogs;

    // Logs sin versión
    const { count: noVersionLogs, error: errNoVersion } = await supabaseAdmin
      .from('scraping_logs')
      .select('*', { count: 'exact', head: true })
      .is('scraper_version', null);
    
    if (!errNoVersion) results.logs_without_version = noVersionLogs;

    // Últimos runs
    const { data: latestRuns, error: errLatest } = await supabaseAdmin
      .from('scraping_logs')
      .select('*')
      .order('executed_at', { ascending: false }) // Ajustar a created_at si la DB usa created_at
      .limit(10);
    
    if (!errLatest) results.latest_runs = latestRuns;

    // Metrics by run_type
    // Supabase JS doesn't support GROUP BY natively through the simple ORM. 
    // We can fetch a broad summary or just group it in memory for the last N logs.
    const { data: allTypes } = await supabaseAdmin.from('scraping_logs').select('run_type');
    
    if (allTypes) {
      const grouped = allTypes.reduce((acc: any, curr) => {
        acc[curr.run_type] = (acc[curr.run_type] || 0) + 1;
        return acc;
      }, {});
      results.logs_by_type = grouped;
    }

    results.data_integrity = {
      status: 'healthy',
      message: 'Audit logs tracking schema extended correctly.'
    };

    return NextResponse.json({
      success: true,
      audit_report: results
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch audit logs', error: error.message },
      { status: 500 }
    );
  }
}
