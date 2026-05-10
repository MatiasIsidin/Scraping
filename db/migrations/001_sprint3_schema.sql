-- ============================================================
-- MIGRACIÓN SPRINT 3 — Starter Story LATAM Engine
-- Fecha: 2026-05-05
-- Descripción: Reestructuración integral del esquema relacional
--              para soportar pipeline de Pain Points desde Transcripts.
--
-- ORDEN DE EJECUCIÓN:
--   1. Ejecutar este archivo completo en SQL Editor de Supabase.
--   2. Es idempotente (IF NOT EXISTS / IF EXISTS en todas las sentencias).
--   3. NO elimina datos existentes. Solo extiende o altera.
-- ============================================================

-- ──────────────────────────────────────────────
-- 1. TABLA: videos (Core — Entidad Estática)
-- ──────────────────────────────────────────────
-- La tabla "videos" puede existir con el nombre "videos" o "raw_videos" dependiendo del entorno.
-- Normalizamos a "videos".

-- Agregar columnas faltantes si no existen
ALTER TABLE videos ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS channel_id TEXT DEFAULT '';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS channel_name TEXT DEFAULT '';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT DEFAULT '';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE videos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_published_at ON videos(published_at);
CREATE INDEX IF NOT EXISTS idx_videos_is_active ON videos(is_active);

-- ──────────────────────────────────────────────
-- 2. TABLA: transcripts (Core — Texto extraído)
-- ──────────────────────────────────────────────
-- Ya existe. Extendemos con columnas de análisis.

ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS char_count INTEGER DEFAULT 0;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS is_processable BOOLEAN DEFAULT TRUE;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS processed_for_painpoints BOOLEAN DEFAULT FALSE;
ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_transcripts_status ON transcripts(status);
CREATE INDEX IF NOT EXISTS idx_transcripts_processable ON transcripts(is_processable);
CREATE INDEX IF NOT EXISTS idx_transcripts_processed_pp ON transcripts(processed_for_painpoints);

-- ──────────────────────────────────────────────
-- 3. TABLA: video_snapshots (Core — Métricas evolutivas)
-- ──────────────────────────────────────────────
-- Ya existe. Aseguramos índice temporal.

CREATE INDEX IF NOT EXISTS idx_snapshots_video_id ON video_snapshots(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_scraped_at ON video_snapshots(scraped_at);

-- ──────────────────────────────────────────────
-- 4. TABLA: scraping_logs (Core — Trazabilidad)
-- ──────────────────────────────────────────────
-- Ya existe con extensiones. Agregamos índice.

CREATE INDEX IF NOT EXISTS idx_scraping_logs_status ON scraping_logs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_logs_run_type ON scraping_logs(run_type);

-- ──────────────────────────────────────────────
-- 5. TABLA: video_analysis (NUEVA — Análisis IA por video)
-- ──────────────────────────────────────────────
-- Relación 1:1 con video. Almacena el resumen IA del negocio descrito.

CREATE TABLE IF NOT EXISTS video_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youtube_video_id TEXT NOT NULL REFERENCES videos(youtube_video_id) ON DELETE CASCADE,
    
    -- Análisis del negocio extraído del video
    business_summary TEXT,
    business_model TEXT,
    core_mechanic TEXT,
    industry TEXT,
    revenue_range TEXT,
    
    -- Metadata de extracción IA
    extraction_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    extraction_version TEXT NOT NULL DEFAULT 'v1',
    extraction_confidence NUMERIC(5,2) DEFAULT 0,
    token_cost_input INTEGER DEFAULT 0,
    token_cost_output INTEGER DEFAULT 0,
    
    -- Timestamps
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: 1 análisis por video por versión
    CONSTRAINT uq_video_analysis_version UNIQUE (youtube_video_id, extraction_version)
);

CREATE INDEX IF NOT EXISTS idx_video_analysis_video ON video_analysis(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_video_analysis_version ON video_analysis(extraction_version);

-- ──────────────────────────────────────────────
-- 6. TABLA: pain_points (REDISEÑADA — Repositorio de dolores del mercado)
-- ──────────────────────────────────────────────
-- NOTA: La tabla "pain_points" legacy (Fase 6 con market research) se renombra
-- para no perder datos. La nueva tabla es la versión relacional correcta.

-- Renombrar tabla legacy si existe (preservar datos)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pain_points') THEN
        ALTER TABLE pain_points RENAME TO pain_points_legacy_v1;
        RAISE NOTICE 'Tabla pain_points renombrada a pain_points_legacy_v1 para preservar datos.';
    END IF;
EXCEPTION
    WHEN duplicate_table THEN
        RAISE NOTICE 'pain_points_legacy_v1 ya existe. Omitiendo renombrado.';
END $$;

CREATE TABLE IF NOT EXISTS pain_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identidad del Pain Point
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    
    -- Clasificación de severidad e impacto
    severity INTEGER NOT NULL DEFAULT 5 CHECK (severity BETWEEN 1 AND 10),
    business_type TEXT DEFAULT 'General',
    opportunity_score INTEGER DEFAULT 5 CHECK (opportunity_score BETWEEN 1 AND 10),
    market_scope TEXT DEFAULT 'LATAM General',
    
    -- Scoring compuesto (calculado por el sistema)
    frequency_count INTEGER DEFAULT 1,
    composite_score NUMERIC(5,2) DEFAULT 0,
    
    -- Versionado y clasificación
    extraction_version TEXT NOT NULL DEFAULT 'v1',
    is_validated BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- LATAM Research (Sprint 4+)
    latam_relevance_score INTEGER DEFAULT 0 CHECK (latam_relevance_score BETWEEN 0 AND 100),
    latam_classification JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pain_points_category ON pain_points(category);
CREATE INDEX IF NOT EXISTS idx_pain_points_severity ON pain_points(severity);
CREATE INDEX IF NOT EXISTS idx_pain_points_version ON pain_points(extraction_version);
CREATE INDEX IF NOT EXISTS idx_pain_points_active ON pain_points(is_active);
CREATE INDEX IF NOT EXISTS idx_pain_points_composite ON pain_points(composite_score DESC);

-- ──────────────────────────────────────────────
-- 7. TABLA: pain_point_sources (NUEVA — Tabla puente N:M)
-- ──────────────────────────────────────────────
-- Conecta pain_points con los videos/transcripts de donde se extrajeron.

CREATE TABLE IF NOT EXISTS pain_point_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relaciones
    pain_point_id UUID NOT NULL REFERENCES pain_points(id) ON DELETE CASCADE,
    youtube_video_id TEXT NOT NULL REFERENCES videos(youtube_video_id) ON DELETE CASCADE,
    
    -- Evidencia extraída
    transcript_segment TEXT NOT NULL,
    extraction_confidence NUMERIC(5,2) DEFAULT 0 CHECK (extraction_confidence BETWEEN 0 AND 100),
    
    -- Metadata de extracción
    extraction_model TEXT DEFAULT 'gpt-4o-mini',
    extraction_version TEXT NOT NULL DEFAULT 'v1',
    
    -- Timestamps
    extracted_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Evitar duplicados exactos
    CONSTRAINT uq_source_painpoint_video_version UNIQUE (pain_point_id, youtube_video_id, extraction_version)
);

CREATE INDEX IF NOT EXISTS idx_pp_sources_pain_point ON pain_point_sources(pain_point_id);
CREATE INDEX IF NOT EXISTS idx_pp_sources_video ON pain_point_sources(youtube_video_id);

-- ──────────────────────────────────────────────
-- 8. TABLA: video_classifications (Placeholder Sprint 4)
-- ──────────────────────────────────────────────
-- Clasificación cruzada del video con perfil RPM y contexto LATAM.

CREATE TABLE IF NOT EXISTS video_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youtube_video_id TEXT NOT NULL REFERENCES videos(youtube_video_id) ON DELETE CASCADE,
    
    classification_version TEXT NOT NULL DEFAULT 'v1',
    business_category TEXT,
    business_model TEXT,
    core_mechanic TEXT,
    
    latam_relevance_score INTEGER DEFAULT 0 CHECK (latam_relevance_score BETWEEN 0 AND 100),
    latam_classification JSONB DEFAULT '[]'::jsonb,
    analysis_summary TEXT,
    
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_classification_version UNIQUE (youtube_video_id, classification_version)
);

CREATE INDEX IF NOT EXISTS idx_classifications_video ON video_classifications(youtube_video_id);

-- ──────────────────────────────────────────────
-- 9. TABLA: rpm_profiles (Placeholder Sprint 4-5)
-- ──────────────────────────────────────────────

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

-- ──────────────────────────────────────────────
-- 10. TABLA: solution_engine_outputs (Placeholder Sprint 5)
-- ──────────────────────────────────────────────

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
    
    rpm_alignment_score INTEGER DEFAULT 0 CHECK (rpm_alignment_score BETWEEN 0 AND 100),
    feasibility_score INTEGER DEFAULT 0 CHECK (feasibility_score BETWEEN 0 AND 100),
    
    generation_model TEXT DEFAULT 'gpt-4o',
    generation_version TEXT DEFAULT 'v1',
    
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 11. TABLA: mvt_validation (Placeholder Sprint 5+)
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mvt_validation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    solution_id UUID REFERENCES solution_engine_outputs(id) ON DELETE CASCADE,
    
    validation_type TEXT DEFAULT 'survey',
    target_audience TEXT,
    hypothesis TEXT,
    result_data JSONB DEFAULT '{}'::jsonb,
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    conclusion TEXT,
    confidence_level NUMERIC(5,2) DEFAULT 0,
    
    validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 12. TABLA: extraction_logs (NUEVA — Logs del pipeline de IA)
-- ──────────────────────────────────────────────
-- Registra cada ejecución del pipeline de extracción de pain points.

CREATE TABLE IF NOT EXISTS extraction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    pipeline_type TEXT NOT NULL DEFAULT 'pain_point_extraction',
    model_used TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    
    transcripts_processed INTEGER DEFAULT 0,
    pain_points_extracted INTEGER DEFAULT 0,
    pain_points_deduplicated INTEGER DEFAULT 0,
    sources_created INTEGER DEFAULT 0,
    
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,
    estimated_cost_usd NUMERIC(8,4) DEFAULT 0,
    
    execution_time_seconds INTEGER DEFAULT 0,
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'partial', 'error')),
    error_details JSONB DEFAULT '{}'::jsonb,
    
    extraction_version TEXT NOT NULL DEFAULT 'v1',
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extraction_logs_type ON extraction_logs(pipeline_type);
CREATE INDEX IF NOT EXISTS idx_extraction_logs_status ON extraction_logs(status);

-- ============================================================
-- FIN DE MIGRACIÓN SPRINT 3
-- ============================================================
-- Verificación post-migración recomendada:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' ORDER BY table_name;
-- ============================================================
