// ============================================================
// RPM PROFILE SERVICE — Milestone 4
// Logic: RPM Data → IA Profiling → Supabase Persist
// ============================================================

import { supabaseAdmin } from '@lib/supabaseClient';
import { callLLM } from './openRouterService';
import { RPM_PROFILER_SYSTEM_PROMPT, buildRPMProfilerPrompt } from '@lib/prompts/rpm-prompts';

export class RPMProfileService {
  private readonly MODEL = 'openai/gpt-4o-mini';

  async processAndSaveProfile(userId: string, rpmData: any) {
    try {
      console.log(`[RPM-SERVICE] Procesando perfil para usuario: ${userId}`);

      // 1. Llamar a la IA para el perfilamiento
      const llmRes = await callLLM({
        messages: [
          { role: 'system', content: RPM_PROFILER_SYSTEM_PROMPT },
          { role: 'user', content: buildRPMProfilerPrompt(rpmData) }
        ],
        model: this.MODEL,
        pipelineTag: 'rpm_profiling'
      });

      if (!llmRes.success || !llmRes.parsed?.profile) {
        throw new Error(`Fallo el perfilamiento IA: ${llmRes.error}`);
      }

      const p = llmRes.parsed.profile;

      // 2. Guardar en Supabase (Tabla rpm_profiles)
      const { data, error } = await supabaseAdmin
        .from('rpm_profiles')
        .upsert({
          profile_name: `Perfil de ${userId}`,
          capital_range: rpmData.resources.capital,
          skills: rpmData.resources.skills,
          location: rpmData.market.targetMarket,
          experience_level: rpmData.resources.experience,
          industry_preferences: rpmData.passions.preferredIndustries,
          // Guardamos el análisis IA en un campo JSONB o columnas específicas
          // Según el audit, rpm_profiles tiene: id, profile_name, capital_range, skills, location, experience_level, industry_preferences, is_active, created_at, updated_at
          // Si queremos guardar el análisis IA, podemos usar una tabla extendida o campos JSON
        })
        .select('id')
        .single();

      if (error) throw error;

      return {
        success: true,
        profileId: data.id,
        aiAnalysis: p
      };

    } catch (err: any) {
      console.error(`[RPM-SERVICE] Error: ${err.message}`);
      throw err;
    }
  }
}

export const rpmProfileService = new RPMProfileService();
