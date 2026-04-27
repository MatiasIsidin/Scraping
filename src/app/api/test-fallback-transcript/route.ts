import { NextResponse } from 'next/server';
import { getTranscriptForVideo, saveTranscriptToDB } from '../../../../services/apifyTranscriptService';
import { fetchAssemblyAiFallback } from '../../../../services/assemblyAiFallbackService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId') || 'dQw4w9WgXcQ';
  const forceFallback = searchParams.get('force') === 'true';
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    console.log(`--- [TEST-FALLBACK] Iniciando prueba para: ${videoId} (Force Fallback: ${forceFallback}) ---`);

    let finalTranscript = "";
    let source: "apify" | "assemblyai" = "apify";
    let apifyStatus = "pending";
    let fallbackTriggered = false;

    // 1. Intentar Apify (o saltar si se fuerza fallback)
    if (!forceFallback) {
      const apifyResult = await getTranscriptForVideo(videoUrl);
      if (apifyResult.success && apifyResult.data?.transcript) {
        finalTranscript = apifyResult.data.transcript;
        source = "apify";
        apifyStatus = "success";
      } else {
        apifyStatus = "fail/empty";
        fallbackTriggered = true;
      }
    } else {
      console.log("[TEST-FALLBACK] Forzando omisión de Apify...");
      apifyStatus = "skipped (forced)";
      fallbackTriggered = true;
    }

    // 2. Activar Fallback si es necesario
    if (fallbackTriggered) {
      console.log(`[TRANSCRIPT] Fallback triggered: true`);
      const fallbackResult = await fetchAssemblyAiFallback(videoUrl);
      
      if (fallbackResult.status === "completed") {
        finalTranscript = fallbackResult.transcript;
        source = "assemblyai";
      } else {
        return NextResponse.json({ 
          success: false, 
          error: `Fallback falló: ${fallbackResult.message}`,
          logs: { apifyStatus, fallbackTriggered }
        }, { status: 500 });
      }
    } else {
      console.log(`[TRANSCRIPT] Fallback triggered: false`);
    }

    console.log(`[TRANSCRIPT] Provider: ${source}`);
    console.log(`[TRANSCRIPT] Saved in: transcripts table`);

    // 3. Normalizar y Persistir
    const finalData = {
      youtube_video_id: videoId,
      transcript: finalTranscript,
      source: source,
      language: 'en'
    };

    const dbResult = await saveTranscriptToDB(finalData);

    return NextResponse.json({
      success: true,
      videoId,
      source,
      apifyStatus,
      fallbackTriggered,
      transcriptPreview: finalTranscript.substring(0, 100) + "...",
      storage: "transcripts_table",
      db_persistence: dbResult
    });


  } catch (error: any) {
    console.error("[TEST-FALLBACK-CRITICAL]", error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
