import { supabaseAdmin } from '../lib/supabaseClient';

async function run() {
  const { data, error } = await supabaseAdmin
    .from('pain_points')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error:", error);
    return;
  }
  
  console.log(JSON.stringify(data[0], null, 2));
}
run();
