const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').map(line => line.trim().split('=')).filter(p => p.length === 2));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: allPending, error: fetchErr } = await supabase
        .from('transcripts')
        .select(`
          youtube_video_id,
          status,
          videos!inner(title)
        `)
        .eq('status', 'success');

    console.log('Error:', fetchErr);
    console.log('Pending count:', allPending?.length || 0);
    if (allPending && allPending.length > 0) {
        console.log('First pending:', allPending[0]);
    }
}
check();
