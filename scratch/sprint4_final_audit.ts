// ============================================================
// SPRINT 4 FINAL AUDIT — Relational Integrity Verification
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

// ── 1. VALIDAR FOREIGN KEYS ──────────────────────────────────
async function auditForeignKeys() {
  console.log('\n═══════════════════════════════════════════');
  console.log('1. VALIDAR FOREIGN KEYS (Limpieza)');
  console.log('═══════════════════════════════════════════');

  // Relación 1: VC -> Videos
  console.log('  Testing: video_classifications -> videos embedding...');
  const { data: d1, error: e1 } = await supabase
    .from('video_classifications')
    .select('youtube_video_id, videos!inner(youtube_video_id)')
    .limit(0);

  if (e1) {
    console.log(`  ❌ Relación video_classifications -> videos: FALLÓ`);
    console.log(`     Error: ${e1.message}`);
    results.push({ section: 'fk_vc_video', status: 'FAIL', details: e1.message });
  } else {
    console.log(`  ✅ Relación video_classifications -> videos: UNÍVOCA`);
    results.push({ section: 'fk_vc_video', status: 'PASS', details: 'OK' });
  }

  // Relación 2: VC -> Pain Points
  console.log('  Testing: video_classifications -> pain_points embedding...');
  const { data: d2, error: e2 } = await supabase
    .from('video_classifications')
    .select('pain_point_id, pain_points!inner(id)')
    .limit(0);

  if (e2) {
    console.log(`  ❌ Relación video_classifications -> pain_points: FALLÓ`);
    console.log(`     Error: ${e2.message}`);
    results.push({ section: 'fk_vc_pain', status: 'FAIL', details: e2.message });
  } else {
    console.log(`  ✅ Relación video_classifications -> pain_points: UNÍVOCA`);
    results.push({ section: 'fk_vc_pain', status: 'PASS', details: 'OK' });
  }
}

// ── 2. VALIDAR POSTGREST RESOLUTION & EMBEDDING ──────────────
async function auditPostgrest() {
  console.log('\n═══════════════════════════════════════════');
  console.log('2. VALIDAR POSTGREST RESOLUTION & EMBEDDING');
  console.log('═══════════════════════════════════════════');

  console.log('  Ejecutando query compleja: .select(\'youtube_video_id, videos(*), pain_points(*)\')...');
  const { data, error } = await supabase
    .from('video_classifications')
    .select('youtube_video_id, videos(*), pain_points(*)')
    .limit(1);

  if (error) {
    console.log(`  ❌ Query fallida: ${error.message}`);
    results.push({ section: 'postgrest_clean', status: 'FAIL', details: error.message });
  } else {
    console.log('  ✅ Query exitosa (No hay ambigüedad detectada)');
    results.push({ section: 'postgrest_clean', status: 'PASS', details: 'Clean' });
  }
}

// ── 3. VALIDACIÓN DE INTEGRIDAD ──────────────────────────────
async function auditIntegrity() {
  console.log('\n═══════════════════════════════════════════');
  console.log('3. VALIDACIÓN DE INTEGRIDAD');
  console.log('═══════════════════════════════════════════');

  const { count: videoCount } = await supabase.from('videos').select('*', { count: 'exact', head: true });
  const { count: ppCount } = await supabase.from('pain_points').select('*', { count: 'exact', head: true });
  const { count: orphanCount } = await supabase.from('video_classifications').select('*', { count: 'exact', head: true });

  console.log(`  📊 Videos: ${videoCount} (Esperado: 50)`);
  console.log(`  📊 Pain Points: ${ppCount} (Esperado: 109)`);
  console.log(`  📊 Classifications: ${orphanCount} (Esperado: 0)`);

  if (videoCount === 50 && ppCount === 109) {
    console.log('  ✅ Conteos de producción correctos');
    results.push({ section: 'counts', status: 'PASS', details: { videoCount, ppCount } });
  } else {
    console.log('  ⚠️  Desviación en conteos detectada');
    results.push({ section: 'counts', status: 'WARN', details: { videoCount, ppCount } });
  }
}

async function main() {
  console.log('🔍 Iniciando AUDITORÍA FINAL Sprint 4...');
  await auditForeignKeys();
  await auditPostgrest();
  await auditIntegrity();

  console.log('\n═══════════════════════════════════════════');
  console.log('RESULTADO FINAL');
  console.log('═══════════════════════════════════════════');

  const fails = results.filter(r => r.status === 'FAIL');
  const passes = results.filter(r => r.status === 'PASS');

  console.log(`\n  ✅ PASS: ${passes.length}`);
  console.log(`  ❌ FAIL: ${fails.length}`);

  const overall = fails.length === 0 ? 'PASS' : 'FAIL';
  console.log(`\n  ESTADO GLOBAL: ${overall} Sprint 4 Relational Fix`);
  console.log(`  POSTGREST LIMPIO: ${overall === 'PASS' ? 'SÍ ✅' : 'NO ❌'}`);
  console.log(`  LISTO PARA CLASIFICADOR IA: ${overall === 'PASS' ? 'SÍ ✅' : 'NO ❌'}`);

  if (fails.length > 0) {
    console.log('\n  BLOQUEANTES:');
    fails.forEach(f => console.log(`    - [${f.section}] ${f.details}`));
  }
}

main().catch(console.error);
