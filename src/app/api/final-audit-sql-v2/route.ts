import { supabaseAdmin } from "@lib/supabaseClient";
import { NextResponse } from "next/server";
import { runPainPointExtractionBatch } from "@services/painPointExtractionAI";

export async function GET() {
  const audit: any = {
    step_1_logs: [],
    step_2_pp_cross_videos: [],
    step_3_sources_cross_pp: [],
    step_4_pp_cross_transcripts: [],
    step_5_global_counts: {},
    trial_log: ""
  };

  try {
    // 1. Intentar ejecución REAL forzada (1 video) para generar evidencia viva
    console.log("Audit: Attempting live execution for evidence...");
    // Probamos con un modelo diferente por si acaso (mistral-7b-instruct:free)
    const trial = await runPainPointExtractionBatch({ limit: 1, version: 'audit-final-real' });
    audit.trial_log = trial.pain_points_inserted > 0 ? "SUCCESS: 1 video processed" : "FAILED: Still hitting 429 or other error";

    // 2. FASE 1: Scraping Logs (Evidencia de ejecución)
    const { data: logs } = await supabaseAdmin
      .from('scraping_logs')
      .select('log_id, run_type, status, videos_found, new_videos, executed_at')
      .ilike('run_type', '%pain%')
      .order('executed_at', { ascending: false })
      .limit(5);
    audit.step_1_logs = logs;

    // 3. FASE 2: Pain Points cruzados con Videos
    const { data: ppCross } = await supabaseAdmin
      .from('pain_points')
      .select(`
        id,
        video_id,
        title,
        videos!video_id (youtube_video_id, title)
      `)
      .limit(10);
    audit.step_2_pp_cross_videos = ppCross;

    // 4. FASE 3: Sources cruzados con Pain Points
    const { data: psCross } = await supabaseAdmin
      .from('pain_point_sources')
      .select(`
        id,
        pain_point_id,
        source_name,
        evidence,
        pain_points (title)
      `)
      .limit(10);
    audit.step_3_sources_cross_pp = psCross;

    // 5. FASE 4: Pain Points cruzados con Transcripts
    const { data: ppTranscript } = await supabaseAdmin
      .from('pain_points')
      .select(`
        video_id,
        transcripts!video_id (youtube_video_id, word_count)
      `)
      .limit(10);
    audit.step_4_pp_cross_transcripts = ppTranscript;

    // 6. FASE 5: Conteo Global
    const { count: vCount } = await supabaseAdmin.from('videos').select('*', { count: 'exact', head: true });
    const { count: tCount } = await supabaseAdmin.from('transcripts').select('*', { count: 'exact', head: true });
    const { count: ppCount } = await supabaseAdmin.from('pain_points').select('*', { count: 'exact', head: true });
    
    audit.step_5_global_counts = {
      videos: vCount,
      transcripts: tCount,
      pain_points: ppCount
    };

    return NextResponse.json(audit);

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
