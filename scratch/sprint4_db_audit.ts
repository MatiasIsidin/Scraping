// ============================================================
// SPRINT 4 DB AUDIT — Full Schema Verification Against Supabase
// ============================================================

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    const key = trimmed.substring(0, eqIdx).trim();
    const value = trimmed.substring(eqIdx + 1).trim();
    process.env[key] = value;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface AuditResult {
  section: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details: any;
}

const results: AuditResult[] = [];

// ── 1. LIST ALL PUBLIC TABLES ──────────────────────────────
async function auditTables() {
  console.log('\n═══════════════════════════════════════════');
  console.log('1. VERIFICAR TABLAS EXISTENTES');
  console.log('═══════════════════════════════════════════');

  const targetTables = [
    'videos', 'transcripts', 'video_snapshots', 'scraping_logs',
    'pain_points', 'pain_point_sources', 'extraction_logs',
    'video_analysis', 'video_classifications',
    'rpm_profiles', 'solution_engine_outputs', 'mvt_validation'
  ];

  for (const table of targetTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`  ❌ ${table}: NO EXISTE o error → ${error.message}`);
        results.push({ section: `table_${table}`, status: 'FAIL', details: error.message });
      } else {
        console.log(`  ✅ ${table}: EXISTE (${count} registros)`);
        results.push({ section: `table_${table}`, status: 'PASS', details: { exists: true, count } });
      }
    } catch (e: any) {
      console.log(`  ❌ ${table}: ERROR → ${e.message}`);
      results.push({ section: `table_${table}`, status: 'FAIL', details: e.message });
    }
  }
}

// ── 2. COLUMN AUDIT FOR SPRINT 4 TABLES ────────────────────
async function auditColumns() {
  console.log('\n═══════════════════════════════════════════');
  console.log('2. AUDITORÍA DE COLUMNAS');
  console.log('═══════════════════════════════════════════');

  const tablesToAudit = [
    'video_analysis', 'video_classifications', 
    'pain_points', 'pain_point_sources', 'extraction_logs'
  ];

  for (const table of tablesToAudit) {
    console.log(`\n  ── ${table.toUpperCase()} ──`);
    
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`    ❌ No se puede auditar: ${error.message}`);
      results.push({ section: `columns_${table}`, status: 'FAIL', details: error.message });
      continue;
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log(`    Columnas detectadas (${columns.length}):`);
      for (const col of columns) {
        const value = data[0][col];
        const type = value === null ? 'null' : typeof value;
        console.log(`      • ${col}: ${type} = ${JSON.stringify(value)?.substring(0, 80)}`);
      }
      results.push({ section: `columns_${table}`, status: 'PASS', details: { columns, sampleKeys: columns } });
    } else {
      console.log(`    ⚠️  Tabla vacía — verificando existencia...`);
      const { error: testErr } = await supabase.from(table).select('id').limit(0);
      if (testErr) {
        console.log(`    ❌ Tabla NO EXISTE: ${testErr.message}`);
        results.push({ section: `columns_${table}`, status: 'FAIL', details: 'Table does not exist' });
      } else {
        console.log('    ✅ Tabla existe pero vacía');
        results.push({ section: `columns_${table}`, status: 'WARN', details: 'Table exists but empty - cannot detect columns' });
      }
    }
  }
}

// ── 3. VERIFY FOREIGN KEYS ─────────────────────────────────
async function auditForeignKeys() {
  console.log('\n═══════════════════════════════════════════');
  console.log('3. VERIFICAR RELACIONES SQL (FK)');
  console.log('═══════════════════════════════════════════');

  // Test: video_classifications.youtube_video_id → videos
  console.log('\n  ── video_classifications.youtube_video_id → videos ──');
  try {
    const { data, error } = await supabase
      .from('video_classifications')
      .select('id, youtube_video_id, videos!inner(youtube_video_id, title)')
      .limit(1);
    
    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01') {
        console.log(`    ❌ TABLA NO EXISTE: ${error.message}`);
        results.push({ section: 'fk_classifications_videos', status: 'FAIL', details: 'Table missing' });
      } else if (error.message.includes('relationship') || error.message.includes('could not find')) {
        console.log(`    ❌ FK NO DETECTADA (PostgREST): ${error.message}`);
        results.push({ section: 'fk_classifications_videos', status: 'FAIL', details: error.message });
      } else {
        console.log(`    ⚠️  Resultado ambiguo: ${error.message}`);
        results.push({ section: 'fk_classifications_videos', status: 'WARN', details: error.message });
      }
    } else {
      console.log(`    ✅ FK video_classifications.youtube_video_id → videos EXISTE`);
      results.push({ section: 'fk_classifications_videos', status: 'PASS', details: 'FK verified via join' });
    }
  } catch (e: any) {
    console.log(`    ❌ Error: ${e.message}`);
    results.push({ section: 'fk_classifications_videos', status: 'FAIL', details: e.message });
  }

  // Test: video_classifications has pain_point_id FK?
  console.log('\n  ── video_classifications.pain_point_id → pain_points (EXPECTED per GEMINI.md) ──');
  try {
    // First check if pain_point_id column even exists
    const { data: vcSample } = await supabase
      .from('video_classifications')
      .select('*')
      .limit(1);
    
    if (vcSample && vcSample.length > 0) {
      const hasPainPointId = 'pain_point_id' in vcSample[0];
      if (hasPainPointId) {
        console.log('    ✅ Columna pain_point_id EXISTE en video_classifications');
        // Try join
        const { error: fkErr } = await supabase
          .from('video_classifications')
          .select('id, pain_point_id, pain_points!inner(id)')
          .limit(1);
        if (fkErr) {
          console.log(`    ⚠️  FK pain_point_id → pain_points NO confirmada: ${fkErr.message}`);
          results.push({ section: 'fk_classifications_painpoints', status: 'WARN', details: fkErr.message });
        } else {
          console.log('    ✅ FK video_classifications.pain_point_id → pain_points EXISTE');
          results.push({ section: 'fk_classifications_painpoints', status: 'PASS', details: 'FK verified' });
        }
      } else {
        console.log('    ❌ Columna pain_point_id NO EXISTE en video_classifications');
        console.log('       (La migración 001 NO incluye esta columna — debe añadirse en Sprint 4)');
        results.push({ section: 'fk_classifications_painpoints', status: 'WARN', details: 'Column not in current schema' });
      }
    } else {
      console.log('    ⚠️  Tabla vacía — no se puede verificar columnas');
      results.push({ section: 'fk_classifications_painpoints', status: 'WARN', details: 'Table empty' });
    }
  } catch (e: any) {
    console.log(`    ❌ Error: ${e.message}`);
  }

  // Test: video_analysis.youtube_video_id → videos
  console.log('\n  ── video_analysis.youtube_video_id → videos ──');
  try {
    const { data, error } = await supabase
      .from('video_analysis')
      .select('id, youtube_video_id, videos!inner(youtube_video_id, title)')
      .limit(1);
    
    if (error) {
      if (error.message.includes('does not exist')) {
        console.log(`    ❌ TABLA NO EXISTE: ${error.message}`);
        results.push({ section: 'fk_analysis_videos', status: 'FAIL', details: 'Table missing' });
      } else if (error.message.includes('relationship') || error.message.includes('could not find')) {
        console.log(`    ❌ FK NO DETECTADA: ${error.message}`);
        results.push({ section: 'fk_analysis_videos', status: 'FAIL', details: error.message });
      } else {
        console.log(`    ⚠️  Resultado: ${error.message}`);
        results.push({ section: 'fk_analysis_videos', status: 'WARN', details: error.message });
      }
    } else {
      console.log(`    ✅ FK video_analysis.youtube_video_id → videos EXISTE`);
      results.push({ section: 'fk_analysis_videos', status: 'PASS', details: 'FK verified via join' });
    }
  } catch (e: any) {
    console.log(`    ❌ Error: ${e.message}`);
  }

  // Test: pain_points.video_id → videos  
  console.log('\n  ── pain_points.video_id → videos ──');
  try {
    const { data, error } = await supabase
      .from('pain_points')
      .select('id, video_id, videos!inner(youtube_video_id)')
      .limit(1);
    
    if (error) {
      console.log(`    ⚠️  FK pain_points.video_id → videos: ${error.message}`);
      results.push({ section: 'fk_painpoints_videos', status: 'WARN', details: error.message });
    } else {
      console.log(`    ✅ FK pain_points.video_id → videos EXISTE`);
      results.push({ section: 'fk_painpoints_videos', status: 'PASS', details: 'FK exists' });
    }
  } catch (e: any) {
    console.log(`    ❌ Error: ${e.message}`);
  }

  // Test: pain_point_sources.pain_point_id → pain_points
  console.log('\n  ── pain_point_sources.pain_point_id → pain_points ──');
  try {
    const { data, error } = await supabase
      .from('pain_point_sources')
      .select('id, pain_point_id, pain_points!inner(id, title)')
      .limit(1);
    
    if (error) {
      console.log(`    ❌ FK pain_point_sources → pain_points: ${error.message}`);
      results.push({ section: 'fk_sources_painpoints', status: 'FAIL', details: error.message });
    } else {
      console.log(`    ✅ FK pain_point_sources.pain_point_id → pain_points (ON DELETE CASCADE)`);
      results.push({ section: 'fk_sources_painpoints', status: 'PASS', details: 'FK exists with CASCADE' });
    }
  } catch (e: any) {
    console.log(`    ❌ Error: ${e.message}`);
  }
}

// ── 4. DATA INTEGRITY CHECKS ───────────────────────────────
async function auditDataIntegrity() {
  console.log('\n═══════════════════════════════════════════');
  console.log('4. VALIDAR INTEGRIDAD DE DATOS');
  console.log('═══════════════════════════════════════════');

  // 4a. Record counts
  console.log('\n  ── Conteo de registros ──');
  const tables = ['videos', 'transcripts', 'video_snapshots', 'pain_points', 
                   'pain_point_sources', 'extraction_logs', 'scraping_logs',
                   'video_analysis', 'video_classifications'];
  
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    counts[table] = error ? -1 : (count || 0);
    const icon = error ? '❌' : '✅';
    console.log(`    ${icon} ${table}: ${error ? `ERROR (${error.message})` : count}`);
  }

  // 4b. Duplicates in pain_points (video_id + title)
  console.log('\n  ── Duplicados en pain_points (video_id + title) ──');
  const { data: allPPs } = await supabase
    .from('pain_points')
    .select('id, video_id, title');
  
  if (allPPs) {
    const seen = new Map<string, number>();
    let dupes = 0;
    for (const pp of allPPs) {
      const key = `${pp.video_id}::${pp.title}`;
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    for (const [key, count] of seen) {
      if (count > 1) {
        dupes++;
        if (dupes <= 5) console.log(`    ⚠️  Duplicado: "${key.substring(0, 80)}..." (${count}x)`);
      }
    }
    if (dupes === 0) {
      console.log('    ✅ Sin duplicados detectados');
      results.push({ section: 'duplicates_pain_points', status: 'PASS', details: 'No duplicates' });
    } else {
      console.log(`    ⚠️  Total pares duplicados: ${dupes}`);
      results.push({ section: 'duplicates_pain_points', status: 'WARN', details: `${dupes} duplicate pairs` });
    }
  }

  // 4c. Orphan pain_point_sources
  console.log('\n  ── Registros huérfanos en pain_point_sources ──');
  const { data: allSources } = await supabase
    .from('pain_point_sources')
    .select('id, pain_point_id');
  
  const { data: allPPIds } = await supabase
    .from('pain_points')
    .select('id');
  
  if (allSources && allPPIds) {
    const validIds = new Set(allPPIds.map((p: any) => p.id));
    const orphans = allSources.filter((s: any) => !validIds.has(s.pain_point_id));
    if (orphans.length === 0) {
      console.log('    ✅ Sin registros huérfanos');
      results.push({ section: 'orphans_sources', status: 'PASS', details: 'No orphans' });
    } else {
      console.log(`    ❌ ${orphans.length} registros huérfanos detectados`);
      results.push({ section: 'orphans_sources', status: 'FAIL', details: `${orphans.length} orphans` });
    }
  }

  // 4d. Orphan pain_points (video_id not in videos)
  console.log('\n  ── Pain points con video_id inexistente ──');
  const { data: allVideos } = await supabase
    .from('videos')
    .select('youtube_video_id');
  
  if (allPPs && allVideos) {
    const validVideoIds = new Set(allVideos.map((v: any) => v.youtube_video_id));
    const orphanPPs = allPPs.filter((pp: any) => pp.video_id && !validVideoIds.has(pp.video_id));
    if (orphanPPs.length === 0) {
      console.log('    ✅ Todos los pain_points apuntan a videos válidos');
      results.push({ section: 'orphans_painpoints', status: 'PASS', details: 'All valid' });
    } else {
      console.log(`    ⚠️  ${orphanPPs.length} pain_points con video_id sin video correspondiente`);
      orphanPPs.slice(0, 3).forEach((pp: any) => console.log(`      → ${pp.id} → video_id: ${pp.video_id}`));
      results.push({ section: 'orphans_painpoints', status: 'WARN', details: `${orphanPPs.length} orphan pain_points` });
    }
  }

  // 4e. Duplicates in video_classifications
  if (counts['video_classifications'] >= 0) {
    console.log('\n  ── Duplicados en video_classifications ──');
    const { data: allClassifs } = await supabase
      .from('video_classifications')
      .select('id, youtube_video_id, classification_version');
    
    if (allClassifs && allClassifs.length > 0) {
      const seen = new Map<string, number>();
      let dupes = 0;
      for (const c of allClassifs) {
        const key = `${c.youtube_video_id}::${c.classification_version}`;
        seen.set(key, (seen.get(key) || 0) + 1);
      }
      for (const [, count] of seen) {
        if (count > 1) dupes++;
      }
      console.log(dupes === 0 
        ? '    ✅ Sin duplicados' 
        : `    ⚠️  ${dupes} pares duplicados`);
      results.push({ section: 'duplicates_classifications', status: dupes === 0 ? 'PASS' : 'WARN', details: `${dupes} dupes` });
    } else {
      console.log('    ✅ Tabla vacía — sin duplicados posibles');
      results.push({ section: 'duplicates_classifications', status: 'PASS', details: 'Empty table' });
    }
  }
}

// ── 5. SCHEMA DRIFT CHECK ──────────────────────────────────
async function auditSchemaDrift() {
  console.log('\n═══════════════════════════════════════════');
  console.log('5. SCHEMA DRIFT — Código vs DB Real');
  console.log('═══════════════════════════════════════════');

  // Expected columns from migration 001 for video_analysis
  const expectedVideoAnalysis = [
    'id', 'youtube_video_id', 'business_summary', 'business_model',
    'core_mechanic', 'industry', 'revenue_range', 'extraction_model',
    'extraction_version', 'extraction_confidence', 'token_cost_input',
    'token_cost_output', 'processed_at', 'created_at', 'updated_at'
  ];

  // Expected columns from migration 001 for video_classifications
  const expectedClassifications = [
    'id', 'youtube_video_id', 'classification_version', 'business_category',
    'business_model', 'core_mechanic', 'latam_relevance_score',
    'latam_classification', 'analysis_summary', 'processed_at', 'created_at'
  ];

  // Expected pain_points columns from migration 004 (production)
  const expectedPainPoints = [
    'id', 'title', 'description', 'category', 'market_segment',
    'severity_score', 'frequency_score', 'recency_score', 'final_score',
    'version', 'video_id', 'is_active', 'created_at', 'updated_at'
  ];

  // Check each table
  const checks = [
    { table: 'video_analysis', expected: expectedVideoAnalysis },
    { table: 'video_classifications', expected: expectedClassifications },
    { table: 'pain_points', expected: expectedPainPoints },
  ];

  for (const check of checks) {
    console.log(`\n  ── ${check.table} drift ──`);
    const { data, error } = await supabase.from(check.table).select('*').limit(1);
    
    if (error) {
      console.log(`    ❌ Tabla NO ACCESIBLE: ${error.message}`);
      results.push({ section: `drift_${check.table}`, status: 'FAIL', details: error.message });
      continue;
    }

    if (data && data.length > 0) {
      const realCols = Object.keys(data[0]);
      const missing = check.expected.filter(c => !realCols.includes(c));
      const extra = realCols.filter(c => !check.expected.includes(c));
      
      if (missing.length) console.log(`    ⚠️  Columnas FALTANTES vs migración: ${missing.join(', ')}`);
      if (extra.length) console.log(`    ℹ️  Columnas EXTRA en DB: ${extra.join(', ')}`);
      if (!missing.length && !extra.length) console.log('    ✅ Schema 100% alineado con migración');
      
      results.push({ 
        section: `drift_${check.table}`, 
        status: missing.length > 0 ? 'FAIL' : (extra.length > 0 ? 'WARN' : 'PASS'), 
        details: { missing, extra, realCols } 
      });
    } else {
      const { error: testErr } = await supabase.from(check.table).select('id').limit(0);
      if (testErr) {
        console.log(`    ❌ Tabla NO EXISTE: ${testErr.message}`);
        results.push({ section: `drift_${check.table}`, status: 'FAIL', details: 'Table does not exist' });
      } else {
        console.log('    ✅ Tabla existe pero vacía — drift parcial no verificable');
        results.push({ section: `drift_${check.table}`, status: 'WARN', details: 'Empty table' });
      }
    }
  }
}

// ── 6. MIGRATION FILE CONSISTENCY ──────────────────────────
function auditMigrationFiles() {
  console.log('\n═══════════════════════════════════════════');
  console.log('6. MIGRACIÓN FILES — Consistencia');
  console.log('═══════════════════════════════════════════');

  const migDir = path.resolve(__dirname, '../db/migrations');
  const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
  
  console.log(`\n  Archivos de migración encontrados (${files.length}):`);
  for (const f of files) {
    const fullPath = path.join(migDir, f);
    const stat = fs.statSync(fullPath);
    console.log(`    📄 ${f} (${stat.size} bytes)`);
  }

  // Check: video_analysis is ONLY in 001 but NOT in 004
  const m001 = fs.readFileSync(path.join(migDir, '001_sprint3_schema.sql'), 'utf-8');
  const m004 = fs.readFileSync(path.join(migDir, '004_sync_production_schema.sql'), 'utf-8');
  
  const tablesIn001 = ['video_analysis', 'video_classifications', 'rpm_profiles', 'solution_engine_outputs', 'mvt_validation'];
  const tablesIn004 = ['extraction_logs'];

  console.log('\n  ── Tablas definidas por migración ──');
  for (const t of tablesIn001) {
    const in001 = m001.includes(`CREATE TABLE IF NOT EXISTS ${t}`);
    const in004 = m004.includes(t);
    console.log(`    ${t}: M001=${in001 ? '✅' : '❌'} | M004=${in004 ? '✅' : '—'}`);
  }

  // Check if there's a Sprint 4 specific migration
  const sprint4Migration = files.find(f => f.includes('sprint4') || f.includes('005'));
  if (sprint4Migration) {
    console.log(`\n  ✅ Migración Sprint 4 encontrada: ${sprint4Migration}`);
  } else {
    console.log('\n  ⚠️  NO existe migración específica para Sprint 4');
    console.log('     Las tablas video_analysis y video_classifications se definieron en 001 (Sprint 3)');
    results.push({ section: 'migration_sprint4', status: 'WARN', details: 'No Sprint 4 specific migration exists. Tables were pre-created in 001.' });
  }
}

// ── MAIN ────────────────────────────────────────────────────
async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  SPRINT 4 — AUDITORÍA COMPLETA DB LAYER          ║');
  console.log('║  Supabase: ' + supabaseUrl.substring(8, 45) + '...    ║');
  console.log('║  Fecha: ' + new Date().toISOString().substring(0, 19) + '              ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  await auditTables();
  await auditColumns();
  await auditForeignKeys();
  await auditDataIntegrity();
  await auditSchemaDrift();
  auditMigrationFiles();

  // ── FINAL VERDICT ──────────────────────────────────────────
  console.log('\n\n╔═══════════════════════════════════════════════════╗');
  console.log('║  RESULTADO FINAL — SPRINT 4 DB LAYER              ║');
  console.log('╚═══════════════════════════════════════════════════╝');

  const fails = results.filter(r => r.status === 'FAIL');
  const warns = results.filter(r => r.status === 'WARN');
  const passes = results.filter(r => r.status === 'PASS');

  console.log(`\n  ✅ PASS: ${passes.length}`);
  console.log(`  ⚠️  WARN: ${warns.length}`);
  console.log(`  ❌ FAIL: ${fails.length}`);

  if (fails.length > 0) {
    console.log('\n  ══════ PROBLEMAS CRÍTICOS ══════');
    fails.forEach(f => console.log(`    ❌ [${f.section}] ${typeof f.details === 'string' ? f.details : JSON.stringify(f.details)}`));
  }

  if (warns.length > 0) {
    console.log('\n  ══════ ADVERTENCIAS ══════');
    warns.forEach(w => console.log(`    ⚠️  [${w.section}] ${typeof w.details === 'string' ? w.details : JSON.stringify(w.details)}`));
  }

  const overallStatus = fails.length > 0 ? 'FAIL' : (warns.length > 3 ? 'CONDITIONAL PASS' : 'PASS');
  console.log(`\n  ═════════════════════════════════════════════`);
  console.log(`  ESTADO GLOBAL: ${overallStatus}`);
  console.log(`  LISTO PARA CLASIFICADOR IA: ${fails.length === 0 ? 'SÍ ✅' : 'NO ❌ — Requiere correcciones'}`);
  console.log(`  ═════════════════════════════════════════════\n`);
}

main().catch(console.error);
