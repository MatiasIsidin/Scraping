const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').map(line => line.trim().split('=')).filter(p => p.length === 2));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function listTables() {
    const { data, error } = await supabase.from('video_classifications').select('*').limit(5);
    console.log('Classifications data:', data);
    console.log('Error if any:', error);
    
    // Check video_analysis too
    const { data: ana } = await supabase.from('video_analysis').select('*').limit(5);
    console.log('Analysis data length:', ana?.length);
}
listTables();
