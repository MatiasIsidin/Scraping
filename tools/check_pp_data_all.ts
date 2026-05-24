import { supabaseAdmin } from '../lib/supabaseClient';

async function run() {
  const { data, error } = await supabaseAdmin
    .from('pain_points')
    .select('*, video_classifications(*)')
    .limit(2);

  if (error) {
    console.error("Error:", error);
    return;
  }
  
  console.log(JSON.stringify(data, null, 2));
}
run();
