// ============================================================
// SCRATCH: DEEP INTROSPECT DB
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
  const tables = ['video_analysis', 'video_classifications', 'pain_points'];
  
  for (const table of tables) {
    console.log(`\n--- TABLE: ${table} ---`);
    // Usar una query que falle pero nos dé pistas de las columnas si es posible, 
    // o intentar un select de una columna inexistente para ver si el error nos dice algo,
    // pero lo mejor es intentar un rpc si existe.
    
    // Como no tenemos rpc de introspección, vamos a intentar un truco:
    // Insertar un objeto con una key que sabemos que NO existe y ver el error.
    const { error } = await supabase.from(table).insert({ "non_existent_column_xyz": "val" });
    console.log(`Introspección via error: ${error?.message}`);
  }
}

main().catch(console.error);
