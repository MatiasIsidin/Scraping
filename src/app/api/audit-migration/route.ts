import { supabaseAdmin } from "@lib/supabaseClient";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * ENDPOINT DE VALIDACIÓN MIGRATORIA
 * Compara el estado de las tablas videos y transcripts.
 */
export async function GET() {
  try {
    // 1. Total Videos
    const { count: totalVideos } = await supabaseAdmin
      .from('videos')
      .select('*', { count: 'exact', head: true });

    // 2. Total Transcripts
    const { count: totalTranscripts } = await supabaseAdmin
      .from('transcripts')
      .select('*', { count: 'exact', head: true });

    // 3. Videos sin Transcript (en la tabla nueva)
    const { count: videosSinTranscript } = await supabaseAdmin
      .from('videos')
      .select('youtube_video_id, transcripts!left(youtube_video_id)', { count: 'exact', head: true })
      .is('transcripts', null);

    // 4. Transcripts huérfanas (sin video correspondiente)
    const { count: transcriptsHuerfanas } = await supabaseAdmin
      .from('transcripts')
      .select('youtube_video_id, videos!left(youtube_video_id)', { count: 'exact', head: true })
      .is('videos', null);

    // 5. Comparativa con columna legacy (videos.transcript)
    const { count: videosConLegacyTranscript } = await supabaseAdmin
      .from('videos')
      .select('youtube_video_id', { count: 'exact', head: true })
      .not('transcript', 'is', null)
      .neq('transcript', '');

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      report: {
        total_videos: totalVideos,
        total_transcripts_new_table: totalTranscripts,
        videos_sin_transcripcion_nueva: videosSinTranscript,
        transcripciones_huerfanas: transcriptsHuerfanas,
        videos_con_data_en_columna_legacy: videosConLegacyTranscript
      },
      health_check: {
        migration_coverage: totalVideos ? ((totalVideos - (videosSinTranscript || 0)) / totalVideos * 100).toFixed(2) + '%' : '0%',
        integrity_ok: (transcriptsHuerfanas === 0)
      }
    });

  } catch (error: any) {
    console.error("[AUDIT-MIGRATION-ERROR]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
