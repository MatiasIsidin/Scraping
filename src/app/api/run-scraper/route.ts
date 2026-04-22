import { NextResponse } from 'next/server';
import { fetchStarterStoryVideos } from '../../../../services/apifyService';
import { saveVideosToDB } from '../../../../services/videoStorageService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Paso 1: Llamar a Apify
    console.log('--- Iniciando Pipeline: Fetching de Apify ---');
    const data = await fetchStarterStoryVideos();
    const totalFetched = data?.length || 0;

    console.log(`[PIPELINE-TRACE] Data tipo: ${typeof data}, Es Array: ${Array.isArray(data)}`);
    if (totalFetched > 0) {
      console.log(`[PIPELINE-TRACE] Primer elemento ID: ${data[0].id || data[0].videoId}`);
    }

    if (totalFetched === 0) {
       return NextResponse.json({
        success: true,
        message: 'No se encontraron videos nuevos en Apify.',
        total_fetched: 0,
        inserted: 0,
        skipped: 0,
        errors: 0
      });
    }

    // Paso 2, 3 y 4: Mapear, Insertar y Registrar Logs (Todo incluido en saveVideosToDB)
    console.log(`--- Procesando ${totalFetched} videos hacia Supabase ---`);
    const result = await saveVideosToDB(data, 'manual');

    // Paso 5: Retornar resumen del pipeline
    return NextResponse.json({
      success: true,
      total_fetched: totalFetched,
      inserted: result.inserted,
      skipped: result.skipped,
      errors: result.errors
    });

  } catch (error: any) {
    console.error('--- Pipeline Error ---', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error crítico en el pipeline de scraping', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}
