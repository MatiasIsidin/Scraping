// ============================================================
// SCRATCH: FINAL COLUMN CHECK
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
  const tables = {
    video_analysis: [
      'id', 'youtube_video_id', 'business_summary', 'business_model', 
      'core_mechanic', 'industry', 'revenue_range', 'extraction_version'
    ],
    video_classifications: [
      'id', 'youtube_video_id', 'pain_point_id', 'analysis_id', 
      'classification_version', 'confidence_score', 'reasoning'
    ]
  };

  for (const [table, cols] of Object.entries(tables)) {
    console.log(`\n--- Checking ${table} ---`);
    for (const col of cols) {
      const { error } = await supabase.from(table).select(col).limit(0);
      console.log(`${col}: ${error ? '❌ (' + error.message + ')' : '✅'}`);
    }
  }
}

main().catch(console.error);
