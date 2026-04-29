import 'dotenv/config';
import { supabaseAdmin } from '../lib/supabaseClient';

async function auditSchema() {
  console.log("--- Auditando Columnas de tablas críticas ---");
  
  // No podemos listar columnas fácilmente sin RPC o query a information_schema
  // pero podemos intentar un select vacío para ver qué devuelve
  
  const tables = ['videos', 'raw_videos', 'transcripts'];
  
  for (const table of tables) {
    console.log(`\nTabla: ${table}`);
    const { data, error } = await supabaseAdmin.from(table).select('*').limit(1);
    if (error) {
      console.log(`  Error: ${error.message}`);
    } else if (data && data.length > 0) {
      console.log(`  Columnas detectadas: ${Object.keys(data[0]).join(', ')}`);
    } else {
      console.log(`  Tabla vacía o sin datos para auditar columnas.`);
    }
  }
}

auditSchema();
