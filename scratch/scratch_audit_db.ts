import { supabaseAdmin } from '../lib/supabaseClient';

async function auditDatabase() {
  console.log('--- AUDITORÍA DE BASE DE DATOS SPRINT 4 ---');

  const counts: any = {};

  // Videos
  const { count: vCount } = await supabaseAdmin.from('videos').select('*', { count: 'exact', head: true });
  counts.videos = vCount;

  // Transcripts
  const { count: tCount } = await supabaseAdmin.from('videos').select('*', { count: 'exact', head: true }).not('transcript', 'is', null);
  counts.transcripts = tCount;

  // Pain Points
  const { count: pCount } = await supabaseAdmin.from('pain_points').select('*', { count: 'exact', head: true });
  counts.pain_points = pCount;

  // Classifications
  const { count: cCount } = await supabaseAdmin.from('video_classifications').select('*', { count: 'exact', head: true });
  counts.classifications = cCount;

  // RPM Profiles
  const { count: rCount } = await supabaseAdmin.from('rpm_profiles').select('*', { count: 'exact', head: true });
  counts.rpm_profiles = rCount;

  // Matias Profile
  const { data: matiasProfile } = await supabaseAdmin
    .from('rpm_profiles')
    .select('*')
    .eq('user_id', 'Matias')
    .eq('is_active', true)
    .single();

  console.log('CONTEOS REALES:', JSON.stringify(counts, null, 2));
  console.log('PERFIL MATIAS:', matiasProfile ? 'EXISTE' : 'NO EXISTE');

  if (matiasProfile) {
    console.log('DETALLE MATIAS:', JSON.stringify({
        archetype: matiasProfile.archetype,
        scores: {
            execution: matiasProfile.execution_readiness,
            clarity: matiasProfile.strategic_clarity,
            urgency: matiasProfile.emotional_urgency
        }
    }, null, 2));
  }

  // Relations Check
  const { data: orphans } = await supabaseAdmin
    .from('video_classifications')
    .select('youtube_video_id')
    .limit(10);
  
  console.log('MUESTRA CLASIFICACIONES:', JSON.stringify(orphans, null, 2));
}

auditDatabase();
