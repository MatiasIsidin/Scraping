const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').map(line => line.trim().split('=')).filter(p => p.length === 2));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function runSurgicalClassification() {
    console.log('[SURGICAL] Validando pipeline de clasificación...');
    
    // 1. Obtener datos
    const { data: pending } = await supabase.from('transcripts').select('youtube_video_id, videos!inner(title)').eq('status', 'success').limit(1).single();
    const { data: painPoint } = await supabase.from('pain_points').select('id, title').limit(1).single();

    if (!pending || !painPoint) {
        console.log('[SURGICAL] No hay datos suficientes.');
        return;
    }

    console.log(`[SURGICAL] Clasificando: ${pending.videos.title} -> ${painPoint.title}`);

    // 2. Insertar Analysis (Detección de esquema)
    const { data: va, error: vaErr } = await supabase.from('video_analysis').insert({
        youtube_video_id: pending.youtube_video_id,
        business_summary: 'Surgical audit summary',
        extraction_version: 'v1.1-hito4'
    }).select('id').single();

    if (vaErr) {
        console.error('[SURGICAL] ERROR EN VIDEO_ANALYSIS:', vaErr.message);
        console.log('[SURGICAL] Esto confirma que el schema cache o las columnas siguen faltando.');
        return;
    }

    console.log('[SURGICAL] Analysis creado:', va.id);

    // 3. Insertar Classification
    const { data: vc, error: vcErr } = await supabase.from('video_classifications').insert({
        youtube_video_id: pending.youtube_video_id,
        pain_point_id: painPoint.id,
        analysis_id: va.id,
        classification_version: 'v1.1-hito4',
        latam_relevance_score: 99,
        reasoning: 'Surgical audit reasoning'
    }).select('id').single();

    if (vcErr) {
        console.error('[SURGICAL] ERROR EN VIDEO_CLASSIFICATIONS:', vcErr.message);
    } else {
        console.log('[SURGICAL] Clasificación creada:', vc.id);
    }

    // 4. Log
    await supabase.from('extraction_logs').insert({
        video_id: pending.youtube_video_id,
        status: 'audit_success',
        model_used: 'manual-audit'
    });
}

runSurgicalClassification();
