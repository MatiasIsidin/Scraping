import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sqlPath = path.join(process.cwd(), 'db/migrations/001_sprint3_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Run the migration via postgres RPC or by splitting? 
    // Wait, supabase client does not support running arbitrary SQL directly without an RPC `exec_sql`.
    // Let's try to check if the RPC exists.
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql });
    
    if (error) {
      return NextResponse.json({ success: false, error });
    }

    return NextResponse.json({ success: true, message: 'Migration applied!' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
