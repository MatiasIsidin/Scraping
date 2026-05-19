const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').map(line => line.trim().split('=')).filter(p => p.length === 2));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.rpc('get_table_constraints', { t_name: 'video_analysis' });
    // Si no hay RPC, probamos ver si podemos insertar duplicados
    console.log('Testing duplicate analysis insert...');
    const { error: err2 } = await supabase.from('video_analysis').insert({
        youtube_video_id: 'DEBUG',
        extraction_version: 'v1.1-hito4'
    });
    console.log('First insert:', err2);
    const { error: err3 } = await supabase.from('video_analysis').insert({
        youtube_video_id: 'DEBUG',
        extraction_version: 'v1.1-hito4'
    });
    console.log('Second insert (should fail if unique):', err3);
}
check();
