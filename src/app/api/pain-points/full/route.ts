import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const market_segment = searchParams.get('market_segment');
  const min_severity = searchParams.get('min_severity');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    // 1. Fetch pain points with sources
    let query = supabaseAdmin
      .from('pain_points')
      .select('*, pain_point_sources!fk_pain_point(*)', { count: 'exact' })
      .order('final_score', { ascending: false })
      .range(from, to);

    if (category && category !== '') query = query.eq('category', category);
    if (market_segment && market_segment !== '') query = query.eq('market_segment', market_segment);
    if (min_severity && min_severity !== '') query = query.gte('severity_score', parseInt(min_severity));

    const { data: ppData, count, error: ppError } = await query;
    if (ppError) throw ppError;

    if (!ppData || ppData.length === 0) {
      return NextResponse.json({ data: [], total: 0, page, limit });
    }

    // 2. Fetch corresponding videos
    const videoIds = Array.from(new Set(ppData.map(pp => pp.video_id).filter(Boolean)));
    const { data: videoData, error: videoError } = await supabaseAdmin
      .from('videos')
      .select('youtube_video_id, title')
      .in('youtube_video_id', videoIds);

    if (videoError) console.error('Video fetch error:', videoError);

    // 3. Map videos to pain points
    const enrichedData = ppData.map(pp => ({
      ...pp,
      videos: videoData?.find(v => v.youtube_video_id === pp.video_id) || null
    }));

    return NextResponse.json({
      data: enrichedData,
      total: count,
      page,
      limit
    });
  } catch (error: unknown) {
    console.error('Error fetching full pain points:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
