const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').map(line => line.trim().split('=')).filter(p => p.length === 2));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function runAudit() {
    console.log('--- SURGICAL SCHEMA AUDIT ---');
    
    // 1. Clasificador real (2 videos)
    const res = await fetch('http://localhost:3000/api/debug/run-classification');
    const result = await res.json();
    console.log('Classification Result:', JSON.stringify(result, null, 2));

    // 2. Conteos
    const counts = {
        classifications: (await supabase.from('video_classifications').select('*', { count: 'exact', head: true })).count,
        analysis: (await supabase.from('video_analysis').select('*', { count: 'exact', head: true })).count,
        logs: (await supabase.from('extraction_logs').select('*', { count: 'exact', head: true })).count,
    };
    console.log('Counts:', counts);
}
runAudit();
