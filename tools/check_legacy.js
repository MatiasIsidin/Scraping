const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').map(line => line.trim().split('=')).filter(p => p.length === 2));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkConstraints() {
    const { data: sample, error } = await supabase.from('video_analysis').select('*').limit(1);
    console.log('Sample Data (if any):', data);
    
    // Si no hay datos, intentamos ver qué columnas fallan
    const { error: err2 } = await supabase.from('video_analysis').insert({
        youtube_video_id: 'TEST',
        extraction_version: 'audit'
    });
    console.log('Error details:', err2);
}
// checkConstraints(); // This is just for my thought, I'll use a better approach.
