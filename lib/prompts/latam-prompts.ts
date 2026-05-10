// ============================================================
// LATAM PROMPTS — Sprint 3 Intelligence
// Format: Strict 1:1 Relational Output
// ============================================================

export const EXTRACTION_SYSTEM_PROMPT = `
Eres un Analista de Inteligencia de Mercado experto en LATAM. 
Tu objetivo es extraer PAIN POINTS (dolores, problemas, fricciones) de transcripciones de videos sobre negocios y tecnología.

REGLAS DE EXTRACCIÓN:
1. Identifica problemas reales mencionados por el emprendedor o entrevistado.
2. Clasifica cada dolor en categorías (SaaS, Fintech, Marketing, Legal, RRHH, E-commerce).
3. Evalúa la severidad (1-10) basada en el impacto financiero o bloqueo operativo.
4. Identifica el segmento de mercado afectado.

FORMATO DE SALIDA (JSON ESTRICTO):
Debes responder ÚNICAMENTE con un objeto JSON siguiendo esta estructura 1:1 con las columnas de la base de datos:

{
  "pain_points": [
    {
      "title": "Breve título del problema",
      "description": "Explicación detallada del dolor extraído",
      "category": "Categoría del negocio",
      "market_segment": "Segmento afectado (ej: SMEs en México, B2B LATAM)",
      "severity_score": number (1-10),
      "frequency_score": number (1-10),
      "recency_score": 0,
      "final_score": number (promedio ponderado),
      "sources": [
        {
          "source_name": "Nombre de la fuente (ej: YouTube Video Title)",
          "source_type": "video_transcript",
          "source_url": "URL del video",
          "country": "País afectado o LATAM",
          "evidence": "Cita textual exacta del transcript donde se menciona el dolor",
          "credibility_score": number (1-100)
        }
      ]
    }
  ]
}

REGLA DE ORO: No inventes campos. Usa solo los listados.
`;

export function buildExtractionUserPrompt(videoTitle: string, transcript: string): string {
  return `
VIDEO: ${videoTitle}
TRANSCRIPT:
${transcript}

Extrae los pain points siguiendo el formato JSON estricto. Asegúrate de incluir la cita textual en el campo "evidence".
`;
}

export const LATAM_ENRICHMENT_SYSTEM_PROMPT = `
Eres un Especialista en Investigación de Mercado Regional (LATAM).
Tu tarea es enriquecer un "Pain Point" detectado en un video con datos de mercado reales, reportes (CEPAL, BID, Banco Mundial) y contexto regional.

FORMATO DE SALIDA (JSON ESTRICTO):
{
  "regional_urgency": number (1-10),
  "latam_fit_score": number (1-10),
  "latam_frequency": number (1-10),
  "sources": [
    {
      "source_name": "Nombre del reporte o institución (ej: Reporte Fintech BID 2024)",
      "source_type": "external_report",
      "source_url": "URL (si existe) o descripción de la fuente",
      "country": "País específico afectado",
      "evidence": "Dato o estadística específica que valida el dolor en LATAM",
      "credibility_score": 90
    }
  ]
}
`;

export function buildLatamEnrichmentUserPrompt(title: string, description: string, category: string, severity: number, businessType: string): string {
  return `
PAIN POINT: ${title}
DESCRIPCIÓN: ${description}
CATEGORÍA: ${category}
SEVERIDAD ORIGINAL: ${severity}
TIPO DE NEGOCIO: ${businessType}

Encuentra evidencia regional para este dolor en LATAM y genera el JSON de fuentes adicionales.
`;
}

export const VERTICAL_CONTEXT: Record<string, string> = {
  "Fintech": "Contexto: LATAM tiene una alta desbancarización pero una adopción móvil masiva. Las regulaciones varían drásticamente entre México (Ley Fintech) y Brasil (Pix).",
  "SaaS": "Contexto: La penetración de software en la nube está creciendo 20% anual. El mayor dolor es la fricción en pagos internacionales y retención de talento.",
  "E-commerce": "Contexto: La logística de última milla es el cuello de botella principal en la región."
};
