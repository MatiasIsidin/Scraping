-- ============================================================
-- SPRINT 3 — SCHEMA STABILIZATION (STRICT RELATIONAL)
-- ============================================================

-- 1. Ensure pain_points has the correct columns
ALTER TABLE IF EXISTS public.pain_points 
  ADD COLUMN IF NOT EXISTS video_id TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS market_segment TEXT DEFAULT 'LATAM General',
  ADD COLUMN IF NOT EXISTS severity_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS frequency_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recency_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_score DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS version TEXT;

-- 2. Ensure pain_point_sources has the correct columns
ALTER TABLE IF EXISTS public.pain_point_sources 
  ADD COLUMN IF NOT EXISTS pain_point_id UUID REFERENCES public.pain_points(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source_name TEXT,
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS evidence TEXT,
  ADD COLUMN IF NOT EXISTS credibility_score INTEGER DEFAULT 0;

-- 3. Update transcripts table to track processing
ALTER TABLE IF EXISTS public.transcripts 
  ADD COLUMN IF NOT EXISTS processed_for_painpoints BOOLEAN DEFAULT FALSE;

-- 4. Indexes for performance and deduplication
CREATE INDEX IF NOT EXISTS idx_pain_points_video_id ON public.pain_points(video_id);
CREATE INDEX IF NOT EXISTS idx_pain_point_sources_pain_point_id ON public.pain_point_sources(pain_point_id);

-- 5. Cleanup legacy columns (Optional - keeping them for now to avoid data loss)
-- ALTER TABLE public.pain_points DROP COLUMN IF EXISTS evidence_sources;
-- ALTER TABLE public.pain_points DROP COLUMN IF EXISTS latam_validation;
