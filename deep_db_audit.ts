import { supabaseAdmin } from './lib/supabaseClient';

async function deepAudit() {
  console.log('--- STARTING DEEP DB AUDIT ---');

  // 1. Check if we can query information_schema via PostgREST
  // (Usually this is disabled, but worth a try)
  console.log('Attempting to query information_schema.columns...');
  const { data: cols, error: colErr } = await supabaseAdmin
    .from('information_schema.columns')
    .select('table_name, column_name, data_type, is_nullable, column_default')
    .in('table_name', ['pain_points', 'pain_point_sources'])
    .eq('table_schema', 'public');

  if (colErr) {
    console.warn('Direct information_schema query failed (Expected). Falling back to OpenAPI inspection.');
  } else {
    console.log('SUCCESS: information_schema is accessible.');
    console.log(JSON.stringify(cols, null, 2));
  }

  // 2. Check Constraints (Foreign Keys)
  console.log('\nChecking Foreign Keys via pg_constraint...');
  const { data: constraints, error: conErr } = await supabaseAdmin
    .from('pg_constraint')
    .select('conname, contype, confupdtype, confdeltype, conrelid')
    .eq('contype', 'f');
  
  if (conErr) {
    console.warn('Direct pg_constraint query failed.');
  } else {
    console.log('SUCCESS: pg_constraint is accessible.');
    console.log(JSON.stringify(constraints, null, 2));
  }

  // 3. Fallback: Use PostgREST OpenAPI (The most reliable direct inspection via SDK)
  console.log('\nFetching OpenAPI definition (Direct PostgREST metadata)...');
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_SERVICE_ROLE_KEY}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Accept': 'application/openapi+json'
      }
    });
    const schema = await response.json();
    
    // Process schema for pain_points and pain_point_sources
    const tables = ['pain_points', 'pain_point_sources'];
    const audit: any = {};

    for (const t of tables) {
      const def = schema.definitions?.[t];
      if (def) {
        audit[t] = {
          columns: def.properties,
          required: def.required || []
        };
      } else {
        audit[t] = 'NOT_FOUND';
      }
    }
    
    // Process relations (from paths)
    const relations: string[] = [];
    Object.keys(schema.paths).forEach(p => {
      if (p.includes('pain_point_sources') && p.includes('pain_points')) {
        relations.push(p);
      }
    });
    audit.detected_relations = relations;

    console.log('\n--- REAL SCHEMA RESULTS ---');
    console.log(JSON.stringify(audit, null, 2));

  } catch (err: any) {
    console.error('OpenAPI fetch failed:', err.message);
  }

  // 4. Check Data Counts (Real queries)
  console.log('\nCounting real data rows...');
  const { count: ppCount } = await supabaseAdmin.from('pain_points').select('*', { count: 'exact', head: true });
  const { count: ppsCount } = await supabaseAdmin.from('pain_point_sources').select('*', { count: 'exact', head: true });
  
  console.log(`pain_points: ${ppCount}`);
  console.log(`pain_point_sources: ${ppsCount}`);
}

deepAudit();
