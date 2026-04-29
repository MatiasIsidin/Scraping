import { supabaseAdmin } from '../lib/supabaseClient';

async function checkStatus() {
  const { count: videoCount } = await supabaseAdmin.from('videos').select('*', { count: 'exact', head: true });
  const { count: transcriptCount } = await supabaseAdmin.from('transcripts').select('*', { count: 'exact', head: true });
  
  // Videos sin transcript usando el mismo join que el servicio
  const { data: pending, count: pendingCount } = await supabaseAdmin
    .from('videos')
    .select('youtube_video_id, transcripts!left(youtube_video_id)', { count: 'exact' })
    .is('transcripts', null);

  console.log({
    total_videos: videoCount,
    total_transcripts: transcriptCount,
    pending_total: pendingCount,
    pending_ids: pending?.map(p => p.youtube_video_id)
  });
}

checkStatus();
