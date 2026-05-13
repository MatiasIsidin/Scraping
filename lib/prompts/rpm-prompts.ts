// ============================================================
// PROMPTS: RPM PROFILING
// Milestone 4 — IA Personality & Business Fit
// ============================================================

export const RPM_PROFILER_SYSTEM_PROMPT = `Eres un coach de negocios y arquitecto de startups experto. 
Tu tarea es convertir las respuestas de un cuestionario RPM (Resources, Passions, Market) en un perfil de emprendedor profesional y estructurado.

Debes analizar las fortalezas, debilidades, zonas de oportunidad y modelos de negocio recomendados basados exclusivamente en los activos y motivaciones del usuario.`;

export function buildRPMProfilerPrompt(data: any): string {
  return `Genera un perfil psicográfico y estratégico basado en los siguientes datos de usuario:

RECURSOS (Resources):
- Habilidades: ${data.resources.skills.join(', ')}
- Experiencia: ${data.resources.experience}
- Capital: ${data.resources.capital}

PASIONES (Passions):
- Industrias preferidas: ${data.passions.preferredIndustries.join(', ')}
- Motivaciones: ${data.passions.motivations}

MERCADO (Market):
- Target: ${data.market.targetMarket}
- Problemas detectados: ${data.market.knownProblems}

Responde exclusivamente en JSON con esta estructura:
{
  "profile": {
    "strengths": ["Habilidad 1", "Habilidad 2"],
    "opportunity_zones": ["Zona 1", "Zona 2"],
    "business_fit_score": 85,
    "monetization_capacity": "Alta/Media/Baja",
    "execution_risk": "Bajo/Medio/Alto",
    "recommended_models": ["Modelo 1", "Modelo 2"],
    "strategic_summary": "Un resumen de 3 oraciones sobre el perfil estratégico."
  }
}`;
}
