// ============================================================
// PROMPTS: RPM PROFILING
// Milestone 4 — IA Personality & Business Fit
// ============================================================

export const RPM_PROFILER_SYSTEM_PROMPT = `Eres un consultor de alto rendimiento y estratega de negocios experto en el método RPM (Results, Purpose, Massive Action Plan) de Tony Robbins. 
Tu tarea es convertir un conjunto detallado de respuestas de un cuestionario en un Perfil Estratégico de Emprendedor de alta resolución.

Debes analizar profundamente:
1. Claridad de Resultados (R): ¿Son medibles y realistas dado el horizonte de tiempo?
2. Profundidad del Propósito (P): ¿Hay suficiente urgencia emocional y "por qué" para superar obstáculos?
3. Viabilidad del Plan de Acción Masivo (M): ¿Tiene el usuario las habilidades, recursos y tolerancia al riesgo necesarios?

Tu análisis debe ser crítico, honesto y extremadamente útil para filtrar oportunidades de negocio posteriores.`;

export function buildRPMProfilerPrompt(data: any): string {
  return `Genera un análisis estratégico profundo basado en los siguientes datos del usuario (Marco RPM):

========================================================
RESULTADOS (R) — Qué quiere lograr
========================================================
- Ingreso Mensual Objetivo: ${data.results.incomeGoal}
- Horizonte de Tiempo: ${data.results.timeline}
- Nivel de Claridad: ${data.results.clarityScore}/5
- Indicador de Éxito: ${data.results.successIndicator}
- Modelo de Negocio Preferido: ${data.results.preferredModel}
- Horas Semanales Disponibles: ${data.results.hoursPerWeek}

========================================================
PROPÓSITO (P) — Por qué lo quiere
========================================================
- Significado Libertad Financiera: ${data.purpose.financialFreedomMeaning}
- Consecuencia de no lograrlo: ${data.purpose.lossConsequence}
- Urgencia Emocional: ${data.purpose.emotionalUrgency}/5
- Estilo de Vida deseado: ${data.purpose.lifestyleGoal}
- Impacto deseado: ${data.purpose.targetImpact}
- Frustración Actual: ${data.purpose.currentFrustration}
- Qué quiere demostrarse: ${data.purpose.selfProof}

========================================================
PLAN DE ACCIÓN MASIVO (M) — Cómo lo hará
========================================================
- Habilidades Actuales: ${data.map.currentSkills}
- Habilidad en Ventas: ${data.map.salesSkill}/5
- Habilidad en Tech/Automatización: ${data.map.techSkill}/5
- Recursos Disponibles: ${data.map.availableResources}
- Restricciones Actuales: ${data.map.currentConstraints}
- Tolerancia al Riesgo: ${data.map.riskTolerance}/5
- Acciones Inmediatas (24-72h): ${data.map.immediateActions}
- Disponibilidad Diaria: ${data.map.executionAvailability}

Responde exclusivamente en JSON con esta estructura:
{
  "profile": {
    "entrepreneur_archetype": "Ej: El Operador con Propósito / El Arquitecto de Resultados / El Ejecutor Masivo",
    "strengths": ["Lista de fortalezas basadas en R/P/M"],
    "weaknesses": ["Limitaciones críticas detectadas"],
    "emotional_drivers": ["Principales motivadores emocionales identificados"],
    "execution_capacity": "Análisis de si el MAP es realista dado el R y P",
    "recommended_business_types": ["3-5 modelos específicos que encajan perfectamente"],
    "rpm_score": 0-100,
    "strategic_summary": "Resumen ejecutivo de alto impacto sobre el potencial de éxito.",
    "scores": {
      "execution_readiness": 0-100,
      "strategic_clarity": 0-100,
      "emotional_urgency": 0-100
    }
  }
}`;
}

