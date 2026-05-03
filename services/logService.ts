import { supabaseAdmin } from '@lib/supabaseClient';

export interface ScrapingExecutionLog {
  run_type: string;
  scraper_version?: string;
  status: 'success' | 'error' | 'partial';
  source?: string;
  videos_found?: number;
  new_videos?: number;
  skipped_existing?: number;
  transcripts_created?: number;
  fallback_used?: number;
  snapshots_created?: number;
  errors_count?: number;
  error_details?: any;
  execution_time_seconds?: number;
  api_calls_estimated?: number;
}

/**
 * Standardized function to log any scraping pipeline execution
 * with full traceability.
 */
export async function logScrapingExecution(logData: ScrapingExecutionLog) {
  try {
    const version = process.env.SCRAPER_VERSION || logData.scraper_version || 'v2_unknown';

    // Manejo de error_details, convirtiendo a string si es objeto y agregando fallback por si acaso
    const errorDetailsPayload = typeof logData.error_details === 'object' 
      ? JSON.stringify(logData.error_details) 
      : logData.error_details;

    const { error } = await supabaseAdmin
      .from('scraping_logs')
      .insert([
        {
          run_type: logData.run_type,
          scraper_version: version,
          status: logData.status,
          source: logData.source || 'unknown',
          videos_found: logData.videos_found || 0,
          new_videos: logData.new_videos || 0,
          skipped_existing: logData.skipped_existing || 0,
          transcripts_created: logData.transcripts_created || 0,
          fallback_used: logData.fallback_used || 0,
          snapshots_created: logData.snapshots_created || 0,
          errors_count: logData.errors_count || 0,
          error_details: errorDetailsPayload,
          execution_time_seconds: logData.execution_time_seconds || 0,
          api_calls_estimated: logData.api_calls_estimated || 0,
          executed_at: new Date().toISOString() // Assuming the table still uses executed_at or we map it if needed, or let Supabase handle created_at
        }
      ]);

    if (error) {
      console.error('[LOG-ERROR] No se pudo registrar el log de scraping:', error.message);
      return { success: false, error };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[LOG-ERROR] Error inesperado registrando log:', err.message);
    return { success: false, error: err };
  }
}
