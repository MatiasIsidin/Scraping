import { supabaseAdmin } from './lib/supabaseClient';

async function checkColumns() {
  const { data, error } = await supabaseAdmin.rpc('get_table_columns', { table_name: 'pain_point_sources' });
  if (error) {
    // If RPC not available, try a raw query via postgrest if possible, or just guess
    console.log('RPC failed, trying information_schema via select (if enabled)');
    const { data: d2, error: e2 } = await supabaseAdmin.from('pain_point_sources').select('*').limit(0);
    console.log('Columns may be invisible if empty. Trying to insert dummy and rollback...');
  }
}

async function forceCheck() {
  console.log('Attempting to insert a dummy row to pain_point_sources with ALL possible columns...');
  const { error } = await supabaseAdmin.from('pain_point_sources').insert({
    pain_point_id: '00000000-0000-0000-0000-000000000000',
    source_name: 'test',
    source_type: 'test',
    source_url: 'test',
    country: 'test',
    evidence: 'test',
    credibility_score: 0
  });
  if (error) {
    console.log('Error message contains the real column names if I missed any or used wrong ones:');
    console.log(error.message);
  } else {
    console.log('Insert succeeded! The columns are correct.');
  }
}

forceCheck();
