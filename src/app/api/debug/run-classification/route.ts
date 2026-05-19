import { NextResponse } from 'next/server';
import { videoClassificationService } from '@services/videoClassificationService';

export async function GET() {
  try {
    const stats = await videoClassificationService.runBatchClassification(2);
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
