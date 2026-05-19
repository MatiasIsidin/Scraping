const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').map(line => line.trim().split('=')).filter(p => p.length === 2));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkColumns() {
    const { data, error } = await supabase.from('video_analysis').insert({
        youtube_video_id: 'DEBUG',
        business_summary: 'DEBUG',
        business_model: 'DEBUG',
        core_mechanic: 'DEBUG',
        extraction_model: 'DEBUG',
        extraction_version: 'DEBUG',
        extraction_confidence: 0
    }).select('*').single();
    
    console.log('Error:', error);
}
checkColumns();
