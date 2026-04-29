import { supabaseAdmin } from "@lib/supabaseClient";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Listar todas las tablas disponibles primero
    const { data: tableList, error: tableError } = await supabaseAdmin
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    // Si lo anterior falla (que es probable por permisos), intentamos un listado manual
    const knownTables = ['videos', 'transcripts', 'scraping_logs', 'video_snapshots', 'latam_classification', 'raw_videos'];
    const results: any = {};

    for (const table of knownTables) {
      const { data, error } = await supabaseAdmin.from(table).select('*').limit(1);
      if (error) {
        results[table] = { error: error.message };
      } else if (data && data.length > 0) {
        results[table] = { columns: Object.keys(data[0]) };
      } else {
        // Intentamos ver si la tabla existe aunque esté vacía
        const { error: existsError } = await supabaseAdmin.from(table).select('count', { count: 'exact', head: true });
        if (existsError) {
          results[table] = { error: existsError.message };
        } else {
          results[table] = { status: "empty" };
        }
      }
    }

    // Estadísticas cruzadas
    const { count: totalVideos } = await supabaseAdmin.from('videos').select('*', { count: 'exact', head: true });
    const { count: totalTranscripts } = await supabaseAdmin.from('transcripts').select('*', { count: 'exact', head: true });
    
    // Videos sin transcript (usando join)
    const { count: videosSinTranscript } = await supabaseAdmin
      .from('videos')
      .select('youtube_video_id, transcripts!left(youtube_video_id)', { count: 'exact', head: true })
      .is('transcripts', null);

    return NextResponse.json({
      success: true,
      schema: results,
      stats: {
        total_videos: totalVideos,
        total_transcripts: totalTranscripts,
        videos_sin_transcript: videosSinTranscript
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
