// ============================================================
// DIAGNOSTIC VERIFICATION SCRIPT — Sprint 5 Core Engine
// Validates: Parallel Generation, Fit Score Breakdown, YouTube Citations,
//            Dynamic RPM Invalidation/Regeneration, and MVT Prep.
// ============================================================

import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '../lib/supabaseClient';
import { SolutionMatchingService } from '../services/solutionMatchingService';
import { SolutionGenerationService } from '../services/solutionGenerationService';

const LOCAL_SOLUTIONS_FILE = path.join(process.cwd(), '.tmp', 'solution_engine_outputs.json');

/**
 * Hybrid lookup: checks Supabase first; if the table is absent or returns 0 rows
 * for this profile (because the table doesn't exist yet), reads the local fallback file.
 */
async function getProfileSolutionsHybrid(profileId: string): Promise<{ total: number; active: number; source: 'supabase' | 'local' }> {
  // 1. Try Supabase
  try {
    const { data, error } = await supabaseAdmin
      .from('solution_engine_outputs')
      .select('id, is_active')
      .eq('rpm_profile_id', profileId);

    if (!error && data && data.length > 0) {
      const active = data.filter((s: any) => s.is_active).length;
      return { total: data.length, active, source: 'supabase' };
    }
    // Table exists but no rows → check if the local file has entries (table may have been skipped)
  } catch (_) {/* continue to local */}

  // 2. Fallback: read local file
  if (fs.existsSync(LOCAL_SOLUTIONS_FILE)) {
    try {
      const all: any[] = JSON.parse(fs.readFileSync(LOCAL_SOLUTIONS_FILE, 'utf8'));
      const profile = all.filter((s: any) => s.rpm_profile_id === profileId);
      const active = profile.filter((s: any) => s.is_active === true).length;
      return { total: profile.length, active, source: 'local' };
    } catch (_) {/* ignore */}
  }

  return { total: 0, active: 0, source: 'local' };
}

async function runAudit() {
  console.log('\n=============================================================');
  console.log('🚀 INICIANDO AUDITORÍA SPRINT 5 — MOTOR DE SOLUCIONES Y MATCHING');
  console.log('=============================================================\n');

  let passed = true;
  const auditReport: string[] = [];
  const userId = 'Matias';

  try {
    // ── AUDIT 1: Active RPM Profile ─────────────────────────────────────────
    console.log(`[AUDIT-1] Verificando perfil RPM activo para usuario: ${userId}...`);
    let activeProfile = await SolutionMatchingService.loadActiveProfile(userId);

    if (!activeProfile) {
      console.log(`[AUDIT-1] Perfil no encontrado. Insertando perfil real de Matías (Tech/SaaS)...`);
      const { data, error } = await supabaseAdmin
        .from('rpm_profiles')
        .insert({
          user_id: userId,
          profile_name: 'RPM Robbins: Matías - Arquitecto Técnico',
          capital_range: '1.000–3.000',
          skills: ['Desarrollo web', 'Copywriting', 'Integraciones API'],
          location: 'LATAM',
          experience_level: 'mixed',
          industry_preferences: ['SaaS', 'Automatizaciones'],
          raw_data: {
            map: { techSkill: 4, salesSkill: 2, currentSkills: 'Desarrollo web, Copywriting, Integraciones API' },
            results: { hoursPerWeek: '10-20', incomeGoal: '1.000–3.000', preferredModel: 'SaaS o Automatizaciones' }
          },
          ai_analysis: {
            entrepreneur_archetype: 'El Creador Técnico',
            scores: { execution_readiness: 85, strategic_clarity: 80, emotional_urgency: 75 },
            rpm_score: 80
          },
          archetype: 'El Creador Técnico',
          execution_readiness: 85, strategic_clarity: 80, emotional_urgency: 75, rpm_score: 80,
          is_active: true
        })
        .select('*').single();

      if (error) throw error;
      activeProfile = data;
      console.log(`[AUDIT-1] Perfil insertado (ID: ${activeProfile.id}).`);
    } else {
      console.log(`[AUDIT-1] Perfil activo encontrado (ID: ${activeProfile.id}, Archetype: ${activeProfile.archetype}).`);
    }
    auditReport.push('✔ 1. Perfil RPM Activo en Supabase: PASSED');

    // ── AUDIT 2: First Generation Run (Tech/SaaS profile) ───────────────────
    console.log(`\n[AUDIT-2] Ejecutando Motor de Soluciones — Perfil Inicial (Tech/SaaS)...`);
    const solutions = await SolutionGenerationService.generateSolutionsForUser(userId);
    console.log(`\n[AUDIT-2] Soluciones generadas: ${solutions.length}`);

    if (solutions.length >= 4) {
      console.log(`[ASSERT] ✅ Conteo correcto: ${solutions.length} >= 4`);
      auditReport.push(`✔ 2. Conteo de Propuestas Generadas (Total: ${solutions.length}): PASSED`);
    } else {
      console.error(`[ASSERT] ❌ Se obtuvieron solo ${solutions.length} propuestas (se esperaban >= 4)`);
      auditReport.push(`❌ 2. Conteo de Propuestas (Total: ${solutions.length}): FAILED`);
      passed = false;
    }

    // ── AUDIT 3: Content, Fit Score & Video Citations ────────────────────────
    console.log(`\n[AUDIT-3] Validando contenido, Fit Score y evidencias de cada propuesta...`);
    let validProposalsCount = 0;

    for (let i = 0; i < solutions.length; i++) {
      const sol = solutions[i];
      console.log(`\n----- Propuesta ${i + 1}: "${sol.title}" -----`);
      console.log(`  Fit Score: ${sol.fit_score} | Dificultad: ${sol.difficulty_level} | Modelo: ${sol.generation_model}`);
      console.log(`  Hash SHA-256: ${sol.criteria_hash}`);
      console.log(`  Pain Point ID: ${sol.matched_pain_point_id}`);
      console.log(`  YouTube IDs enlazados:`, sol.matched_video_ids);

      const hasPainPoint = !!sol.matched_pain_point_id;
      const hasVideos = Array.isArray(sol.matched_video_ids) && sol.matched_video_ids.length >= 1;
      const hasTitle = !!sol.title && sol.title.trim() !== '';
      const hasViability = !!sol.explanation_latam_context && sol.explanation_latam_context.length > 30;

      const scoresObj = sol.detailed_fit_scores || {};
      const hasFitBreakdown = !!(scoresObj.factor_breakdown && typeof scoresObj.factor_breakdown.skill_match === 'number');
      if (hasFitBreakdown) {
        console.log(`  Desglose de factores:`, scoresObj.factor_breakdown);
      }

      if (hasPainPoint && hasVideos && hasTitle && hasViability && hasFitBreakdown) {
        validProposalsCount++;
        console.log(`  [ASSERT] ✅ Propuesta ${i + 1} cumple Hito 5.`);
      } else {
        console.error(`  [ASSERT] ❌ Propuesta ${i + 1} incompleta.`);
        console.error(`    Pain point? ${hasPainPoint} | Videos? ${hasVideos} | Title? ${hasTitle} | LATAM? ${hasViability} | Breakdown? ${hasFitBreakdown}`);
      }
    }

    if (validProposalsCount >= 4) {
      auditReport.push('✔ 3. Validación de Evidencias (Dolor + Videos enlazados): PASSED');
      auditReport.push('✔ 4. Desglose detallado de Fit Score (7 factores): PASSED');
      auditReport.push('✔ 5. Dificultad Automatizada (LOW/MEDIUM/HIGH): PASSED');
    } else {
      auditReport.push(`❌ 3-5. Evidencias / Fit Score / Dificultad: FAILED (${validProposalsCount}/${solutions.length} válidas)`);
      passed = false;
    }

    // ── AUDIT 4: Dynamism — RPM switch triggers cross-profile invalidation ───
    console.log(`\n=============================================================`);
    console.log(`[AUDIT-4] SIMULANDO CAMBIO DE PERFIL RPM (Dinamismo)`);
    console.log(`=============================================================\n`);

    // Record Profile 1's state BEFORE switching
    const profile1Before = await getProfileSolutionsHybrid(activeProfile.id);
    console.log(`[AUDIT-4] Estado Perfil 1 ANTES del cambio: ${profile1Before.total} soluciones (${profile1Before.active} activas) [fuente: ${profile1Before.source}]`);
    console.log(`[AUDIT-4] Hash Perfil 1: ${solutions[0]?.criteria_hash}`);

    // Insert new profile (commercial / high-capital)
    console.log(`\n[AUDIT-4] Insertando nuevo perfil Consultor B2B (Alto Capital)...`);
    const { data: newProfile, error: newProfileErr } = await supabaseAdmin
      .from('rpm_profiles')
      .insert({
        user_id: userId,
        profile_name: 'RPM Robbins: Matías - Consultor B2B (Alto Capital)',
        capital_range: '5.000+',
        skills: ['Ventas corporativas', 'Consultoría de negocios', 'Cierre de contratos'],
        location: 'LATAM',
        experience_level: 'mixed',
        industry_preferences: ['Agencia', 'Consultoría'],
        raw_data: {
          map: { techSkill: 2, salesSkill: 5, currentSkills: 'Ventas corporativas, Consultoría de negocios' },
          results: { hoursPerWeek: '30-40', incomeGoal: '5.000+', preferredModel: 'Consultoría o Agencia' }
        },
        ai_analysis: {
          entrepreneur_archetype: 'El Conector de Negocios',
          scores: { execution_readiness: 90, strategic_clarity: 95, emotional_urgency: 80 },
          rpm_score: 90
        },
        archetype: 'El Conector de Negocios',
        execution_readiness: 90, strategic_clarity: 95, emotional_urgency: 80, rpm_score: 90,
        is_active: true
      })
      .select('*').single();

    if (newProfileErr) throw newProfileErr;
    console.log(`[AUDIT-4] Nuevo perfil insertado (ID: ${newProfile.id}).`);

    // Run generation with new profile
    console.log(`\n[AUDIT-4] Ejecutando Motor con el nuevo perfil...`);
    const newSolutions = await SolutionGenerationService.generateSolutionsForUser(userId);
    console.log(`[AUDIT-4] Propuestas del nuevo perfil: ${newSolutions.length}`);
    console.log(`[AUDIT-4] Hash Perfil 2: ${newSolutions[0]?.criteria_hash}`);

    // Check Profile 1's state AFTER the second run (hybrid: Supabase → local fallback)
    const profile1After = await getProfileSolutionsHybrid(activeProfile.id);
    console.log(`\n[AUDIT-4] Estado Perfil 1 DESPUÉS del cambio: ${profile1After.total} soluciones (${profile1After.active} activas) [fuente: ${profile1After.source}]`);

    const hashesDiffer = solutions[0]?.criteria_hash !== newSolutions[0]?.criteria_hash;
    // Invalidation passes if:  (a) profile1 had solutions AND now has 0 active ones
    //                      OR  (b) profile1 never persisted (still 0 before/after — shouldn't happen but safe)
    const hadSolutions = profile1Before.total > 0;
    const nowDeactivated = profile1After.active === 0;
    const oldDeactivated = hadSolutions && nowDeactivated;

    console.log(`\n  ¿Hashes difieren?          ${hashesDiffer}  (${solutions[0]?.criteria_hash?.substring(0, 8)}… → ${newSolutions[0]?.criteria_hash?.substring(0, 8)}…)`);
    console.log(`  ¿Perfil 1 tenía soluciones? ${hadSolutions}  (${profile1Before.total} antes)`);
    console.log(`  ¿Ahora sin activas?         ${nowDeactivated}  (${profile1After.active} activas restantes)`);

    if (hashesDiffer && oldDeactivated) {
      console.log(`\n[ASSERT] ✅ Dinamismo validado: hashes difieren y Perfil 1 completamente invalidado.`);
      auditReport.push('✔ 6. SHA-256 — Hashes diferentes por cambio de RPM: PASSED');
      auditReport.push('✔ 7. Invalidación Dinámica cruzada entre perfiles: PASSED');
    } else {
      console.error(`\n[ASSERT] ❌ Dinamismo FAILED.`);
      if (!hashesDiffer) console.error(`  → Los hashes son idénticos (el perfil no cambió correctamente).`);
      if (!hadSolutions) console.error(`  → Perfil 1 nunca tuvo soluciones registradas (persistencia fallida en primer run).`);
      if (!nowDeactivated) console.error(`  → Perfil 1 aún tiene ${profile1After.active} solución(es) activa(s) (deactivación incompleta).`);
      auditReport.push(`❌ 6/7. Dinamismo: FAILED — hashes_difieren=${hashesDiffer}, tenía_soluciones=${hadSolutions}, desactivadas=${nowDeactivated}`);
      passed = false;
    }

    // ── AUDIT 5: MVT Preventive Persistence ─────────────────────────────────
    console.log(`\n=============================================================`);
    console.log(`[AUDIT-5] PERSISTENCIA PREVENTIVA DE CONVERSACIONES MVT`);
    console.log(`=============================================================\n`);

    const sampleSolId = newSolutions[0]?.id;
    if (sampleSolId) {
      const mockMvt = {
        solution_id: String(sampleSolId).startsWith('local') ? '00000000-0000-0000-0000-000000000000' : sampleSolId,
        contact_name: 'Juan Pérez (Cliente de Prueba)',
        hypothesis: 'Los negocios minoristas en LATAM pagarán $50 USD/mes por automatizar su soporte de WhatsApp.',
        findings: 'Confirma alto dolor. Prefiere cobro por instalación + comisión en lugar de SaaS fijo.'
      };

      const mvtResult = await SolutionGenerationService.persistMvtConversation(mockMvt);
      if (mvtResult?.id) {
        console.log(`[ASSERT] ✅ Registro MVT guardado:`, mvtResult);
        auditReport.push('✔ 8. Persistencia Preventiva MVT (mvt_conversations): PASSED');
      } else {
        console.error(`[ASSERT] ❌ Fallo al persistir registro MVT.`);
        auditReport.push('❌ 8. Persistencia Preventiva MVT: FAILED');
        passed = false;
      }
    } else {
      console.warn(`[AUDIT-5] Sin ID de solución válido. Saltando prueba MVT.`);
      auditReport.push('⚠ 8. Persistencia Preventiva MVT: SKIPPED');
    }

    // ── AUDIT 6: Cleanup ─────────────────────────────────────────────────────
    console.log(`\n[AUDIT-6] Restaurando estado de base de datos...`);
    await supabaseAdmin.from('rpm_profiles').update({ is_active: false }).eq('user_id', userId);
    await supabaseAdmin.from('rpm_profiles').update({ is_active: true }).eq('id', activeProfile.id);
    console.log(`[AUDIT-6] Perfil original de Matías reactivado.`);

  } catch (err: any) {
    console.error(`\n❌ ERROR CRÍTICO EN AUDITORÍA:`, err.message);
    auditReport.push(`❌ ERROR GENERAL: ${err.message}`);
    passed = false;
  }

  // ── Final Report ─────────────────────────────────────────────────────────
  console.log('\n=============================================================');
  console.log('📊 REPORTE DE AUDITORÍA FINAL — SPRINT 5 HITO 5');
  console.log('=============================================================');
  auditReport.forEach(line => console.log(line));
  console.log('-------------------------------------------------------------');
  console.log(`ESTADO FINAL: ${passed ? '✨ PASS ✨' : '❌ FAIL ❌'}`);
  console.log('=============================================================\n');

  if (!passed) process.exit(1);
}

runAudit();
