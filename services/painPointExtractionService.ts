import { supabaseAdmin } from '@lib/supabaseClient';

// ============================================================
// SERVICIO DE EXTRACCIÓN DE PAIN POINTS DESDE TRANSCRIPTS
// Sprint 3 — Pipeline: Transcript → IA → Pain Points + Sources
// ============================================================

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DEFAULT_MODEL = 'openai/gpt-4o-mini'; // OpenRouter free tier
const FALLBACK_MODEL = 'gpt-4o-mini'; // OpenAI direct

// ── Interfaces ──────────────────────────────────────────────

export interface ExtractedPainPointRaw {
  title: string;
  description: string;
  category: string;
  severity: number;
  business_type: string;
  opportunity_score: number;
  market_scope: string;
  transcript_segment: string;
  extraction_confidence: number;
  external_evidence?: Array<{
    source_name: string;
    evidence: string;
    credibility_score: number;
  }>;
}

export interface ExtractionResult {
  success: boolean;
  pain_points: ExtractedPainPointRaw[];
  token_usage?: { input: number; output: number };
  model_used: string;
  error?: string;
}

export interface BatchExtractionStats {
  transcripts_processed: number;
  transcripts_skipped: number;
  pain_points_extracted: number;
  pain_points_deduplicated: number;
  sources_created: number;
  total_input_tokens: number;
  total_output_tokens: number;
  estimated_cost_usd: number;
  errors: number;
  model_used: string;
}

// ── System Prompt ───────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `Eres un analista experto en identificación de problemas de mercado y oportunidades de negocio. Tu tarea es extraer PAIN POINTS (problemas, fricciones, necesidades no resueltas, quejas, barreras) mencionados explícita o implícitamente en transcripciones de videos de emprendedores.

REGLAS ESTRICTAS:
1. Extraer pain points mencionados explícita o implícitamente en el texto.
2. OBLIGATORIO: SIEMPRE debes extraer AL MENOS UN pain point. Si el video es puro éxito, deduce la barrera inicial o el problema que el producto resolvió y documéntalo (puedes asignarle una severidad baja, ej. 3 o 4). NUNCA devuelvas un array vacío.
3. Cada pain point debe incluir la CITA TEXTUAL exacta del transcript (transcript_segment) que más se acerque al problema.
4. Asignar scores realistas. Un "10" solo se usa para problemas catastróficos.
5. OBLIGATORIO: Basado en el problema detectado, genera "external_evidence" utilizando tu conocimiento sobre reportes de instituciones confiables (ej. BID, Banco Mundial, CEPAL, McKinsey LATAM). Proporciona datos estadísticos o razonamientos técnicos que demuestren por qué este problema aplica fuertemente a América Latina.
6. Mínimo 1, Máximo 8 pain points por transcript para evitar ruido.

CATEGORÍAS VÁLIDAS:
- Fintech / Pagos
- Logística / Supply Chain
- SaaS / Software
- E-commerce
- Marketing / Growth
- Legal / Regulatorio
- Recursos Humanos / Talento
- Educación / EdTech
- Salud / HealthTech
- Manufactura / Producción
- Agro / FoodTech
- Otro`;

// ── Prompt Builder ──────────────────────────────────────────

function buildExtractionPrompt(videoTitle: string, transcript: string): string {
  // Truncar transcript a ~6000 chars para eficiencia de tokens
  const truncated = transcript.substring(0, 6000);
  
  return `Analiza el siguiente transcript de un video de emprendimiento y extrae todos los PAIN POINTS (problemas de mercado, fricciones, barreras) que se mencionan.

VIDEO: "${videoTitle}"

TRANSCRIPT:
"""
${truncated}
"""

RESPONDE EXCLUSIVAMENTE en el siguiente formato JSON. No agregues texto fuera del JSON:
{
  "pain_points": [
    {
      "title": "Título conciso del problema (máximo 80 caracteres)",
      "description": "Descripción detallada del problema y su impacto en el mercado (2-3 oraciones)",
      "category": "Una de las categorías válidas",
      "severity": 7,
      "business_type": "B2B / B2C / B2B2C / Marketplace / SaaS / etc.",
      "opportunity_score": 8,
      "market_scope": "LATAM General / México / Colombia / Argentina / Global",
      "transcript_segment": "Cita textual exacta del transcript que evidencia este problema",
      "extraction_confidence": 85,
      "external_evidence": [
        {
          "source_name": "BID",
          "evidence": "Las pymes de América Latina enfrentan brechas de productividad y adopción tecnológica respecto a mercados más desarrollados debido a procesos no estandarizados.",
          "credibility_score": 9
        }
      ]
    }
  ]
}`;
}

// ── LLM Callers ─────────────────────────────────────────────

async function callOpenRouter(prompt: string, systemPrompt: string): Promise<ExtractionResult> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY no configurado');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://starter-story-latam.vercel.app',
      'X-Title': 'Starter Story LATAM Engine'
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 3000,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || '{}';
  console.log('[PP-EXTRACT-DEBUG] OpenRouter RAW Content:', content);
  
  let parsed = { pain_points: [] };
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error('[PP-EXTRACT-DEBUG] Error parsing JSON:', e, content);
  }

  return {
    success: true,
    pain_points: parsed.pain_points || [],
    token_usage: {
      input: result.usage?.prompt_tokens || 0,
      output: result.usage?.completion_tokens || 0
    },
    model_used: DEFAULT_MODEL
  };
}

async function callOpenAIDirect(prompt: string, systemPrompt: string): Promise<ExtractionResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no configurado');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: FALLBACK_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error (${response.status})`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || '{}';
  console.log('[PP-EXTRACT-DEBUG] OpenAI RAW Content:', content);
  
  let parsed = { pain_points: [] };
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error('[PP-EXTRACT-DEBUG] Error parsing JSON:', e, content);
  }

  return {
    success: true,
    pain_points: parsed.pain_points || [],
    token_usage: {
      input: result.usage?.prompt_tokens || 0,
      output: result.usage?.completion_tokens || 0
    },
    model_used: FALLBACK_MODEL
  };
}

// ── Core Extraction with Fallback ───────────────────────────

async function extractFromTranscript(videoTitle: string, transcript: string): Promise<ExtractionResult> {
  const prompt = buildExtractionPrompt(videoTitle, transcript);

  // Intentar OpenRouter primero (costo optimizado)
  if (OPENROUTER_API_KEY) {
    try {
      return await callOpenRouter(prompt, EXTRACTION_SYSTEM_PROMPT);
    } catch (err: any) {
      console.warn(`[PP-EXTRACT] OpenRouter falló: ${err.message}. Intentando OpenAI...`);
    }
  }

  // Fallback a OpenAI directo
  if (OPENAI_API_KEY) {
    try {
      return await callOpenAIDirect(prompt, EXTRACTION_SYSTEM_PROMPT);
    } catch (err: any) {
      console.error(`[PP-EXTRACT] OpenAI también falló: ${err.message}`);
      return { success: false, pain_points: [], model_used: 'none', error: err.message };
    }
  }

  return { success: false, pain_points: [], model_used: 'none', error: 'No API keys configuradas' };
}

// ── Deduplication Logic ─────────────────────────────────────

async function findOrCreatePainPoint(
  pp: ExtractedPainPointRaw,
  extractionVersion: string,
  videoId: string
): Promise<{ pain_point_id: string; is_new: boolean }> {
  // Buscar pain point existente por título similar + categoría
  const { data: existing } = await supabaseAdmin
    .from('pain_points')
    .select('id, title, frequency_score')
    .eq('category', pp.category)
    .ilike('title', `%${pp.title.substring(0, 30)}%`)
    .limit(1);

  let painPointId: string;
  let isNew: boolean;

  if (existing && existing.length > 0) {
    painPointId = existing[0].id;
    isNew = false;

    // Incrementar frecuencia del pain point existente
    const newFreq = (existing[0].frequency_score || 1) + 1;
    await supabaseAdmin
      .from('pain_points')
      .update({
        frequency_score: newFreq,
        final_score: calculateCompositeScore(pp.severity, newFreq, pp.opportunity_score),
        updated_at: new Date().toISOString()
      })
      .eq('id', painPointId);
  } else {
    // Crear nuevo pain point
    const { data: newPP, error } = await supabaseAdmin
      .from('pain_points')
      .insert({
        title: pp.title.substring(0, 255),
        description: pp.description,
        category: pp.category,
        severity_score: pp.severity,
        market_segment: pp.market_scope || 'LATAM General',
        frequency_score: 1,
        final_score: calculateCompositeScore(pp.severity, 1, pp.opportunity_score),
        version: extractionVersion,
        video_id: videoId
      })
      .select('id')
      .single();

    if (error || !newPP) {
      throw new Error(`Error creando pain point: ${error?.message}`);
    }
    painPointId = newPP.id;
    isNew = true;
  }

  // Insertar la cita del transcript como source
  await supabaseAdmin.from('pain_point_sources').insert({
    pain_point_id: painPointId,
    source_type: 'video',
    source_name: 'YouTube Transcript',
    source_url: `https://youtube.com/watch?v=${videoId}`,
    evidence: pp.transcript_segment,
    credibility_score: 10
  });

  // Insertar external evidence si existe
  if (pp.external_evidence && pp.external_evidence.length > 0) {
    for (const ext of pp.external_evidence) {
      await supabaseAdmin.from('pain_point_sources').insert({
        pain_point_id: painPointId,
        source_type: 'report',
        source_name: ext.source_name || 'Reporte LATAM',
        evidence: ext.evidence,
        credibility_score: ext.credibility_score || 8,
        country: 'LATAM'
      });
    }
  }

  return { pain_point_id: painPointId, is_new: isNew };
}

function calculateCompositeScore(severity: number, frequency: number, opportunity: number): number {
  const normalizedFreq = Math.min(frequency, 10) / 10;
  const normalizedSev = severity / 10;
  const normalizedOpp = opportunity / 10;
  return Math.round((normalizedSev * 0.35 + normalizedFreq * 0.30 + normalizedOpp * 0.35) * 10) / 10;
}

// ── Batch Processing Pipeline ───────────────────────────────

export async function runPainPointExtractionBatch(
  limit: number = 10,
  extractionVersion: string = 'v1'
): Promise<{ success: boolean; stats: BatchExtractionStats }> {
  
  const stats: BatchExtractionStats = {
    transcripts_processed: 0,
    transcripts_skipped: 0,
    pain_points_extracted: 0,
    pain_points_deduplicated: 0,
    sources_created: 0,
    total_input_tokens: 0,
    total_output_tokens: 0,
    estimated_cost_usd: 0,
    errors: 0,
    model_used: 'pending'
  };

  try {
    console.log(`[PP-BATCH] Iniciando extracción batch. Límite: ${limit}, Versión: ${extractionVersion}`);

    // 1. Obtener transcripts procesables (sin procesados)
    const { data: allTranscripts, error: fetchErr } = await supabaseAdmin
      .from('transcripts')
      .select('youtube_video_id, transcript, word_count')
      .in('status', ['success', 'retry_success'])
      .gt('word_count', 50);

    if (fetchErr) throw fetchErr;

    if (!allTranscripts || allTranscripts.length === 0) {
      console.log('[PP-BATCH] No hay transcripts procesables.');
      return { success: true, stats };
    }

    // 1.b Obtener videos ya procesados (como creadores de un pain point principal)
    const { data: existingPPs } = await supabaseAdmin
      .from('pain_points')
      .select('video_id')
      .not('video_id', 'is', null);
      
    // 1.c Obtener videos ya procesados (como fuentes deduplicadas)
    const { data: existingSources } = await supabaseAdmin
      .from('pain_point_sources')
      .select('source_url')
      .eq('source_type', 'video')
      .not('source_url', 'is', null);

    const processedVideoIds = new Set([
      ...(existingPPs?.map(pp => pp.video_id) || []),
      ...(existingSources?.map(s => {
        const match = s.source_url?.match(/v=([^&]+)/);
        return match ? match[1] : null;
      }).filter(Boolean) as string[])
    ]);
    
    // Filtrar transcripts pendientes limitados
    const pendingTranscripts = allTranscripts
      .filter(t => !processedVideoIds.has(t.youtube_video_id))
      .slice(0, limit);

    if (pendingTranscripts.length === 0) {
      console.log('[PP-BATCH] No hay transcripts pendientes de procesamiento (todos están procesados).');
      return { success: true, stats };
    }

    console.log(`[PP-BATCH] Encontrados ${pendingTranscripts.length} transcripts pendientes.`);

    // 2. Obtener títulos de los videos correspondientes
    const videoIds = pendingTranscripts.map(t => t.youtube_video_id);
    const { data: videoData } = await supabaseAdmin
      .from('videos')
      .select('youtube_video_id, title')
      .in('youtube_video_id', videoIds);

    const videoTitleMap = new Map<string, string>();
    videoData?.forEach(v => videoTitleMap.set(v.youtube_video_id, v.title));

    // 3. Procesar cada transcript
    for (const transcript of pendingTranscripts) {
      const videoTitle = videoTitleMap.get(transcript.youtube_video_id) || 'Video sin título';
      
      // Guard: No enviar transcripts vacíos al modelo
      if (!transcript.transcript || transcript.transcript.trim().length < 100) {
        stats.transcripts_skipped++;
        console.log(`[PP-BATCH] Transcript ${transcript.youtube_video_id} demasiado corto. Omitido.`);
        continue;
      }

      try {
        console.log(`[PP-BATCH] Procesando: ${transcript.youtube_video_id} - "${videoTitle.substring(0, 50)}..."`);
        
        // 4. Llamar al LLM
        const extraction = await extractFromTranscript(videoTitle, transcript.transcript);
        stats.model_used = extraction.model_used;

        if (extraction.token_usage) {
          stats.total_input_tokens += extraction.token_usage.input;
          stats.total_output_tokens += extraction.token_usage.output;
        }

        if (!extraction.success || extraction.pain_points.length === 0) {
          console.log(`[PP-BATCH] Sin pain points detectados para ${transcript.youtube_video_id}.`);
          // Marcar como procesado aunque no se hayan encontrado pain points (Legacy: se re-intentará en el futuro si no inserta en pain_points)
          stats.transcripts_processed++;
          continue;
        }

        // 5. Procesar cada pain point extraído
        for (const pp of extraction.pain_points) {
          // Validación básica de calidad
          if (!pp.title || !pp.description || pp.extraction_confidence < 40) {
            stats.pain_points_deduplicated++;
            continue;
          }

          try {
            const { is_new } = await findOrCreatePainPoint(pp, extractionVersion, transcript.youtube_video_id);

            if (!is_new) {
              stats.pain_points_deduplicated++;
            } else {
              stats.pain_points_extracted++;
            }
          } catch (ppErr: any) {
            console.error(`[PP-BATCH] Error procesando pain point "${pp.title}": ${ppErr.message}`);
            stats.errors++;
          }
        }

        // 7. Marcar transcript como procesado


        stats.transcripts_processed++;

        // Rate limiting: pequeña pausa entre transcripts
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (transcriptErr: any) {
        console.error(`[PP-BATCH] Error en transcript ${transcript.youtube_video_id}: ${transcriptErr.message}`);
        stats.errors++;
      }
    }

    // 8. Estimar costo
    stats.estimated_cost_usd = estimateCost(stats.total_input_tokens, stats.total_output_tokens, stats.model_used);

    // 9. Registrar log de extracción en extraction_logs (schema real de producción)
    await supabaseAdmin.from('extraction_logs').insert({
      video_id: `batch_${stats.transcripts_processed}_videos`,
      model_used: stats.model_used,
      tokens_used: stats.total_input_tokens + stats.total_output_tokens,
      cost_estimated: stats.estimated_cost_usd,
      status: stats.errors > 0 ? 'partial' : 'success',
      error_message: stats.errors > 0
        ? JSON.stringify({
            errors_count: stats.errors,
            extracted: stats.pain_points_extracted,
            deduplicated: stats.pain_points_deduplicated,
            version: extractionVersion
          })
        : null
    });

    console.log(`[PP-BATCH] Finalizado. Extraídos: ${stats.pain_points_extracted}, Dedup: ${stats.pain_points_deduplicated}, Errores: ${stats.errors}`);
    return { success: true, stats };

  } catch (error: any) {
    console.error(`[PP-BATCH] Error crítico: ${error.message}`);
    return { success: false, stats };
  }
}

function estimateCost(inputTokens: number, outputTokens: number, model: string): number {
  // Precios aproximados por 1M tokens (Mayo 2026)
  const pricing: Record<string, { input: number; output: number }> = {
    'google/gemma-3-27b-it:free': { input: 0, output: 0 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4o': { input: 2.50, output: 10.00 },
  };

  const p = pricing[model] || pricing['gpt-4o-mini'];
  return Math.round(((inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output) * 10000) / 10000;
}

export async function runSingleVideoExtraction(
  videoId: string,
  extractionVersion: string = 'v1'
): Promise<{ success: boolean; stats: any; error?: string }> {
  try {
    console.log(`[PP-SINGLE] Iniciando extracción para video: ${videoId}`);

    // 1. Obtener transcript
    const { data: transcriptData, error: fetchErr } = await supabaseAdmin
      .from('transcripts')
      .select('transcript, word_count')
      .eq('youtube_video_id', videoId)
      .single();

    if (fetchErr || !transcriptData) {
      throw new Error(`No se encontró transcript para el video ${videoId}`);
    }

    // 2. Obtener título
    const { data: videoData, error: videoErr } = await supabaseAdmin
      .from('videos')
      .select('title')
      .eq('youtube_video_id', videoId)
      .single();

    if (videoErr || !videoData) {
      throw new Error(`No se encontró metadata para el video ${videoId}`);
    }

    // 3. Llamar al LLM
    const extraction = await extractFromTranscript(videoData.title, transcriptData.transcript);
    
    if (!extraction.success) {
      throw new Error(extraction.error || 'Fallo en la extracción IA');
    }

    const results = [];
    for (const pp of extraction.pain_points) {
      if (!pp.title || !pp.description || pp.extraction_confidence < 40) continue;

      const { pain_point_id, is_new } = await findOrCreatePainPoint(pp, extractionVersion, videoId);

      results.push({ pain_point_id, is_new, title: pp.title });
    }

    return { 
      success: true, 
      stats: {
        pain_points_extracted: results.length,
        model_used: extraction.model_used,
        token_usage: extraction.token_usage
      }
    };

  } catch (error: any) {
    console.error(`[PP-SINGLE] Error: ${error.message}`);
    return { success: false, stats: {}, error: error.message };
  }
}
