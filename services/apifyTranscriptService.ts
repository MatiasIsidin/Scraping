import { supabaseAdmin } from '@lib/supabaseClient';
import { fetchAssemblyAiFallback } from './assemblyAiFallbackService';
import { insertScrapingLog } from './logService';

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

/**
 * 2. EXTRAER TRANSCRIPCIÓN
 * Obtiene el campo "transcript", valida su existencia y lo limpia.
 */
export function extractTranscript(apifyResponse: any): string {
  if (!apifyResponse || !apifyResponse.transcript) {
    return "";
  }
  
  // Garantizar formato string y eliminar caracteres nulos
  return String(apifyResponse.transcript)
    .replace(/\0/g, '')
    .trim();
}

/**
 * 3. NORMALIZAR FORMATO
 * Mapea la respuesta de Apify al esquema esperado por el sistema.
 */
export function normalizeTranscript(apifyResponse: any) {
  // Extraer youtube_video_id con fallback a parseo de URL
  let videoId = apifyResponse.video_id;
  
  if (!videoId && apifyResponse.video_url) {
    const url = apifyResponse.video_url;
    const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:&|\?|$)/);
    videoId = match ? match[1] : null;
  }

  return {
    youtube_video_id: videoId,
    title: apifyResponse.video_title || "Untitled",
    url: apifyResponse.video_url || `https://www.youtube.com/watch?v=${videoId}`,
    transcript: extractTranscript(apifyResponse),
    language: apifyResponse.language || null,
    published_at: apifyResponse.published_at || apifyResponse.timestamp || null
  };
}

/**
 * 4. GUARDAR EN TABLA TRANSCRIPTS (Exclusivo)
 * Asegura que TODO transcript se guarde en la tabla transcripts.
 * Implementa deduplicación basada en (youtube_video_id, source).
 */
export async function saveTranscriptToDB(data: { 
  youtube_video_id: string, 
  transcript: string, 
  source: string,
  language?: string 
}) {
  if (!data.youtube_video_id) {
    return { success: false, error: "youtube_video_id no proporcionado" };
  }

  try {
    console.log(`[TRANSCRIPT] Provider: ${data.source}`);
    console.log(`[TRANSCRIPT] Saved in: transcripts table`);
    
    // Calcular word_count básico
    const wordCount = data.transcript.split(/\s+/).length;

    const { error } = await supabaseAdmin
      .from('transcripts')
      .upsert({ 
        youtube_video_id: data.youtube_video_id,
        transcript: data.transcript,
        source: data.source,
        language: data.language || 'en',
        word_count: wordCount,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'youtube_video_id,source'
      });

    if (error) {
      console.error(`[DB-ERROR] Error al guardar en transcripts:`, error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error(`[DB-CRITICAL] Error inesperado en transcripts:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 5. SERVICIO APIFY TRANSCRIPT
 * Coordina la ejecución en Apify y la posterior normalización.
 */
export async function getTranscriptForVideo(videoUrl: string, language: string = "en") {
  if (!APIFY_API_TOKEN) {
    throw new Error("APIFY_API_TOKEN no configurado.");
  }

  // Endpoint síncrono para flujo directo en Next.js
  const endpoint = `https://api.apify.com/v2/acts/akash9078~youtube-transcript-extractor/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`;
  
  const body = {
    videoUrl,
    language,
    proxySettings: {
      useApifyProxy: true,
      apifyProxyGroups: ["RESIDENTIAL"],
      apifyProxyCountry: "US"
    }
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Apify error (${response.status}): ${errorText}` };
    }

    const items = await response.json();

    if (!items || items.length === 0) {
      return { success: false, error: "No se encontró transcripción en la respuesta de Apify." };
    }

    // Normalizar datos
    const normalizedData = normalizeTranscript(items[0]);

    return {
      success: true,
      data: normalizedData
    };

  } catch (error: any) {
    console.error(`[TRANSCRIPT-CRITICAL]`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * PIPELINE UNIFICADO CON FALLBACK Y ROBUSTEZ
 * Intenta Apify -> Si falla -> Llama a Modal (AssemblyAI) -> Persiste en transcripts
 */
export async function getTranscriptWithFallback(videoUrl: string, videoId: string) {
  let finalTranscript = "";
  let source: "apify" | "assemblyai" = "apify";
  let fallbackTriggered = false;

  // 1. Intentar con Apify
  const apifyResult = await getTranscriptForVideo(videoUrl);
  
  if (apifyResult.success && apifyResult.data?.transcript) {
    console.log(`[TRANSCRIPT] Apify result: success`);
    finalTranscript = apifyResult.data.transcript;
    source = "apify";
  } else {
    console.log(`[TRANSCRIPT] Apify result: fail`);
    // 2. Fallback: Activar AssemblyAI vía Modal
    console.warn(`[TRANSCRIPT-FALLBACK] Activando AssemblyAI para ${videoId}...`);
    fallbackTriggered = true;
    const fallbackResult = await fetchAssemblyAiFallback(videoUrl);
    
    if (fallbackResult.status === "completed" && fallbackResult.transcript) {
      finalTranscript = fallbackResult.transcript;
      source = "assemblyai";
    } else {
      // 4. MANEJO DE CASO DOBLE FALLA
      console.error(`[TRANSCRIPT-CRITICAL] Ambos métodos fallaron para ${videoId}.`);
      
      await insertScrapingLog({
        run_type: 'transcript_fallback_error',
        total_fetched: 1,
        inserted_count: 0,
        skipped_count: 0,
        snapshots_count: 0,
        error_count: 1
      });

      return { 
        success: false, 
        error: `Doble falla. Apify: ${apifyResult.error}, Fallback: ${fallbackResult.message}` 
      };
    }
  }

  console.log(`[TRANSCRIPT] Fallback triggered: ${fallbackTriggered}`);

  // 3. Persistir en tabla transcripts (Deduplicación automática vía upsert)
  const finalData = {
    youtube_video_id: videoId,
    transcript: finalTranscript,
    source: source,
    language: 'en' // Default por ahora
  };

  const dbResult = await saveTranscriptToDB(finalData);

  return {
    success: true,
    data: finalData,
    db_persistence: dbResult
  };
}
