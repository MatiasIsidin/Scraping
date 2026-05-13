import { supabaseAdmin } from '../lib/supabaseClient';

async function deepAudit() {
  // ── 1. Orphan sources (sources referencing non-existent pain_points) ──
  const { data: allSources } = await supabaseAdmin.from('pain_point_sources').select('id, pain_point_id');
  const { data: allPPIds } = await supabaseAdmin.from('pain_points').select('id');
  const ppIdSet = new Set(allPPIds?.map(p => p.id));
  const orphanSources = allSources?.filter(s => !ppIdSet.has(s.pain_point_id));
  console.log("=== ORPHAN SOURCES ===");
  console.log(`Total sources: ${allSources?.length}`);
  console.log(`Orphan sources (no matching pain_point): ${orphanSources?.length}`);

  // ── 2. Pain points referencing non-existent videos ──
  const { data: allPP } = await supabaseAdmin.from('pain_points').select('id, video_id, title');
  const { data: allVideos } = await supabaseAdmin.from('videos').select('youtube_video_id');
  const videoIdSet = new Set(allVideos?.map(v => v.youtube_video_id));
  const orphanPP = allPP?.filter(p => p.video_id && !videoIdSet.has(p.video_id));
  console.log("\n=== ORPHAN PAIN POINTS ===");
  console.log(`Pain points with invalid video_id: ${orphanPP?.length}`);
  if (orphanPP && orphanPP.length > 0) {
    console.log("Orphan PP details:", orphanPP.slice(0, 5));
  }

  // ── 3. Transcript statuses ──
  const { data: transcripts } = await supabaseAdmin.from('transcripts').select('youtube_video_id, status, word_count');
  const statusCounts: Record<string, number> = {};
  transcripts?.forEach(t => { statusCounts[t.status] = (statusCounts[t.status] || 0) + 1; });
  console.log("\n=== TRANSCRIPT STATUSES ===");
  console.log(statusCounts);
  const lowWordCount = transcripts?.filter(t => (t.word_count || 0) < 50);
  console.log(`Transcripts with word_count < 50: ${lowWordCount?.length}`);

  // ── 4. Videos without transcripts ──
  const transcriptVideoIds = new Set(transcripts?.map(t => t.youtube_video_id));
  const videosWithoutTranscript = allVideos?.filter(v => !transcriptVideoIds.has(v.youtube_video_id));
  console.log("\n=== VIDEOS WITHOUT TRANSCRIPTS ===");
  console.log(`Count: ${videosWithoutTranscript?.length}`);

  // ── 5. Videos without any pain points ──
  const ppVideoIds = new Set(allPP?.map(p => p.video_id));
  const videosWithoutPP = allVideos?.filter(v => !ppVideoIds.has(v.youtube_video_id));
  console.log("\n=== VIDEOS WITHOUT PAIN POINTS ===");
  console.log(`Count: ${videosWithoutPP?.length}`);
  
  // ── 6. Pain points per video distribution ──
  const ppPerVideo: Record<string, number> = {};
  allPP?.forEach(p => { if (p.video_id) ppPerVideo[p.video_id] = (ppPerVideo[p.video_id] || 0) + 1; });
  const uniqueVideosWithPP = Object.keys(ppPerVideo).length;
  const avgPPPerVideo = allPP ? allPP.length / uniqueVideosWithPP : 0;
  console.log("\n=== PP DISTRIBUTION ===");
  console.log(`Unique videos with pain points: ${uniqueVideosWithPP}`);
  console.log(`Avg pain points per video: ${avgPPPerVideo.toFixed(1)}`);

  // ── 7. Sources per pain point ──
  const sourcesPerPP: Record<string, { video: number; report: number }> = {};
  const { data: allSourcesFull } = await supabaseAdmin.from('pain_point_sources').select('pain_point_id, source_type');
  allSourcesFull?.forEach(s => {
    if (!sourcesPerPP[s.pain_point_id]) sourcesPerPP[s.pain_point_id] = { video: 0, report: 0 };
    if (s.source_type === 'video') sourcesPerPP[s.pain_point_id].video++;
    else sourcesPerPP[s.pain_point_id].report++;
  });
  const ppWithBothTypes = Object.values(sourcesPerPP).filter(v => v.video > 0 && v.report > 0).length;
  const ppWithOnlyVideo = Object.values(sourcesPerPP).filter(v => v.video > 0 && v.report === 0).length;
  const ppWithOnlyReport = Object.values(sourcesPerPP).filter(v => v.video === 0 && v.report > 0).length;
  const ppWithNoSources = allPP ? allPP.length - Object.keys(sourcesPerPP).length : 0;
  console.log("\n=== SOURCES DISTRIBUTION ===");
  console.log(`PP with both video + report sources: ${ppWithBothTypes}`);
  console.log(`PP with only video sources: ${ppWithOnlyVideo}`);
  console.log(`PP with only report sources: ${ppWithOnlyReport}`);
  console.log(`PP with no sources at all: ${ppWithNoSources}`);

  // ── 8. Scraping logs content check ──
  const { data: scrapingLogs } = await supabaseAdmin.from('scraping_logs').select('run_type, status, error_details');
  console.log("\n=== SCRAPING LOGS CONTENT ===");
  const runTypes = [...new Set(scrapingLogs?.map(l => l.run_type))];
  console.log(`Run types: ${runTypes.join(', ')}`);
  const logStatuses = [...new Set(scrapingLogs?.map(l => l.status))];
  console.log(`Statuses: ${logStatuses.join(', ')}`);
  // Check if any logs contain pain point or enrichment data
  const suspectLogs = scrapingLogs?.filter(l => {
    const details = JSON.stringify(l.error_details || '').toLowerCase();
    return details.includes('pain') || details.includes('enrichment');
  });
  console.log(`Suspect logs (contain pain/enrichment data): ${suspectLogs?.length}`);

  // ── 9. Schema comparison vs GEMINI.md ──
  console.log("\n=== SCHEMA vs GEMINI.md ===");
  console.log("GEMINI.md expects pain_points columns: id, title, description, category, severity, business_type, opportunity_score, market_scope, frequency_count, composite_score, extraction_version, is_validated, is_active, latam_relevance_score, latam_classification");
  console.log("ACTUAL pain_points columns: id, title, description, category, market_segment, severity_score, frequency_score, recency_score, final_score, version, created_at, updated_at, video_id");
  
  console.log("\nGEMINI.md expects pain_point_sources columns: id, pain_point_id, youtube_video_id, transcript_segment, extraction_confidence, extraction_model, extraction_version, extracted_at");
  console.log("ACTUAL pain_point_sources columns: id, pain_point_id, source_type, source_name, source_url, created_at, country, evidence, credibility_score");

  // ── 10. Sample pain point with sources for quality check ──
  const { data: samplePP } = await supabaseAdmin.from('pain_points').select('*').limit(2);
  console.log("\n=== SAMPLE PAIN POINTS ===");
  console.log(JSON.stringify(samplePP, null, 2));

  const { data: sampleSources } = await supabaseAdmin.from('pain_point_sources').select('*').eq('source_type', 'report').limit(2);
  console.log("\n=== SAMPLE REPORT SOURCES ===");
  console.log(JSON.stringify(sampleSources, null, 2));

  const { data: sampleVideoSources } = await supabaseAdmin.from('pain_point_sources').select('*').eq('source_type', 'video').limit(2);
  console.log("\n=== SAMPLE VIDEO SOURCES ===");
  console.log(JSON.stringify(sampleVideoSources, null, 2));
}

deepAudit().catch(console.error);
