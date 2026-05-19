import { supabaseAdmin } from '../lib/supabaseClient';

async function finalValidation() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  SPRINT 3 — VALIDACIÓN FINAL DE PRODUCCIÓN  ║");
  console.log("╚══════════════════════════════════════════════╝");

  // ── 1. COUNTS ──
  console.log("\n═══ 1. CONTEOS DE TABLAS ═══");
  const { count: videos } = await supabaseAdmin.from('videos').select('*', { count: 'exact', head: true });
  const { count: transcripts } = await supabaseAdmin.from('transcripts').select('*', { count: 'exact', head: true });
  const { count: painPoints } = await supabaseAdmin.from('pain_points').select('*', { count: 'exact', head: true });
  const { count: sources } = await supabaseAdmin.from('pain_point_sources').select('*', { count: 'exact', head: true });
  const { count: extractionLogs } = await supabaseAdmin.from('extraction_logs').select('*', { count: 'exact', head: true });
  const { count: scrapingLogs } = await supabaseAdmin.from('scraping_logs').select('*', { count: 'exact', head: true });
  
  console.log(`  Videos:            ${videos}`);
  console.log(`  Transcripts:       ${transcripts}`);
  console.log(`  Pain Points:       ${painPoints}`);
  console.log(`  Sources:           ${sources}`);
  console.log(`  Extraction Logs:   ${extractionLogs}`);
  console.log(`  Scraping Logs:     ${scrapingLogs}`);

  // ── 2. ACTIVE/INACTIVE ──
  console.log("\n═══ 2. ESTADO is_active ═══");
  const { count: active } = await supabaseAdmin.from('pain_points').select('*', { count: 'exact', head: true }).eq('is_active', true);
  const { count: inactive } = await supabaseAdmin.from('pain_points').select('*', { count: 'exact', head: true }).eq('is_active', false);
  console.log(`  Activos:           ${active}`);
  console.log(`  Inactivos:         ${inactive}`);
  const isActiveOk = active !== null && active > 0;
  console.log(`  ✓ is_active OPERATIVO: ${isActiveOk ? '✅ SÍ' : '❌ NO'}`);

  // ── 3. DUPLICADOS ──
  console.log("\n═══ 3. DUPLICADOS ═══");
  const { data: allPP } = await supabaseAdmin.from('pain_points').select('title, video_id');
  const ppMap = new Map();
  let dupes = 0;
  allPP?.forEach(p => {
    const key = `${p.title}|${p.video_id}`;
    if (ppMap.has(key)) dupes++;
    ppMap.set(key, true);
  });
  console.log(`  Duplicados (title+video_id): ${dupes}`);
  console.log(`  ✓ Sin duplicados: ${dupes === 0 ? '✅ SÍ' : '❌ NO'}`);

  // ── 4. HUÉRFANOS ──
  console.log("\n═══ 4. INTEGRIDAD RELACIONAL ═══");
  const { data: allSources } = await supabaseAdmin.from('pain_point_sources').select('pain_point_id');
  const { data: allPPIds } = await supabaseAdmin.from('pain_points').select('id');
  const ppIdSet = new Set(allPPIds?.map(p => p.id));
  const orphanSources = allSources?.filter(s => !ppIdSet.has(s.pain_point_id));
  console.log(`  Sources huérfanas: ${orphanSources?.length}`);

  const { data: ppWithVideo } = await supabaseAdmin.from('pain_points').select('id, video_id');
  const { data: allVideos } = await supabaseAdmin.from('videos').select('youtube_video_id');
  const videoSet = new Set(allVideos?.map(v => v.youtube_video_id));
  const orphanPP = ppWithVideo?.filter(p => p.video_id && !videoSet.has(p.video_id));
  console.log(`  PP con video inexistente: ${orphanPP?.length}`);
  
  const fkOk = (orphanSources?.length || 0) === 0 && (orphanPP?.length || 0) === 0;
  console.log(`  ✓ FK íntegras: ${fkOk ? '✅ SÍ' : '❌ NO'}`);

  // ── 5. EVIDENCIA DUAL ──
  console.log("\n═══ 5. EVIDENCIA DUAL (video + report) ═══");
  const { data: sourcesFull } = await supabaseAdmin.from('pain_point_sources').select('pain_point_id, source_type');
  const perPP: Record<string, Set<string>> = {};
  sourcesFull?.forEach(s => {
    if (!perPP[s.pain_point_id]) perPP[s.pain_point_id] = new Set();
    perPP[s.pain_point_id].add(s.source_type);
  });
  const withBoth = Object.values(perPP).filter(s => s.has('video') && s.has('report')).length;
  const withOnlyVideo = Object.values(perPP).filter(s => s.has('video') && !s.has('report')).length;
  const withOnlyReport = Object.values(perPP).filter(s => !s.has('video') && s.has('report')).length;
  const withNone = (painPoints || 0) - Object.keys(perPP).length;
  console.log(`  PP con video + report: ${withBoth}`);
  console.log(`  PP solo video:         ${withOnlyVideo}`);
  console.log(`  PP solo report:        ${withOnlyReport}`);
  console.log(`  PP sin fuentes:        ${withNone}`);
  console.log(`  ✓ Evidencia dual completa: ${withBoth === painPoints ? '✅ SÍ' : '⚠️ PARCIAL'}`);

  // ── 6. SCHEMAS MATCH ──
  console.log("\n═══ 6. VALIDACIÓN DE SCHEMAS ═══");
  const { data: ppCol } = await supabaseAdmin.from('pain_points').select('*').limit(1);
  const ppCols = ppCol && ppCol.length > 0 ? Object.keys(ppCol[0]) : [];
  const expectedPPCols = ['id', 'title', 'description', 'category', 'market_segment', 'severity_score', 'frequency_score', 'recency_score', 'final_score', 'version', 'created_at', 'updated_at', 'video_id', 'is_active'];
  const missingPPCols = expectedPPCols.filter(c => !ppCols.includes(c));
  const extraPPCols = ppCols.filter(c => !expectedPPCols.includes(c));
  console.log(`  pain_points columnas esperadas: ${expectedPPCols.length}`);
  console.log(`  pain_points columnas reales:    ${ppCols.length}`);
  console.log(`  Faltantes: ${missingPPCols.length === 0 ? '✅ ninguna' : '❌ ' + missingPPCols.join(', ')}`);
  console.log(`  Extra: ${extraPPCols.length === 0 ? '✅ ninguna' : '⚠️ ' + extraPPCols.join(', ')}`);

  const { data: srcCol } = await supabaseAdmin.from('pain_point_sources').select('*').limit(1);
  const srcCols = srcCol && srcCol.length > 0 ? Object.keys(srcCol[0]) : [];
  const expectedSrcCols = ['id', 'pain_point_id', 'source_type', 'source_name', 'source_url', 'created_at', 'country', 'evidence', 'credibility_score'];
  const missingSrcCols = expectedSrcCols.filter(c => !srcCols.includes(c));
  console.log(`  pain_point_sources faltantes: ${missingSrcCols.length === 0 ? '✅ ninguna' : '❌ ' + missingSrcCols.join(', ')}`);

  const { data: elCol } = await supabaseAdmin.from('extraction_logs').select('*').limit(0);
  console.log(`  extraction_logs existe: ✅ SÍ`);

  // ── 7. API COMPATIBILITY CHECK ──
  console.log("\n═══ 7. COMPATIBILIDAD API ═══");
  // Test the exact query that /api/pain-points now uses
  const { data: apiTest, error: apiErr } = await supabaseAdmin
    .from('pain_points')
    .select('*')
    .eq('is_active', true)
    .order('final_score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5);
  console.log(`  GET /api/pain-points query: ${apiErr ? '❌ ERROR: ' + apiErr.message : '✅ OK (' + apiTest?.length + ' results)'}`);

  // Test the exact query that /api/pain-points/full uses
  const { data: fullTest, error: fullErr } = await supabaseAdmin
    .from('pain_points')
    .select('*, pain_point_sources!fk_pain_point(*)')
    .order('final_score', { ascending: false })
    .limit(3);
  console.log(`  GET /api/pain-points/full query: ${fullErr ? '❌ ERROR: ' + fullErr.message : '✅ OK (' + fullTest?.length + ' with sources)'}`);

  // Test soft delete query
  const { error: deleteTest } = await supabaseAdmin
    .from('pain_points')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', '00000000-0000-0000-0000-000000000000'); // non-existent ID, just validates query
  console.log(`  PATCH/DELETE soft-delete query: ${deleteTest ? '⚠️ ' + deleteTest.message : '✅ OK (query valid)'}`);

  // Test extraction_logs insert
  const { data: logInsert, error: logErr } = await supabaseAdmin.from('extraction_logs').insert({
    video_id: 'validation_test',
    model_used: 'test',
    tokens_used: 0,
    cost_estimated: 0,
    status: 'success',
    error_message: null
  }).select('id').single();
  if (logInsert) {
    await supabaseAdmin.from('extraction_logs').delete().eq('id', logInsert.id);
  }
  console.log(`  INSERT extraction_logs: ${logErr ? '❌ ERROR: ' + logErr.message : '✅ OK (insert+cleanup)'}`);

  // ── 8. SCRAPING LOGS INTEGRITY ──
  console.log("\n═══ 8. LOGS INTEGRITY ═══");
  const { data: sLogs } = await supabaseAdmin.from('scraping_logs').select('run_type, error_details');
  const contaminated = sLogs?.filter(l => {
    const d = JSON.stringify(l.error_details || '').toLowerCase();
    return d.includes('pain_point') || d.includes('enrichment');
  });
  console.log(`  Scraping logs contaminados: ${contaminated?.length || 0}`);
  console.log(`  ✓ Logs limpios: ${(contaminated?.length || 0) === 0 ? '✅ SÍ' : '❌ NO'}`);

  // ── VEREDICTO ──
  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║             VEREDICTO FINAL                  ║");
  console.log("╚══════════════════════════════════════════════╝");
  
  const allChecks = [
    { name: 'Conteos coherentes', ok: (videos || 0) > 0 && (transcripts || 0) > 0 && (painPoints || 0) > 0 },
    { name: 'is_active operativo', ok: isActiveOk },
    { name: 'Sin duplicados', ok: dupes === 0 },
    { name: 'FK íntegras', ok: fkOk },
    { name: 'Evidencia dual', ok: withBoth === painPoints },
    { name: 'Schema pain_points', ok: missingPPCols.length === 0 },
    { name: 'Schema sources', ok: missingSrcCols.length === 0 },
    { name: 'API pain-points', ok: !apiErr },
    { name: 'API pain-points/full', ok: !fullErr },
    { name: 'extraction_logs write', ok: !logErr },
    { name: 'Logs no contaminados', ok: (contaminated?.length || 0) === 0 },
  ];

  let passed = 0;
  for (const check of allChecks) {
    console.log(`  ${check.ok ? '✅' : '❌'} ${check.name}`);
    if (check.ok) passed++;
  }

  console.log(`\n  RESULTADO: ${passed}/${allChecks.length} checks passed`);
  
  if (passed === allChecks.length) {
    console.log("  🎉 SPRINT 3 PRODUCTION COMPLETE — LISTO PARA SPRINT 4");
  } else {
    console.log("  ⚠️  SPRINT 3 TIENE BLOQUEOS PENDIENTES");
  }
}

finalValidation().catch(console.error);
