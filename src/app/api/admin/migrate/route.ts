// ============================================================
// API ROUTE: DB MIGRATION RUNNER (Admin Only)
// Endpoint: /api/admin/migrate
// ============================================================

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const { sql } = await req.json();

    if (!sql) {
      return NextResponse.json({ error: 'SQL missing' }, { status: 400 });
    }

    // ADVERTENCIA: Esto requiere que la base de datos tenga un RPC llamado 'exec_sql'
    // que reciba un argumento 'query_text'. Si no existe, este endpoint fallará.
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { query_text: sql });

    if (error) {
      // Fallback: Si no hay exec_sql, intentamos reportar el error con claridad
      console.error(`[MIGRATE] Error ejecutando SQL: ${error.message}`);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        hint: 'Asegúrate de que la función RPC "exec_sql" existe en Supabase.' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
