import { supabaseAdmin } from '@lib/supabaseClient';

export interface ApifyVideo {
  id: string;
  title: string;
  url: string;
  viewCount: number;
  date: string;
  likes: number;
  channelName: string;
  channelId: string;
}

export function mapApifyVideoToDB(video: any) {
  // Soporte para múltiples variantes de nombres de campo de Apify
  const videoId = video.id || video.videoId || video.youtubeId;
  const views = video.viewCount || video.view_count || video.views || 0;
  const published = video.date || video.publishedAt || video.published_at || new Date().toISOString();
  const likesCount = video.likes || video.likeCount || 0;

  return {
    youtube_video_id: videoId,
    title: video.title || 'Untitled Video',
    url: video.url || `https://www.youtube.com/watch?v=${videoId}`,
    view_count: views,
    published_at: published,
    likes: likesCount,
    channel_name: video.channelName || video.channel_name || 'Unknown Channel',
    channel_id: video.channelId || video.channel_id || 'Unknown ID',
  };
}

export async function saveVideosToDB(videos: any[], runType: string = 'manual') {
  const EXPECTED = videos.length;
  let ITERATED = 0;
  let INSERT_ATTEMPTS = 0;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  console.log(`[BINARY-AUDIT] BEFORE_LOOP - EXPECTED: ${EXPECTED}`);

  for (const video of videos) {
    ITERATED++;
    const currentId = video.id || video.videoId || "NO_ID";
    
    try {
      // 1. Verificar duplicado
      const { data: existingVideo, error: fetchError } = await supabaseAdmin
        .from('videos')
        .select('youtube_video_id')
        .eq('youtube_video_id', currentId)
        .single();

      if (existingVideo) {
        skipped++;
        continue;
      }

      // 2. Intento de Inserción
      INSERT_ATTEMPTS++;
      const dbVideo = mapApifyVideoToDB(video);
      const { error: insertError } = await supabaseAdmin.from('videos').insert([dbVideo]);

      if (insertError) {
        errors++;
      } else {
        inserted++;
      }

    } catch (err: any) {
      errors++;
    }
  }

  console.log(`[BINARY-AUDIT] AFTER_LOOP - ITERATED: ${ITERATED}, INSERT_ATTEMPTS: ${INSERT_ATTEMPTS}`);

  // El log se delega al pipeline principal para incluir métricas de snapshots


  return { 
    EXPECTED, 
    ITERATED, 
    INSERT_ATTEMPTS, 
    inserted, 
    skipped, 
    errors 
  };
}
