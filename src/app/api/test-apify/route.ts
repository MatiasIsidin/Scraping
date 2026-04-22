import { NextResponse } from 'next/server';
import { fetchStarterStoryVideos } from '../../../../services/apifyService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await fetchStarterStoryVideos();

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      sample: data && data.length > 0 ? data[0] : null
    });
  } catch (error: any) {
    console.error('Error in /api/test-apify route:', error);
    return NextResponse.json(
      { success: false, message: 'Apify connection strictly failed', error: error.message },
      { status: 500 }
    );
  }
}
