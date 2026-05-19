const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').map(line => line.trim().split('=')).filter(p => p.length === 2));

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
  console.log('--- START SPRINT 4 FINAL AUDIT ---');

  const stats = {
    videos: await supabase.from('videos').select('*', { count: 'exact', head: true }),
    transcripts: await supabase.from('transcripts').select('*', { count: 'exact', head: true }).eq('status', 'success'),
    pain_points: await supabase.from('pain_points').select('*', { count: 'exact', head: true }),
    classifications: await supabase.from('video_classifications').select('*', { count: 'exact', head: true }),
    rpm_profiles: await supabase.from('rpm_profiles').select('*', { count: 'exact', head: true }),
    matias_active: await supabase.from('rpm_profiles').select('*').eq('user_id', 'Matias').eq('is_active', true).maybeSingle(),
  };

  console.log('--- DB COUNTS ---');
  console.log(`Videos: ${stats.videos.count}`);
  console.log(`Transcripts (Success): ${stats.transcripts.count}`);
  console.log(`Pain Points: ${stats.pain_points.count}`);
  console.log(`Classifications: ${stats.classifications.count}`);
  console.log(`RPM Profiles: ${stats.rpm_profiles.count}`);
  console.log(`Matias Profile Active: ${stats.matias_active.data ? 'YES' : 'NO'}`);

  if (stats.matias_active.data) {
    const p = stats.matias_active.data;
    console.log('--- MATIAS PROFILE DATA ---');
    console.log(`Archetype: ${p.archetype}`);
    console.log(`RPM Score: ${p.rpm_score}`);
    console.log(`AI Analysis available: ${!!p.ai_analysis}`);
  }

  // Relations audit
  const { data: orphans } = await supabase.from('video_classifications').select('youtube_video_id, pain_point_id').limit(5);
  console.log('--- RELATIONS SAMPLE ---');
  console.log(orphans);

  console.log('--- AUDIT COMPLETE ---');
}

runAudit();
