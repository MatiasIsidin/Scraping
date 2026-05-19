-- ============================================================
-- RESCUE SQL: SPRINT 4 FINAL ALIGNMENT
-- ============================================================

-- 1. Asegurar columnas en video_analysis
ALTER TABLE public.video_analysis 
ADD COLUMN IF NOT EXISTS youtube_video_id TEXT REFERENCES public.videos(youtube_video_id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS business_summary TEXT,
ADD COLUMN IF NOT EXISTS business_model TEXT,
ADD COLUMN IF NOT EXISTS core_mechanic TEXT,
ADD COLUMN IF NOT EXISTS extraction_model TEXT DEFAULT 'gpt-4o-mini',
ADD COLUMN IF NOT EXISTS extraction_version TEXT DEFAULT 'v1.1-hito4',
ADD COLUMN IF NOT EXISTS extraction_confidence NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_estimated NUMERIC DEFAULT 0;

-- 2. Asegurar columnas en video_classifications
ALTER TABLE public.video_classifications
ADD COLUMN IF NOT EXISTS classification_version TEXT DEFAULT 'v1.1-hito4',
ADD COLUMN IF NOT EXISTS latam_relevance_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS reasoning TEXT,
ADD COLUMN IF NOT EXISTS analysis_id UUID REFERENCES public.video_analysis(id) ON DELETE CASCADE;

-- 3. Asegurar columnas en extraction_logs
CREATE TABLE IF NOT EXISTS public.extraction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id TEXT,
    model_used TEXT,
    tokens_used INTEGER,
    cost_estimated NUMERIC,
    status TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RECARGAR SCHEMA CACHE (Vital para PostgREST)
NOTIFY pgrst, 'reload schema';
