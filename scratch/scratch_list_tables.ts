// ============================================================
// SCRATCH: LIST ALL TABLES
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
  const targetTables = ['videos', 'transcripts', 'pain_points', 'video_analysis', 'video_classifications', 'rpm_profiles', 'solution_engine_outputs'];
  
  for (const t of targetTables) {
    const { error } = await supabase.from(t).select('count').limit(0);
    console.log(`Table [${t}]: ${error ? '❌ (' + error.message + ')' : '✅'}`);
  }
}

main().catch(console.error);
