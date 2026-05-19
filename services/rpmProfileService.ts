// ============================================================
// RPM PROFILE SERVICE — Milestone 4
// Logic: RPM Data → IA Profiling → Supabase Persist
// ============================================================

import { supabaseAdmin } from '@lib/supabaseClient';
import { callLLM } from './openRouterService';
import { RPM_PROFILER_SYSTEM_PROMPT, buildRPMProfilerPrompt } from '@lib/prompts/rpm-prompts';

export class RPMProfileService {
  private readonly MODEL = 'openai/gpt-4o-mini';

  async getLatestProfile(userId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('rpm_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
      return data;
    } catch (err: any) {
      console.error(`[RPM-SERVICE] Error fetching profile: ${err.message}`);
      return null;
    }
  }

  async deactivateAllProfiles(userId: string) {
    const { error } = await supabaseAdmin
      .from('rpm_profiles')
      .update({ is_active: false })
      .eq('user_id', userId);
    if (error) throw error;
  }

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

      // 2. Desactivar perfiles previos (Persistencia: Solo uno activo)
      await this.deactivateAllProfiles(userId);

      // 3. Guardar en Supabase (Tabla rpm_profiles)
      const { data, error } = await supabaseAdmin
        .from('rpm_profiles')
        .insert({
          user_id: userId,
          profile_name: `RPM Robbins: ${userId} - ${new Date().toLocaleDateString()}`,
          capital_range: rpmData.results.incomeGoal,
          skills: [rpmData.map.currentSkills],
          location: 'LATAM',
          experience_level: 'mixed',
          industry_preferences: [rpmData.results.preferredModel],
          raw_data: rpmData,
          ai_analysis: p,
          archetype: p.entrepreneur_archetype,
          execution_readiness: p.scores?.execution_readiness || 0,
          strategic_clarity: p.scores?.strategic_clarity || 0,
          emotional_urgency: p.scores?.emotional_urgency || 0,
          rpm_score: p.rpm_score || 0,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .select('*')
        .single();

      if (error) throw error;

      return {
        success: true,
        profileId: data.id,
        aiAnalysis: p,
        rawData: rpmData,
        fullProfile: data
      };

    } catch (err: any) {
      console.error(`[RPM-SERVICE] Error: ${err.message}`);
      throw err;
    }
  }
}

export const rpmProfileService = new RPMProfileService();

