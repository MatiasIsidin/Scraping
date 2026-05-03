import { supabaseAdmin } from '@lib/supabaseClient';
import { fetchStarterStoryVideos } from './apifyService';
import { mapApifyVideoToDB } from './videoStorageService';
import { saveVideoSnapshots } from './videoSnapshotService';
import { getTranscriptWithFallback } from './apifyTranscriptService';
import { logScrapingExecution } from './logService';

export const SCRAPER_VERSION = "v2_incremental";
const DEFAULT_THRESHOLD = 5;
const MAX_VIDEOS_PER_RUN = 50;

/**
 * SERVICIO DE SCRAPING INCREMENTAL
 * Detecta videos nuevos, aplica early stop y procesa transcripciones/snapshots.
 */
export async function runIncrementalScrape(
  threshold: number = DEFAULT_THRESHOLD, 
  maxResults: number = MAX_VIDEOS_PER_RUN,
  runType: string = 'manual'
) {
  const stats = {
    success: true,
    total_fetched: 0,
    inserted_count: 0,
    skipped_existing: 0,
    transcripts_created: 0,
    fallback_used: 0,
    snapshots_created: 0,
    api_optimized: true,
    scraper_version: SCRAPER_VERSION,
    early_stop_triggered: false,
    errors: 0
  };

  try {
    console.log(`[INCREMENTAL] Iniciando v2. Threshold: ${threshold}, MaxResults: ${maxResults}`);

    // 1. Fetch de Apify (Newest First esperado por defecto del actor)
    const videos = await fetchStarterStoryVideos(maxResults);
    stats.total_fetched = videos?.length || 0;

    if (stats.total_fetched === 0) {
      console.log("[INCREMENTAL] No se encontraron videos en Apify.");
      return stats;
    }

    let consecutiveExisting = 0;

    // 2. Iterar y procesar incrementalmente
    for (const video of videos) {
      const videoId = video.id || video.videoId || video.youtubeId;

      // a) Verificar existencia en DB
      const { data: existingVideo } = await supabaseAdmin
        .from('videos')
        .select('youtube_video_id')
        .eq('youtube_video_id', videoId)
        .single();

      if (existingVideo) {
        stats.skipped_existing++;
        consecutiveExisting++;
        console.log(`[INCREMENTAL] Video ${videoId} ya existe. Consecutivos: ${consecutiveExisting}`);

        // EARLY STOP: Si alcanzamos el threshold de videos existentes seguidos
        if (consecutiveExisting >= threshold) {
          console.warn(`[INCREMENTAL] Early Stop activado! Detectados ${threshold} videos existentes consecutivos.`);
          stats.early_stop_triggered = true;
          break;
        }
        continue;
      }

      // b) Es un video nuevo: Procesar
      console.log(`[INCREMENTAL] ¡Nuevo video detectado!: ${videoId}`);
      consecutiveExisting = 0; // Resetear contador

      // 3. Guardar Metadata
      const dbVideo = mapApifyVideoToDB(video);
      const { error: videoError } = await supabaseAdmin.from('videos').insert([dbVideo]);

      if (videoError) {
        console.error(`[INCREMENTAL-ERROR] No se pudo guardar metadata para ${videoId}:`, videoError.message);
        stats.errors++;
        continue;
      }
      stats.inserted_count++;

      // 4. Guardar Snapshot
      const snapResult = await saveVideoSnapshots([video]);
      stats.snapshots_created += snapResult.snapshotsCreated;

      // 5. Generar Transcripción (con su propio fallback y persistencia)
      try {
        const transcriptResult = await getTranscriptWithFallback(dbVideo.url, videoId);
        if (transcriptResult.success) {
          stats.transcripts_created++;
          if (transcriptResult.data?.source === 'assemblyai') {
            stats.fallback_used++;
          }
        }
      } catch (tErr: any) {
        console.error(`[INCREMENTAL-TRANSCRIPT-ERROR] Falló transcripción para ${videoId}:`, tErr.message);
      }
    }

    // 6. Registrar Log de Ejecución
    await logScrapingExecution({
      run_type: runType,
      scraper_version: SCRAPER_VERSION,
      status: stats.errors > 0 ? 'partial' : 'success',
      source: 'apify_incremental',
      videos_found: stats.total_fetched,
      new_videos: stats.inserted_count,
      skipped_existing: stats.skipped_existing,
      transcripts_created: stats.transcripts_created,
      fallback_used: stats.fallback_used,
      snapshots_created: stats.snapshots_created,
      errors_count: stats.errors,
      error_details: { early_stop_triggered: stats.early_stop_triggered }
    });

    console.log(`[INCREMENTAL] Finalizado: ${stats.inserted_count} nuevos, ${stats.skipped_existing} omitidos.`);
    return stats;

  } catch (error: any) {
    console.error(`[INCREMENTAL-CRITICAL] Error fatal:`, error.message);
    stats.success = false;
    stats.errors++;
    return stats;
  }
}
