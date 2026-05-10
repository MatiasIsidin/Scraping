import { supabaseAdmin } from './lib/supabaseClient';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getFullSchema() {
  console.log('Fetching OpenAPI schema from Supabase to get REAL column names...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_SERVICE_ROLE_KEY}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Accept': 'application/openapi+json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const schema = await response.json();
    const tables = ['pain_points', 'pain_point_sources'];
    
    const results: any = {};
    for (const t of tables) {
      const def = schema.definitions[t];
      if (def) {
        results[t] = {
          columns: Object.keys(def.properties),
          required: def.required || []
        };
      } else {
        results[t] = { error: 'Table not found in definitions' };
      }
    }

    console.log(JSON.stringify(results, null, 2));
  } catch (err: any) {
    console.error('Failed to fetch OpenAPI schema:', err.message);
  }
}

getFullSchema();
