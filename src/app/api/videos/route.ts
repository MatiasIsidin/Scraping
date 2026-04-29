import { supabaseAdmin } from "@lib/supabaseClient";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("videos")
      .select(`
        *,
        transcripts!left(
          transcript,
          source,
          word_count,
          created_at
        )
      `)
      .order("created_at", { ascending: false })
      .limit(20);

    // Normalizar para que el frontend reciba el transcript más reciente de forma directa
    const normalizedData = data?.map(video => {
      const transcriptList = Array.isArray(video.transcripts) ? video.transcripts : [];
      // Ordenar por fecha descendente (en caso de que Supabase no lo haga internamente en el join)
      const latestTranscript = transcriptList.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0] || null;

      return {
        ...video,
        transcript_data: latestTranscript,
        // Legacy compatibility: si alguien aún lee video.transcript, le damos el nuevo
        transcript: latestTranscript?.transcript || null
      };
    });

    if (error) {
      console.error("[VIDEOS-API-ERROR]", error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: normalizedData });
  } catch (err: any) {
    console.error("[VIDEOS-API-CRITICAL]", err.message);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
