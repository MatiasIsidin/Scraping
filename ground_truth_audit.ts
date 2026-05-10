import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function getEnv() {
  const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  const env: Record<string, string> = {};
  content.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
  });
  return env;
}

const env = getEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing keys');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
  console.log('--- DB Ground Truth Audit ---');
  
  const { count: videos } = await supabase.from('videos').select('*', { count: 'exact', head: true });
  const { count: transcripts } = await supabase.from('transcripts').select('*', { count: 'exact', head: true });
  const { count: painPoints } = await supabase.from('pain_points').select('*', { count: 'exact', head: true });
  const { count: sources } = await supabase.from('pain_point_sources').select('*', { count: 'exact', head: true });
  const { count: logs } = await supabase.from('scraping_logs').select('*', { count: 'exact', head: true });

  console.log(`Videos: ${videos}`);
  console.log(`Transcripts: ${transcripts}`);
  console.log(`Pain Points: ${painPoints}`);
  console.log(`Sources: ${sources}`);
  console.log(`Scraping Logs: ${logs}`);

  console.log('\n--- Checking Transcripts Structure ---');
  const { data: transSample } = await supabase.from('transcripts').select('*').limit(1);
  console.log('Transcript columns:', transSample && transSample.length > 0 ? Object.keys(transSample[0]) : 'No data');

  console.log('\n--- Checking Videos Structure ---');
  const { data: videoSample } = await supabase.from('videos').select('*').limit(1);
  console.log('Video columns:', videoSample && videoSample.length > 0 ? Object.keys(videoSample[0]) : 'No data');

  console.log('\n--- Checking Pain Points Structure ---');
  const { data: ppSample } = await supabase.from('pain_points').select('*').limit(1);
  console.log('Pain Point columns:', ppSample && ppSample.length > 0 ? Object.keys(ppSample[0]) : 'No data');
}

runAudit();
