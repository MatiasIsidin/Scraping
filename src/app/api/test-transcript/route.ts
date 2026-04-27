import { NextResponse } from 'next/server';
import { getTranscriptWithFallback } from '../../../../services/apifyTranscriptService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId') || 'dQw4w9WgXcQ'; // Rickroll as default test
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    console.log(`--- Test Transcript Pipeline (CON FALLBACK) para: ${videoId} ---`);
    
    // Ejecutar pipeline unificado
    const result = await getTranscriptWithFallback(videoUrl, videoId);
    
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }

    return NextResponse.json(result);


  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
