import { NextResponse } from 'next/server';
import { fetchStarterStoryVideos } from '../../../../services/apifyService';
import { saveVideosToDB } from '../../../../services/videoStorageService';
import { saveVideoSnapshots } from '../../../../services/videoSnapshotService';
import { insertScrapingLog } from '../../../../services/logService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Fetch de Apify
    console.log('--- Iniciando Pipeline: Fetching de Apify ---');
    const data = await fetchStarterStoryVideos();
    const totalFetched = data?.length || 0;

    console.log(`[PIPELINE-TRACE] Data tipo: ${typeof data}, Es Array: ${Array.isArray(data)}`);

    if (totalFetched === 0) {
       // Registrar log incluso si está vacío
       await insertScrapingLog({
         run_type: 'manual',
         total_fetched: 0,
         inserted_count: 0,
         skipped_count: 0,
         snapshots_count: 0,
         error_count: 0
       });

       return NextResponse.json({
        success: true,
        message: 'No se encontraron videos en Apify.',
        total_fetched: 0,
        inserted: 0,
        skipped: 0,
        snapshots_created: 0,
        errors: 0
      });
    }

    // 2. Guardar Videos (Deduplicación interna en saveVideosToDB)
    console.log(`--- Paso 2: Guardando videos en DB (${totalFetched}) ---`);
    const storageResult = await saveVideosToDB(data, 'manual');

    // 3. Guardar Snapshots (SIEMPRE se crean)
    console.log(`--- Paso 3: Creando snapshots para ${totalFetched} videos ---`);
    const snapshotResult = await saveVideoSnapshots(data);

    // 4. Registrar Logs de ejecución
    const totalErrors = storageResult.errors + snapshotResult.errors;
    console.log(`--- Paso 4: Registrando log de ejecución ---`);
    await insertScrapingLog({
      run_type: 'manual',
      total_fetched: totalFetched,
      inserted_count: storageResult.inserted,
      skipped_count: storageResult.skipped,
      snapshots_count: snapshotResult.snapshotsCreated,
      error_count: totalErrors
    });

    // 5. Respuesta final
    return NextResponse.json({
      success: true,
      total_fetched: totalFetched,
      inserted: storageResult.inserted,
      skipped: storageResult.skipped,
      snapshots_created: snapshotResult.snapshotsCreated,
      errors: totalErrors
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

