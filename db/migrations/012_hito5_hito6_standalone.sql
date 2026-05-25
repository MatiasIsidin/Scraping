-- ============================================================
-- MIGRACIÓN 012 — HITO 5 + HITO 6 STANDALONE (Idempotente)
-- ============================================================
-- Esta migración es completamente autónoma.
-- Puede ejecutarse en una base que tenga SOLO las tablas core
-- (videos, transcripts, pain_points, etc.) sin depender de
-- migraciones previas de Hito 4/5.
--
-- NO usa FKs a tablas que podrían no existir.
-- Todas las tablas usan CREATE TABLE IF NOT EXISTS.
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. RPM PROFILES (base para todo el motor)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rpm_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT DEFAULT 'Matias',
    profile_name TEXT NOT NULL DEFAULT 'RPM Profile',
    capital_range TEXT DEFAULT '$0-$1000',
    skills JSONB DEFAULT '[]'::jsonb,
    location TEXT DEFAULT 'LATAM',
    experience_level TEXT DEFAULT 'beginner',
    industry_preferences JSONB DEFAULT '[]'::jsonb,
    raw_data JSONB DEFAULT '{}'::jsonb,
    ai_analysis JSONB DEFAULT '{}'::jsonb,
    archetype TEXT,
    execution_readiness INTEGER DEFAULT 0,
    strategic_clarity INTEGER DEFAULT 0,
    market_advantage INTEGER DEFAULT 0,
    emotional_urgency INTEGER DEFAULT 0,
    rpm_score INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar columnas si la tabla ya existía sin ellas
ALTER TABLE public.rpm_profiles ADD COLUMN IF NOT EXISTS user_id TEXT DEFAULT 'Matias';
ALTER TABLE public.rpm_profiles ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.rpm_profiles ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.rpm_profiles ADD COLUMN IF NOT EXISTS archetype TEXT;
ALTER TABLE public.rpm_profiles ADD COLUMN IF NOT EXISTS execution_readiness INTEGER DEFAULT 0;
ALTER TABLE public.rpm_profiles ADD COLUMN IF NOT EXISTS strategic_clarity INTEGER DEFAULT 0;
ALTER TABLE public.rpm_profiles ADD COLUMN IF NOT EXISTS market_advantage INTEGER DEFAULT 0;
ALTER TABLE public.rpm_profiles ADD COLUMN IF NOT EXISTS emotional_urgency INTEGER DEFAULT 0;
ALTER TABLE public.rpm_profiles ADD COLUMN IF NOT EXISTS rpm_score INTEGER DEFAULT 0;
ALTER TABLE public.rpm_profiles ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_rpm_profiles_user_active 
ON public.rpm_profiles(user_id, is_active);

-- ──────────────────────────────────────────────
-- 2. SOLUTION ENGINE OUTPUTS (Motor de Soluciones)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.solution_engine_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rpm_profile_id UUID,
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Columnas Sprint 5
    title TEXT,
    matched_pain_point_id UUID,
    matched_video_ids JSONB DEFAULT '[]'::jsonb,
    fit_score INTEGER DEFAULT 0,
    detailed_fit_scores JSONB DEFAULT '{}'::jsonb,
    ai_rationale TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    tracking_version INTEGER DEFAULT 1,
    criteria_hash TEXT
);

-- Agregar columnas Sprint 5 si la tabla ya existía
ALTER TABLE public.solution_engine_outputs ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.solution_engine_outputs ADD COLUMN IF NOT EXISTS matched_pain_point_id UUID;
ALTER TABLE public.solution_engine_outputs ADD COLUMN IF NOT EXISTS matched_video_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.solution_engine_outputs ADD COLUMN IF NOT EXISTS fit_score INTEGER DEFAULT 0;
ALTER TABLE public.solution_engine_outputs ADD COLUMN IF NOT EXISTS detailed_fit_scores JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.solution_engine_outputs ADD COLUMN IF NOT EXISTS ai_rationale TEXT;
ALTER TABLE public.solution_engine_outputs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.solution_engine_outputs ADD COLUMN IF NOT EXISTS tracking_version INTEGER DEFAULT 1;
ALTER TABLE public.solution_engine_outputs ADD COLUMN IF NOT EXISTS criteria_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_solutions_active_rpm_hash 
ON public.solution_engine_outputs(rpm_profile_id, is_active, criteria_hash);

-- ──────────────────────────────────────────────
-- 3. SELECTED SOLUTIONS (Selección de solución - HITO 5)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.selected_solutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    solution_id UUID,
    rpm_profile_id UUID,
    criteria_hash TEXT DEFAULT 'local',
    proposal_version INTEGER DEFAULT 1,
    selected_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_selected_solutions_user_active 
ON public.selected_solutions(user_id, is_active);

-- ──────────────────────────────────────────────
-- 4. SOLUTION GENERATION HISTORY (Dinamismo RPM)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.solution_generation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    rpm_profile_id UUID,
    criteria_hash TEXT NOT NULL DEFAULT '',
    rpm_version INTEGER DEFAULT 1,
    rpm_snapshot JSONB DEFAULT '{}'::jsonb,
    solutions_generated INTEGER DEFAULT 0,
    solutions_snapshot JSONB DEFAULT '[]'::jsonb,
    is_current BOOLEAN DEFAULT TRUE,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    invalidated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generation_history_user 
ON public.solution_generation_history(user_id, is_current);

-- ──────────────────────────────────────────────
-- 5. MVT PROCESSES (Proceso principal MVT - HITO 6)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mvt_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    selected_solution_id UUID,
    solution_title TEXT NOT NULL DEFAULT 'Sin titulo',
    pain_point_title TEXT,
    fit_score INTEGER DEFAULT 0,
    selected_at TIMESTAMPTZ DEFAULT NOW(),
    current_state TEXT NOT NULL DEFAULT 'INMERSION',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mvt_processes_user_active 
ON public.mvt_processes(user_id, is_active);

-- ──────────────────────────────────────────────
-- 6. MVT IMMERSION CONVERSATIONS (Paso 1)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mvt_immersion_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mvt_process_id UUID,
    contact_name TEXT NOT NULL DEFAULT '',
    segment TEXT,
    company TEXT,
    role TEXT,
    conversation_date TIMESTAMPTZ DEFAULT NOW(),
    channel TEXT,
    duration_minutes INTEGER,
    notes TEXT,
    problems_detected TEXT,
    literal_quotes TEXT,
    pain_level INTEGER DEFAULT 5,
    willingness_to_pay TEXT,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mvt_conversations_process 
ON public.mvt_immersion_conversations(mvt_process_id);

-- ──────────────────────────────────────────────
-- 7. MVT IMMERSION SUMMARY (Resumen IA)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mvt_immersion_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mvt_process_id UUID,
    ai_summary TEXT,
    repeated_patterns TEXT,
    insights TEXT,
    frequent_problems TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 8. MVT HYPOTHESES (Paso 2)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mvt_hypotheses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mvt_process_id UUID,
    hypothesis TEXT NOT NULL DEFAULT '',
    type TEXT,
    risk TEXT DEFAULT 'MEDIA',
    impact TEXT DEFAULT 'MEDIA',
    priority INTEGER DEFAULT 0,
    justification TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mvt_hypotheses_process 
ON public.mvt_hypotheses(mvt_process_id);

-- ──────────────────────────────────────────────
-- 9. MVT TESTS (Paso 3)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mvt_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mvt_process_id UUID,
    hypothesis_id UUID,
    name TEXT NOT NULL DEFAULT '',
    test_type TEXT DEFAULT 'OTRO',
    description TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status TEXT DEFAULT 'PENDIENTE',
    url TEXT,
    screenshots JSONB DEFAULT '[]'::jsonb,
    target_metric TEXT,
    expected_result TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mvt_tests_process 
ON public.mvt_tests(mvt_process_id);

-- ──────────────────────────────────────────────
-- 10. MVT RESULTS (Paso 4)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mvt_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mvt_process_id UUID,
    test_id UUID,
    target_metric TEXT,
    actual_result TEXT,
    difference TEXT,
    fulfillment_percentage NUMERIC(5,2) DEFAULT 0,
    classification TEXT DEFAULT 'INCONCLUSA',
    reasoning TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mvt_results_process 
ON public.mvt_results(mvt_process_id);

-- ──────────────────────────────────────────────
-- 11. MVT DECISIONS (Paso 5)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mvt_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mvt_process_id UUID,
    decision TEXT NOT NULL DEFAULT 'AVANZAR',
    justification TEXT,
    learnings TEXT,
    next_steps TEXT,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mvt_decisions_process 
ON public.mvt_decisions(mvt_process_id);

-- ──────────────────────────────────────────────
-- 12. MVT VALIDATION (Legacy - mantener compatibilidad)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mvt_validation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solution_id UUID,
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

-- ============================================================
-- FIN DE MIGRACIÓN 012
-- ============================================================
-- VERIFICACIÓN POST-MIGRACIÓN:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' ORDER BY table_name;
--
-- TABLAS ESPERADAS (nuevas):
--   solution_engine_outputs ✓
--   selected_solutions ✓
--   solution_generation_history ✓
--   mvt_processes ✓
--   mvt_immersion_conversations ✓
--   mvt_immersion_summary ✓
--   mvt_hypotheses ✓
--   mvt_tests ✓
--   mvt_results ✓
--   mvt_decisions ✓
--   mvt_validation ✓
-- ============================================================
