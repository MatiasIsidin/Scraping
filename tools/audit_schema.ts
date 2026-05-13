import { supabaseAdmin } from '../lib/supabaseClient';

async function auditSchema() {
  const { data: pp } = await supabaseAdmin.from('pain_points').select('*').limit(1);
  console.log("Pain Point columns:", pp ? Object.keys(pp[0]) : "No data");
  
  const { data: sources } = await supabaseAdmin.from('pain_point_sources').select('*').limit(1);
  console.log("Sources columns:", sources ? Object.keys(sources[0]) : "No data");
}

auditSchema().catch(console.error);
