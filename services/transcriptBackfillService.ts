import { supabaseAdmin } from '@lib/supabaseClient';
import { getTranscriptWithFallback } from './apifyTranscriptService';
import { insertScrapingLog } from './logService';

/**
 * SERVICIO DE BACKFILL PARA TRANSCRIPCIONES (Auditado y Corregido)
 * Procesa videos existentes que no tienen transcripción registrada.
 */
export async function runTranscriptBackfill(batchSize: number = 10) {
  const stats = {
    success: true,
    pending_total: 0,
    checked: 0, // fetched_batch_count
    inserted: 0,
    skipped: 0,
    fallback_used: 0,
    errors: 0,
    processed_count: 0
  };

  try {
    console.log(`[BACKFILL-AUDIT] Iniciando auditoría de pendientes. Batch Size: ${batchSize}`);

    // 1. CONSULTA DE VIDEOS PENDIENTES (CORREGIDA)
    // Usamos un Left Join explícito y filtramos por nulos en el lado derecho.
    // 'transcripts!left' fuerza el left join.
    // .is('transcripts', null) filtra los que NO tienen coincidencia.
    
    // Primero obtenemos el TOTAL de pendientes para el log
    const { count: totalCount, error: countError } = await supabaseAdmin
      .from('videos')
      .select('youtube_video_id, transcripts!left(youtube_video_id)', { count: 'exact', head: true })
      .is('transcripts', null);

    if (countError) {
      console.error(`[BACKFILL-COUNT-ERROR] No se pudo obtener el total de pendientes:`, countError.message);
    }
    stats.pending_total = totalCount || 0;
    console.log(`[BACKFILL] PENDING_TOTAL: ${stats.pending_total} videos sin transcripción.`);

    // Ahora obtenemos el BATCH real
    const { data: videosToProcess, error: queryError } = await supabaseAdmin
      .from('videos')
      .select('youtube_video_id, url, transcripts!left(youtube_video_id)')
      .is('transcripts', null)
      .limit(batchSize);

    if (queryError) {
      console.error(`[BACKFILL-QUERY-CRITICAL] Error en query principal:`, queryError.message);
      
      // Fallback manual de emergencia si el join falla por configuración de DB
      return await runManualFallback(batchSize, stats);
    }

    if (!videosToProcess || videosToProcess.length === 0) {
      console.log(`[BACKFILL] No se encontraron videos pendientes en este ciclo.`);
      return { ...stats, message: "No hay videos pendientes." };
    }

    stats.checked = videosToProcess.length; // fetched_batch_count
    console.log(`[BACKFILL] FETCHED_BATCH_COUNT: ${stats.checked}`);

    // 2. EXTRACCIÓN Y PROCESAMIENTO
    for (const video of videosToProcess) {
      stats.processed_count++;
      console.log(`[BACKFILL] [${stats.processed_count}/${stats.checked}] Procesando: ${video.youtube_video_id}`);
      
      try {
        const result = await getTranscriptWithFallback(video.url, video.youtube_video_id);
        
        if (result.success) {
          stats.inserted++;
          if (result.data?.source === 'assemblyai') {
            stats.fallback_used++;
          }
        } else {
          stats.errors++;
          console.error(`[BACKFILL-ERROR] Video ${video.youtube_video_id} falló:`, result.error);
        }
      } catch (innerError: any) {
        stats.errors++;
        console.error(`[BACKFILL-CRITICAL-LOOP] Error fatal procesando video individual:`, innerError.message);
      }
    }

    // 3. LOGGING FINAL
    console.log(`[BACKFILL] PROCESSED_COUNT: ${stats.processed_count}`);
    
    await insertScrapingLog({
      run_type: 'transcript_backfill',
      total_fetched: stats.pending_total, // Guardamos el universo total detectado
      inserted_count: stats.inserted,     // Cuántos logramos insertar en este batch
      skipped_count: stats.checked,       // Cuántos intentamos en este batch (reutilizado)
      snapshots_count: stats.fallback_used,
      error_count: stats.errors
    });

    return stats;

  } catch (error: any) {
    console.error(`[BACKFILL-FATAL]`, error.message);
    return { ...stats, success: false, message: error.message };
  }
}

/**
 * Método de respaldo manual si el JOIN falla.
 */
async function runManualFallback(batchSize: number, stats: any) {
  console.warn(`[BACKFILL-FALLBACK] Iniciando modo manual...`);
  
  // 1. Obtener todos los IDs con transcripción
  const { data: tData } = await supabaseAdmin.from('transcripts').select('youtube_video_id');
  const existingIds = new Set(tData?.map(t => t.youtube_video_id) || []);
  
  // 2. Obtener videos candidatos (limitamos para no saturar memoria)
  const { data: vData } = await supabaseAdmin.from('videos').select('youtube_video_id, url').limit(1000);
  
  if (!vData) return { ...stats, success: false, message: "Error obteniendo candidatos" };
  
  // 3. Filtrar en memoria los que NO tienen transcript
  const pending = vData.filter(v => !existingIds.has(v.youtube_video_id)).slice(0, batchSize);
  
  stats.pending_total = vData.length - existingIds.size; // Estimado
  stats.checked = pending.length;
  
  console.log(`[BACKFILL-MANUAL] Pendientes encontrados: ${pending.length}`);

  for (const video of pending) {
    stats.processed_count++;
    const result = await getTranscriptWithFallback(video.url, video.youtube_video_id);
    if (result.success) {
      stats.inserted++;
      if (result.data?.source === 'assemblyai') stats.fallback_used++;
    } else {
      stats.errors++;
    }
  }
  
  return stats;
}
