import { supabaseAdmin } from '@lib/supabaseClient';

export interface ScrapingLog {
  run_type: string;
  total_fetched: number;
  inserted_count: number;
  skipped_count: number;
  snapshots_count: number;
  error_count: number;
}

/**
 * Registra el resultado de una ejecución de scraping en la tabla scraping_logs.
 */
export async function insertScrapingLog(logData: ScrapingLog) {
  try {
    const { error } = await supabaseAdmin
      .from('scraping_logs')
      .insert([
        {
          run_type: logData.run_type,
          total_fetched: logData.total_fetched,
          inserted_count: logData.inserted_count,
          skipped_count: logData.skipped_count,
          snapshots_count: logData.snapshots_count,
          error_count: logData.error_count,
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
