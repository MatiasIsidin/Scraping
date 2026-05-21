// ============================================================
// SOLUTION MATCHING SERVICE — Sprint 5 Core Engine
// Handles: Gatekeepers, SHA-256 dynamic checks, and diversity filters
// ============================================================

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '@lib/supabaseClient';
import { FitScoreEngine, FitResult } from './fitScoreEngine';

export interface MatchedOpportunity {
  pain_point: any;
  fit: FitResult;
  videos: string[]; // Youtube Video IDs
  sourcesCount: number;
}

export class SolutionMatchingService {
  private static readonly TMP_DIR = path.join(process.cwd(), '.tmp');
  private static readonly FALLBACK_FILE = path.join(process.cwd(), '.tmp/solution_engine_outputs.json');

  static getCriteriaHash(profile: any): string {
    const rawData = profile.raw_data || {};
    const map = rawData.map || {};
    const results = rawData.results || {};

    const serialized = {
      capital_range: profile.capital_range || '1.000–3.000',
      skills: Array.isArray(profile.skills) ? [...profile.skills].sort() : [String(map.currentSkills || '')],
      industry_preferences: Array.isArray(profile.industry_preferences) ? [...profile.industry_preferences].sort() : [String(results.preferredModel || '')],
      tech_skill: Number(map.techSkill || 3),
      sales_skill: Number(map.salesSkill || 3),
      risk_tolerance: Number(map.riskTolerance || 3),
      hours_per_week: String(results.hoursPerWeek || '10-20')
    };

    return crypto.createHash('sha256').update(JSON.stringify(serialized)).digest('hex');
  }

  static async loadActiveProfile(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('rpm_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`[MATCHING] Error loading active RPM profile: ${error.message}`);
      return null;
    }
    return data;
  }

  static async getExistingActiveSolutions(rpmProfileId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('solution_engine_outputs')
        .select('*')
        .eq('rpm_profile_id', rpmProfileId)
        .eq('is_active', true);

      if (error) {
        // Fallback local if DB table doesn't exist
        if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
          return this.getLocalFallbackSolutions(rpmProfileId);
        }
        throw error;
      }
      return data || [];
    } catch (err: any) {
      console.warn(`[MATCHING] DB table missing or query error. Using local fallback instead: ${err.message}`);
      return this.getLocalFallbackSolutions(rpmProfileId);
    }
  }

  static getLocalFallbackSolutions(rpmProfileId: string): any[] {
    try {
      if (fs.existsSync(this.FALLBACK_FILE)) {
        const fileContent = fs.readFileSync(this.FALLBACK_FILE, 'utf8');
        const allSolutions = JSON.parse(fileContent);
        return allSolutions.filter((s: any) => s.rpm_profile_id === rpmProfileId && s.is_active === true);
      }
    } catch (e: any) {
      console.error(`[MATCHING] Failed to read local fallback solutions: ${e.message}`);
    }
    return [];
  }

  static saveLocalFallbackSolutions(solutions: any[]) {
    try {
      if (!fs.existsSync(this.TMP_DIR)) {
        fs.mkdirSync(this.TMP_DIR, { recursive: true });
      }
      let existing: any[] = [];
      if (fs.existsSync(this.FALLBACK_FILE)) {
        existing = JSON.parse(fs.readFileSync(this.FALLBACK_FILE, 'utf8'));
      }
      // Deactivate old active solutions locally
      const profileIds = new Set(solutions.map(s => s.rpm_profile_id));
      existing = existing.map(s => {
        if (profileIds.has(s.rpm_profile_id)) {
          return { ...s, is_active: false };
        }
        return s;
      });
      // Add new ones
      existing.push(...solutions);
      fs.writeFileSync(this.FALLBACK_FILE, JSON.stringify(existing, null, 2), 'utf8');
      console.log(`[MATCHING] Persistencia local: ${solutions.length} soluciones guardadas en .tmp/solution_engine_outputs.json`);
    } catch (e: any) {
      console.error(`[MATCHING] Failed to write local fallback solutions: ${e.message}`);
    }
  }

  /**
   * Deactivates solutions for a single rpm_profile_id.
   * Prefer deactivateAllSolutionsForUser for cross-profile invalidation.
   */
  static async deactivateActiveSolutions(rpmProfileId: string) {
    try {
      const { error } = await supabaseAdmin
        .from('solution_engine_outputs')
        .update({ is_active: false })
        .eq('rpm_profile_id', rpmProfileId);

      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
          this.deactivateLocalFallbackSolutions(rpmProfileId);
          return;
        }
        throw error;
      }
    } catch (err: any) {
      console.warn(`[MATCHING] Local deactivate fallback called: ${err.message}`);
      this.deactivateLocalFallbackSolutions(rpmProfileId);
    }
  }

  /**
   * Deactivates ALL solutions across every RPM profile for a given user.
   * Called on RPM profile switch to guarantee full cross-profile invalidation.
   */
  static async deactivateAllSolutionsForUser(userId: string) {
    console.log(`[MATCHING] Invalidando TODAS las soluciones activas del usuario: ${userId}...`);
    try {
      // Load all profile IDs for this user
      const { data: profiles, error: pErr } = await supabaseAdmin
        .from('rpm_profiles')
        .select('id')
        .eq('user_id', userId);

      if (pErr) throw pErr;

      if (!profiles || profiles.length === 0) {
        console.warn(`[MATCHING] No se encontraron perfiles para el usuario ${userId}.`);
        return;
      }

      const profileIds = profiles.map((p: any) => p.id);
      console.log(`[MATCHING] Desactivando soluciones para ${profileIds.length} perfil(es)...`);

      const { error } = await supabaseAdmin
        .from('solution_engine_outputs')
        .update({ is_active: false })
        .in('rpm_profile_id', profileIds);

      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
          // Deactivate all in local fallback too
          this.deactivateLocalFallbackSolutionsForUser(profileIds);
          return;
        }
        throw error;
      }

      console.log(`[MATCHING] Todas las soluciones activas del usuario ${userId} han sido invalidadas.`);
    } catch (err: any) {
      console.warn(`[MATCHING] Error al invalidar soluciones del usuario. Usando fallback local: ${err.message}`);
      // Attempt to get profiles locally and deactivate them
      this.deactivateLocalFallbackSolutionsForUser([]);
    }
  }

  static deactivateLocalFallbackSolutions(rpmProfileId: string) {
    try {
      if (fs.existsSync(this.FALLBACK_FILE)) {
        let all = JSON.parse(fs.readFileSync(this.FALLBACK_FILE, 'utf8'));
        all = all.map((s: any) => {
          if (s.rpm_profile_id === rpmProfileId) {
            return { ...s, is_active: false };
          }
          return s;
        });
        fs.writeFileSync(this.FALLBACK_FILE, JSON.stringify(all, null, 2), 'utf8');
      }
    } catch (e: any) {
      console.error(e);
    }
  }

  static deactivateLocalFallbackSolutionsForUser(profileIds: string[]) {
    try {
      if (fs.existsSync(this.FALLBACK_FILE)) {
        let all = JSON.parse(fs.readFileSync(this.FALLBACK_FILE, 'utf8'));
        all = all.map((s: any) => {
          // If profileIds is empty, deactivate all (full reset)
          if (profileIds.length === 0 || profileIds.includes(s.rpm_profile_id)) {
            return { ...s, is_active: false };
          }
          return s;
        });
        fs.writeFileSync(this.FALLBACK_FILE, JSON.stringify(all, null, 2), 'utf8');
        console.log(`[MATCHING] Fallback local: ${all.length} soluciones desactivadas.`);
      }
    } catch (e: any) {
      console.error(e);
    }
  }

  static async runMatching(userId: string): Promise<{ action: 'reuse' | 'regenerate'; opportunities: MatchedOpportunity[]; rpmProfile: any; newHash: string }> {
    console.log(`[MATCHING] Iniciando Motor de Matching para usuario: ${userId}...`);

    // 1. Load active profile
    const rpmProfile = await this.loadActiveProfile(userId);
    if (!rpmProfile) {
      throw new Error(`[MATCHING-FATAL] No active RPM profile found for user: ${userId}`);
    }

    const newHash = this.getCriteriaHash(rpmProfile);
    console.log(`[MATCHING] SHA-256 criteria hash calculado: ${newHash}`);

    // 2. Check if solutions with same hash already exist
    const activeSolutions = await this.getExistingActiveSolutions(rpmProfile.id);
    if (activeSolutions.length > 0 && activeSolutions[0].criteria_hash === newHash) {
      console.log(`[MATCHING] ¡DYNAMIC BYPASS! El hash coincide. Reutilizando ${activeSolutions.length} propuestas vigentes.`);
      return {
        action: 'reuse',
        opportunities: [],
        rpmProfile,
        newHash
      };
    }

    console.log(`[MATCHING] Hash difiere o no existen propuestas. Gatillando invalidación y matching...`);

    // 3. Load all active pain points, video classifications and sources
    const { data: painPoints, error: ppErr } = await supabaseAdmin
      .from('pain_points')
      .select('*')
      .eq('is_active', true);
    if (ppErr) throw ppErr;

    const { data: classifications, error: cErr } = await supabaseAdmin
      .from('video_classifications')
      .select('*');
    if (cErr) throw cErr;

    const { data: sources, error: sErr } = await supabaseAdmin
      .from('pain_point_sources')
      .select('*');
    if (sErr) throw sErr;

    console.log(`[MATCHING] Cargados: ${painPoints.length} pain points, ${classifications.length} clasificaciones, ${sources.length} fuentes.`);

    const matchedOpportunities: MatchedOpportunity[] = [];

    const map = rpmProfile.raw_data?.map || {};
    const results = rpmProfile.raw_data?.results || {};
    const availableCapital = String(rpmProfile.capital_range || '1.000–3.000');
    const availableHours = String(results.hoursPerWeek || '10-20');
    const techSkill = Number(map.techSkill || 3);
    const salesSkill = Number(map.salesSkill || 3);

    // 4. Evaluate each candidate using Gatekeepers
    for (const pp of painPoints) {
      const isTech = String(pp.category || '').toLowerCase().includes('saas') || 
                     String(pp.category || '').toLowerCase().includes('software');

      // 4.1 Capital Gatekeeper
      if (isTech && (availableCapital.includes('0-500') || availableCapital.includes('0-$500')) && pp.severity_score >= 8) {
        console.warn(`[MATCHING-GATEKEEPER] Discarded pain point "${pp.title}" [ID: ${pp.id}]. Reason: GATEKEEPER_CAPITAL_FAIL (Insufficient capital for complex SaaS)`);
        continue;
      }

      // 4.2 Time Gatekeeper
      if ((availableHours.includes('0-10') || availableHours.includes('10')) && pp.severity_score >= 8) {
        console.warn(`[MATCHING-GATEKEEPER] Discarded pain point "${pp.title}" [ID: ${pp.id}]. Reason: GATEKEEPER_TIME_LIMIT (Insufficient hours for highly intensive project setup)`);
        continue;
      }

      // 4.3 Skills Gatekeeper
      if (isTech && techSkill < 3) {
        console.warn(`[MATCHING-GATEKEEPER] Discarded pain point "${pp.title}" [ID: ${pp.id}]. Reason: GATEKEEPER_SKILLS_FAIL (Tech skill too low for SaaS development)`);
        continue;
      }
      if (!isTech && salesSkill < 2) {
        console.warn(`[MATCHING-GATEKEEPER] Discarded pain point "${pp.title}" [ID: ${pp.id}]. Reason: GATEKEEPER_SKILLS_FAIL (Sales skill too low for physical outreach / operational business)`);
        continue;
      }

      // 4.4 Evidence Gatekeeper (Hito 5 rule: minimum 1 associated pain point, minimum 1 video associated)
      const relatedClasses = classifications.filter(c => c.pain_point_id === pp.id);
      const relatedVideoIds = Array.from(new Set(relatedClasses.map(c => c.youtube_video_id).filter(Boolean)));

      if (relatedVideoIds.length < 1) {
        console.warn(`[MATCHING-GATEKEEPER] Discarded pain point "${pp.title}" [ID: ${pp.id}]. Reason: Candidate rejected: insufficient evidence (0 associated videos classified)`);
        continue;
      }

      // 4.5 Candidate is valid! Apply detailed fit score scoring
      const relatedSources = sources.filter(s => s.pain_point_id === pp.id);
      const fitResult = FitScoreEngine.calculateFit(rpmProfile, pp, classifications, relatedSources.length);

      matchedOpportunities.push({
        pain_point: pp,
        fit: fitResult,
        videos: relatedVideoIds,
        sourcesCount: relatedSources.length
      });
    }

    // 5. Rank Opportunities by Fit Score descending
    matchedOpportunities.sort((a, b) => b.fit.fit_score - a.fit.fit_score);

    console.log(`[MATCHING] Matching determinista completo. Candidatos aprobados: ${matchedOpportunities.length}.`);

    // 6. Apply Diversity Rule: Max 2 proposals per principal category
    const selected: MatchedOpportunity[] = [];
    const categoryCounts: Record<string, number> = {};

    for (const opt of matchedOpportunities) {
      if (selected.length >= 5) break; // Fetch a few more to have fallbacks in case LLM fails

      const category = opt.pain_point.category || 'Otros';
      const count = categoryCounts[category] || 0;

      if (count < 2) {
        selected.push(opt);
        categoryCounts[category] = count + 1;
      } else {
        console.log(`[MATCHING-DIVERSITY] Skipping candidate "${opt.pain_point.title}" in category "${category}" to preserve diversity (already matched 2).`);
      }
    }

    // If we didn't fill the slots due to diversity filters, relax diversity to fill the top 5
    if (selected.length < 4) {
      for (const opt of matchedOpportunities) {
        if (selected.length >= 5) break;
        if (!selected.some(s => s.pain_point.id === opt.pain_point.id)) {
          selected.push(opt);
        }
      }
    }

    console.log(`[MATCHING] Top opportunities seleccionadas para generación (Variadas):`, selected.map(s => `${s.pain_point.title} (${s.pain_point.category}) -> Score: ${s.fit.fit_score}`));

    return {
      action: 'regenerate',
      opportunities: selected,
      rpmProfile,
      newHash
    };
  }
}
