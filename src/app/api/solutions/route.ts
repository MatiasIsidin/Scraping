import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@lib/supabaseClient';
import { SolutionMatchingService } from '@services/solutionMatchingService';
import { SolutionGenerationService } from '@services/solutionGenerationService';

export async function GET() {
  try {
    const userId = 'Matias'; // En producción esto vendría de la sesión de usuario
    
    // 1. Cargar el perfil RPM activo del usuario
    const profile = await SolutionMatchingService.loadActiveProfile(userId);
    if (!profile) {
      return NextResponse.json({ 
        success: false, 
        code: 'NO_PROFILE', 
        message: 'No se encontró un perfil RPM activo para el usuario. Por favor, crea un perfil en el RPM Wizard.' 
      });
    }

    // 2. Calcular el hash SHA-256 de los parámetros actuales del perfil
    const calculatedHash = SolutionMatchingService.getCriteriaHash(profile);

    // 3. Obtener soluciones activas existentes para este perfil
    const solutions = await SolutionGenerationService.getExistingSolutions(profile.id);

    // 4. Determinar si las soluciones corresponden al perfil activo actual
    // Si no hay soluciones, o si el hash del perfil cambió, se marcan como desactualizadas
    const isOutdated = solutions.length === 0 || solutions[0].criteria_hash !== calculatedHash;

    // 5. Enriquecer las propuestas de solución con datos reales de Pain Points y Videos
    const enrichedSolutions = [];
    
    for (const sol of solutions) {
      // Buscar información del Pain Point
      const { data: painPoint } = await supabaseAdmin
        .from('pain_points')
        .select('*')
        .eq('id', sol.matched_pain_point_id)
        .maybeSingle();

      // Buscar información de los videos asociados
      let relatedVideos: any[] = [];
      if (sol.matched_video_ids && sol.matched_video_ids.length > 0) {
        const { data: vData } = await supabaseAdmin
          .from('videos')
          .select('youtube_video_id, title, url')
          .in('youtube_video_id', sol.matched_video_ids);

        // Obtener el razonamiento de clasificación específico para este cruce
        const { data: cData } = await supabaseAdmin
          .from('video_classifications')
          .select('youtube_video_id, reasoning, latam_relevance_score')
          .eq('pain_point_id', sol.matched_pain_point_id)
          .in('youtube_video_id', sol.matched_video_ids);

        relatedVideos = (vData || []).map(vid => {
          const classification = (cData || []).find(c => c.youtube_video_id === vid.youtube_video_id);
          return {
            ...vid,
            reasoning: classification?.reasoning || 'Evidencia validada en el video.',
            latam_relevance_score: classification?.latam_relevance_score || 75
          };
        });
      }

      enrichedSolutions.push({
        ...sol,
        pain_point: painPoint || {
          title: 'Dolor de Mercado',
          category: 'General',
          severity_score: 7,
          description: 'Evidencia recolectada.'
        },
        videos: relatedVideos
      });
    }

    return NextResponse.json({
      success: true,
      profile,
      solutions: enrichedSolutions,
      isOutdated,
      calculatedHash
    });

  } catch (error: any) {
    console.error('[API-SOLUTIONS-GET] Error general:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Error interno al obtener soluciones' 
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    const userId = 'Matias';
    console.log('[API-SOLUTIONS-POST] Gatillando generación del Motor de Soluciones...');
    
    // 1. Ejecutar el pipeline completo del Sprint 5 (Matching, Ranking, 7-factor Scoring y Generación en Paralelo)
    const solutions = await SolutionGenerationService.generateSolutionsForUser(userId);
    
    // 2. Obtener el perfil activo
    const profile = await SolutionMatchingService.loadActiveProfile(userId);
    if (!profile) {
      return NextResponse.json({ 
        success: false, 
        message: 'No se encontró un perfil RPM activo.' 
      }, { status: 400 });
    }

    // 3. Enriquecer las nuevas soluciones de la misma forma que en el GET
    const enrichedSolutions = [];
    
    for (const sol of solutions) {
      const { data: painPoint } = await supabaseAdmin
        .from('pain_points')
        .select('*')
        .eq('id', sol.matched_pain_point_id)
        .maybeSingle();

      let relatedVideos: any[] = [];
      if (sol.matched_video_ids && sol.matched_video_ids.length > 0) {
        const { data: vData } = await supabaseAdmin
          .from('videos')
          .select('youtube_video_id, title, url')
          .in('youtube_video_id', sol.matched_video_ids);

        const { data: cData } = await supabaseAdmin
          .from('video_classifications')
          .select('youtube_video_id, reasoning, latam_relevance_score')
          .eq('pain_point_id', sol.matched_pain_point_id)
          .in('youtube_video_id', sol.matched_video_ids);

        relatedVideos = (vData || []).map(vid => {
          const classification = (cData || []).find(c => c.youtube_video_id === vid.youtube_video_id);
          return {
            ...vid,
            reasoning: classification?.reasoning || 'Evidencia validada en el video.',
            latam_relevance_score: classification?.latam_relevance_score || 75
          };
        });
      }

      enrichedSolutions.push({
        ...sol,
        pain_point: painPoint || {
          title: 'Dolor de Mercado',
          category: 'General',
          severity_score: 7,
          description: 'Evidencia recolectada.'
        },
        videos: relatedVideos
      });
    }

    return NextResponse.json({
      success: true,
      solutions: enrichedSolutions,
      profile,
      isOutdated: false
    });

  } catch (error: any) {
    console.error('[API-SOLUTIONS-POST] Error crítico en generación:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Fallo general al generar propuestas de solución' 
    }, { status: 500 });
  }
}
