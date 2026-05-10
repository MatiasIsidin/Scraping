import { NextResponse } from 'next/server';
import { runPainPointExtractionBatch } from '@services/painPointExtractionService';

export async function POST(request: Request) {
  try {
    const result = await runPainPointExtractionBatch(10, 'v1');
    if (!result.success) {
      return NextResponse.json({ error: 'Batch extraction failed', stats: result.stats }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in batch analysis route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
