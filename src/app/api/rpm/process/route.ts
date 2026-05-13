// ============================================================
// API ROUTE: PROCESS RPM WIZARD
// Endpoint: /api/rpm/process
// ============================================================

import { NextResponse } from 'next/server';
import { rpmProfileService } from '@services/rpmProfileService';

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // En un sistema real, obtendríamos el userId de la sesión. 
    // Para el MVP/Hito 4, usaremos un ID estático "Matias".
    const userId = 'Matias';

    const result = await rpmProfileService.processAndSaveProfile(userId, data);

    return NextResponse.json({
      success: true,
      profile: result
    });
  } catch (error: any) {
    console.error(`[API-RPM] Error: ${error.message}`);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
