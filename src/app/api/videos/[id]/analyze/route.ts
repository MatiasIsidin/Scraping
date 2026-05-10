import { NextResponse } from 'next/server';
import { runSingleVideoExtraction } from '@services/painPointExtractionService';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: videoId } = await params;

  if (!videoId) {
    return NextResponse.json({ error: 'Missing video ID' }, { status: 400 });
  }

  try {
    const result = await runSingleVideoExtraction(videoId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in analysis route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
