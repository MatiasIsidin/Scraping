const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').map(line => line.trim().split('=')).filter(p => p.length === 2));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function deepAudit() {
  console.log('=== AUDITORÍA TÉCNICA FINAL SPRINT 4 ===');

  // 1. Validar Schema Físico
  const tables = ['video_analysis', 'video_classifications', 'rpm_profiles', 'extraction_logs'];
  for (const table of tables) {
    const { data: cols, error } = await supabase.rpc('get_table_columns', { table_name: table });
    // Si el RPC no existe, usamos una query directa a information_schema (si el rol lo permite)
    // Pero en Supabase suele ser mejor intentar un select de 1 fila y ver las keys del objeto.
    const { data: sample, error: sErr } = await supabase.from(table).select('*').limit(1);
    
    if (sErr) {
      console.log(`[SCHEMA] Error en tabla ${table}: ${sErr.message}`);
    } else {
      const keys = sample.length > 0 ? Object.keys(sample[0]) : 'TABLA VACÍA (pero existe)';
      console.log(`[SCHEMA] Tabla: ${table} | Columnas: ${JSON.stringify(keys)}`);
    }
  }

  // 2. Conteos Reales
  const counts = {
    videos: (await supabase.from('videos').select('*', { count: 'exact', head: true })).count,
    transcripts: (await supabase.from('transcripts').select('*', { count: 'exact', head: true }).eq('status', 'success')).count,
    pain_points: (await supabase.from('pain_points').select('*', { count: 'exact', head: true })).count,
    classifications: (await supabase.from('video_classifications').select('*', { count: 'exact', head: true })).count,
    rpm_profiles: (await supabase.from('rpm_profiles').select('*', { count: 'exact', head: true })).count,
  };
  console.log('[DATA] Conteos:', JSON.stringify(counts, null, 2));

  // 3. Perfil de Matias
  const { data: matias } = await supabase.from('rpm_profiles').select('*').eq('user_id', 'Matias').eq('is_active', true).maybeSingle();
  console.log('[RPM] Perfil Matias:', matias ? 'ACTIVO' : 'MISSING');
  if (matias) {
      console.log(`[RPM] Matias Archetype: ${matias.archetype} | Score: ${matias.rpm_score}`);
  }

  // 4. Inversión / Logs
  const { count: logCount } = await supabase.from('extraction_logs').select('*', { count: 'exact', head: true });
  console.log(`[LOGS] Extraction Logs: ${logCount}`);

  console.log('=== FIN AUDITORÍA ===');
}

deepAudit();
