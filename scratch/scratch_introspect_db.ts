// ============================================================
// SCRATCH: INTROSPECT VIDEO_ANALYSIS
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve(process.cwd(), '.env.local');
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

async function main() {
  console.log('Introspeccionando video_analysis...');
  
  // 1. Intentar insertar objeto vacío para ver error de columnas requeridas
  const { error: err1 } = await supabase.from('video_analysis').insert({});
  console.log('Error insert {} :', err1?.message);

  // 2. Intentar seleccionar una fila (aunque esté vacía)
  const { data, error: err2 } = await supabase.from('video_analysis').select('*').limit(1);
  if (err2) {
    console.log('Error select * :', err2.message);
  } else {
    console.log('Columnas reales:', data.length > 0 ? Object.keys(data[0]) : 'Tabla vacía, no se pueden ver columnas por select *');
  }

  // 3. Probar columnas una por una
  const testCols = ['id', 'youtube_video_id', 'business_summary', 'business_model', 'core_mechanic', 'extraction_version'];
  for (const col of testCols) {
    const { error } = await supabase.from('video_analysis').select(col).limit(1);
    console.log(`Columna [${col}]: ${error ? '❌ NO EXISTE (' + error.message + ')' : '✅ EXISTE'}`);
  }
}

main().catch(console.error);
