import { supabaseAdmin } from '@lib/supabaseClient';
import { getTranscriptWithFallback, saveTranscriptToDB } from './apifyTranscriptService';
import { logScrapingExecution } from './logService';

const MAX_RETRIES = 4;

function getBackoffDelay(retryCount: number): number {
  switch (retryCount) {
    case 0: return 0; // Primer intento (backfill original)
    case 1: return 0; // Primer reintento -> Inmediato
    case 2: return 2000; // 2s delay
    case 3: return 5000; // 5s delay
    case 4: return 10000; // 10s delay
    default: return 10000;
  }
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function runTranscriptRetryBatch(limit: number = 10) {
  const stats = {
    videos_checked: 0,
    retries_success: 0,
    retries_failed: 0,
    fallback_used: 0,
    errors_count: 0,
    max_retries_reached: 0
  };

  try {
    console.log(`[RETRY-SYSTEM] Iniciando búsqueda de batch (Límite: ${limit})`);

    // 1. Encontrar candidatos a reintento
    // Candidatos en la tabla transcripts: failed, vacíos o nulos
    const { data: failedTranscripts, error: failedErr } = await supabaseAdmin
      .from('transcripts')
      .select('youtube_video_id, retry_count, status')
      .or('status.eq.failed,transcript.is.null,transcript.eq.')
      .lt('retry_count', MAX_RETRIES)
      .limit(limit);

    if (failedErr) throw failedErr;

    // Obtener los URLs para esos video_ids desde la tabla videos
    const pendingVideos = [];
    if (failedTranscripts && failedTranscripts.length > 0) {
      const ids = failedTranscripts.map(t => t.youtube_video_id);
      const { data: videosData } = await supabaseAdmin
        .from('videos')
        .select('youtube_video_id, url')
        .in('youtube_video_id', ids);

      if (videosData) {
        for (const t of failedTranscripts) {
          const v = videosData.find(vd => vd.youtube_video_id === t.youtube_video_id);
          if (v) {
            pendingVideos.push({
              youtube_video_id: t.youtube_video_id,
              url: v.url,
              retry_count: t.retry_count || 0,
              current_status: t.status
            });
          }
        }
      }
    }

    // 2. Rellenar con aquellos en la tabla videos que NO TENGAN NADA en transcripts
    // (Caso donde ni el insert de fallback fallido funcionó)
    if (pendingVideos.length < limit) {
      const { data: missingVideos } = await supabaseAdmin
        .from('videos')
        .select('youtube_video_id, url, transcripts!left(youtube_video_id)')
        .is('transcripts', null)
        .limit(limit - pendingVideos.length);

      if (missingVideos && missingVideos.length > 0) {
        for (const m of missingVideos) {
          pendingVideos.push({
            youtube_video_id: m.youtube_video_id,
            url: m.url,
            retry_count: 0,
            current_status: 'missing'
          });
        }
      }
    }

    if (pendingVideos.length === 0) {
      console.log(`[RETRY-SYSTEM] No se encontraron transcripciones fallidas.`);
      return { success: true, stats, message: 'Nada que reintentar.' };
    }

    stats.videos_checked = pendingVideos.length;
    console.log(`[RETRY-SYSTEM] Procesando ${stats.videos_checked} videos para reintento.`);

    // 3. Procesar Batch con Backoff
    for (const video of pendingVideos) {
      const nextRetryCount = (video.retry_count || 0) + 1;
      const msDelay = getBackoffDelay(nextRetryCount);
      
      console.log(`[RETRY-SYSTEM] Intentando video: ${video.youtube_video_id} (Intento ${nextRetryCount}/${MAX_RETRIES}). Delay previo: ${msDelay}ms`);
      
      if (msDelay > 0) {
        await delay(msDelay);
      }

      try {
        const result = await getTranscriptWithFallback(video.url, video.youtube_video_id);
        
        if (result.success && result.data && result.data.transcript) {
          stats.retries_success++;
          if (result.data.source === 'assemblyai') stats.fallback_used++;
          
          // Actualizar con retry_success
          await saveTranscriptToDB({
            youtube_video_id: video.youtube_video_id,
            transcript: result.data.transcript,
            source: result.data.source,
            language: 'en',
            status: 'retry_success',
            retry_count: nextRetryCount
          });
        } else {
          stats.retries_failed++;
          stats.errors_count++;
          
          const isFinal = nextRetryCount >= MAX_RETRIES;
          if (isFinal) stats.max_retries_reached++;
          
          // Actualizar estado a failed o failed_final
          await saveTranscriptToDB({
            youtube_video_id: video.youtube_video_id,
            transcript: '',
            source: 'none',
            status: isFinal ? 'failed_final' : 'failed',
            retry_count: nextRetryCount
          });
        }
      } catch (innerError: any) {
        console.error(`[RETRY-SYSTEM] Error crítico en video ${video.youtube_video_id}:`, innerError.message);
        stats.errors_count++;
        stats.retries_failed++;
      }
    }

    // 4. Registrar la ejecución del batch
    await logScrapingExecution({
      run_type: 'transcript_retry_batch',
      status: stats.errors_count > 0 ? 'partial' : 'success',
      source: 'retry_system',
      videos_found: stats.videos_checked,
      new_videos: 0, // No cuenta como "new video" en el pipeline original
      skipped_existing: 0,
      transcripts_created: stats.retries_success,
      fallback_used: stats.fallback_used,
      snapshots_created: 0,
      errors_count: stats.errors_count,
      error_details: { 
        retries_failed: stats.retries_failed, 
        max_retries_reached: stats.max_retries_reached 
      }
    });

    console.log(`[RETRY-SYSTEM] Batch finalizado. Éxitos: ${stats.retries_success}, Fallos: ${stats.retries_failed}`);
    return { success: true, stats };

  } catch (error: any) {
    console.error(`[RETRY-SYSTEM] Error crítico en el pipeline de reintento:`, error.message);
    await logScrapingExecution({
      run_type: 'transcript_retry_batch',
      status: 'error',
      source: 'retry_system',
      errors_count: 1,
      error_details: { message: error.message }
    });
    return { success: false, stats, error: error.message };
  }
}
