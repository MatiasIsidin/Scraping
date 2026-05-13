import { supabaseAdmin } from '../lib/supabaseClient';

async function auditLogs() {
  const { data: extractionLogs, error: e1 } = await supabaseAdmin.from('extraction_logs').select('*');
  console.log("Extraction error:", e1);
  console.log("Extraction logs count:", extractionLogs?.length);

  const { data: scrapingLogs, error: e2 } = await supabaseAdmin.from('scraping_logs').select('*');
  console.log("Scraping error:", e2);
  console.log("Scraping logs count:", scrapingLogs?.length);
}

auditLogs().catch(console.error);
