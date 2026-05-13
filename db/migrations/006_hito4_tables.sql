-- ============================================================
-- MIGRACIÓN HITO 4 — Tablas de Perfilamiento y Soluciones
-- ============================================================

-- 1. RPM PROFILES
CREATE TABLE IF NOT EXISTS rpm_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_name TEXT NOT NULL,
    capital_range TEXT DEFAULT '$0-$1000',
    skills JSONB DEFAULT '[]'::jsonb,
    location TEXT DEFAULT 'LATAM',
    experience_level TEXT DEFAULT 'beginner',
    industry_preferences JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SOLUTION ENGINE OUTPUTS
CREATE TABLE IF NOT EXISTS solution_engine_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rpm_profile_id UUID REFERENCES rpm_profiles(id) ON DELETE SET NULL,
    referenced_videos JSONB DEFAULT '[]'::jsonb,
    referenced_pain_points JSONB DEFAULT '[]'::jsonb,
    latam_problem_addressed TEXT,
    explanation_latam_context TEXT,
    proposed_viable_solution TEXT,
    difficulty_level TEXT DEFAULT 'medium',
    estimated_cost_range TEXT,
    required_skills JSONB DEFAULT '[]'::jsonb,
    rpm_alignment_score INTEGER DEFAULT 0,
    feasibility_score INTEGER DEFAULT 0,
    generation_model TEXT DEFAULT 'gpt-4o',
    generation_version TEXT DEFAULT 'v1',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MVT VALIDATION
CREATE TABLE IF NOT EXISTS mvt_validation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solution_id UUID REFERENCES solution_engine_outputs(id) ON DELETE CASCADE,
    validation_type TEXT DEFAULT 'survey',
    target_audience TEXT,
    hypothesis TEXT,
    result_data JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'pending',
    conclusion TEXT,
    confidence_level NUMERIC(5,2) DEFAULT 0,
    validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
