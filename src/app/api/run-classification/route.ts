// ============================================================
// API ROUTE: RUN VIDEO CLASSIFICATION
// Endpoint: /api/run-classification
// ============================================================

import { NextResponse } from 'next/server';
import { videoClassificationService } from '@services/videoClassificationService';

export async function POST(req: Request) {
  try {
    const { limit = 5 } = await req.json().catch(() => ({}));

    console.log(`[API-CLASSIFY] Iniciando clasificación para ${limit} videos.`);
    const stats = await videoClassificationService.runBatchClassification(limit);

    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error: any) {
    console.error(`[API-CLASSIFY] Error: ${error.message}`);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// Opcional: GET para ver estado o trigger manual simple
export async function GET() {
  return NextResponse.json({ message: "Use POST to trigger classification batch" });
}
