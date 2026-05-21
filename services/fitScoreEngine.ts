// ============================================================
// FIT SCORE ENGINE — Sprint 5 Core Engine
// Calculates multidimensional scores and difficulty levels
// ============================================================

export interface FactorBreakdown {
  skill_match: number;
  capital_match: number;
  time_match: number;
  pain_strength: number;
  market_validation: number;
  strategic_match: number;
  latam_viability: number;
}

export interface FitResult {
  fit_score: number;
  factor_breakdown: FactorBreakdown;
  difficulty_level: 'LOW' | 'MEDIUM' | 'HIGH';
}

export class FitScoreEngine {
  /**
   * Computes a highly customized, deterministic fit score between 0 and 100
   * based on the 3-pillar, 7-factor methodology.
   */
  static calculateFit(rpmProfile: any, painPoint: any, classifications: any[] = [], sourcesCount: number = 0): FitResult {
    const rawData = rpmProfile.raw_data || {};
    const map = rawData.map || {};
    const results = rawData.results || {};

    // 1. Skill Match (15%): Compare user skills and tech level against pain point category
    let skillScore = 50; // default baseline
    const techSkill = Number(map.techSkill || 3); // 1-5 scale
    const salesSkill = Number(map.salesSkill || 3); // 1-5 scale
    const isTechModel = String(results.preferredModel || '').toLowerCase().includes('saas') || 
                        String(painPoint.category || '').toLowerCase().includes('saas') ||
                        String(painPoint.category || '').toLowerCase().includes('software');

    if (isTechModel) {
      skillScore = techSkill >= 4 ? 95 : techSkill === 3 ? 75 : 40;
    } else {
      skillScore = salesSkill >= 4 ? 90 : salesSkill === 3 ? 70 : 50;
    }

    // 2. Capital Match (10%): Compare capital range and constraints
    let capitalScore = 70;
    const capitalRange = String(rpmProfile.capital_range || '1.000–3.000');
    // If SaaS/Software, it typically needs average capital ($500-$2000 setup/API costs)
    if (isTechModel) {
      if (capitalRange.includes('3.000') || capitalRange.includes('5.000')) {
        capitalScore = 95;
      } else if (capitalRange.includes('1.000')) {
        capitalScore = 80;
      } else {
        capitalScore = 50;
      }
    } else {
      capitalScore = 85; // non-tech automated models are capital-light
    }

    // 3. Time Match (10%): Compare available hours to difficulty
    let timeScore = 60;
    const hours = String(results.hoursPerWeek || '10-20');
    if (hours.includes('20') || hours.includes('30') || hours.includes('40')) {
      timeScore = 90;
    } else if (hours.includes('10-20')) {
      timeScore = 75;
    } else {
      timeScore = 45;
    }

    // 4. Pain Strength (15%): Native severity score of the pain point
    const severity = Number(painPoint.severity_score || 5); // Typically 1-10
    const painStrengthScore = Math.min(100, Math.max(10, severity * 10));

    // 5. Market Validation (20%): Volume of classifications & sources
    const matchedClassCount = classifications.filter(c => c.pain_point_id === painPoint.id).length;
    const evidenceWeight = Math.min(10, sourcesCount + matchedClassCount);
    const marketValidationScore = Math.min(100, 50 + (evidenceWeight * 5));

    // 6. Strategic Match (15%): Preferred models alignment & archetype suitability
    let strategicScore = 60;
    const preferredModel = String(results.preferredModel || '').toLowerCase();
    const ppCategory = String(painPoint.category || '').toLowerCase();
    
    if (preferredModel && ppCategory && (ppCategory.includes(preferredModel) || preferredModel.includes(ppCategory))) {
      strategicScore = 95;
    } else {
      strategicScore = 70;
    }

    // 7. LATAM Viability (15%): Regional friction and opportunity
    // Calculate based on market segment or native relevance scores
    const latamRelevance = classifications.find(c => c.pain_point_id === painPoint.id)?.latam_relevance_score || 75;
    const latamViabilityScore = Math.min(100, Math.max(20, Number(latamRelevance)));

    // Macro-pillars Consolidation:
    // Feasibility Pillar: Skill (15%), Capital (10%), Time (10%) -> 35%
    const feasibility = (skillScore * 0.15) + (capitalScore * 0.10) + (timeScore * 0.10);
    // Opportunity Pillar: Pain Strength (15%), Market Validation (20%) -> 35%
    const opportunity = (painStrengthScore * 0.15) + (marketValidationScore * 0.20);
    // Strategic & LATAM Pillar: Strategic (15%), LATAM Viability (15%) -> 30%
    const strategicLatam = (strategicScore * 0.15) + (latamViabilityScore * 0.15);

    const fitScore = Math.round(feasibility + opportunity + strategicLatam);

    // Compute automatic difficulty level based on constraints
    let difficulty: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    if (isTechModel && techSkill < 3) {
      difficulty = 'HIGH';
    } else if (severity >= 8 && sourcesCount >= 5) {
      difficulty = 'HIGH';
    } else if (!isTechModel && capitalScore >= 80 && timeScore >= 75) {
      difficulty = 'LOW';
    }

    return {
      fit_score: fitScore,
      factor_breakdown: {
        skill_match: Math.round(skillScore),
        capital_match: Math.round(capitalScore),
        time_match: Math.round(timeScore),
        pain_strength: Math.round(painStrengthScore),
        market_validation: Math.round(marketValidationScore),
        strategic_match: Math.round(strategicScore),
        latam_viability: Math.round(latamViabilityScore)
      },
      difficulty_level: difficulty
    };
  }
}
