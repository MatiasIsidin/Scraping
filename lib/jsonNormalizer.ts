// ============================================================
// JSON NORMALIZER — Schema Validation, Repair & Standardization
// Sprint 3 — Starter Story LATAM Engine
//
// Responsibilities:
//   - Validate extracted data against expected schemas
//   - Standardize categories to canonical list
//   - Clamp numeric scores to valid ranges
//   - Detect and flag duplicates within a batch
//   - Compute composite scores
// ============================================================

// ── Canonical Categories ────────────────────────────────────

export const VALID_CATEGORIES = [
  'Fintech / Pagos',
  'Logística / Supply Chain',
  'SaaS / Software',
  'E-commerce',
  'Marketing / Growth',
  'Legal / Regulatorio',
  'Recursos Humanos / Talento',
  'Educación / EdTech',
  'Salud / HealthTech',
  'Manufactura / Producción',
  'Agro / FoodTech',
  'Otro',
] as const;

export type ValidCategory = (typeof VALID_CATEGORIES)[number];

export const VALID_BUSINESS_TYPES = [
  'B2B', 'B2C', 'B2B2C', 'Marketplace', 'SaaS', 'DTC', 'Servicio', 'Plataforma', 'Otro',
] as const;

// ── Category Mapping (fuzzy → canonical) ────────────────────

const CATEGORY_ALIASES: Record<string, ValidCategory> = {
  // English aliases
  'fintech': 'Fintech / Pagos',
  'payments': 'Fintech / Pagos',
  'finance': 'Fintech / Pagos',
  'logistics': 'Logística / Supply Chain',
  'supply chain': 'Logística / Supply Chain',
  'shipping': 'Logística / Supply Chain',
  'saas': 'SaaS / Software',
  'software': 'SaaS / Software',
  'ecommerce': 'E-commerce',
  'e-commerce': 'E-commerce',
  'retail': 'E-commerce',
  'marketing': 'Marketing / Growth',
  'growth': 'Marketing / Growth',
  'advertising': 'Marketing / Growth',
  'legal': 'Legal / Regulatorio',
  'regulatory': 'Legal / Regulatorio',
  'compliance': 'Legal / Regulatorio',
  'hr': 'Recursos Humanos / Talento',
  'hiring': 'Recursos Humanos / Talento',
  'talent': 'Recursos Humanos / Talento',
  'human resources': 'Recursos Humanos / Talento',
  'education': 'Educación / EdTech',
  'edtech': 'Educación / EdTech',
  'health': 'Salud / HealthTech',
  'healthtech': 'Salud / HealthTech',
  'healthcare': 'Salud / HealthTech',
  'manufacturing': 'Manufactura / Producción',
  'production': 'Manufactura / Producción',
  'agriculture': 'Agro / FoodTech',
  'foodtech': 'Agro / FoodTech',
  'food': 'Agro / FoodTech',
  // Spanish aliases
  'pagos': 'Fintech / Pagos',
  'logística': 'Logística / Supply Chain',
  'educación': 'Educación / EdTech',
  'salud': 'Salud / HealthTech',
  'manufactura': 'Manufactura / Producción',
  'automatización': 'SaaS / Software',
};

// ── Pain Point Schema ───────────────────────────────────────

export interface RawPainPointFromLLM {
  pain_point_title?: string;
  title?: string;
  pain_point_description?: string;
  description?: string;
  business_category?: string;
  category?: string;
  target_market?: string;
  market_scope?: string;
  severity_score?: number;
  severity?: number;
  frequency_score?: number;
  frequency?: number;
  opportunity_score?: number;
  opportunity?: number;
  monetization_potential?: string;
  startup_stage?: string;
  business_type?: string;
  source_video_id?: string;
  transcript_segment?: string;
  extraction_confidence?: number;
  confidence?: number;
}

export interface NormalizedPainPoint {
  title: string;
  description: string;
  category: ValidCategory;
  target_market: string;
  severity_score: number;
  frequency_score: number;
  opportunity_score: number;
  monetization_potential: string;
  startup_stage: string;
  business_type: string;
  source_video_id: string;
  transcript_segment: string;
  extraction_confidence: number;
  composite_score: number;
  quality_flags: string[];
}

export interface NormalizationResult {
  valid: NormalizedPainPoint[];
  rejected: Array<{ raw: RawPainPointFromLLM; reason: string }>;
  stats: {
    total_input: number;
    valid_count: number;
    rejected_count: number;
    duplicates_removed: number;
    categories_fixed: number;
    scores_clamped: number;
  };
}

// ── Score Utilities ─────────────────────────────────────────

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  if (value === undefined || value === null || isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Composite Score Formula (per constitution §7):
 * final_score = (severity + frequency + opportunity + market_validation + regional_fit) / 5
 *
 * For extraction phase (no LATAM enrichment yet), we use:
 * composite = (severity + frequency + opportunity) / 3  (normalized 0-10)
 */
export function calculateCompositeScore(
  severity: number,
  frequency: number,
  opportunity: number,
  marketValidation?: number,
  regionalFit?: number
): number {
  if (marketValidation !== undefined && regionalFit !== undefined) {
    // Full formula with LATAM enrichment
    return Math.round(((severity + frequency + opportunity + marketValidation + regionalFit) / 5) * 100) / 100;
  }
  // Extraction-only composite
  return Math.round(((severity + frequency + opportunity) / 3) * 100) / 100;
}

// ── Category Resolution ─────────────────────────────────────

export function resolveCategory(raw: string | undefined): { category: ValidCategory; fixed: boolean } {
  if (!raw) return { category: 'Otro', fixed: true };

  // Exact match first
  if (VALID_CATEGORIES.includes(raw as ValidCategory)) {
    return { category: raw as ValidCategory, fixed: false };
  }

  // Alias lookup (case-insensitive)
  const lower = raw.toLowerCase().trim();
  for (const [alias, canonical] of Object.entries(CATEGORY_ALIASES)) {
    if (lower.includes(alias)) {
      return { category: canonical, fixed: true };
    }
  }

  // Fuzzy: check if any canonical category's first word matches
  for (const cat of VALID_CATEGORIES) {
    const firstWord = cat.split(' ')[0].toLowerCase();
    if (lower.includes(firstWord)) {
      return { category: cat, fixed: true };
    }
  }

  return { category: 'Otro', fixed: true };
}

// ── Normalization Pipeline ──────────────────────────────────

export function normalizePainPoints(
  rawList: RawPainPointFromLLM[],
  sourceVideoId: string
): NormalizationResult {
  const stats = {
    total_input: rawList.length,
    valid_count: 0,
    rejected_count: 0,
    duplicates_removed: 0,
    categories_fixed: 0,
    scores_clamped: 0,
  };

  const valid: NormalizedPainPoint[] = [];
  const rejected: Array<{ raw: RawPainPointFromLLM; reason: string }> = [];
  const seenTitles = new Set<string>();

  for (const raw of rawList) {
    const flags: string[] = [];

    // ── Extract fields with alias support ──────────────────
    const title = (raw.pain_point_title || raw.title || '').trim();
    const description = (raw.pain_point_description || raw.description || '').trim();
    const rawCategory = raw.business_category || raw.category || '';
    const targetMarket = raw.target_market || raw.market_scope || 'LATAM General';
    const businessType = raw.business_type || 'Otro';
    const transcriptSegment = (raw.transcript_segment || '').trim();

    // ── Reject if essential fields missing ──────────────────
    if (!title || title.length < 5) {
      rejected.push({ raw, reason: 'Título vacío o demasiado corto (<5 chars)' });
      stats.rejected_count++;
      continue;
    }

    if (!description || description.length < 10) {
      rejected.push({ raw, reason: 'Descripción vacía o demasiado corta (<10 chars)' });
      stats.rejected_count++;
      continue;
    }

    // ── Duplicate detection (within batch) ──────────────────
    const titleKey = title.toLowerCase().substring(0, 40);
    if (seenTitles.has(titleKey)) {
      stats.duplicates_removed++;
      rejected.push({ raw, reason: 'Duplicado dentro del batch' });
      stats.rejected_count++;
      continue;
    }
    seenTitles.add(titleKey);

    // ── Category normalization ──────────────────────────────
    const { category, fixed: catFixed } = resolveCategory(rawCategory);
    if (catFixed) {
      stats.categories_fixed++;
      flags.push(`category_fixed: "${rawCategory}" → "${category}"`);
    }

    // ── Score clamping (1-10 range) ─────────────────────────
    const rawSev = raw.severity_score ?? raw.severity;
    const rawFreq = raw.frequency_score ?? raw.frequency;
    const rawOpp = raw.opportunity_score ?? raw.opportunity;
    const rawConf = raw.extraction_confidence ?? raw.confidence;

    const severity = clamp(rawSev, 1, 10, 5);
    const frequency = clamp(rawFreq, 1, 10, 5);
    const opportunity = clamp(rawOpp, 1, 10, 5);
    const confidence = clamp(rawConf, 1, 100, 50);

    if (rawSev !== severity || rawFreq !== frequency || rawOpp !== opportunity) {
      stats.scores_clamped++;
      flags.push('scores_clamped');
    }

    // ── Confidence gate ─────────────────────────────────────
    if (confidence < 30) {
      rejected.push({ raw, reason: `Confidence demasiado baja: ${confidence}` });
      stats.rejected_count++;
      continue;
    }

    // ── Build normalized object ─────────────────────────────
    const composite = calculateCompositeScore(severity, frequency, opportunity);

    valid.push({
      title: title.substring(0, 200),
      description: description.substring(0, 1000),
      category,
      target_market: targetMarket.substring(0, 100),
      severity_score: severity,
      frequency_score: frequency,
      opportunity_score: opportunity,
      monetization_potential: (raw.monetization_potential || 'medium').toLowerCase(),
      startup_stage: (raw.startup_stage || 'early').toLowerCase(),
      business_type: VALID_BUSINESS_TYPES.includes(businessType as any) ? businessType : 'Otro',
      source_video_id: raw.source_video_id || sourceVideoId,
      transcript_segment: transcriptSegment.substring(0, 1000),
      extraction_confidence: confidence,
      composite_score: composite,
      quality_flags: flags,
    });

    stats.valid_count++;
  }

  // Sort by composite score descending
  valid.sort((a, b) => b.composite_score - a.composite_score);

  return { valid, rejected, stats };
}

// ── LATAM Enrichment Schema ─────────────────────────────────

export interface LatamEnrichmentData {
  latam_frequency: number;       // 1-10
  regulatory_barriers: number;   // 1-10
  logistics_difficulty: number;  // 1-10
  digital_penetration: number;   // 1-10
  banking_access: number;        // 1-10
  average_ticket: string;
  regional_urgency: number;      // 1-10
  most_affected_countries: string[];
  references: string[];
  market_validation_score: number; // 1-10
  latam_fit_score: number;         // 1-10
  enrichment_notes: string;
}

export interface EnrichedPainPoint extends NormalizedPainPoint {
  latam: LatamEnrichmentData;
  final_latam_score: number;
}

/**
 * Calculate final LATAM score per constitution §7:
 * (severity + frequency + opportunity + market_validation + regional_fit) / 5
 */
export function calculateFinalLatamScore(
  severity: number,
  frequency: number,
  opportunity: number,
  marketValidation: number,
  regionalFit: number
): number {
  return calculateCompositeScore(severity, frequency, opportunity, marketValidation, regionalFit);
}

export function normalizeLatamEnrichment(raw: any): LatamEnrichmentData {
  return {
    latam_frequency: clamp(raw.latam_frequency, 1, 10, 5),
    regulatory_barriers: clamp(raw.regulatory_barriers, 1, 10, 5),
    logistics_difficulty: clamp(raw.logistics_difficulty, 1, 10, 5),
    digital_penetration: clamp(raw.digital_penetration, 1, 10, 5),
    banking_access: clamp(raw.banking_access, 1, 10, 5),
    average_ticket: raw.average_ticket || 'No disponible',
    regional_urgency: clamp(raw.regional_urgency, 1, 10, 5),
    most_affected_countries: Array.isArray(raw.most_affected_countries)
      ? raw.most_affected_countries.slice(0, 10)
      : [],
    references: Array.isArray(raw.references)
      ? raw.references.slice(0, 10)
      : [],
    market_validation_score: clamp(raw.market_validation_score, 1, 10, 5),
    latam_fit_score: clamp(raw.latam_fit_score, 1, 10, 5),
    enrichment_notes: (raw.enrichment_notes || '').substring(0, 500),
  };
}
