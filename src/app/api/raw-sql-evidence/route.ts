import { supabaseAdmin } from "@lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET() {
  const { data: videos } = await supabaseAdmin.from('videos').select('youtube_video_id, title').limit(5);
  const { data: transcripts } = await supabaseAdmin.from('transcripts').select('youtube_video_id, word_count, status').limit(5);
  const { data: pps } = await supabaseAdmin.from('pain_points').select('video_id, title').limit(5);
  
  return NextResponse.json({
    real_videos: videos,
    real_transcripts: transcripts,
    real_pain_points: pps,
    database_status: pps?.length === 0 ? "CLEAN_AND_READY" : "POPULATED"
  });
}
