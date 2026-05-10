import { supabaseAdmin } from "@lib/supabaseClient";
import { NextResponse } from "next/server";
import { runPainPointExtractionBatch } from "@services/painPointExtractionAI";

export async function GET() {
  const audit: any = {
    step_1_counts: {},
    step_2_origins: [],
    step_3_mocks: [],
    step_4_orphans: [],
    step_5_evidence_chain: null,
    llm_status: "checking"
  };

  try {
    // 1. Intentar procesar 1 VIDEO REAL para generar evidencia (Si hay quota)
    console.log("Attempting to process 1 real video for audit evidence...");
    const batch = await runPainPointExtractionBatch({ limit: 1, version: 'audit-v3' });
    audit.llm_status = batch.pain_points_inserted > 0 ? "SUCCESS" : "FAILED_OR_RATE_LIMIT";

    // 2. Query: Conteo Real
    const { count: ppCount } = await supabaseAdmin.from('pain_points').select('*', { count: 'exact', head: true });
    const { count: psCount } = await supabaseAdmin.from('pain_point_sources').select('*', { count: 'exact', head: true });
    audit.step_1_counts = { pain_points: ppCount, pain_point_sources: psCount };

    // 3. Query: Orígenes Reales
    const { data: origins } = await supabaseAdmin.from('pain_points').select('video_id').limit(10);
    audit.step_2_origins = origins;

    // 4. Query: Detección de Mocks
    const { data: mocks } = await supabaseAdmin.from('pain_points').select('*').ilike('video_id', 'test%');
    audit.step_3_mocks = mocks;

    // 5. Query: Huérfanos
    // (Buscamos sources cuyo pain_point_id no existe)
    const { data: orphans } = await supabaseAdmin
      .from('pain_point_sources')
      .select('id, pain_point_id')
      .not('pain_point_id', 'in', (await supabaseAdmin.from('pain_points').select('id')).data?.map(p => p.id) || []);
    audit.step_4_orphans = orphans;

    // 6. Evidencia de Cadena (Si hay al menos 1 pain point)
    if (ppCount && ppCount > 0) {
      const { data: chain } = await supabaseAdmin
        .from('pain_points')
        .select(`
          id,
          video_id,
          title,
          videos!video_id (title),
          transcripts!video_id (transcript),
          pain_point_sources!pain_point_id (source_name, evidence)
        `)
        .limit(1);
      audit.step_5_evidence_chain = chain;
    }

    return NextResponse.json(audit);

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
