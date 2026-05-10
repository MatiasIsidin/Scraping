import { supabaseAdmin } from "@lib/supabaseClient";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Consulta 1: Todos los pain points
    const { data: ppData, error: ppErr } = await supabaseAdmin.from('pain_points').select('id, video_id');
    if (ppErr) throw ppErr;

    // Consulta 2: Todas las fuentes (para cruzar manualmente)
    const { data: ppsData, error: ppsErr } = await supabaseAdmin.from('pain_point_sources').select('pain_point_id');
    if (ppsErr) throw ppsErr;

    // Mapa de conteo de fuentes
    const sourcesCountMap: Record<string, number> = {};
    ppsData.forEach((s: any) => {
      sourcesCountMap[s.pain_point_id] = (sourcesCountMap[s.pain_point_id] || 0) + 1;
    });

    // Transformar para validar integridad
    const report = ppData.map((pp: any) => ({
      id: pp.id,
      video_id: pp.video_id,
      sources_count: sourcesCountMap[pp.id] || 0,
      is_valid: !!pp.video_id && (sourcesCountMap[pp.id] > 0)
    }));

    // Consulta 3: Metadatos de columnas (Pre-flight estructural)
    const ppRequired = ['id', 'video_id', 'title', 'description', 'category', 'market_segment', 'version'];
    const ppsRequired = ['id', 'pain_point_id', 'source_name', 'source_type', 'source_url', 'country', 'evidence', 'credibility_score'];
    
    const ppMissing = ppRequired.filter(c => !ppData[0] ? false : !Object.keys(ppData[0]).includes(c));
    // Nota: Como las tablas pueden estar vacías, el check de columnas se basa en el primer registro o en el preflight previo
    
    const summary = {
      total_pain_points: ppData.length,
      null_video_ids: ppData.filter(r => !r.video_id).length,
      mock_data_detected: ppData.filter(r => r.video_id?.toLowerCase().startsWith('test')).length,
      pain_points_without_sources: ppData.filter(r => sourcesCountMap[r.id] === 0).length,
      integrity_score: ppData.length > 0 
        ? Math.round((ppData.filter(r => r.video_id && !r.video_id.toLowerCase().startsWith('test') && sourcesCountMap[r.id] > 0).length / ppData.length) * 100) 
        : 100,
      structural_warnings: ppMissing.length > 0 ? `Missing columns: ${ppMissing.join(', ')}` : 'Schema OK'
    };

    return NextResponse.json({
      success: true,
      summary,
      details: report.slice(0, 50) // Limitar para el response
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
