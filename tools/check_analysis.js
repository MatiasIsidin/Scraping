const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').map(line => line.trim().split('=')).filter(p => p.length === 2));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { count: vaCount } = await supabase.from('video_analysis').select('*', { count: 'exact', head: true });
    console.log('Video Analysis Count:', vaCount);
    const { data: vaSample } = await supabase.from('video_analysis').select('youtube_video_id, extraction_version').limit(5);
    console.log('Sample:', vaSample);
}
check();
