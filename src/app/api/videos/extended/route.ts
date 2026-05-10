import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    // 1. Fetch videos
    let videoQuery = supabaseAdmin
      .from('videos')
      .select('*', { count: 'exact' })
      .order('published_at', { ascending: false })
      .range(from, to);

    if (search) {
      videoQuery = videoQuery.or(`title.ilike.%${search}%,youtube_video_id.ilike.%${search}%`);
    }

    const { data: videoData, count, error: videoError } = await videoQuery;
    if (videoError) throw videoError;

    if (!videoData || videoData.length === 0) {
      return NextResponse.json({ data: [], total: 0, page, limit });
    }

    const videoIds = videoData.map(v => v.youtube_video_id);

    // 2. Fetch transcript status, pain point counts, and view counts in parallel
    const [
      { data: transcriptData, error: transError },
      { data: ppData, error: ppError },
      { data: snapshotData, error: snapError }
    ] = await Promise.all([
      supabaseAdmin.from('transcripts').select('youtube_video_id, status').in('youtube_video_id', videoIds),
      // Fix: Pain Points map via video_id in the legacy schema
      supabaseAdmin.from('pain_points').select('video_id').in('video_id', videoIds),
      // Fetch latest snapshots for view_count
      supabaseAdmin.from('video_snapshots').select('youtube_video_id, view_count, scraped_at').in('youtube_video_id', videoIds).order('scraped_at', { ascending: false })
    ]);

    if (transError) console.error('Transcript error:', transError);
    if (ppError) console.error('Pain Point error:', ppError);
    if (snapError) console.error('Snapshot error:', snapError);

    // 3. Process data
    const processedData = videoData.map((video: any) => {
      const trans = transcriptData?.find(t => t.youtube_video_id === video.youtube_video_id);
      const ppCount = ppData?.filter(pp => pp.video_id === video.youtube_video_id).length || 0;
      const latestSnapshot = snapshotData?.find(s => s.youtube_video_id === video.youtube_video_id);
      
      return {
        ...video,
        pain_point_count: ppCount,
        transcript_status: trans?.status || 'pending',
        view_count: latestSnapshot?.view_count || 0
      };
    });

    return NextResponse.json({
      data: processedData,
      total: count,
      page,
      limit
    });
  } catch (error: unknown) {
    console.error('Error fetching extended videos:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
