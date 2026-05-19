const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').map(line => line.trim().split('=')).filter(p => p.length === 2));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Mocking callLLM for the script if needed, or just import it.
// Actually, I'll just use the service since I fixed the imports in it.
// Wait, the service is TS. I'll just write a quick JS version for 2 videos.

async function runClassification() {
    console.log('Starting classification for 2 videos...');
    const { data: pending } = await supabase
        .from('transcripts')
        .select(`youtube_video_id, transcript, videos!inner(title)`)
        .eq('status', 'success')
        .limit(2);

    const { data: painPoints } = await supabase.from('pain_points').select('id, title').limit(5);

    for (const item of pending) {
        console.log(`Processing ${item.youtube_video_id}...`);
        
        // Simular IA para auditoría rápida (o usar IA real si configuramos)
        const analysis = {
            business_summary: "Test summary",
            business_model: "SaaS",
            core_mechanic: "Test mechanic",
            extraction_confidence: 0.9
        };

        const { data: va } = await supabase.from('video_analysis').upsert({
            youtube_video_id: item.youtube_video_id,
            business_summary: analysis.business_summary,
            business_model: analysis.business_model,
            core_mechanic: analysis.core_mechanic,
            extraction_version: 'v1.1-hito4'
        }).select('id').single();

        await supabase.from('video_classifications').upsert({
            youtube_video_id: item.youtube_video_id,
            pain_point_id: painPoints[0].id,
            analysis_id: va.id,
            classification_version: 'v1.1-hito4',
            latam_relevance_score: 85,
            reasoning: "Test reasoning"
        });
    }
    console.log('Done.');
}
runClassification();
