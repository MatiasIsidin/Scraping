import { supabaseAdmin } from './lib/supabaseClient';

async function run() {
  const { data, error } = await supabaseAdmin
    .from('pain_points')
    .select('id, title, video_classifications(*)');

  if (error) {
    console.error("Error:", error);
    return;
  }
  
  console.log(JSON.stringify(data.slice(0, 2), null, 2));
}
run();
