import { NextResponse } from 'next/server';
import { saveVideosToDB, ApifyVideo } from '../../../../services/videoStorageService';

export const dynamic = 'force-dynamic';

export async function GET() {
  // TAREA 2: USAR DATA MOCK (Simulando la respuesta ya obtenida de Apify)
  const mockVideos: ApifyVideo[] = [
    {
      id: 'zNlhSnpM_64',
      title: 'How 15 year old built a $1,000,000/month business',
      url: 'https://www.youtube.com/watch?v=zNlhSnpM_64',
      viewCount: 450000,
      date: '2023-10-05T14:00:00Z',
      likes: 12000,
      channelName: 'Starter Story',
      channelId: 'UCv6_t9TidjY_eNq8v1H_T8A'
    },
    {
      id: 'ABC_999_TEST',
      title: 'Business Model Testing: Mock Data for Latitude',
      url: 'https://www.youtube.com/watch?v=ABC_999_TEST',
      viewCount: 1500,
      date: '2024-04-21T18:00:00Z',
      likes: 450,
      channelName: 'Starter Story',
      channelId: 'UCv6_t9TidjY_eNq8v1H_T8A'
    }
  ];

  try {
    // TAREA 3: LLAMAR SERVICIO
    const result = await saveVideosToDB(mockVideos);

    // TAREA 4: RESPUESTA
    return NextResponse.json({
      success: true,
      inserted: result.inserted,
      skipped: result.skipped,
      message: 'Prueba de almacenamiento finalizada'
    });
  } catch (error: any) {
    console.error('Error in save-mock-videos route:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error procesando la inserción de prueba', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}
