import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabaseAdmin } from '../lib/supabaseClient';

async function verify() {
  console.log("=== 1. VERIFY is_active COLUMN ===");
  const { data: ppSample, error: ppErr } = await supabaseAdmin
    .from('pain_points')
    .select('id, is_active')
    .limit(3);
  console.log("is_active query error:", ppErr);
  console.log("Sample:", ppSample);

  console.log("\n=== 2. VERIFY extraction_logs TABLE ===");
  const { data: elSample, error: elErr } = await supabaseAdmin
    .from('extraction_logs')
    .select('*')
    .limit(1);
  console.log("extraction_logs query error:", elErr);
  console.log("Sample:", elSample);

  // If extraction_logs exists, get its columns
  if (!elErr) {
    const { data: elAll } = await supabaseAdmin.from('extraction_logs').select('*').limit(1);
    if (elAll && elAll.length > 0) {
      console.log("extraction_logs columns:", Object.keys(elAll[0]));
    } else {
      console.log("extraction_logs exists but is empty");
      // Insert a test row to see columns
      const { data: testInsert, error: testErr } = await supabaseAdmin
        .from('extraction_logs')
        .insert({})
        .select();
      console.log("Test insert error:", testErr);
      console.log("Test insert result:", testInsert);
      // Clean up test
      if (testInsert && testInsert.length > 0) {
        console.log("extraction_logs columns:", Object.keys(testInsert[0]));
        await supabaseAdmin.from('extraction_logs').delete().eq('id', testInsert[0].id);
      }
    }
  }

  console.log("\n=== 3. CURRENT pain_points FULL SCHEMA ===");
  const { data: ppFull } = await supabaseAdmin.from('pain_points').select('*').limit(1);
  if (ppFull && ppFull.length > 0) {
    console.log("pain_points columns:", Object.keys(ppFull[0]));
    console.log("Sample values:", JSON.stringify(ppFull[0], null, 2));
  }

  console.log("\n=== 4. COUNTS ===");
  const { count: ppCount } = await supabaseAdmin.from('pain_points').select('*', { count: 'exact', head: true });
  const { count: activeCount } = await supabaseAdmin.from('pain_points').select('*', { count: 'exact', head: true }).eq('is_active', true);
  const { count: inactiveCount } = await supabaseAdmin.from('pain_points').select('*', { count: 'exact', head: true }).eq('is_active', false);
  console.log(`Total PP: ${ppCount}, Active: ${activeCount}, Inactive: ${inactiveCount}`);
}

verify().catch(console.error);
