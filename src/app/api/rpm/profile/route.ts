import { NextResponse } from 'next/server';
import { rpmProfileService } from '@services/rpmProfileService';

export async function GET(req: Request) {
  try {
    const userId = 'Matias'; // En producción esto vendría de la sesión
    const profile = await rpmProfileService.getLatestProfile(userId);

    if (!profile) {
      return NextResponse.json({ success: false, message: 'No profile found' });
    }

    return NextResponse.json({
      success: true,
      profile: {
        aiAnalysis: profile.ai_analysis,
        rawData: profile.raw_data,
        fullProfile: profile
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
