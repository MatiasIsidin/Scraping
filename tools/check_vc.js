const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').map(line => line.trim().split('=')).filter(p => p.length === 2));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.from('video_classifications').select('*').limit(1);
    console.log('Columns:', data.length > 0 ? Object.keys(data[0]) : 'Empty table');
    
    // Si está vacía, intentamos un insert mínimo para ver qué falla
    const { error: err2 } = await supabase.from('video_classifications').insert({
        youtube_video_id: 'DEBUG'
    });
    console.log('Error details:', err2);
}
check();
