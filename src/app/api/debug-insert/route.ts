import { NextResponse } from 'next/server';
import { fetchStarterStoryVideos } from '../../../../services/apifyService';
import { supabaseAdmin } from '@lib/supabaseClient';
import { mapApifyVideoToDB } from '../../../../services/videoStorageService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('[DEBUG-API] Iniciando debug-insert...');

    // 1. Llamar Apify
    const data = await fetchStarterStoryVideos();
    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, message: 'Apify no devolvió videos' });
    }

    // 2. Tomar solo 1 video
    const video = data[0];
    const payload = mapApifyVideoToDB(video);

    console.log('[DEBUG-API] Intentando insertar 1 video de prueba:', video.id);

    // 3. Forzar inserción sin deduplicación (usando upsert para que no falle si ya existe, pero ver la respuesta)
    const { data: resData, error, status } = await supabaseAdmin
      .from('videos')
      .upsert([payload])
      .select();

    return NextResponse.json({
      success: !error,
      status,
      video_id: video.id,
      payload_sent: payload,
      supabase_response: resData,
      supabase_error: error
    });

  } catch (err: any) {
    console.error('[DEBUG-API-CRITICAL]', err);
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
