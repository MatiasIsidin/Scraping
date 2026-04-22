import { NextResponse } from 'next/server';
import { supabaseClient } from '@lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // PostgREST no provee un SELECT NOW() directamente desde la web sin un RPC creado.
    // Usamos una micro-petición a nuestra tabla base cruda para validar el handhshake.
    const { data, error, status } = await supabaseClient
      .from('raw_videos')
      .select('youtube_video_id')
      .limit(1);

    if (error) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Conexión a Base de Datos falló.', 
          error: error.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Conectado a PostgreSQL en Supabase satisfactoriamente',
      status_code: status,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal Server Error o Configuración Inválida', 
        details: err.message 
      },
      { status: 500 }
    );
  }
}
