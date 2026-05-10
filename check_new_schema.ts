import { supabaseAdmin } from './lib/supabaseClient';

async function checkNewSchema() {
  const tables = ['pain_points', 'pain_point_sources'];
  for (const table of tables) {
    console.log(`\nChecking table: ${table}`);
    const { data, error } = await supabaseAdmin.from(table).select('*').limit(1);
    if (error) {
      console.error(`Error: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log(`Columns: ${Object.keys(data[0]).join(', ')}`);
    } else {
      console.log('Table is empty. Checking count...');
      const { count, error: countErr } = await supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
      if (countErr) {
        console.error(`Error checking existence: ${countErr.message}`);
      } else {
        console.log(`Table exists and is empty (Count: ${count}).`);
      }
    }
  }
}

checkNewSchema();
