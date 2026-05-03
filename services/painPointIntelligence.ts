import { RawSourceData } from './marketPainPointCollector';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export interface ExtractedPainPoint {
  title: string;
  description: string;
  category: string;
  severity: number; // 1-5
  confidence_score: number; // 0.0 - 1.0
  evidence: string;
  market_segment?: string;
  source_url?: string;
  source_name?: string;
}

export interface ClusteredPainPoint {
  title: string;
  description: string;
  category: string;
  market_segment: string;
  severity_score: number;
  frequency_score: number;
  recency_score: number;
  confidence_score: number;
  final_score: number;
  evidence_sources: Array<{ url?: string; source?: string; quote?: string }>;
}

export interface IntelligenceStats {
  extractedTotal: number;
  discardedLowConfidence: number;
  mergedClusters: number;
  confidenceSum: number;
}

function cleanInput(data: RawSourceData) {
  const cleanedText = (data.content || '').substring(0, 3000).replace(/\s+/g, ' ').trim();
  return {
    title: (data.title || '').substring(0, 200).trim(),
    content: cleanedText
  };
}

async function callOpenAI(prompt: string): Promise<any> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3 // Bajamos la temperatura para mayor precisión
    })
  });

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  const result = await response.json();
  return JSON.parse(result.choices[0].message.content);
}

/**
 * FASE 2: EXTRACCIÓN CON CONFIDENCE SCORE
 */
export async function extractPainPointsFromText(data: RawSourceData): Promise<ExtractedPainPoint[]> {
  if (!OPENAI_API_KEY) {
    console.warn(`[INTELLIGENCE] OPENAI_API_KEY no configurado, omitiendo extracción.`);
    return [];
  }

  const { title, content } = cleanInput(data);

  const basePrompt = `
Eres un analista experto de mercado LATAM.
Extrae problemas, quejas, fricciones y necesidades no resueltas (Pain Points) del siguiente texto.

TEXTO A ANALIZAR:
Título: ${title}
Contenido: ${content}

REGLA DE CONFIDENCE SCORE OBLIGATORIA:
Asigna un "confidence_score" de 0.0 a 1.0 según la evidencia real en el texto:
- 0.8 a 1.0: Pain point explícito, claro y directamente expresado en el texto.
- 0.5 a 0.79: Problema inferido pero con evidencia parcial o contextual.
- 0.2 a 0.49: Débil, ambiguo o muy indirecto.
- Menos de 0.2: NO lo incluyas en la lista.

Si no hay suficiente información, o no se detectan problemas reales, devuelve el array "pain_points" VACÍO []. NO INVENTES DATOS.

FORMATO OBLIGATORIO (JSON EXACTO):
{
  "pain_points": [
    {
      "title": "Breve título del problema",
      "description": "Descripción clara de la frustración",
      "category": "SaaS / E-commerce / Marketing / Fintech / etc",
      "severity": 3,
      "confidence_score": 0.85,
      "evidence": "Cita exacta o prueba implícita del texto"
    }
  ]
}
`;

  try {
    const parsed = await callOpenAI(basePrompt);
    const painPoints = parsed.pain_points || [];

    if (painPoints.length === 0) {
      console.log(`[INTELLIGENCE] low_signal_document: No se extrajeron pain points para el documento.`);
      return [];
    }

    return painPoints.map((p: any) => ({
      ...p,
      market_segment: p.category || 'General',
      source_url: data.url,
      source_name: data.source
    }));

  } catch (error: any) {
    console.error(`[INTELLIGENCE-ERROR] Error procesando texto:`, error.message);
    return [];
  }
}

/**
 * FASE 4: SIMILITUD SEMÁNTICA LIGERA
 */
function getTokens(text: string): Set<string> {
  const words = text.toLowerCase().replace(/[^\w\sáéíóúüñ]/g, '').split(/\s+/);
  return new Set(words.filter(w => w.length > 3 && !['para', 'como', 'pero', 'esto', 'este'].includes(w)));
}

function calculateSimilarity(textA: string, textB: string): number {
  const setA = getTokens(textA);
  const setB = getTokens(textB);
  if (setA.size === 0 || setB.size === 0) return 0;
  
  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return intersection / union; // Índice Jaccard
}

/**
 * FASE 3, 4 y 5: AGRUPACIÓN Y SCORING
 */
export function clusterAndScorePainPoints(extracted: ExtractedPainPoint[], statsRef: IntelligenceStats): ClusteredPainPoint[] {
  statsRef.extractedTotal += extracted.length;

  // 1. Filtrar baja confianza y ruido
  const highConfidence = extracted.filter(p => {
    if ((p.confidence_score || 0) < 0.5) {
      statsRef.discardedLowConfidence++;
      return false;
    }
    // Eliminar muy genéricos (título de menos de 2 palabras)
    if (p.title.split(' ').length < 2) {
      statsRef.discardedLowConfidence++;
      return false;
    }
    statsRef.confidenceSum += p.confidence_score;
    return true;
  });

  const clusters: ClusteredPainPoint[] = [];

  for (const item of highConfidence) {
    let merged = false;
    
    // Buscar cluster similar
    for (const cluster of clusters) {
      // Misma categoría ayuda a acotar
      if (cluster.market_segment === (item.market_segment || item.category || 'General')) {
        const sim = calculateSimilarity(item.title + ' ' + item.description, cluster.title + ' ' + cluster.description);
        
        if (sim > 0.3) { // Threshold moderado para merge
          // Merge
          cluster.frequency_score += 1;
          cluster.severity_score = (cluster.severity_score + item.severity) / 2;
          
          // Mantener mejor evidencia
          if (item.confidence_score > cluster.confidence_score) {
            cluster.title = item.title; // Tomar el título con mayor confianza
            cluster.confidence_score = item.confidence_score;
          }
          
          cluster.description += ` | ${item.description}`;
          
          if (!cluster.evidence_sources.find(e => e.url === item.source_url)) {
            cluster.evidence_sources.push({
              source: item.source_name,
              url: item.source_url,
              quote: item.evidence
            });
          }
          
          merged = true;
          statsRef.mergedClusters++;
          break;
        }
      }
    }

    if (!merged) {
      clusters.push({
        title: item.title,
        description: item.description,
        category: item.category,
        market_segment: item.market_segment || item.category || 'General',
        severity_score: item.severity || 3,
        frequency_score: 1,
        recency_score: 5,
        confidence_score: item.confidence_score,
        final_score: 0,
        evidence_sources: [{
          source: item.source_name,
          url: item.source_url,
          quote: item.evidence
        }]
      });
    }
  }

  // Scoring final
  for (const c of clusters) {
    const normalizedFreq = Math.min(c.frequency_score, 5); 
    // confidence influye ligeramente en el score final
    c.final_score = (normalizedFreq * 0.4) + (c.severity_score * 0.4) + (c.recency_score * 0.15) + (c.confidence_score * 0.05);
  }

  clusters.sort((a, b) => b.final_score - a.final_score);
  return clusters;
}
