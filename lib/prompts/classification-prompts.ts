// ============================================================
// PROMPTS: BUSINESS ANALYSIS & LATAM CLASSIFICATION
// Sprint 4 — Milestone 4
// ============================================================

export const ANALYSIS_SYSTEM_PROMPT = `Eres un consultor experto en estrategia de negocios y análisis de mercado para el contexto de América Latina. 
Tu objetivo es analizar profundamente un modelo de negocio a partir de la transcripción de un video y determinar cómo se ajusta a la realidad de LATAM.

Debes realizar dos tareas:
1. Resumir y abstraer la mecánica fundamental del negocio.
2. Identificar qué problemas específicos de mercado (Pain Points) resuelve este negocio o qué barreras enfrenta.`;

/**
 * Prompt para el análisis estructural del video (Video Analysis)
 */
export function buildVideoAnalysisPrompt(videoTitle: string, transcript: string): string {
  const truncatedTranscript = transcript.substring(0, 7000); // Guard rails
  
  return `Analiza el siguiente negocio descrito en el video: "${videoTitle}".

TRANSCRIPCIÓN:
"""
${truncatedTranscript}
"""

Responde exclusivamente en JSON con la siguiente estructura:
{
  "business_analysis": {
    "business_summary": "Resumen ejecutivo del negocio (2 oraciones)",
    "business_model": "Categoría (SaaS, E-commerce, Marketplace, etc.)",
    "core_mechanic": "Explicación técnica de la mecánica de generación de valor",
    "industry": "Industria principal",
    "revenue_range": "Estimación de ingresos mencionada o deducida",
    "extraction_confidence": 0.95
  }
}`;
}

/**
 * Prompt para la clasificación contra Pain Points específicos
 */
export function buildClassificationPrompt(
  videoTitle: string, 
  analysis: any, 
  painPoints: any[]
): string {
  const ppList = painPoints.map(pp => `- [ID: ${pp.id}] ${pp.title}: ${pp.description}`).join('\n');
  
  return `Actúa como un motor de clasificación. Basado en el siguiente análisis de negocio, determina qué "Pain Points" de esta lista son resueltos o están directamente relacionados con este modelo.

NEGOCIO: "${videoTitle}"
MECÁNICA: ${analysis.core_mechanic}

LISTA DE PAIN POINTS LATAM:
${ppList}

Para cada Pain Point que consideres RELEVANTE (mínimo 1, máximo 5), genera un objeto de clasificación. 
Usa solo los IDs proporcionados.

Responde exclusivamente en JSON:
{
  "classifications": [
    {
      "pain_point_id": "UUID_DEL_PAIN_POINT",
      "relevance_score": 85, (0-100)
      "confidence_score": 90, (0-100)
      "reasoning": "Explicación de por qué este negocio resuelve este dolor específico en LATAM",
      "recommended_action": "Acción inmediata para el emprendedor que quiera implementar esto",
      "category_match": "Categoría detectada"
    }
  ]
}`;
}
