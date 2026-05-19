// ============================================================
// SCRATCH: FIND ACTUAL NAMES
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
  const aliases = {
    video_analysis: [
      ['video_id', 'youtube_video_id'],
      ['summary', 'business_summary', 'analysis_summary'],
      ['model', 'business_model'],
      ['mechanic', 'core_mechanic'],
      ['version', 'extraction_version']
    ],
    video_classifications: [
      ['version', 'classification_version']
    ]
  };

  for (const [table, groups] of Object.entries(aliases)) {
    console.log(`\n--- TABLE: ${table} ---`);
    for (const group of groups) {
      let found = false;
      for (const alias of group) {
        const { error } = await supabase.from(table).select(alias).limit(0);
        if (!error) {
          console.log(`FOUND: ${alias}`);
          found = true;
          break;
        }
      }
      if (!found) console.log(`NOT FOUND for group: ${group.join('/')}`);
    }
  }
}

main().catch(console.error);
