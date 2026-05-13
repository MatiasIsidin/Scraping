-- ============================================================
-- MIGRACIÓN HITO 4 — Alineación Final Schema
-- ============================================================

-- 1. Estabilizar VIDEO_ANALYSIS
ALTER TABLE IF EXISTS video_analysis 
  ADD COLUMN IF NOT EXISTS youtube_video_id TEXT REFERENCES videos(youtube_video_id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_summary TEXT,
  ADD COLUMN IF NOT EXISTS business_model TEXT,
  ADD COLUMN IF NOT EXISTS core_mechanic TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS revenue_range TEXT,
  ADD COLUMN IF NOT EXISTS extraction_model TEXT,
  ADD COLUMN IF NOT EXISTS extraction_version TEXT,
  ADD COLUMN IF NOT EXISTS extraction_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS token_cost_input INTEGER,
  ADD COLUMN IF NOT EXISTS token_cost_output INTEGER,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Estabilizar VIDEO_CLASSIFICATIONS
ALTER TABLE IF EXISTS video_classifications
  ADD COLUMN IF NOT EXISTS classification_version TEXT,
  ADD COLUMN IF NOT EXISTS business_category TEXT,
  ADD COLUMN IF NOT EXISTS business_model TEXT,
  ADD COLUMN IF NOT EXISTS core_mechanic TEXT,
  ADD COLUMN IF NOT EXISTS latam_relevance_score INTEGER,
  ADD COLUMN IF NOT EXISTS latam_classification JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS analysis_summary TEXT;

-- 3. Limpiar ambigüedades de FKs si persisten (Seguro para re-ejecutar)
DO $$
BEGIN
    -- Intentar normalizar nombres de columnas si hay discrepancias
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'video_analysis' AND column_name = 'video_id' AND column_name != 'youtube_video_id') THEN
        -- Si existe video_id pero no youtube_video_id, o ambos...
        -- Por ahora simplemente aseguramos que youtube_video_id sea la referencia oficial.
        NULL;
    END IF;
END $$;
