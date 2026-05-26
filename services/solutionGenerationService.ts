// ============================================================
// SOLUTION GENERATION SERVICE — Sprint 5 Core Engine
// Handles: Concurrent LLM generation, failovers, YouTube citation building, and resilient persistence
// ============================================================

import { supabaseAdmin } from '@lib/supabaseClient';
import { callLLM } from './openRouterService';
import { SolutionMatchingService, MatchedOpportunity } from './solutionMatchingService';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface SolutionProposal {
  id?: string;
  rpm_profile_id: string;
  matched_pain_point_id: string;
  matched_video_ids: string[];
  criteria_hash: string;
  tracking_version: number;
  fit_score: number;
  detailed_fit_scores: any;
  difficulty_level: 'LOW' | 'MEDIUM' | 'HIGH';
  generation_model: string;
  generated_at: string;
  is_active: boolean;
  
  // Delivery details (IA generated)
  title: string;
  latam_problem_addressed: string;
  explanation_latam_context: string;
  proposed_viable_solution: string;
  required_skills: string[];
  estimated_cost_range: string;
  rpm_alignment_score: number;
  feasibility_score: number;
  ai_rationale: string;
}

export class SolutionGenerationService {
  private static readonly TMP_DIR = path.join(process.cwd(), '.tmp');
  private static readonly FALLBACK_FILE = path.join(process.cwd(), '.tmp/solution_engine_outputs.json');

  /**
   * Orchestrates the matching and generation flow for a specific user
   */
  static async generateSolutionsForUser(userId: string): Promise<SolutionProposal[]> {
    console.log(`[GENERATION] Iniciando generación de soluciones para el usuario: ${userId}...`);

    // 1. Run matching engine
    const { action, opportunities, rpmProfile, newHash } = await SolutionMatchingService.runMatching(userId);

    if (action === 'reuse') {
      console.log(`[GENERATION] DYNAMIC BYPASS: Reutilizando propuestas activas existentes.`);
      const activeSolutions = await this.getExistingSolutions(rpmProfile.id);
      if (activeSolutions.length >= 10) { // Aumentado a 10
        return activeSolutions;
      }
      console.log(`[GENERATION] Alerta: Se solicitó reutilizar pero no hay al menos 10 soluciones activas. Forzando regeneración.`);
    }

    // 2. Prepare candidates (Top 10, with 11th and 12th as fallback)
    if (opportunities.length < 10) {
      console.warn(`[GENERATION] Advertencia: Se encontraron solo ${opportunities.length} oportunidades elegibles. Procediendo.`);
    }

    const activeOpportunities = opportunities.slice(0, 10); // Usar hasta 10 principales
    const fallbackOpportunity = opportunities.length >= 11 ? opportunities[10] : null;

    console.log(`[GENERATION] Iniciando llamadas paralelas para ${activeOpportunities.length} candidatos principales. Candidato fallback disponible: ${fallbackOpportunity ? 'SÍ' : 'NO'}`);

    const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

    // 3. Parallel generation using Promise.all
    const generationPromises = activeOpportunities.map((opt, index) => 
      this.generateSingleSolutionWithRetry(rpmProfile, opt, model, 1)
        .catch(err => {
          console.error(`[GENERATION] Error en candidato principal ${index + 1} ("${opt.pain_point.title}"):`, err.message);
          return null; // Return null to identify failure
        })
    );

    const results = await Promise.all(generationPromises);
    const successfulSolutions: SolutionProposal[] = results.filter((s): s is SolutionProposal => s !== null);

    // 4. Fallback execution if any of the main 10 failed
    if (successfulSolutions.length < 10 && fallbackOpportunity) {
      const missingCount = 10 - successfulSolutions.length;
      console.log(`[GENERATION-FAILOVER] Fallaron ${missingCount} candidatos. Intentando generar con el candidato fallback...`);
      try {
        const fallbackSolution = await this.generateSingleSolutionWithRetry(rpmProfile, fallbackOpportunity, model, 1);
        if (fallbackSolution) {
          successfulSolutions.push(fallbackSolution);
          console.log(`[GENERATION-FAILOVER] Candidato fallback generado con éxito.`);
        }
      } catch (err: any) {
        console.error(`[GENERATION-FAILOVER] Error al generar candidato de fallback: ${err.message}`);
      }
    }

    if (successfulSolutions.length === 0) {
      throw new Error(`[GENERATION-FATAL] No se pudo generar ninguna propuesta de solución exitosamente.`);
    }

    // 5. Build and attach metadata to the successfully generated solutions
    const finalSolutions: SolutionProposal[] = successfulSolutions.map(sol => {
      // Find matching opportunity to get the exact fit scores and videos
      const matchedOpt = opportunities.find(o => o.pain_point.id === sol.matched_pain_point_id);
      
      const fitScore = matchedOpt ? matchedOpt.fit.fit_score : sol.fit_score;
      const detailedScores = matchedOpt ? matchedOpt.fit.factor_breakdown : sol.detailed_fit_scores;
      const difficulty = matchedOpt ? matchedOpt.fit.difficulty_level : sol.difficulty_level;
      const videoIds = matchedOpt ? matchedOpt.videos : sol.matched_video_ids;

      return {
        ...sol,
        rpm_profile_id: rpmProfile.id,
        criteria_hash: newHash,
        tracking_version: (rpmProfile.tracking_version || 1),
        fit_score: fitScore,
        detailed_fit_scores: {
          fit_score: fitScore,
          factor_breakdown: detailedScores
        },
        difficulty_level: difficulty,
        matched_video_ids: videoIds,
        generation_model: model,
        generated_at: new Date().toISOString(),
        is_active: true
      };
    });

    // 6. Deactivate ALL active solutions for this user (cross-profile invalidation)
    console.log(`[GENERATION] Invalidando TODAS las propuestas previas del usuario: ${userId}...`);
    await SolutionMatchingService.deactivateAllSolutionsForUser(userId);

    // 7. Persist newly generated solutions
    console.log(`[GENERATION] Guardando ${finalSolutions.length} propuestas nuevas...`);
    const savedSolutions = await this.persistSolutions(finalSolutions);

    return savedSolutions;
  }

  /**
   * Generates a single solution proposal using the OpenAI/OpenRouter client
   */
  private static async generateSingleSolutionWithRetry(
    rpmProfile: any,
    opportunity: MatchedOpportunity,
    model: string,
    attempt: number = 1
  ): Promise<SolutionProposal | null> {
    const pp = opportunity.pain_point;
    const fit = opportunity.fit;
    const rawData = rpmProfile.raw_data || {};
    const map = rawData.map || {};
    const results = rawData.results || {};

    const videoCitations = opportunity.videos.map(id => `- https://youtube.com/watch?v=${id}`).join('\n');

    const systemPrompt = `Eres un experto estratega de negocios especializado en aplicar el marco RPM (Resultados, Propósito, Plan de Acción de Tony Robbins) en Latinoamérica.
Tu tarea es formular una propuesta de negocio viable, auditable y de alto impacto para un usuario en LATAM a partir de un dolor de mercado validado por evidencia real en YouTube.

DIRECTRICES OBLIGATORIAS DE APLICABILIDAD LATAM (ANCLAJE REGIONAL):
1. La propuesta debe estar 100% contextualizada en LATAM.
2. Considera limitaciones reales de la región: métodos de pago locales (MercadoPago, WhatsApp Pay, transferencias directas, efectivo vía OXXO/PagoFácil/Sencillito), baja penetración de tarjetas de crédito y uso intensivo de WhatsApp Business como principal canal de adquisición, soporte y automatización.
3. El modelo de ingresos debe ser viable en monedas locales, con precios y costos adaptados a la realidad regional.

EVIDENCIA REQUERIDA (AUDITABILIDAD):
Menciona explícitamente y de forma lógica los siguientes links de videos de YouTube como sustento del dolor de mercado:
${videoCitations}

Debes retornar EXCLUSIVAMENTE un objeto JSON válido, sin textos introductorios ni bloques de código de markdown. El JSON debe seguir este formato exacto:
{
  "title": "Un título comercial atractivo, conciso y directo para la solución",
  "latam_problem_addressed": "Explicación detallada del dolor específico abordado adaptado al contexto de Latinoamérica",
  "proposed_viable_solution": "Descripción completa de la propuesta viable de negocio (el MVP, la solución concreta)",
  "explanation_latam_context": "Detalle técnico y estratégico de cómo supera las fricciones de LATAM (ej. integración con pasarelas locales, uso de bots de WhatsApp, operaciones de bajo costo)",
  "required_skills": ["Habilidad 1", "Habilidad 2", "Habilidad 3"],
  "estimated_cost_range": "Rango de inversión inicial estimado (ej: $0-$100 USD, $100-$300 USD)",
  "rpm_alignment_score": 85,
  "feasibility_score": 90,
  "ai_rationale": "Análisis explicable y transparente de por qué esta solución encaja con el perfil del usuario (disponibilidad de capital de ${rpmProfile.capital_range}, tiempo de ${results.hoursPerWeek || '10-20 horas/semana'} y habilidades del perfil)."
}`;

    const userPrompt = `INFORMACIÓN DEL PERFIL DEL USUARIO:
- Habilidades del Perfil: ${Array.isArray(rpmProfile.skills) ? rpmProfile.skills.join(', ') : map.currentSkills || 'No especificadas'}
- Nivel de Habilidades Técnicas (1-5): ${map.techSkill || 3}
- Nivel de Habilidades de Venta (1-5): ${map.salesSkill || 3}
- Capital Inicial Disponible: ${rpmProfile.capital_range || '1.000–3.000 USD'}
- Horas Disponibles Semanales: ${results.hoursPerWeek || '10-20'}
- Enfoque Estratégico/Modelo Preferido: ${results.preferredModel || 'Automatización / SaaS ligero'}

DOLOR DE MERCADO DETECTADO:
- Título del Dolor: "${pp.title}"
- Categoría: "${pp.category || 'General'}"
- Descripción: "${pp.description}"
- Gravedad del Dolor (1-10): ${pp.severity_score || 7}
- Evidencia (Fuentes): ${opportunity.sourcesCount} testimonios y clasificaciones asociadas.

CALCULADOS EN BACKEND (Usa esto para tu rationale):
- Fit Score Global: ${fit.fit_score}/100
- Nivel de Dificultad: ${fit.difficulty_level}
- Factores Detallados: ${JSON.stringify(fit.factor_breakdown)}

Por favor, genera la propuesta en formato JSON estructurado siguiendo todas las directrices obligatorias de LATAM y enlazando la evidencia provista.`;

    try {
      console.log(`[GENERATION] [Candidato: "${pp.title}"] Enviando solicitud al LLM (Intento ${attempt})...`);
      
      const response = await callLLM({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model,
        temperature: 0.3,
        jsonMode: true,
        pipelineTag: 'sprint5_solution_generation'
      });

      if (!response.success || !response.parsed) {
        throw new Error(response.error || 'Failed to parse LLM JSON response');
      }

      const parsed = response.parsed;

      // Map generated response to our database schema format
      const proposal: SolutionProposal = {
        rpm_profile_id: rpmProfile.id,
        matched_pain_point_id: pp.id,
        matched_video_ids: opportunity.videos,
        criteria_hash: '', // will be set in main flow
        tracking_version: 1, // will be set in main flow
        fit_score: fit.fit_score,
        detailed_fit_scores: null, // will be set in main flow
        difficulty_level: fit.difficulty_level,
        generation_model: model,
        generated_at: new Date().toISOString(),
        is_active: true,

        title: parsed.title || `Solución para ${pp.title}`,
        latam_problem_addressed: parsed.latam_problem_addressed || pp.description,
        explanation_latam_context: parsed.explanation_latam_context || 'Aplicabilidad a verificar.',
        proposed_viable_solution: parsed.proposed_viable_solution || 'Solución en desarrollo.',
        required_skills: Array.isArray(parsed.required_skills) ? parsed.required_skills : [pp.category || 'General'],
        estimated_cost_range: parsed.estimated_cost_range || 'Bajo costo',
        rpm_alignment_score: Number(parsed.rpm_alignment_score || 80),
        feasibility_score: Number(parsed.feasibility_score || 80),
        ai_rationale: parsed.ai_rationale || 'Alineado con el perfil RPM activo.'
      };

      return proposal;

    } catch (err: any) {
      console.error(`[GENERATION] Error al generar candidato "${pp.title}" en intento ${attempt}: ${err.message}`);
      if (attempt < 2) {
        console.log(`[GENERATION] Reintentando candidato "${pp.title}" (intento 2 de 2)...`);
        return this.generateSingleSolutionWithRetry(rpmProfile, opportunity, model, attempt + 1);
      }
      return null;
    }
  }

  /**
   * Load existing solutions for an active profile
   */
  static async getExistingSolutions(rpmProfileId: string): Promise<SolutionProposal[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('solution_engine_outputs')
        .select('*')
        .eq('rpm_profile_id', rpmProfileId)
        .eq('is_active', true);

      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
          return SolutionMatchingService.getLocalFallbackSolutions(rpmProfileId);
        }
        throw error;
      }
      return data || [];
    } catch (err: any) {
      console.warn(`[GENERATION] DB load error, using local fallback: ${err.message}`);
      return SolutionMatchingService.getLocalFallbackSolutions(rpmProfileId);
    }
  }

  /**
   * Persists generated solutions to database, with local file caching fallback
   */
  private static async persistSolutions(solutions: SolutionProposal[]): Promise<SolutionProposal[]> {
    try {
      console.log(`[PERSISTENCE] Intentando persistir ${solutions.length} soluciones en Supabase...`);
      
      const { data, error } = await supabaseAdmin
        .from('solution_engine_outputs')
        .insert(solutions.map(s => ({
          rpm_profile_id: s.rpm_profile_id,
          matched_pain_point_id: s.matched_pain_point_id,
          matched_video_ids: s.matched_video_ids,
          criteria_hash: s.criteria_hash,
          tracking_version: s.tracking_version,
          fit_score: s.fit_score,
          detailed_fit_scores: s.detailed_fit_scores,
          difficulty_level: s.difficulty_level,
          generation_model: s.generation_model,
          generated_at: s.generated_at,
          is_active: s.is_active,
          
          title: s.title,
          latam_problem_addressed: s.latam_problem_addressed,
          explanation_latam_context: s.explanation_latam_context,
          proposed_viable_solution: s.proposed_viable_solution,
          required_skills: s.required_skills,
          estimated_cost_range: s.estimated_cost_range,
          rpm_alignment_score: s.rpm_alignment_score,
          feasibility_score: s.feasibility_score,
          ai_rationale: s.ai_rationale
        })))
        .select('*');

      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
          console.warn(`[PERSISTENCE] Tabla solution_engine_outputs ausente. Utilizando persistencia local.`);
          SolutionMatchingService.saveLocalFallbackSolutions(solutions);
          return solutions.map((s, idx) => ({ ...s, id: `local-sol-${idx}-${Date.now()}` }));
        }
        throw error;
      }

      console.log(`[PERSISTENCE] ¡Éxito! ${data.length} propuestas guardadas correctamente en la base de datos.`);
      return data;

    } catch (err: any) {
      console.error(`[PERSISTENCE] Error al insertar en base de datos. Usando fallback local: ${err.message}`);
      SolutionMatchingService.saveLocalFallbackSolutions(solutions);
      return solutions.map((s, idx) => ({ ...s, id: `local-sol-${idx}-${Date.now()}` }));
    }
  }

  /**
   * Preventative persistence method for MVT records
   */
  static async persistMvtConversation(mvt: {
    solution_id: string;
    contact_name: string;
    hypothesis: string;
    findings: string;
  }) {
    try {
      console.log(`[MVT-PERSISTENCE] Guardando conversación de validación MVT para solución ${mvt.solution_id}...`);
      
      const { data, error } = await supabaseAdmin
        .from('mvt_conversations')
        .insert([mvt])
        .select('*');

      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
          console.warn(`[MVT-PERSISTENCE] Tabla mvt_conversations no encontrada. Guardando de forma local.`);
          this.saveLocalMvtConversation(mvt);
          return { ...mvt, id: `local-mvt-${Date.now()}` };
        }
        throw error;
      }

      console.log(`[MVT-PERSISTENCE] Conversación MVT guardada exitosamente en Supabase.`);
      return data[0];

    } catch (err: any) {
      console.error(`[MVT-PERSISTENCE] Error al guardar en base de datos. Usando fallback local: ${err.message}`);
      this.saveLocalMvtConversation(mvt);
      return { ...mvt, id: `local-mvt-${Date.now()}` };
    }
  }

  private static saveLocalMvtConversation(mvt: any) {
    try {
      if (!fs.existsSync(this.TMP_DIR)) {
        fs.mkdirSync(this.TMP_DIR, { recursive: true });
      }
      const mvtFile = path.join(this.TMP_DIR, 'mvt_conversations.json');
      let existing: any[] = [];
      if (fs.existsSync(mvtFile)) {
        existing = JSON.parse(fs.readFileSync(mvtFile, 'utf8'));
      }
      existing.push({
        id: `local-mvt-${Date.now()}`,
        ...mvt,
        conversation_date: new Date().toISOString(),
        created_at: new Date().toISOString()
      });
      fs.writeFileSync(mvtFile, JSON.stringify(existing, null, 2), 'utf8');
      console.log(`[MVT-PERSISTENCE] Persistencia local MVT: guardada en .tmp/mvt_conversations.json`);
    } catch (e: any) {
      console.error(`[MVT-PERSISTENCE] Error al guardar localmente MVT: ${e.message}`);
    }
  }
}
