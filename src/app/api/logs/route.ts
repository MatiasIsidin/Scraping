import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const model = searchParams.get('model');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    let query = supabaseAdmin
      .from('scraping_logs')
      .select('*', { count: 'exact' })
      .order('executed_at', { ascending: false })
      .range(from, to);

    if (status) query = query.eq('status', status);
    // Note: model_used is not in scraping_logs, it's likely in extraction_logs.
    // For now I'll remove the model filter or keep it if I use extraction_logs instead.
    // The user mentioned "scraping_logs", so I'll stick to it.

    const { data, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      data,
      total: count,
      page,
      limit
    });
  } catch (error: any) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
