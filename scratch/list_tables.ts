import { supabaseAdmin } from '../lib/supabaseClient';

async function listTables() {
  const { data, error } = await supabaseAdmin.rpc('get_tables'); // Si existe RPC
  if (error) {
    // Si no hay RPC, intentamos una query genérica que suele fallar pero nos da info
    const { data: d2, error: e2 } = await supabaseAdmin.from('information_schema.tables').select('table_name').eq('table_schema', 'public');
    if (e2) {
      console.log("Error consultando schema:", e2.message);
    } else {
      console.log("Tablas detectadas:", d2.map(t => t.table_name));
    }
  } else {
    console.log("Tablas (RPC):", data);
  }
}

listTables();
