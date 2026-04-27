/**
 * TAREA 2 — PIPELINE FALLBACK (ASSEMBLYAI vía Modal)
 */
export async function fetchAssemblyAiFallback(videoUrl: string) {
  // Se espera que la URL de Modal esté configurada en las variables de entorno
  const MODAL_URL = process.env.MODAL_ASSEMBLYAI_WEBHOOK_URL;
  
  if (!MODAL_URL) {
    console.error("[FALLBACK-CONFIG] MODAL_ASSEMBLYAI_WEBHOOK_URL no está definida.");
    return { status: "error", message: "Configuración de fallback faltante" };
  }

  try {
    console.log(`[FALLBACK-ACTIVATE] Iniciando transcripción con AssemblyAI para: ${videoUrl}`);
    
    const response = await fetch(MODAL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ videoUrl })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { status: "error", message: `Modal API error: ${response.status}` };
    }

    const result = await response.json();

    if (result.status === "completed") {
      return {
        transcript: result.transcript,
        status: "completed",
        source: "assemblyai"
      };
    } else {
      return { status: "error", message: result.message || "Error desconocido en Modal" };
    }

  } catch (error: any) {
    console.error(`[FALLBACK-CRITICAL]`, error.message);
    return { status: "error", message: error.message };
  }
}
