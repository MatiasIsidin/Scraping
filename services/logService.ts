import { supabaseAdmin } from '@lib/supabaseClient';

export interface ScrapingLog {
  run_type: string;
  total_fetched: number;
  inserted_count: number;
  skipped_count?: number;
  snapshots_count?: number;
  transcripts_count?: number;
  error_count: number;
  scraper_version?: string;
  metadata?: any;
}

/**
 * Registra el resultado de una ejecución de scraping en la tabla scraping_logs.
 */
export async function insertScrapingLog(logData: ScrapingLog) {
  try {
    // Consolidar metadata extra en error_details para trazabilidad sin cambiar esquema
    const details = {
      skipped: logData.skipped_count || 0,
      snapshots: logData.snapshots_count || 0,
      transcripts: logData.transcripts_count || 0,
      version: logData.scraper_version || 'v1',
      ...(logData.metadata || {})
    };

    const { error } = await supabaseAdmin
      .from('scraping_logs')
      .insert([
        {
          run_type: logData.run_type,
          videos_found: logData.total_fetched,
          new_videos: logData.inserted_count,
          errors_count: logData.error_count,
          status: logData.error_count > 0 ? 'error' : 'success',
          error_details: JSON.stringify(details),
          executed_at: new Date().toISOString()
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
