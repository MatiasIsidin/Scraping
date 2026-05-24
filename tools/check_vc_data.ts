import { supabaseAdmin } from './lib/supabaseClient';

async function run() {
  const { data, error } = await supabaseAdmin
    .from('video_classifications')
    .select('id, pain_point_id, reasoning')
    .limit(2);

  if (error) {
    console.error("Error:", error);
    return;
  }
  
  console.log(JSON.stringify(data, null, 2));
}
run();
