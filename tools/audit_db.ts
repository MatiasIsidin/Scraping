import { supabaseAdmin } from '../lib/supabaseClient';

async function audit() {
  console.log("=== DB COUNTS ===");
  const { count: videos } = await supabaseAdmin.from('videos').select('*', { count: 'exact', head: true });
  const { count: transcripts } = await supabaseAdmin.from('transcripts').select('*', { count: 'exact', head: true });
  const { count: painPoints } = await supabaseAdmin.from('pain_points').select('*', { count: 'exact', head: true });
  const { count: sources } = await supabaseAdmin.from('pain_point_sources').select('*', { count: 'exact', head: true });
  
  console.log(`Videos: ${videos}`);
  console.log(`Transcripts: ${transcripts}`);
  console.log(`Pain Points: ${painPoints}`);
  console.log(`Sources: ${sources}`);

  console.log("\n=== VALIDATIONS ===");
  // validate relation: do pain_points have video_id?
  const { data: ppWithVideo } = await supabaseAdmin.from('pain_points').select('id, video_id').not('video_id', 'is', null);
  console.log(`Pain Points with video_id: ${ppWithVideo?.length}`);

  // duplicates?
  const { data: allPP } = await supabaseAdmin.from('pain_points').select('title, video_id');
  const ppMap = new Map();
  let duplicates = 0;
  allPP?.forEach(p => {
    const key = `${p.title}-${p.video_id}`;
    if (ppMap.has(key)) duplicates++;
    ppMap.set(key, true);
  });
  console.log(`Duplicate Pain Points (title+video_id): ${duplicates}`);

  // sources types
  const { data: sourcesTypes } = await supabaseAdmin.from('pain_point_sources').select('source_type');
  const missingType = sourcesTypes?.filter(s => !s.source_type).length;
  const types = sourcesTypes?.map(s => s.source_type);
  const uniqueTypes = [...new Set(types)];
  console.log(`Sources missing type: ${missingType}`);
  console.log(`Source types present: ${uniqueTypes.join(', ')}`);
  
  // check logs
  const { data: logs } = await supabaseAdmin.from('extraction_logs').select('pipeline_type');
  const uniqueLogs = [...new Set(logs?.map(l => l.pipeline_type))];
  console.log(`Logs pipeline_types: ${uniqueLogs.join(', ')}`);
  
  // missing logs
  const { data: otherLogs } = await supabaseAdmin.from('scraping_logs').select('*', { count: 'exact', head: true });
  console.log(`Scraping logs count: ${otherLogs}`);
}

audit().catch(console.error);
