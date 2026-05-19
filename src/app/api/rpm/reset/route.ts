import { NextResponse } from 'next/server';
import { rpmProfileService } from '@services/rpmProfileService';

export async function POST(req: Request) {
  try {
    const userId = 'Matias';
    await rpmProfileService.deactivateAllProfiles(userId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
