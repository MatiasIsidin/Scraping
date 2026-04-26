import { supabaseAdmin } from '@lib/supabaseClient';

/**
 * Guarda un snapshot de métricas para cada video recibido.
 * Los snapshots se insertan siempre, sin deduplicación.
 */
export async function saveVideoSnapshots(videos: any[]) {
  let snapshotsCreated = 0;
  let errors = 0;

  for (const video of videos) {
    try {
      // Mapeo de métricas con fallbacks a 0
      const videoId = video.id || video.videoId || video.youtubeId;
      const viewCount = video.viewCount || video.view_count || video.views || 0;
      const likeCount = video.likes || video.likeCount || 0;
      const commentCount = video.commentsCount || video.comment_count || video.comments || 0;

      const snapshot = {
        youtube_video_id: videoId,
        view_count: viewCount,
        like_count: likeCount,
        comment_count: commentCount
      };

      const { error } = await supabaseAdmin
        .from('video_snapshots')
        .insert([snapshot]);

      if (error) {
        console.error(`[SNAPSHOT-ERROR] Error al insertar snapshot para ${videoId}:`, error.message);
        errors++;
      } else {
        snapshotsCreated++;
      }
    } catch (err: any) {
      console.error(`[SNAPSHOT-ERROR] Error inesperado procesando video:`, err.message);
      errors++;
    }
  }

  return { snapshotsCreated, errors };
}
